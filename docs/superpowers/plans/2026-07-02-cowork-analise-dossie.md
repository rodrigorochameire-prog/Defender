# Enriquecer coworkAnalise com dossiê — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** O botão manual "Análise profunda" (`coworkAnalise`) passa a injetar um "dossiê do assistido" (resumos de Drive + análises anteriores) no prompt, com paridade ao caminho automático (C2.2).

**Architecture:** Módulo novo `src/lib/services/dossie-assistido.ts` com `buildDossieMarkdown` (PURA, capada) + `fetchDossieMarkdown` (Drizzle, try/catch → ""). `coworkAnalise` faz append ao briefing (`prompt: briefing` → `prompt: promptFinal`). Append-only, sem migração.

**Tech Stack:** Next.js 15 + tRPC + Drizzle, vitest.

## Global Constraints

- **Append-only** em `coworkAnalise`: só o valor de `prompt` muda (`briefing` → `promptFinal`); dedup/skill-mapping/insert intactos.
- `fetchDossieMarkdown` **nunca lança** (try/catch → `""`); dossiê vazio → prompt = briefing de hoje.
- Caps espelham C2.2: `SECTION_CAP=2000`, `MAX_SECTIONS=30`, `MAX_DOSSIE_CHARS=18000`; resumo-preferido.
- `buildDossieMarkdown` PURA (sem I/O), unit-testável.
- Imports (confirmados): `db` de `@/lib/db`; `driveDocumentSections`/`driveFiles`/`assistidos`/`processos` de `@/lib/db/schema`; `and,eq,ne,desc,inArray` de `drizzle-orm`.
- Colunas Drizzle confirmadas: `driveDocumentSections.{tipo,titulo,resumo,textoExtraido,reviewStatus,driveFileId,updatedAt}`, `driveFiles.{id,assistidoId}`, `assistidos.{id,analysisData}`, `processos.{id,analysisData}`.
- Sem migração/daemon/skill; NÃO usar `consolidateForAssistido` (LLM pago).
- Spec: `docs/superpowers/specs/2026-07-02-cowork-analise-dossie-design.md`.
- Worktree: `/Users/rodrigorochameire/Projetos/Defender-ca` (branch `feat/cowork-analise-dossie`).

---

### Task 1: Módulo `dossie-assistido.ts` (formatter puro + fetch guardado) + teste

**Files:**
- Create: `src/lib/services/dossie-assistido.ts`
- Test: `src/lib/services/__tests__/dossie-assistido.test.ts`

**Interfaces:**
- Produces: `buildDossieMarkdown(sections: DossieSection[], priorAnalyses: string[]): string`; `fetchDossieMarkdown(assistidoId: number, processoIds: number[]): Promise<string>`.

- [ ] **Step 1: Teste que falha** — `src/lib/services/__tests__/dossie-assistido.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildDossieMarkdown } from "@/lib/services/dossie-assistido";

describe("buildDossieMarkdown", () => {
  it("vazio → ''", () => {
    expect(buildDossieMarkdown([], [])).toBe("");
    expect(buildDossieMarkdown([{ resumo: "" }], [""])).toBe("");
  });
  it("renderiza Drive + análises anteriores", () => {
    const d = buildDossieMarkdown(
      [{ titulo: "Denúncia", tipo: "peca", resumo: "MP imputa furto." }],
      ["Tese: insuficiência probatória."],
    );
    expect(d).toContain("Dossiê do assistido");
    expect(d).toContain("Denúncia");
    expect(d).toContain("MP imputa furto");
    expect(d).toContain("Análises anteriores");
    expect(d).toContain("insuficiência probatória");
  });
  it("resumo preferido; textoExtraido só como fallback e capado a 2000", () => {
    const comResumo = buildDossieMarkdown([{ titulo: "A", resumo: "R", textoExtraido: "X".repeat(3000) }], []);
    expect(comResumo).toContain("**A**: R");
    expect(comResumo).not.toContain("X".repeat(2001));
    const semResumo = buildDossieMarkdown([{ titulo: "B", textoExtraido: "Y".repeat(3000) }], []);
    expect(semResumo).toContain("Y".repeat(2000));
    expect(semResumo).not.toContain("Y".repeat(2001));
  });
  it("cap de 30 seções", () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ titulo: `doc${i}`, resumo: `r${i}` }));
    const d = buildDossieMarkdown(many, []);
    expect((d.match(/^- \*\*doc/gm) || []).length).toBe(30);
  });
  it("bound total 18000 com marcador", () => {
    const big = Array.from({ length: 30 }, (_, i) => ({ titulo: `d${i}`, resumo: "z".repeat(2000) }));
    const d = buildDossieMarkdown(big, []);
    expect(d.length).toBeLessThanOrEqual(18000 + 40);
    expect(d).toContain("[…dossiê truncado]");
  });
  it("null-safe", () => {
    expect(() => buildDossieMarkdown([{ titulo: null, resumo: null, textoExtraido: null }], [null as any])).not.toThrow();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/services/__tests__/dossie-assistido.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Criar `src/lib/services/dossie-assistido.ts`**

```ts
import { db } from "@/lib/db";
import { driveDocumentSections, driveFiles, assistidos, processos } from "@/lib/db/schema";
import { and, eq, ne, desc, inArray } from "drizzle-orm";

