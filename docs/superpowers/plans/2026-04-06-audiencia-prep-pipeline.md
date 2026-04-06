# Audiência Prep Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add audiência detection to the intimações import modal and a "Preparar Audiências" pipeline button for 10-day advance preparation.

**Architecture:** Two modules — (1) extends existing PJe import flow with new ato types, auto-detection, inline audiência form, and automatic event creation; (2) new modal accessible from Agenda and Dashboard that orchestrates a 5-step preparation pipeline per audiência (download → Drive → analysis → populate witnesses → verify intimation status). Pipeline runs sequentially on Mac Mini via Claude Code.

**Tech Stack:** Next.js 15, React 19, tRPC, Drizzle ORM, shadcn/ui, Tailwind CSS, Chrome CDP (PJe), Claude Code (Mac Mini)

---

## File Map

### Files to Modify

| File | Responsibility | Changes |
|------|---------------|---------|
| `src/config/atos-por-atribuicao.ts` | Ato types & priorities | Add 2 new atos to all atribuições + priority entries |
| `src/lib/ato-suggestion.ts` | Rule-based ato detection | Add audiência detection rules + data/hora extraction |
| `src/components/demandas-premium/pje-review-table.tsx` | Review table UI | Extend PjeReviewRow interface + render inline audiência form |
| `src/components/demandas-premium/pje-import-modal.tsx` | Import modal orchestration | Pass audiência data through import flow |
| `src/trpc/routers/demandas.ts` | Demanda import mutation | Create audiencia + calendarEvent when ato is audiência |
| `src/trpc/routers/audiencias.ts` | Audiência CRUD | Add `prepararAudiencias` + `statusPreparacao` endpoints |
| `src/app/(dashboard)/admin/agenda/page.tsx` | Agenda page | Add "Preparar Audiências" button + modal |
| `src/app/(dashboard)/admin/page.tsx` | Dashboard page | Add "Preparar Audiências" widget |

### Files to Create

| File | Responsibility |
|------|---------------|
| `src/components/demandas-premium/audiencia-inline-form.tsx` | Mini-form (data/hora/tipo) shown below review table row |
| `src/components/agenda/preparar-audiencias-modal.tsx` | Full modal: levantamento → progresso → resultado |
| `src/lib/preparar-audiencia-pipeline.ts` | Pipeline orchestrator (5 steps per audiência) |
| `src/lib/pje-movimentacoes-parser.ts` | Parse PJe movimentações HTML → detect witness intimation |
| `scripts/prepare-audiencia.mjs` | Mac Mini script: Claude Code analysis trigger |

---

## Task 1: Add New Ato Types

**Files:**
- Modify: `src/config/atos-por-atribuicao.ts`

- [ ] **Step 1: Add "Ciência designação de audiência" and "Ciência redesignação de audiência" to all atribuições**

In `src/config/atos-por-atribuicao.ts`, add the two new atos before "Outro" in every atribuição array. For each array in `ATOS_POR_ATRIBUICAO`, insert before the "Outro" entry:

```typescript
"Ciência designação de audiência",
"Ciência redesignação de audiência",
```

Arrays to modify (insert before "Outro" or "Outros" in each):
- "Tribunal do Júri" — before line 32 (`"Outro"`)
- "Violência Doméstica" — before line 68 (`"Outro"`)
- "Execução Penal" — before line 90 (`"Outro"`)
- "Substituição Criminal" — before line 118 (`"Outros"`)
- "Curadoria" — before line 147 (`"Outro"`)
- "Grupo Especial do Júri" — before line 181 (`"Outro"`)
- "Curadoria Especial" — before line 201 (`"Outro"`)
- "Criminal Geral" — before line 237 (`"Outro"`)

- [ ] **Step 2: Add priority entries for the new atos**

In the `ATO_PRIORITY` record, add after line 332 (`"Ciência LP": 92,`):

```typescript
"Ciência designação de audiência": 85,
"Ciência redesignação de audiência": 85,
```

Priority 85 places them between atos intermediários (50s) and ciências triviais (90s), reflecting that audiência scheduling requires action (agenda event) but is not a full substantive response.

- [ ] **Step 3: Verify build**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/config/atos-por-atribuicao.ts
git commit -m "feat: add ciência designação/redesignação de audiência atos to all atribuições"
```

---

## Task 2: Audiência Detection in Ato Suggestion

**Files:**
- Modify: `src/lib/ato-suggestion.ts`

- [ ] **Step 1: Add audiência detection helper and extraction functions**

At the top of the file (after the imports, line 6), add:

```typescript
// ============================================================================
// AUDIÊNCIA DETECTION
// ============================================================================

export interface AudienciaDetection {
  tipo: "designacao" | "redesignacao";
  data?: string;       // ISO date (YYYY-MM-DD)
  hora?: string;       // HH:MM
  tipoAudiencia?: string; // instrucao, conciliacao, etc.
}

const DESIGNACAO_PATTERNS = [
  /redesigna[çc][aã]o\s+(?:de\s+|da\s+)?audi[eê]ncia/i,
  /audi[eê]ncia\s+redesignada/i,
  /transferida\s+.*audi[eê]ncia/i,
  /adiada\s+.*audi[eê]ncia.*nova\s+data/i,
  /redesignou.*audi[eê]ncia/i,
] as const;

const DESIGNACAO_ONLY_PATTERNS = [
  /designa[çc][aã]o\s+(?:de\s+|da\s+)?audi[eê]ncia/i,
  /audi[eê]ncia\s+designada\s+para/i,
  /fica\s+designad[ao].*dia/i,
  /pauta.*audi[eê]ncia/i,
  /designou.*audi[eê]ncia/i,
] as const;

const DATE_PATTERNS = [
  /(\d{2})\/(\d{2})\/(\d{4})/,                              // dd/mm/yyyy
  /(\d{2})\s+de\s+(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})/i, // dd de mês de yyyy
];

const TIME_PATTERNS = [
  /(\d{1,2}):(\d{2})/,          // HH:MM
  /(\d{1,2})h(\d{2})/i,         // HHhMM
  /(\d{1,2})\s*horas?/i,        // HH horas
];

const MONTH_MAP: Record<string, string> = {
  janeiro: "01", fevereiro: "02", "março": "03", "marco": "03",
  abril: "04", maio: "05", junho: "06", julho: "07",
  agosto: "08", setembro: "09", outubro: "10", novembro: "11", dezembro: "12",
};

const TIPO_AUDIENCIA_PATTERNS: Array<[RegExp, string]> = [
  [/instru[çc][aã]o/i, "Instrução e Julgamento"],
  [/concilia[çc][aã]o/i, "Conciliação"],
  [/justifica[çc][aã]o/i, "Justificação"],
  [/cust[oó]dia/i, "Custódia"],
  [/admonit[oó]ria/i, "Admonitória"],
  [/j[uú]ri|plen[aá]rio/i, "Júri"],
];

