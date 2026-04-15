# Cowork Encaminhamentos — Fase 1 (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir backend completo de Encaminhamentos (schema + API tRPC + notificações + migração de `pareceres`), entregando um sistema testável por API antes de construir a UI nova.

**Architecture:** 5 novas tabelas Postgres (`encaminhamentos`, `encaminhamento_destinatarios`, `encaminhamento_respostas`, `encaminhamento_anexos`, `demandas_acompanhantes`). Router tRPC `encaminhamentos` com endpoints de listagem, criação, transição de estado e resposta. Notificações orquestradas via Inngest event `cowork/encaminhamento.criado`, com dispatch para in-app (tabela `notifications` existente) e WhatsApp (via `evolution-api.ts` existente). Migração one-shot de `pareceres` para a nova estrutura, preservando todos os dados.

**Tech Stack:** Drizzle ORM, Postgres (Supabase), tRPC, Vitest, Inngest, evolution-api.

**Spec de referência:** `docs/superpowers/specs/2026-04-15-cowork-encaminhamentos-design.md`

**Escopo fora desta fase:** UI nova (aba Cowork, modal, inbox) — será coberta na Fase 2, plano separado após Fase 1 mergear.

---

## File Structure

**Criar:**
- `src/lib/services/encaminhamentos-notifier.ts` — orquestrador de notificações (in-app + WhatsApp); ~150 linhas
- `src/lib/trpc/routers/encaminhamentos.ts` — router tRPC com 10 endpoints; ~400 linhas
- `scripts/migrate-pareceres-to-encaminhamentos.ts` — migração one-shot; ~100 linhas
- `__tests__/trpc/encaminhamentos.test.ts` — testes de router; ~300 linhas
- `__tests__/services/encaminhamentos-notifier.test.ts` — testes de notifier; ~150 linhas
- `drizzle/XXXX_cowork_encaminhamentos.sql` — migration gerada pelo drizzle-kit

**Modificar:**
- `src/lib/db/schema/cowork.ts` — adicionar 5 novas tabelas + relations
- `src/lib/trpc/routers/index.ts` — registrar `encaminhamentosRouter`
- `src/lib/inngest/client.ts` — declarar event `cowork/encaminhamento.criado`
- `src/lib/inngest/functions.ts` — adicionar `dispatchEncaminhamentoNotificacaoFn` + registrar no array `functions`

---

### Task 1: Adicionar tabelas ao schema

**Files:**
- Modify: `src/lib/db/schema/cowork.ts`

- [ ] **Step 1: Adicionar imports e tabelas ao topo do arquivo**

Abrir `src/lib/db/schema/cowork.ts` e adicionar logo após o import existente:

```ts
import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users, processos, assistidos, demandas, workspaces } from "./core";
```

Se `workspaces` não está exportado ainda em `./core`, verificar `src/lib/db/schema/core.ts` e adicionar ao export se necessário. `demandas` já deve estar exportado.

- [ ] **Step 2: Adicionar tabela `encaminhamentos` ao final do arquivo (antes das `relations`)**

```ts
// ==========================================
// COWORK - ENCAMINHAMENTOS (fase 1 — backend)
// ==========================================

export const encaminhamentos = pgTable("encaminhamentos", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),

  remetenteId: integer("remetente_id").notNull().references(() => users.id),

  tipo: varchar("tipo", { length: 20 }).notNull(),
  // 'transferir' | 'encaminhar' | 'acompanhar' | 'anotar' | 'parecer'

  titulo: varchar("titulo", { length: 200 }),
  mensagem: text("mensagem").notNull(),

  demandaId: integer("demanda_id").references(() => demandas.id),
  processoId: integer("processo_id").references(() => processos.id),
  assistidoId: integer("assistido_id").references(() => assistidos.id),

  status: varchar("status", { length: 20 }).notNull().default("pendente"),
  // 'pendente' | 'ciente' | 'aceito' | 'recusado' | 'respondido' | 'concluido' | 'arquivado' | 'cancelado'
  urgencia: varchar("urgencia", { length: 10 }).notNull().default("normal"),

  notificarOmbuds: boolean("notificar_ombuds").notNull().default(true),
  notificarWhatsapp: boolean("notificar_whatsapp").notNull().default(false),
  notificarEmail: boolean("notificar_email").notNull().default(false),

  concluidoEm: timestamp("concluido_em"),
  concluidoPorId: integer("concluido_por_id").references(() => users.id),
  motivoRecusa: text("motivo_recusa"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("enc_workspace_idx").on(table.workspaceId),
  index("enc_remetente_idx").on(table.remetenteId),
  index("enc_demanda_idx").on(table.demandaId),
  index("enc_status_idx").on(table.status),
  index("enc_created_idx").on(table.createdAt),
]);

export type Encaminhamento = typeof encaminhamentos.$inferSelect;
export type InsertEncaminhamento = typeof encaminhamentos.$inferInsert;
```

- [ ] **Step 3: Adicionar tabelas de destinatários, respostas, anexos e acompanhantes**

```ts
export const encaminhamentoDestinatarios = pgTable("encaminhamento_destinatarios", {
  id: serial("id").primaryKey(),
  encaminhamentoId: integer("encaminhamento_id").notNull()
    .references(() => encaminhamentos.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  estadoPessoal: varchar("estado_pessoal", { length: 20 }).notNull().default("pendente"),
  lidoEm: timestamp("lido_em"),
  cienteEm: timestamp("ciente_em"),
}, (table) => [
  uniqueIndex("enc_dest_unique").on(table.encaminhamentoId, table.userId),
  index("enc_dest_user_idx").on(table.userId),
]);

export type EncaminhamentoDestinatario = typeof encaminhamentoDestinatarios.$inferSelect;

export const encaminhamentoRespostas = pgTable("encaminhamento_respostas", {
  id: serial("id").primaryKey(),
  encaminhamentoId: integer("encaminhamento_id").notNull()
    .references(() => encaminhamentos.id, { onDelete: "cascade" }),
  autorId: integer("autor_id").notNull().references(() => users.id),
  mensagem: text("mensagem").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("enc_resp_enc_idx").on(table.encaminhamentoId),
]);

export type EncaminhamentoResposta = typeof encaminhamentoRespostas.$inferSelect;

export const encaminhamentoAnexos = pgTable("encaminhamento_anexos", {
  id: serial("id").primaryKey(),
  encaminhamentoId: integer("encaminhamento_id")
    .references(() => encaminhamentos.id, { onDelete: "cascade" }),
  respostaId: integer("resposta_id")
    .references(() => encaminhamentoRespostas.id, { onDelete: "cascade" }),
  tipo: varchar("tipo", { length: 20 }).notNull(), // 'audio' | 'drive' | 'upload'
  driveFileId: varchar("drive_file_id", { length: 80 }),
  storageUrl: text("storage_url"),
  nome: varchar("nome", { length: 200 }),
  sizeBytes: integer("size_bytes"),
  duracaoSeg: integer("duracao_seg"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EncaminhamentoAnexo = typeof encaminhamentoAnexos.$inferSelect;

export const demandasAcompanhantes = pgTable("demandas_acompanhantes", {
  id: serial("id").primaryKey(),
  demandaId: integer("demanda_id").notNull()
    .references(() => demandas.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  origemEncaminhamentoId: integer("origem_encaminhamento_id")
    .references(() => encaminhamentos.id, { onDelete: "set null" }),
  notificarAlteracoes: boolean("notificar_alteracoes").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("dem_acomp_unique").on(table.demandaId, table.userId),
  index("dem_acomp_user_idx").on(table.userId),
]);

export type DemandaAcompanhante = typeof demandasAcompanhantes.$inferSelect;
```

