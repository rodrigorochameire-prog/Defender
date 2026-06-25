import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Guard de consolidação (F3-E): `@/components/ds/empty-state` é o ÚNICO módulo
 * de EmptyState reutilizável do projeto. Nenhum arquivo deve importar o antigo
 * `@/components/shared/empty-state`, e o arquivo legado não pode reaparecer.
 */

const SRC = resolve(__dirname, "../../..");

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe("EmptyState canonical module", () => {
  it("nenhum arquivo importa o módulo legado shared/empty-state", () => {
    const offenders = walk(SRC).filter((f) =>
      /from\s+["']@\/components\/shared\/empty-state["']/.test(readFileSync(f, "utf8"))
    );
    expect(offenders, `Importadores remanescentes: ${offenders.join(", ")}`).toHaveLength(0);
  });

  it("o arquivo legado shared/empty-state.tsx foi removido", () => {
    expect(existsSync(join(SRC, "components/shared/empty-state.tsx"))).toBe(false);
  });
});
