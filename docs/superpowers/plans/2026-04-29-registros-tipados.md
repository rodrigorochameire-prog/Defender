# Registros Tipados + Duplicação de Evento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o textarea livre `demandas.providencias` por uma timeline de registros tipados (7 espécies) reusando a tabela `atendimentos` (renomeada para `registros`); e adicionar duplicação de evento na agenda.

**Architecture:** Rename DB-level (`atendimentos` → `registros`), expand columns (`titulo`, `demandaId`, `audienciaId`, `tipo` enum lógico expandido), backfill `demandas.providencias` em registros tipo `providencia`, drop colunas legadas. Componente `<RegistrosTimeline>` reusável em demanda/ficha/processo/audiência/agenda. "Duplicar evento" como item de menu independente.

**Tech Stack:** Next.js 15, React 19, Drizzle ORM, PostgreSQL, tRPC, Tailwind CSS, shadcn/ui, Vitest.

**Spec:** `docs/superpowers/specs/2026-04-29-registros-tipados-design.md`

---

## Pre-flight

**Branch hygiene:** Criar branch `feat/registros-tipados` a partir de `origin/main` fresca. Trabalhar em worktree dedicada se preferir isolamento.

**Sanity check antes de começar:**
```bash
git fetch origin main
git checkout -b feat/registros-tipados origin/main
pnpm install
pnpm tsc --noEmit | grep -E "(error|Error)" | wc -l   # Anote baseline de erros pré-existentes
```

---

## Task 1: Schema — rename + extension

**Files:**
- Modify: `src/lib/db/schema/agenda.ts:142-210` (renomear export `atendimentos` → `registros`, ajustar campos)
- Create: `drizzle/migrations/00XX_registros_rename_extend.sql`
- Create: `drizzle/migrations/00XX_registros_backfill_providencias.sql`

- [ ] **Step 1.1: Renomear export e tabela no schema Drizzle**

Em `src/lib/db/schema/agenda.ts`, substituir:

```ts
// ANTES (linha 142):
export const atendimentos = pgTable("atendimentos", {
  // ...
  dataAtendimento: timestamp("data_atendimento").notNull(),
  // ...
  resumo: text("resumo"),
  // ...
  atendidoPorId: integer("atendido_por_id").references(() => users.id),
});

// DEPOIS:
export const registros = pgTable("registros", {
  id: serial("id").primaryKey(),
  assistidoId: integer("assistido_id")
    .notNull()
    .references(() => assistidos.id, { onDelete: "cascade" }),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "set null" }),
  casoId: integer("caso_id"),
  demandaId: integer("demanda_id").references(() => demandas.id, { onDelete: "set null" }),
  audienciaId: integer("audiencia_id"), // FK adicionada após declaração de audiencias
  dataRegistro: timestamp("data_registro").notNull(),
  duracao: integer("duracao"),
  tipo: varchar("tipo", { length: 30 }).notNull(),
  titulo: varchar("titulo", { length: 120 }),
  local: text("local"),
  assunto: text("assunto"),
  conteudo: text("conteudo"), // ← era `resumo`
  acompanhantes: text("acompanhantes"),
  status: varchar("status", { length: 20 }).default("agendado"),
  interlocutor: varchar("interlocutor", { length: 30 }).default("assistido"),
  // Audio/Plaud (preservados — só usados quando tipo='atendimento')
  audioUrl: text("audio_url"),
  audioDriveFileId: varchar("audio_drive_file_id", { length: 100 }),
  audioMimeType: varchar("audio_mime_type", { length: 50 }),
  audioFileSize: integer("audio_file_size"),
  transcricao: text("transcricao"),
  transcricaoResumo: text("transcricao_resumo"),
  transcricaoStatus: varchar("transcricao_status", { length: 20 }).default("pending"),
  transcricaoIdioma: varchar("transcricao_idioma", { length: 10 }).default("pt-BR"),
  plaudRecordingId: varchar("plaud_recording_id", { length: 100 }),
  plaudDeviceId: varchar("plaud_device_id", { length: 100 }),
  transcricaoMetadados: jsonb("transcricao_metadados").$type<{
    speakers?: { id: string; name?: string; segments?: number[] }[];
    wordTimestamps?: { word: string; start: number; end: number }[];
    confidence?: number;
    processingTime?: number;
  }>(),
  pontosChave: jsonb("pontos_chave").$type<{
    compromissos?: string[];
    informacoesRelevantes?: string[];
    duvidasPendentes?: string[];
    providenciasNecessarias?: string[];
  }>(),
  enrichmentStatus: varchar("enrichment_status", { length: 20 }),
  enrichmentData: jsonb("enrichment_data").$type<{
    key_points?: string[];
    facts?: { descricao: string; tipo: string; confidence: number }[];
    persons_mentioned?: { nome: string; papel: string }[];
    contradictions?: string[];
    suggested_actions?: string[];
    teses_possiveis?: string[];
    urgency_level?: string;
    confidence?: number;
  }>(),
  enrichedAt: timestamp("enriched_at"),
  autorId: integer("autor_id").references(() => users.id), // ← era `atendidoPorId`
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("registros_assistido_id_idx").on(table.assistidoId),
  index("registros_processo_id_idx").on(table.processoId),
  index("registros_caso_id_idx").on(table.casoId),
  index("registros_demanda_id_idx").on(table.demandaId),
  index("registros_audiencia_id_idx").on(table.audienciaId),
  index("registros_data_idx").on(table.dataRegistro),
  index("registros_tipo_idx").on(table.tipo),
  index("registros_status_idx").on(table.status),
  index("registros_autor_idx").on(table.autorId),
  index("registros_enrichment_status_idx").on(table.enrichmentStatus),
  index("registros_plaud_recording_id_idx").on(table.plaudRecordingId),
  index("registros_transcricao_status_idx").on(table.transcricaoStatus),
]);

export type Registro = typeof registros.$inferSelect;
export type InsertRegistro = typeof registros.$inferInsert;

// Re-export legacy aliases temporariamente — remover na Task 9
export const atendimentos = registros;
export type Atendimento = Registro;
export type InsertAtendimento = InsertRegistro;
```

