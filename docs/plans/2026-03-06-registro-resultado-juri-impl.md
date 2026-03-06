# Registro de Resultado do Juri — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build post-trial result registration with document upload + AI extraction, execution penalty calculator with Excalidraw timeline, and analytical dashboard for jury trial cosmovisao.

**Architecture:** Extend existing `sessoesJuri` table with new columns + 2 new tables (`dosimetriaJuri`, `documentosJuri`). Extend existing `quesitos` table with `resultado` + `ordemVotacao` fields. New enrichment-engine endpoint for document extraction. Pure calculation engine in `src/lib/juri/execucao-penal.ts` (no DB dependency). New pages for registration wizard, calculator, and analytics dashboard.

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM, PostgreSQL (Supabase), Tailwind CSS, shadcn/ui, Excalidraw JSON generation, enrichment-engine (FastAPI + Anthropic Claude).

---

## Task 1: Database Schema Migration

**Files:**
- Modify: `src/lib/db/schema.ts` (add new enums, extend `sessoesJuri`, add new tables, update relations)

**Step 1: Add new enums after existing enums (around line 95)**

Add these enums after `statusProcessoEnum`:

```typescript
// Tipo penal do juri
export const tipoPenalJuriEnum = pgEnum("tipo_penal_juri", [
  "homicidio_simples",
  "homicidio_qualificado",
  "homicidio_privilegiado",
  "homicidio_privilegiado_qualificado",
  "homicidio_tentado",
  "feminicidio",
]);

// Resultado do quesito
export const quesitosResultadoEnum = pgEnum("quesitos_resultado", [
  "sim",
  "nao",
  "prejudicado",
]);

// Regime inicial
export const regimeInicialEnum = pgEnum("regime_inicial", [
  "fechado",
  "semiaberto",
  "aberto",
]);

// Tipo de documento do juri
export const documentoJuriTipoEnum = pgEnum("documento_juri_tipo", [
  "quesitos",
  "sentenca",
  "ata",
]);
```

**Step 2: Add new fields to `sessoesJuri` table (around line 620)**

Add these fields before `createdAt`:

```typescript
  // Registro completo pós-júri
  registroCompleto: boolean("registro_completo").default(false),

  // Contexto da sessão (preenchido via AI ou manual)
  juizPresidente: text("juiz_presidente"),
  promotor: text("promotor"),
  duracaoMinutos: integer("duracao_minutos"),
  localFato: text("local_fato"),
  tipoPenal: tipoPenalJuriEnum("tipo_penal"),
  tesePrincipal: text("tese_principal"),
  reuPrimario: boolean("reu_primario"),
  reuIdade: integer("reu_idade"),
  vitimaGenero: varchar("vitima_genero", { length: 20 }),
  vitimaIdade: integer("vitima_idade"),
  usouAlgemas: boolean("usou_algemas"),
  incidentesProcessuais: text("incidentes_processuais"),
```

**Step 3: Add `resultado` and `ordemVotacao` fields to existing `quesitos` table (line ~5540)**

Add after `geradoPorIA`:

```typescript
  // Resultado pós-júri
  resultado: quesitosResultadoEnum("resultado"), // preenchido após o julgamento
  ordemVotacao: integer("ordem_votacao"), // sequência em que foi votado
```

**Step 4: Create `dosimetriaJuri` table (after `sessoesJuri`)**

```typescript
// ==========================================
// DOSIMETRIA DO JURI (Pós-Sentença)
// ==========================================

export const dosimetriaJuri = pgTable("dosimetria_juri", {
  id: serial("id").primaryKey(),
  sessaoJuriId: integer("sessao_juri_id")
    .notNull()
    .references(() => sessoesJuri.id, { onDelete: "cascade" }),

  // Dosimetria (3 fases)
  penaBase: text("pena_base"),
  circunstanciasJudiciais: text("circunstancias_judiciais"), // art. 59
  agravantes: text("agravantes"),
  atenuantes: text("atenuantes"),
  causasAumento: text("causas_aumento"),
  causasDiminuicao: text("causas_diminuicao"),

  // Pena final
  penaTotalMeses: integer("pena_total_meses"), // em meses para facilitar cálculos
  regimeInicial: regimeInicialEnum("regime_inicial"),

  // Detração
  detracaoInicio: date("detracao_inicio"), // data início preventiva
  detracaoFim: date("detracao_fim"), // data da condenação
  detracaoDias: integer("detracao_dias"),

  // Data do fato (para irretroatividade)
  dataFato: date("data_fato"),

  // Execução penal
  fracaoProgressao: varchar("fracao_progressao", { length: 10 }), // ex: "40%"
  incisoAplicado: varchar("inciso_aplicado", { length: 30 }), // ex: "art. 112, V"
  vedadoLivramento: boolean("vedado_livramento").default(false),
  resultouMorte: boolean("resultou_morte").default(false),
  reuReincidente: boolean("reu_reincidente").default(false),

  // Metadados de extração
  extraidoPorIA: boolean("extraido_por_ia").default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("dosimetria_juri_sessao_idx").on(table.sessaoJuriId),
]);

export type DosimetriaJuri = typeof dosimetriaJuri.$inferSelect;
export type InsertDosimetriaJuri = typeof dosimetriaJuri.$inferInsert;
```