function extractDate(text: string): string | undefined {
  // Try dd/mm/yyyy
  const m1 = text.match(DATE_PATTERNS[0]);
  if (m1) {
    const [, dd, mm, yyyy] = m1;
    return `${yyyy}-${mm}-${dd}`;
  }
  // Try dd de mês de yyyy
  const m2 = text.match(DATE_PATTERNS[1]);
  if (m2) {
    const [, dd, mes, yyyy] = m2;
    const mm = MONTH_MAP[mes.toLowerCase()];
    if (mm) return `${yyyy}-${mm}-${dd.padStart(2, "0")}`;
  }
  return undefined;
}

function extractTime(text: string): string | undefined {
  for (const pattern of TIME_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      const hh = m[1].padStart(2, "0");
      const mm = m[2] ? m[2].padStart(2, "0") : "00";
      return `${hh}:${mm}`;
    }
  }
  return undefined;
}

function extractTipoAudiencia(text: string): string | undefined {
  for (const [pattern, tipo] of TIPO_AUDIENCIA_PATTERNS) {
    if (pattern.test(text)) return tipo;
  }
  return undefined;
}

/**
 * Detects audiência designation/redesignation from intimação text.
 * Returns detection result with extracted date/time if found.
 */
export function detectAudiencia(texto: string): AudienciaDetection | null {
  // Check redesignação first (more specific)
  for (const pattern of DESIGNACAO_PATTERNS) {
    if (pattern.test(texto)) {
      return {
        tipo: "redesignacao",
        data: extractDate(texto),
        hora: extractTime(texto),
        tipoAudiencia: extractTipoAudiencia(texto),
      };
    }
  }
  // Then designação
  for (const pattern of DESIGNACAO_ONLY_PATTERNS) {
    if (pattern.test(texto)) {
      return {
        tipo: "designacao",
        data: extractDate(texto),
        hora: extractTime(texto),
        tipoAudiencia: extractTipoAudiencia(texto),
      };
    }
  }
  return null;
}
```

- [ ] **Step 2: Add audiência ato rules to ATO_RULES array**

In the `ATO_RULES` array, add new rules at the TOP (before line 32, after the array opening) since audiência detection should take priority when text matches:

```typescript
  // ── Audiência (detected from text content) ──
  // These rules are supplemented by detectAudiencia() for text-based detection.
  // They catch document-type patterns; the text-based detection runs separately.
  {
    tipoDocumento: /^Ato Ordinatório$/i,
    ato: "Ciência designação de audiência",
    confidence: "medium",
    reason: "Ato Ordinatório — verificar se designação de audiência",
  },
```

- [ ] **Step 3: Export `detectAudiencia` and add enhanced `suggestAtoWithText` function**

At the bottom of the file (after `suggestAto` function), add:

```typescript
/**
 * Enhanced ato suggestion that also checks intimação text for audiência patterns.
 * Falls back to standard suggestAto if no audiência detected.
 */
export function suggestAtoWithText(
  tipoDocumento?: string,
  tipoProcesso?: string,
  atribuicao?: string,
  textoIntimacao?: string
): AtoSuggestion & { audienciaDetection?: AudienciaDetection } {
  // Try text-based audiência detection first
  if (textoIntimacao) {
    const detection = detectAudiencia(textoIntimacao);
    if (detection) {
      const ato = detection.tipo === "redesignacao"
        ? "Ciência redesignação de audiência"
        : "Ciência designação de audiência";
      const hasDateTime = !!(detection.data && detection.hora);
      return {
        ato,
        confidence: hasDateTime ? "high" : "medium",
        reason: detection.tipo === "redesignacao"
          ? "Redesignação de audiência detectada no texto"
          : "Designação de audiência detectada no texto",
        audienciaDetection: detection,
      };
    }
  }

  // Fallback to standard rule-based suggestion
  return suggestAto(tipoDocumento, tipoProcesso, atribuicao);
}
```

- [ ] **Step 4: Verify build**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/ato-suggestion.ts
git commit -m "feat: add audiência detection with date/time extraction to ato suggestion"
```

---

## Task 3: Audiência Inline Form Component

**Files:**
- Create: `src/components/demandas-premium/audiencia-inline-form.tsx`

- [ ] **Step 1: Create the inline form component**

```typescript
"use client";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock } from "lucide-react";

const TIPOS_AUDIENCIA = [
  "Instrução e Julgamento",
  "Conciliação",
  "Justificação",
  "Custódia",
  "Admonitória",
  "Júri",
  "Outro",
] as const;

interface AudienciaInlineFormProps {
  data: string;           // YYYY-MM-DD or empty
  hora: string;           // HH:MM or empty
  tipo: string;           // tipo audiência or empty
  criarEvento: boolean;
  onChange: (fields: {
    data?: string;
    hora?: string;
    tipo?: string;
    criarEvento?: boolean;
  }) => void;
}

export function AudienciaInlineForm({
  data,
  hora,
  tipo,
  criarEvento,
  onChange,
}: AudienciaInlineFormProps) {
  // Convert YYYY-MM-DD to date input value
  const dateValue = data || "";
  const timeValue = hora || "";

  return (
    <div className="flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2">
      <Calendar className="h-4 w-4 shrink-0 text-emerald-600" />
      <span className="text-xs font-medium text-emerald-700">Audiência</span>

      <div className="flex items-center gap-1.5">
        <Label htmlFor="aud-data" className="text-xs text-zinc-500">
          Data:
        </Label>
        <Input
          id="aud-data"
          type="date"
          value={dateValue}
          onChange={(e) => onChange({ data: e.target.value })}
          className="h-7 w-36 text-xs"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-zinc-400" />
        <Input
          type="time"
          value={timeValue}
          onChange={(e) => onChange({ hora: e.target.value })}
          className="h-7 w-24 text-xs"
        />
      </div>

      <Select
        value={tipo || undefined}
        onValueChange={(v) => onChange({ tipo: v })}
      >
        <SelectTrigger className="h-7 w-48 text-xs">
          <SelectValue placeholder="Tipo de audiência" />
        </SelectTrigger>
        <SelectContent>
          {TIPOS_AUDIENCIA.map((t) => (
            <SelectItem key={t} value={t} className="text-xs">
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1.5">
        <Checkbox
          id="aud-criar"
          checked={criarEvento}
          onCheckedChange={(checked) =>
            onChange({ criarEvento: checked === true })
          }
        />
        <Label htmlFor="aud-criar" className="text-xs text-zinc-500">
          Criar evento na agenda
        </Label>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/demandas-premium/audiencia-inline-form.tsx
git commit -m "feat: create AudienciaInlineForm component for review table"
```