const SECTION_CAP = 2000;
const MAX_SECTIONS = 30;
const MAX_DOSSIE_CHARS = 18000;

export interface DossieSection {
  tipo?: string | null;
  titulo?: string | null;
  resumo?: string | null;
  textoExtraido?: string | null;
}

/** Markdown compacto (só resumos, capado) com o contexto do assistido. Puro. */
export function buildDossieMarkdown(sections: DossieSection[], priorAnalyses: string[]): string {
  const parts: string[] = [];

  const drive = (sections ?? [])
    .slice(0, MAX_SECTIONS)
    .map((s) => {
      const titulo = s.titulo || s.tipo || "documento";
      let txt = (s.resumo ?? "").trim();
      if (!txt) txt = (s.textoExtraido ?? "").trim().slice(0, SECTION_CAP);
      return txt ? `- **${titulo}**: ${txt.slice(0, SECTION_CAP)}` : "";
    })
    .filter(Boolean);
  if (drive.length) parts.push("### Documentos no Drive (resumos)\n" + drive.join("\n"));

  const an = (priorAnalyses ?? [])
    .map((a) => (a ?? "").trim())
    .filter(Boolean)
    .map((a) => `- ${a.slice(0, SECTION_CAP)}`);
  if (an.length) parts.push("### Análises anteriores\n" + an.join("\n"));

  if (!parts.length) return "";
  let body = "## Dossiê do assistido (contexto além dos autos)\n\n" + parts.join("\n\n");
  if (body.length > MAX_DOSSIE_CHARS) body = body.slice(0, MAX_DOSSIE_CHARS) + "\n\n[…dossiê truncado]";
  return body;
}

