import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import PATModal from "./PATModal";

const mockSavePat = vi.fn();
let mockPatState = "";

vi.mock("../context/AppContext", () => ({
  useApp: () => ({
    pat: mockPatState,
    savePat: mockSavePat,
  }),
}));

// savePat validates the token with GitHub internally and resolves with a
// structured result, so these tests drive the modal through that boundary.
describe("PATModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPatState = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not render when open is false", () => {
    render(<PATModal open={false} onClose={vi.fn()} />);
    expect(screen.queryByPlaceholderText("ghp_xxxxxxxxxxxxxxxxx")).not.toBeInTheDocument();
  });

  it("renders with input when open is true", () => {
    render(<PATModal open={true} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText("ghp_xxxxxxxxxxxxxxxxx")).toBeInTheDocument();
    expect(screen.getByText("GitHub Personal Access Token")).toBeInTheDocument();
  });

  it("shows error from savePat result when token is invalid", async () => {
    mockSavePat.mockResolvedValueOnce({
      valid: false,
      error: "Invalid or expired GitHub token",
    });

    render(<PATModal open={true} onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText("ghp_xxxxxxxxxxxxxxxxx");
    fireEvent.change(input, { target: { value: "ghp_invalidToken123" } });

    const saveButton = screen.getByRole("button", { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Invalid or expired GitHub token")).toBeInTheDocument();
    });

    expect(mockSavePat).toHaveBeenCalledWith("ghp_invalidToken123");
  });

  it("clears error message when user modifies input", async () => {
    mockSavePat.mockResolvedValueOnce({
      valid: false,
      error: "Invalid or expired GitHub token",
    });

    render(<PATModal open={true} onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText("ghp_xxxxxxxxxxxxxxxxx");
    fireEvent.change(input, { target: { value: "ghp_invalid" } });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    fireEvent.change(input, { target: { value: "ghp_invalid_fixed" } });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps controls pending during save and ignores repeated submissions", async () => {
    let resolveSave;
    const savePromise = new Promise((resolve) => {
      resolveSave = resolve;
    });

    mockSavePat.mockReturnValue(savePromise);

    render(<PATModal open={true} onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText("ghp_xxxxxxxxxxxxxxxxx");
    fireEvent.change(input, { target: { value: "ghp_validToken123" } });

    const saveButton = screen.getByRole("button", { name: /save/i });
    fireEvent.click(saveButton);

    // While savePat is in flight the modal shows a spinner and locks the controls
    expect(screen.getByText(/verifying.../i)).toBeInTheDocument();
    expect(input).toBeDisabled();
    expect(saveButton).toBeDisabled();

    // Repeated submission while pending must not start another save
    fireEvent.click(saveButton);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockSavePat).toHaveBeenCalledTimes(1);

    resolveSave({ valid: true });

    await waitFor(() => {
      expect(screen.queryByText(/verifying.../i)).not.toBeInTheDocument();
    });

    expect(mockSavePat).toHaveBeenCalledWith("ghp_validToken123");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("ignores the save result after Delete cancels the pending save", async () => {
    mockPatState = "ghp_existingToken";
    let resolveSave;
    const savePromise = new Promise((resolve) => {
      resolveSave = resolve;
    });

    mockSavePat.mockImplementation((token) => {
      if (token) return savePromise;
      return Promise.resolve({ valid: true });
    });

    render(<PATModal open={true} onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText("ghp_xxxxxxxxxxxxxxxxx");
    fireEvent.change(input, { target: { value: "ghp_newToken123" } });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(screen.getByText(/verifying.../i)).toBeInTheDocument();

    // Delete while the save is still in flight clears the token immediately
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(mockSavePat).toHaveBeenCalledWith("");

    mockSavePat.mockClear();

    // The in-flight save resolves successfully, but the delete superseded it:
    // the modal must not save the token again or surface an error
    resolveSave({ valid: true });

    await new Promise((r) => setTimeout(r, 50));

    expect(mockSavePat).not.toHaveBeenCalled();
    expect(input).toHaveValue("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/verifying.../i)).not.toBeInTheDocument();
  });

  it("does not surface an error when the modal closes during a pending save", async () => {
    let resolveSave;
    const savePromise = new Promise((resolve) => {
      resolveSave = resolve;
    });

    mockSavePat.mockReturnValue(savePromise);
    const mockOnClose = vi.fn();

    const { rerender } = render(<PATModal open={true} onClose={mockOnClose} />);

    const input = screen.getByPlaceholderText("ghp_xxxxxxxxxxxxxxxxx");
    fireEvent.change(input, { target: { value: "ghp_testToken123" } });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(screen.getByText(/verifying.../i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /close/i })[0]);
    expect(mockOnClose).toHaveBeenCalled();

    rerender(<PATModal open={false} onClose={mockOnClose} />);

    resolveSave({ valid: true });

    await new Promise((r) => setTimeout(r, 50));

    expect(mockSavePat).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("triggers save on Enter key press in the input field", async () => {
    mockSavePat.mockResolvedValueOnce({ valid: true });

    render(<PATModal open={true} onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText("ghp_xxxxxxxxxxxxxxxxx");
    fireEvent.change(input, { target: { value: "ghp_enterKeyToken" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(mockSavePat).toHaveBeenCalledWith("ghp_enterKeyToken");
    });
  });

  it("clears token when Delete button is clicked", () => {
    mockPatState = "ghp_existingToken";

    render(<PATModal open={true} onClose={vi.fn()} />);

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(mockSavePat).toHaveBeenCalledWith("");
    expect(screen.getByPlaceholderText("ghp_xxxxxxxxxxxxxxxxx")).toHaveValue("");
  });
});
