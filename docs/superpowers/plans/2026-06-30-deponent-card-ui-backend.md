# Deponent Card UI + Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 new DB columns + INTERROGANDO enum, expose them via tRPC, clean denúncia text, rename/add tabs (Caso + Intimações), surface the réu card, replace emoji labels with Lucide icons, and upgrade TranscriptPlayer with a custom audio bar and pin markers.

**Architecture:** Six sequential tasks: (1) DB migration — data layer first so every later task can compile; (2) tRPC — expose new columns and new mutations; (3) pure function `extrairNarrativaFatos` — pure, tested, no side-effects; (4) Sheet rewiring — areas, tabs, sections, banner guard; (5) Card polish — icons + INTERROGANDO + IP link; (6) TranscriptPlayer — custom bar + pin overlay.

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM, PostgreSQL/Supabase, Tailwind CSS, shadcn/ui, Lucide React, Vitest + @testing-library/react

**Spec:** `docs/superpowers/specs/2026-06-30-deponent-card-pins-skill-design.md`

---

## Global Constraints

- Never modify `.aiox-core/core/`, `.aiox-core/constitution.md`, `bin/aiox.js` (L1 — protected)
- `npm run typecheck` must exit 0 after every task
- `npm run lint` must exit 0 after every task
- Test runner: `npx vitest run <file>` (not `jest`)
- Drizzle column names are camelCase in TS, snake_case in SQL
- No new npm packages — Lucide is already installed; use `crypto.randomUUID()` (native, no package needed) for pin IDs
- `pinos` column stores `Pino[]` JSON array; default `'[]'::jsonb`
- `Pino.fonte` is uppercase `"IA" | "DEFENSOR"` throughout (plan, DB, dedup SQL) — consistent in both plans
- Postgres enum `ADD VALUE` cannot run inside a transaction (write migration accordingly)
- After adding `"INTERROGANDO"` to `tipoTestemunhaEnum` in `enums.ts`, `DepoenteV2.tipo` in `depoente-card-v2.tsx` must also include it

---

## File Map

| Status | Path | Role |
|--------|------|------|
| CREATE | `supabase/migrations/20260630_testemunhas_pins_timestamps.sql` | SQL migration (5 columns + enum value) |
| MODIFY | `src/lib/db/schema/enums.ts` | Add INTERROGANDO to tipoTestemunhaEnum |
| MODIFY | `src/lib/db/schema/agenda.ts` | Add 5 columns to testemunhas table |
| CREATE | `src/lib/agenda/pino.ts` | Pino interface + Zod schema |
| MODIFY | `src/lib/trpc/routers/audiencias.ts` | getDepoenteMidia + addPino + removePino |
| CREATE | `src/lib/agenda/extrair-narrativa-fatos.ts` | Pure cleaning function |
| CREATE | `src/lib/agenda/extrair-narrativa-fatos.test.ts` | Unit tests |
| MODIFY | `src/components/agenda/sheet/areas-mae.ts` | Add "intimacoes" area; rename "imputacao" label to "Caso" |
| MODIFY | `src/components/agenda/sheet/areas-mae.test.ts` | Update 3 tests |
| MODIFY | `src/components/agenda/sheet/area-tabs.test.tsx` | Update "Imputação" → "Caso" |
| MODIFY | `src/components/agenda/sheet/secoes-manifest.ts` | Add "intimacao" to SECOES_INSTRUCAO |
| CREATE | `src/components/agenda/sheet/secoes/IntimacoesSecao.tsx` | Intimações tab content |
| MODIFY | `src/components/agenda/sheet/secoes/DepoentesSecao.tsx` | Include INTERROGANDO (réu) |
| MODIFY | `src/components/agenda/sheet/secoes/DenunciaSecao.tsx` | Apply extrairNarrativaFatos |
| MODIFY | `src/components/agenda/event-detail-sheet.tsx` | SubtipoBanner guard; secoesMap["intimacao"] |
| MODIFY | `src/components/agenda/sheet/depoente-card-v2.tsx` | ladoOf INTERROGANDO; topBarColor; Lucide icons; IP link |
| MODIFY | `src/components/agenda/sheet/transcript-player.tsx` | Custom bar + pin markers + 📌 button |

---

### Task 1: DB Migration + Drizzle Schema

**Files:**
- Create: `supabase/migrations/20260630_testemunhas_pins_timestamps.sql`
- Modify: `src/lib/db/schema/enums.ts` (line 344)
- Modify: `src/lib/db/schema/agenda.ts` (after line 337, before createdAt)

- [ ] **Step 1: Create the SQL migration**

```sql
-- supabase/migrations/20260630_testemunhas_pins_timestamps.sql
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction.
-- Supabase applies each migration file outside a transaction by default.

ALTER TYPE tipo_testemunha ADD VALUE IF NOT EXISTS 'INTERROGANDO';

ALTER TABLE testemunhas
  ADD COLUMN IF NOT EXISTS termo_delegacia_drive_file_id varchar(100),
  ADD COLUMN IF NOT EXISTS termo_delegacia_pagina integer,
  ADD COLUMN IF NOT EXISTS depoimento_timestamp_inicio_s integer,
  ADD COLUMN IF NOT EXISTS depoimento_timestamp_fim_s integer,
  ADD COLUMN IF NOT EXISTS pinos jsonb NOT NULL DEFAULT '[]'::jsonb;
```

- [ ] **Step 2: Update `enums.ts` — add INTERROGANDO**