Atualizar também `atendimentosRelations` → `registrosRelations`, adicionando `demanda` e `audiencia`.

- [ ] **Step 1.2: Escrever migration SQL (rename + extend)**

```sql
-- drizzle/migrations/00XX_registros_rename_extend.sql

BEGIN;

-- 1. Rename tabela e índices
ALTER TABLE atendimentos RENAME TO registros;
ALTER INDEX atendimentos_assistido_id_idx RENAME TO registros_assistido_id_idx;
ALTER INDEX atendimentos_processo_id_idx RENAME TO registros_processo_id_idx;
ALTER INDEX atendimentos_caso_id_idx RENAME TO registros_caso_id_idx;
ALTER INDEX atendimentos_data_idx RENAME TO registros_data_idx;
ALTER INDEX atendimentos_tipo_idx RENAME TO registros_tipo_idx;
ALTER INDEX atendimentos_status_idx RENAME TO registros_status_idx;
ALTER INDEX atendimentos_atendido_por_idx RENAME TO registros_autor_idx;
ALTER INDEX atendimentos_enrichment_status_idx RENAME TO registros_enrichment_status_idx;
ALTER INDEX atendimentos_plaud_recording_id_idx RENAME TO registros_plaud_recording_id_idx;
ALTER INDEX atendimentos_transcricao_status_idx RENAME TO registros_transcricao_status_idx;

-- 2. Rename colunas
ALTER TABLE registros RENAME COLUMN resumo TO conteudo;
ALTER TABLE registros RENAME COLUMN data_atendimento TO data_registro;
ALTER TABLE registros RENAME COLUMN atendido_por_id TO autor_id;

-- 3. Adicionar novas colunas
ALTER TABLE registros
  ADD COLUMN titulo VARCHAR(120),
  ADD COLUMN demanda_id INTEGER REFERENCES demandas(id) ON DELETE SET NULL,
  ADD COLUMN audiencia_id INTEGER REFERENCES audiencias(id) ON DELETE SET NULL;

-- 4. Índices novos
CREATE INDEX registros_demanda_id_idx ON registros(demanda_id);
CREATE INDEX registros_audiencia_id_idx ON registros(audiencia_id);

-- 5. Backfill default tipo (segurança — campo já é varchar)
UPDATE registros SET tipo = 'atendimento'
WHERE tipo IS NULL OR tipo NOT IN
  ('atendimento','diligencia','anotacao','providencia','delegacao','pesquisa','elaboracao');

COMMIT;
```

- [ ] **Step 1.3: Escrever migration de backfill providencias**

```sql
-- drizzle/migrations/00XX_registros_backfill_providencias.sql

BEGIN;

-- Migra demanda.providencias → registros tipo 'providencia'
INSERT INTO registros (
  assistido_id, processo_id, demanda_id, tipo, conteudo,
  data_registro, autor_id, status, interlocutor,
  created_at, updated_at
)
SELECT
  d.assistido_id,
  d.processo_id,
  d.id AS demanda_id,
  'providencia' AS tipo,
  d.providencias AS conteudo,
  COALESCE(d.updated_at, d.created_at) AS data_registro,
  d.defensor_id AS autor_id,
  'realizado' AS status,
  'assistido' AS interlocutor,
  NOW() AS created_at,
  NOW() AS updated_at
FROM demandas d
WHERE d.providencias IS NOT NULL
  AND length(trim(d.providencias)) > 0
  AND d.deleted_at IS NULL;

COMMIT;
```

- [ ] **Step 1.4: Aplicar migrations e validar**

```bash
pnpm db:push   # ou npm run db:push, conforme package.json
```

Expected: nenhum erro. Verificar via psql/Studio:
- Tabela `registros` existe, `atendimentos` não
- `registros.demanda_id`, `registros.audiencia_id`, `registros.titulo` existem
- Índices renomeados
- Backfill: `SELECT count(*) FROM registros WHERE tipo='providencia'` > 0

- [ ] **Step 1.5: Commit**

```bash
git add src/lib/db/schema/agenda.ts drizzle/migrations/
git commit -m "feat(registros): rename atendimentos → registros + add demanda/audiencia FKs + backfill providencias"
```

---

## Task 2: tRPC router — `registros.ts` (substitui `atendimentos.ts`)

**Files:**
- Create: `src/lib/trpc/routers/registros.ts`
- Modify: `src/lib/trpc/routers/atendimentos.ts:1` (re-export do novo router como compat)
- Modify: `src/lib/trpc/root.ts` ou `_app.ts` (registrar novo router `registros`)
- Test: `src/lib/trpc/routers/__tests__/registros.test.ts`

- [ ] **Step 2.1: Escrever testes para os procedures críticos**

