import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * F0 — Separação semântica de tokens.
 *
 * `--success` (estado de sucesso) NÃO pode ser idêntico a `--primary` (cor de
 * marca/ação). Quando coincidem, o sistema perde a capacidade de comunicar
 * "concluído com êxito" de forma distinta de "ação primária".
 *
 * Este teste lê o CSS-fonte e garante que os dois tokens divergem tanto no
 * tema claro (`:root`) quanto no escuro (`.dark`).
 */

const globalsCss = readFileSync(
  path.resolve(__dirname, "../../src/app/globals.css"),
  "utf8",
);

/** Extrai o valor de um custom property dentro do primeiro bloco que casa com `selector`. */
function readToken(selector: RegExp, token: string): string {
  const blockMatch = globalsCss.match(selector);
  expect(blockMatch, `bloco ${selector} não encontrado`).toBeTruthy();
  const block = blockMatch![0];
  const tokenMatch = block.match(
    new RegExp(`--${token}:\\s*([^;]+);`),
  );
  expect(tokenMatch, `--${token} não encontrado em ${selector}`).toBeTruthy();
  return tokenMatch![1].trim();
}

// Captura o conteúdo do primeiro bloco `:root { ... }` e do bloco `.dark { ... }`.
const ROOT_BLOCK = /:root\s*\{[\s\S]*?\}/;
const DARK_BLOCK = /\.dark\s*\{[\s\S]*?\}/;

describe("design-system: --success ≠ --primary", () => {
  it("difere no tema claro (:root)", () => {
    const success = readToken(ROOT_BLOCK, "success");
    const primary = readToken(ROOT_BLOCK, "primary");
    expect(success).not.toBe(primary);
  });

  it("difere no tema escuro (.dark)", () => {
    const success = readToken(DARK_BLOCK, "success");
    const primary = readToken(DARK_BLOCK, "primary");
    expect(success).not.toBe(primary);
  });

  it("--success continua definido com foreground legível em ambos os temas", () => {
    expect(readToken(ROOT_BLOCK, "success-foreground")).toBeTruthy();
    expect(readToken(DARK_BLOCK, "success-foreground")).toBeTruthy();
  });
});
