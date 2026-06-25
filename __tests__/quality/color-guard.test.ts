/**
 * F7 — Lint guard (sela a Fase 1 do refino).
 *
 * Trava arquitetural forward-looking: impede que as consolidações de F1
 * (cor de atribuição → registry central) e F2 (cor de prazo → módulo canônico)
 * regridam silenciosamente.
 *
 * Diferente de `__tests__/design-system/atribuicao-consolidation.test.ts`
 * (que checa os 8 stragglers NOMINAIS de F1), este guard varre TODA a árvore
 * de `src/components/**` e `src/app/**` e falha se QUALQUER arquivo
 * reintroduzir um dos padrões abaixo:
 *
 *   (a) paleta de atribuição local (`const ATRIBUICAO_COLORS|ATRIBUICAO_BORDERS|
 *       ATRIBUICAO_FILLS|ATRIB_COLOR`) declarada fora de `src/lib/config/`;
 *   (b) literal de cor de atribuição (os hexes que F1 removeu, ou um Tailwind
 *       como `blue-600`) usado como VALOR de uma CHAVE de enum de atribuição
 *       (`JURI_CAMACARI: "#…"`, `EXECUCAO_PENAL: "blue-600"`, etc.);
 *   (c) escada de cor de prazo inline (`dias < 0 ? … red/green/amber …`)
 *       calculando criticidade FORA de `src/lib/prazo.ts`.
 *
 * O escopo é CIRÚRGICO: severidade prisional (`#5CB87A`/`#6A9EC5` em
 * situação-prisional), tokens de demanda-status, badges de sucesso emerald
 * (`#059669`) e azuis não-relacionados NÃO são marcados — só a ASSOCIAÇÃO
 * chave-de-atribuição → literal-de-cor é proibida.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

/** Diretórios varridos pelo guard (UI). */
const SCOPED_DIRS = [
  path.join(ROOT, "src", "components"),
  path.join(ROOT, "src", "app"),
];

/** Camada de registry/tokens — fonte da verdade, isenta do guard. */
const EXEMPT_PREFIXES = [
  path.join(ROOT, "src", "lib", "config"),
  path.join(ROOT, "src", "lib", "prazo.ts"),
  path.join(ROOT, "src", "config"),
];

/** Chaves de enum de atribuição (todas as variantes do registry). */
const ATTRIBUTION_KEYS = [
  "JURI",
  "JURI_CAMACARI",
  "GRUPO_JURI",
  "VVD",
  "VVD_CAMACARI",
  "VIOLENCIA_DOMESTICA",
  "EXECUCAO",
  "EXECUCAO_PENAL",
  "SUBSTITUICAO",
  "SUBSTITUICAO_CIVEL",
  "CRIMINAL",
  "CURADORIA",
  "MUTIRAO_PROTEGE",
];

/**
 * Literais de cor de atribuição que F1 removeu (os azuis/verdes/âmbares
 * DIVERGENTES do registry). A regra (b) é cirúrgica: só proíbe a ASSOCIAÇÃO
 * `CHAVE_DE_ATRIBUICAO → um destes literais` — reintroduzir uma cor de
 * atribuição divergente fora do registry. Hexes que coincidem com o registry
 * (ex.: `#60a5fa`, `#34d399`) NÃO entram aqui: não são divergência.
 *
 * Espelha (e estende) a lista de `__tests__/design-system/atribuicao-consolidation.test.ts`.
 */
const BANNED_ATTRIBUTION_LITERALS = [
  // Execução Penal — azuis divergentes
  "#0284c7",
  "#0369a1",
  "#6A9EC5",
  "#1e3a8a",
  "#3b82f6",
  // Júri — verdes/emerald divergentes
  "#059669",
  "#047857",
  "#5CB87A",
  "#4ade80",
  "#86efac",
  "#166534",
  "#22c55e",
  "#10b981",
  // VVD — amber divergentes
  "#b45309",
  "#D4A84A",
  "#fbbf24",
  "#78350f",
  // Grupo Júri / Substituição / Cível / Curadoria divergentes
  "#C48A50",
  "#9B84B8",
  "#f97316",
  "#8b5cf6",
  // Tailwind literais usados como cor de área
  "blue-600",
  "text-blue-600",
  "bg-blue-600",
];

/**
 * (b) ASSOCIAÇÃO proibida: `CHAVE_DE_ATRIBUICAO: "<literal divergente>"`.
 * Casa a chave de enum de atribuição seguida de `:` e um dos literais banidos.
 */
const ESC = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ATTR_KEY_TO_COLOR = new RegExp(
  `\\b(?:${ATTRIBUTION_KEYS.join("|")})\\b\\s*:\\s*["'](?:${BANNED_ATTRIBUTION_LITERALS.map(ESC).join("|")})["']`,
);

/** (a) Declaração de paleta de atribuição local. */
const LOCAL_PALETTE_DECL =
  /\bconst\s+(ATRIBUICAO_COLORS|ATRIBUICAO_BORDERS|ATRIBUICAO_FILLS|ATRIB_COLOR|ATRIB_FILL)\b/;

/**
 * (c) Escada de cor de prazo inline: ternário sobre dias-restantes (<0/<=0)
 * cujo ramo carrega uma cor de severidade (red/green/amber/emerald/rose).
 * Casamos APENAS quando há cor no ternário — `dias < 0 ? "Vencido" : …`
 * (texto) é uso legítimo e NÃO é marcado.
 */
