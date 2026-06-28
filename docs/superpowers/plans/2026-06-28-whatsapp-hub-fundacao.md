# WhatsApp Hub — Fundação (M0+M1+M2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Religar o WhatsApp (Evolution) de forma resiliente, com mensagens em tempo real, auto-vínculo telefone↔assistido e conversa virando registro de atendimento honesto.

**Architecture:** Reusa a stack existente — Evolution API (Railway) + webhook (`/api/webhooks/evolution`) + Supabase Realtime (padrão `postgres_changes` já usado em 6 lugares) + `registros` como modelo de atendimento. Nenhuma infra nova. Três camadas: M0 (infra/ops + healthcheck cron), M1 (realtime + vínculo BR), M2 (conversa→registro).

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM, Supabase Postgres + Realtime, vitest, Railway CLI.

**Spec:** `docs/superpowers/specs/2026-06-28-whatsapp-hub-fundacao-design.md`

**Convenções do repo:**
- Testes: **vitest** (`npm run test`), arquivos em `__tests__/`.
- Typecheck: `npm run typecheck`. Lint: `npm run lint`.
- Schema: editar Drizzle (`src/lib/db/schema/*.ts` e `drizzle/schema.ts`) + escrever SQL datado em `supabase/migrations/AAAAMMDD_nome.sql`.
- Branch: `feat/whatsapp-hub-fundacao` (já criado).

---

## File Structure

**Criar:**
- `src/lib/utils/phone-br.ts` — `normalizeBrPhone()` (pura) + tipos. Responsabilidade única: normalização BR.
- `__tests__/lib/phone-br.test.ts` — tabela de casos BR.
- `src/lib/services/whatsapp-link.ts` — `matchAssistidoByPhone()` (acesso a DB; separado da função pura para testabilidade).
- `__tests__/lib/whatsapp-link.test.ts`
- `src/hooks/use-realtime-whatsapp-messages.ts` — espelha `use-realtime-demanda-eventos.ts`.
- `src/lib/services/whatsapp-atendimento.ts` — `findOrCreateWhatsappAtendimento()` (helper transacional M2).
- `__tests__/lib/whatsapp-atendimento.test.ts`
- `src/app/api/cron/whatsapp-healthcheck/route.ts` — healthcheck (M0).
- `scripts/apply-whatsapp-realtime-migration.ts` — adiciona tabelas à publication.
- `supabase/migrations/20260628_registros_origem.sql` — coluna `origem`.
- `supabase/migrations/20260628_whatsapp_realtime_publication.sql` — publication (espelhado pelo script).

**Modificar:**
- `src/lib/db/schema/agenda.ts` — coluna `origem` em `registros`.
- `drizzle/schema.ts` — idem (schema consolidado).
- `src/lib/trpc/routers/registros.ts:378` — input aceita `origem`.
- `src/app/api/webhooks/evolution/route.ts` — chama matcher ao criar contato novo (M1).
- `src/lib/trpc/routers/whatsapp-chat.ts` — `backfillPhoneLinks` mutation (M1); find-or-create no `sendMessage` (M2); ações gravam `registros` (M2).
- `src/components/whatsapp/ChatWindow.tsx`, `ConversationList.tsx` — consomem o hook realtime (M1).
- `src/app/(dashboard)/admin/whatsapp/vincular/page.tsx` — usa `normalizeBrPhone` + botão de backfill (M1).
- `vercel.json` — cron do healthcheck (M0).

---

## Phase 0 — M0 · Infra resiliente (ops + healthcheck)

> ⚠️ As tarefas 0.1–0.3 são **operacionais** (Railway/QR), não TDD. Executar com o usuário presente para o QR. As tarefas 0.4–0.5 são código testável.

### Task 0.1: Redeploy do Postgres da Evolution

**Pré:** Railway CLI autenticado (`railway whoami`), projeto `magnificent-charm` linkado.

- [ ] **Step 1: Redeploy do serviço Postgres**

