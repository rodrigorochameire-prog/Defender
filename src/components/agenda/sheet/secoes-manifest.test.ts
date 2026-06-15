import { describe, it, expect } from "vitest";
import { SECOES_DEFAULT, SECOES_JUSTIFICACAO, resolverManifesto } from "./secoes-manifest";

describe("resolverManifesto", () => {
  it("usa o manifesto próprio quando o subtipo define secoes", () => {
    expect(resolverManifesto({ secoes: SECOES_JUSTIFICACAO })).toBe(SECOES_JUSTIFICACAO);
  });

  it("cai para o default quando o subtipo não define secoes", () => {
    expect(resolverManifesto({})).toBe(SECOES_DEFAULT);
  });

  it("a Justificação não inclui seções de ação penal", () => {
    for (const penal of ["imputacao", "fatos", "sintese", "contradicoes", "laudos", "teses"] as const) {
      expect(SECOES_JUSTIFICACAO).not.toContain(penal);
    }
  });

  it("a Justificação põe o motivo antes das medidas e o requerimento logo após o motivo", () => {
    const iMotivo = SECOES_JUSTIFICACAO.indexOf("motivo-designacao");
    const iReq = SECOES_JUSTIFICACAO.indexOf("requerimento-defesa");
    const iMed = SECOES_JUSTIFICACAO.indexOf("medidas");
    expect(iMotivo).toBeGreaterThanOrEqual(0);
    expect(iReq).toBe(iMotivo + 1);
    expect(iMed).toBeGreaterThan(iReq);
  });

  it("o default preserva a ordem atual do corpo (resumo→dossie→medidas no topo)", () => {
    expect(SECOES_DEFAULT.slice(0, 3)).toEqual(["resumo", "dossie", "medidas"]);
  });
});