- [ ] **Step 4: Adicionar relations ao final do arquivo**

```ts
export const encaminhamentosRelations = relations(encaminhamentos, ({ one, many }) => ({
  remetente: one(users, { fields: [encaminhamentos.remetenteId], references: [users.id] }),
  concluidoPor: one(users, { fields: [encaminhamentos.concluidoPorId], references: [users.id] }),
  demanda: one(demandas, { fields: [encaminhamentos.demandaId], references: [demandas.id] }),
  processo: one(processos, { fields: [encaminhamentos.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [encaminhamentos.assistidoId], references: [assistidos.id] }),
  destinatarios: many(encaminhamentoDestinatarios),
  respostas: many(encaminhamentoRespostas),
  anexos: many(encaminhamentoAnexos),
}));

export const encaminhamentoDestinatariosRelations = relations(encaminhamentoDestinatarios, ({ one }) => ({
  encaminhamento: one(encaminhamentos, {
    fields: [encaminhamentoDestinatarios.encaminhamentoId],
    references: [encaminhamentos.id],
  }),
  user: one(users, { fields: [encaminhamentoDestinatarios.userId], references: [users.id] }),
}));

export const encaminhamentoRespostasRelations = relations(encaminhamentoRespostas, ({ one, many }) => ({
  encaminhamento: one(encaminhamentos, {
    fields: [encaminhamentoRespostas.encaminhamentoId],
    references: [encaminhamentos.id],
  }),
  autor: one(users, { fields: [encaminhamentoRespostas.autorId], references: [users.id] }),
  anexos: many(encaminhamentoAnexos),
}));

export const demandasAcompanhantesRelations = relations(demandasAcompanhantes, ({ one }) => ({
  demanda: one(demandas, { fields: [demandasAcompanhantes.demandaId], references: [demandas.id] }),
  user: one(users, { fields: [demandasAcompanhantes.userId], references: [users.id] }),
  origemEncaminhamento: one(encaminhamentos, {
    fields: [demandasAcompanhantes.origemEncaminhamentoId],
    references: [encaminhamentos.id],
  }),
}));
```

- [ ] **Step 5: Verificar compilação TypeScript**

Run: `npx tsc --noEmit 2>&1 | grep -E "cowork\.ts" | head`
Expected: nenhuma saída (sem erros no arquivo).

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema/cowork.ts
git commit -m "feat(cowork): add encaminhamentos schema (5 new tables)"
```

---

### Task 2: Gerar e aplicar migration

**Files:**
- Create: `drizzle/XXXX_cowork_encaminhamentos.sql` (gerado)

- [ ] **Step 1: Gerar migration via drizzle-kit**

Run: `npm run db:generate -- --name cowork_encaminhamentos`
Expected: arquivo `drizzle/NNNN_cowork_encaminhamentos.sql` criado com `CREATE TABLE` para as 5 tabelas + índices.

- [ ] **Step 2: Inspecionar migration gerada**

Run: `ls -la drizzle/*.sql | tail -1`

Abrir o arquivo criado e verificar que contém:
- `CREATE TABLE "encaminhamentos"` com todas as colunas
- `CREATE TABLE "encaminhamento_destinatarios"` com `ON DELETE CASCADE` no FK
- `CREATE TABLE "encaminhamento_respostas"` com `ON DELETE CASCADE`
- `CREATE TABLE "encaminhamento_anexos"` (sem cascades incompatíveis)
- `CREATE TABLE "demandas_acompanhantes"` com unique index
- Todos os índices listados na Task 1

- [ ] **Step 3: Aplicar migration em dev**

Run: `npm run db:push`
Expected: saída "✓ Changes applied" e as tabelas criadas.

- [ ] **Step 4: Verificar no banco via psql-ish**

```bash
node -e "
const {Pool} = require('pg');
const p = new Pool({connectionString: process.env.DATABASE_URL});
(async()=>{
  const r = await p.query(\`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name LIKE 'encaminhamento%' OR table_name='demandas_acompanhantes'
    ORDER BY table_name
  \`);
  console.table(r.rows);
  await p.end();
})();
"
```
Expected: 5 linhas: `demandas_acompanhantes`, `encaminhamento_anexos`, `encaminhamento_destinatarios`, `encaminhamento_respostas`, `encaminhamentos`.

- [ ] **Step 5: Commit**

```bash
git add drizzle/
git commit -m "feat(cowork): drizzle migration for encaminhamentos tables"
```

---

### Task 3: Criar notifier service com teste

**Files:**
- Create: `src/lib/services/encaminhamentos-notifier.ts`
- Create: `__tests__/services/encaminhamentos-notifier.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

Criar `__tests__/services/encaminhamentos-notifier.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { buildWhatsappMessage, type NotifierContext } from "@/lib/services/encaminhamentos-notifier";

describe("buildWhatsappMessage", () => {
  it("formats transferir message with remetente and titulo", () => {
    const ctx: NotifierContext = {
      remetente: { id: 1, name: "Rodrigo Rocha Meire", phone: "+5571999999999" },
      destinatario: { id: 4, name: "Juliane Andrade", phone: "+5571888888888" },
      tipo: "transferir",
      titulo: "Maria Eliana — RA antes das férias",
      mensagem: "Vou entrar de férias dia 20/04, pode assumir?",
      url: "https://ombuds.vercel.app/cowork/enc/42",
    };
    const msg = buildWhatsappMessage(ctx);
    expect(msg).toContain("Rodrigo Rocha Meire");
    expect(msg).toContain("transferir");
    expect(msg).toContain("Maria Eliana — RA antes das férias");
    expect(msg).toContain("https://ombuds.vercel.app/cowork/enc/42");
  });

  it("uses a sensible fallback title when titulo is missing", () => {
    const ctx: NotifierContext = {
      remetente: { id: 1, name: "Rodrigo", phone: null },
      destinatario: { id: 4, name: "Juliane", phone: "+5571888888888" },
      tipo: "anotar",
      titulo: null,
      mensagem: "Mãe do Francisco ligou, pediu atualização sobre 17/04",
      url: "https://ombuds.vercel.app/cowork/enc/42",
    };
    const msg = buildWhatsappMessage(ctx);
    expect(msg).toContain("Mãe do Francisco ligou");
    // truncates long mensagem to ~80 chars
    expect(msg.length).toBeLessThan(400);
  });

  it("uses imperative verb per tipo", () => {
    const base: NotifierContext = {
      remetente: { id: 1, name: "R", phone: null },
      destinatario: { id: 2, name: "J", phone: "+55" },
      titulo: "caso X",
      mensagem: "teste",
      url: "https://x/1",
      tipo: "transferir",
    };
    expect(buildWhatsappMessage({ ...base, tipo: "transferir" })).toMatch(/transferiu|quer transferir/i);
    expect(buildWhatsappMessage({ ...base, tipo: "parecer" })).toMatch(/parecer|pergunta/i);
    expect(buildWhatsappMessage({ ...base, tipo: "encaminhar" })).toMatch(/encaminhou|ciência/i);
    expect(buildWhatsappMessage({ ...base, tipo: "anotar" })).toMatch(/anotou/i);
    expect(buildWhatsappMessage({ ...base, tipo: "acompanhar" })).toMatch(/acompanhar/i);
  });
});
```

- [ ] **Step 2: Rodar o teste pra ver falhar**

Run: `npx vitest run __tests__/services/encaminhamentos-notifier.test.ts`
Expected: falha com "Cannot find module '@/lib/services/encaminhamentos-notifier'".

- [ ] **Step 3: Criar o service**

Criar `src/lib/services/encaminhamentos-notifier.ts`:

```ts
/**
 * Orquestra notificações de encaminhamentos.
 *
 * Canais: in-app (tabela notifications existente) + WhatsApp (evolution-api).
 * Disparado via Inngest event "cowork/encaminhamento.criado".
 *
 * buildWhatsappMessage é pura e testável; dispatchNotificacoes depende de
 * infraestrutura e é integrada em testes manuais via Inngest.
 */

