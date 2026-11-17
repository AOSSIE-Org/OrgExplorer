import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PATModal from "./PATModal";

const { savePat } = vi.hoisted(() => ({ savePat: vi.fn() }));
vi.mock("../context/AppContext", () => ({ useApp: () => ({ pat: "", savePat }) }));

describe("PATModal accessibility", () => {
  beforeEach(() => {
    savePat.mockReset();
  });

  it("focuses the token input when its label is clicked", async () => {
    const user = userEvent.setup();
    render(<PATModal open={true} onClose={() => {}} />);

    const label = screen.getByText(/personal access token/i, { selector: "label" });
    await user.click(label);

    expect(screen.getByPlaceholderText(/ghp_/)).toHaveFocus();
  });

  it("names the visibility button by its next action and updates on toggle", async () => {
    const user = userEvent.setup();
    render(<PATModal open={true} onClose={() => {}} />);

    expect(screen.getByRole("button", { name: "Show token" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show token" }));

    expect(screen.getByRole("button", { name: "Hide token" })).toBeInTheDocument();
  });
});