**Step 5: Create `documentosJuri` table**

```typescript
// ==========================================
// DOCUMENTOS DO JURI (PDFs/Fotos)
// ==========================================

export const documentosJuri = pgTable("documentos_juri", {
  id: serial("id").primaryKey(),
  sessaoJuriId: integer("sessao_juri_id")
    .notNull()
    .references(() => sessoesJuri.id, { onDelete: "cascade" }),

  tipo: documentoJuriTipoEnum("tipo").notNull(),
  fileName: text("file_name"),
  url: text("url").notNull(), // Supabase Storage URL

  // Dados extraídos pela AI
  dadosExtraidos: jsonb("dados_extraidos"),
  processadoEm: timestamp("processado_em"),
  statusProcessamento: varchar("status_processamento", { length: 20 }).default("pendente"), // 'pendente' | 'processando' | 'concluido' | 'erro'

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("documentos_juri_sessao_idx").on(table.sessaoJuriId),
  index("documentos_juri_tipo_idx").on(table.tipo),
]);

export type DocumentoJuri = typeof documentosJuri.$inferSelect;
export type InsertDocumentoJuri = typeof documentosJuri.$inferInsert;
```

**Step 6: Add relations for new tables**

```typescript
export const dosimetriaJuriRelations = relations(dosimetriaJuri, ({ one }) => ({
  sessao: one(sessoesJuri, { fields: [dosimetriaJuri.sessaoJuriId], references: [sessoesJuri.id] }),
}));

export const documentosJuriRelations = relations(documentosJuri, ({ one }) => ({
  sessao: one(sessoesJuri, { fields: [documentosJuri.sessaoJuriId], references: [sessoesJuri.id] }),
}));
```

Update `sessoesJuriRelations` to include:
```typescript
  dosimetria: many(dosimetriaJuri),
  documentos: many(documentosJuri),
```

**Step 7: Push schema to database**

Run: `npm run db:push`
Expected: Schema applied successfully to Supabase

**Step 8: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(juri): schema for post-trial registration - dosimetria, documentos, extended sessoes"
```

---

## Task 2: Execution Penalty Calculator Engine

Pure TypeScript calculation engine. No DB dependency — takes inputs, returns results. This is the core legal logic.

**Files:**
- Create: `src/lib/juri/execucao-penal.ts`

**Step 1: Create the calculation engine**

```typescript
// src/lib/juri/execucao-penal.ts
// Motor de cálculo de execução penal — Art. 112, LEP
// Aplica irretroatividade com base na data do fato

export type TipoPenal =
  | "homicidio_simples"
  | "homicidio_qualificado"
  | "homicidio_privilegiado"
  | "homicidio_privilegiado_qualificado"
  | "homicidio_tentado"
  | "feminicidio";

export type RegimeInicial = "fechado" | "semiaberto" | "aberto";

export interface ExecucaoPenalInput {
  tipoPenal: TipoPenal;
  penaTotalMeses: number;
  regimeInicial: RegimeInicial;
  dataFato: string; // ISO date
  dataCondenacao: string; // ISO date
  reuPrimario: boolean;
  resultouMorte: boolean;
  detracaoInicio?: string; // ISO date - início da preventiva
  // detracaoFim = dataCondenacao
}

export interface MarcoExecucao {
  tipo: "detracao" | "progressao_1" | "progressao_2" | "saida_temporaria" | "livramento_condicional" | "fim_pena";
  label: string;
  labelAcessivel: string; // linguagem para o assistido
  data: string; // ISO date
  diasCumpridos: number;
  fracao?: string;
  fundamentoLegal: string;
}