Run:
```bash
railway redeploy -s Postgres -y
```
Expected: novo deployment iniciado; aguardar status SUCCESS/ACTIVE.

- [ ] **Step 2: Verificar Postgres de pé**

Run (substituir pela `DATABASE_PUBLIC_URL` do serviço):
```bash
railway variables -s Postgres --kv | grep DATABASE_PUBLIC_URL
```
Testar conexão via node `postgres` (ssl require). Expected: `SELECT now()` retorna sem ECONNRESET.

### Task 0.2: Redeploy do evolution-api e leitura de logs

- [ ] **Step 1: Redeploy**

Run:
```bash
railway redeploy -s evolution-api -y
```

- [ ] **Step 2: Acompanhar logs (causa da falha de 22/mar saiu de cena?)**

Run:
```bash
railway logs -s evolution-api | tail -60
```
Expected: container sobe e fica saudável. Se falhar, ler erro (provável env/DB) e corrigir variável antes de seguir.

- [ ] **Step 3: Confirmar HTTP 200**

Run (usar `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` do `.env.local`):
```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "apikey: $EVOLUTION_API_KEY" "$EVOLUTION_API_URL/instance/connectionState/ombuds"
```
Expected: `200` (não mais `502`).

### Task 0.3: Reconectar instância (QR) — requer o celular do usuário

- [ ] **Step 1: Gerar QR e escanear**

Abrir no OMBUDS `/admin/whatsapp` (componente `ConnectionStatus` chama `getQRCode`) OU o Manager UI `"$EVOLUTION_API_URL/manager"`. Escanear com o WhatsApp do número 557135086246.
Expected: `connectionState` vira `"open"`; webhook `CONNECTION_UPDATE` grava `evolution_config.status='connected'`.

- [ ] **Step 2: Validar webhook chega ao Vercel**

Enviar 1 mensagem de teste para o número e confirmar INSERT em `whatsapp_chat_messages` (via db:studio ou query).
Expected: mensagem inbound aparece no banco com `imported=false`.

### Task 0.4: Healthcheck cron (código testável)

**Files:**
- Create: `src/app/api/cron/whatsapp-healthcheck/route.ts`
- Modify: `vercel.json`
- Test: `__tests__/api/whatsapp-healthcheck.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

```typescript
// __tests__/api/whatsapp-healthcheck.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do service e do db antes de importar a rota
const getConnectionStatus = vi.fn();
const updateStatus = vi.fn();
vi.mock("@/lib/services/evolution-api", () => ({
  EvolutionApiClient: class {
    getConnectionStatus = getConnectionStatus;
  },
}));

