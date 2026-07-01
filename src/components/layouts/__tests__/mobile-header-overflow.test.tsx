// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MobileHeaderOverflow } from "@/components/layouts/mobile-header-overflow";

afterEach(cleanup);

const openSpy = vi.fn();
vi.mock("@/lib/events/command-palette", () => ({ openCommandPalette: () => openSpy() }));
const toggleSpy = vi.fn();
vi.mock("@/hooks/use-chat-panel", () => ({ chatPanelActions: { toggle: () => toggleSpy() } }));
vi.mock("@/components/conflict-badge", () => ({ ConflictBadge: () => <div data-testid="conflict-badge" /> }));
vi.mock("@/components/theme-toggle", () => ({ ThemeToggle: () => <div data-testid="theme-toggle" /> }));

describe("MobileHeaderOverflow", () => {
  it("opens the sheet and shows the collapsed controls", () => {
    render(<MobileHeaderOverflow />);
    fireEvent.click(screen.getByRole("button", { name: /mais op/i }));
    expect(screen.getByText(/Buscar/i)).toBeInTheDocument();
    expect(screen.getByTestId("conflict-badge")).toBeInTheDocument();
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    expect(screen.getByText(/Assistente/i)).toBeInTheDocument();
  });

  it("the search row opens the command palette", () => {
    render(<MobileHeaderOverflow />);
    fireEvent.click(screen.getByRole("button", { name: /mais op/i }));
    fireEvent.click(screen.getByText(/Buscar/i));
    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it("the chat row toggles the chat panel", () => {
    render(<MobileHeaderOverflow />);
    fireEvent.click(screen.getByRole("button", { name: /mais op/i }));
    fireEvent.click(screen.getByText(/Assistente/i));
    expect(toggleSpy).toHaveBeenCalledTimes(1);
  });
});
