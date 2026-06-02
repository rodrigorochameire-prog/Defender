import { describe, it, expect } from "vitest";
import {
  removeNotaByTimestamp,
  ordenarNotasDesc,
  type NotaRapida,
} from "@/lib/agenda/anotacoes-rapidas";

const notas: NotaRapida[] = [
  { texto: "primeira", timestamp: "2026-06-01T10:00:00.000Z", autorId: 1 },
  { texto: "segunda", timestamp: "2026-06-02T10:00:00.000Z", autorId: 2 },
];

describe("removeNotaByTimestamp", () => {
  it("remove a nota com o timestamp informado", () => {
    const r = removeNotaByTimestamp(notas, "2026-06-01T10:00:00.000Z");
    expect(r).toHaveLength(1);
    expect(r[0].texto).toBe("segunda");
  });
  it("não altera quando o timestamp não existe", () => {
    expect(removeNotaByTimestamp(notas, "2030-01-01T00:00:00.000Z")).toHaveLength(2);
  });
  it("tolera lista nula/indefinida", () => {
    expect(removeNotaByTimestamp(null, "x")).toEqual([]);
    expect(removeNotaByTimestamp(undefined, "x")).toEqual([]);
  });
});

describe("ordenarNotasDesc", () => {
  it("ordena da mais recente para a mais antiga sem mutar a original", () => {
    const r = ordenarNotasDesc(notas);
    expect(r.map((n) => n.texto)).toEqual(["segunda", "primeira"]);
    expect(notas[0].texto).toBe("primeira"); // original intacta
  });
  it("tolera lista nula", () => {
    expect(ordenarNotasDesc(null)).toEqual([]);
  });
});