```ts
// src/lib/trpc/routers/__tests__/registros.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createCaller } from "../trpc-test-helper";
// ... seguir padrão de outros routers do projeto

describe("registros router", () => {
  describe("list", () => {
    it("filters by assistidoId", async () => {
      const caller = await createCaller();
      const result = await caller.registros.list({ assistidoId: 1 });
      expect(result.every(r => r.assistidoId === 1)).toBe(true);
    });
    it("filters by demandaId", async () => {
      const caller = await createCaller();
      const result = await caller.registros.list({ demandaId: 5 });
      expect(result.every(r => r.demandaId === 5)).toBe(true);
    });
    it("filters by tipo", async () => {
      const caller = await createCaller();
      const result = await caller.registros.list({ tipo: "providencia" });
      expect(result.every(r => r.tipo === "providencia")).toBe(true);
    });
    it("paginates with cursor", async () => {
      const caller = await createCaller();
      const page1 = await caller.registros.list({ limit: 10 });
      expect(page1.length).toBeLessThanOrEqual(10);
    });
  });
  describe("create", () => {
    it("creates registro with required fields", async () => {
      const caller = await createCaller();
      const r = await caller.registros.create({
        tipo: "anotacao",
        assistidoId: 1,
        conteudo: "Teste",
      });
      expect(r.id).toBeGreaterThan(0);
    });
    it("delegacao type updates demanda.delegadoParaId when demandaId provided", async () => {
      const caller = await createCaller();
      const r = await caller.registros.create({
        tipo: "delegacao",
        assistidoId: 1,
        demandaId: 1,
        conteudo: "Repassado",
        delegadoParaId: 2,
      });
      // Verificar que demanda foi atualizada
      const demanda = await caller.demandas.get({ id: 1 });
      expect(demanda.delegadoParaId).toBe(2);
    });
  });
});
```

- [ ] **Step 2.2: Rodar testes (devem falhar — router não existe)**

```bash
pnpm vitest run src/lib/trpc/routers/__tests__/registros.test.ts
```

Expected: FAIL com "registros router not found".

- [ ] **Step 2.3: Implementar router**

Copiar estrutura de `src/lib/trpc/routers/atendimentos.ts` (874 linhas) como base. Mudanças:
- `atendimentos` → `registros` em todos os imports/queries
- `dataAtendimento` → `dataRegistro`
- `resumo` → `conteudo`
- `atendidoPorId` → `autorId`
- Adicionar filtros opcionais: `demandaId`, `audienciaId`, `tipo` (string)
- No `create`/`update`: se `tipo === 'delegacao'` e `demandaId` informado, atualizar `demandas.delegadoParaId`, `dataDelegacao`, `motivoDelegacao`, `statusDelegacao` na mesma transação
- Schema Zod do `tipo`: `z.enum(['atendimento','diligencia','anotacao','providencia','delegacao','pesquisa','elaboracao'])`

```ts
// src/lib/trpc/routers/registros.ts
import { z } from "zod";
import { eq, and, desc, isNull, or } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { registros, demandas } from "@/lib/db/schema";

const TIPO_REGISTRO = z.enum([
  "atendimento", "diligencia", "anotacao",
  "providencia", "delegacao", "pesquisa", "elaboracao",
]);

export const registrosRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      assistidoId: z.number().optional(),
      processoId: z.number().optional(),
      demandaId: z.number().optional(),
      audienciaId: z.number().optional(),
      tipo: TIPO_REGISTRO.optional(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.assistidoId) conditions.push(eq(registros.assistidoId, input.assistidoId));
      if (input.processoId) conditions.push(eq(registros.processoId, input.processoId));
      if (input.demandaId) conditions.push(eq(registros.demandaId, input.demandaId));
      if (input.audienciaId) conditions.push(eq(registros.audienciaId, input.audienciaId));
      if (input.tipo) conditions.push(eq(registros.tipo, input.tipo));

      return await ctx.db.query.registros.findMany({
        where: conditions.length ? and(...conditions) : undefined,
        orderBy: [desc(registros.dataRegistro), desc(registros.id)],
        limit: input.limit,
        with: { autor: { columns: { id: true, name: true, image: true } } },
      });
    }),

  create: protectedProcedure
    .input(z.object({
      tipo: TIPO_REGISTRO,
      assistidoId: z.number(),
      processoId: z.number().optional(),
      demandaId: z.number().optional(),
      audienciaId: z.number().optional(),
      titulo: z.string().max(120).optional(),
      conteudo: z.string(),
      dataRegistro: z.date().optional(),
      interlocutor: z.string().optional(),
      delegadoParaId: z.number().optional(), // só usado quando tipo='delegacao'
      motivoDelegacao: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.transaction(async (tx) => {
        const [registro] = await tx.insert(registros).values({
          tipo: input.tipo,
          assistidoId: input.assistidoId,
          processoId: input.processoId,
          demandaId: input.demandaId,
          audienciaId: input.audienciaId,
          titulo: input.titulo,
          conteudo: input.conteudo,
          dataRegistro: input.dataRegistro ?? new Date(),
          interlocutor: input.interlocutor ?? "assistido",
          autorId: ctx.session.user.id,
          status: "realizado",
        }).returning();

        // Side-effect: delegação atualiza demanda
        if (input.tipo === "delegacao" && input.demandaId && input.delegadoParaId) {
          await tx.update(demandas).set({
            delegadoParaId: input.delegadoParaId,
            dataDelegacao: new Date(),
            motivoDelegacao: input.motivoDelegacao ?? input.conteudo,
            statusDelegacao: "delegada",
            updatedAt: new Date(),
          }).where(eq(demandas.id, input.demandaId));
        }
        return registro;
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().max(120).optional(),
      conteudo: z.string().optional(),
      tipo: TIPO_REGISTRO.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db.update(registros)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(registros.id, input.id))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(registros).where(eq(registros.id, input.id));
      return { ok: true };
    }),
});
```