import { db } from "@/lib/db";
import { encaminhamentos, encaminhamentoDestinatarios } from "@/lib/db/schema/cowork";
import { users, notifications } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { sendWhatsappMessage } from "@/lib/services/evolution-api";

export type EncaminhamentoTipo =
  | "transferir" | "encaminhar" | "acompanhar" | "anotar" | "parecer";

export interface NotifierContext {
  remetente: { id: number; name: string; phone: string | null };
  destinatario: { id: number; name: string; phone: string | null };
  tipo: EncaminhamentoTipo;
  titulo: string | null;
  mensagem: string;
  url: string;
}

const VERB_PER_TIPO: Record<EncaminhamentoTipo, string> = {
  transferir: "quer transferir uma demanda para você",
  encaminhar: "encaminhou uma demanda para sua ciência",
  acompanhar: "pediu para acompanhar uma demanda sua",
  anotar: "anotou algo numa demanda sua",
  parecer: "está pedindo seu parecer",
};

function previewMensagem(mensagem: string, max = 120): string {
  const clean = mensagem.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

export function buildWhatsappMessage(ctx: NotifierContext): string {
  const verb = VERB_PER_TIPO[ctx.tipo];
  const preview = ctx.titulo
    ? `"${ctx.titulo}"`
    : `"${previewMensagem(ctx.mensagem, 80)}"`;
  return (
    `🔔 *${ctx.remetente.name}* ${verb} no OMBUDS:\n` +
    `${preview}\n\n` +
    `👉 ${ctx.url}`
  );
}

export function buildInappPayload(ctx: NotifierContext) {
  const verb = VERB_PER_TIPO[ctx.tipo];
  return {
    title: `${ctx.remetente.name} ${verb}`,
    body: ctx.titulo ?? previewMensagem(ctx.mensagem, 120),
    url: ctx.url,
  };
}

export async function dispatchNotificacoes(encaminhamentoId: number, appBaseUrl: string) {
  const [enc] = await db
    .select()
    .from(encaminhamentos)
    .where(eq(encaminhamentos.id, encaminhamentoId))
    .limit(1);
  if (!enc) throw new Error(`encaminhamento ${encaminhamentoId} não encontrado`);

  const destinatarios = await db
    .select()
    .from(encaminhamentoDestinatarios)
    .where(eq(encaminhamentoDestinatarios.encaminhamentoId, enc.id));

  const userIds = [enc.remetenteId, ...destinatarios.map((d) => d.userId)];
  const userRows = await db
    .select({ id: users.id, name: users.name, phone: users.phone })
    .from(users)
    .where(inArray(users.id, userIds));
  const userById = new Map(userRows.map((u) => [u.id, u]));

  const remetente = userById.get(enc.remetenteId);
  if (!remetente) return;

  const url = `${appBaseUrl}/admin/cowork?enc=${enc.id}`;

  for (const d of destinatarios) {
    const destUser = userById.get(d.userId);
    if (!destUser) continue;
    const ctx: NotifierContext = {
      remetente: { id: remetente.id, name: remetente.name ?? "Colega", phone: remetente.phone ?? null },
      destinatario: { id: destUser.id, name: destUser.name ?? "Colega", phone: destUser.phone ?? null },
      tipo: enc.tipo as EncaminhamentoTipo,
      titulo: enc.titulo ?? null,
      mensagem: enc.mensagem,
      url,
    };

    if (enc.notificarOmbuds) {
      const payload = buildInappPayload(ctx);
      await db.insert(notifications).values({
        userId: destUser.id,
        title: payload.title,
        body: payload.body,
        url: payload.url,
        kind: "encaminhamento",
      } as any).catch((e) => console.error("[notifier] in-app falhou:", e));
    }

    if (enc.notificarWhatsapp && destUser.phone) {
      const msg = buildWhatsappMessage(ctx);
      await sendWhatsappMessage(destUser.phone, msg).catch((e) =>
        console.error(`[notifier] whatsapp falhou para ${destUser.phone}:`, e),
      );
    }
  }
}
```

**NOTA:** `notifications` schema pode ter campos diferentes. Checar `src/lib/db/schema/` e ajustar. Se `kind` não existe, remover. Se `sendWhatsappMessage` tem assinatura diferente, adaptar. O que importa é que `buildWhatsappMessage` e `buildInappPayload` (funções puras) passem nos testes.

- [ ] **Step 4: Rodar testes — devem passar**

Run: `npx vitest run __tests__/services/encaminhamentos-notifier.test.ts`
Expected: 3 testes PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/encaminhamentos-notifier.ts __tests__/services/encaminhamentos-notifier.test.ts
git commit -m "feat(cowork): encaminhamentos notifier service (whatsapp + in-app)"
```

---

### Task 4: Inngest event + function

**Files:**
- Modify: `src/lib/inngest/client.ts`
- Modify: `src/lib/inngest/functions.ts`

- [ ] **Step 1: Adicionar schema do novo event no client**

Em `src/lib/inngest/client.ts`, localizar o bloco onde outros events são declarados e adicionar:

```ts
"cowork/encaminhamento.criado": {
  data: {
    encaminhamentoId: 0,
  },
},
```

- [ ] **Step 2: Adicionar função em `functions.ts`**

Ao final de `src/lib/inngest/functions.ts`, **antes** do array `functions = [...]`:

```ts
export const dispatchEncaminhamentoNotificacaoFn = inngest.createFunction(
  {
    id: "cowork-encaminhamento-notificar",
    name: "Notificar destinatários de encaminhamento",
    retries: 2,
  },
  { event: "cowork/encaminhamento.criado" },
  async ({ event, step }) => {
    const { encaminhamentoId } = event.data as { encaminhamentoId: number };
    await step.run("dispatch", async () => {
      const { dispatchNotificacoes } = await import(
        "@/lib/services/encaminhamentos-notifier"
      );
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ombuds.vercel.app";
      await dispatchNotificacoes(encaminhamentoId, baseUrl);
    });
    return { ok: true };
  },
);
```

- [ ] **Step 3: Registrar no array `functions`**

No array `functions = [...]` no final de `src/lib/inngest/functions.ts`, adicionar `dispatchEncaminhamentoNotificacaoFn`.

- [ ] **Step 4: Type check**

Run: `npx tsc --noEmit 2>&1 | grep -E "inngest" | head`
Expected: nenhum erro novo.

- [ ] **Step 5: Commit**

```bash
git add src/lib/inngest/client.ts src/lib/inngest/functions.ts
git commit -m "feat(cowork): inngest function for encaminhamento notifications"
```

---

### Task 5: Router tRPC — skeleton + endpoint `listar`

**Files:**
- Create: `src/lib/trpc/routers/encaminhamentos.ts`
- Modify: `src/lib/trpc/routers/index.ts`
- Create: `__tests__/trpc/encaminhamentos.test.ts`

- [ ] **Step 1: Criar skeleton do router com endpoint `listar`**

Criar `src/lib/trpc/routers/encaminhamentos.ts`:

```ts
import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import {
  encaminhamentos,
  encaminhamentoDestinatarios,
} from "@/lib/db/schema/cowork";
import { users } from "@/lib/db/schema";
import { eq, and, desc, inArray, isNull, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { inngest } from "@/lib/inngest/client";

const TIPO = z.enum([
  "transferir", "encaminhar", "acompanhar", "anotar", "parecer",
]);

const STATUS = z.enum([
  "pendente", "ciente", "aceito", "recusado",
  "respondido", "concluido", "arquivado", "cancelado",
]);

export const encaminhamentosRouter = router({
  listar: protectedProcedure
    .input(z.object({
      filtro: z.enum(["recebidos", "enviados", "arquivados"]),
      tipo: TIPO.optional(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const isRecebidos = input.filtro === "recebidos";
      const isEnviados = input.filtro === "enviados";
      const isArquivados = input.filtro === "arquivados";

      // Para "recebidos": encaminhamentos onde sou destinatário e status != arquivado
      // Para "enviados": encaminhamentos onde sou remetente
      // Para "arquivados": todos onde sou remetente ou destinatário e status = arquivado

      // Subquery: ids de encaminhamentos onde sou destinatário
      const meusAsDestinatario = db
        .select({ id: encaminhamentoDestinatarios.encaminhamentoId })
        .from(encaminhamentoDestinatarios)
        .where(eq(encaminhamentoDestinatarios.userId, userId));

      let whereClause;
      if (isEnviados) {
        whereClause = and(
          eq(encaminhamentos.remetenteId, userId),
        );
      } else if (isRecebidos) {
        whereClause = and(
          inArray(encaminhamentos.id, meusAsDestinatario),
          // status not arquivado nem cancelado
          or(
            eq(encaminhamentos.status, "pendente"),
            eq(encaminhamentos.status, "ciente"),
            eq(encaminhamentos.status, "aceito"),
            eq(encaminhamentos.status, "respondido"),
            eq(encaminhamentos.status, "concluido"),
          ),
        );
      } else {
        // arquivados
        whereClause = and(
          or(
            eq(encaminhamentos.remetenteId, userId),
            inArray(encaminhamentos.id, meusAsDestinatario),
          ),
          eq(encaminhamentos.status, "arquivado"),
        );
      }

      if (input.tipo) {
        whereClause = and(whereClause, eq(encaminhamentos.tipo, input.tipo));
      }

      const rows = await db
        .select()
        .from(encaminhamentos)
        .where(whereClause)
        .orderBy(desc(encaminhamentos.createdAt))
        .limit(input.limit);

      return { items: rows };
    }),
});
```

- [ ] **Step 2: Registrar router em `index.ts`**

Em `src/lib/trpc/routers/index.ts`, adicionar import:

```ts
import { encaminhamentosRouter } from "./encaminhamentos";
```

E no objeto `router({...})` adicionar:

```ts
encaminhamentos: encaminhamentosRouter,
```

- [ ] **Step 3: Escrever teste de integração**

Criar `__tests__/trpc/encaminhamentos.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import {
  encaminhamentos,
  encaminhamentoDestinatarios,
} from "@/lib/db/schema/cowork";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createCallerFactory } from "@/lib/trpc/init";
import { appRouter } from "@/lib/trpc/routers";

const createCaller = createCallerFactory(appRouter);

async function makeUser(name: string, workspaceId = 1) {
  const [u] = await db.insert(users).values({
    name,
    email: `${name.toLowerCase().replace(/\s/g, ".")}-test@test.local`,
    workspaceId,
  } as any).returning();
  return u;
}

async function cleanup(userIds: number[]) {
  // deleta encaminhamentos associados a esses users
  for (const uid of userIds) {
    await db.delete(encaminhamentos).where(eq(encaminhamentos.remetenteId, uid));
  }
  await db.delete(users).where(
    // sqlite-style — drizzle usa inArray
    eq(users.id, userIds[0]),
  );
}

describe("encaminhamentos.listar", () => {
  it("returns only items where user is remetente in 'enviados'", async () => {
    const alice = await makeUser("Alice Test");
    const bob = await makeUser("Bob Test");

    const [enc] = await db.insert(encaminhamentos).values({
      workspaceId: 1,
      remetenteId: alice.id,
      tipo: "anotar",
      mensagem: "teste de envio",
    } as any).returning();

    await db.insert(encaminhamentoDestinatarios).values({
      encaminhamentoId: enc.id,
      userId: bob.id,
    } as any);

    const caller = createCaller({ user: alice, db } as any);
    const aliceEnviados = await caller.encaminhamentos.listar({ filtro: "enviados" });
    expect(aliceEnviados.items.map((i) => i.id)).toContain(enc.id);

    const bobCaller = createCaller({ user: bob, db } as any);
    const bobRecebidos = await bobCaller.encaminhamentos.listar({ filtro: "recebidos" });
    expect(bobRecebidos.items.map((i) => i.id)).toContain(enc.id);

    const bobEnviados = await bobCaller.encaminhamentos.listar({ filtro: "enviados" });
    expect(bobEnviados.items.map((i) => i.id)).not.toContain(enc.id);

    // cleanup
    await db.delete(encaminhamentoDestinatarios).where(eq(encaminhamentoDestinatarios.encaminhamentoId, enc.id));
    await db.delete(encaminhamentos).where(eq(encaminhamentos.id, enc.id));
    await db.delete(users).where(eq(users.id, alice.id));
    await db.delete(users).where(eq(users.id, bob.id));
  });
});
```

**NOTA:** Ajustar o shape do `ctx` no `createCaller` conforme o padrão atual do projeto (ver `__tests__/trpc/context.test.ts`). A assinatura de `users.phone` pode não existir — remover da query se for o caso.

- [ ] **Step 4: Rodar teste**

Run: `npx vitest run __tests__/trpc/encaminhamentos.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/encaminhamentos.ts src/lib/trpc/routers/index.ts __tests__/trpc/encaminhamentos.test.ts
git commit -m "feat(cowork): trpc router skeleton with listar endpoint + test"
```

---

### Task 6: Endpoint `criar` com validação por tipo

**Files:**
- Modify: `src/lib/trpc/routers/encaminhamentos.ts`
- Modify: `__tests__/trpc/encaminhamentos.test.ts`

- [ ] **Step 1: Adicionar endpoint `criar` no router**

Em `src/lib/trpc/routers/encaminhamentos.ts`, adicionar dentro do `router({...})`:

```ts
criar: protectedProcedure
  .input(z.object({
    tipo: TIPO,
    titulo: z.string().max(200).optional(),
    mensagem: z.string().min(1),
    destinatarioIds: z.array(z.number()).min(1),
    demandaId: z.number().optional(),
    processoId: z.number().optional(),
    assistidoId: z.number().optional(),
    urgencia: z.enum(["normal", "urgente"]).default("normal"),
    notificarOmbuds: z.boolean().default(true),
    notificarWhatsapp: z.boolean().default(false),
    notificarEmail: z.boolean().default(false),
  }))
  .mutation(async ({ ctx, input }) => {
    // Validação de cardinalidade por tipo
    const singleDestTypes: Array<typeof input.tipo> = ["transferir", "acompanhar", "parecer"];
    if (singleDestTypes.includes(input.tipo) && input.destinatarioIds.length > 1) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Tipo "${input.tipo}" aceita apenas 1 destinatário.`,
      });
    }

    // Para Transferir: só o dono atual da demanda pode iniciar transferência
    if (input.tipo === "transferir") {
      if (!input.demandaId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Transferência requer demandaId.",
        });
      }
      const { demandas } = await import("@/lib/db/schema");
      const [dem] = await db.select({ defensorId: demandas.defensorId })
        .from(demandas)
        .where(eq(demandas.id, input.demandaId))
        .limit(1);
      if (!dem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Demanda não encontrada." });
      }
      if (dem.defensorId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas o titular da demanda pode transferi-la.",
        });
      }
    }

    // Inserção em transação
    const { withTransaction } = await import("@/lib/db");
    const enc = await withTransaction(async (tx) => {
      const [created] = await tx.insert(encaminhamentos).values({
        workspaceId: ctx.user.workspaceId ?? 1,
        remetenteId: ctx.user.id,
        tipo: input.tipo,
        titulo: input.titulo ?? null,
        mensagem: input.mensagem,
        demandaId: input.demandaId ?? null,
        processoId: input.processoId ?? null,
        assistidoId: input.assistidoId ?? null,
        urgencia: input.urgencia,
        notificarOmbuds: input.notificarOmbuds,
        notificarWhatsapp: input.notificarWhatsapp,
        notificarEmail: input.notificarEmail,
      } as any).returning();

      await tx.insert(encaminhamentoDestinatarios).values(
        input.destinatarioIds.map((uid) => ({
          encaminhamentoId: created.id,
          userId: uid,
        })),
      );

      return created;
    });

    // Dispara notificações via Inngest (fire-and-forget)
    inngest.send({
      name: "cowork/encaminhamento.criado",
      data: { encaminhamentoId: enc.id },
    }).catch((e) => console.error("[encaminhamentos] inngest send falhou:", e));

    return { id: enc.id };
  }),
