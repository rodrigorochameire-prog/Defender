import { describe, it, expect } from "vitest";
import {
  SECOES_DEFAULT,
  SECOES_JUSTIFICACAO,
  SECOES_INSTRUCAO,
  GRUPO_CONTEXTO_INSTRUCAO,
  resolverManifesto,
  type SecaoId,
} from "./secoes-manifest";

// Ordem antiga da instrução (antes da reorganização F1) — referência para
// garantir que a nova espinha não descartou nenhuma seção.
const SECOES_INSTRUCAO_ANTIGA: SecaoId[] = [
  "dossie",
  "depoentes",
  "teses",
  "imputacao",
  "fatos",
  "contradicoes",
  "laudos",
  "versao",
  "relato-vitima",
  "sintese",
  "investigacao",
  "pendencias",
  "medidas",
  "ata",
  "anotacoes-rapidas",
  "analise-ia",
  "documentos",
  "midia",
];

const ESPINHA_INSTRUCAO: SecaoId[] = [
  "resumo",
  "imputacao",
  "fatos",
  "depoentes",
  "intimacao",    // ← Intimações tab (A4)
  "depoimentos",
  "laudos",
  "documentos",
  "dossie",
  "teses",
];

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

describe("SECOES_INSTRUCAO (espinha + Preparação + Contexto)", () => {
  it("começa exatamente pela espinha de 8 + Preparação (dossie, teses)", () => {
    expect(SECOES_INSTRUCAO.slice(0, ESPINHA_INSTRUCAO.length)).toEqual(ESPINHA_INSTRUCAO);
  });

  it("não descartou nenhuma seção da ordem antiga", () => {
    for (const id of SECOES_INSTRUCAO_ANTIGA) {
      expect(SECOES_INSTRUCAO).toContain(id);
    }
  });

  it("adicionou resumo e depoimentos (faltavam na instrução)", () => {
    expect(SECOES_INSTRUCAO).toContain("resumo");
    expect(SECOES_INSTRUCAO).toContain("depoimentos");
  });

  it("não tem ids duplicados", () => {
    expect(new Set(SECOES_INSTRUCAO).size).toBe(SECOES_INSTRUCAO.length);
  });
});

describe("GRUPO_CONTEXTO_INSTRUCAO", () => {
  it("é disjunto da espinha de 10 itens", () => {
    const espinha = new Set(ESPINHA_INSTRUCAO);
    for (const id of GRUPO_CONTEXTO_INSTRUCAO) {
      expect(espinha.has(id)).toBe(false);
    }
  });

  it("espinha ∪ contexto cobre todas as seções de SECOES_INSTRUCAO", () => {
    const cobertura = new Set<SecaoId>([...ESPINHA_INSTRUCAO, ...GRUPO_CONTEXTO_INSTRUCAO]);
    expect(cobertura.size).toBe(SECOES_INSTRUCAO.length);
    for (const id of SECOES_INSTRUCAO) {
      expect(cobertura.has(id)).toBe(true);
    }
  });

  it("contém as 11 seções de contexto esperadas", () => {
    expect([...GRUPO_CONTEXTO_INSTRUCAO].sort()).toEqual(
      [
        "contradicoes",
        "versao",
        "relato-vitima",
        "sintese",
        "investigacao",
        "pendencias",
        "medidas",
        "ata",
        "anotacoes-rapidas",
        "analise-ia",
        "midia",
      ].sort(),
    );
  });
});
