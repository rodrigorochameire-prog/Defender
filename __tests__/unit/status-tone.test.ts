import { describe, it, expect } from "vitest";
import { statusTone } from "@/components/agenda/registro-audiencia/historico/status-tone";

describe("statusTone", () => {
  it("concluída sentenciada → emerald/Sentenciada/✓", () => {
    expect(statusTone({ realizada: true, resultado: "sentenciado" })).toEqual({
      tone: "emerald",
      label: "Sentenciada",
      shortLabel: "✓",
    });
  });

  it("concluída genérica → emerald/Concluída/✓", () => {
    expect(statusTone({ realizada: true, resultado: "instrucao_encerrada" })).toEqual({
      tone: "emerald",
      label: "Concluída",
      shortLabel: "✓",
    });
  });

  it("redesignada via resultado → rose/Redesignada/RED", () => {
    expect(statusTone({ resultado: "redesignada" })).toEqual({
      tone: "rose",
      label: "Redesignada",
      shortLabel: "RED",
    });
  });

  it("redesignada via status → rose", () => {
    expect(statusTone({ status: "redesignada" })).toEqual({
      tone: "rose",
      label: "Redesignada",
      shortLabel: "RED",
    });
  });

  it("suspensa → amber/Suspensa/SUS", () => {
    expect(statusTone({ resultado: "suspensa" })).toEqual({
      tone: "amber",
      label: "Suspensa",
      shortLabel: "SUS",
    });
  });

  it("decretoRevelia truthy → neutral/Decreto Revelia/REV", () => {
    expect(statusTone({ decretoRevelia: true })).toEqual({
      tone: "neutral",
      label: "Decreto Revelia",
      shortLabel: "REV",
    });
  });

  it("desistencia truthy → slate/Desistência/DES", () => {
    expect(statusTone({ resultado: "desistencia" })).toEqual({
      tone: "slate",
      label: "Desistência",
      shortLabel: "DES",
    });
  });

  it("default (vazio) → neutral/Pendente/—", () => {
    expect(statusTone({})).toEqual({
      tone: "neutral",
      label: "Pendente",
      shortLabel: "—",
    });
  });
});