At `src/lib/db/schema/enums.ts`, find `tipoTestemunhaEnum` (line 344) and change:
```typescript
// BEFORE
export const tipoTestemunhaEnum = pgEnum("tipo_testemunha", [
  "DEFESA",
  "ACUSACAO",
  "COMUM",
  "INFORMANTE",
  "PERITO",
  "VITIMA",
]);

// AFTER
export const tipoTestemunhaEnum = pgEnum("tipo_testemunha", [
  "DEFESA",
  "ACUSACAO",
  "COMUM",
  "INFORMANTE",
  "PERITO",
  "VITIMA",
  "INTERROGANDO",
]);
```

- [ ] **Step 3: Update `agenda.ts` — add 5 columns to `testemunhas`**

After `depoimentoTranscricaoStatus` (line 337) and before `createdAt`, add:
```typescript
  termoDelegaciaDriveFileId: varchar("termo_delegacia_drive_file_id", { length: 100 }),
  termoDelegaciaPagina: integer("termo_delegacia_pagina"),
  depoimentoTimestampInicioS: integer("depoimento_timestamp_inicio_s"),
  depoimentoTimestampFimS: integer("depoimento_timestamp_fim_s"),
  pinos: jsonb("pinos").$type<import("@/lib/agenda/pino").Pino[]>().notNull().default([]),
```

Note: The `Pino` type must be created (Task 2) before this import resolves cleanly. Write a placeholder type definition now if needed, or create both files in the same commit.

- [ ] **Step 4: Create `src/lib/agenda/pino.ts`**

```typescript
import { z } from "zod";

export const PinoSchema = z.object({
  id: z.string(),
  timestampS: z.number(),
  nota: z.string().optional(),
  fonte: z.enum(["IA", "DEFENSOR"]),
  categoria: z.string().optional(),
});

export type Pino = z.infer<typeof PinoSchema>;
```

- [ ] **Step 5: Push migration to local dev DB**

```bash
npm run db:push
```
Expected: no errors, 5 new columns visible.

- [ ] **Step 6: Typecheck**

```bash
npm run typecheck
```
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260630_testemunhas_pins_timestamps.sql \
        src/lib/db/schema/enums.ts \
        src/lib/db/schema/agenda.ts \
        src/lib/agenda/pino.ts
git commit -m "feat(db): add INTERROGANDO enum + testemunhas pin/timestamp columns"
```

---

### Task 2: tRPC — expose new fields + addPino / removePino

**Files:**
- Modify: `src/lib/trpc/routers/audiencias.ts` (around line 1965)

- [ ] **Step 1: Update `getDepoenteMidia` to select new columns**

Replace the select block in `getDepoenteMidia` (currently lines 1969-1976):

```typescript
// BEFORE
const [t] = await db
  .select({
    audioDriveFileId: testemunhas.depoimentoAudioDriveFileId,
    audioUrl: testemunhas.depoimentoAudioUrl,
    transcricao: testemunhas.depoimentoTranscricao,
    segments: testemunhas.depoimentoSegments,
    transcricaoStatus: testemunhas.depoimentoTranscricaoStatus,
    duracao: testemunhas.depoimentoAudioDuracao,
  })
  ...
return {
  audioDriveFileId: t?.audioDriveFileId ?? null,
  audioUrl: t?.audioUrl ?? null,
  transcricao: t?.transcricao ?? null,
  segments: t?.segments ?? [],
  transcricaoStatus: t?.transcricaoStatus ?? null,
  duracao: t?.duracao ?? null,
};

// AFTER
const [t] = await db
  .select({
    audioDriveFileId: testemunhas.depoimentoAudioDriveFileId,
    audioUrl: testemunhas.depoimentoAudioUrl,
    transcricao: testemunhas.depoimentoTranscricao,
    segments: testemunhas.depoimentoSegments,
    transcricaoStatus: testemunhas.depoimentoTranscricaoStatus,
    duracao: testemunhas.depoimentoAudioDuracao,
    pinos: testemunhas.pinos,
    termoDelegaciaDriveFileId: testemunhas.termoDelegaciaDriveFileId,
    termoDelegaciaPagina: testemunhas.termoDelegaciaPagina,
    depoimentoTimestampInicioS: testemunhas.depoimentoTimestampInicioS,
  })
  ...
return {
  audioDriveFileId: t?.audioDriveFileId ?? null,
  audioUrl: t?.audioUrl ?? null,
  transcricao: t?.transcricao ?? null,
  segments: t?.segments ?? [],
  transcricaoStatus: t?.transcricaoStatus ?? null,
  duracao: t?.duracao ?? null,
  pinos: (t?.pinos ?? []) as import("@/lib/agenda/pino").Pino[],
  termoDelegaciaDriveFileId: t?.termoDelegaciaDriveFileId ?? null,
  termoDelegaciaPagina: t?.termoDelegaciaPagina ?? null,
  depoimentoTimestampInicioS: t?.depoimentoTimestampInicioS ?? null,
};
```

- [ ] **Step 2: Add `addPino` mutation** (insert before the closing `}` of the router, before `parseAtaPreview`)

```typescript
addPino: protectedProcedure
  .input(z.object({
    depoenteId: z.number(),
    pino: z.object({
      id: z.string(),
      timestampS: z.number(),
      nota: z.string().optional(),
      fonte: z.enum(["IA", "DEFENSOR"]),
      categoria: z.string().optional(),
    }),
  }))
  .mutation(async ({ input }) => {
    // Append only if no existing pino has the same timestampS+fonte combo
    await db.execute(sql`
      UPDATE testemunhas
      SET pinos = pinos || ${JSON.stringify(input.pino)}::jsonb
      WHERE id = ${input.depoenteId}
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(pinos) p
          WHERE (p->>'timestampS')::float = ${input.pino.timestampS}
            AND p->>'fonte' = ${input.pino.fonte}
        )
    `);
  }),
