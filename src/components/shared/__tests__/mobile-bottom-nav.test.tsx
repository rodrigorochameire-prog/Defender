// @vitest-environment happy-dom
// src/components/shared/__tests__/mobile-bottom-nav.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MobileBottomNav } from "@/components/shared/mobile-bottom-nav";

afterEach(cleanup);

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/demandas" }));
vi.mock("@/contexts/assignment-context", async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>);
  return { ...actual, useAssignment: () => ({ currentAssignment: "SUBSTITUICAO", modules: [] }) };
});

describe("MobileBottomNav", () => {
  it("renders 4 tabs plus a Mais button", () => {
    render(<MobileBottomNav role="defensor" />);
    ["Home", "Agenda", "Demandas", "Assistidos", "Mais"].forEach((label) =>
      expect(screen.getByText(label)).toBeInTheDocument(),
    );
  });

  it("marks the active tab from the pathname", () => {
    render(<MobileBottomNav role="defensor" />);
    const demandas = screen.getByText("Demandas").closest("a")!;
    expect(demandas).toHaveAttribute("aria-current", "page");
  });

  it("opens the launcher when Mais is tapped", () => {
    render(<MobileBottomNav role="defensor" />);
    fireEvent.click(screen.getByText("Mais"));
    // The launcher search field becomes visible.
    expect(screen.getByText(/Buscar seção/i)).toBeInTheDocument();
  });
});