```

- [ ] **Step 2: Adicionar teste de validação**

Em `__tests__/trpc/encaminhamentos.test.ts`, adicionar:

```ts
describe("encaminhamentos.criar", () => {
  it("rejects transferir with multiple destinatarios", async () => {
    const alice = await makeUser("Alice Test2");
    const bob = await makeUser("Bob Test2");
    const carol = await makeUser("Carol Test2");
    const caller = createCaller({ user: alice, db } as any);

    await expect(
      caller.encaminhamentos.criar({
        tipo: "transferir",
        mensagem: "passa isso",
        destinatarioIds: [bob.id, carol.id],
        demandaId: 1,
      } as any),
    ).rejects.toThrow(/apenas 1 destinatário/i);

    // cleanup
    await db.delete(users).where(eq(users.id, alice.id));
    await db.delete(users).where(eq(users.id, bob.id));
    await db.delete(users).where(eq(users.id, carol.id));
  });

  it("creates anotar with multiple destinatarios", async () => {
    const alice = await makeUser("Alice Test3");
    const bob = await makeUser("Bob Test3");
    const carol = await makeUser("Carol Test3");
    const caller = createCaller({ user: alice, db } as any);

    const { id } = await caller.encaminhamentos.criar({
      tipo: "anotar",
      mensagem: "recado para os dois",
      destinatarioIds: [bob.id, carol.id],
      notificarOmbuds: false, // evita dependência do Inngest em testes
      notificarWhatsapp: false,
    });

    const dests = await db
      .select()
      .from(encaminhamentoDestinatarios)
      .where(eq(encaminhamentoDestinatarios.encaminhamentoId, id));
    expect(dests).toHaveLength(2);

    // cleanup
    await db.delete(encaminhamentoDestinatarios).where(eq(encaminhamentoDestinatarios.encaminhamentoId, id));
    await db.delete(encaminhamentos).where(eq(encaminhamentos.id, id));
    await db.delete(users).where(eq(users.id, alice.id));
    await db.delete(users).where(eq(users.id, bob.id));
    await db.delete(users).where(eq(users.id, carol.id));
  });
});
```

- [ ] **Step 3: Rodar testes**

Run: `npx vitest run __tests__/trpc/encaminhamentos.test.ts`
Expected: todos PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/trpc/routers/encaminhamentos.ts __tests__/trpc/encaminhamentos.test.ts
git commit -m "feat(cowork): criar endpoint with cardinality + ownership validation"
```