- [ ] **Step 2.4: Registrar router em `_app.ts`/`root.ts`**

Adicionar em `appRouter`: `registros: registrosRouter`. Manter `atendimentos: atendimentosRouter` por enquanto (compat) — apontando para o mesmo router exportado de `registros.ts`.

- [ ] **Step 2.5: Rodar testes — devem passar**

```bash
pnpm vitest run src/lib/trpc/routers/__tests__/registros.test.ts
```
Expected: PASS em todos os casos.

- [ ] **Step 2.6: Commit**

```bash
git add src/lib/trpc/routers/registros.ts src/lib/trpc/routers/__tests__/registros.test.ts src/lib/trpc/root.ts
git commit -m "feat(registros): tRPC router com filtros por contexto + delegacao side-effect"
```

---

## Task 3: Atualizar referências `atendimentos` → `registros` no código

**Files:**
- Modify: ~64 arquivos que importam ou usam `atendimentos` (rg para encontrar)

- [ ] **Step 3.1: Mapear arquivos a tocar**

```bash
grep -rln "atendimentos\b" src/ --include="*.ts" --include="*.tsx" > /tmp/atendimentos-refs.txt
wc -l /tmp/atendimentos-refs.txt
```

- [ ] **Step 3.2: Substituir em batch onde seguro (queries Drizzle, imports do schema)**

Estratégia: ao invés de rename total nesta task, criar o alias no schema (já feito na Task 1.1: `export const atendimentos = registros`) e migrar arquivos só quando necessário pra evitar breakage massivo.

**Para cada arquivo do grep:**
- Se importa `atendimentos` do schema: substituir por `registros` quando o nome `atendimentos` é usado SÓ como tabela. Se for nome de variável/state, deixar.
- Se usa `dataAtendimento`, `resumo`, `atendidoPorId` em queries Drizzle ORM: trocar para `dataRegistro`, `conteudo`, `autorId`.

Priorizar tocar em ordem:
1. Routers tRPC que selecionam de `atendimentos` direto (não via schema relations) — devem usar `registros`
2. Componentes UI que renderizam — manter prop names, só ajustar campos lidos do server

**Smoke test após cada batch:**
```bash
pnpm tsc --noEmit | grep "registros\|atendimentos" | head -20
```
Erros que apareçam → corrigir antes de seguir.

- [ ] **Step 3.3: Atualizar `atendimentosRouter` para re-exportar `registrosRouter`**

```ts
// src/lib/trpc/routers/atendimentos.ts
export { registrosRouter as atendimentosRouter } from "./registros";
// Mantém compat de chamadas como `api.atendimentos.list(...)` por 1 release.
```

- [ ] **Step 3.4: Validar build completo**

```bash
pnpm tsc --noEmit
pnpm build
```

Expected: sem novos erros relacionados a `atendimentos` ou `registros`. Erros pré-existentes (do baseline anotado) podem permanecer.

- [ ] **Step 3.5: Commit**

```bash
git add -A
git commit -m "refactor(registros): atualiza referências atendimentos → registros + alias compat"
```

---

## Task 4: Componente `<RegistrosTimeline>` reutilizável

**Files:**
- Create: `src/components/registros/registros-timeline.tsx`
- Create: `src/components/registros/registro-card.tsx`
- Create: `src/components/registros/registro-tipo-config.ts`
- Create: `src/components/registros/registro-tipo-chip.tsx`
- Create: `src/components/registros/__tests__/registros-timeline.test.tsx`

- [ ] **Step 4.1: Config de tipos (cores/ícones/labels)**

```ts
// src/components/registros/registro-tipo-config.ts
import { Users, MapPin, StickyNote, CheckSquare, Send, BookOpen, Pen, type LucideIcon } from "lucide-react";

export type TipoRegistro =
  | "atendimento" | "diligencia" | "anotacao"
  | "providencia" | "delegacao" | "pesquisa" | "elaboracao";

interface TipoConfig {
  label: string;
  shortLabel: string;
  color: string;       // hex pra style inline
  bg: string;          // tw class
  text: string;        // tw class
  Icon: LucideIcon;
}

export const REGISTRO_TIPOS: Record<TipoRegistro, TipoConfig> = {
  atendimento: { label: "Atendimento", shortLabel: "Atend.", color: "#10b981", bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", Icon: Users },
  diligencia:  { label: "Diligência",  shortLabel: "Dilig.", color: "#f59e0b", bg: "bg-amber-50 dark:bg-amber-950/30",     text: "text-amber-700 dark:text-amber-400",     Icon: MapPin },
  anotacao:    { label: "Anotação",    shortLabel: "Anot.",  color: "#64748b", bg: "bg-slate-50 dark:bg-slate-900/40",     text: "text-slate-700 dark:text-slate-400",     Icon: StickyNote },
  providencia: { label: "Providência", shortLabel: "Prov.",  color: "#3b82f6", bg: "bg-blue-50 dark:bg-blue-950/30",       text: "text-blue-700 dark:text-blue-400",       Icon: CheckSquare },
  delegacao:   { label: "Delegação",   shortLabel: "Deleg.", color: "#a855f7", bg: "bg-purple-50 dark:bg-purple-950/30",   text: "text-purple-700 dark:text-purple-400",   Icon: Send },
  pesquisa:    { label: "Pesquisa",    shortLabel: "Pesq.",  color: "#6366f1", bg: "bg-indigo-50 dark:bg-indigo-950/30",   text: "text-indigo-700 dark:text-indigo-400",   Icon: BookOpen },
  elaboracao:  { label: "Elaboração",  shortLabel: "Elab.",  color: "#8b5cf6", bg: "bg-violet-50 dark:bg-violet-950/30",   text: "text-violet-700 dark:text-violet-400",   Icon: Pen },
};

export const TIPO_KEYS = Object.keys(REGISTRO_TIPOS) as TipoRegistro[];
```

