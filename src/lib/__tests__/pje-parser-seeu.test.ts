import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseIntimacoesUnificado, parseSEEUIntimacoes } from "@/lib/pje-parser";

const fx = (name: string) =>
  readFileSync(join(__dirname, "fixtures", name), "utf8");

describe("parser SEEU — dados reais da Mesa do Defensor", () => {
  it("detecta SEEU e extrai todas as linhas da aba Manifestação", () => {
    const r = parseIntimacoesUnificado(fx("seeu-mesa-manifestacao.txt"));
    expect(r.sistema).toBe("SEEU");
    expect(r.intimacoes.length).toBe(2);
  });

  it("Bug 1: dataEnvio e ultimoDia NÃO são trocados em linhas após a primeira", () => {
    const r = parseSEEUIntimacoes(fx("seeu-mesa-manifestacao.txt"));
    const seq1552 = r.intimacoes.find((i) => i.seq === 1552)!;
    expect(seq1552).toBeDefined();
    // Envio é sempre a data ANTERIOR ao último dia.
    expect(seq1552.dataEnvio).toBe("29/06/2026");
    expect(seq1552.ultimoDia).toBe("09/07/2026");
  });

  it("Bug 2: nome do Executado não vaza para o bloco Terceiro:", () => {
    const r = parseSEEUIntimacoes(fx("seeu-mesa-manifestacao.txt"));
    const seq1552 = r.intimacoes.find((i) => i.seq === 1552)!;
    expect(seq1552.assistido).toBe(
      "Nadson Wesley Mascarenhas dos Santos da Silva",
    );
    expect(seq1552.assistido.toLowerCase()).not.toContain("terceiro");
    expect(seq1552.assistido.toLowerCase()).not.toContain("defensoria");
  });

  it("aba Ciência: ato = Ciência e ruído [ Dispensar Juntada ] não polui o nome", () => {
    const r = parseSEEUIntimacoes(fx("seeu-mesa-ciencia.txt"), "ciencia");
    expect(r.intimacoes.length).toBe(2);
    const franklin = r.intimacoes.find((i) => i.seq === 1000)!;
    expect(franklin.assistido).toBe("Franklin Leite dos Santos");
    expect(franklin.assistido.toLowerCase()).not.toContain("dispensar");
    expect(franklin.tipoDocumento).toBe("Ciência");
  });

  it("preserva seq correto por linha", () => {
    const r = parseSEEUIntimacoes(fx("seeu-mesa-manifestacao.txt"));
    expect(r.intimacoes.map((i) => i.seq).sort()).toEqual([1372, 1552]);
  });
});