export interface ExecucaoPenalResult {
  marcos: MarcoExecucao[];
  fracaoProgressao: number; // decimal (0.25 = 25%)
  fracaoLabel: string; // "25%"
  incisoAplicado: string;
  vedadoLivramento: boolean;
  saldoPenaDias: number;
  detracaoDias: number;
  penaTotalDias: number;
  regimeLegal: "pre_anticrime" | "pos_anticrime" | "pos_feminicidio_2024";
}

// ==========================================
// DATAS DE VIGÊNCIA
// ==========================================
const PACOTE_ANTICRIME = new Date("2020-01-23");
const LEI_FEMINICIDIO_2024 = new Date("2024-10-10");

// ==========================================
// FRAÇÕES PÓS-PACOTE ANTICRIME (Art. 112, LEP)
// ==========================================
function getFracaoPosAnticrime(
  tipoPenal: TipoPenal,
  primario: boolean,
  resultouMorte: boolean,
  dataFato: Date
): { fracao: number; inciso: string; vedadoLC: boolean } {
  const isHediondo = tipoPenal === "homicidio_qualificado" || tipoPenal === "feminicidio";
  const isFeminicidio = tipoPenal === "feminicidio" && dataFato >= LEI_FEMINICIDIO_2024;

  // VIII - 70% - Reincidente hediondo + morte
  if (isHediondo && !primario && resultouMorte) {
    return { fracao: 0.70, inciso: "art. 112, VIII", vedadoLC: true };
  }
  // VII - 60% - Reincidente hediondo
  if (isHediondo && !primario) {
    return { fracao: 0.60, inciso: "art. 112, VII", vedadoLC: false };
  }
  // VI-A - 55% - Feminicídio primário (Lei 14.994/2024)
  if (isFeminicidio && primario) {
    return { fracao: 0.55, inciso: "art. 112, VI-A", vedadoLC: true };
  }
  // VI-a - 50% - Hediondo + morte, primário
  if (isHediondo && primario && resultouMorte) {
    return { fracao: 0.50, inciso: "art. 112, VI, a", vedadoLC: true };
  }
  // V - 40% - Hediondo, primário
  if (isHediondo && primario) {
    return { fracao: 0.40, inciso: "art. 112, V", vedadoLC: false };
  }
  // IV - 30% - Reincidente + violência
  if (!primario) {
    return { fracao: 0.30, inciso: "art. 112, IV", vedadoLC: false };
  }
  // III - 25% - Primário + violência
  return { fracao: 0.25, inciso: "art. 112, III", vedadoLC: false };
}

// ==========================================
// FRAÇÕES PRÉ-PACOTE ANTICRIME
// ==========================================
function getFracaoPreAnticrime(
  tipoPenal: TipoPenal,
  primario: boolean
): { fracao: number; inciso: string; vedadoLC: boolean } {
  const isHediondo = tipoPenal === "homicidio_qualificado" || tipoPenal === "feminicidio";

  if (isHediondo && !primario) {
    return { fracao: 3 / 5, inciso: "art. 112, antigo (3/5 hediondo reincidente)", vedadoLC: false };
  }
  if (isHediondo && primario) {
    return { fracao: 2 / 5, inciso: "art. 112, antigo (2/5 hediondo primário)", vedadoLC: false };
  }
  return { fracao: 1 / 6, inciso: "art. 112, antigo (1/6 comum)", vedadoLC: false };
}

// ==========================================
// LIVRAMENTO CONDICIONAL
// ==========================================
function getFracaoLivramento(
  tipoPenal: TipoPenal,
  primario: boolean
): number {
  const isHediondo = tipoPenal === "homicidio_qualificado" || tipoPenal === "feminicidio";
  if (isHediondo) return 2 / 3;
  if (!primario) return 1 / 2;
  return 1 / 3;
}