- [ ] **Step 4.2: Componente chip**

```tsx
// src/components/registros/registro-tipo-chip.tsx
"use client";
import { cn } from "@/lib/utils";
import { REGISTRO_TIPOS, type TipoRegistro } from "./registro-tipo-config";

export function RegistroTipoChip({ tipo, size = "sm" }: { tipo: TipoRegistro; size?: "sm" | "xs" }) {
  const cfg = REGISTRO_TIPOS[tipo];
  const Icon = cfg.Icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md font-medium",
      cfg.bg, cfg.text,
      size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
    )}>
      <Icon className={size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      {cfg.shortLabel}
    </span>
  );
}
```

- [ ] **Step 4.3: Card individual**

```tsx
// src/components/registros/registro-card.tsx
"use client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Edit3, Trash2, Mic } from "lucide-react";
import { RegistroTipoChip } from "./registro-tipo-chip";
import type { TipoRegistro } from "./registro-tipo-config";

interface Props {
  registro: {
    id: number;
    tipo: TipoRegistro;
    titulo?: string | null;
    conteudo: string | null;
    dataRegistro: Date | string;
    autor?: { name: string | null } | null;
    audioUrl?: string | null;
    transcricaoStatus?: string | null;
  };
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function RegistroCard({ registro, onEdit, onDelete }: Props) {
  const data = typeof registro.dataRegistro === "string" ? new Date(registro.dataRegistro) : registro.dataRegistro;
  const hasAudio = !!registro.audioUrl;
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3.5 space-y-2 group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <RegistroTipoChip tipo={registro.tipo} />
          {hasAudio && <Mic className="w-3 h-3 text-neutral-400" />}
          <span className="text-[11px] text-neutral-500 dark:text-neutral-500">
            {format(data, "dd 'de' MMM, HH:mm", { locale: ptBR })}
          </span>
          {registro.autor?.name && (
            <span className="text-[11px] text-neutral-500 dark:text-neutral-500">
              · {registro.autor.name}
            </span>
          )}
        </div>
        <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex gap-1">
          {onEdit && (
            <button onClick={() => onEdit(registro.id)} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800" title="Editar">
              <Edit3 className="w-3.5 h-3.5 text-neutral-500" />
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(registro.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40" title="Excluir">
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </button>
          )}
        </div>
      </div>
      {registro.titulo && (
        <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{registro.titulo}</h4>
      )}
      {registro.conteudo && (
        <p className="text-[13px] text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
          {registro.conteudo}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4.4: Timeline (lista + filtro)**

```tsx
// src/components/registros/registros-timeline.tsx
"use client";
import { useState, useMemo } from "react";
import { api } from "@/lib/trpc/react";
import { RegistroCard } from "./registro-card";
import { RegistroTipoChip } from "./registro-tipo-chip";
import { TIPO_KEYS, REGISTRO_TIPOS, type TipoRegistro } from "./registro-tipo-config";
import { cn } from "@/lib/utils";

interface Props {
  assistidoId?: number;
  processoId?: number;
  demandaId?: number;
  audienciaId?: number;
  tiposPermitidos?: TipoRegistro[];
  emptyHint?: string;
  onEdit?: (id: number) => void;
}