---

## Task 4: Extend Review Table with Audiência Fields

**Files:**
- Modify: `src/components/demandas-premium/pje-review-table.tsx`

- [ ] **Step 1: Extend PjeReviewRow interface**

In `pje-review-table.tsx`, add audiência fields to the `PjeReviewRow` interface (after line 48, `providencias?: string;`):

```typescript
  // Audiência fields (when ato = ciência designação/redesignação)
  audienciaData?: string;      // YYYY-MM-DD
  audienciaHora?: string;      // HH:MM
  audienciaTipo?: string;      // tipo da audiência
  criarEventoAgenda?: boolean; // default true
```

- [ ] **Step 2: Add import for AudienciaInlineForm**

Add at the top imports section (after line 6):

```typescript
import { AudienciaInlineForm } from "./audiencia-inline-form";
```

- [ ] **Step 3: Add audiência ato detection helper**

After the interface definitions (around line 60), add:

```typescript
const AUDIENCIA_ATOS = [
  "Ciência designação de audiência",
  "Ciência redesignação de audiência",
] as const;

function isAudienciaAto(ato: string): boolean {
  return AUDIENCIA_ATOS.some(a => a === ato);
}
```

- [ ] **Step 4: Render AudienciaInlineForm below expanded rows**

Find the expanded providências row rendering (around lines 742-776). After the providências `<textarea>` block (closing `</td></tr>` of the expanded row), add a second expandable section for audiência data.

The pattern is: when a row's ato is an audiência ato, show the AudienciaInlineForm below the row, in a similar full-colspan `<tr>` as providências. This should be ALWAYS visible (not collapsed) when the ato is audiência-related:

```typescript
{isAudienciaAto(row.ato) && (
  <tr className="border-b border-emerald-100">
    <td colSpan={99} className="px-4 py-2">
      <AudienciaInlineForm
        data={row.audienciaData || ""}
        hora={row.audienciaHora || ""}
        tipo={row.audienciaTipo || ""}
        criarEvento={row.criarEventoAgenda ?? true}
        onChange={(fields) => {
          const newRows = [...rows];
          const r = { ...newRows[index] };
          if (fields.data !== undefined) r.audienciaData = fields.data;
          if (fields.hora !== undefined) r.audienciaHora = fields.hora;
          if (fields.tipo !== undefined) r.audienciaTipo = fields.tipo;
          if (fields.criarEvento !== undefined) r.criarEventoAgenda = fields.criarEvento;
          newRows[index] = r;
          onRowsChange(newRows);
        }}
      />
    </td>
  </tr>
)}
```

Insert this after each row's `</tr>` (after the providências expanded row), using the same `index` variable from the `.map()` iterator.

- [ ] **Step 5: Auto-set audiência defaults when ato changes to audiência type**

In the ato change handler (around line 189-200, `onAtoChange`), add logic to set default audiência fields:

After the prazo recalculation, add:

```typescript
// Set defaults when switching to audiência ato
if (isAudienciaAto(newAto) && !r.criarEventoAgenda) {
  r.criarEventoAgenda = true;
}
```

- [ ] **Step 6: Verify build**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/demandas-premium/pje-review-table.tsx
git commit -m "feat: render audiência inline form in review table for audiência atos"
```

---

## Task 5: Wire Audiência Data Through Import Flow

**Files:**
- Modify: `src/components/demandas-premium/pje-import-modal.tsx`
- Modify: `src/trpc/routers/demandas.ts`

- [ ] **Step 1: Pass audiência fields through import modal**

In `pje-import-modal.tsx`, where `reviewRows` are mapped to demanda objects for import (around lines 403-417), extend the mapped object to include audiência data:

```typescript
// Add to the mapped object alongside existing fields (ato, status, prazo, etc.)
audienciaData: row.audienciaData,
audienciaHora: row.audienciaHora,
audienciaTipo: row.audienciaTipo,
criarEventoAgenda: row.criarEventoAgenda,
```

- [ ] **Step 2: Use `suggestAtoWithText` for initial row population**

In the modal, where rows are initially populated from parsed intimações (where `suggestAto` is called), replace with `suggestAtoWithText` to also check text content. Import the new function and pass the intimação snippet text if available.

Where `suggestAto(tipoDocumento, tipoProcesso, atribuicao)` is called, replace with:

```typescript
import { suggestAtoWithText } from "@/lib/ato-suggestion";

// In the row building logic:
const suggestion = suggestAtoWithText(
  intimacao.tipoDocumento,
  intimacao.tipoProcesso,
  atribuicao,
  intimacao.textoCompleto // or snippet text if available
);

// Set audiência fields if detected
const row: PjeReviewRow = {
  ...existingFields,
  ato: suggestion.ato,
  atoConfidence: suggestion.confidence,
  // Audiência auto-fill
  audienciaData: suggestion.audienciaDetection?.data,
  audienciaHora: suggestion.audienciaDetection?.hora,
  audienciaTipo: suggestion.audienciaDetection?.tipoAudiencia,
  criarEventoAgenda: suggestion.audienciaDetection ? true : undefined,
};
```

- [ ] **Step 3: Extend import input schema in demandas router**

In `src/trpc/routers/demandas.ts`, in the `importFromSheets` mutation input schema (around line 687-724), add to the row schema:

```typescript
audienciaData: z.string().optional(),
audienciaHora: z.string().optional(),
audienciaTipo: z.string().optional(),
criarEventoAgenda: z.boolean().optional(),
```

- [ ] **Step 4: Create audiencia + calendarEvent when importing audiência atos**

In `src/trpc/routers/demandas.ts`, after the demanda is inserted (around lines 1067-1093), add post-insert logic:

```typescript
// After inserting the demanda, check if it's an audiência ato that needs event creation
const isAudienciaAto = row.ato === "Ciência designação de audiência" ||
  row.ato === "Ciência redesignação de audiência";

