# Audiência Calendar Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ligar `audiencias.{create,update,redesignar,delete}` ao Google Calendar, escolhendo o calendário pela `area` da demanda e cor pelo `tipo` da audiência. Zero migration (campo `googleCalendarEventId` já existe).

**Architecture:** Helper module `calendar-mapping.ts` resolve calendar/cor a partir de `area` e `tipo`. Funções existentes em `google-calendar.ts` ganham parâmetro opcional `calendarId` (sem quebrar callers atuais). `criarEventoAudiencia` evolui para assinatura objeto com `area`. Mutations em `audiencias.ts` chamam o serviço após operação local; falha do Calendar não bloqueia. Toasts no front diferenciam sucesso/warning.

**Tech Stack:** TypeScript, Drizzle ORM (Postgres), tRPC, Vitest, sonner (toasts).

**Spec:** `docs/superpowers/specs/2026-05-05-audiencia-calendar-sync-design.md`

---

## File Structure

| File | Mudança |
|---|---|
| `src/lib/services/calendar-mapping.ts` | Create — `resolveCalendarId(area)`, `colorIdForAudiencia(tipo)`, `AreaCalendar` type |
| `src/lib/services/__tests__/calendar-mapping.test.ts` | Create — testes puros do mapping |
| `src/lib/services/google-calendar.ts` | Modify — `createCalendarEvent`/`updateCalendarEvent`/`deleteCalendarEvent` aceitam `calendarId?`; `criarEventoAudiencia` recebe objeto com `area` |
| `src/lib/trpc/routers/audiencias.ts` | Modify — `create`, `update`, `delete`, `redesignarAudiencia` chamam o serviço de Calendar |
| `src/components/demandas-premium/demandas-premium-view.tsx` | Modify — toast feedback no `onConfirm` da audiência |
| `src/components/demandas-premium/DemandaQuickPreview.tsx` | Modify (se houver consumo direto) — idem |

Sem migration. Sem novos componentes UI. Sem novas rotas.

---

## Task 1: Module `calendar-mapping.ts` + testes (TDD)

**Files:**
- Create: `src/lib/services/calendar-mapping.ts`
- Create: `src/lib/services/__tests__/calendar-mapping.test.ts`

- [ ] **Step 1: Escrever os testes (RED)**