const INLINE_PRAZO_COLOR_LADDER = new RegExp(
  `\\b(?:dias|diasRestantes|restantes|daysLeft|diff)\\s*<=?\\s*0\\s*\\?` +
    `[^;\\n]{0,80}?` +
    `(?:text-|bg-|border-)?(?:red|emerald|green|amber|rose)(?:-\\d{2,3})?\\b`,
);

function collectFiles(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

function isExempt(file: string): boolean {
  return EXEMPT_PREFIXES.some((p) => file === p || file.startsWith(p + path.sep));
}

const ALL_FILES = SCOPED_DIRS.flatMap((d) => collectFiles(d)).filter(
  (f) => !isExempt(f),
);

function rel(f: string): string {
  return path.relative(ROOT, f);
}

describe("F7 · color guard — atribuição/prazo não regridem", () => {
  // ── Fixtures negativas: o guard PRECISA marcar estes ──────────────────────
  describe("os padrões são detectados em amostras (fixtures)", () => {
    it("(a) detecta paleta de atribuição local", () => {
      const sample = `const ATRIBUICAO_FILLS: Record<string,string> = { JURI: "#fff" };`;
      expect(LOCAL_PALETTE_DECL.test(sample)).toBe(true);
    });

    it("(b) detecta chave de atribuição mapeada a hex", () => {
      const sample = `const m = { EXECUCAO_PENAL: "#0284c7", GRUPO_JURI: "#059669" };`;
      expect(ATTR_KEY_TO_COLOR.test(sample)).toBe(true);
    });

    it("(b) detecta chave de atribuição mapeada a Tailwind divergente (blue-600)", () => {
      const sample = `requerido: { EXECUCAO: "blue-600" }`;
      expect(ATTR_KEY_TO_COLOR.test(sample)).toBe(true);
    });

    it("(c) detecta escada de cor de prazo inline", () => {
      const sample = `const cor = dias < 0 ? "text-red-600" : dias <= 3 ? "text-amber-500" : "text-emerald-600";`;
      expect(INLINE_PRAZO_COLOR_LADDER.test(sample)).toBe(true);
    });
  });

  // ── Fixtures positivas: o guard NÃO pode marcar usos legítimos ────────────
  describe("usos legítimos NÃO são marcados (sem falso-positivo)", () => {
    it("(b) hex de severidade prisional não dispara (sem chave de atribuição)", () => {
      const sample = `const prisional = { solto: "#5CB87A", monitorado: "#6A9EC5" };`;
      expect(ATTR_KEY_TO_COLOR.test(sample)).toBe(false);
    });

    it("(b) badge de sucesso emerald (#059669) sem chave de atribuição não dispara", () => {
      const sample = `<div style="background:#059669">salvo</div>`;
      expect(ATTR_KEY_TO_COLOR.test(sample)).toBe(false);
    });

    it("(b) chave de atribuição com hex que COINCIDE com o registry não dispara", () => {
      // `#60a5fa`/`#34d399` SÃO as cores do registry — uso correto, não divergência.
      const sample = `const FILTER_HEX = { EXECUCAO: "#60a5fa", JURI: "#34d399" };`;
      expect(ATTR_KEY_TO_COLOR.test(sample)).toBe(false);
    });

    it('(c) `dias < 0 ? "Vencido" : …` (texto) não dispara', () => {
      const sample = `const t = dias < 0 ? "Vencido" : prazoTextoCurto(dias);`;
      expect(INLINE_PRAZO_COLOR_LADDER.test(sample)).toBe(false);
    });

    it("(c) consumo de cor já calculada (sev.cor) não dispara", () => {
      const sample = `const cls = sev.cor === "red" ? "text-red-600" : "text-emerald-600";`;
      expect(INLINE_PRAZO_COLOR_LADDER.test(sample)).toBe(false);
    });
  });

  // ── Estado consolidado: a árvore atual tem ZERO violações ─────────────────
  describe("a árvore atual está consolidada (F1/F2) — zero violações", () => {
    it("(a) nenhum arquivo em components/app declara paleta de atribuição local", () => {
      const offenders = ALL_FILES.filter((f) =>
        LOCAL_PALETTE_DECL.test(readFileSync(f, "utf8")),
      ).map(rel);
      expect(offenders, `paletas de atribuição locais:\n${offenders.join("\n")}`).toEqual([]);
    });

    it("(b) nenhuma chave de atribuição é mapeada a literal de cor", () => {
      const offenders = ALL_FILES.filter((f) =>
        ATTR_KEY_TO_COLOR.test(readFileSync(f, "utf8")),
      ).map(rel);
      expect(
        offenders,
        `chaves de atribuição mapeadas a cor crua:\n${offenders.join("\n")}`,
      ).toEqual([]);
    });

    it("(c) nenhuma escada de cor de prazo inline fora de src/lib/prazo.ts", () => {
      const offenders = ALL_FILES.filter((f) =>
        INLINE_PRAZO_COLOR_LADDER.test(readFileSync(f, "utf8")),
      ).map(rel);
      expect(
        offenders,
        `escadas de cor de prazo inline:\n${offenders.join("\n")}`,
      ).toEqual([]);
    });
  });
});
