import { describe, it, expect } from "vitest";
import { entityFromPathname } from "../palette-context";

describe("entityFromPathname", () => {
  it("recognizes a processo detail route", () => {
    expect(entityFromPathname("/admin/processos/123")).toEqual({
      entity: "processo",
      id: 123,
    });
  });

  it("recognizes an assistido detail route", () => {
    expect(entityFromPathname("/admin/assistidos/45")).toEqual({
      entity: "assistido",
      id: 45,
    });
  });

  it("tolerates trailing slash and query string", () => {
    expect(entityFromPathname("/admin/processos/7/")).toEqual({
      entity: "processo",
      id: 7,
    });
    expect(entityFromPathname("/admin/assistidos/9?tab=timeline")).toEqual({
      entity: "assistido",
      id: 9,
    });
  });

  it("ignores the 'novo' creation route (non-numeric id)", () => {
    expect(entityFromPathname("/admin/processos/novo")).toBeNull();
    expect(entityFromPathname("/admin/assistidos/novo")).toBeNull();
  });

  it("ignores deeper sub-routes (e.g. a caso under an assistido) — only the entity root", () => {
    // Sub-rota: ainda é o assistido 45 em foco; aceitamos o id raiz.
    expect(entityFromPathname("/admin/assistidos/45/caso/12")).toEqual({
      entity: "assistido",
      id: 45,
    });
  });

  it("returns null for non-entity routes", () => {
    expect(entityFromPathname("/admin/demandas")).toBeNull();
    expect(entityFromPathname("/admin/agenda")).toBeNull();
    expect(entityFromPathname("/admin")).toBeNull();
    expect(entityFromPathname("/")).toBeNull();
  });

  it("returns null for null/empty input", () => {
    expect(entityFromPathname(null)).toBeNull();
    expect(entityFromPathname("")).toBeNull();
  });

  it("rejects a non-positive or non-integer id", () => {
    expect(entityFromPathname("/admin/processos/0")).toBeNull();
    expect(entityFromPathname("/admin/processos/-3")).toBeNull();
    expect(entityFromPathname("/admin/processos/1.5")).toBeNull();
    expect(entityFromPathname("/admin/processos/abc")).toBeNull();
  });
});
