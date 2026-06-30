import { describe, it, expect } from "vitest";
import { urgentPrazoItems, type PrazoRowLike } from "../palette-prazos";

const row = (
  id: number,
  urgencia: string,
  diasRestantes: number | null,
  extra: Partial<PrazoRowLike> = {},
): PrazoRowLike => ({
  demanda: { id, ato: `Ato ${id}` },
  assistido: { nome: `Assistido ${id}` },
  processo: { id: id * 10 },
  diasRestantes,
  urgencia,
  ...extra,
});

describe("urgentPrazoItems", () => {
  it("keeps only overdue and due-today, dropping crítico/atenção/normal", () => {
    const rows = [
      row(1, "VENCIDO", -3),
      row(2, "HOJE", 0),
      row(3, "CRITICO", 2),
      row(4, "ATENCAO", 5),
      row(5, "NORMAL", 10),
    ];
    expect(urgentPrazoItems(rows).map((i) => i.id)).toEqual([1, 2]);
  });

  it("orders by most overdue first", () => {
    const rows = [row(1, "HOJE", 0), row(2, "VENCIDO", -1), row(3, "VENCIDO", -9)];
    expect(urgentPrazoItems(rows).map((i) => i.id)).toEqual([3, 2, 1]);
  });

  it("maps tone, processoId, ato and the 'quando' label", () => {
    const [vencido] = urgentPrazoItems([row(1, "VENCIDO", -3)]);
    expect(vencido).toMatchObject({ processoId: 10, ato: "Ato 1", tone: "danger" });
    expect(vencido.quando).toBe("vencido há 3d");
    const [hoje] = urgentPrazoItems([row(2, "HOJE", 0)]);
    expect(hoje.tone).toBe("warning");
    expect(hoje.quando).toBe("hoje");
  });

  it("respects the max limit", () => {
    const rows = Array.from({ length: 8 }, (_, i) => row(i + 1, "VENCIDO", -(i + 1)));
    expect(urgentPrazoItems(rows, 3)).toHaveLength(3);
  });

  it("tolerates null input and missing processo", () => {
    expect(urgentPrazoItems(null)).toEqual([]);
    const [item] = urgentPrazoItems([{ demanda: { id: 1 }, urgencia: "VENCIDO", diasRestantes: -1 }]);
    expect(item.processoId).toBeNull();
    expect(item.ato).toBe("Prazo");
  });
});