/** Busca Drive sections + analysisData e formata. NUNCA lança → "" em erro. */
export async function fetchDossieMarkdown(assistidoId: number, processoIds: number[]): Promise<string> {
  try {
    const sections = await db
      .select({
        tipo: driveDocumentSections.tipo,
        titulo: driveDocumentSections.titulo,
        resumo: driveDocumentSections.resumo,
        textoExtraido: driveDocumentSections.textoExtraido,
      })
      .from(driveDocumentSections)
      .innerJoin(driveFiles, eq(driveDocumentSections.driveFileId, driveFiles.id))
      .where(and(eq(driveFiles.assistidoId, assistidoId), ne(driveDocumentSections.reviewStatus, "rejected")))
      .orderBy(desc(driveDocumentSections.updatedAt))
      .limit(MAX_SECTIONS);

    const prior: string[] = [];
    const [aRow] = await db
      .select({ analysisData: assistidos.analysisData })
      .from(assistidos)
      .where(eq(assistidos.id, assistidoId))
      .limit(1);
    const aResumo = (aRow?.analysisData as any)?.resumo;
    if (aResumo) prior.push(String(aResumo));

    if (processoIds.length) {
      const pRows = await db
        .select({ analysisData: processos.analysisData })
        .from(processos)
        .where(inArray(processos.id, processoIds));
      for (const p of pRows) {
        const r = (p.analysisData as any)?.resumo;
        if (r) prior.push(String(r));
      }
    }

    return buildDossieMarkdown(sections, prior);
  } catch {
    return "";
  }
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npm test -- src/lib/services/__tests__/dossie-assistido.test.ts`
Expected: PASS.

- [ ] **Step 5: tsc do módulo**

Run: `npx tsc --noEmit 2>&1 | grep -E "dossie-assistido" || echo "no type errors in dossie-assistido"`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/dossie-assistido.ts src/lib/services/__tests__/dossie-assistido.test.ts
git commit -m "feat(cowork): dossie-assistido.ts (buildDossieMarkdown puro + fetchDossieMarkdown guardado)"
```

---

### Task 2: Wire em coworkAnalise + build

**Files:**
- Modify: `src/lib/trpc/routers/briefing.ts` (~L1266 + L1310)

**Interfaces:**
- Consumes: `fetchDossieMarkdown` (Task 1).

- [ ] **Step 1: Importar + montar promptFinal** — em `briefing.ts`, adicionar o import (junto aos outros de `@/lib/services/*` se houver, senão no bloco de imports):

```ts
import { fetchDossieMarkdown } from "@/lib/services/dossie-assistido";
```
e, logo após `const briefing = lines.join("\n");` (~L1266):

```ts
      const briefing = lines.join("\n");
      const dossie = await fetchDossieMarkdown(input.assistidoId, processosDb.map((p) => p.id));
      const promptFinal = dossie ? `${briefing}\n\n${dossie}` : briefing;
```

- [ ] **Step 2: Usar promptFinal no insert** — trocar `prompt: briefing,` (~L1310) por:

```ts
        prompt: promptFinal,
```
(SÓ essa linha; o resto do `.values({...})` intacto.)

- [ ] **Step 3: tsc dos arquivos tocados**

Run: `npx tsc --noEmit 2>&1 | grep -E "briefing\.ts|dossie-assistido" || echo "no type errors in touched files"`
Expected: sem erros.

- [ ] **Step 4: Confirmar que é a única mudança em coworkAnalise**

Run: `git diff src/lib/trpc/routers/briefing.ts | grep -E "^\+" | grep -v "^\+\+\+"`
Expected: só o import, as 2 linhas do dossie/promptFinal, e `prompt: promptFinal,`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/briefing.ts
git commit -m "feat(cowork): coworkAnalise injeta o dossiê do assistido no prompt (append-only, degrada se vazio)"
```

---

### Task 3: Build + memória

**Files:** verify only + memória.

- [ ] **Step 1: Build de produção**

Run: `NODE_OPTIONS=--max-old-space-size=8192 npm run build > /tmp/ca-build.log 2>&1; echo "CA_BUILD_EXIT=$?"; grep -E "CA_BUILD_EXIT|Failed to compile|✓ Generating static pages" /tmp/ca-build.log | tail -3`
Expected: `CA_BUILD_EXIT=0`.

- [ ] **Step 2: Teste do módulo (final)**

Run: `npm test -- src/lib/services/__tests__/dossie-assistido.test.ts 2>&1 | grep -E "Test Files|Tests|passed|failed" | tail -3`
Expected: passed.

- [ ] **Step 3: Atualizar memória** — estender `project_c2_produzir_peca.md`: follow-up coworkAnalise — o botão manual "Análise profunda" agora injeta o dossiê (Drive sections + análises anteriores, capado) via `dossie-assistido.ts` (buildDossieMarkdown puro + fetchDossieMarkdown guardado); append-only no prompt; NÃO usa consolidateForAssistido (LLM pago). Atualizar `MEMORY.md` se necessário.

- [ ] **Step 4: Registrar no ledger SDD.**

---

## Self-Review

**Spec coverage:** §3.1 buildDossieMarkdown → Task 1 Step 3 + teste; §3.1 fetchDossieMarkdown → Task 1 Step 3; §3.2 wire → Task 2; §5 testes → Task 1; §6 critérios: #1 Task1 teste, #2 Task1 Step 3 (try/catch), #3 Task2, #4 Task2 Step 3 + Task3 Step 1, #5 (nada mais tocado).

**Placeholder scan:** sem TODOs.

**Type/nome consistency:** `buildDossieMarkdown(sections, priorAnalyses)` / `fetchDossieMarkdown(assistidoId, processoIds)` idênticos entre módulo, teste e wire. Colunas Drizzle conforme Global Constraints.

**Nota:** append-only + try/catch → "" garante que o pior caso é o briefing de hoje. `buildDossieMarkdown` puro coberto por teste; `fetchDossieMarkdown` (Drizzle) validado pelo build/tsc + verificação viva deferida.
