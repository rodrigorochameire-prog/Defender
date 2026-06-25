import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  prazoSeveridade,
  calcularPrazo,
  prazoTextoCurto,
  ESCALA_LITIGIO,
  ESCALA_MPU,
  ESCALA_INTIMACAO,
} from "@/lib/prazo";

const ROOT = process.cwd();

describe("prazoSeveridade — escala de litígio (default)", () => {
  it.each([
    [-141, "vencido", "red"],
    [-1, "vencido", "red"],
    [0, "critico", "red"],
    [1, "alerta", "amber"],
    [3, "alerta", "amber"],
    [4, "tranquilo", "green"],
    [5, "tranquilo", "green"],
    [7, "tranquilo", "green"],
    [8, "tranquilo", "gray"],
    [30, "tranquilo", "gray"],
    [280, "tranquilo", "gray"],
  ])("dias=%i → nivel=%s, cor=%s", (dias, nivel, cor) => {
    const r = prazoSeveridade(dias as number);
    expect(r.nivel).toBe(nivel);
    expect(r.cor).toBe(cor);
    expect(r.dias).toBe(dias);
  });

  it("limite 3/4 (amber→green)", () => {
    expect(prazoSeveridade(3).cor).toBe("amber");
    expect(prazoSeveridade(4).cor).toBe("green");
  });

  it("limite 7/8 (green→gray)", () => {
    expect(prazoSeveridade(7).cor).toBe("green");
    expect(prazoSeveridade(8).cor).toBe("gray");
  });

  it("um item 141 dias vencido é vermelho (não âmbar)", () => {
    expect(prazoSeveridade(-141).cor).toBe("red");
  });
});

describe("prazoSeveridade — escala MPU (monitoramento)", () => {
  it.each([
    [-1, "red"],
    [0, "red"],
    [7, "red"],
    [8, "amber"],
    [30, "amber"],
    [31, "green"],
    [280, "green"],
  ])("dias=%i → cor=%s", (dias, cor) => {
    expect(prazoSeveridade(dias as number, ESCALA_MPU).cor).toBe(cor);
  });

  it("280 dias no futuro de uma MPU permanece verde (não incoerente)", () => {
    expect(prazoSeveridade(280, ESCALA_MPU).cor).toBe("green");
  });
});

describe("prazoSeveridade — escala intimação (curta)", () => {
  it.each([
    [-1, "red"],
    [2, "red"],
    [3, "amber"],
    [5, "amber"],
    [6, "green"],
  ])("dias=%i → cor=%s", (dias, cor) => {
    expect(prazoSeveridade(dias as number, ESCALA_INTIMACAO).cor).toBe(cor);
  });
});

describe("calcularPrazo — parsing de string", () => {
  it("retorna null para entrada vazia/inválida", () => {
    expect(calcularPrazo("")).toBeNull();
    expect(calcularPrazo(null)).toBeNull();
    expect(calcularPrazo("xx")).toBeNull();
  });

  it("parseia dd/mm/aaaa", () => {
    const hoje = new Date();
    const dd = String(hoje.getDate()).padStart(2, "0");
    const mm = String(hoje.getMonth() + 1).padStart(2, "0");
    const yyyy = hoje.getFullYear();
    const r = calcularPrazo(`${dd}/${mm}/${yyyy}`);
    expect(r?.dias).toBe(0);
    expect(r?.cor).toBe("red");
  });
});

describe("prazoTextoCurto", () => {
  it("formata vencido/hoje/amanhã/futuro", () => {
    expect(prazoTextoCurto(-141)).toBe("141d vencido");
    expect(prazoTextoCurto(0)).toBe("Hoje");
    expect(prazoTextoCurto(1)).toBe("Amanhã");
    expect(prazoTextoCurto(5)).toBe("5d");
  });
});

describe("regressão arquitetural — fonte única de criticidade de prazo", () => {
  const OFENSORES = [
    "src/app/(dashboard)/admin/vvd/page.tsx",
    "src/app/(dashboard)/admin/vvd/intimacoes/page.tsx",
    "src/app/(dashboard)/admin/vvd/medidas/page.tsx",
    "src/app/(dashboard)/admin/prazos/page.tsx",
    "src/app/(dashboard)/admin/assistidos/_components/assistido-utils.ts",
    "src/components/demandas-premium/DemandaCard.tsx",
    "src/components/demandas-premium/DemandaCompactView.tsx",
    "src/components/demandas-premium/DemandaTableView.tsx",
    "src/components/demandas-premium/demandas-premium-view.tsx",
  ];

  it.each(OFENSORES)("%s importa de @/lib/prazo", (rel) => {
    const src = readFileSync(join(ROOT, rel), "utf8");
    expect(src).toMatch(/from ["']@\/lib\/prazo["']/);
  });

  it.each(OFENSORES)("%s não define escala de cor de prazo inline", (rel) => {
    const src = readFileSync(join(ROOT, rel), "utf8");
    // Heurística por linha: o anti-padrão é um threshold numérico de prazo
    // (`<= N` ou `dias < 0`) mapeado DIRETAMENTE para uma classe de cor na mesma
    // linha — a cadeia inline que deveria ter migrado para o módulo canônico.
    // Cores escolhidas via `cor === "..."`/`sev.cor` (canônico) não casam.
    const linhas = src.split("\n");
    const ladderInline = linhas.find((l) =>
      /(diffDays|diasRestantes|dias)\s*(<\s*0|<=\s*\d+)/.test(l) &&
      /(rose|amber|emerald|sky|red-|text-red)/i.test(l),
    );
    expect(ladderInline ?? null).toBeNull();
  });

  it("o badge canônico do sheet usa @/lib/prazo", () => {
    const src = readFileSync(
      join(ROOT, "src/components/demandas-premium/sheet/prazo-badge.ts"),
      "utf8",
    );
    expect(src).toMatch(/from ["']@\/lib\/prazo["']/);
  });
});