// ==========================================
// UTILITÁRIOS DE DATA
// ==========================================
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function diffDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function formatISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ==========================================
// CÁLCULO PRINCIPAL
// ==========================================
export function calcularExecucaoPenal(input: ExecucaoPenalInput): ExecucaoPenalResult {
  const dataFato = new Date(input.dataFato);
  const dataCondenacao = new Date(input.dataCondenacao);
  const penaTotalDias = input.penaTotalMeses * 30; // simplificação jurídica padrão

  // 1. Determinar regime legal (irretroatividade)
  const regimeLegal = dataFato >= LEI_FEMINICIDIO_2024
    ? "pos_feminicidio_2024" as const
    : dataFato >= PACOTE_ANTICRIME
    ? "pos_anticrime" as const
    : "pre_anticrime" as const;

  // 2. Obter fração de progressão
  const { fracao, inciso, vedadoLC } = regimeLegal === "pre_anticrime"
    ? getFracaoPreAnticrime(input.tipoPenal, input.reuPrimario)
    : getFracaoPosAnticrime(input.tipoPenal, input.reuPrimario, input.resultouMorte, dataFato);

  // 3. Calcular detração
  let detracaoDias = 0;
  if (input.detracaoInicio) {
    const inicioPreventiva = new Date(input.detracaoInicio);
    detracaoDias = diffDays(inicioPreventiva, dataCondenacao);
    if (detracaoDias < 0) detracaoDias = 0;
  }

  // 4. Saldo de pena
  const saldoPenaDias = Math.max(penaTotalDias - detracaoDias, 0);

  // 5. Calcular marcos
  const marcos: MarcoExecucao[] = [];

  // Marco: Detração
  if (detracaoDias > 0 && input.detracaoInicio) {
    marcos.push({
      tipo: "detracao",
      label: `Detração: ${detracaoDias} dias de preventiva`,
      labelAcessivel: `Você ficou ${detracaoDias} dias preso antes da condenação. Esse tempo é descontado da pena.`,
      data: input.detracaoInicio,
      diasCumpridos: detracaoDias,
      fundamentoLegal: "Art. 42, CP — Detração",
    });
  }

  // Marco: Progressão 1 (fechado → semiaberto)
  if (input.regimeInicial === "fechado") {
    const diasProgressao1 = Math.ceil(saldoPenaDias * fracao);
    const dataProgressao1 = addDays(dataCondenacao, diasProgressao1);
    marcos.push({
      tipo: "progressao_1",
      label: `Progressão: fechado → semiaberto (${(fracao * 100).toFixed(0)}%)`,
      labelAcessivel: `Pode pedir mudança para regime semiaberto em ${formatBR(dataProgressao1)}.`,
      data: formatISO(dataProgressao1),
      diasCumpridos: diasProgressao1,
      fracao: `${(fracao * 100).toFixed(0)}%`,
      fundamentoLegal: inciso,
    });

    // Saída temporária — após semiaberto + 1/6
    const diasSaidaTemp = Math.ceil(saldoPenaDias * (1 / 6));
    const dataSaidaTemp = addDays(dataProgressao1, diasSaidaTemp);
    marcos.push({
      tipo: "saida_temporaria",
      label: `Saída temporária (1/6 do semiaberto)`,
      labelAcessivel: `Pode solicitar saída temporária a partir de ${formatBR(dataSaidaTemp)}.`,
      data: formatISO(dataSaidaTemp),
      diasCumpridos: diasProgressao1 + diasSaidaTemp,
      fracao: "1/6",
      fundamentoLegal: "Art. 122, LEP",
    });

    // Progressão 2 (semi → aberto)
    const restanteAposProg1 = saldoPenaDias - diasProgressao1;
    const diasProgressao2 = Math.ceil(restanteAposProg1 * fracao);
    const dataProgressao2 = addDays(dataProgressao1, diasProgressao2);
    marcos.push({
      tipo: "progressao_2",
      label: `Progressão: semiaberto → aberto (${(fracao * 100).toFixed(0)}%)`,
      labelAcessivel: `Pode pedir mudança para regime aberto em ${formatBR(dataProgressao2)}.`,
      data: formatISO(dataProgressao2),
      diasCumpridos: diasProgressao1 + diasProgressao2,
      fracao: `${(fracao * 100).toFixed(0)}%`,
      fundamentoLegal: inciso,
    });
  } else if (input.regimeInicial === "semiaberto") {
    // Progressão 1 (semi → aberto)
    const diasProgressao1 = Math.ceil(saldoPenaDias * fracao);
    const dataProgressao1 = addDays(dataCondenacao, diasProgressao1);
    marcos.push({
      tipo: "progressao_1",
      label: `Progressão: semiaberto → aberto (${(fracao * 100).toFixed(0)}%)`,
      labelAcessivel: `Pode pedir mudança para regime aberto em ${formatBR(dataProgressao1)}.`,
      data: formatISO(dataProgressao1),
      diasCumpridos: diasProgressao1,
      fracao: `${(fracao * 100).toFixed(0)}%`,
      fundamentoLegal: inciso,
    });
  }

  // Marco: Livramento Condicional
  if (!vedadoLC) {
    const fracaoLC = getFracaoLivramento(input.tipoPenal, input.reuPrimario);
    const diasLC = Math.ceil(saldoPenaDias * fracaoLC);
    const dataLC = addDays(dataCondenacao, diasLC);
    const fracaoLCLabel = input.reuPrimario
      ? (input.tipoPenal === "homicidio_qualificado" || input.tipoPenal === "feminicidio" ? "2/3" : "1/3")
      : (input.tipoPenal === "homicidio_qualificado" || input.tipoPenal === "feminicidio" ? "2/3" : "1/2");
    marcos.push({
      tipo: "livramento_condicional",
      label: `Livramento condicional (${fracaoLCLabel})`,
      labelAcessivel: `Pode solicitar livramento condicional em ${formatBR(dataLC)}.`,
      data: formatISO(dataLC),
      diasCumpridos: diasLC,
      fracao: fracaoLCLabel,
      fundamentoLegal: "Art. 83, CP",
    });
  }

  // Marco: Fim da pena
  const dataFimPena = addDays(dataCondenacao, saldoPenaDias);
  marcos.push({
    tipo: "fim_pena",
    label: "Fim do cumprimento da pena",
    labelAcessivel: `Previsão de cumprimento total da pena: ${formatBR(dataFimPena)}.`,
    data: formatISO(dataFimPena),
    diasCumpridos: saldoPenaDias,
    fundamentoLegal: "Cumprimento integral",
  });

  // Ordenar marcos por data
  marcos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  return {
    marcos,
    fracaoProgressao: fracao,
    fracaoLabel: `${(fracao * 100).toFixed(0)}%`,
    incisoAplicado: inciso,
    vedadoLivramento: vedadoLC,
    saldoPenaDias,
    detracaoDias,
    penaTotalDias,
    regimeLegal,
  };
}