export function RegistrosTimeline({
  assistidoId, processoId, demandaId, audienciaId,
  tiposPermitidos, emptyHint, onEdit,
}: Props) {
  const [filtroTipo, setFiltroTipo] = useState<TipoRegistro | null>(null);

  const { data: registros = [], refetch } = api.registros.list.useQuery({
    assistidoId, processoId, demandaId, audienciaId,
    tipo: filtroTipo ?? undefined,
  });

  const deleteMut = api.registros.delete.useMutation({ onSuccess: () => refetch() });

  const tipos = tiposPermitidos ?? TIPO_KEYS;
  const counts = useMemo(() => {
    const c = new Map<TipoRegistro, number>();
    registros.forEach(r => c.set(r.tipo as TipoRegistro, (c.get(r.tipo as TipoRegistro) ?? 0) + 1));
    return c;
  }, [registros]);

  return (
    <div className="space-y-3">
      {/* Filtro */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => setFiltroTipo(null)}
          className={cn(
            "text-[11px] px-2 py-1 rounded-md font-medium transition-colors",
            !filtroTipo ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          )}
        >Todos ({registros.length})</button>
        {tipos.map(t => {
          const cfg = REGISTRO_TIPOS[t];
          const isActive = filtroTipo === t;
          const count = counts.get(t) ?? 0;
          return (
            <button
              key={t}
              onClick={() => setFiltroTipo(isActive ? null : t)}
              className={cn(
                "text-[11px] px-2 py-1 rounded-md font-medium transition-colors flex items-center gap-1",
                isActive ? "ring-2 ring-offset-1 dark:ring-offset-neutral-900" : "opacity-70 hover:opacity-100",
                cfg.bg, cfg.text
              )}
              style={{ ['--tw-ring-color' as any]: cfg.color }}
            >
              <cfg.Icon className="w-3 h-3" />
              {cfg.shortLabel}
              {count > 0 && <span className="opacity-60">·{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {registros.length === 0 ? (
        <p className="text-[13px] text-neutral-500 dark:text-neutral-500 italic px-1 py-4">
          {emptyHint ?? "Nenhum registro ainda."}
        </p>
      ) : (
        <div className="space-y-2">
          {registros.map(r => (
            <RegistroCard
              key={r.id}
              registro={r as any}
              onEdit={onEdit}
              onDelete={(id) => {
                if (confirm("Excluir este registro?")) deleteMut.mutate({ id });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4.5: Teste do componente (smoke)**

```tsx
// src/components/registros/__tests__/registros-timeline.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RegistroTipoChip } from "../registro-tipo-chip";

describe("RegistroTipoChip", () => {
  it("renders correct label per tipo", () => {
    render(<RegistroTipoChip tipo="atendimento" />);
    expect(screen.getByText("Atend.")).toBeInTheDocument();
  });
  it("renders all 7 tipos without error", () => {
    const tipos = ["atendimento","diligencia","anotacao","providencia","delegacao","pesquisa","elaboracao"] as const;
    tipos.forEach(t => render(<RegistroTipoChip tipo={t} />));
  });
});
```

```bash
pnpm vitest run src/components/registros/__tests__/registros-timeline.test.tsx
```

Expected: PASS.

- [ ] **Step 4.6: Commit**

```bash
git add src/components/registros/
git commit -m "feat(registros): timeline component reusável + 7 tipos com cores/ícones"
```

---

## Task 5: Editor inline `<RegistroEditor>` + botão `+ Novo`

**Files:**
- Create: `src/components/registros/registro-editor.tsx`
- Create: `src/components/registros/novo-registro-button.tsx`

- [ ] **Step 5.1: Editor inline**

```tsx
// src/components/registros/registro-editor.tsx
"use client";
import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/trpc/react";
import { TIPO_KEYS, REGISTRO_TIPOS, type TipoRegistro } from "./registro-tipo-config";
import { cn } from "@/lib/utils";

interface Props {
  assistidoId: number;
  processoId?: number;
  demandaId?: number;
  audienciaId?: number;
  tipoDefault: TipoRegistro;
  tiposPermitidos?: TipoRegistro[];
  onSaved?: () => void;
  onCancel?: () => void;
}

export function RegistroEditor({
  assistidoId, processoId, demandaId, audienciaId,
  tipoDefault, tiposPermitidos, onSaved, onCancel,
}: Props) {
  const [tipo, setTipo] = useState<TipoRegistro>(tipoDefault);
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const utils = api.useUtils();

  const create = api.registros.create.useMutation({
    onSuccess: () => {
      utils.registros.list.invalidate();
      setConteudo("");
      setTitulo("");
      onSaved?.();
    },
  });

  const tipos = tiposPermitidos ?? TIPO_KEYS;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 p-3 space-y-2.5">
      {/* Tipo selector */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {tipos.map(t => {
          const cfg = REGISTRO_TIPOS[t];
          const active = tipo === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={cn(
                "text-[11px] px-2 py-1 rounded-md font-medium transition-all flex items-center gap-1",
                active ? "ring-2 ring-offset-1 dark:ring-offset-neutral-900 scale-[1.02]" : "opacity-60 hover:opacity-100",
                cfg.bg, cfg.text
              )}
              style={{ ['--tw-ring-color' as any]: cfg.color }}
            >
              <cfg.Icon className="w-3 h-3" />
              {cfg.shortLabel}
            </button>
          );
        })}
      </div>

      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título (opcional)"
        className="w-full bg-transparent text-sm font-semibold text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none border-b border-neutral-200 dark:border-neutral-800 pb-1.5 focus:border-neutral-400"
        maxLength={120}
      />

      <textarea
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
        placeholder="O que aconteceu..."
        rows={3}
        className="w-full bg-transparent text-[13px] text-neutral-700 dark:text-neutral-300 placeholder:text-neutral-400 outline-none resize-none"
      />

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 text-[11px]">
            Cancelar
          </Button>
        )}
        <Button
          size="sm"
          disabled={!conteudo.trim() || create.isPending}
          onClick={() => create.mutate({
            tipo, assistidoId, processoId, demandaId, audienciaId,
            titulo: titulo || undefined,
            conteudo: conteudo.trim(),
          })}
          className="h-7 text-[11px]"
        >
          {create.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5.2: Botão "+ Novo registro"**

```tsx
// src/components/registros/novo-registro-button.tsx
"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RegistroEditor } from "./registro-editor";
import type { TipoRegistro } from "./registro-tipo-config";

interface Props {
  assistidoId: number;
  processoId?: number;
  demandaId?: number;
  audienciaId?: number;
  tipoDefault: TipoRegistro;
  tiposPermitidos?: TipoRegistro[];
  label?: string;
}

export function NovoRegistroButton(props: Props) {
  const [open, setOpen] = useState(false);
  if (open) {
    return (
      <RegistroEditor
        {...props}
        onSaved={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    );
  }
  return (
    <Button
      onClick={() => setOpen(true)}
      variant="outline"
      size="sm"
      className="w-full justify-center gap-1.5 h-9 border-dashed text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
    >
      <Plus className="w-3.5 h-3.5" />
      {props.label ?? "Novo registro"}
    </Button>
  );
}
```

- [ ] **Step 5.3: Commit**

```bash
git add src/components/registros/registro-editor.tsx src/components/registros/novo-registro-button.tsx
git commit -m "feat(registros): editor inline + botão novo registro"
```

---

## Task 6: Substituir textarea "Providências" da demanda pela timeline

**Files:**
- Modify: `src/components/demandas-premium/demandas-premium-view.tsx` (achar bloco "Providências" / "Ação")
- Modify: rotas tRPC `demandas.update` se rejeitar `providencias` field (após Task 1.5 dropar coluna)

- [ ] **Step 6.1: Localizar bloco atual de Providências**

```bash
grep -n "Providências\|providencias\|providenciaResumo" src/components/demandas-premium/demandas-premium-view.tsx
```

- [ ] **Step 6.2: Substituir o bloco**

Onde hoje há `<textarea value={demanda.providencias} ...>`, trocar por:

```tsx
import { RegistrosTimeline } from "@/components/registros/registros-timeline";
import { NovoRegistroButton } from "@/components/registros/novo-registro-button";

// dentro do bloco "Ação":
<div className="space-y-3">
  <NovoRegistroButton
    assistidoId={demanda.assistidoId}
    processoId={demanda.processoId}
    demandaId={demanda.id}
    tipoDefault="providencia"
    label="Adicionar registro"
  />
  <RegistrosTimeline
    assistidoId={demanda.assistidoId}
    processoId={demanda.processoId}
    demandaId={demanda.id}
    emptyHint="Sem registros nesta demanda."
  />
</div>
```

Remover `handleProvidenciasChange`, `providencias` do form state, etc.

- [ ] **Step 6.3: Validar visualmente**

```bash
pnpm dev
```

Abrir uma demanda no browser, verificar:
- Timeline aparece no lugar do textarea
- Adicionar um registro de cada tipo funciona
- Filtro por tipo funciona
- Editar/excluir funciona

- [ ] **Step 6.4: Commit**

```bash
git add src/components/demandas-premium/demandas-premium-view.tsx
git commit -m "feat(demandas): substitui textarea Providencias pela timeline de registros tipados"
```

---

## Task 7: Adicionar timeline em ficha do assistido + processo + audiência

**Files:**
- Modify: `src/app/(dashboard)/admin/assistidos/[id]/page.tsx` (adicionar aba/seção)
- Modify: `src/components/processo/...` (página do processo — encontrar a estrutura de tabs)
- Modify: `src/components/agenda/registro-audiencia/tabs/tab-anotacoes.tsx` (adicionar timeline)

- [ ] **Step 7.1: Ficha do assistido**

Localizar onde estão as abas. Adicionar aba "Registros":

```tsx
<TabsContent value="registros">
  <NovoRegistroButton assistidoId={assistido.id} tipoDefault="atendimento" />
  <RegistrosTimeline assistidoId={assistido.id} emptyHint="Sem registros para este assistido." />
</TabsContent>
```

- [ ] **Step 7.2: Página do processo**

Mesma estrutura, com `processoId={processo.id}`, tipo default `atendimento`.

- [ ] **Step 7.3: Audiência (tab-anotacoes)**

Substituir/complementar o textarea de anotações pelo `RegistrosTimeline` filtrando por `audienciaId`. Tipo default: `anotacao`.

- [ ] **Step 7.4: Validar visualmente cada um**

Abrir browser, navegar pelas três páginas, criar 1 registro em cada contexto, confirmar que aparecem nos lugares certos:
- Registro criado na demanda → aparece também na ficha do assistido + processo
- Registro criado na ficha → aparece no processo se tiver `processoId`, mas NÃO em demanda específica

- [ ] **Step 7.5: Commit**

```bash
git add -A
git commit -m "feat(registros): timeline em ficha do assistido + processo + audiencia"
```

---

## Task 8: Duplicação de evento na agenda

**Files:**
- Modify: `src/components/agenda/day-events-sheet.tsx` (botão hover Copy)
- Modify: `src/components/agenda/event-detail-sheet.tsx` (item de menu)
- Modify: `src/app/(dashboard)/admin/agenda/page.tsx` (handler que abre `EventoCreateModal` com prefill)
- Modify: `src/components/agenda/evento-create-modal.tsx` (aceitar prop `prefill`)

- [ ] **Step 8.1: Adicionar prop `prefill` no `EventoCreateModal`**

Onde hoje recebe `defaultDate` etc., adicionar opção de pré-preencher:

```tsx
interface EventoCreateModalProps {
  // ...
  prefill?: {
    assistidoId?: number;
    processoId?: number;
    atribuicao?: string;
    tipo?: string;
    local?: string;
    duracao?: number;
    titulo?: string;  // sem assistido — só "Audiência" genérico
  };
}
```

E inicializar form com esses valores quando `prefill` for fornecido. NÃO copiar `descricao` nem `observacoes`.

- [ ] **Step 8.2: Handler no `agenda/page.tsx`**

```tsx
const handleDuplicateEvento = (evento: any) => {
  setQuickCreateData(undefined);
  setEventoPrefill({
    assistidoId: evento.assistidoId,
    processoId: evento.processoId,
    atribuicao: evento.atribuicao,
    tipo: evento.tipo,
    local: evento.local,
    duracao: evento.duracao,
  });
  setIsCreateModalOpen(true);
};
```

- [ ] **Step 8.3: Botão no day-events-sheet**

Adicionar entre os secundários (com Tooltip):

```tsx
{onDuplicate && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button onClick={(e) => { e.stopPropagation(); onDuplicate(evento); }}>
        <Copy className="w-3 h-3" />
      </Button>
    </TooltipTrigger>
    <TooltipContent side="top">Duplicar</TooltipContent>
  </Tooltip>
)}
```

- [ ] **Step 8.4: Item no event-detail-sheet**

Item de menu/botão "Duplicar evento" com mesmo handler.

- [ ] **Step 8.5: Wire up no `agenda/page.tsx`**

```tsx
<DayEventsSheet ... onDuplicate={handleDuplicateEvento} />
<CalendarMonthView ... onDuplicate={handleDuplicateEvento} />
```

(forward através do CalendarMonthView se necessário).

- [ ] **Step 8.6: Validar manualmente**

Browser:
- Clicar "Duplicar" num evento
- Modal abre com assistido + processo + tipo pré-preenchidos
- Data/hora em branco — usuário precisa escolher
- Salvar — novo evento aparece na agenda

- [ ] **Step 8.7: Commit**

```bash
git add -A
git commit -m "feat(agenda): duplicar evento prefilled (sem descricao/observacoes/data)"
```

---

## Task 9: Cleanup — drop `demanda.providencias` + remover compat aliases

**Pré-requisitos:** Tasks 1-8 mergeadas, smoke test em produção/staging por ao menos algumas horas.

**Files:**
- Create: `drizzle/migrations/00XX_drop_demanda_providencias.sql`
- Modify: `src/lib/db/schema/core.ts:272-273` (remover `providencias`, `providenciaResumo`)
- Modify: `src/lib/db/schema/agenda.ts` (remover aliases `atendimentos`/`Atendimento`)
- Modify: `src/lib/trpc/routers/atendimentos.ts` (deletar arquivo) + `_app.ts` (remover registro)

- [ ] **Step 9.1: Migration de drop**

```sql
-- drizzle/migrations/00XX_drop_demanda_providencias.sql
BEGIN;
ALTER TABLE demandas DROP COLUMN IF EXISTS providencias;
ALTER TABLE demandas DROP COLUMN IF EXISTS providencia_resumo;
COMMIT;
```

- [ ] **Step 9.2: Remover do schema Drizzle**

Em `src/lib/db/schema/core.ts:272-273`, deletar as duas linhas.

- [ ] **Step 9.3: Limpar usos remanescentes**

```bash
grep -rn "providencias\|providenciaResumo" src/ --include="*.ts" --include="*.tsx" | grep -v "registros\|node_modules"
```

Para cada hit: remover ou substituir. Atenção em export CSV (`'Providências'` em header de tab — substituir por algo derivado de registros).

- [ ] **Step 9.4: Remover aliases compat**

```ts
// src/lib/db/schema/agenda.ts — DELETAR:
export const atendimentos = registros;
export type Atendimento = Registro;
export type InsertAtendimento = InsertRegistro;
```

```bash
rm src/lib/trpc/routers/atendimentos.ts
```

Em `_app.ts`/`root.ts`: remover `atendimentos: atendimentosRouter`.

- [ ] **Step 9.5: Build + tests**

```bash
pnpm tsc --noEmit
pnpm vitest run
pnpm build
```

Expected: zero novos erros.

- [ ] **Step 9.6: Commit**

```bash
git add -A
git commit -m "chore(registros): drop demanda.providencias + remove atendimentos compat aliases"
```

---

## Task 10: Final review + merge

- [ ] **Step 10.1: Diff completo da feature**

```bash
git log --oneline origin/main..HEAD
git diff origin/main...HEAD --stat
```

- [ ] **Step 10.2: Smoke test end-to-end**

- Criar registro de cada tipo numa demanda
- Verificar que aparecem em ficha + processo + audiência
- Tipo `delegacao` numa demanda atualiza `delegadoParaId`
- Duplicar evento funciona
- Importação de atendimentos do Plaud continua funcionando (legado)

- [ ] **Step 10.3: Type-check + tests + build**

```bash
pnpm tsc --noEmit
pnpm vitest run
pnpm build
```

- [ ] **Step 10.4: Push branch + merge para main**

```bash
git push -u origin feat/registros-tipados
# Pelo workflow Defender: merge direto + push, conforme padrão recente.
```

---

## Self-Review

**Spec coverage:**
- ✅ 7 tipos (atendimento/diligência/anotação/providência/delegação/pesquisa/elaboração) → Task 4.1
- ✅ Timeline em demanda/ficha/processo/audiência → Tasks 6 + 7
- ✅ Conteúdo manual (sem Plaud) → Task 5 editor textarea livre
- ✅ Delegação atualiza demanda → Task 2.3 transaction
- ✅ Duplicar evento → Task 8
- ✅ Drop providencias → Task 9
- ✅ Não copia descrição ao duplicar → Task 8.1 explícito

**Type consistency:**
- `tipo: TipoRegistro` consistente em config + zod + schema (varchar(30))
- `dataRegistro: Date` consistente entre schema e props
- `autorId` consistente após rename

**Placeholders scan:** Sem TBD/TODO/etc.

**Risk reminders no plano:**
- 64 arquivos referenciam `atendimentos` — Task 3 endereça com alias gradual
- Build pode quebrar em arquivos que importam direto da tabela — type-check após cada batch
- Migration em produção: validar count(providencias) antes/depois do backfill
