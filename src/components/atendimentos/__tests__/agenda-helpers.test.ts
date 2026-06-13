import { describe, it, expect } from "vitest";
import {
  rangeFromPreset,
  isPendente,
  agruparPorDia,
  rotuloDia,
  chaveDia,
} from "../agenda-helpers";
import type { AtendimentoListItem } from "../config";

const NOW = new Date("2026-06-13T12:00:00-03:00"); // 13/06 12:00 BRT

function item(id: number, iso: string, status = "agendado"): AtendimentoListItem {
  return {
    id,
    assistidoId: id,
    processoId: null,
    demandaId: null,
    dataRegistro: iso,
    titulo: null,
    local: null,
    assunto: null,
    conteudo: null,
    status,
    numeroSolar: null,
    subtipo: null,
    area: null,
    pedido: null,
    anotacoesRecepcao: null,
    historicoSolar: null,
    processosCitados: null,
    dossieAtendimento: null,
    assistido: null,
    processo: null,
    autor: null,
  };
}

describe("rangeFromPreset", () => {
  it("default 'recentes' inclui o passado recente (30 dias) e o futuro", () => {
    const r = rangeFromPreset("recentes", NOW);
    expect(r.dateFrom).toBeDefined();
    expect(r.dateTo).toBeDefined();
    // dateFrom deve ser ANTES de agora (passado recente visível)
    expect(new Date(r.dateFrom!).getTime()).toBeLessThan(NOW.getTime());
    // dateTo bem no futuro
    expect(new Date(r.dateTo!).getTime()).toBeGreaterThan(NOW.getTime());
  });

  it("'hoje' começa na meia-noite local e cobre só o dia", () => {
    const r = rangeFromPreset("hoje", NOW);
    expect(new Date(r.dateFrom!).getTime()).toBeLessThanOrEqual(NOW.getTime());
    const span = new Date(r.dateTo!).getTime() - new Date(r.dateFrom!).getTime();
    expect(span).toBe(24 * 3600 * 1000);
  });

  it("'todos' não restringe", () => {
    expect(rangeFromPreset("todos", NOW)).toEqual({});
  });
});

describe("isPendente", () => {
  it("agendado no passado = pendente", () => {
    expect(isPendente(item(1, "2026-06-12T10:00:00-03:00"), NOW)).toBe(true);
  });
  it("agendado hoje mais cedo = pendente", () => {
    expect(isPendente(item(1, "2026-06-13T09:00:00-03:00"), NOW)).toBe(true);
  });
  it("agendado no futuro != pendente", () => {
    expect(isPendente(item(1, "2026-06-14T10:00:00-03:00"), NOW)).toBe(false);
  });
  it("realizado no passado != pendente", () => {
    expect(isPendente(item(1, "2026-06-12T10:00:00-03:00", "realizado"), NOW)).toBe(false);
  });
});

describe("agruparPorDia — ordenação centrada em hoje", () => {
  it("hoje primeiro, depois futuros ascendentes, depois passados descendentes", () => {
    const itens = [
      item(1, "2026-06-10T10:00:00-03:00"), // passado distante
      item(2, "2026-06-15T10:00:00-03:00"), // futuro
      item(3, "2026-06-13T10:00:00-03:00"), // hoje
      item(4, "2026-06-12T10:00:00-03:00"), // ontem
      item(5, "2026-06-14T10:00:00-03:00"), // amanhã
    ];
    const grupos = agruparPorDia(itens, NOW);
    expect(grupos.map((g) => g.dia)).toEqual([
      "2026-06-13", // hoje
      "2026-06-14", // amanhã
      "2026-06-15", // futuro
      "2026-06-12", // ontem
      "2026-06-10", // passado distante
    ]);
  });

  it("ordena itens dentro do dia por horário", () => {
    const itens = [
      item(1, "2026-06-13T15:00:00-03:00"),
      item(2, "2026-06-13T09:00:00-03:00"),
    ];
    const [g] = agruparPorDia(itens, NOW);
    expect(g.itens.map((i) => i.id)).toEqual([2, 1]);
  });
});

describe("rotuloDia", () => {
  it("reconhece hoje/ontem/amanhã", () => {
    expect(rotuloDia(chaveDia(NOW), NOW)).toBe("Hoje");
    expect(rotuloDia("2026-06-12", NOW)).toBe("Ontem");
    expect(rotuloDia("2026-06-14", NOW)).toBe("Amanhã");
  });
  it("retorna null para outras datas (componente formata por extenso)", () => {
    expect(rotuloDia("2026-06-20", NOW)).toBeNull();
  });
});