describe("whatsapp-healthcheck", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dispara alerta apenas na transição connected→down", async () => {
    const { evaluateHealth } = await import(
      "@/app/api/cron/whatsapp-healthcheck/route"
    );
    // estava 'connected', agora 'close' → transição → alerta
    expect(evaluateHealth("connected", "close")).toEqual({
      newStatus: "disconnected",
      shouldAlert: true,
    });
    // já estava 'disconnected', continua down → SEM novo alerta
    expect(evaluateHealth("disconnected", "close")).toEqual({
      newStatus: "disconnected",
      shouldAlert: false,
    });
    // voltou: down→open, sem alerta (mas atualiza status)
    expect(evaluateHealth("disconnected", "open")).toEqual({
      newStatus: "connected",
      shouldAlert: false,
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test -- whatsapp-healthcheck`
Expected: FAIL (`evaluateHealth` não existe).

- [ ] **Step 3: Implementar a rota + função pura**

```typescript
// src/app/api/cron/whatsapp-healthcheck/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { evolutionConfig, whatsappConnectionLog } from "@/lib/db/schema/comunicacao";
import { EvolutionApiClient } from "@/lib/services/evolution-api";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Função pura: decide novo status e se deve alertar (só na transição p/ down). */
export function evaluateHealth(
  prevStatus: string,
  evoState: string,
): { newStatus: "connected" | "disconnected"; shouldAlert: boolean } {
  const isUp = evoState === "open";
  const newStatus = isUp ? "connected" : "disconnected";
  const wasUp = prevStatus === "connected";
  return { newStatus, shouldAlert: wasUp && !isUp };
}

export async function GET() {
  const configs = await db
    .select()
    .from(evolutionConfig)
    .where(eq(evolutionConfig.isActive, true));

  const results: Array<{ instance: string; status: string; alerted: boolean }> = [];

  for (const cfg of configs) {
    let evoState = "close";
    try {
      const client = new EvolutionApiClient({
        apiUrl: cfg.apiUrl,
        apiKey: cfg.apiKey,
        instanceName: cfg.instanceName,
      });
      const st = await client.getConnectionStatus();
      evoState = st.state ?? "close";
    } catch {
      evoState = "close";
    }

    const { newStatus, shouldAlert } = evaluateHealth(cfg.status ?? "disconnected", evoState);

    if (newStatus !== cfg.status) {
      await db
        .update(evolutionConfig)
        .set({ status: newStatus })
        .where(eq(evolutionConfig.id, cfg.id));
      await db.insert(whatsappConnectionLog).values({
        configId: cfg.id,
        event: newStatus === "connected" ? "connected" : "disconnected",
        details: { source: "healthcheck", evoState },
      });
    }
    // Alerta in-app: o banner já reage a evolution_config.status via Realtime.
    // shouldAlert reservado para um insert futuro em notificações in-app (M0 = banner basta).
    results.push({ instance: cfg.instanceName, status: newStatus, alerted: shouldAlert });
  }

  return NextResponse.json({ ok: true, results });
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test -- whatsapp-healthcheck`
Expected: PASS.

- [ ] **Step 5: Adicionar cron ao vercel.json**

Adicionar em `crons`:
```json
{ "path": "/api/cron/whatsapp-healthcheck", "schedule": "*/5 * * * *" }
```

- [ ] **Step 6: typecheck + commit**

Run: `npm run typecheck && git add -A && git commit -m "feat(whatsapp): healthcheck cron M0 com alerta só na transição"`

---

## Phase 1 — M1 · Tempo real + vínculo

### Task 1.1: Util `normalizeBrPhone` (TDD — peça central)

**Files:**
- Create: `src/lib/utils/phone-br.ts`
- Test: `__tests__/lib/phone-br.test.ts`

- [ ] **Step 1: Escrever os testes falhando**

```typescript
// __tests__/lib/phone-br.test.ts
import { describe, it, expect } from "vitest";
import { normalizeBrPhone } from "@/lib/utils/phone-br";

describe("normalizeBrPhone", () => {
  it("celular com DDI e 9º dígito → canônico", () => {
    expect(normalizeBrPhone("+55 (71) 99999-8888")).toBe("5571999998888");
    expect(normalizeBrPhone("5571999998888")).toBe("5571999998888");
  });
  it("celular SEM DDI → adiciona 55", () => {
    expect(normalizeBrPhone("71999998888")).toBe("5571999998888");
  });
  it("celular legado SEM 9º dígito → insere o 9", () => {
    expect(normalizeBrPhone("7188887777")).toBe("5571988887777"); // 10 díg, móvel (8xxx) → 9
    expect(normalizeBrPhone("557188887777")).toBe("5571988887777");
  });
  it("fixo (8 dígitos, inicia 2-5) → mantém sem inserir 9", () => {
    expect(normalizeBrPhone("7132045678")).toBe("557132045678");
    expect(normalizeBrPhone("557132045678")).toBe("557132045678");
  });
  it("lixo / curto demais → null (falha segura)", () => {
    expect(normalizeBrPhone("123")).toBeNull();
    expect(normalizeBrPhone("")).toBeNull();
    expect(normalizeBrPhone("abc")).toBeNull();
  });
  it("ignora sufixo @s.whatsapp.net e não-dígitos", () => {
    expect(normalizeBrPhone("557199999888@s.whatsapp.net")).toBe("5571999998888"); // 12→ insere? ver regra
  });
});
```

> Nota: o último caso (`557199999888`) tem 12 dígitos após DDI → DDD 71 + 9999988 8 = ver lógica; ajustar a expectativa ao comportamento definido no Step 3 (rodar para descobrir e fixar). A regra abaixo é a fonte da verdade.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test -- phone-br`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar**

```typescript
// src/lib/utils/phone-br.ts

/**
 * Normaliza um telefone brasileiro para a forma canônica "55" + DDD(2) + número.
 * - Remove não-dígitos e sufixos (ex.: @s.whatsapp.net).
 * - Aceita com/sem DDI 55, com/sem 9º dígito.
 * - Móveis são canonizados COM o 9º dígito (DDD + 9 + 8 dígitos).
 * - Fixos mantêm 8 dígitos.
 * - Retorna null quando não consegue normalizar com segurança (falha segura).
 */
export function normalizeBrPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, "");

  // Remove DDI 55 se presente em números longos
  if (d.length === 12 || d.length === 13) {
    if (d.startsWith("55")) d = d.slice(2);
  }

  // Agora esperamos DDD(2) + 8 (fixo/legado) ou DDD(2) + 9 (móvel)
  if (d.length === 11) {
    // móvel canônico: 3º dígito (1º do número) deve ser 9
    if (d[2] === "9") return "55" + d;
    return null; // 11 dígitos sem o 9 na posição certa → inválido
  }

  if (d.length === 10) {
    const ddd = d.slice(0, 2);
    const num = d.slice(2); // 8 dígitos
    const first = num[0];
    // Móvel legado (1º dígito 6-9) → insere 9. Fixo (2-5) → mantém.
    if (first >= "6") return "55" + ddd + "9" + num;
    return "55" + ddd + num;
  }

  return null;
}
```

- [ ] **Step 4: Rodar, ajustar expectativa do caso de 12 dígitos, ver passar**

Run: `npm run test -- phone-br`
Expected: PASS (fixar a expectativa do caso ambíguo conforme a saída real).

- [ ] **Step 5: Commit**

Run: `git add -A && git commit -m "feat(whatsapp): normalizeBrPhone com 9º dígito (M1)"`

### Task 1.2: Matcher `matchAssistidoByPhone`

**Files:**
- Create: `src/lib/services/whatsapp-link.ts`
- Test: `__tests__/lib/whatsapp-link.test.ts`

- [ ] **Step 1: Teste falhando (lógica de decisão pura)**

```typescript
// __tests__/lib/whatsapp-link.test.ts
import { describe, it, expect } from "vitest";
import { decideLink } from "@/lib/services/whatsapp-link";

describe("decideLink", () => {
  const key = "5571999998888";
  it("match único exato → vincula", () => {
    expect(decideLink(key, [{ id: 10, telefone: "71999998888", telefoneContato: null }]))
      .toEqual({ kind: "linked", assistidoId: 10 });
  });
  it("dois assistidos batem → ambíguo, não vincula", () => {
    expect(
      decideLink(key, [
        { id: 10, telefone: "71999998888", telefoneContato: null },
        { id: 11, telefone: null, telefoneContato: "5571999998888" },
      ]),
    ).toEqual({ kind: "ambiguous", candidates: [10, 11] });
  });
  it("nenhum bate → none", () => {
    expect(decideLink(key, [{ id: 10, telefone: "7132045678", telefoneContato: null }]))
      .toEqual({ kind: "none" });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar.** Run: `npm run test -- whatsapp-link` → FAIL.

- [ ] **Step 3: Implementar `decideLink` + `matchAssistidoByPhone`**

```typescript
// src/lib/services/whatsapp-link.ts
import { db } from "@/lib/db";
import { assistidos } from "@/lib/db/schema/core";
import { whatsappContacts } from "@/lib/db/schema/comunicacao";
import { normalizeBrPhone } from "@/lib/utils/phone-br";
import { eq, isNull, or, like } from "drizzle-orm";

type Cand = { id: number; telefone: string | null; telefoneContato: string | null };
export type LinkDecision =
  | { kind: "linked"; assistidoId: number }
  | { kind: "ambiguous"; candidates: number[] }
  | { kind: "none" };

/** Decisão pura: compara a chave canônica contra candidatos. */
export function decideLink(key: string, cands: Cand[]): LinkDecision {
  const hits = cands.filter(
    (c) => normalizeBrPhone(c.telefone) === key || normalizeBrPhone(c.telefoneContato) === key,
  );
  if (hits.length === 1) return { kind: "linked", assistidoId: hits[0].id };
  if (hits.length > 1) return { kind: "ambiguous", candidates: hits.map((h) => h.id) };
  return { kind: "none" };
}

/** Busca candidatos por filtro grosseiro (últimos 8 dígitos) e confirma em JS. */
export async function matchAssistidoByPhone(phone: string): Promise<LinkDecision> {
  const key = normalizeBrPhone(phone);
  if (!key) return { kind: "none" };
  const last8 = key.slice(-8);
  const cands = await db
    .select({
      id: assistidos.id,
      telefone: assistidos.telefone,
      telefoneContato: assistidos.telefoneContato,
    })
    .from(assistidos)
    .where(or(like(assistidos.telefone, `%${last8}`), like(assistidos.telefoneContato, `%${last8}`)));
  return decideLink(key, cands);
}

/** Aplica o vínculo no contato somente se a decisão for 'linked'. */
export async function autoLinkContact(contactId: number, phone: string): Promise<LinkDecision> {
  const decision = await matchAssistidoByPhone(phone);
  if (decision.kind === "linked") {
    await db
      .update(whatsappContacts)
      .set({ assistidoId: decision.assistidoId })
      .where(eq(whatsappContacts.id, contactId));
  }
  return decision;
}
```

- [ ] **Step 4: Rodar e ver passar.** Run: `npm run test -- whatsapp-link` → PASS.
- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat(whatsapp): matcher telefone↔assistido, auto só em match único (M1)"`

### Task 1.3: Integrar matcher no webhook (contato novo)

**Files:** Modify `src/app/api/webhooks/evolution/route.ts` (no `handleMessageUpsert`, após criar contato novo, ~linhas 175-190).

- [ ] **Step 1:** Localizar o ponto onde um `whatsappContacts` é inserido (contato inexistente). Logo após o insert, chamar:

```typescript
import { autoLinkContact } from "@/lib/services/whatsapp-link";
// ...após criar o contato (quando assistidoId ainda é null):
await autoLinkContact(novoContato.id, novoContato.phone).catch(() => {});
```

- [ ] **Step 2:** typecheck. Run: `npm run typecheck`.
- [ ] **Step 3:** Commit. `git commit -am "feat(whatsapp): auto-vínculo de contato novo no webhook (M1)"`

### Task 1.4: Migration de publication Realtime

**Files:**
- Create: `supabase/migrations/20260628_whatsapp_realtime_publication.sql`
- Create: `scripts/apply-whatsapp-realtime-migration.ts` (espelha `scripts/apply-demanda-eventos-migration.ts`)

- [ ] **Step 1: SQL idempotente**

```sql
-- supabase/migrations/20260628_whatsapp_realtime_publication.sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='whatsapp_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_chat_messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='whatsapp_contacts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_contacts;
  END IF;
END $$;
```

- [ ] **Step 2: Aplicar** (espelhar o runner existente). Run: `npx tsx scripts/apply-whatsapp-realtime-migration.ts`
Expected: log "added" ou "already present" para as 2 tabelas.

- [ ] **Step 3: Verificar.** Query: `SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename LIKE 'whatsapp%';` → 2 linhas.
- [ ] **Step 4: Commit.** `git add -A && git commit -m "feat(whatsapp): tabelas no publication realtime (M1)"`

### Task 1.5: Hook `use-realtime-whatsapp-messages`

**Files:**
- Create: `src/hooks/use-realtime-whatsapp-messages.ts` (espelhar `src/hooks/use-realtime-demanda-eventos.ts`)

- [ ] **Step 1: Implementar** seguindo o padrão existente: assinar `postgres_changes` em `whatsapp_chat_messages` filtrado por `contact_id=eq.{contactId}` (evento INSERT/UPDATE) → invalida/atualiza a query de mensagens; e canal separado para `whatsapp_contacts` (atualiza a lista). Receber `contactId` e um callback (ou `utils.whatsappChat.listMessages.invalidate`).

- [ ] **Step 2:** typecheck. Run: `npm run typecheck`.
- [ ] **Step 3: Commit.** `git commit -am "feat(whatsapp): hook realtime de mensagens (M1)"`

### Task 1.6: Consumir o hook em ChatWindow e ConversationList

**Files:** Modify `src/components/whatsapp/ChatWindow.tsx`, `ConversationList.tsx`.

- [ ] **Step 1:** Em `ChatWindow`, chamar `useRealtimeWhatsappMessages(contactId)` e remover/relaxar o polling de 15s (`refetchInterval`) da query de mensagens. Em `ConversationList`, assinar updates de `whatsapp_contacts` para reordenar/atualizar badges sem polling.
- [ ] **Step 2:** Validar manualmente: enviar mensagem ao número → aparece no chat aberto sem refresh (requer M0 vivo).
- [ ] **Step 3: Commit.** `git commit -am "feat(whatsapp): chat e lista em tempo real (M1)"`

### Task 1.7: Mutation `backfillPhoneLinks` + botão

**Files:** Modify `src/lib/trpc/routers/whatsapp-chat.ts`; `vincular/page.tsx`.

- [ ] **Step 1: Adicionar a mutation** (admin-only, idempotente):

```typescript
backfillPhoneLinks: adminProcedure.mutation(async () => {
  const orfaos = await db
    .select({ id: whatsappContacts.id, phone: whatsappContacts.phone })
    .from(whatsappContacts)
    .where(isNull(whatsappContacts.assistidoId));
  let linked = 0, ambiguous = 0, failed = 0;
  for (const c of orfaos) {
    const d = await autoLinkContact(c.id, c.phone).catch(() => ({ kind: "none" as const }));
    if (d.kind === "linked") linked++;
    else if (d.kind === "ambiguous") ambiguous++;
    else failed++;
  }
  return { total: orfaos.length, linked, ambiguous, failed };
}),
```
(Usar o procedure admin existente no projeto; se for `protectedProcedure` + checagem `ctx.user.isAdmin`, seguir o padrão local.)

- [ ] **Step 2:** Botão "Vincular automaticamente os órfãos" em `/vincular` chamando a mutation e mostrando o resultado (`{linked, ambiguous, failed}`).
- [ ] **Step 3:** typecheck. Run: `npm run typecheck`.
- [ ] **Step 4: Rodar o backfill uma vez** (com Evolution viva ou não — é só DB) e conferir os 214 órfãos.
- [ ] **Step 5: Commit.** `git commit -am "feat(whatsapp): backfill de vínculo dos contatos órfãos (M1)"`

### Task 1.8: Atualizar `vincular/page.tsx` para usar `normalizeBrPhone`

- [ ] **Step 1:** Substituir `normalizePhone` (linha 42) e a comparação por "últimos 8 dígitos" (linhas 72-76) pelo `normalizeBrPhone` + igualdade de chave canônica nas sugestões.
- [ ] **Step 2:** typecheck + commit. `git commit -am "refactor(whatsapp): sugestões de vínculo usam normalização BR (M1)"`

---

## Phase 2 — M2 · Conversa vira caso

### Task 2.1: Coluna `origem` em `registros`

**Files:**
- Modify: `src/lib/db/schema/agenda.ts` (após `interlocutor`), `drizzle/schema.ts`.
- Create: `supabase/migrations/20260628_registros_origem.sql`.
- Modify: `src/lib/trpc/routers/registros.ts:378` (input + insert).

- [ ] **Step 1: SQL**

```sql
-- supabase/migrations/20260628_registros_origem.sql
ALTER TABLE registros ADD COLUMN IF NOT EXISTS origem varchar(20) NOT NULL DEFAULT 'manual';
```

- [ ] **Step 2: Drizzle schema** — adicionar em `registros`:
```typescript
origem: varchar("origem", { length: 20 }).notNull().default("manual"),
```
(nos dois arquivos de schema).

- [ ] **Step 3: Input do `registros.create`** — adicionar:
```typescript
origem: z.enum(["manual", "whatsapp", "solar", "audio"]).default("manual"),
```
e no `.values({...})`: `origem: input.origem,`.

- [ ] **Step 4: Aplicar migration + typecheck.** Run: `npm run db:push` (ou aplicar o SQL) e `npm run typecheck`.
- [ ] **Step 5: Commit.** `git commit -am "feat(registros): coluna origem para chavear atendimento (M2)"`

### Task 2.2: Helper `findOrCreateWhatsappAtendimento` (TDD)

**Files:**
- Create: `src/lib/services/whatsapp-atendimento.ts`
- Test: `__tests__/lib/whatsapp-atendimento.test.ts`

- [ ] **Step 1: Teste da janela do dia (fuso SP, função pura)**

```typescript
// __tests__/lib/whatsapp-atendimento.test.ts
import { describe, it, expect } from "vitest";
import { saoPauloDayRange } from "@/lib/services/whatsapp-atendimento";

describe("saoPauloDayRange", () => {
  it("retorna início e fim do dia local de São Paulo em UTC", () => {
    // 2026-06-28 10:00 SP (UTC-3) → dia local 2026-06-28
    const { start, end } = saoPauloDayRange(new Date("2026-06-28T13:00:00Z"));
    // 00:00 SP = 03:00 UTC
    expect(start.toISOString()).toBe("2026-06-28T03:00:00.000Z");
    expect(end.toISOString()).toBe("2026-06-29T03:00:00.000Z");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar.** Run: `npm run test -- whatsapp-atendimento` → FAIL.

- [ ] **Step 3: Implementar**

```typescript
// src/lib/services/whatsapp-atendimento.ts
import { registros } from "@/lib/db/schema/agenda";
import { and, eq, gte, lt } from "drizzle-orm";

/** Início (inclusive) e fim (exclusive) do dia LOCAL de São Paulo, em UTC.
 *  SP é UTC-3 o ano todo (sem horário de verão desde 2019). */
export function saoPauloDayRange(now: Date): { start: Date; end: Date } {
  const OFFSET_MS = 3 * 60 * 60 * 1000; // UTC-3
  const local = new Date(now.getTime() - OFFSET_MS);
  const y = local.getUTCFullYear(), m = local.getUTCMonth(), d = local.getUTCDate();
  const startLocalMidnightUtc = Date.UTC(y, m, d) + OFFSET_MS;
  return {
    start: new Date(startLocalMidnightUtc),
    end: new Date(startLocalMidnightUtc + 24 * 60 * 60 * 1000),
  };
}

/** Find-or-create transacional do atendimento WhatsApp do dia. No-op se já existe. */
export async function findOrCreateWhatsappAtendimento(
  tx: any,
  args: { assistidoId: number; autorId: number; processoId?: number | null; demandaId?: number | null; now: Date },
): Promise<{ created: boolean }> {
  const { start, end } = saoPauloDayRange(args.now);
  const existing = await tx
    .select({ id: registros.id })
    .from(registros)
    .where(
      and(
        eq(registros.assistidoId, args.assistidoId),
        eq(registros.origem, "whatsapp"),
        eq(registros.tipo, "atendimento"),
        gte(registros.dataRegistro, start),
        lt(registros.dataRegistro, end),
      ),
    )
    .limit(1);
  if (existing.length > 0) return { created: false };
  await tx.insert(registros).values({
    assistidoId: args.assistidoId,
    processoId: args.processoId ?? null,
    demandaId: args.demandaId ?? null,
    tipo: "atendimento",
    interlocutor: "assistido",
    origem: "whatsapp",
    conteudo: "Atendimento via WhatsApp",
    dataRegistro: args.now,
    status: "realizado",
    autorId: args.autorId,
  });
  return { created: true };
}
```

- [ ] **Step 4: Rodar e ver passar.** Run: `npm run test -- whatsapp-atendimento` → PASS.
- [ ] **Step 5: Commit.** `git commit -am "feat(whatsapp): helper find-or-create de atendimento (M2)"`

### Task 2.3: Disparar o atendimento no `sendMessage`

**Files:** Modify `src/lib/trpc/routers/whatsapp-chat.ts` (procedure `sendMessage`, ~linha 861).

- [ ] **Step 1:** Após o envio bem-sucedido, carregar o contato; se `assistidoId != null`, dentro de uma transação chamar `findOrCreateWhatsappAtendimento(tx, { assistidoId, autorId: ctx.user.id, processoId/demandaId ativos se já disponíveis, now: new Date() })`. Encapsular em try/catch para não derrubar o envio se o registro falhar.
- [ ] **Step 2:** typecheck. Run: `npm run typecheck`.
- [ ] **Step 3: Commit.** `git commit -am "feat(whatsapp): responder gera atendimento do dia (M2)"`

### Task 2.4: Ações gravam `registros` no dossiê

**Files:** Modify `src/lib/trpc/routers/whatsapp-chat.ts` (`saveToCase`, `createNoteFromMessage`, `applyExtractedData`).

- [ ] **Step 1:** Em cada ação, além do `whatsapp_message_actions` já existente, inserir um `registros` ligado ao `assistidoId` do contato e ao `processoId`/`demandaId` alvo, com `origem:"whatsapp"` e `tipo` adequado (ex.: `"anotacao"` para nota, `"diligencia"` para extração aplicada). Reusar a lógica de `registros.create`.
- [ ] **Step 2:** typecheck. Run: `npm run typecheck`.
- [ ] **Step 3: Commit.** `git commit -am "feat(whatsapp): ações de mensagem gravam no dossiê (M2)"`

---

## Phase 3 — Validação E2E (requer M0 vivo)

### Task 3.1: Checklist manual de ponta a ponta

- [ ] Evolution viva (`connectionState=open`), banner verde no OMBUDS.
- [ ] Enviar mensagem ao número → aparece **em tempo real** no chat (sem refresh).
- [ ] Novo contato cujo telefone bate em 1 assistido → **auto-vinculado**; telefone ambíguo → fica como sugestão.
- [ ] Backfill rodado: conferir quantos dos 214 vincularam.
- [ ] Assistido manda "oi" e você NÃO responde → **nenhum** registro; aparece em "Aguardando resposta".
- [ ] Você responde → `registros` tipo "atendimento" `origem=whatsapp` aparece na timeline do perfil; segundo envio no mesmo dia **não** cria outro.
- [ ] Derrubar a Evolution (parar serviço) → em ≤5 min o banner fica vermelho (healthcheck).

### Task 3.2: Suite verde + typecheck final

- [ ] Run: `npm run test` → tudo verde.
- [ ] Run: `npm run typecheck` → sem erros.
- [ ] Run: `npm run lint` → sem erros novos.

---

## Riscos conhecidos

- **Redeploy da Evolution pode falhar de novo** (causa de 22/mar desconhecida — logs expurgados). Mitigação: ler logs frescos no redeploy (Task 0.2) e corrigir env antes de seguir.
- **`adminProcedure`**: confirmar o nome real do procedure admin no projeto; se inexistente, usar `protectedProcedure` + checagem `ctx.user` de admin.
- **Caso de 12 dígitos no `normalizeBrPhone`**: fixar a expectativa do teste conforme a regra (Task 1.1 Step 4).
- **`registros` migrado via db:push vs SQL**: seguir o que o projeto já faz (mix); garantir que a coluna existe no banco de produção antes do M2 rodar.