```

- [ ] **Step 3: Add `removePino` mutation**

```typescript
removePino: protectedProcedure
  .input(z.object({ depoenteId: z.number(), pinoId: z.string() }))
  .mutation(async ({ input }) => {
    await db.execute(sql`
      UPDATE testemunhas
      SET pinos = (
        SELECT COALESCE(jsonb_agg(p), '[]'::jsonb)
        FROM jsonb_array_elements(pinos) p
        WHERE p->>'id' != ${input.pinoId}
      )
      WHERE id = ${input.depoenteId}
    `);
  }),
```

Make sure `sql` is imported from `drizzle-orm` at the top of the file (check existing imports; it's likely already there).

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/audiencias.ts
git commit -m "feat(trpc): getDepoenteMidia returns pinos + termoDelegacia; add addPino/removePino mutations"
```

---

### Task 3: `extrairNarrativaFatos` — pure function + tests

**Files:**
- Create: `src/lib/agenda/extrair-narrativa-fatos.ts`
- Create: `src/lib/agenda/extrair-narrativa-fatos.test.ts`

- [ ] **Step 1: Write the failing test first**

```typescript
// src/lib/agenda/extrair-narrativa-fatos.test.ts
import { describe, it, expect } from "vitest";
import { extrairNarrativaFatos } from "./extrair-narrativa-fatos";

const RAW_PDF = `
Num. 508976743 - Pág. 1 de 3
TRIBUNAL DE JUSTIÇA DO ESTADO DA BAHIA
VARA CRIMINAL

Assinado eletronicamente por: FULANO DE TAL
https://projudi.tjba.jus.br/…

DENÚNCIA

No dia 07 de maio de 2025, por volta das 23h44min, na Rua das Flores, o
denunciado João da Silva subtraiu para si, mediante violência, a quantia de
R$ 500,00 de Maria dos Santos.
`;

const CLEAN = `No dia 07 de maio de 2025, por volta das 23h44min, na Rua das Flores, o
denunciado João da Silva subtraiu para si, mediante violência, a quantia de
R$ 500,00 de Maria dos Santos.`;

describe("extrairNarrativaFatos", () => {
  it("retorna somente o parágrafo narrativo — sem cabeçalho, sem assinatura, sem URL", () => {
    const result = extrairNarrativaFatos(RAW_PDF);
    expect(result).toContain("No dia 07 de maio de 2025");
    expect(result).not.toContain("Num. 508976743");
    expect(result).not.toContain("projudi.tjba.jus.br");
    expect(result).not.toContain("Assinado eletronicamente");
  });

  it("retorna texto já limpo inalterado (sem marcador temporal: retorna tudo sem os ruídos)", () => {
    const alreadyClean = "O denunciado saiu correndo pela rua.";
    const result = extrairNarrativaFatos(alreadyClean);
    expect(result).toBe("O denunciado saiu correndo pela rua.");
  });

  it("handles empty string", () => {
    expect(extrairNarrativaFatos("")).toBe("");
  });

  it("remove linhas que são só URLs", () => {
    const withUrl = "https://projudi.tjba.jus.br/link\nNo dia 10 de março, o réu apareceu.";
    expect(extrairNarrativaFatos(withUrl)).toBe("No dia 10 de março, o réu apareceu.");
  });

  it("remove linhas de numeração de página", () => {
    const withPage = "Num. 123456 - Pág. 1 de 5\nA vítima relatou os fatos.";
    expect(extrairNarrativaFatos(withPage)).toBe("A vítima relatou os fatos.");
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/lib/agenda/extrair-narrativa-fatos.test.ts
```
Expected: FAIL — "Cannot find module './extrair-narrativa-fatos'"

- [ ] **Step 3: Implement `extrairNarrativaFatos`**

```typescript
// src/lib/agenda/extrair-narrativa-fatos.ts

const NOISE_LINE = /^(Num\.\s+\d+|Pág\.\s+\d+|https?:\/\/|Assinado eletronicamente|O sistema registrou|Você tomou ciência|TRIBUNAL|VARA |COMARCA|ESTADO DA BAHIA|MINISTÉRIO PÚBLICO)/i;

const NARRATIVE_START = /(No dia|Na data|Na madrugada|Na noite|Nas proximidades|Por volta|O denunciado|O acusado|A vítima|Em \d{2}\/\d{2})/i;

export function extrairNarrativaFatos(texto: string): string {
  if (!texto.trim()) return "";

  const lines = texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !NOISE_LINE.test(l));

  // Find first line that looks like the start of the narrative paragraph
  const startIdx = lines.findIndex((l) => NARRATIVE_START.test(l));
  const narrative = startIdx >= 0 ? lines.slice(startIdx) : lines;

  // Collapse into a readable paragraph
  return narrative.join("\n").trim();
}
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
npx vitest run src/lib/agenda/extrair-narrativa-fatos.test.ts
```
Expected: 5/5 PASS

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/agenda/extrair-narrativa-fatos.ts \
        src/lib/agenda/extrair-narrativa-fatos.test.ts
