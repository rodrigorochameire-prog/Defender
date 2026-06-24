// __tests__/unit/instancia-superior-logic.test.ts
//
// Pure-logic specs for the Instância Superior redesign (Fase 1 seam).

import { describe, it, expect } from "vitest";
import {
  subtituloDoModo,
  taxaProvimento,
  prioridadeRecurso,
  ordenarCarteira,
  validarNumeroRecurso,
  formatarNumeroRecurso,
  tribunalCount,
  kpiRowData,
  type CarteiraRow,
} from "@/components/instancia-superior/logic";

const NOW = new Date("2026-06-24T12:00:00");

describe("tribunalCount / kpiRowData", () => {
  const stats = {
    total: 9, pendentes: 4, emPauta: 2, julgados: 3, taxaProvimento: 67,
    porTribunal: [{ tribunal: "TJBA", total: 6 }, { tribunal: "STJ", total: 2 }],
  };
  it("conta por tribunal e devolve 0 para ausentes", () => {
    expect(tribunalCount(stats.porTribunal, "TJBA")).toBe(6);
    expect(tribunalCount(stats.porTribunal, "STF")).toBe(0);
    expect(tribunalCount(undefined, "TJBA")).toBe(0);
  });
  it("deriva os 8 KPIs do stats", () => {
    expect(kpiRowData(stats)).toEqual({
      total: 9, tjba: 6, stj: 2, stf: 0, pendentes: 4, emPauta: 2, julgados: 3, provimento: 67,
    });
  });
  it("usa defaults seguros quando stats é nulo", () => {
    expect(kpiRowData(null)).toEqual({
      total: 0, tjba: 0, stj: 0, stf: 0, pendentes: 0, emPauta: 0, julgados: 0, provimento: null,
    });
  });
});

describe("subtituloDoModo", () => {
  it("descreve o escopo pessoal em 'meus'", () => {
    expect(subtituloDoModo("meus")).toMatch(/Seus recursos/i);
  });
  it("descreve o escopo institucional em 'todos'", () => {
    expect(subtituloDoModo("todos")).toMatch(/Defensoria/i);
  });
  it("difere entre os dois modos", () => {
    expect(subtituloDoModo("meus")).not.toBe(subtituloDoModo("todos"));
  });
});

describe("taxaProvimento", () => {
  it("retorna null sem julgados", () => {
    expect(taxaProvimento(0, 0)).toBeNull();
    expect(taxaProvimento(5, 0)).toBeNull();
  });
  it("arredonda o percentual", () => {
    expect(taxaProvimento(1, 3)).toBe(33);
    expect(taxaProvimento(2, 3)).toBe(67);
    expect(taxaProvimento(3, 4)).toBe(75);
  });
});

describe("prioridadeRecurso", () => {
  it("em pauta (status PAUTADO) vem primeiro", () => {
    expect(prioridadeRecurso({ status: "PAUTADO" }, NOW)).toBe(0);
  });
  it("data de pauta futura conta como em pauta", () => {
    expect(prioridadeRecurso({ status: "DISTRIBUIDO", dataPauta: "2026-07-10" }, NOW)).toBe(0);
  });
  it("data de pauta passada não conta como em pauta", () => {
    expect(prioridadeRecurso({ status: "DISTRIBUIDO", dataPauta: "2026-01-10" }, NOW)).toBe(3);
  });
  it("prioridade urgente fica acima do fluxo regular", () => {
    expect(prioridadeRecurso({ status: "CONCLUSO", prioridade: "URGENTE" }, NOW)).toBe(1);
  });
  it("julgado aguardando providência fica acima do regular", () => {
    expect(prioridadeRecurso({ status: "JULGADO" }, NOW)).toBe(2);
  });
  it("fluxo regular", () => {
    expect(prioridadeRecurso({ status: "INTERPOSTO" }, NOW)).toBe(3);
  });
  it("transitado (encerrado) por último", () => {
    expect(prioridadeRecurso({ status: "TRANSITADO" }, NOW)).toBe(4);
  });
});

describe("ordenarCarteira", () => {
  it("ordena por prioridade e mantém estabilidade em empates", () => {
    const rows: (CarteiraRow & { id: number })[] = [
      { id: 1, status: "INTERPOSTO" },               // 3
      { id: 2, status: "PAUTADO" },                  // 0
      { id: 3, status: "TRANSITADO" },               // 4
      { id: 4, status: "JULGADO" },                  // 2
      { id: 5, status: "DISTRIBUIDO" },              // 3 (empate com id 1, vem depois)
      { id: 6, status: "CONCLUSO", prioridade: "ALTA" }, // 1
    ];
    expect(ordenarCarteira(rows, NOW).map((r) => r.id)).toEqual([2, 6, 4, 1, 5, 3]);
  });
  it("não muta o array original", () => {
    const rows: CarteiraRow[] = [{ status: "JULGADO" }, { status: "PAUTADO" }];
    const copy = [...rows];
    ordenarCarteira(rows, NOW);
    expect(rows).toEqual(copy);
  });
});

describe("validarNumeroRecurso", () => {
  it("aceita CNJ completo", () => {
    expect(validarNumeroRecurso("0001234-56.2026.8.05.0039")).toBe(true);
  });
  it("rejeita formato incompleto ou inválido", () => {
    expect(validarNumeroRecurso("0001234-56.2026")).toBe(false);
    expect(validarNumeroRecurso("")).toBe(false);
    expect(validarNumeroRecurso("abc")).toBe(false);
  });
});

describe("formatarNumeroRecurso", () => {
  it("aplica a máscara CNJ progressivamente", () => {
    expect(formatarNumeroRecurso("0001234562026805" + "0039")).toBe("0001234-56.2026.8.05.0039");
  });
  it("formata parcialmente conforme digita", () => {
    expect(formatarNumeroRecurso("0001234")).toBe("0001234");
    expect(formatarNumeroRecurso("000123456")).toBe("0001234-56");
    expect(formatarNumeroRecurso("00012345620268")).toBe("0001234-56.2026.8");
  });
  it("ignora não-dígitos e descarta excedentes de 20 dígitos", () => {
    expect(formatarNumeroRecurso("abc0001234-56")).toBe("0001234-56");
    expect(formatarNumeroRecurso("0".repeat(25))).toBe("0000000-00.0000.0.00.0000");
  });
  it("string vazia retorna vazia", () => {
    expect(formatarNumeroRecurso("")).toBe("");
  });
});