if (isAudienciaAto && row.criarEventoAgenda && row.audienciaData) {
  // Build datetime
  const dataStr = row.audienciaData;
  const horaStr = row.audienciaHora || "09:00";
  const dataAudiencia = new Date(`${dataStr}T${horaStr}:00`);
  
  const tipoAud = row.audienciaTipo || "Instrução e Julgamento";
  const titulo = `${tipoAud} — ${row.assistido}`;

  // Create audiencia record
  const [audienciaRecord] = await ctx.db
    .insert(audiencias)
    .values({
      processoId: processoRecord.id,
      assistidoId: assistidoRecord.id,
      dataAudiencia,
      tipo: tipoAud.toLowerCase().replace(/ e /g, "_").replace(/ /g, "_"),
      titulo,
      status: "agendada",
      workspaceId: ctx.workspaceId,
    })
    .returning({ id: audiencias.id });

  // Create calendar event
  await ctx.db.insert(calendarEvents).values({
    title: titulo,
    eventDate: dataAudiencia,
    eventType: "audiencia",
    processoId: processoRecord.id,
    assistidoId: assistidoRecord.id,
    demandaId: insertedDemanda.id,
    priority: "high",
    isAllDay: false,
    workspaceId: ctx.workspaceId,
  });
}
```

Add necessary imports at the top of the router file:
```typescript
import { audiencias } from "@/lib/db/schema/agenda";
import { calendarEvents } from "@/lib/db/schema/agenda";
```

- [ ] **Step 5: Verify build**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/demandas-premium/pje-import-modal.tsx src/trpc/routers/demandas.ts
git commit -m "feat: create audiencia + calendar event when importing audiência intimações"
```

---

## Task 6: Status de Preparação Endpoint

**Files:**
- Modify: `src/trpc/routers/audiencias.ts`

- [ ] **Step 1: Add `statusPreparacao` query endpoint**

In `src/trpc/routers/audiencias.ts`, add a new query endpoint that returns audiências in the next N days with preparation status:

```typescript
statusPreparacao: protectedProcedure
  .input(
    z.object({
      diasAntecedencia: z.number().default(10),
    })
  )
  .query(async ({ ctx, input }) => {
    const hoje = new Date();
    const limite = new Date();
    limite.setDate(hoje.getDate() + input.diasAntecedencia);

    // Fetch audiências in range
    const proximasAudiencias = await ctx.db
      .select({
        id: audiencias.id,
        processoId: audiencias.processoId,
        assistidoId: audiencias.assistidoId,
        dataAudiencia: audiencias.dataAudiencia,
        tipo: audiencias.tipo,
        titulo: audiencias.titulo,
        status: audiencias.status,
      })
      .from(audiencias)
      .where(
        and(
          gte(audiencias.dataAudiencia, hoje),
          lte(audiencias.dataAudiencia, limite),
          eq(audiencias.status, "agendada"),
          eq(audiencias.workspaceId, ctx.workspaceId),
        )
      )
      .orderBy(asc(audiencias.dataAudiencia));

    // For each, check preparation status
    const result = await Promise.all(
      proximasAudiencias.map(async (aud) => {
        // Check if processo has analysisData
        const processo = aud.processoId
          ? await ctx.db
              .select({
                id: processos.id,
                analysisData: processos.analysisData,
                analysisStatus: processos.analysisStatus,
              })
              .from(processos)
              .where(eq(processos.id, aud.processoId))
              .limit(1)
              .then((r) => r[0])
          : null;

        // Check if there are testemunhas linked
        const testemunhasCount = aud.id
          ? await ctx.db
              .select({ count: sql<number>`count(*)` })
              .from(testemunhas)
              .where(eq(testemunhas.audienciaId, aud.id))
              .then((r) => Number(r[0]?.count ?? 0))
          : 0;

        // Check testemunhas not intimated
        const naoIntimadas = aud.id
          ? await ctx.db
              .select({ count: sql<number>`count(*)` })
              .from(testemunhas)
              .where(
                and(
                  eq(testemunhas.audienciaId, aud.id),
                  inArray(testemunhas.status, ["ARROLADA", "NAO_LOCALIZADA"]),
                )
              )
              .then((r) => Number(r[0]?.count ?? 0))
          : 0;

        // Get assistido name
        const assistido = aud.assistidoId
          ? await ctx.db
              .select({ nome: assistidos.nome })
              .from(assistidos)
              .where(eq(assistidos.id, aud.assistidoId))
              .limit(1)
              .then((r) => r[0]?.nome ?? "Desconhecido")
          : "Desconhecido";

        const hasAnalysis = processo?.analysisStatus === "completed";
        const hasWitnesses = testemunhasCount > 0;

        let statusPrep: "completo" | "parcial" | "pendente";
        if (hasAnalysis && hasWitnesses && naoIntimadas === 0) {
          statusPrep = "completo";
        } else if (hasAnalysis || hasWitnesses) {
          statusPrep = "parcial";
        } else {
          statusPrep = "pendente";
        }

        return {
          id: aud.id,
          processoId: aud.processoId,
          assistidoNome: assistido,
          dataAudiencia: aud.dataAudiencia,
          tipo: aud.tipo,
          titulo: aud.titulo,
          statusPrep,
          hasAnalysis,
          testemunhasCount,
          naoIntimadas,
        };
      })
    );

    return result;
  }),
```

Add necessary imports at the top of the file (if not already present):
```typescript
import { and, asc, eq, gte, lte, inArray, sql } from "drizzle-orm";
import { processos, assistidos } from "@/lib/db/schema/core";
import { audiencias, testemunhas } from "@/lib/db/schema/agenda";
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/trpc/routers/audiencias.ts
git commit -m "feat: add statusPreparacao endpoint for audiência preparation tracking"
```

---

## Task 7: PJe Movimentações Parser

**Files:**
- Create: `src/lib/pje-movimentacoes-parser.ts`

- [ ] **Step 1: Create the movimentações parser module**

