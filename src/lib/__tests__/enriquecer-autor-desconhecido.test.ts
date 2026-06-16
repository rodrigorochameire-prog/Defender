import { describe, it, expect } from "vitest";
import { computarNomeEnriquecido } from "../services/enriquecer-autor-desconhecido";

describe("computarNomeEnriquecido", () => {
  it("compõe o nome descritivo do processo + assistido desconhecido", () => {
    expect(computarNomeEnriquecido({
      autorNaoIdentificado: true,
      numeroAutos: "8013994-84.2024.8.05.0039",
      classeProcessual: "PRODUÇÃO ANTECIPADA DE PROVAS CRIMINAL",
      assunto: "Estupro", comarca: "Camaçari",
      parteContraria: "Desconhecido 1 (REQUERIDO)",
    })).toBe("Desconhecido 1 — Estupro (PAP · Camaçari)");
  });
  it("não enriquece quando o assistido não é autor desconhecido", () => {
    expect(computarNomeEnriquecido({
      autorNaoIdentificado: false, numeroAutos: "X", assunto: "Estupro",
    })).toBeNull();
  });
  it("não enriquece sem tipo (placeholder permanece) → null", () => {
    expect(computarNomeEnriquecido({ autorNaoIdentificado: true, numeroAutos: "X" })).toBeNull();
  });
});