Criar `src/lib/services/__tests__/calendar-mapping.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveCalendarId, colorIdForAudiencia } from "../calendar-mapping";

describe("resolveCalendarId", () => {
  const ORIGINAL_ENV = { ...process.env };
  beforeEach(() => {
    delete process.env.GOOGLE_CALENDAR_ID_JURI;
    delete process.env.GOOGLE_CALENDAR_ID_VVD;
    delete process.env.GOOGLE_CALENDAR_ID_EP;
    delete process.env.GOOGLE_CALENDAR_ID_CRIMINAL;
    delete process.env.GOOGLE_CALENDAR_ID_CRIMINAL_2;
    delete process.env.GOOGLE_CALENDAR_ID;
  });
  afterEach(() => {
    Object.assign(process.env, ORIGINAL_ENV);
  });

  it("usa calendar específico da área quando env existe", () => {
    process.env.GOOGLE_CALENDAR_ID_JURI = "juri@cal";
    expect(resolveCalendarId("JURI")).toBe("juri@cal");
  });

  it("cai no GOOGLE_CALENDAR_ID quando área não tem env específico", () => {
    process.env.GOOGLE_CALENDAR_ID = "default@cal";
    expect(resolveCalendarId("JURI")).toBe("default@cal");
  });

  it("cai em 'primary' quando nada configurado", () => {
    expect(resolveCalendarId("JURI")).toBe("primary");
  });

  it("aceita area null/undefined", () => {
    process.env.GOOGLE_CALENDAR_ID = "default@cal";
    expect(resolveCalendarId(null)).toBe("default@cal");
    expect(resolveCalendarId(undefined)).toBe("default@cal");
  });

  it("aceita área desconhecida (cai no default)", () => {
    process.env.GOOGLE_CALENDAR_ID = "default@cal";
    expect(resolveCalendarId("FAMILIA")).toBe("default@cal");
  });

  it("mapeia VIOLENCIA_DOMESTICA, EXECUCAO_PENAL, CRIMINAL, CRIMINAL_2_GRAU", () => {
    process.env.GOOGLE_CALENDAR_ID_VVD = "vvd@cal";
    process.env.GOOGLE_CALENDAR_ID_EP = "ep@cal";
    process.env.GOOGLE_CALENDAR_ID_CRIMINAL = "crim@cal";
    process.env.GOOGLE_CALENDAR_ID_CRIMINAL_2 = "crim2@cal";
    expect(resolveCalendarId("VIOLENCIA_DOMESTICA")).toBe("vvd@cal");
    expect(resolveCalendarId("EXECUCAO_PENAL")).toBe("ep@cal");
    expect(resolveCalendarId("CRIMINAL")).toBe("crim@cal");
    expect(resolveCalendarId("CRIMINAL_2_GRAU")).toBe("crim2@cal");
  });
});

describe("colorIdForAudiencia", () => {
  it("Plenário do Júri → ROXO ('3')", () => {
    expect(colorIdForAudiencia("Plenário do Júri")).toBe("3");
    expect(colorIdForAudiencia("plenario do juri")).toBe("3");
  });

  it("Custódia → VERMELHO ('11')", () => {
    expect(colorIdForAudiencia("Custódia")).toBe("11");
    expect(colorIdForAudiencia("custodia")).toBe("11");
  });

  it("Oitiva Especial / Depoimento sem dano → LARANJA ('6')", () => {
    expect(colorIdForAudiencia("Oitiva Especial")).toBe("6");
    expect(colorIdForAudiencia("Depoimento sem dano")).toBe("6");
  });

  it("Preliminar Maria da Penha → AMARELO ('5')", () => {
    expect(colorIdForAudiencia("Preliminar (Maria da Penha)")).toBe("5");
  });

  it("Default → AZUL ('9')", () => {
    expect(colorIdForAudiencia("Instrução e Julgamento")).toBe("9");
    expect(colorIdForAudiencia("Conciliação")).toBe("9");
    expect(colorIdForAudiencia("Una")).toBe("9");
    expect(colorIdForAudiencia("")).toBe("9");
  });
});
```

Rodar: `pnpm test src/lib/services/__tests__/calendar-mapping.test.ts`
Esperado: FAIL — module não existe.

- [ ] **Step 2: Implementar o módulo**

Criar `src/lib/services/calendar-mapping.ts`:

```ts
import { CalendarColors } from "./google-calendar";

export type AreaCalendar =
  | "JURI"
  | "VIOLENCIA_DOMESTICA"
  | "EXECUCAO_PENAL"
  | "CRIMINAL"
  | "CRIMINAL_2_GRAU";

const ENV_KEY: Record<AreaCalendar, string> = {
  JURI: "GOOGLE_CALENDAR_ID_JURI",
  VIOLENCIA_DOMESTICA: "GOOGLE_CALENDAR_ID_VVD",
  EXECUCAO_PENAL: "GOOGLE_CALENDAR_ID_EP",
  CRIMINAL: "GOOGLE_CALENDAR_ID_CRIMINAL",
  CRIMINAL_2_GRAU: "GOOGLE_CALENDAR_ID_CRIMINAL_2",
};

/**
 * Resolve o calendar ID para a área da demanda.
 * Ordem: env específico da área → GOOGLE_CALENDAR_ID → "primary".
 */
export function resolveCalendarId(area: string | null | undefined): string {
  const fallback = process.env.GOOGLE_CALENDAR_ID || "primary";
  if (!area) return fallback;
  const envName = ENV_KEY[area as AreaCalendar];
  if (!envName) return fallback;
  return process.env[envName] || fallback;
}

/**
 * Cor do evento Calendar baseada no tipo da audiência.
 * Default: AZUL.
 */
export function colorIdForAudiencia(tipo: string): string {
  const t = (tipo || "").toLowerCase();
  if (/plen[áa]rio|j[úu]ri/.test(t)) return CalendarColors.ROXO;
  if (/cust[óo]dia/.test(t)) return CalendarColors.VERMELHO;
  if (/oitiva\s+especial|depoimento\s+sem\s+dano/.test(t)) return CalendarColors.LARANJA;
  if (/preliminar.*maria/.test(t)) return CalendarColors.AMARELO;
  return CalendarColors.AZUL;
}
```

