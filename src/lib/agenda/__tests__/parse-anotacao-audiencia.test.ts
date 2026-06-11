import { describe, it, expect } from "vitest";
import { parseAnotacaoAudiencia } from "../parse-anotacao-audiencia";

describe("parseAnotacaoAudiencia", () => {
  it("detecta redesignação por ausência da vítima, sem nova data (caso real 11/06)", () => {
    const r = parseAnotacaoAudiencia("Audiência redesignada, por ausência da suposta vítima, apesar de intimada.");
    expect(r).toMatchObject({ evento: "redesignada", motivo: "ausencia_vitima", novaData: null });
  });

  it("detecta suspensão pelo juízo (pauta_juizo)", () => {
    const r = parseAnotacaoAudiencia("Audiência suspensa pelo juízo; cartório designará nova data.");
    expect(r).toMatchObject({ evento: "suspensa", motivo: "pauta_juizo", novaData: null });
  });

  it("detecta redesignação COM nova data e hora", () => {
    const r = parseAnotacaoAudiencia("Audiência adiada para 22/07/2026 às 14h30 por ausência de testemunha.");
    expect(r).toMatchObject({ evento: "adiada", motivo: "ausencia_testemunha", novaData: "2026-07-22", novaHora: "14:30" });
  });

  it("réu não conduzido", () => {
    const r = parseAnotacaoAudiencia("Cancelada: réu preso não foi conduzido (sem escolta).");
    expect(r).toMatchObject({ evento: "cancelada", motivo: "reu_nao_conduzido" });
  });

  it("problema técnico de videoconferência", () => {
    const r = parseAnotacaoAudiencia("Audiência não foi realizada por falha na videoconferência.");
    expect(r).toMatchObject({ motivo: "problema_tecnico" });
  });

  it("evento sem motivo do catálogo cai em outro", () => {
    const r = parseAnotacaoAudiencia("Audiência redesignada por motivo de força maior.");
    expect(r).toMatchObject({ evento: "redesignada", motivo: "outro" });
  });

  it("polaridade: audiência realizada/mantida NÃO dispara", () => {
    expect(parseAnotacaoAudiencia("Audiência realizada, vítima ouvida em juízo.")).toBeNull();
    expect(parseAnotacaoAudiencia("Audiência mantida para a data designada.")).toBeNull();
  });

  it("anotação não relacionada retorna null", () => {
    expect(parseAnotacaoAudiencia("Assistido pediu cópia da denúncia.")).toBeNull();
    expect(parseAnotacaoAudiencia("Conversar com a genitora antes da instrução.")).toBeNull();
    expect(parseAnotacaoAudiencia("")).toBeNull();
    expect(parseAnotacaoAudiencia(null)).toBeNull();
  });
});
