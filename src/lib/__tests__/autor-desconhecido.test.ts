import { describe, it, expect } from "vitest";
import {
  isAutorDesconhecido, placeholderAutorDesconhecido, siglaProcedimento,
  extrairNumeroDesconhecido, nomeAutorDesconhecido,
} from "../autor-desconhecido";

describe("isAutorDesconhecido", () => {
  it.each([
    ["Desconhecido 1", true],
    ["Não Identificado", true],
    ["⚠ A identificar — 0001234-56.2024.8.05.0039", true],
    ["Autor Incerto", true],
    ["Ignorado", true],
    ["Maria Eliana Santos", false],
    ["", false],
    [null, false],
  ])("'%s' → %s", (nome, esperado) => {
    expect(isAutorDesconhecido(nome as any)).toBe(esperado);
  });
});

describe("placeholderAutorDesconhecido", () => {
  it("ancora no CNJ", () => {
    expect(placeholderAutorDesconhecido("8013994-84.2024.8.05.0039"))
      .toBe("Desconhecido — 8013994-84.2024.8.05.0039");
  });
});

describe("siglaProcedimento", () => {
  it.each([
    ["PRODUÇÃO ANTECIPADA DE PROVAS CRIMINAL", "PAP"],
    ["Inquérito Policial", "IP"],
    ["Ação Penal", "AP"],
    ["Medidas Protetivas de Urgência", "MPU"],
    ["Execução da Pena", "EP"],
  ])("'%s' → %s", (classe, sigla) => {
    expect(siglaProcedimento(classe)).toBe(sigla);
  });
  it("fallback = classe trimada quando desconhecida", () => {
    expect(siglaProcedimento("Algo Estranho")).toBe("Algo Estranho");
  });
  it("null quando vazia", () => {
    expect(siglaProcedimento(null)).toBeNull();
  });
});

describe("extrairNumeroDesconhecido", () => {
  it.each([
    ["Desconhecido 1 (REQUERIDO)", 1],
    ["Desconhecido 2", 2],
    ["Não Identificado", null],
    [null, null],
  ])("'%s' → %s", (s, n) => {
    expect(extrairNumeroDesconhecido(s as any)).toBe(n);
  });
});

describe("nomeAutorDesconhecido", () => {
  const cnj = "8013994-84.2024.8.05.0039";
  it("completo: N + tipo + (sigla · comarca)", () => {
    expect(nomeAutorDesconhecido({
      cnj, classe: "PRODUÇÃO ANTECIPADA DE PROVAS CRIMINAL", assunto: "Estupro",
      comarca: "Camaçari", poloPassivo: "Desconhecido 1 (REQUERIDO)",
    })).toBe("Desconhecido 1 — Estupro (PAP · Camaçari)");
  });
  it("sem assunto: usa a sigla como tipo, comarca em parênteses", () => {
    expect(nomeAutorDesconhecido({ cnj, classe: "Inquérito Policial", comarca: "Camaçari" }))
      .toBe("Desconhecido — IP (Camaçari)");
  });
  it("sem tipo nenhum → placeholder", () => {
    expect(nomeAutorDesconhecido({ cnj })).toBe("Desconhecido — " + cnj);
  });
  it("desempate acrescenta o sequencial do CNJ", () => {
    expect(nomeAutorDesconhecido({
      cnj, classe: "PRODUÇÃO ANTECIPADA DE PROVAS CRIMINAL", assunto: "Estupro",
      comarca: "Camaçari", poloPassivo: "Desconhecido 1 (REQUERIDO)", desempate: true,
    })).toBe("Desconhecido 1 — Estupro (PAP · Camaçari) · 8013994");
  });
});