// Helper BR date format
function formatBR(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}
```

**Step 2: Commit**

```bash
git add src/lib/juri/execucao-penal.ts
git commit -m "feat(juri): execution penalty calculator engine with Art. 112 LEP fractions"
```

---

## Task 3: Enrichment Engine — Document Extraction Endpoint

**Files:**
- Create: `enrichment-engine/routers/juri.py`
- Create: `enrichment-engine/prompts/juri_extraction.py`
- Modify: `enrichment-engine/main.py` (register new router)

**Step 1: Create extraction prompts**

File: `enrichment-engine/prompts/juri_extraction.py`

Contains 3 system prompts:
- `PROMPT_QUESITOS` — extracts ordered quesitos with text, result (SIM/NAO/PREJUDICADO), type, voting order
- `PROMPT_SENTENCA` — extracts dosimetry (pena-base, circunstancias, agravantes, atenuantes, aumento, diminuicao, pena total, regime), tipo penal, qualificadoras
- `PROMPT_ATA` — extracts juiz, promotor, start/end times, duration, witnesses, incidents, use of handcuffs

Each prompt outputs strict JSON matching the schema.

**Step 2: Create the juri router**

File: `enrichment-engine/routers/juri.py`

Endpoint: `POST /api/juri/extrair`

Request: `{ file_url: str, tipo: "quesitos" | "sentenca" | "ata" }`

Flow:
1. Download file from URL
2. If PDF → use Docling for OCR extraction
3. If image (JPG/PNG) → use `services/ocr_service.py` existing OCR
4. Send extracted text to Anthropic Claude with the appropriate prompt
5. Return structured JSON

Response: `{ tipo, dados_extraidos: {...}, processing_time_ms }`

**Step 3: Register router in main.py**

Add import and include_router:
```python
from routers.juri import router as juri_router
app.include_router(juri_router, prefix="/api", tags=["Juri"])
```

**Step 4: Commit**

```bash
git add enrichment-engine/routers/juri.py enrichment-engine/prompts/juri_extraction.py enrichment-engine/main.py
git commit -m "feat(enrichment): juri document extraction endpoint for quesitos, sentenca, ata"
```

---

## Task 4: tRPC Routes for Registration

**Files:**
- Modify: `src/lib/trpc/routers/avaliacaoJuri.ts` (add registration mutations/queries)

**Step 1: Add `registroPendentes` query**

Returns sessions with `status = 'realizada'` AND `registroCompleto = false`.

**Step 2: Add `uploadDocumento` mutation**

Input: `{ sessaoJuriId, tipo, fileUrl, fileName }`
- Creates `documentosJuri` record
- Calls enrichment-engine `/api/juri/extrair`
- Updates record with extracted data
- Returns extracted data

**Step 3: Add `salvarRegistro` mutation**

Input: `{ sessaoJuriId, contexto (juiz, promotor, duracao, etc.), dosimetria, quesitosResultados: [{quesitoId, resultado, ordemVotacao}] }`
- Updates `sessoesJuri` with context fields
- Creates/updates `dosimetriaJuri` record
- Updates `quesitos` records with `resultado` and `ordemVotacao`
- Sets `registroCompleto = true`

**Step 4: Add `getRegistro` query**

Input: `{ sessaoJuriId }`
Returns: session + dosimetria + documentos + quesitos with results

**Step 5: Commit**

```bash
git add src/lib/trpc/routers/avaliacaoJuri.ts
git commit -m "feat(juri): tRPC routes for post-trial registration - upload, save, query"
```

---

## Task 5: Hub Pending Badge + Registration Page

**Files:**
- Modify: `src/app/(dashboard)/admin/juri/page.tsx` (add pending badge section)
- Create: `src/app/(dashboard)/admin/juri/registro/[sessaoId]/page.tsx` (3-step wizard)
- Create: `src/components/juri/registro/document-upload.tsx` (dropzone component)
- Create: `src/components/juri/registro/review-form.tsx` (review/edit extracted data)

**Step 1: Add pending sessions section to hub page**

Above "Próximas Sessões" card, add a new section that queries `registroPendentes`.
Show amber badge with count. Each item links to `/admin/juri/registro/[sessaoId]`.

**Step 2: Create registration wizard page**

3-step stepper:
1. Upload Documentos (dropzone for quesitos/sentenca/ata)
2. Revisar Dados (form pre-filled from AI, editable, organized in tabs: Quesitos, Dosimetria, Contexto, Perfil, Detracao)
3. Confirmar (summary + save button)

**Step 3: Create document upload component**

Dropzone with:
- 3 slots: Quesitos, Sentenca, Ata
- Accepts PDF, JPG, PNG
- Uploads to Supabase Storage via API route
- Calls tRPC `uploadDocumento` for each
- Shows processing indicator per document
- When done, passes extracted data to next step

**Step 4: Create review form component**

Tabbed form with all fields from design doc.
Each field shows badge: "AI" (extracted) or "Manual" (edited).
Pre-filled from extracted data, all fields editable.

**Step 5: Commit**

```bash
git add src/app/\(dashboard\)/admin/juri/page.tsx \
  src/app/\(dashboard\)/admin/juri/registro/ \
  src/components/juri/registro/
