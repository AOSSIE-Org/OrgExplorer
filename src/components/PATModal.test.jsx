import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import PATModal from "./PATModal";
import * as githubService from "../services/github";

const mockSavePat = vi.fn();
let mockPatState = "";

vi.mock("../context/AppContext", () => ({
  useApp: () => ({
    pat: mockPatState,
    savePat: mockSavePat,
  }),
}));

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

  it("shows error and prevents saving when token is invalid", async () => {
    vi.spyOn(githubService, "validatePat").mockResolvedValueOnce({
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

    expect(mockSavePat).not.toHaveBeenCalled();
  });

  it("clears error message when user modifies input", async () => {
    vi.spyOn(githubService, "validatePat").mockResolvedValueOnce({
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

  it("validates and saves successfully when token is valid, verifying pending state", async () => {
    let resolveValidation;
    const validationPromise = new Promise((resolve) => {
      resolveValidation = resolve;
    });

    vi.spyOn(githubService, "validatePat").mockReturnValue(validationPromise);

    render(<PATModal open={true} onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText("ghp_xxxxxxxxxxxxxxxxx");
    fireEvent.change(input, { target: { value: "ghp_validToken123" } });

    const saveButton = screen.getByRole("button", { name: /save/i });
    fireEvent.click(saveButton);

    // Verify pending loading state and disabled controls
    expect(screen.getByText(/verifying.../i)).toBeInTheDocument();
    expect(input).toBeDisabled();
    expect(saveButton).toBeDisabled();

    // Repeated submission while pending should not trigger another validation
    fireEvent.click(saveButton);
    expect(githubService.validatePat).toHaveBeenCalledTimes(1);

    // Resolve deferred validation
    resolveValidation({
      valid: true,
      rate: { limit: 5000, remaining: 5000, reset: 1700000000 },
    });

    await waitFor(() => {
      expect(mockSavePat).toHaveBeenCalledWith("ghp_validToken123");
    });

    expect(screen.queryByText(/verifying.../i)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("cancels pending validation when Delete is clicked so token is not restored", async () => {
    mockPatState = "ghp_existingToken";
    let resolveValidation;
    const validationPromise = new Promise((resolve) => {
      resolveValidation = resolve;
    });

    vi.spyOn(githubService, "validatePat").mockReturnValue(validationPromise);

    render(<PATModal open={true} onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText("ghp_xxxxxxxxxxxxxxxxx");
    fireEvent.change(input, { target: { value: "ghp_newToken123" } });

    const saveButton = screen.getByRole("button", { name: /save/i });
    fireEvent.click(saveButton);

    expect(screen.getByText(/verifying.../i)).toBeInTheDocument();

    // Click Delete while validation is still in flight
    const deleteButton = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(mockSavePat).toHaveBeenCalledWith("");
    mockSavePat.mockClear();

    // Now resolve validation late
    resolveValidation({
      valid: true,
      rate: { limit: 5000 },
    });

    // Wait a brief delay to ensure no trailing save occurred
    await new Promise((r) => setTimeout(r, 50));
    expect(mockSavePat).not.toHaveBeenCalled();
  });

  it("cancels pending validation when modal is closed", async () => {
    let resolveValidation;
    const validationPromise = new Promise((resolve) => {
      resolveValidation = resolve;
    });

    vi.spyOn(githubService, "validatePat").mockReturnValue(validationPromise);
    const mockOnClose = vi.fn();

    const { rerender } = render(<PATModal open={true} onClose={mockOnClose} />);

    const input = screen.getByPlaceholderText("ghp_xxxxxxxxxxxxxxxxx");
    fireEvent.change(input, { target: { value: "ghp_testToken123" } });

    const saveButton = screen.getByRole("button", { name: /save/i });
    fireEvent.click(saveButton);

    expect(screen.getByText(/verifying.../i)).toBeInTheDocument();

    // Close modal via close button
    const closeButtons = screen.getAllByRole("button", { name: /close/i });
    fireEvent.click(closeButtons[0]);
    expect(mockOnClose).toHaveBeenCalled();

    // Unrender modal
    rerender(<PATModal open={false} onClose={mockOnClose} />);

    // Resolve validation after modal is closed
    resolveValidation({
      valid: true,
      rate: { limit: 5000 },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(mockSavePat).not.toHaveBeenCalled();
  });

  it("triggers validation on Enter key press in the input field", async () => {
    vi.spyOn(githubService, "validatePat").mockResolvedValueOnce({
      valid: true,
      rate: { limit: 5000 },
    });

    render(<PATModal open={true} onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText("ghp_xxxxxxxxxxxxxxxxx");
    fireEvent.change(input, { target: { value: "ghp_enterKeyToken" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(githubService.validatePat).toHaveBeenCalledWith("ghp_enterKeyToken");
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

