import { describe, it, expect } from "vitest";
import { metadataLine, resolveReadiness } from "../atendimento-semantica";

describe("metadataLine — área e tipo como texto, nunca badge forte", () => {
  it('área + tipo viram "Área · Tipo"', () => {
    expect(metadataLine({ area: "VIOLENCIA_DOMESTICA", subtipo: "inicial" })).toBe("Violência Doméstica · Inicial");
    expect(metadataLine({ area: "JURI", subtipo: "retorno" })).toBe("Tribunal do Júri · Retorno");
  });

  it("só área, sem tipo", () => {
    expect(metadataLine({ area: "EXECUCAO_PENAL", subtipo: null })).toBe("Execução Penal");
  });

  it("só tipo, sem área", () => {
    expect(metadataLine({ area: null, subtipo: "inicial" })).toBe("Inicial");
  });

  it("sem área nem tipo retorna string vazia", () => {
    expect(metadataLine({ area: null, subtipo: null })).toBe("");
  });
});

describe("resolveReadiness — badge sutil opcional", () => {
  it('dossiê de skill → "Dossiê preparado"', () => {
    expect(resolveReadiness({ dossieAtendimento: { fonte: "skill" } })).toEqual({ label: "Dossiê preparado" });
  });

  it('contexto OMBUDS → "Contexto preparado"', () => {
    expect(resolveReadiness({ dossieAtendimento: { fonte: "ombuds" } })).toEqual({ label: "Contexto preparado" });
  });

  it("dossiê sem fonte explícita ainda conta como contexto preparado", () => {
    expect(resolveReadiness({ dossieAtendimento: {} })).toEqual({ label: "Contexto preparado" });
  });

  it("sem dossiê → null (nenhum badge sutil)", () => {
    expect(resolveReadiness({ dossieAtendimento: null })).toBeNull();
  });
});
