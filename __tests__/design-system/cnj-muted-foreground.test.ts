import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * F0 — Padronização da cor do número CNJ.
 *
 * O número do processo (CNJ) é renderizado em `font-mono` no DemandaCard. A cor
 * deve usar o token semântico `text-muted-foreground` em vez de neutros crus
 * (`text-neutral-500` / `text-neutral-600` e suas variantes `dark:`), garantindo
 * consistência com o design system e adaptação automática claro/escuro.
 *
 * Regressão: capturamos as linhas que renderizam o número do processo (as que
 * contêm `font-mono` próximas a `proc.numero` / `processos[0].numero`) e
 * asseguramos que NÃO carregam neutros crus de texto.
 */

const source = readFileSync(
  path.resolve(
    __dirname,
    "../../src/components/demandas-premium/DemandaCard.tsx",
  ),
  "utf8",
);

const lines = source.split("\n");

// Nós do número CNJ: linha com `font-mono` cujo conteúdo (ou linha seguinte)
// renderiza o número do processo.
const cnjNumberLines = lines.filter((line, i) => {
  if (!line.includes("font-mono")) return false;
  const here = line;
  const next = lines[i + 1] ?? "";
  return /\.numero/.test(here) || /\.numero/.test(next);
});

describe("design-system: número CNJ usa text-muted-foreground", () => {
  it("existem nós font-mono de número de processo para validar", () => {
    expect(cnjNumberLines.length).toBeGreaterThanOrEqual(2);
  });

  it("nenhum nó do número CNJ usa text-neutral-500/600 (incl. dark:)", () => {
    const offenders = cnjNumberLines.filter((line) =>
      /(dark:)?text-neutral-(500|600)/.test(line),
    );
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });

  it("os nós do número CNJ usam text-muted-foreground", () => {
    const allUseMuted = cnjNumberLines.every((line) =>
      line.includes("text-muted-foreground"),
    );
    expect(allUseMuted, cnjNumberLines.join("\n")).toBe(true);
  });
});
