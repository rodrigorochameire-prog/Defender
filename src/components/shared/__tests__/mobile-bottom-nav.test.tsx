// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MobileBottomNav } from "@/components/shared/mobile-bottom-nav";

afterEach(cleanup);
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/demandas" }));

describe("MobileBottomNav", () => {
  it("renders exactly the 4 fixed tabs and no 'Mais'", () => {
    render(<MobileBottomNav />);
    ["Home", "Agenda", "Demandas", "Assistidos"].forEach((label) =>
      expect(screen.getByText(label)).toBeInTheDocument(),
    );
    expect(screen.queryByText("Mais")).toBeNull();
  });

  it("marks the active tab from the pathname", () => {
    render(<MobileBottomNav />);
    expect(screen.getByText("Demandas").closest("a")).toHaveAttribute("aria-current", "page");
  });
});