- [ ] **Step 3: Rodar e ver passar (GREEN)**

```bash
pnpm test src/lib/services/__tests__/calendar-mapping.test.ts
```

Esperado: 12 tests passing.

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/calendar-mapping.ts src/lib/services/__tests__/calendar-mapping.test.ts
git commit -m "feat(calendar): mapping area→calendarId + cor por tipo de audiência"
```

---

## Task 2: `createCalendarEvent`/`update`/`delete` aceitam `calendarId` opcional

**Files:**
- Modify: `src/lib/services/google-calendar.ts`

Sem TDD nesta task — é mudança mecânica de assinatura, validamos via typecheck e callers existentes.

- [ ] **Step 1: Em `createCalendarEvent`, adicionar param e usar override**

Mudar a assinatura na linha ~114 de:

```ts
export async function createCalendarEvent(
  params: CreateEventParams
): Promise<CalendarEvent | null> {
  const config = getConfig();
```

Para:

```ts
export async function createCalendarEvent(
  params: CreateEventParams,
  options?: { calendarId?: string }
): Promise<CalendarEvent | null> {
  const config = getConfig();
```

E na linha do fetch (`~167`), trocar `config.calendarId` por:

```ts
const calId = options?.calendarId || config.calendarId;
// ...
`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`,
```

- [ ] **Step 2: Mesma mudança em `updateCalendarEvent` (linha ~203)**

Adicionar `options?: { calendarId?: string }` ao final dos parâmetros e usar `options?.calendarId || config.calendarId` no URL do fetch.

- [ ] **Step 3: Mesma mudança em `deleteCalendarEvent`**

Localizar via `grep -n "export async function deleteCalendarEvent" src/lib/services/google-calendar.ts`. Adicionar `options?: { calendarId?: string }` e usar `options?.calendarId || config.calendarId` no URL.

- [ ] **Step 4: Verificar typecheck**

```bash
pnpm typecheck 2>&1 | grep -E "google-calendar\.ts" | head -5
```

Esperado: 0 erros.

- [ ] **Step 5: Verificar testes (não devem ter regredido)**

```bash
pnpm test src/lib/services/
```

Esperado: tudo verde.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/google-calendar.ts
git commit -m "feat(calendar): aceitar calendarId opcional em create/update/delete"
```

---

## Task 3: Refatorar `criarEventoAudiencia` para receber objeto + área

**Files:**
- Modify: `src/lib/services/google-calendar.ts`

A função existente em `google-calendar.ts:357` tem assinatura posicional. Vamos trocar para um único parâmetro objeto, usando os helpers da Task 1.

**ATENÇÃO:** essa função tem 0 callers em produção hoje (verificado por grep — só usada via spec, ainda não wireada). Confirme antes de mexer:

```bash
grep -rn "criarEventoAudiencia" src --include='*.ts' --include='*.tsx' | grep -v "google-calendar.ts"
```

Esperado: nenhum match. Se houver caller, escalar BLOCKED com o caller pra eu te dar contexto.

- [ ] **Step 1: Substituir o corpo da função**

Substituir a função `criarEventoAudiencia` inteira (linhas ~354-384) por:

```ts
/**
 * Cria um evento de audiência no Google Calendar.
 * Pega calendar e cor de acordo com a área e tipo.
 */
export async function criarEventoAudiencia(input: {
  assistidoNome: string;
  tipoAudiencia: string;
  dataAudiencia: Date;
  duracaoMinutos?: number;
  local?: string;
  numeroAutos?: string;
  area?: string | null;
}): Promise<CalendarEvent | null> {
  const { resolveCalendarId, colorIdForAudiencia } = await import("./calendar-mapping");

  const duracao = input.duracaoMinutos ?? 60;
  const endDate = new Date(input.dataAudiencia.getTime() + duracao * 60 * 1000);
  const calendarId = resolveCalendarId(input.area);
  const colorId = colorIdForAudiencia(input.tipoAudiencia);

  const tipo = input.tipoAudiencia.toLowerCase();
  const emoji = /plen[áa]rio|j[úu]ri/.test(tipo) ? "⚖️" : "🏛";
  const summary = `${emoji} ${input.tipoAudiencia} — ${input.assistidoNome}`;

  let description = `Tipo: ${input.tipoAudiencia}`;
  if (input.numeroAutos) description += `\nProcesso: ${input.numeroAutos}`;
  if (input.area) description += `\nÁrea: ${input.area}`;

  return createCalendarEvent(
    {
      summary,
      description,
      startDate: input.dataAudiencia,
      endDate,
      isAllDay: false,
      location: input.local,
      colorId,
      reminders: [
        { method: "popup", minutes: 1440 }, // 1 dia antes
        { method: "popup", minutes: 120 },  // 2 horas antes
        { method: "popup", minutes: 30 },   // 30 minutos antes
      ],
    },
    { calendarId },
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | grep -E "google-calendar\.ts" | head -5
```

Esperado: 0 erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/google-calendar.ts
git commit -m "feat(calendar): criarEventoAudiencia recebe objeto com area + duração"
```

---

## Task 4: `audiencias.create` cria evento e grava ID

**Files:**
- Modify: `src/lib/trpc/routers/audiencias.ts` (linhas ~692-730)

- [ ] **Step 1: Ler imports atuais do router**

```bash
grep -n "^import" src/lib/trpc/routers/audiencias.ts | head -20
```

Confirmar se `processos`, `assistidos`, `demandas` já estão importados do schema (provavelmente sim). Se não, adicionar.

- [ ] **Step 2: Adicionar import do serviço Calendar no topo do arquivo**

Próximo aos outros imports da `lib/services/`, adicionar:

```ts
import { criarEventoAudiencia } from "@/lib/services/google-calendar";
```

- [ ] **Step 3: Substituir a mutation `create`**

Localizar `create: protectedProcedure` em torno da linha 692 e substituir pelo bloco abaixo. **IMPORTANTE:** preserve qualquer detalhe pré-existente do `withTransaction` ou `ctx` que não esteja no original; o original (lido em 2026-05-05) era simples.

```ts
  create: protectedProcedure
    .input(z.object({
      processoId: z.number(),
      casoId: z.number().optional(),
      assistidoId: z.number().optional(),
      dataAudiencia: z.string().or(z.date()),
      tipo: z.string(),
      local: z.string().optional(),
      titulo: z.string().optional(),
      descricao: z.string().optional(),
      sala: z.string().optional(),
      horario: z.string().optional(),
      defensorId: z.number().optional(),
      juiz: z.string().optional(),
      promotor: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const [audiencia] = await db
        .insert(audiencias)
        .values({
          processoId: input.processoId,
          casoId: input.casoId,
          assistidoId: input.assistidoId,
          dataAudiencia: new Date(input.dataAudiencia),
          tipo: input.tipo,
          local: input.local,
          titulo: input.titulo,
          descricao: input.descricao,
          sala: input.sala,
          horario: input.horario,
          defensorId: input.defensorId,
          juiz: input.juiz,
          promotor: input.promotor,
          status: "agendada",
        })
        .returning();

      // Carregar contexto para o Calendar (assistido + processo + área)
      const [ctxRow] = await db
        .select({
          assistidoNome: assistidos.nomeCompleto,
          numeroAutos: processos.numeroAutos,
          area: demandas.area,
        })
        .from(processos)
        .leftJoin(assistidos, eq(assistidos.id, processos.assistidoId))
        .leftJoin(demandas, eq(demandas.processoId, processos.id))
        .where(eq(processos.id, input.processoId))
        .limit(1);

      const evento = await criarEventoAudiencia({
        assistidoNome: ctxRow?.assistidoNome ?? "Assistido",
        tipoAudiencia: input.tipo,
        dataAudiencia: new Date(input.dataAudiencia),
        local: input.local ?? undefined,
        numeroAutos: ctxRow?.numeroAutos ?? undefined,
        area: ctxRow?.area ?? null,
      });

      if (evento?.id) {
        await db
          .update(audiencias)
          .set({ googleCalendarEventId: evento.id })
          .where(eq(audiencias.id, audiencia.id));
        return { ...audiencia, googleCalendarEventId: evento.id, calendarSyncOk: true as const };
      }

      return { ...audiencia, calendarSyncOk: false as const };
    }),
```

**Nota sobre nomes de coluna:** se `assistidos.nomeCompleto` ou `processos.numeroAutos` não baterem (verificar `src/lib/db/schema/core.ts`), substituir pelos nomes reais. Faça `grep -n "nomeCompleto\|numeroAutos" src/lib/db/schema/core.ts` antes para confirmar.

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck 2>&1 | grep -E "audiencias\.ts" | head -10
```

Esperado: 0 erros nessa rota.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/audiencias.ts
git commit -m "feat(audiencias): create cria evento Calendar e grava googleCalendarEventId"
```

---

## Task 5: `audiencias.update` espelha mudanças no Calendar

**Files:**
- Modify: `src/lib/trpc/routers/audiencias.ts` (linhas ~733-765)

- [ ] **Step 1: Adicionar import**

Se ainda não estiver, no topo:

```ts
import { criarEventoAudiencia } from "@/lib/services/google-calendar";
import { updateCalendarEvent } from "@/lib/services/google-calendar";
```

(Ou agrupar em `import { criarEventoAudiencia, updateCalendarEvent } from "@/lib/services/google-calendar";`.)

Adicionar também `resolveCalendarId` se for precisar:

```ts
import { resolveCalendarId } from "@/lib/services/calendar-mapping";
```

- [ ] **Step 2: Substituir a mutation `update`**

```ts
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      dataAudiencia: z.string().or(z.date()).optional(),
      tipo: z.string().optional(),
      local: z.string().optional(),
      titulo: z.string().optional(),
      descricao: z.string().optional(),
      sala: z.string().optional(),
      horario: z.string().optional(),
      defensorId: z.number().optional(),
      juiz: z.string().optional(),
      promotor: z.string().optional(),
      status: z.string().optional(),
      resultado: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData: Partial<typeof audiencias.$inferInsert> = { ...data };

      if (data.dataAudiencia) {
        updateData.dataAudiencia = new Date(data.dataAudiencia);
      }

      const [audiencia] = await db
        .update(audiencias)
        .set(updateData)
        .where(eq(audiencias.id, id))
        .returning();

      // Sincronizar Calendar — só se algo relevante mudou
      const dataChanged = !!data.dataAudiencia;
      const tipoChanged = !!data.tipo;
      const localChanged = data.local !== undefined;

      if (!dataChanged && !tipoChanged && !localChanged) {
        return audiencia;
      }

      // Contexto pra resolver calendarId
      const [ctxRow] = await db
        .select({
          assistidoNome: assistidos.nomeCompleto,
          numeroAutos: processos.numeroAutos,
          area: demandas.area,
        })
        .from(processos)
        .leftJoin(assistidos, eq(assistidos.id, processos.assistidoId))
        .leftJoin(demandas, eq(demandas.processoId, processos.id))
        .where(eq(processos.id, audiencia.processoId))
        .limit(1);

      const calendarId = resolveCalendarId(ctxRow?.area ?? null);

      if (audiencia.googleCalendarEventId) {
        // Atualiza evento existente
        await updateCalendarEvent(
          audiencia.googleCalendarEventId,
          {
            startDate: audiencia.dataAudiencia,
            endDate: new Date(audiencia.dataAudiencia.getTime() + 60 * 60 * 1000),
            location: audiencia.local ?? undefined,
            summary: `🏛 ${audiencia.tipo} — ${ctxRow?.assistidoNome ?? "Assistido"}`,
          },
          { calendarId },
        );
      } else {
        // Segunda chance — cria agora
        const evento = await criarEventoAudiencia({
          assistidoNome: ctxRow?.assistidoNome ?? "Assistido",
          tipoAudiencia: audiencia.tipo,
          dataAudiencia: audiencia.dataAudiencia,
          local: audiencia.local ?? undefined,
          numeroAutos: ctxRow?.numeroAutos ?? undefined,
          area: ctxRow?.area ?? null,
        });
        if (evento?.id) {
          await db
            .update(audiencias)
            .set({ googleCalendarEventId: evento.id })
            .where(eq(audiencias.id, audiencia.id));
        }
      }

      return audiencia;
    }),
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck 2>&1 | grep -E "audiencias\.ts" | head -10
```

Esperado: 0 erros.

- [ ] **Step 4: Commit**

```bash
git add src/lib/trpc/routers/audiencias.ts
git commit -m "feat(audiencias): update espelha alterações no Calendar (com fallback create)"
```

---

## Task 6: `redesignarAudiencia` atualiza evento Calendar

**Files:**
- Modify: `src/lib/trpc/routers/audiencias.ts` (linhas ~1971-2012)

- [ ] **Step 1: Substituir o final da mutation `redesignarAudiencia`**

Localizar o bloco `await tx.update(audiencias).set({...}).where(...)` perto da linha 2000. Adicionar, **fora do `withTransaction`**, a chamada ao Calendar:

```ts
  redesignarAudiencia: protectedProcedure
    .input(z.object({
      audienciaId: z.number(),
      novaData: z.string(),
      novoHorario: z.string(),
      motivo: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Toda lógica transacional original preservada
      const result = await withTransaction(async (tx) => {
        const [atual] = await tx.select().from(audiencias).where(eq(audiencias.id, input.audienciaId));
        if (!atual) throw new TRPCError({ code: "NOT_FOUND", message: "Audiência não encontrada" });

        const [maxRow] = await tx
          .select({ versao: sql<number>`COALESCE(MAX(versao), 0)` })
          .from(audienciasHistorico)
          .where(eq(audienciasHistorico.audienciaId, input.audienciaId));
        const novaVersao = (maxRow?.versao ?? 0) + 1;

        await tx.insert(audienciasHistorico).values({
          audienciaId: input.audienciaId,
          versao: novaVersao,
          anotacoes: `[REDESIGNADA] ${input.motivo ?? "Sem motivo informado"}\nData anterior: ${atual.dataAudiencia.toISOString()}`,
          editadoPorId: ctx.user.id,
        });

        const [ano, mes, dia] = input.novaData.split("-").map(Number);
        const [hh, mm] = input.novoHorario.split(":").map(Number);
        const novaDataHora = new Date(ano, mes - 1, dia, hh, mm);

        await tx
          .update(audiencias)
          .set({
            dataAudiencia: novaDataHora,
            horario: input.novoHorario,
            status: "redesignada",
            updatedAt: new Date(),
          })
          .where(eq(audiencias.id, input.audienciaId));

        return { atual, novaDataHora };
      });

      // Sincronização Calendar — fora da transação para não bloquear o DB
      if (result.atual.googleCalendarEventId) {
        const [ctxRow] = await db
          .select({ area: demandas.area })
          .from(demandas)
          .where(eq(demandas.processoId, result.atual.processoId))
          .limit(1);
        const calendarId = resolveCalendarId(ctxRow?.area ?? null);

        await updateCalendarEvent(
          result.atual.googleCalendarEventId,
          {
            startDate: result.novaDataHora,
            endDate: new Date(result.novaDataHora.getTime() + 60 * 60 * 1000),
          },
          { calendarId },
        );
      }

      return { ok: true };
    }),
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | grep -E "audiencias\.ts" | head -10
```

Esperado: 0 erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/trpc/routers/audiencias.ts
git commit -m "feat(audiencias): redesignar move evento existente no Calendar"
```

---

## Task 7: `audiencias.delete` remove evento Calendar

**Files:**
- Modify: `src/lib/trpc/routers/audiencias.ts` (linhas ~768-773)

- [ ] **Step 1: Adicionar import (se ainda não tem)**

```ts
import { deleteCalendarEvent } from "@/lib/services/google-calendar";
```

- [ ] **Step 2: Substituir a mutation `delete`**

```ts
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [atual] = await db
        .select({
          googleCalendarEventId: audiencias.googleCalendarEventId,
          processoId: audiencias.processoId,
        })
        .from(audiencias)
        .where(eq(audiencias.id, input.id))
        .limit(1);

      await db.delete(audiencias).where(eq(audiencias.id, input.id));

      // Best-effort delete no Calendar
      if (atual?.googleCalendarEventId) {
        const [ctxRow] = await db
          .select({ area: demandas.area })
          .from(demandas)
          .where(eq(demandas.processoId, atual.processoId))
          .limit(1);
        const calendarId = resolveCalendarId(ctxRow?.area ?? null);
        await deleteCalendarEvent(atual.googleCalendarEventId, { calendarId });
      }

      return { success: true };
    }),
```

**Nota:** `deleteCalendarEvent` precisa aceitar `options?: { calendarId?: string }` (Task 2). Se ela ainda usa só `eventId` posicional, voltar e atualizá-la.

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck 2>&1 | grep -E "audiencias\.ts" | head -10
```

Esperado: 0 erros.

- [ ] **Step 4: Commit**

```bash
git add src/lib/trpc/routers/audiencias.ts
git commit -m "feat(audiencias): delete remove evento Calendar (best-effort)"
```

---

## Task 8: Toast feedback no front

**Files:**
- Modify: `src/components/demandas-premium/demandas-premium-view.tsx` (perto da linha 836 — `createAudienciaMutation`)

- [ ] **Step 1: Substituir o `onSuccess` do `createAudienciaMutation`**

Localizar o bloco em `demandas-premium-view.tsx:836-844`:

```tsx
  const createAudienciaMutation = trpc.audiencias.create.useMutation({
    onSuccess: () => {
      toast.success("Audiência registrada!");
      setAudienciaModal({ open: false, demandaId: null, sources: [] });
    },
    onError: (error) => {
      toast.error("Erro ao registrar audiência: " + error.message);
    },
  });
```

Substituir por:

```tsx
  const createAudienciaMutation = trpc.audiencias.create.useMutation({
    onSuccess: (result) => {
      if (result?.calendarSyncOk) {
        toast.success("Audiência registrada e agendada no Google Calendar");
      } else {
        toast.warning("Audiência registrada — mas falhou ao sincronizar com o Google Calendar");
      }
      setAudienciaModal({ open: false, demandaId: null, sources: [] });
    },
    onError: (error) => {
      toast.error("Erro ao registrar audiência: " + error.message);
    },
  });
```

- [ ] **Step 2: Verificar se há outro consumidor do `audiencias.create`**

```bash
grep -rn "audiencias\.create\.useMutation\|trpc\.audiencias\.create" src/components --include='*.tsx' | grep -v __tests__
```

Para cada match, aplicar o mesmo padrão (`onSuccess` checa `result?.calendarSyncOk`). Cubrir casos óbvios; se houver mais de 3, parar e reportar BLOCKED com a lista pra eu te dar contexto.

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck 2>&1 | grep -E "demandas-premium" | head -10
```

Esperado: 0 erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/demandas-premium/
git commit -m "feat(demandas): toast feedback diferenciado pra sincronização Calendar"
```

---

## Task 9: Verificação final + push

**Files:** nenhum (ops git).

- [ ] **Step 1: Rodar todos os testes**

```bash
pnpm test 2>&1 | tail -20
```

Esperado: testes do `calendar-mapping` verdes, sem regressão em outros.

- [ ] **Step 2: Typecheck do projeto**

```bash
pnpm typecheck 2>&1 | tail -30
```

Esperado: 0 erros novos. Erros pré-existentes em `instancia-superior.ts` e `vvd.ts` (não relacionados) podem aparecer; ignorar.

- [ ] **Step 3: Smoke test manual (10 min)**

Configurar localmente um valor temporário pra testar:

```bash
echo 'GOOGLE_CALENDAR_ID_JURI="primary"' >> .env.local
pnpm dev
```

Validar:
- Abrir uma demanda Júri no quick-preview
- Marcar `ato = "Ciência designação de audiência"` (ou usar fluxo equivalente)
- Modal abre com data parseada
- Confirmar → audiência salva, evento aparece no Google Calendar primary
- Toast `success` aparece
- Repetir desligando o env (`unset GOOGLE_REFRESH_TOKEN`) → toast `warning`, audiência ainda salva

- [ ] **Step 4: Push da branch**

```bash
git push origin feat/audiencia-calendar-sync
```

- [ ] **Step 5: Decidir push direto pra main vs PR**

Seguindo o padrão do PR-A (que foi pra main direto), oferecer ao usuário a escolha:

```bash
# Opção a: push pra main fast-forward
git push origin feat/audiencia-calendar-sync:main

# Opção b: abrir PR
gh pr create --title "feat(audiencias): auto-agendamento Google Calendar por área" --body "..."
```

Não decidir sozinho — pedir confirmação no canal.

- [ ] **Step 6: Lembrete pós-merge**

Recordar ao usuário:
1. **Configurar env vars no Vercel:**
   - `GOOGLE_CALENDAR_ID_JURI`
   - `GOOGLE_CALENDAR_ID_VVD`
   - `GOOGLE_CALENDAR_ID_EP`
   - `GOOGLE_CALENDAR_ID_CRIMINAL`
   - `GOOGLE_CALENDAR_ID_CRIMINAL_2` (opcional)
2. **Verificar GOOGLE_REFRESH_TOKEN** já existe e tem escopo `calendar`.
3. Sem env, cai no `GOOGLE_CALENDAR_ID` global ou `"primary"` — funciona, só não separa por área.

---

## Notas de execução

- **Pré-existente em main:** erros de typecheck em `instancia-superior.ts` e `vvd.ts` não relacionados — não bloqueiam.
- **CI no main falha por pnpm-lock missing** (memory) — Vercel preview é o check real.
- **Per-defensor calendars (multi-tenant):** explícito fora de escopo — `GOOGLE_REFRESH_TOKEN` segue compartilhado.
- **Falha do Calendar é fail-silent + toast warning** — nunca bloqueia operação local.
- **Sem novos testes para os mutations** — confiamos em type-check + smoke test (mocks de Drizzle + Calendar não pagam o custo aqui).
