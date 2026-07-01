// @vitest-environment happy-dom
// src/components/shared/mobile/__tests__/mobile-more-sheet.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MobileMoreSheet } from "@/components/shared/mobile/mobile-more-sheet";

afterEach(cleanup);

// Mock the assignment context so the sheet has grouped modules to render.
vi.mock("@/contexts/assignment-context", async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>);
  return {
    ...actual,
    useAssignment: () => ({
      currentAssignment: "JURI_CAMACARI",
      modules: [
        { title: "Plenário", items: [{ label: "Sessões do Júri", path: "/admin/juri", icon: "Gavel" }] },
      ],
    }),
  };
});

// Mock the open-palette event to observe the search field wiring.
const openSpy = vi.fn();
vi.mock("@/lib/events/command-palette", () => ({
  openCommandPalette: () => openSpy(),
}));

describe("MobileMoreSheet", () => {
  it("renders grouped section titles and items when open", () => {
    render(<MobileMoreSheet open onOpenChange={() => {}} role="defensor" />);
    expect(screen.getByText("Plenário")).toBeInTheDocument();
    expect(screen.getByText("Sessões do Júri")).toBeInTheDocument();
    // A global group from COLLAPSIBLE_MENU_GROUPS is present too:
    expect(screen.getByText("Cadastros")).toBeInTheDocument();
  });

  it("the search field opens the command palette and closes the sheet", () => {
    const onOpenChange = vi.fn();
    render(<MobileMoreSheet open onOpenChange={onOpenChange} role="defensor" />);
    fireEvent.click(screen.getByText(/Buscar seção/i));
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onOpenChange.mock.invocationCallOrder[0]).toBeLessThan(openSpy.mock.invocationCallOrder[0]);
  });
});