```typescript
/**
 * Parser for PJe movimentações (case movements).
 * Extracts witness intimation status from case timeline.
 */

export interface MovimentacaoPJe {
  data: string;       // YYYY-MM-DD
  descricao: string;  // Full movement description
}

export interface IntimacaoTestemunha {
  testemunhaNome?: string;
  status: "INTIMADA" | "NAO_LOCALIZADA" | "CARTA_PRECATORIA";
  movimentacao: string;  // Original movement text
  data: string;          // Date of the movement
}

const INTIMACAO_PATTERNS: Array<{
  pattern: RegExp;
  status: IntimacaoTestemunha["status"];
}> = [
  // Mandado cumprido = INTIMADA
  {
    pattern: /mandado\s+de\s+intima[çc][aã]o.*cumprido/i,
    status: "INTIMADA",
  },
  {
    pattern: /certid[aã]o\s+de\s+intima[çc][aã]o.*testemunha/i,
    status: "INTIMADA",
  },
  {
    pattern: /intima[çc][aã]o.*testemunha.*realizada/i,
    status: "INTIMADA",
  },
  {
    pattern: /testemunha.*devidamente\s+intimad[ao]/i,
    status: "INTIMADA",
  },
  {
    pattern: /intima[çc][aã]o\s+(?:da|do)\s+(?:testemunha|depoente).*(?:cumprida|realizada|efetivada)/i,
    status: "INTIMADA",
  },

  // Mandado devolvido / não localizado = NAO_LOCALIZADA
  {
    pattern: /mandado.*devolvido/i,
    status: "NAO_LOCALIZADA",
  },
  {
    pattern: /n[aã]o\s+localizad[ao]/i,
    status: "NAO_LOCALIZADA",
  },
  {
    pattern: /intima[çc][aã]o.*n[aã]o.*cumprida/i,
    status: "NAO_LOCALIZADA",
  },
  {
    pattern: /testemunha.*n[aã]o.*encontrad[ao]/i,
    status: "NAO_LOCALIZADA",
  },

  // Carta precatória
  {
    pattern: /carta\s+precat[oó]ria.*intima[çc][aã]o/i,
    status: "CARTA_PRECATORIA",
  },
  {
    pattern: /deprecada.*intima[çc][aã]o/i,
    status: "CARTA_PRECATORIA",
  },
];

// Try to extract witness name from movement text
const NOME_TESTEMUNHA_PATTERNS = [
  /testemunha\s+([A-Z][A-ZÀ-Ú\s]+?)(?:\s*,|\s*\.|$)/i,
  /intima[çc][aã]o\s+(?:de|da|do)\s+([A-Z][A-ZÀ-Ú\s]+?)(?:\s*,|\s*\.|$)/i,
  /depoente\s+([A-Z][A-ZÀ-Ú\s]+?)(?:\s*,|\s*\.|$)/i,
];

function extractTestemunhaNome(texto: string): string | undefined {
  for (const pattern of NOME_TESTEMUNHA_PATTERNS) {
    const m = texto.match(pattern);
    if (m) {
      const nome = m[1].trim();
      // Filter out common false positives
      if (nome.length > 3 && !nome.match(/^(DA|DE|DO|DAS|DOS|EM|NO|NA)$/i)) {
        return nome;
      }
    }
  }
  return undefined;
}

/**
 * Parse raw movimentações text (HTML or plain text) into structured entries.
 * Expects entries separated by newlines, with date prefix (dd/mm/yyyy).
 */
export function parseMovimentacoes(texto: string): MovimentacaoPJe[] {
  const lines = texto.split(/\n/).filter((l) => l.trim());
  const result: MovimentacaoPJe[] = [];
  const dateRegex = /(\d{2})\/(\d{2})\/(\d{4})/;

  for (const line of lines) {
    const m = line.match(dateRegex);
    if (m) {
      const [, dd, mm, yyyy] = m;
      result.push({
        data: `${yyyy}-${mm}-${dd}`,
        descricao: line.replace(dateRegex, "").trim(),
      });
    }
  }

  return result;
}

/**
 * Detect witness intimation status from a list of movimentações.
 * Returns one entry per detected witness intimation event.
 */
export function detectarIntimacaoTestemunha(
  movimentacoes: MovimentacaoPJe[]
): IntimacaoTestemunha[] {
  const results: IntimacaoTestemunha[] = [];

  for (const mov of movimentacoes) {
    for (const { pattern, status } of INTIMACAO_PATTERNS) {
      if (pattern.test(mov.descricao)) {
        results.push({
          testemunhaNome: extractTestemunhaNome(mov.descricao),
          status,
          movimentacao: mov.descricao,
          data: mov.data,
        });
        break; // One match per movimentação
      }
    }
  }

  return results;
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/pje-movimentacoes-parser.ts
git commit -m "feat: create PJe movimentações parser for witness intimation detection"
```

---

## Task 8: Pipeline Orchestrator

**Files:**
- Create: `src/lib/preparar-audiencia-pipeline.ts`

- [ ] **Step 1: Create the pipeline orchestrator**

This module defines the 5-step pipeline and provides a function to execute preparation for a single audiência. The actual execution will be triggered from the tRPC endpoint.

```typescript
/**
 * Pipeline de preparação de audiências.
 * 5 etapas sequenciais por audiência:
 * 1. Download autos do PJe (CDP)
 * 2. Upload para Google Drive
 * 3. Análise via Claude Code (Mac Mini)
 * 4. Popular testemunhas
 * 5. Verificar intimação dos depoentes
 */

export type PipelineStep =
  | "download_pje"
  | "upload_drive"
  | "analise_claude"
  | "popular_testemunhas"
  | "verificar_intimacao";

export interface PipelineProgress {
  audienciaId: number;
  assistidoNome: string;
  currentStep: PipelineStep;
  stepIndex: number;    // 0-4
  totalSteps: 5;
  status: "running" | "completed" | "error";
  error?: string;
  testemunhasCount?: number;
  naoIntimadas?: number;
}

export interface PipelineResult {
  audienciaId: number;
  assistidoNome: string;
  success: boolean;
  error?: string;
  testemunhas: Array<{
    nome: string;
    tipo: string;
    status: string;
  }>;
  naoIntimadas: Array<{
    nome: string;
    status: string;
    movimentacao?: string;
  }>;
}

export const PIPELINE_STEPS: Array<{
  key: PipelineStep;
  label: string;
}> = [
  { key: "download_pje", label: "Baixando autos do PJe" },
  { key: "upload_drive", label: "Enviando para o Drive" },
  { key: "analise_claude", label: "Analisando com Claude Code" },
  { key: "popular_testemunhas", label: "Identificando testemunhas" },
  { key: "verificar_intimacao", label: "Verificando intimação" },
];

/**
 * Check which steps are already completed for a given audiência.
 * Returns the first step that needs to be executed.
 */
export function getNextStep(status: {
  hasAutos: boolean;
  hasDriveFiles: boolean;
  hasAnalysis: boolean;
  hasTestemunhas: boolean;
  hasIntimacaoCheck: boolean;
}): PipelineStep | null {
  if (!status.hasAutos) return "download_pje";
  if (!status.hasDriveFiles) return "upload_drive";
  if (!status.hasAnalysis) return "analise_claude";
  if (!status.hasTestemunhas) return "popular_testemunhas";
  if (!status.hasIntimacaoCheck) return "verificar_intimacao";
  return null; // All steps completed
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/preparar-audiencia-pipeline.ts
git commit -m "feat: create audiência preparation pipeline orchestrator types"
```

---

## Task 9: Preparar Audiências Modal

**Files:**
- Create: `src/components/agenda/preparar-audiencias-modal.tsx`

- [ ] **Step 1: Create the modal component**

This is the main UI for the preparation pipeline. It has 3 phases: levantamento (survey), progresso (progress), resultado (result).

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  Pause,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PIPELINE_STEPS } from "@/lib/preparar-audiencia-pipeline";
import type { PipelineResult } from "@/lib/preparar-audiencia-pipeline";
import { cn } from "@/lib/utils";

