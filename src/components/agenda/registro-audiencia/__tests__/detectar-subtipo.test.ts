import { describe, it, expect } from "vitest";
import { detectarSubtipo, SUBTIPO_CONFIG, type SubtipoAudiencia } from "../subtipo-audiencia";

/**
 * Trava a identificação do tipo de audiência. Cada valor REAL gravado em
 * `audiencias.tipo` (mais as variantes por atribuição) deve resolver para o
 * subtipo certo — uma classificação errada muda o banner/lembretes e atrapalha
 * a preparação. Se um caso quebrar aqui, é regressão.
 */
describe("detectarSubtipo — valores reais do banco", () => {
  const casos: Array<[string, string | null, string | null, SubtipoAudiencia]> = [
    // [tipo gravado, classe, atribuição, esperado]
    ["Audiência de Instrução e Julgamento", "Ação Penal", "VVD_CAMACARI", "aij"],
    ["Oitiva Especial", null, "VVD_CAMACARI", "oitiva_especial"],
    ["Justificação", "MPUMPCrim", "VVD_CAMACARI", "justificacao"],
    ["Sessão de Julgamento do Tribunal do Júri", "Homicídio", "JURI_CAMACARI", "plenario"],
    ["Audiência Admonitória", "Execução da Pena", "EXECUCAO_PENAL", "admonitoria"],
    ["Produção Antecipada de Provas", "Ação Penal", "CRIMINAL_CAMACARI", "pap"],
    ["Instrução + Depoimento Especial", null, "VVD_CAMACARI", "aij"],
    ["Audiência de Justificação", "MPUMPCrim", "VVD_CAMACARI", "justificacao"],
    ["Acordo de Não Persecução Penal", "Ação Penal", "CRIMINAL_CAMACARI", "anpp"],
    ["Audiência de Custódia", "Auto de Prisão em Flagrante", "CRIMINAL_CAMACARI", "custodia"],
  ];

  it.each(casos)("%s (%s) → %s", (tipo, classe, atrib, esperado) => {
    expect(detectarSubtipo(tipo, classe, atrib)).toBe(esperado);
  });
});

describe("detectarSubtipo — desambiguação Justificação por atribuição", () => {
  it("Justificação em VVD = MPU (art. 19 §1º)", () => {
    expect(detectarSubtipo("Justificação", "MPUMPCrim", "VVD_CAMACARI")).toBe("justificacao");
  });
  it("Justificação em EP = falta/descumprimento (chave EXECUCAO_PENAL)", () => {
    expect(detectarSubtipo("Justificação", null, "EXECUCAO_PENAL")).toBe("justificacao_ep");
  });
  it("Justificação em EP = falta/descumprimento (rótulo acentuado)", () => {
    expect(detectarSubtipo("Justificação", null, "Execução Penal")).toBe("justificacao_ep");
  });
  it("Justificação sem atribuição cai no padrão VVD", () => {
    expect(detectarSubtipo("Justificação", null, null)).toBe("justificacao");
  });
});

describe("detectarSubtipo — robustez", () => {
  it("tipo vazio → indefinido", () => {
    expect(detectarSubtipo("", null, null)).toBe("indefinido");
    expect(detectarSubtipo(null, null, null)).toBe("indefinido");
  });
  it("variações de caixa/acento da justificação", () => {
    expect(detectarSubtipo("JUSTIFICACAO", null, "VVD_CAMACARI")).toBe("justificacao");
    expect(detectarSubtipo("justificação", null, "VVD_CAMACARI")).toBe("justificacao");
  });
  it("AIJ não é capturada por PAP nem vice-versa", () => {
    expect(detectarSubtipo("Audiência de Instrução e Julgamento", null, "CRIMINAL_CAMACARI")).toBe("aij");
    expect(detectarSubtipo("Produção Antecipada de Provas", null, "CRIMINAL_CAMACARI")).toBe("pap");
  });
  it("todo subtipo tem config completa (flags coerentes)", () => {
    for (const key of Object.keys(SUBTIPO_CONFIG) as SubtipoAudiencia[]) {
      const cfg = SUBTIPO_CONFIG[key];
      expect(cfg.key).toBe(key);
      expect(typeof cfg.instrucaoCompleta).toBe("boolean");
      expect(cfg.foco.length).toBeGreaterThan(0);
      // só plenário direciona ao cockpit
      if (cfg.direcionaCockpit) expect(key).toBe("plenario");
      // ritos sem oitiva não exibem aba de depoentes
      if (key === "admonitoria" || key === "anpp") expect(cfg.exibeAbaDepoentes).toBe(false);
    }
  });
});
