import { describe, it, expect } from "vitest";
import { BOTTOM_TABS, isTabActive } from "@/components/layouts/nav-registry";

describe("BOTTOM_TABS", () => {
  it("has exactly 4 fixed tabs in order Home, Agenda, Demandas, Assistidos", () => {
    expect(BOTTOM_TABS.map((t) => t.label)).toEqual([
      "Home",
      "Agenda",
      "Demandas",
      "Assistidos",
    ]);
    expect(BOTTOM_TABS.map((t) => t.path)).toEqual([
      "/admin",
      "/admin/agenda",
      "/admin/demandas",
      "/admin/assistidos",
    ]);
  });
});

describe("isTabActive", () => {
  const home = BOTTOM_TABS[0]; // /admin, matchExact
  const demandas = BOTTOM_TABS[2]; // /admin/demandas
  it("matches Home only exactly", () => {
    expect(isTabActive("/admin", home)).toBe(true);
    expect(isTabActive("/admin/demandas", home)).toBe(false);
  });
  it("matches prefix tabs on subpaths", () => {
    expect(isTabActive("/admin/demandas", demandas)).toBe(true);
    expect(isTabActive("/admin/demandas/123", demandas)).toBe(true);
    expect(isTabActive("/admin/assistidos", demandas)).toBe(false);
  });
});
