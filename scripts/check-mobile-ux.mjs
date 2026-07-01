#!/usr/bin/env node
/**
 * check-mobile-ux — lint leve de UX mobile (F1 do roadmap SOTA).
 *
 * Sinaliza anti-padrões que a auditoria mobile pegou (padrões transversais):
 *  - T1  alvos de toque pequenos: `h-6`/`h-7` em elementos clicáveis (<button>, onClick, cursor-pointer)
 *  - T2  texto pequeno para conteúdo: `text-[8px]` … `text-[11px]`
 *  - T3  inputs sem 16px no mobile: `<input>`/`<Input`/`<textarea` com `text-[≤13px]`/`text-xs`
 *        e sem `text-base`/`text-[16px]`/`md:` (heurística — pode ter falsos positivos)
 *
 * Uso: `node scripts/check-mobile-ux.mjs [--strict]`
 *   sem --strict: relatório informativo (exit 0)
 *   com --strict: exit 1 se houver ocorrências (para CI)
 *
 * Heurístico por design (regex sobre JSX/Tailwind), não um AST — serve para
 * orientar sweeps e evitar regressão, não como verdade absoluta.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const strict = process.argv.includes("--strict");

/** Coleta .tsx/.ts sob src/, ignorando testes e worktrees aninhadas. */
function collect(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (p.includes(`${join("", ".claude", "worktrees")}`)) continue;
      collect(p, out);
    } else if (/\.tsx?$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

const TINY_TEXT = /text-\[(?:8|9|9\.5|10|11)px\]/;
const SMALL_TOUCH = /\bh-[67]\b/;
const CLICKABLE = /(<button|onClick=|cursor-pointer|role="button")/;
const INPUT_TAG = /(<input\b|<Input\b|<textarea\b|<Textarea\b)/;
const HAS16 = /(text-base|text-\[1[4-9]px\]|text-\[2[0-9]px\]|md:text-)/;

const findings = { touch: [], text: [], input: [] };

for (const file of collect(SRC)) {
  const rel = relative(ROOT, file);
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    const n = i + 1;
    if (SMALL_TOUCH.test(line) && CLICKABLE.test(line)) findings.touch.push(`${rel}:${n}`);
    if (TINY_TEXT.test(line)) findings.text.push(`${rel}:${n}`);
    if (INPUT_TAG.test(line) === false && /className=/.test(line) && INPUT_TAG.test(lines.slice(Math.max(0, i - 3), i + 1).join("\n"))) {
      // input recente acima; checa se a className tem texto pequeno sem 16px
      if ((/text-xs|text-\[(?:11|12|13)px\]/.test(line)) && !HAS16.test(line)) findings.input.push(`${rel}:${n}`);
    }
  });
}

function report(title, arr) {
  console.log(`\n${title}: ${arr.length}`);
  for (const loc of arr.slice(0, 40)) console.log(`  ${loc}`);
  if (arr.length > 40) console.log(`  … +${arr.length - 40}`);
}

console.log("== check-mobile-ux (heurístico) ==");
report("T1 alvos de toque pequenos (h-6/h-7 clicável)", findings.touch);
report("T2 texto pequeno em conteúdo (text-[≤11px])", findings.text);
report("T3 inputs sem 16px no mobile (heurística)", findings.input);

const total = findings.touch.length + findings.text.length + findings.input.length;
console.log(`\nTotal: ${total}`);
if (strict && total > 0) process.exit(1);