type Phase = "levantamento" | "progresso" | "resultado";

interface AudienciaPrep {
  id: number;
  processoId: number | null;
  assistidoNome: string;
  dataAudiencia: Date | string;
  tipo: string | null;
  statusPrep: "completo" | "parcial" | "pendente";
  hasAnalysis: boolean;
  testemunhasCount: number;
  naoIntimadas: number;
}

export function PrepararAudienciasModal() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("levantamento");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState<PipelineResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const { data: audiencias, isLoading } =
    trpc.audiencias.statusPreparacao.useQuery(
      { diasAntecedencia: 10 },
      { enabled: open }
    );

  const pendentes =
    audiencias?.filter((a) => a.statusPrep !== "completo") ?? [];
  const totalPendentes = pendentes.length;

  const formatDate = (d: Date | string) => {
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}h`;
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "completo":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "parcial":
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "completo":
        return "Completo";
      case "parcial":
        return "Parcial";
      default:
        return "Pendente";
    }
  };

  // TODO: Wire to actual pipeline execution via tRPC mutation
  const handlePrepararTodos = () => {
    setPhase("progresso");
    setIsRunning(true);
    setCurrentIndex(0);
    setCurrentStep(0);
    // Pipeline execution will be wired in Task 11
  };

  const handleClose = () => {
    if (!isRunning) {
      setOpen(false);
      setPhase("levantamento");
      setResults([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          <Target className="h-4 w-4" />
          Preparar Audiências
          {audiencias && totalPendentes > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 bg-emerald-100 text-emerald-700"
            >
              {totalPendentes}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-600" />
            {phase === "levantamento" && "Preparar Audiências — Próximos 10 dias"}
            {phase === "progresso" && "Preparando Audiências..."}
            {phase === "resultado" && "Preparação Concluída"}
          </DialogTitle>
        </DialogHeader>

        {/* PHASE: LEVANTAMENTO */}
        {phase === "levantamento" && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              </div>
            ) : !audiencias || audiencias.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">
                Nenhuma audiência nos próximos 10 dias.
              </p>
            ) : (
              <>
                <p className="text-sm text-zinc-600">
                  {audiencias.length} audiência{audiencias.length !== 1 ? "s" : ""}{" "}
                  encontrada{audiencias.length !== 1 ? "s" : ""}
                </p>

                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b text-left text-xs text-zinc-500">
                        <th className="pb-2 pr-2">#</th>
                        <th className="pb-2 pr-2">Assistido</th>
                        <th className="pb-2 pr-2">Data</th>
                        <th className="pb-2 pr-2">Tipo</th>
                        <th className="pb-2">Status Prep</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audiencias.map((aud, i) => (
                        <tr key={aud.id} className="border-b last:border-0">
                          <td className="py-2 pr-2 text-zinc-400">{i + 1}</td>
                          <td className="py-2 pr-2 font-medium">
                            {aud.assistidoNome}
                          </td>
                          <td className="py-2 pr-2 text-zinc-600">
                            {formatDate(aud.dataAudiencia)}
                          </td>
                          <td className="py-2 pr-2 text-zinc-600 capitalize">
                            {aud.tipo || "—"}
                          </td>
                          <td className="py-2">
                            <div className="flex items-center gap-1.5">
                              {statusIcon(aud.statusPrep)}
                              <span
                                className={cn(
                                  "text-xs",
                                  aud.statusPrep === "completo" && "text-emerald-600",
                                  aud.statusPrep === "parcial" && "text-amber-600",
                                  aud.statusPrep === "pendente" && "text-red-600"
                                )}
                              >
                                {statusLabel(aud.statusPrep)}
                              </span>
                              {aud.naoIntimadas > 0 && (
                                <Badge
                                  variant="outline"
                                  className="ml-1 border-amber-200 text-amber-600 text-[10px]"
                                >
                                  {aud.naoIntimadas} sem intimação
                                </Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPendentes > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3">
                    <p className="text-xs text-amber-700">
                      Requer sessão PJe ativa no Chrome
                    </p>
                    <Button
                      onClick={handlePrepararTodos}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Target className="h-4 w-4" />
                      Preparar {totalPendentes} Pendente{totalPendentes !== 1 ? "s" : ""}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* PHASE: PROGRESSO */}
        {phase === "progresso" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-600">
                  Processo {currentIndex + 1}/{totalPendentes}:{" "}
                  <span className="font-medium">
                    {pendentes[currentIndex]?.assistidoNome}
                  </span>
                </span>
                <span className="text-xs text-zinc-400">
                  Etapa {currentStep + 1}/5
                </span>
              </div>
              <Progress
                value={((currentStep + 1) / 5) * 100}
                className="h-2"
              />
              <p className="text-xs text-zinc-500">
                {PIPELINE_STEPS[currentStep]?.label}
              </p>
            </div>

            <div className="space-y-1">
              {pendentes.map((aud, i) => (
                <div
                  key={aud.id}
                  className={cn(
                    "flex items-center gap-2 rounded px-3 py-1.5 text-sm",
                    i < currentIndex && "text-emerald-600",
                    i === currentIndex && "bg-emerald-50 font-medium",
                    i > currentIndex && "text-zinc-400"
                  )}
                >
                  {i < currentIndex && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                  {i === currentIndex && (
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  )}
                  {i > currentIndex && (
                    <Clock className="h-4 w-4 text-zinc-300" />
                  )}
                  {aud.assistidoNome}
                  {i < currentIndex && results[i] && (
                    <span className="ml-auto text-xs text-zinc-400">
                      {results[i].testemunhas.length} testemunhas
                      {results[i].naoIntimadas.length > 0 && (
                        <span className="text-amber-500">
                          , {results[i].naoIntimadas.length} sem intimação
                        </span>
                      )}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRunning(false)}
                disabled={!isRunning}
              >
                <Pause className="mr-1 h-3 w-3" />
                Pausar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsRunning(false);
                  setPhase("resultado");
                }}
              >
                <X className="mr-1 h-3 w-3" />
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* PHASE: RESULTADO */}
        {phase === "resultado" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span>
                {results.length} audiência{results.length !== 1 ? "s" : ""}{" "}
                preparada{results.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Alert: testemunhas não intimadas */}
            {results.some((r) => r.naoIntimadas.length > 0) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Testemunhas NÃO intimadas:
                </p>
                {results
                  .filter((r) => r.naoIntimadas.length > 0)
                  .flatMap((r) =>
                    r.naoIntimadas.map((t) => ({
                      ...t,
                      assistido: r.assistidoNome,
                    }))
                  )
                  .map((t, i) => (
                    <div key={i} className="text-xs text-amber-700 pl-6">
                      <span className="font-medium">{t.nome}</span>
                      {" — "}
                      {t.assistido}
                      <br />
                      <span className="text-amber-600">
                        Status: {t.status}
                        {t.movimentacao && ` — ${t.movimentacao}`}
                      </span>
                    </div>
                  ))}
                <p className="text-xs text-amber-600 pl-6 pt-1 italic">
                  Providência sugerida: requerer intimação urgente
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleClose}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/agenda/preparar-audiencias-modal.tsx
git commit -m "feat: create PrepararAudienciasModal with 3-phase UI (levantamento/progresso/resultado)"
```