---

### Task 7: Transições de estado (marcarCiente, aceitar, recusar, responder, marcarConcluido, arquivar, cancelar, contadores, obter)

**Files:**
- Modify: `src/lib/trpc/routers/encaminhamentos.ts`

- [ ] **Step 1: Adicionar helper `assertIsDestinatario` no topo do arquivo, antes do router**

```ts
async function assertIsDestinatario(encaminhamentoId: number, userId: number) {
  const [d] = await db.select()
    .from(encaminhamentoDestinatarios)
    .where(and(
      eq(encaminhamentoDestinatarios.encaminhamentoId, encaminhamentoId),
      eq(encaminhamentoDestinatarios.userId, userId),
    ))
    .limit(1);
  if (!d) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Você não é destinatário deste encaminhamento.",
    });
  }
  return d;
}

async function assertIsRemetente(encaminhamentoId: number, userId: number) {
  const [e] = await db.select()
    .from(encaminhamentos)
    .where(and(
      eq(encaminhamentos.id, encaminhamentoId),
      eq(encaminhamentos.remetenteId, userId),
    ))
    .limit(1);
  if (!e) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Você não é o remetente deste encaminhamento.",
    });
  }
  return e;
}
```

- [ ] **Step 2: Adicionar `obter` endpoint**

```ts
obter: protectedProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ ctx, input }) => {
    const [enc] = await db.select()
      .from(encaminhamentos)
      .where(eq(encaminhamentos.id, input.id))
      .limit(1);
    if (!enc) throw new TRPCError({ code: "NOT_FOUND" });

    // autorização: remetente ou destinatário
    const isRemetente = enc.remetenteId === ctx.user.id;
    if (!isRemetente) {
      await assertIsDestinatario(enc.id, ctx.user.id);
    }

    const dests = await db.select()
      .from(encaminhamentoDestinatarios)
      .where(eq(encaminhamentoDestinatarios.encaminhamentoId, enc.id));
    const resp = await db.select()
      .from(encaminhamentoRespostas)
      .where(eq(encaminhamentoRespostas.encaminhamentoId, enc.id))
      .orderBy(encaminhamentoRespostas.createdAt);

    return { encaminhamento: enc, destinatarios: dests, respostas: resp };
  }),
```

