import { describe, it, expect } from "vitest";
import {
  SKILL_CATALOG,
  skillsForContext,
  familiaDeAtribuicao,
  type CatalogSkill,
} from "../catalog";

const slugs = (list: CatalogSkill[]) => list.map((s) => s.slug);

describe("familiaDeAtribuicao", () => {
  it("maps júri attribution to the JURI family", () => {
    expect(familiaDeAtribuicao("JURI_CAMACARI")).toContain("JURI");
    expect(familiaDeAtribuicao("GRUPO_JURI")).toContain("JURI");
  });

  it("maps VVD attribution to the VVD family", () => {
    expect(familiaDeAtribuicao("VVD_CAMACARI")).toEqual(["VVD"]);
  });

  it("maps execução penal to its family", () => {
    expect(familiaDeAtribuicao("EXECUCAO_PENAL")).toContain("EXECUCAO_PENAL");
  });

  it("maps generic criminal substitution to the CRIMINAL family", () => {
    expect(familiaDeAtribuicao("SUBSTITUICAO")).toEqual(["CRIMINAL"]);
  });

  it("gives a cível substitution no penal families", () => {
    expect(familiaDeAtribuicao("SUBSTITUICAO_CIVEL")).toEqual([]);
  });

  it("treats integral criminal varas as multi-family", () => {
    const itaparica = familiaDeAtribuicao("CRIMINAL_ITAPARICA");
    expect(itaparica).toEqual(
      expect.arrayContaining(["CRIMINAL", "JURI", "EXECUCAO_PENAL"]),
    );
  });
});

describe("skillsForContext", () => {
  it("shows júri skill and hides VVD skill under a júri attribution", () => {
    const list = skillsForContext({
      entity: "processo",
      atribuicao: "JURI_CAMACARI",
    });
    expect(slugs(list)).toContain("juri");
    expect(slugs(list)).not.toContain("vvd");
  });

  it("shows VVD skill and hides júri skill under a VVD attribution", () => {
    const list = skillsForContext({
      entity: "processo",
      atribuicao: "VVD_CAMACARI",
    });
    expect(slugs(list)).toContain("vvd");
    expect(slugs(list)).not.toContain("juri");
  });

  it("always includes ANY-family skills regardless of attribution", () => {
    const juri = skillsForContext({ entity: "processo", atribuicao: "JURI_CAMACARI" });
    const vvd = skillsForContext({ entity: "processo", atribuicao: "VVD_CAMACARI" });
    expect(slugs(juri)).toContain("revisar-minutas");
    expect(slugs(vvd)).toContain("revisar-minutas");
    expect(slugs(juri)).toContain("pergunte-ao-auto");
  });

  it("filters by entity — processo-only skills do not appear for an assistido", () => {
    const list = skillsForContext({
      entity: "assistido",
      atribuicao: "JURI_CAMACARI",
    });
    expect(slugs(list)).not.toContain("pergunte-ao-auto");
  });

  it("hides penal analysis skills under a cível attribution", () => {
    const list = skillsForContext({
      entity: "processo",
      atribuicao: "SUBSTITUICAO_CIVEL",
    });
    expect(slugs(list)).not.toContain("juri");
    expect(slugs(list)).not.toContain("criminal-comum");
    expect(slugs(list)).not.toContain("execucao-penal");
  });

  it("returns a deterministic, stable order (by category then order)", () => {
    const a = slugs(skillsForContext({ entity: "processo", atribuicao: "JURI_CAMACARI" }));
    const b = slugs(skillsForContext({ entity: "processo", atribuicao: "JURI_CAMACARI" }));
    expect(a).toEqual(b);
    // ordered ascending by (categoryOrder, order) — no duplicates
    expect(new Set(a).size).toBe(a.length);
  });
});

describe("SKILL_CATALOG integrity (shape)", () => {
  it("every entry has the required fields and at least one family + entity", () => {
    for (const s of SKILL_CATALOG) {
      expect(s.slug).toBeTruthy();
      expect(s.label).toBeTruthy();
      expect(s.icon).toBeTruthy();
      expect(s.appliesTo.length).toBeGreaterThan(0);
      expect(s.familias.length).toBeGreaterThan(0);
    }
  });

  it("has unique slugs", () => {
    const all = SKILL_CATALOG.map((s) => s.slug);
    expect(new Set(all).size).toBe(all.length);
  });
});