git commit -m "feat(agenda): extrairNarrativaFatos — clean raw PDF denúncia text"
```

---

### Task 4: Sheet A1-A5 — areas, tabs, sections, DenunciaSecao

**Files:**
- Modify: `src/components/agenda/sheet/areas-mae.ts`
- Modify: `src/components/agenda/sheet/areas-mae.test.ts`
- Modify: `src/components/agenda/sheet/area-tabs.test.tsx`
- Modify: `src/components/agenda/sheet/secoes-manifest.ts`
- Create: `src/components/agenda/sheet/secoes/IntimacoesSecao.tsx`
- Modify: `src/components/agenda/sheet/secoes/DenunciaSecao.tsx`
- Modify: `src/components/agenda/sheet/secoes/DepoentesSecao.tsx`
- Modify: `src/components/agenda/event-detail-sheet.tsx`

**A3 + A4: Update `areas-mae.ts`**

- [ ] **Step 1: Update `areas-mae.ts`**

Make these 4 changes in `src/components/agenda/sheet/areas-mae.ts`:

1. **AreaMae union** — add `"intimacoes"`:
```typescript
// BEFORE
export type AreaMae = "imputacao" | "depoimentos" | "laudos-docs" | "estrategia" | "execucao";

// AFTER
export type AreaMae = "imputacao" | "intimacoes" | "depoimentos" | "laudos-docs" | "estrategia" | "execucao";
```

2. **AREA_ORDER** — insert `"intimacoes"` between `"imputacao"` and `"depoimentos"`:
```typescript
// BEFORE
export const AREA_ORDER: AreaMae[] = ["imputacao", "depoimentos", "laudos-docs", "estrategia", "execucao"];

// AFTER
export const AREA_ORDER: AreaMae[] = ["imputacao", "intimacoes", "depoimentos", "laudos-docs", "estrategia", "execucao"];
```

3. **AREA_LABELS** — rename "imputacao" label + add "intimacoes":
```typescript
// BEFORE (imputacao entry)
imputacao: "Imputação",

// AFTER
imputacao: "Caso",
intimacoes: "Intimações",
```

4. **SECAO_TO_AREA** — remap `intimacao` SecaoId from `"depoimentos"` to `"intimacoes"`:
```typescript
// BEFORE
intimacao: "depoimentos",

// AFTER
intimacao: "intimacoes",
```

- [ ] **Step 2: Update `areas-mae.test.ts`**

Three changes:

a) Line 15 — update AREA_ORDER assertion:
```typescript
// BEFORE
expect(AREA_ORDER).toEqual(["imputacao", "depoimentos", "laudos-docs", "estrategia", "execucao"]);