Adicionar import no topo:
```ts
import { encaminhamentoRespostas } from "@/lib/db/schema/cowork";
```

- [ ] **Step 3: Adicionar `contadores`**

```ts
contadores: protectedProcedure.query(async ({ ctx }) => {
  const userId = ctx.user.id;
  const subquery = db
    .select({ id: encaminhamentoDestinatarios.encaminhamentoId })
    .from(encaminhamentoDestinatarios)
    .where(eq(encaminhamentoDestinatarios.userId, userId));

  // recebidos pendentes
  const pendentesRows = await db.select({ count: encaminhamentos.id })
    .from(encaminhamentos)
    .where(and(
      inArray(encaminhamentos.id, subquery),
      eq(encaminhamentos.status, "pendente"),
    ));

  // aguarda aceite (tipo=transferir ou acompanhar, status=pendente, eu=destinatário)
  const aguardaRows = await db.select({ count: encaminhamentos.id })
    .from(encaminhamentos)
    .where(and(
      inArray(encaminhamentos.id, subquery),
      eq(encaminhamentos.status, "pendente"),
      inArray(encaminhamentos.tipo, ["transferir", "acompanhar"]),
    ));

  return {
    recebidosPendentes: pendentesRows.length,
    aguardaAceite: aguardaRows.length,
  };
}),
```

- [ ] **Step 4: Adicionar `marcarCiente`**

```ts
marcarCiente: protectedProcedure
  .input(z.object({ id: z.number() }))
  .mutation(async ({ ctx, input }) => {
    const dest = await assertIsDestinatario(input.id, ctx.user.id);
    const now = new Date();
    await db.update(encaminhamentoDestinatarios)
      .set({ estadoPessoal: "ciente", cienteEm: now, lidoEm: dest.lidoEm ?? now })
      .where(eq(encaminhamentoDestinatarios.id, dest.id));
    // Se todos os destinatários ficaram cientes, atualiza status global
    const todos = await db.select()
      .from(encaminhamentoDestinatarios)
      .where(eq(encaminhamentoDestinatarios.encaminhamentoId, input.id));
    if (todos.every((d) => d.estadoPessoal === "ciente")) {
      await db.update(encaminhamentos)
        .set({ status: "ciente", updatedAt: now })
        .where(eq(encaminhamentos.id, input.id));
    }
    return { ok: true };
  }),
```

- [ ] **Step 5: Adicionar `aceitar` (Transferir / Acompanhar)**

```ts
aceitar: protectedProcedure
  .input(z.object({ id: z.number() }))
  .mutation(async ({ ctx, input }) => {
    await assertIsDestinatario(input.id, ctx.user.id);
    const [enc] = await db.select()
      .from(encaminhamentos)
      .where(eq(encaminhamentos.id, input.id))
      .limit(1);
    if (!enc) throw new TRPCError({ code: "NOT_FOUND" });
    if (enc.status !== "pendente") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Encaminhamento não está pendente." });
    }

    const now = new Date();
    const { withTransaction } = await import("@/lib/db");

    await withTransaction(async (tx) => {
      if (enc.tipo === "transferir" && enc.demandaId) {
        const { demandas } = await import("@/lib/db/schema");
        await tx.update(demandas)
          .set({ defensorId: ctx.user.id, updatedAt: now })
          .where(eq(demandas.id, enc.demandaId));
      }
      if (enc.tipo === "acompanhar" && enc.demandaId) {
        const { demandasAcompanhantes } = await import("@/lib/db/schema/cowork");
        await tx.insert(demandasAcompanhantes).values({
          demandaId: enc.demandaId,
          userId: ctx.user.id,
          origemEncaminhamentoId: enc.id,
        } as any).onConflictDoNothing();
      }
      await tx.update(encaminhamentos).set({
        status: "aceito", concluidoEm: now, concluidoPorId: ctx.user.id, updatedAt: now,
      }).where(eq(encaminhamentos.id, enc.id));
    });

    return { ok: true };
  }),
```

- [ ] **Step 6: Adicionar `recusar`**

```ts
recusar: protectedProcedure
  .input(z.object({ id: z.number(), motivo: z.string().min(1).max(500) }))
  .mutation(async ({ ctx, input }) => {
    await assertIsDestinatario(input.id, ctx.user.id);
    const now = new Date();
    await db.update(encaminhamentos).set({
      status: "recusado",
      motivoRecusa: input.motivo,
      concluidoEm: now,
      concluidoPorId: ctx.user.id,
      updatedAt: now,
    }).where(eq(encaminhamentos.id, input.id));
    return { ok: true };
  }),
```

- [ ] **Step 7: Adicionar `responder` (Parecer + thread)**

```ts
responder: protectedProcedure
  .input(z.object({
    id: z.number(),
    mensagem: z.string().min(1),
  }))
  .mutation(async ({ ctx, input }) => {
    // remetente ou destinatário pode responder (thread)
    const [enc] = await db.select()
      .from(encaminhamentos).where(eq(encaminhamentos.id, input.id)).limit(1);
    if (!enc) throw new TRPCError({ code: "NOT_FOUND" });
    const isRem = enc.remetenteId === ctx.user.id;
    if (!isRem) await assertIsDestinatario(input.id, ctx.user.id);

    const now = new Date();
    await db.insert(encaminhamentoRespostas).values({
      encaminhamentoId: input.id,
      autorId: ctx.user.id,
      mensagem: input.mensagem,
    } as any);

    // Se era Parecer e quem respondeu é destinatário, marca como respondido
    if (enc.tipo === "parecer" && !isRem && enc.status === "pendente") {
      await db.update(encaminhamentos)
        .set({ status: "respondido", updatedAt: now })
        .where(eq(encaminhamentos.id, input.id));
    }

    return { ok: true };
  }),
```

