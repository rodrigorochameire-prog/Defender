import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const APP_DIR = path.join(ROOT, "src", "app");

/** Lê recursivamente todos os arquivos .ts/.tsx sob src/app. */
function collectAppFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectAppFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe("vocab hygiene · F4", () => {
  // (a) A aba de demandas do assistido NÃO pode renderizar o enum cru.
  describe("aba de demandas do assistido mapeia o status pelo dicionário central", () => {
    const TAB = path.join(
      APP_DIR,
      "(dashboard)",
      "admin",
      "assistidos",
      "[id]",
      "demandas",
      "page.tsx",
    );
    const src = readFileSync(TAB, "utf8");

    it("importa getStatusConfig do dicionário central", () => {
      expect(src).toMatch(/getStatusConfig/);
      expect(src).toMatch(/@\/config\/demanda-status/);
    });

    it("não renderiza o enum cru ({d.status} diretamente em JSX)", () => {
      // O leak confirmado era `>{d.status}<` dentro de um <span>.
      expect(src).not.toMatch(/>\s*\{\s*d\.status\s*\}\s*</);
    });
  });

  // (b) Nenhum rótulo user-facing desacentuado deve permanecer sob src/app.
  describe("não há rótulos de área desacentuados em src/app", () => {
    // Tokens desacentuados que devem ter virado a forma acentuada.
    // Casamos a FORMA DE RÓTULO (após `label:` ... "..."), nunca a chave de enum (`value: "JURI"`).
    const FORBIDDEN: { token: string; accented: string }[] = [
      { token: "Juri", accented: "Júri" },
      { token: "Execucao Penal", accented: "Execução Penal" },
      { token: "Familia", accented: "Família" },
      { token: "Civel", accented: "Cível" },
    ];

    const files = collectAppFiles(APP_DIR);

    for (const { token, accented } of FORBIDDEN) {
      it(`não usa label "${token}" (deve ser "${accented}")`, () => {
        // Casa: label: "...Juri..." (valor string de uma chave label), em qualquer arquivo.
        const re = new RegExp(`label:\\s*"[^"]*\\b${token}\\b[^"]*"`);
        const offenders: string[] = [];
        for (const f of files) {
          const src = readFileSync(f, "utf8");
          if (re.test(src)) offenders.push(path.relative(ROOT, f));
        }
        expect(offenders).toEqual([]);
      });
    }
  });
});