// AFTER
expect(AREA_ORDER).toEqual(["imputacao", "intimacoes", "depoimentos", "laudos-docs", "estrategia", "execucao"]);
```

b) Line 14 — update "5 áreas" description text to "6 áreas":
```typescript
// BEFORE
it("define exatamente 5 áreas, na ordem do workspace", () => {

// AFTER
it("define exatamente 6 áreas, na ordem do workspace", () => {
```

c) In the `computeWorkspaceTabs` test at line 72, the result `areasComConteudo` still works correctly since `"intimacoes"` has 0 count in that test — no change needed there. But the count assertion `expect(r.areaCounts.imputacao).toBe(2)` uses `"intimacao"` SecaoId which now maps to `"intimacoes"`. Adjust the test fixture that uses `"intimacao"` SecaoId if any. (Check: the computeWorkspaceTabs tests use `["resumo", "depoentes", ...]` — `"intimacao"` is not in those fixtures, so no change needed in those tests.)

- [ ] **Step 3: Update `area-tabs.test.tsx`**

Two lines in this file contain `/Imputação/i` — both must change:

```typescript
// BEFORE (line 13)
expect(screen.getByRole("tab", { name: /Imputação/i })).toBeInTheDocument();
// AFTER
expect(screen.getByRole("tab", { name: /Caso/i })).toBeInTheDocument();

// BEFORE (line 23)
expect(screen.getByRole("tab", { name: /Imputação/i })).toHaveAttribute("aria-selected", "false");
// AFTER
expect(screen.getByRole("tab", { name: /Caso/i })).toHaveAttribute("aria-selected", "false");
```

- [ ] **Step 4: Add "intimacao" to `SECOES_INSTRUCAO` in `secoes-manifest.ts`**

In `SECOES_INSTRUCAO` (line 94), add `"intimacao"` after `"depoentes"` in the Espinha block:
```typescript
// BEFORE
// Espinha (7)
"resumo",
"imputacao",
"fatos",
"depoentes",
"depoimentos",
"laudos",
"documentos",

// AFTER
// Espinha (8)
"resumo",
"imputacao",
"fatos",
"depoentes",
"intimacao",   // ← Intimações tab
"depoimentos",
"laudos",
"documentos",
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx vitest run src/components/agenda/sheet/areas-mae.test.ts \
               src/components/agenda/sheet/area-tabs.test.tsx
```
Expected: all pass.

**A1: Fix DenunciaSecao**

- [ ] **Step 6: Update `DenunciaSecao.tsx`**

In `src/components/agenda/sheet/secoes/DenunciaSecao.tsx`, import the new function and apply it at line 66 (the `{s.textoExtraido}` render):

```typescript
// Add import at the top
import { extrairNarrativaFatos } from "@/lib/agenda/extrair-narrativa-fatos";

// In the blockquote, change:
// BEFORE
{s.textoExtraido}

// AFTER
{extrairNarrativaFatos(s.textoExtraido ?? "")}
```

**A2: Remove SubtipoBanner lembretes for non-cockpit subtipos**

- [ ] **Step 7: Guard SubtipoBanner in `event-detail-sheet.tsx`**

At line 1497, change:
```tsx
// BEFORE
{!isLoading && <SubtipoBanner subtipo={subtipo} processoNum={processoNum} />}

// AFTER
{!isLoading && subtipoCfg?.direcionaCockpit && (
  <SubtipoBanner subtipo={subtipo} processoNum={processoNum} />
)}
```

`subtipoCfg` is already declared at line 306: `const subtipoCfg = SUBTIPO_CONFIG[subtipo];`. This makes the banner appear only for Júri Plenário (the only subtipo with `direcionaCockpit: true`), suppressing the AIJ lembretes banner.

**A4: Create IntimacoesSecao**

- [ ] **Step 8: Create `src/components/agenda/sheet/secoes/IntimacoesSecao.tsx`**

```tsx
"use client";

import { cn } from "@/lib/utils";
import type { DepoenteV2 } from "@/components/agenda/sheet/depoente-card-v2";

function intimacaoLabel(status?: string): { text: string; color: string } | null {
  switch (status) {
    case "INTIMADA":         return { text: "Intimada",                       color: "text-emerald-600 dark:text-emerald-400" };
    case "ARROLADA":         return { text: "Não intimada",                   color: "text-rose-600 dark:text-rose-400" };
    case "NAO_LOCALIZADA":   return { text: "Não intimada — não localizada",  color: "text-rose-600 dark:text-rose-400" };
    case "CARTA_PRECATORIA": return { text: "Carta precatória expedida",      color: "text-amber-600 dark:text-amber-400" };
    case "DESISTIDA":        return { text: "Desistência comunicada",         color: "text-neutral-400 dark:text-neutral-500" };
    default:                 return null;
  }
}

export function IntimacoesSecao({ depoentes }: { depoentes: DepoenteV2[] }) {
  if (depoentes.length === 0) {
    return (
      <p className="text-xs text-neutral-400 italic py-2">
        Nenhum depoente arrolado.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {depoentes.map((d, i) => {
        const lbl = intimacaoLabel(d.status);
        return (
          <div key={d.id ?? i} className="flex items-center justify-between text-xs py-1 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
            <span className="font-medium text-neutral-700 dark:text-neutral-200 truncate max-w-[55%]">
              {d.nome}
            </span>
            {lbl ? (
              <span className={cn("text-[10px] font-medium", lbl.color)}>{lbl.text}</span>
            ) : (
              <span className="text-[10px] text-neutral-400 italic">—</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

**A5: INTERROGANDO in DepoentesSecao**

- [ ] **Step 9: Update `DepoentesSecao.tsx` to include réu (INTERROGANDO)**

Find the block in `src/components/agenda/sheet/secoes/DepoentesSecao.tsx` that filters/renders deponents. Add INTERROGANDO to the defesa block, placed **last** within it:

```typescript
// Where deponents are filtered into groups, ensure:
// 1. INTERROGANDO is treated as "defesa" side
// 2. INTERROGANDO appears last within the defesa group

// Typical pattern — adjust to match the actual code:
const defesaDepoentes = depoentes.filter(
  (d) => d.lado === "defesa" || d.tipo === "DEFESA" || d.tipo === "INTERROGANDO"
);
// Sort: INTERROGANDO last
defesaDepoentes.sort((a, b) =>
  a.tipo === "INTERROGANDO" ? 1 : b.tipo === "INTERROGANDO" ? -1 : 0
);
```

**Wire IntimacoesSecao into event-detail-sheet.tsx**

- [ ] **Step 10: Replace the `"intimacao"` entry in secoesMap in `event-detail-sheet.tsx`**

In `event-detail-sheet.tsx`, the `"intimacao"` entry already exists at line 794 — it renders an `IntimacaoSecao` with plain text for the MPU justification flow. **Replace** it (do not add a duplicate) with a new entry that renders `IntimacoesSecao` when the audiência has deponents:

```tsx
// Add import at top
import { IntimacoesSecao } from "@/components/agenda/sheet/secoes/IntimacoesSecao";

// BEFORE (lines 794-802)
"intimacao": {
  label: "Intimação",
  temDado: !!intimacaoTexto,
  node: (
    <CollapsibleSection id="intimacao" label="Intimação" defaultOpen>
      <IntimacaoSecao texto={intimacaoTexto!} />
    </CollapsibleSection>
  ),
},

// AFTER — shows deponent intimation list for AIJ flow; falls back to text for MPU flow
"intimacao": {
  label: "Intimações",
  temDado: depoentesStatus.length > 0 || !!intimacaoTexto,
  node: depoentesStatus.length > 0 ? (
    <CollapsibleSection id="intimacao" label="Intimações" defaultOpen>
      <IntimacoesSecao depoentes={depoentesStatus} />
    </CollapsibleSection>
  ) : (
    <CollapsibleSection id="intimacao" label="Intimação" defaultOpen>
      <IntimacaoSecao texto={intimacaoTexto!} />
    </CollapsibleSection>
  ),
},
```

Where `depoentesStatus` is the existing `DepoenteV2[]` array already computed in the sheet. This preserves the MPU flow (plain text) while enabling the new Intimações tab for AIJ.

- [ ] **Step 11: Typecheck + lint**

```bash
npm run typecheck && npm run lint
```

- [ ] **Step 12: Run all affected tests**

```bash
npx vitest run src/components/agenda/sheet/
```

- [ ] **Step 13: Commit**

```bash
git add src/components/agenda/sheet/areas-mae.ts \
        src/components/agenda/sheet/areas-mae.test.ts \
        src/components/agenda/sheet/area-tabs.test.tsx \
        src/components/agenda/sheet/secoes-manifest.ts \
        src/components/agenda/sheet/secoes/IntimacoesSecao.tsx \
        src/components/agenda/sheet/secoes/DenunciaSecao.tsx \
        src/components/agenda/sheet/secoes/DepoentesSecao.tsx \
        src/components/agenda/event-detail-sheet.tsx
git commit -m "feat(sheet): tab Caso + tab Intimações; remove banner AIJ; réu no card; denúncia limpa"
```

---

### Task 5: Card B1-B2 — Lucide icons + INTERROGANDO + IP term link

**Files:**
- Modify: `src/components/agenda/sheet/depoente-card-v2.tsx`

- [ ] **Step 1: Add INTERROGANDO to `DepoenteV2.tipo` union (line 18)**

```typescript
// BEFORE
tipo?: "ACUSACAO" | "DEFESA" | "COMUM" | "INFORMANTE" | "PERITO" | "VITIMA";

// AFTER
tipo?: "ACUSACAO" | "DEFESA" | "COMUM" | "INFORMANTE" | "PERITO" | "VITIMA" | "INTERROGANDO";
```

- [ ] **Step 2: Update `ladoOf()` to handle INTERROGANDO (line 49)**

```typescript
// BEFORE
function ladoOf(d: DepoenteV2): "acusacao" | "defesa" | "neutro" {
  if (d.lado === "acusacao" || d.tipo === "ACUSACAO" || d.tipo === "VITIMA") return "acusacao";
  if (d.lado === "defesa" || d.tipo === "DEFESA") return "defesa";
  return "neutro";
}

// AFTER
function ladoOf(d: DepoenteV2): "acusacao" | "defesa" | "neutro" {
  if (d.lado === "acusacao" || d.tipo === "ACUSACAO" || d.tipo === "VITIMA") return "acusacao";
  if (d.lado === "defesa" || d.tipo === "DEFESA" || d.tipo === "INTERROGANDO") return "defesa";
  return "neutro";
}
```

- [ ] **Step 3: Update `topBarColor` map to differentiate INTERROGANDO (lines 150-154)**

The `topBarColor` is derived from `lado` (not `tipo`), so INTERROGANDO → `"defesa"` → `bg-emerald-300/70`. To get the darker green (`bg-emerald-500/70`) for the réu specifically, compute it from `tipo` directly:

```typescript
// BEFORE
const topBarColor = {
  acusacao: "bg-rose-300/70",
  defesa: "bg-emerald-300/70",
  neutro: "bg-neutral-200",
}[lado];

// AFTER
const topBarColor =
  depoente.tipo === "INTERROGANDO"
    ? "bg-emerald-500/70"
    : {
        acusacao: "bg-rose-300/70",
        defesa: "bg-emerald-300/70",
        neutro: "bg-neutral-200",
      }[lado];
```

- [ ] **Step 4: Update `qualidadeLabel` to handle INTERROGANDO (around line 64)**

```typescript
// After the COMUM case, add:
if (d.tipo === "INTERROGANDO") return "Réu (interrogatório)";
```

- [ ] **Step 5: Replace `🏛` emoji with `Building2` Lucide icon (line 209)**

First, add `Building2` and `Scale` to the existing Lucide import at the top of the file. Then:

```tsx
// BEFORE
<div className="text-[9px] font-semibold text-neutral-400 tracking-wide">
  🏛 DELEGACIA
</div>

// AFTER
<div className="flex items-center gap-1 text-[9px] font-semibold text-neutral-400 tracking-wide">
  <Building2 className="h-3 w-3" />
  DELEGACIA
</div>
```

- [ ] **Step 6: Replace `⚖` emoji with `Scale` Lucide icon (line 229)**

```tsx
// BEFORE
<div className="text-[9px] font-semibold text-neutral-400 tracking-wide">
  ⚖ EM JUÍZO
</div>

// AFTER
<div className="flex items-center gap-1 text-[9px] font-semibold text-neutral-400 tracking-wide">
  <Scale className="h-3 w-3" />
  EM JUÍZO
</div>
```

- [ ] **Step 7: Update IP term link to use `termoDelegaciaDriveFileId` as primary source**

The `midia` object returned by `getDepoenteMidia` now includes `termoDelegaciaDriveFileId` and `termoDelegaciaPagina`. Add those to the DepoenteV2 interface and use them to build `termoIpHref`:

First, add fields to `DepoenteV2`:
```typescript
termoDelegaciaDriveFileId?: string | null;
termoDelegaciaPagina?: number | null;
```

Then in the component body, update `termoIpHref` logic (lines 144-148):
```typescript
// BEFORE
const termoIpHref =
  termoIp?.fileWebViewLink && (depoente.versaoDelegacia || termoIp.textoExtraido)
    ? `${termoIp.fileWebViewLink}${termoIp.paginaInicio ? `#page=${termoIp.paginaInicio}` : ""}`
    : null;

// AFTER — skill-populated Drive file takes priority; fall back to existing sectionsByProcesso
const termoIpHref = depoente.termoDelegaciaDriveFileId
  ? `https://drive.google.com/file/d/${depoente.termoDelegaciaDriveFileId}/view${depoente.termoDelegaciaPagina ? `#page=${depoente.termoDelegaciaPagina}` : ""}`
  : (termoIp?.fileWebViewLink && (depoente.versaoDelegacia || termoIp.textoExtraido)
      ? `${termoIp.fileWebViewLink}${termoIp.paginaInicio ? `#page=${termoIp.paginaInicio}` : ""}`
      : null);
```

Check that the callers of `DepoenteCardV2` in `event-detail-sheet.tsx` pass `termoDelegaciaDriveFileId` and `termoDelegaciaPagina` (sourced from the `getDepoenteMidia` query result). If the midia query is called lazily (when card opens), the fields will be populated on open.

- [ ] **Step 8: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 9: Commit**

```bash
git add src/components/agenda/sheet/depoente-card-v2.tsx
git commit -m "feat(card): INTERROGANDO lado+color; Lucide icons DELEGACIA/EM JUÍZO; termoDelegacia link priority"
```

---

### Task 6: TranscriptPlayer B3-B4 — custom bar + pin markers + 📌 button

**Files:**
- Modify: `src/components/agenda/sheet/transcript-player.tsx`

The goal: replace `<audio controls>` with a custom control bar (play/pause button + progress bar + time display). Overlay pin markers on the progress bar as colored dots. Add a 📌 button per transcript segment (visible on hover) that calls `onAddPino`. Add a pin list below the transcript.

- [ ] **Step 1: Update `TranscriptPlayer` props**

```typescript
import { Pino } from "@/lib/agenda/pino";
import { Pin, Play, Pause } from "lucide-react";

export function TranscriptPlayer({
  driveFileId,
  segments,
  transcricao,
  offsetS = 0,
  pinos = [],
  onAddPino,
  onRemovePino,
}: {
  driveFileId: string;
  segments: Segmento[];
  transcricao?: string | null;
  /** Seconds from audio start where this deponent's testimony begins */
  offsetS?: number;
  pinos?: Pino[];
  onAddPino?: (timestampS: number) => void;
  onRemovePino?: (pinoId: string) => void;
}) {
```

- [ ] **Step 2: Add play/pause state + duration state**

```typescript
const [playing, setPlaying] = useState(false);
const [currentTime, setCurrentTime] = useState(0);
const [duration, setDuration] = useState(0);
```

- [ ] **Step 3: REPLACE the existing `useEffect` (lines 33-43) with a unified one**

The file already has a `useEffect` that registers `timeupdate` and `seeked` (lines 33-43). **Delete it entirely** and write the single unified effect below. Do not add a second effect alongside — that would call `setAtivo` twice per `timeupdate` event.

```typescript
// DELETE lines 33-43 (existing timeupdate/seeked useEffect), REPLACE with:
useEffect(() => {
  const el = audioRef.current;
  if (!el) return;
  const onPlay  = () => setPlaying(true);
  const onPause = () => setPlaying(false);
  const onTime  = () => {
    setCurrentTime(el.currentTime);
    if (temSegmentos) setAtivo(segmentoAtivo(segments, el.currentTime));
  };
  const onMeta  = () => setDuration(el.duration);
  el.addEventListener("play",           onPlay);
  el.addEventListener("pause",          onPause);
  el.addEventListener("timeupdate",     onTime);
  el.addEventListener("seeked",         onTime);
  el.addEventListener("loadedmetadata", onMeta);
  return () => {
    el.removeEventListener("play",           onPlay);
    el.removeEventListener("pause",          onPause);
    el.removeEventListener("timeupdate",     onTime);
    el.removeEventListener("seeked",         onTime);
    el.removeEventListener("loadedmetadata", onMeta);
  };
}, [segments, temSegmentos]);
```

- [ ] **Step 4: Replace `<audio controls>` with custom bar**

```tsx
{/* Hidden audio element — no browser controls */}
<audio
  ref={audioRef}
  preload="metadata"
  src={src}
  className="hidden"
>
  Seu navegador não suporta áudio HTML5.
</audio>

{/* Custom control bar */}
<div className="flex items-center gap-2 rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 px-2 py-1.5">
  {/* Play/Pause button */}
  <button
    type="button"
    onClick={() => {
      const el = audioRef.current;
      if (!el) return;
      el.paused ? void el.play().catch(() => {}) : el.pause();
    }}
    className="shrink-0 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
    aria-label={playing ? "Pausar" : "Reproduzir"}
  >
    {playing
      ? <Pause className="h-3.5 w-3.5 text-emerald-600" />
      : <Play  className="h-3.5 w-3.5 text-neutral-500" />
    }
  </button>

  {/* Progress bar + pin markers */}
  <div className="relative flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full cursor-pointer"
    onClick={(e) => {
      const el = audioRef.current;
      if (!el || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      el.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
    }}
  >
    {/* Playback progress fill */}
    <div
      className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
      style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
    />
    {/* Pin markers */}
    {duration > 0 && pinos.map((p) => (
      <div
        key={p.id}
        title={p.nota ?? (p.fonte === "IA" ? "Pino IA" : "Pino defensor")}
        className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white dark:border-neutral-900 cursor-default"
        style={{
          left: `${(p.timestampS / duration) * 100}%`,
          backgroundColor: p.fonte === "IA" ? "#f59e0b" : "#10b981", // amber vs emerald
        }}
      />
    ))}
  </div>

  {/* Time display */}
  <span className="shrink-0 font-mono tabular-nums text-[10px] text-neutral-400">
    {formatDuracao(currentTime)}{duration ? ` / ${formatDuracao(duration)}` : ""}
  </span>
</div>
```

- [ ] **Step 5: Add 📌 button to each segment row**

In the segments map, add a pin button (visible on hover) after the text span:

```tsx
{segments.map((s, i) => (
  <button
    key={`${i}-${s.start}`}
    ...
    className={cn(
      "group w-full text-left flex gap-2 rounded-md px-2 py-1 text-[11px] leading-relaxed cursor-pointer transition-colors",
      ...
    )}
  >
    <span className="shrink-0 font-mono tabular-nums text-[10px] text-neutral-400 pt-0.5">
      {formatDuracao(s.start)}
    </span>
    <span className="min-w-0 flex-1">{s.text}</span>
    {onAddPino && (
      <span
        role="button"
        title="Fixar pino neste momento"
        onClick={(e) => {
          e.stopPropagation();
          onAddPino(offsetS + s.start);
        }}
        className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-opacity cursor-pointer"
      >
        <Pin className="h-2.5 w-2.5 text-neutral-400 hover:text-amber-500" />
      </span>
    )}
  </button>
))}
```

- [ ] **Step 6: Add pin list below transcript**

After the transcript/segments block, add:

```tsx
{pinos.length > 0 && (
  <div className="mt-2 space-y-1">
    <p className="text-[9px] font-semibold text-neutral-400 tracking-wide uppercase">Pinos</p>
    {pinos.map((p) => (
      <div key={p.id} className="flex items-center gap-1.5 text-[10px]">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: p.fonte === "IA" ? "#f59e0b" : "#10b981" }}
        />
        <span className="font-mono tabular-nums text-neutral-400">{formatDuracao(p.timestampS)}</span>
        {p.nota && <span className="text-neutral-600 dark:text-neutral-400 truncate">{p.nota}</span>}
        <span className="text-[9px] text-neutral-300 dark:text-neutral-600">({p.fonte})</span>
        {onRemovePino && (
          <button
            type="button"
            onClick={() => onRemovePino(p.id)}
            className="ml-auto text-[9px] text-neutral-400 hover:text-rose-500 cursor-pointer"
          >
            ×
          </button>
        )}
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 7: Wire `addPino` / `removePino` mutations in `depoente-card-v2.tsx`**

**Important context:** `audioDepoimento` (line 136) is currently `string | null` — just the file ID string. Do NOT change this variable; existing code at lines 238, 240, 269 depends on it as a string. Instead, add new variables alongside it to carry the extra fields:

```typescript
// ADD alongside the existing audioDepoimento declaration (line 136):
import { trpc } from "@/lib/trpc/client";  // add to existing imports if not already there

// Inside DepoenteCardV2, after the midia query:
const addPinoMutation = trpc.audiencias.addPino.useMutation();
const removePinoMutation = trpc.audiencias.removePino.useMutation();
// audioDepoimento stays as-is (string | null) — keep existing usages unchanged
const pinosDepoimento = (midia?.pinos ?? []) as import("@/lib/agenda/pino").Pino[];
const offsetDepoimento = midia?.depoimentoTimestampInicioS ?? 0;
```

Then update the `<TranscriptPlayer>` call in the `audioDepoimento` block (lines 238-265) to pass the new props. The existing `driveFileId={audioDepoimento}`, `segments`, `transcricao` props remain — add:

```tsx
// Add to the existing <TranscriptPlayer> call:
offsetS={offsetDepoimento}
pinos={pinosDepoimento}
onAddPino={(ts) => {
  if (!depoente.id) return;
  addPinoMutation.mutate({
    depoenteId: depoente.id,
    pino: {
      id: crypto.randomUUID(),   // native — no nanoid package needed
      timestampS: ts,
      fonte: "DEFENSOR",
    },
  });
}}
onRemovePino={(id) => {
  if (!depoente.id) return;
  removePinoMutation.mutate({ depoenteId: depoente.id, pinoId: id });
}}
```

- [ ] **Step 8: Typecheck + lint**

```bash
npm run typecheck && npm run lint
```

- [ ] **Step 9: Commit**

```bash
git add src/components/agenda/sheet/transcript-player.tsx \
        src/components/agenda/sheet/depoente-card-v2.tsx
git commit -m "feat(player): custom audio bar + pin markers + pino CRUD wired to tRPC"
```

---

## Final Verification

- [ ] `npm run typecheck` — exit 0
- [ ] `npm run lint` — exit 0
- [ ] `npx vitest run` — all tests pass (areas-mae, area-tabs, extrair-narrativa-fatos)
- [ ] Start dev server: `npm run dev` — open sheet for an AIJ audiência
  - Denúncia renders clean narrative paragraph
  - "Caso" tab visible (renamed from "Imputação")
  - "Intimações" tab appears between Caso and Depoimentos
  - SubtipoBanner not shown for AIJ (only appears for Júri Plenário)
  - Réu card appears in Depoimentos section with darker green bar
  - DELEGACIA / EM JUÍZO show Lucide icons (no emoji)
  - TranscriptPlayer shows play/pause button + progress bar