- [ ] **Step 8: Adicionar `marcarConcluido`, `arquivar`, `cancelar`**

```ts
marcarConcluido: protectedProcedure
  .input(z.object({ id: z.number() }))
  .mutation(async ({ ctx, input }) => {
    await assertIsRemetente(input.id, ctx.user.id);
    const now = new Date();
    await db.update(encaminhamentos).set({
      status: "concluido", concluidoEm: now, concluidoPorId: ctx.user.id, updatedAt: now,
    }).where(eq(encaminhamentos.id, input.id));
    return { ok: true };
  }),

arquivar: protectedProcedure
  .input(z.object({ id: z.number() }))
  .mutation(async ({ ctx, input }) => {
    // tanto destinatário como remetente pode arquivar seu lado
    const [enc] = await db.select()
      .from(encaminhamentos).where(eq(encaminhamentos.id, input.id)).limit(1);
    if (!enc) throw new TRPCError({ code: "NOT_FOUND" });
    if (enc.remetenteId !== ctx.user.id) {
      await assertIsDestinatario(input.id, ctx.user.id);
    }
    const now = new Date();
    // Se remetente arquiva, o encaminhamento vira "arquivado" global.
    // Se destinatário arquiva, só o estado pessoal dele.
    if (enc.remetenteId === ctx.user.id) {
      await db.update(encaminhamentos)
        .set({ status: "arquivado", updatedAt: now })
        .where(eq(encaminhamentos.id, input.id));
    } else {
      await db.update(encaminhamentoDestinatarios)
        .set({ estadoPessoal: "arquivado" })
        .where(and(
          eq(encaminhamentoDestinatarios.encaminhamentoId, input.id),
          eq(encaminhamentoDestinatarios.userId, ctx.user.id),
        ));
    }
    return { ok: true };
  }),

cancelar: protectedProcedure
  .input(z.object({ id: z.number() }))
  .mutation(async ({ ctx, input }) => {
    await assertIsRemetente(input.id, ctx.user.id);
    const now = new Date();
    await db.update(encaminhamentos).set({
      status: "cancelado", concluidoEm: now, concluidoPorId: ctx.user.id, updatedAt: now,
    }).where(eq(encaminhamentos.id, input.id));
    return { ok: true };
  }),
```

- [ ] **Step 9: Adicionar testes de transição**

Em `__tests__/trpc/encaminhamentos.test.ts`:

```ts
describe("encaminhamentos.aceitar (transferir)", () => {
  it("transfers demanda ownership when accepted", async () => {
    const { demandas, processos, assistidos } = await import("@/lib/db/schema");

    const alice = await makeUser("Alice T4");
    const bob = await makeUser("Bob T4");
    const [asst] = await db.insert(assistidos).values({ nome: "Teste", workspaceId: 1 } as any).returning();
    const [proc] = await db.insert(processos).values({
      assistidoId: asst.id, numeroAutos: "TEST-" + Date.now(), area: "JURI",
    } as any).returning();
    const [dem] = await db.insert(demandas).values({
      processoId: proc.id, assistidoId: asst.id, ato: "Teste",
      defensorId: alice.id, workspaceId: 1, status: "5_TRIAGEM" as any,
    } as any).returning();

    const aliceCaller = createCaller({ user: alice, db } as any);
    const { id: encId } = await aliceCaller.encaminhamentos.criar({
      tipo: "transferir", mensagem: "assume", destinatarioIds: [bob.id],
      demandaId: dem.id, notificarOmbuds: false, notificarWhatsapp: false,
    });

    const bobCaller = createCaller({ user: bob, db } as any);
    await bobCaller.encaminhamentos.aceitar({ id: encId });

    const [demAfter] = await db.select().from(demandas).where(eq(demandas.id, dem.id));
    expect(demAfter.defensorId).toBe(bob.id);

    // cleanup
    await db.delete(encaminhamentoDestinatarios).where(eq(encaminhamentoDestinatarios.encaminhamentoId, encId));
    await db.delete(encaminhamentos).where(eq(encaminhamentos.id, encId));
    await db.delete(demandas).where(eq(demandas.id, dem.id));
    await db.delete(processos).where(eq(processos.id, proc.id));
    await db.delete(assistidos).where(eq(assistidos.id, asst.id));
    await db.delete(users).where(eq(users.id, alice.id));
    await db.delete(users).where(eq(users.id, bob.id));
  });
});
```

- [ ] **Step 10: Rodar todos os testes do router**

Run: `npx vitest run __tests__/trpc/encaminhamentos.test.ts`
Expected: todos PASS.

- [ ] **Step 11: Commit**

```bash
git add src/lib/trpc/routers/encaminhamentos.ts __tests__/trpc/encaminhamentos.test.ts
git commit -m "feat(cowork): state transitions (aceitar/recusar/responder/concluir/arquivar/cancelar)"
```

---

### Task 8: Script de migração `pareceres → encaminhamentos`

**Files:**
- Create: `scripts/migrate-pareceres-to-encaminhamentos.ts`

- [ ] **Step 1: Criar script com dry-run + commit**

