import { execSync } from "node:child_process";
import { describe, it, expect } from "vitest";
import {
  formatTelefone,
  formatProcesso,
  formatNomeArquivo,
  formatVara,
  formatArea,
} from "./apresentacao";

// ---------------------------------------------------------------------------
// formatTelefone
// ---------------------------------------------------------------------------
describe("formatTelefone", () => {
  // [entrada, esperado]
  const casos: Array<[string, string]> = [
    // 13 dígitos: DDI(55) + DDD(2) + 9 dígitos → celular
    ["5571993582869", "(71) 99358-2869"],
    // 12 dígitos: DDI(55) + DDD(2) + 8 dígitos → fixo
    ["557135086246", "(71) 3508-6246"],
    // 11 dígitos sem DDI: DDD(2) + 9 dígitos → celular
    ["71993582869", "(71) 99358-2869"],
    // 10 dígitos sem DDI: DDD(2) + 8 dígitos → fixo
    ["7135086246", "(71) 3508-6246"],
    // já mascarado/sujo com DDI → normaliza
    ["+55 (71) 99358-2869", "(71) 99358-2869"],
  ];

  it.each(casos)("formata %s → %s", (raw, esperado) => {
    expect(formatTelefone(raw)).toBe(esperado);
  });

  it("é idempotente (formatar valor já formatado não corrompe)", () => {
    const uma = formatTelefone("5571993582869");
    expect(formatTelefone(uma)).toBe(uma);
    const fixo = formatTelefone("557135086246");
    expect(formatTelefone(fixo)).toBe(fixo);
  });

  it("retorna a entrada limpa graciosamente quando não dá para parsear", () => {
    // muito curto / não-brasileiro: devolve algo, sem quebrar
    expect(formatTelefone("123")).toBe("123");
    expect(formatTelefone("")).toBe("");
  });

  it("supera o formatador inline antigo para os comprimentos 12 e 13", () => {
    // mesmo recorte do inline legado
    expect(formatTelefone("5571993582869")).toBe("(71) 99358-2869");
    expect(formatTelefone("557135086246")).toBe("(71) 3508-6246");
  });
});

// ---------------------------------------------------------------------------
// formatProcesso
// ---------------------------------------------------------------------------
describe("formatProcesso", () => {
  const CNJ = "2000109-71.2025.8.05.0039";
  const DIGITOS = "20001097120258050039";

  it("aplica a máscara CNJ a partir dos 20 dígitos crus", () => {
    expect(formatProcesso(DIGITOS)).toBe(CNJ);
  });

  it("mantém um CNJ já mascarado (idempotente)", () => {
    expect(formatProcesso(CNJ)).toBe(CNJ);
  });

  it("trunca sufixo técnico grudado (timestamp/id de scraping)", () => {
    const sujo = `${DIGITOS}-1762785454112-1329818-abc`;
    expect(formatProcesso(sujo)).toBe(CNJ);
  });

  it("trunca sufixo técnico mesmo quando o CNJ vem mascarado", () => {
    const sujo = `${CNJ}-1762785454112-1329818`;
    expect(formatProcesso(sujo)).toBe(CNJ);
  });

  it("retorna a entrada limpa graciosamente quando não há 20 dígitos", () => {
    expect(formatProcesso("123")).toBe("123");
    expect(formatProcesso("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// formatNomeArquivo
// ---------------------------------------------------------------------------
describe("formatNomeArquivo", () => {
  it("remove prefixo de CNJ/timestamp/id e preserva nome + extensão", () => {
    const raw = "20001097120258050039-1762785454112-1329818-peticao_inicial.pdf";
    expect(formatNomeArquivo(raw)).toBe("peticao_inicial.pdf");
  });

  it("remove prefixo de timestamp simples", () => {
    expect(formatNomeArquivo("1762785454112-laudo.pdf")).toBe("laudo.pdf");
  });

  it("é idempotente para nome já amigável", () => {
    expect(formatNomeArquivo("peticao_inicial.pdf")).toBe("peticao_inicial.pdf");
  });

  it("não quebra com entrada sem extensão nem prefixo", () => {
    expect(formatNomeArquivo("relatorio")).toBe("relatorio");
    expect(formatNomeArquivo("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// formatVara
// ---------------------------------------------------------------------------
describe("formatVara", () => {
  it("normaliza CAIXA ALTA para capitalização natural", () => {
    expect(formatVara("VARA CRIMINAL DE CAMAÇARI")).toBe(
      "Vara Criminal de Camaçari",
    );
  });

  it("retorna vazio graciosamente para entrada vazia/nula", () => {
    expect(formatVara("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// formatArea (delega para atribuicoes.ts)
// ---------------------------------------------------------------------------
describe("formatArea", () => {
  it("resolve o rótulo acentuado central", () => {
    expect(formatArea("VVD")).toBe("Violência Doméstica");
    expect(formatArea("JURI")).toBe("Tribunal do Júri");
    expect(formatArea("EXECUCAO")).toBe("Execução Penal");
  });

  it("não inventa rótulo: chave desconhecida cai no rótulo padrão", () => {
    expect(formatArea("DESCONHECIDO")).toBe("Todos");
  });
});

// ---------------------------------------------------------------------------
// Regressão: nenhum formatador de telefone inline pode existir fora de
// src/lib/format/. O único formatador de telefone é formatTelefone aqui.
// ---------------------------------------------------------------------------
describe("regressão: sem formatPhone inline fora de src/lib/format", () => {
  it(
    "não encontra definição inline de formatPhone em src/",
    () => {
      // `git grep` é rápido (indexado) e ignora node_modules por definição.
      // Procura `formatPhone =` ou `function formatPhone(` em src/, exceto a
      // própria camada central. git grep retorna exit 1 (sem match) → limpo.
      let out = "";
      try {
        out = execSync(
          "git grep -nE '(formatPhone[[:space:]]*=|function[[:space:]]+formatPhone\\()' -- 'src/**/*.ts' 'src/**/*.tsx' ':!src/lib/format/'",
          { cwd: process.cwd(), encoding: "utf8" },
        ).trim();
      } catch (err) {
        // exit 1 = nenhum match (caso esperado). Qualquer stdout vira a saída.
        const e = err as { stdout?: string | Buffer };
        out = (e.stdout?.toString() ?? "").trim();
      }
      expect(out).toBe("");
    },
    15000,
  );
});
