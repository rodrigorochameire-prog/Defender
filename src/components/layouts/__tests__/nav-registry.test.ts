import { describe, it, expect } from "vitest";
import {
  BOTTOM_TABS,
  isTabActive,
  getLauncherGroups,
} from "@/components/layouts/nav-registry";
import type { MenuSection } from "@/contexts/assignment-context";

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

describe("getLauncherGroups", () => {
  const modules: MenuSection[] = [
    { title: "Plenário", items: [{ label: "Sessões", path: "/admin/juri", icon: "Gavel" }] },
  ];
  it("prepends the assignment modules, then global + system groups", () => {
    const groups = getLauncherGroups(modules, "defensor");
    expect(groups[0].title).toBe("Plenário");
    expect(groups.some((g) => g.title === "Cadastros")).toBe(true);
    expect(groups.some((g) => g.title === "Sistema")).toBe(true);
  });
  it("filters items whose requiredRoles exclude the current role", () => {
    const restricted: MenuSection[] = [
      {
        title: "Restrito",
        items: [
          { label: "Só admin", path: "/admin/x", icon: "Lock", requiredRoles: ["admin"] },
          { label: "Todos", path: "/admin/y", icon: "Globe" },
        ],
      },
    ];
    const groups = getLauncherGroups(restricted, "estagiario");
    const restrito = groups.find((g) => g.title === "Restrito")!;
    expect(restrito.items.map((i) => i.label)).toEqual(["Todos"]);
  });
  it("drops groups left empty after role filtering", () => {
    const restricted: MenuSection[] = [
      { title: "VazioPraEstagiario", items: [{ label: "X", path: "/admin/x", icon: "Lock", requiredRoles: ["admin"] }] },
    ];
    const groups = getLauncherGroups(restricted, "estagiario");
    expect(groups.some((g) => g.title === "VazioPraEstagiario")).toBe(false);
  });
  it("dedupes items by path across groups (first wins)", () => {
    const dup: MenuSection[] = [
      { title: "A", items: [{ label: "Assistidos", path: "/admin/assistidos", icon: "Users" }] },
    ];
    const groups = getLauncherGroups(dup, "defensor");
    const allPaths = groups.flatMap((g) => g.items.map((i) => i.path));
    const occurrences = allPaths.filter((p) => p === "/admin/assistidos").length;
    expect(occurrences).toBe(1);
  });
});
