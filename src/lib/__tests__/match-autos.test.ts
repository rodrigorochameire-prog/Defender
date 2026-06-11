// src/lib/__tests__/match-autos.test.ts
import { describe, it, expect } from "vitest";
import { extrairCNJ, classificarAutos } from "../match-autos";

const f = (id: number, name: string, extra: Partial<{ processoId: number | null }> = {}) => ({
  id, driveFileId: `d${id}`, name, mimeType: "application/pdf",
  processoId: extra.processoId ?? null,
});

describe("extrairCNJ", () => {
  it("extrai CNJ do nome do arquivo dos autos", () => {
    expect(extrairCNJ("8008255-33.2024.8.05.0039-178...-processo.pdf"))
      .toBe("8008255-33.2024.8.05.0039");
  });
  it("retorna null sem CNJ", () => {
    expect(extrairCNJ("Relatorio de analise.pdf")).toBeNull();
    expect(extrairCNJ(null)).toBeNull();
  });
});

describe("classificarAutos", () => {
  const base = {
    processoId: 187,
    processoCNJ: "8008255-33.2024.8.05.0039",
    correlatos: [{ cnj: "8006774-35.2024.8.05.0039", classe: "Prisão Temporária" }],
  };

  it("agrupa por CNJ: deste processo, correlacionado, outro", () => {
    const files = [
      f(1, "8008255-33.2024.8.05.0039-x-processo.pdf"),  // deste processo
      f(2, "IP 8006774-35.2024.8.05.0039-y-processo.pdf"), // correlacionado
      f(3, "8099999-99.2019.8.05.0039-antigo.pdf"),       // outro
      f(4, "Laudo sem cnj.pdf"),                           // outro (sem CNJ)
      f(5, "qualquer.pdf", { processoId: 187 }),           // deste processo (já vinculado)
    ];
    const r = classificarAutos({ ...base, files });
    expect(r.desteProcesso.map((x) => x.id).sort()).toEqual([1, 5]);
    expect(r.correlacionados).toHaveLength(1);
    expect(r.correlacionados[0].cnj).toBe("8006774-35.2024.8.05.0039");
    expect(r.correlacionados[0].files.map((x) => x.id)).toEqual([2]);
    expect(r.outros.map((x) => x.id).sort()).toEqual([3, 4]);
  });

  it("particiona: cada arquivo em exatamente um grupo", () => {
    const files = [f(1, "8008255-33.2024.8.05.0039.pdf"), f(2, "x.pdf"), f(3, "IP 8006774-35.2024.8.05.0039.pdf")];
    const r = classificarAutos({ ...base, files });
    const total = r.desteProcesso.length + r.correlacionados.reduce((n, g) => n + g.files.length, 0) + r.outros.length;
    expect(total).toBe(files.length);
  });
});