git commit -m "feat(juri): post-trial registration wizard with document upload + AI extraction"
```

---

## Task 6: Execution Penalty Calculator Page

**Files:**
- Create: `src/app/(dashboard)/admin/juri/calculadora/page.tsx`
- Create: `src/app/(dashboard)/admin/juri/calculadora/[sessaoId]/page.tsx` (pre-filled from session)
- Create: `src/components/juri/calculadora/timeline-execucao.tsx`
- Create: `src/components/juri/calculadora/excalidraw-generator.ts`

**Step 1: Create calculator page**

Form inputs matching `ExecucaoPenalInput`.
On submit: calls `calcularExecucaoPenal()` (client-side, no API call needed).
Displays timeline visualization.

**Step 2: Create timeline component**

Visual horizontal timeline:
- Color-coded blocks: orange (detracao), red (fechado), amber (semi), green (aberto)
- Marco cards below with date, fraction, legal basis
- Alert banner when livramento is vedado
- Accessible labels (for assistido)

**Step 3: Create pre-filled version from session**

Route `/calculadora/[sessaoId]` fetches dosimetria data and pre-fills the form.

**Step 4: Create Excalidraw generator**

Function that takes `ExecucaoPenalResult` and generates Excalidraw JSON:
- Horizontal timeline with colored rectangles
- Text labels in accessible language
- Colors: green (#10b981 cumprido), blue (#3b82f6 atual), gray (#94a3b8 futuro)
- Export as `.excalidraw` file or PNG for WhatsApp

Uses the skill pattern from `.agents/skills/excalidraw-diagram/`.

**Step 5: Add link from hub**

Add "Calculadora" tool card in juri hub page.

**Step 6: Commit**

```bash
git add src/app/\(dashboard\)/admin/juri/calculadora/ \
  src/components/juri/calculadora/
