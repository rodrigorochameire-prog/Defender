import { describe, it, expect } from "vitest";
import {
  SKILL_ACTIONS,
  actionsFor,
  isEnabled,
  actionById,
  type SkillAction,
} from "../action-registry";

describe("SKILL_ACTIONS catalog", () => {
  it("tem ids únicos", () => {
    const ids = SKILL_ACTIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("toda ação referencia uma skill e tem ao menos uma surface", () => {
    for (const a of SKILL_ACTIONS) {
      expect(a.skill.length).toBeGreaterThan(0);
      expect(a.surfaces.length).toBeGreaterThan(0);
    }
  });

  it("catálogo inclui as integrações reais conhecidas", () => {
    const ids = new Set(SKILL_ACTIONS.map((a) => a.id));
    for (const id of [
      "pergunte-ao-auto",
      "analise-acordao",
      "oficio-gratificacao",
      "transcrever-audiencia",
    ]) {
      expect(ids.has(id)).toBe(true);
    }
  });
});

describe("isEnabled", () => {
  const action: SkillAction = {
    id: "x",
    skill: "x",
    label: "X",
    description: "",
    icon: "Sparkles",
    surfaces: ["processo"],
    requires: ["processoId"],
    result: "analise-blocks",
    status: "live",
  };

  it("habilita quando o contexto exigido está presente", () => {
    expect(isEnabled(action, { available: { processoId: 10 } })).toBe(true);
  });

  it("desabilita quando falta contexto exigido", () => {
    expect(isEnabled(action, { available: {} })).toBe(false);
    expect(isEnabled(action, { available: { processoId: undefined } })).toBe(false);
  });

  it("respeita restrição de atribuição", () => {
    const restrito: SkillAction = { ...action, atribuicao: ["JURI_CAMACARI"] };
    expect(isEnabled(restrito, { available: { processoId: 1 }, atribuicao: "JURI_CAMACARI" })).toBe(true);
    expect(isEnabled(restrito, { available: { processoId: 1 }, atribuicao: "VVD_CAMACARI" })).toBe(false);
    // sem atribuição no contexto, ação restrita não habilita (conservador)
    expect(isEnabled(restrito, { available: { processoId: 1 } })).toBe(false);
  });
});

describe("actionsFor", () => {
  it("filtra por surface e por contexto disponível", () => {
    const res = actionsFor("recurso", { available: { recursoId: 5, acordaoId: 9 } });
    expect(res.some((a) => a.id === "analise-acordao")).toBe(true);
    // ação de outra surface não aparece
    expect(res.every((a) => a.surfaces.includes("recurso"))).toBe(true);
  });

  it("não retorna ações cujo contexto exigido está ausente", () => {
    const semContexto = actionsFor("recurso", { available: {} });
    expect(semContexto.length).toBe(0);
  });

  it("é determinístico e não muta o catálogo", () => {
    const antes = SKILL_ACTIONS.length;
    actionsFor("processo", { available: { processoId: 1 } });
    expect(SKILL_ACTIONS.length).toBe(antes);
  });
});

describe("actionById", () => {
  it("encontra por id e retorna undefined p/ inexistente", () => {
    expect(actionById("pergunte-ao-auto")?.skill).toBe("pergunte-ao-auto");
    expect(actionById("nao-existe")).toBeUndefined();
  });
});
