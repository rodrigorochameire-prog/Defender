import { describe, it, expect } from "vitest";
import { createEventoSchema, updateEventoSchema } from "@/lib/trpc/zod/demanda-eventos";

describe("createEventoSchema", () => {
  it("aceita diligencia feita sem prazo", () => {
    const r = createEventoSchema.safeParse({
      demandaId: 1, tipo: "diligencia", subtipo: "peticao",
      status: "feita", resumo: "Petição protocolada",
    });
    expect(r.success).toBe(true);
  });
  it("rejeita diligencia pendente sem prazo", () => {
    const r = createEventoSchema.safeParse({
      demandaId: 1, tipo: "diligencia", subtipo: "peticao",
      status: "pendente", resumo: "Protocolar petição",
    });
    expect(r.success).toBe(false);
  });
  it("aceita diligencia pendente com prazo", () => {
    const r = createEventoSchema.safeParse({
      demandaId: 1, tipo: "diligencia", subtipo: "peticao",
      status: "pendente", resumo: "Protocolar", prazo: "2026-05-01",
    });
    expect(r.success).toBe(true);
  });
  it("aceita atendimento com atendimentoId", () => {
    const r = createEventoSchema.safeParse({
      demandaId: 1, tipo: "atendimento", atendimentoId: 99,
      resumo: "Reunião com assistido",
    });
    expect(r.success).toBe(true);
  });
  it("rejeita observacao com subtipo", () => {
    const r = createEventoSchema.safeParse({
      demandaId: 1, tipo: "observacao", subtipo: "peticao",
      resumo: "nota",
    });
    expect(r.success).toBe(false);
  });
  it("rejeita resumo vazio", () => {
    const r = createEventoSchema.safeParse({
      demandaId: 1, tipo: "observacao", resumo: "",
    });
    expect(r.success).toBe(false);
  });
  it("rejeita resumo com mais de 140 chars", () => {
    const r = createEventoSchema.safeParse({
      demandaId: 1, tipo: "observacao", resumo: "x".repeat(141),
    });
    expect(r.success).toBe(false);
  });
});

describe("updateEventoSchema", () => {
  it("aceita patch só com resumo", () => {
    const r = updateEventoSchema.safeParse({ id: 1, resumo: "novo" });
    expect(r.success).toBe(true);
  });
  it("rejeita id ausente", () => {
    const r = updateEventoSchema.safeParse({ resumo: "x" });
    expect(r.success).toBe(false);
  });
});