---

## Task 10: Add Button to Agenda Page and Dashboard

**Files:**
- Modify: `src/app/(dashboard)/admin/agenda/page.tsx`
- Modify: `src/app/(dashboard)/admin/page.tsx`

- [ ] **Step 1: Add PrepararAudienciasModal to Agenda page**

In `src/app/(dashboard)/admin/agenda/page.tsx`:

Add import after line 30 (after the `ICalImportModal` import):

```typescript
import { PrepararAudienciasModal } from "@/components/agenda/preparar-audiencias-modal";
```

Then find the toolbar area where `PJeAgendaImportModal` is rendered and add `<PrepararAudienciasModal />` next to it. Look for where the import modals are declared in the JSX and add:

```typescript
<PrepararAudienciasModal />
```

Adjacent to the existing `<PJeAgendaImportModal />` component in the toolbar.

- [ ] **Step 2: Add PrepararAudienciasModal to Dashboard**

In `src/app/(dashboard)/admin/page.tsx`:

Add import:

```typescript
import { PrepararAudienciasModal } from "@/components/agenda/preparar-audiencias-modal";
```

Find the KPI cards or action area at the top of the dashboard and add the modal button. Place it near existing action buttons.

- [ ] **Step 3: Verify build**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/app/(dashboard)/admin/agenda/page.tsx src/app/(dashboard)/admin/page.tsx
git commit -m "feat: add Preparar Audiências button to Agenda page and Dashboard"
```

---

## Task 11: Mac Mini Preparation Script

**Files:**
- Create: `scripts/prepare-audiencia.mjs`

- [ ] **Step 1: Create the Mac Mini preparation script**

This script is called via SSH from the pipeline and uses Claude Code to analyze a processo.

```javascript
#!/usr/bin/env node

/**
 * prepare-audiencia.mjs
 * 
 * Called from the Defender app to trigger Claude Code analysis on Mac Mini.
 * Usage: node scripts/prepare-audiencia.mjs --processoId=123 --assistidoId=456
 * 
 * Reads autos from Google Drive, runs Claude Code analysis,
 * writes results directly to Supabase via MCP.
 */

import { parseArgs } from "node:util";
import { execSync } from "node:child_process";

const { values } = parseArgs({
  options: {
    processoId: { type: "string" },
    assistidoId: { type: "string" },
    dryRun: { type: "boolean", default: false },
  },
});

if (!values.processoId || !values.assistidoId) {
  console.error("Usage: node prepare-audiencia.mjs --processoId=ID --assistidoId=ID");
  process.exit(1);
}

const processoId = values.processoId;
const assistidoId = values.assistidoId;

console.log(`[prepare-audiencia] Starting analysis for processo=${processoId}, assistido=${assistidoId}`);

// Build Claude Code prompt
const prompt = `
Analise o processo ID ${processoId} do assistido ID ${assistidoId}.

1. Busque os arquivos do processo no Google Drive usando MCP
2. Leia todos os documentos disponíveis
3. Gere o analysisData completo seguindo o schema ProcessoAnalysisData
4. Foque especialmente em:
   - depoimentos (todos os depoentes com suas fases, contradições, credibilidade)
   - audiências realizadas e futuras
   - testemunhas arroladas e seus papéis
5. Grave o resultado diretamente no Supabase:
   - UPDATE processos SET analysis_data = '{...}', analysis_status = 'completed' WHERE id = ${processoId}
   - UPDATE casos SET analysis_data = '{...}', analysis_status = 'completed' WHERE assistido_id = ${assistidoId}
`.trim();

if (values.dryRun) {
  console.log("[prepare-audiencia] DRY RUN — prompt:");
  console.log(prompt);
  process.exit(0);
}

try {
  // Execute Claude Code with the analysis prompt
  const result = execSync(
    `claude -p "${prompt.replace(/"/g, '\\"')}"`,
    {
      cwd: process.cwd(),
      timeout: 600_000, // 10 min max
      stdio: ["pipe", "pipe", "pipe"],
      encoding: "utf-8",
    }
  );
  console.log("[prepare-audiencia] Claude Code output:");
  console.log(result);
  console.log("[prepare-audiencia] Analysis completed successfully");
} catch (error) {
  console.error("[prepare-audiencia] Analysis failed:", error.message);
  process.exit(1);
}
```

- [ ] **Step 2: Make executable**

Run: `chmod +x /Users/rodrigorochameire/Projetos/Defender/scripts/prepare-audiencia.mjs`

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add scripts/prepare-audiencia.mjs
git commit -m "feat: add Mac Mini preparation script for Claude Code analysis"
```

---

## Task 12: Wire Pipeline Execution to tRPC

**Files:**
- Modify: `src/trpc/routers/audiencias.ts`

- [ ] **Step 1: Add `prepararAudiencia` mutation endpoint**

This endpoint orchestrates a single audiência preparation. The frontend calls it once per audiência, sequentially.

Add to the audiencias router:

```typescript
prepararAudiencia: protectedProcedure
  .input(
    z.object({
      audienciaId: z.number(),
      skipDownload: z.boolean().optional(),
      skipAnalysis: z.boolean().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // Fetch audiência with related data
    const aud = await ctx.db
      .select()
      .from(audiencias)
      .where(eq(audiencias.id, input.audienciaId))
      .limit(1)
      .then((r) => r[0]);

    if (!aud) throw new TRPCError({ code: "NOT_FOUND" });

    const processo = aud.processoId
      ? await ctx.db
          .select()
          .from(processos)
          .where(eq(processos.id, aud.processoId))
          .limit(1)
          .then((r) => r[0])
      : null;

    const assistido = aud.assistidoId
      ? await ctx.db
          .select()
          .from(assistidos)
          .where(eq(assistidos.id, aud.assistidoId))
          .limit(1)
          .then((r) => r[0])
      : null;

    // Steps 1-2 (download + upload): handled externally via PJe CDP
    // Step 3 (analysis): handled via Mac Mini script
    // Steps 4-5 (populate witnesses + verify intimation): handled here

    // Step 4: Populate testemunhas from analysisData
    const analysisData = processo?.analysisData as Record<string, unknown> | null;
    const depoimentos = (analysisData?.depoimentos as Array<{
      nome: string;
      papel?: string;
    }>) ?? [];

    const insertedTestemunhas: Array<{ nome: string; tipo: string; status: string }> = [];

    for (const dep of depoimentos) {
      // Map papel to tipo enum
      const tipoMap: Record<string, string> = {
        testemunha_acusacao: "ACUSACAO",
        testemunha_defesa: "DEFESA",
        vitima: "VITIMA",
        policial_condutor: "ACUSACAO",
        perito: "COMUM",
        informante: "COMUM",
      };
      const tipo = tipoMap[dep.papel ?? ""] ?? "COMUM";

      // Check if already exists
      const existing = await ctx.db
        .select({ id: testemunhas.id })
        .from(testemunhas)
        .where(
          and(
            eq(testemunhas.audienciaId, aud.id),
            eq(testemunhas.nome, dep.nome),
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await ctx.db.insert(testemunhas).values({
          processoId: aud.processoId,
          audienciaId: aud.id,
          nome: dep.nome,
          tipo,
          status: "ARROLADA", // Default until intimation check
        });
      }

      insertedTestemunhas.push({ nome: dep.nome, tipo, status: "ARROLADA" });
    }

    // Step 5: Update intimation status will be done via separate
    // movimentações check (requires PJe CDP, handled client-side)

    return {
      audienciaId: aud.id,
      assistidoNome: assistido?.nome ?? "Desconhecido",
      testemunhas: insertedTestemunhas,
    };
  }),
```

- [ ] **Step 2: Add `atualizarIntimacaoTestemunhas` mutation**

This endpoint receives parsed movimentações and updates witness intimation status:

```typescript
atualizarIntimacaoTestemunhas: protectedProcedure
  .input(
    z.object({
      audienciaId: z.number(),
      intimacoes: z.array(
        z.object({
          testemunhaNome: z.string().optional(),
          status: z.enum(["INTIMADA", "NAO_LOCALIZADA", "CARTA_PRECATORIA"]),
          movimentacao: z.string(),
          data: z.string(),
        })
      ),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const updated: string[] = [];

    for (const int of input.intimacoes) {
      if (!int.testemunhaNome) continue;

      // Find matching testemunha by name (fuzzy)
      const allTestemunhas = await ctx.db
        .select()
        .from(testemunhas)
        .where(eq(testemunhas.audienciaId, input.audienciaId));

      const match = allTestemunhas.find(
        (t) =>
          t.nome.toLowerCase().includes(int.testemunhaNome!.toLowerCase()) ||
          int.testemunhaNome!.toLowerCase().includes(t.nome.toLowerCase())
      );

      if (match) {
        await ctx.db
          .update(testemunhas)
          .set({
            status: int.status,
            observacoes: `${int.data}: ${int.movimentacao}`,
            updatedAt: new Date(),
          })
          .where(eq(testemunhas.id, match.id));

        updated.push(match.nome);
      }
    }

    return { updated };
  }),
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/trpc/routers/audiencias.ts
git commit -m "feat: add prepararAudiencia and atualizarIntimacaoTestemunhas endpoints"
```

---

## Task 13: Final Integration & Visual Polish

**Files:**
- Modify: `src/components/agenda/preparar-audiencias-modal.tsx`

- [ ] **Step 1: Wire the modal's progress phase to real tRPC mutations**

Update `handlePrepararTodos` in the modal to sequentially call the `prepararAudiencia` mutation for each pendente:

```typescript
const prepararMutation = trpc.audiencias.prepararAudiencia.useMutation();

const handlePrepararTodos = async () => {
  setPhase("progresso");
  setIsRunning(true);
  setResults([]);

  const newResults: PipelineResult[] = [];

  for (let i = 0; i < pendentes.length; i++) {
    if (!isRunning) break; // Respect pause/cancel

    setCurrentIndex(i);
    const aud = pendentes[i];

    try {
      // Steps 1-3 are external (PJe + Mac Mini)
      // For now, skip to steps 4-5 which are server-side
      setCurrentStep(3); // "Identificando testemunhas"

      const result = await prepararMutation.mutateAsync({
        audienciaId: aud.id,
      });

      setCurrentStep(4); // "Verificando intimação"
      // Intimation check will be added when movimentações scraping is ready

      newResults.push({
        audienciaId: aud.id,
        assistidoNome: result.assistidoNome,
        success: true,
        testemunhas: result.testemunhas,
        naoIntimadas: result.testemunhas
          .filter((t) => t.status === "ARROLADA" || t.status === "NAO_LOCALIZADA")
          .map((t) => ({ nome: t.nome, status: t.status })),
      });
    } catch (error) {
      newResults.push({
        audienciaId: aud.id,
        assistidoNome: aud.assistidoNome,
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        testemunhas: [],
        naoIntimadas: [],
      });
    }

    setResults([...newResults]);
  }

  setIsRunning(false);
  setPhase("resultado");
};
```

Replace the existing `handlePrepararTodos` function and add the mutation hook at the top of the component.

- [ ] **Step 2: Verify build**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/agenda/preparar-audiencias-modal.tsx
git commit -m "feat: wire PrepararAudienciasModal to real tRPC pipeline mutations"
```

---

## Summary

| Task | Description | Files | Estimated Complexity |
|------|-------------|-------|---------------------|
| 1 | Add new ato types | atos-por-atribuicao.ts | Low |
| 2 | Audiência detection in ato suggestion | ato-suggestion.ts | Medium |
| 3 | Audiência inline form component | audiencia-inline-form.tsx (new) | Low |
| 4 | Extend review table with audiência fields | pje-review-table.tsx | Medium |
| 5 | Wire audiência data through import flow | pje-import-modal.tsx, demandas.ts | Medium |
| 6 | Status de preparação endpoint | audiencias.ts | Medium |
| 7 | PJe movimentações parser | pje-movimentacoes-parser.ts (new) | Medium |
| 8 | Pipeline orchestrator types | preparar-audiencia-pipeline.ts (new) | Low |
| 9 | Preparar Audiências modal | preparar-audiencias-modal.tsx (new) | High |
| 10 | Add button to Agenda + Dashboard | agenda/page.tsx, page.tsx | Low |
| 11 | Mac Mini preparation script | prepare-audiencia.mjs (new) | Low |
| 12 | Pipeline tRPC endpoints | audiencias.ts | Medium |
| 13 | Final integration & wiring | preparar-audiencias-modal.tsx | Medium |

**Dependency order:** 1 → 2 → 3 → 4 → 5 (Módulo 1 completo) | 6, 7, 8 (paralelo) → 9 → 10, 11 (paralelo) → 12 → 13