```ts
/**
 * Migra pareceres (legado) para encaminhamentos (novo modelo).
 *
 * Uso:
 *   tsx scripts/migrate-pareceres-to-encaminhamentos.ts --dry-run
 *   tsx scripts/migrate-pareceres-to-encaminhamentos.ts --apply
 *
 * O script é idempotente: checa se já existe encaminhamento com
 * (remetenteId, createdAt, tipo=parecer) igual, e pula se sim.
 */

import { db } from "@/lib/db";
import { pareceres } from "@/lib/db/schema/cowork";
import {
  encaminhamentos,
  encaminhamentoDestinatarios,
  encaminhamentoRespostas,
} from "@/lib/db/schema/cowork";
import { eq, and } from "drizzle-orm";

const APPLY = process.argv.includes("--apply");
const DRY = !APPLY;

async function main() {
  console.log(DRY ? "[DRY-RUN]" : "[APPLY]", "migrando pareceres → encaminhamentos");

  const all = await db.select().from(pareceres);
  console.log(`Encontrados ${all.length} pareceres`);

  let migrados = 0;
  let pulados = 0;

  for (const p of all) {
    // Idempotência: existe algum encaminhamento tipo=parecer com mesmo remetente e createdAt?
    const [existing] = await db.select().from(encaminhamentos).where(and(
      eq(encaminhamentos.remetenteId, p.solicitanteId),
      eq(encaminhamentos.tipo, "parecer"),
      eq(encaminhamentos.createdAt, p.dataSolicitacao),
    )).limit(1);

    if (existing) { pulados++; continue; }

    const status = p.status === "respondido" && p.dataResposta
      ? "respondido" : p.status === "lido"
      ? "concluido" : "pendente";

    if (DRY) {
      console.log(`  would migrate parecer #${p.id} (status=${p.status} → ${status})`);
      migrados++;
      continue;
    }

    const [enc] = await db.insert(encaminhamentos).values({
      workspaceId: 1,
      remetenteId: p.solicitanteId,
      tipo: "parecer",
      titulo: null,
      mensagem: p.pergunta,
      assistidoId: p.assistidoId,
      processoId: p.processoId,
      status,
      urgencia: p.urgencia,
      createdAt: p.dataSolicitacao,
      updatedAt: p.dataResposta ?? p.dataSolicitacao,
    } as any).returning();

    await db.insert(encaminhamentoDestinatarios).values({
      encaminhamentoId: enc.id,
      userId: p.respondedorId,
      estadoPessoal: p.status === "lido" ? "ciente" : "pendente",
      cienteEm: p.status === "lido" ? p.dataResposta : null,
    } as any);

    if (p.resposta && p.dataResposta) {
      await db.insert(encaminhamentoRespostas).values({
        encaminhamentoId: enc.id,
        autorId: p.respondedorId,
        mensagem: p.resposta,
        createdAt: p.dataResposta,
      } as any);
    }

    migrados++;
  }

  console.log(`\nMigrados: ${migrados} · Pulados (já existentes): ${pulados}`);
  if (DRY) console.log("Rode com --apply para aplicar de fato.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => process.exit(0));
```

- [ ] **Step 2: Rodar em dry-run**

Run: `npx tsx scripts/migrate-pareceres-to-encaminhamentos.ts`
Expected: lista de pareceres que seriam migrados, sem mudança no banco.

- [ ] **Step 3: Rodar com --apply em dev**

Run: `npx tsx scripts/migrate-pareceres-to-encaminhamentos.ts --apply`
Expected: saída "Migrados: N · Pulados: 0".

- [ ] **Step 4: Verificar counts batem**

```bash
node -e "
const {Pool} = require('pg');
const p = new Pool({connectionString: process.env.DATABASE_URL});
(async()=>{
  const a = await p.query(\"SELECT count(*) FROM pareceres\");
  const b = await p.query(\"SELECT count(*) FROM encaminhamentos WHERE tipo='parecer'\");
  console.log('pareceres:', a.rows[0].count, 'encaminhamentos(parecer):', b.rows[0].count);
  await p.end();
})();
"
```
Expected: mesmo número nos dois.

- [ ] **Step 5: Rodar de novo com --apply (idempotência)**

Run: `npx tsx scripts/migrate-pareceres-to-encaminhamentos.ts --apply`
Expected: "Migrados: 0 · Pulados: N" (todos pulados).

- [ ] **Step 6: Commit**

```bash
git add scripts/migrate-pareceres-to-encaminhamentos.ts
git commit -m "feat(cowork): idempotent migration pareceres → encaminhamentos"
```

---

### Task 9: Verificação final + PR

- [ ] **Step 1: Rodar toda a suíte de testes**

Run: `npm test`
Expected: todos PASS, inclusive testes novos.

- [ ] **Step 2: Type-check completo**

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | grep -vE "FilesByProcesso|audiencias.ts:724|concluidoEm|nomeAssistido|drive.ts|instancia-superior|defensor-scope.test"`
Expected: nenhum erro novo (os listados são pré-existentes).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build passa sem warnings novos.

- [ ] **Step 4: Smoke test — chamar `contadores` pela API**

```bash
# (com dev server rodando)
curl -s "http://localhost:3000/api/trpc/encaminhamentos.contadores?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D" \
  -H "Cookie: $(cat .auth-cookie)" | jq
```
Expected: resposta com `recebidosPendentes` e `aguardaAceite` (0 se ainda não há encaminhamentos).

- [ ] **Step 5: Criar PR**

```bash
git push origin $(git branch --show-current)
gh pr create --title "feat(cowork): Encaminhamentos entre defensores — Fase 1 (backend)" --body "$(cat <<'EOF'
## Resumo

Implementa backend completo da feature **Cowork → Encaminhamentos** conforme spec `docs/superpowers/specs/2026-04-15-cowork-encaminhamentos-design.md`.

## O que entra
- 5 novas tabelas (`encaminhamentos`, `encaminhamento_destinatarios`, `encaminhamento_respostas`, `encaminhamento_anexos`, `demandas_acompanhantes`)
- Router tRPC `encaminhamentos` com 10 endpoints (listar, obter, contadores, criar, marcarCiente, aceitar, recusar, responder, marcarConcluido, arquivar, cancelar)
- Service `encaminhamentos-notifier` (in-app + WhatsApp via evolution-api)
- Inngest function `dispatchEncaminhamentoNotificacaoFn`
- Migração one-shot `pareceres → encaminhamentos` (idempotente)
- Testes de router + notifier

## O que NÃO entra (fase 2, plano separado)
- UI nova no Cowork (aba, inbox, modal, card integration)
- Redirect `/admin/pareceres`
- Drop de `pareceres` (60 dias após UI deploy)

## Test plan
- [ ] `npm test` passa
- [ ] `npm run build` passa
- [ ] Dry-run da migração conta pareceres corretamente
- [ ] Apply da migração replica todos os pareceres + respostas como encaminhamentos
- [ ] Segunda execução de apply é no-op (idempotência)
- [ ] Chamar `contadores` via tRPC devolve 0 pendentes num usuário novo
EOF
)"
```

- [ ] **Step 6: Commit final (se houver mudanças de review)**

---

## Self-Review

Checado contra o spec:
- ✅ Tabela `encaminhamentos` — Task 1
- ✅ Tabela `encaminhamento_destinatarios` — Task 1
- ✅ Tabela `encaminhamento_respostas` — Task 1
- ✅ Tabela `encaminhamento_anexos` — Task 1
- ✅ Tabela `demandas_acompanhantes` — Task 1
- ✅ Todos os 10 endpoints tRPC — Tasks 5/6/7
- ✅ Validação de cardinalidade por tipo — Task 6
- ✅ Transições de estado por tipo (aceitar/recusar/responder) — Task 7
- ✅ Integração de ownership (Transferir→demanda; Acompanhar→demandas_acompanhantes) — Task 7
- ✅ Notifier service com buildWhatsappMessage puro testável — Task 3
- ✅ Inngest event + function — Task 4
- ✅ Migração idempotente de pareceres — Task 8
- ✅ Testes TDD — Tasks 3, 5, 6, 7

**Coisas não cobertas nesta fase (por design, ficam pra Fase 2):**
- Anexos (áudio, Drive) no criar endpoint — schema existe, upload será adicionado junto com UI
- Endpoint de notificações no-app (model de `notifications` pode precisar de campo `kind`)
- Email como canal de notificação (spec menciona como futuro)

Se durante a execução surgir qualquer divergência de tipos/APIs existentes (ex: `users.phone` não existir, ou shape de `notifications` diferente), o executor deve ajustar o código sem quebrar o contrato dos testes puros (`buildWhatsappMessage`, `buildInappPayload`).