git commit -m "feat(juri): execution penalty calculator with timeline + Excalidraw export"
```

---

## Task 7: Analytics Dashboard — Cosmovisao

**Files:**
- Create: `src/lib/trpc/routers/juriAnalytics.ts` (dedicated analytics router)
- Create: `src/app/(dashboard)/admin/juri/cosmovisao/page.tsx`
- Create: `src/components/juri/analytics/` (chart components)

**Step 1: Create analytics tRPC router**

Queries:
- `panorama` — KPI cards with period comparison (total, absolvicoes, condenacoes, desclassificacoes)
- `timeline` — monthly result counts for chart
- `porTipoPenal` — breakdown by crime type
- `porTese` — breakdown by defense thesis
- `porDuracao` — session duration vs result
- `porPerfil` — primario/reincidente, victim age, location
- `atores` — jurado tendencies, juiz patterns, promotor patterns
- `insightsCruzados` — auto-detected correlations (requires 5+ sessions)

All queries accept filters: `{ periodoInicio?, periodoFim?, comarca?, defensorId? }`

**Step 2: Create dashboard page**

Layout:
1. Filter bar (period selector, comarca, defensor)
2. KPI cards row (panorama)
3. Timeline chart (stacked bar)
4. Dynamic cards grid (tipo penal, tese, duracao, perfil)
5. Actors section (jurados, juizes, promotores)
6. Insights section (auto-generated)

**Step 3: Create chart components**

Using simple CSS/div-based charts (no external library needed):
- `BarChart` — stacked horizontal bars
- `StatComparison` — value with delta arrow
- `TrendLine` — simple line with dots
- `CorrelationCard` — insight text with confidence %

**Step 4: Replace existing inteligencia link in hub**

Update hub page to point to `/admin/juri/cosmovisao` instead of `/admin/juri/inteligencia`.

**Step 5: Commit**

```bash
git add src/lib/trpc/routers/juriAnalytics.ts \
  src/app/\(dashboard\)/admin/juri/cosmovisao/ \
  src/components/juri/analytics/ \
  src/app/\(dashboard\)/admin/juri/page.tsx
git commit -m "feat(juri): analytics dashboard - cosmovisao with cross-variable analysis"
```

---

## Task 8: Supabase Storage + Upload API Route

**Files:**
- Create: `src/app/api/juri/upload/route.ts`

**Step 1: Create upload API route**

Handles multipart form upload:
- Accepts PDF/JPG/PNG
- Uploads to Supabase Storage bucket `juri-documentos`
- Returns public URL
- Validates file type and size (max 20MB)

This is needed because tRPC doesn't handle file uploads natively.

**Step 2: Commit**

```bash
git add src/app/api/juri/upload/route.ts
git commit -m "feat(juri): upload API route for jury documents to Supabase Storage"
```

---

## Task 9: Final Integration + Build Verification

**Step 1: Run build**

Run: `npm run build`
Expected: Zero TypeScript errors, successful compilation

**Step 2: Fix any type errors**

Address any build failures.

**Step 3: Final commit with all fixes**

```bash
git add -A
git commit -m "fix(juri): build fixes for post-trial registration system"
```

---

## Implementation Order Summary

| # | Task | Priority | Dependencies |
|---|------|----------|-------------|
| 1 | Schema Migration | FIRST | None |
| 2 | Calculator Engine | HIGH | None (pure logic) |
| 3 | Enrichment Endpoint | HIGH | None |
| 4 | tRPC Routes | HIGH | Task 1 |
| 5 | Hub Badge + Registration Page | HIGH | Tasks 1, 3, 4, 8 |
| 6 | Calculator Page + Excalidraw | MEDIUM | Task 2 |
| 7 | Analytics Dashboard | MEDIUM | Task 1, 4 |
| 8 | Upload API Route | HIGH | None |
| 9 | Build Verification | LAST | All |

**Parallelizable:** Tasks 1, 2, 3, 8 can be done independently and in parallel.
