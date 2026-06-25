import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * F3-D — Guard de contraste (WCAG 2.x AA) para o token de texto terciário.
 *
 * `--muted-foreground` é usado em CNJ, legendas e metadados em todo o app.
 * Deve manter razão de contraste >= 4.5:1 (texto normal, AA) contra
 * `--background` nos DOIS temas (light em `:root`, dark em `.dark`).
 *
 * Helpers de cor são inline (HSL neutro -> luminância relativa -> contraste);
 * sem dependência nova. Os tokens são `0 0% L%` (hue/sat zero), então cada
 * canal sRGB é igual e basta a componente de lightness.
 */

const GLOBALS_CSS = readFileSync(
  path.resolve(__dirname, "globals.css"),
  "utf8",
);

/** Luminância relativa (WCAG) de um cinza neutro definido só pela lightness HSL (0..100). */
function relativeLuminance(lightnessPct: number): number {
  const channel = lightnessPct / 100; // sRGB normalizado (R=G=B para cinza neutro)
  const linear =
    channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  // L = 0.2126*R + 0.7152*G + 0.0722*B; com R=G=B=linear => L = linear.
  return linear;
}

/** Razão de contraste WCAG entre duas luminâncias relativas. */
function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Extrai a lightness (%) de um token `--name: 0 0% L%;` dentro de um bloco de escopo.
 * Assume tokens neutros (hue 0, sat 0%), que é a convenção do design system para texto.
 */
function readNeutralLightness(scopeBlock: string, token: string): number {
  const re = new RegExp(
    `--${token}:\\s*0\\s+0%\\s+([\\d.]+)%`,
  );
  const match = scopeBlock.match(re);
  if (!match) {
    throw new Error(`Token --${token} (neutro 0 0%) não encontrado no escopo fornecido`);
  }
  return Number(match[1]);
}

/** Recorta o corpo `{ ... }` do primeiro bloco cujo seletor casa com `selectorRe`. */
function extractScope(css: string, selectorRe: RegExp): string {
  const start = css.search(selectorRe);
  if (start === -1) throw new Error(`Seletor ${selectorRe} não encontrado em globals.css`);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error(`Bloco do seletor ${selectorRe} não fechado`);
}

const AA_NORMAL = 4.5;

describe("globals.css — contraste WCAG AA de --muted-foreground", () => {
  const lightScope = extractScope(GLOBALS_CSS, /:root\s*\{/);
  const darkScope = extractScope(GLOBALS_CSS, /\.dark\s*\{/);

  it("tema light: --muted-foreground sobre --background >= 4.5:1", () => {
    const bg = readNeutralLightness(lightScope, "background");
    const fg = readNeutralLightness(lightScope, "muted-foreground");
    const ratio = contrastRatio(relativeLuminance(bg), relativeLuminance(fg));
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it("tema dark: --muted-foreground sobre --background >= 4.5:1", () => {
    const bg = readNeutralLightness(darkScope, "background");
    const fg = readNeutralLightness(darkScope, "muted-foreground");
    const ratio = contrastRatio(relativeLuminance(bg), relativeLuminance(fg));
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });
});
