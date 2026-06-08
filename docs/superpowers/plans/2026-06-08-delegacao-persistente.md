# Delegação persistente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar a delegação uma relação persistente: mudar o status do card no quadro do defensor não cancela mais a delegação; o andamento do delegatário vira um campo próprio (`delegacaoWorkStatus`) refletido num chip; "Retomar" é a única forma de desfazer.

**Architecture:** Três dimensões independentes — posição no quadro (`status`/`substatus`), estado de envio (`statusDelegacao` = a_delegar|delegado) e andamento do delegatário (novo `delegacaoWorkStatus`, espelho do `delegacoesHistorico`). Remove-se o cancelamento ao mudar status; o bucketing distingue delegado-parado (placeholder) de delegado-movido.

**Tech Stack:** TypeScript, tRPC v11, Drizzle (Postgres), React/Next, Vitest (env node). Repo `/Users/rodrigorochameire/Projetos/Defender`, branch `feat/delegacao-persistente`.

**Spec:** `docs/superpowers/specs/2026-06-08-delegacao-persistente-design.md`

---

## File Structure

- Create `drizzle/0050_delegacao_work_status.sql` — coluna + backfill.
- Modify `src/lib/db/schema/core.ts` — `delegacaoWorkStatus` em `demandas`.
- Modify `src/components/demandas-premium/section-bucketing.ts` — regra delegado placeholder/movido.
- Create `src/components/demandas-premium/delegacao-chip.ts` — `rotuloDelegacaoChip` (puro).
- Modify `src/lib/trpc/routers/delegacao.ts` — atualizarStatus→workStatus; `retomar`; marcarDelegado seta workStatus.
- Modify `src/lib/trpc/routers/demandas.ts` — remover cancelamento (update+batchUpdate); expor `delegacaoWorkStatus`.
- Modify `src/components/demandas-premium/kanban-premium.tsx` — chip via fn + botão Retomar.
- Modify `src/components/demandas-premium/demandas-premium-view.tsx` — mapear `delegacaoWorkStatus`.
- Tests: `section-bucketing.test.ts` (estender), `delegacao-chip.test.ts`.

---

## Task 1: Coluna delegacaoWorkStatus + backfill

**Files:**
- Create: `drizzle/0050_delegacao_work_status.sql`
- Modify: `src/lib/db/schema/core.ts`

- [ ] **Step 1: Migration**

```sql
-- drizzle/0050_delegacao_work_status.sql
ALTER TABLE demandas ADD COLUMN IF NOT EXISTS delegacao_work_status varchar(20);

-- Espelhar o andamento do histórico ativo mais recente nas demandas delegadas.
UPDATE demandas d
SET delegacao_work_status = h.status
FROM (
  SELECT DISTINCT ON (demanda_id) demanda_id, status
  FROM delegacoes_historico
  WHERE demanda_id IS NOT NULL
  ORDER BY demanda_id, data_delegacao DESC
) h
WHERE d.id = h.demanda_id AND d.delegado_para_id IS NOT NULL;
```

- [ ] **Step 2: Schema drizzle**

Em `src/lib/db/schema/core.ts`, no `pgTable("demandas", ...)`, logo após `statusDelegacao: varchar("status_delegacao", { length: 20 }),` adicionar:

```ts
  delegacaoWorkStatus: varchar("delegacao_work_status", { length: 20 }),
```

- [ ] **Step 3: Aplicar (se houver DATABASE_URL)**

Run: `psql "$DATABASE_URL" -f drizzle/0050_delegacao_work_status.sql 2>&1 | tail -3` — reportar. Se sem URL, pular e anotar (DDL idempotente via `IF NOT EXISTS`).

- [ ] **Step 4: Typecheck + commit**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep "schema/core" || echo "OK"` → `OK`.

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add drizzle/0050_delegacao_work_status.sql src/lib/db/schema/core.ts
git commit -m "feat(delegacao): coluna delegacao_work_status + backfill"
```

---

## Task 2: Bucketing — delegado parado vs movido

**Files:**
- Modify: `src/components/demandas-premium/section-bucketing.ts`
- Test: `src/components/demandas-premium/__tests__/section-bucketing.test.ts` (estender)

- [ ] **Step 1: Acrescentar testes ao final do describe de delegação**

```ts
describe("effectiveSectionKeys — delegado parado vs movido", () => {
  it("delegado com substatus placeholder 'delegar' fica em 'delegado'", () => {
    expect(
      effectiveSectionKeys({ id: 1, delegadoPara: "Amanda", statusDelegacao: "delegado", substatus: "delegar" }),
    ).toEqual(["delegado"]);
  });

  it("delegado sem substatus fica em 'delegado'", () => {
    expect(
      effectiveSectionKeys({ id: 2, delegadoPara: "Amanda", statusDelegacao: "delegado", substatus: null }),
    ).toEqual(["delegado"]);
  });

  it("delegado MOVIDO para coluna real sai de 'delegado' e vai para a pipeline", () => {
    expect(
      effectiveSectionKeys({ id: 3, delegadoPara: "Amanda", statusDelegacao: "delegado", substatus: "monitorar" }),
    ).toEqual(["monitorar"]);
  });
});
```

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/components/demandas-premium/__tests__/section-bucketing.test.ts` — o 3º teste FALHA (hoje delegado sempre → ["delegado"]).

- [ ] **Step 2: Atualizar `effectiveSectionKeys`**

Substituir o bloco `delegado` em `effectiveSectionKeys`:

```ts
export function effectiveSectionKeys(item: BucketItem): string[] {
  // Delegação (statusDelegacao) tem precedência sobre o status da pipeline,
  // exceto quando o defensor MOVE o card para uma coluna real — aí ele migra
  // mantendo o chip (a delegação persiste, só muda de lugar no quadro).
  if (item.statusDelegacao === "a_delegar") return ["a_delegar"];
  if (item.statusDelegacao === "delegado") {
    const sub = normalizeStatusKey(item.substatus);
    // Placeholder ("delegar") ou vazio = ainda na casa padrão "Delegados".
    if (!sub || sub === "delegar") return ["delegado"];
    return [sub];
  }
  return [normalizeStatusKey(item.substatus || item.status)];
}
```

- [ ] **Step 3: Rodar — passa**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/components/demandas-premium/__tests__/section-bucketing.test.ts` — todos PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/demandas-premium/section-bucketing.ts src/components/demandas-premium/__tests__/section-bucketing.test.ts
git commit -m "feat(delegacao): bucketing distingue delegado parado de movido"
```

---

## Task 3: Chip label puro (com andamento)

**Files:**
- Create: `src/components/demandas-premium/delegacao-chip.ts`
- Test: `src/components/demandas-premium/__tests__/delegacao-chip.test.ts`

- [ ] **Step 1: Teste que falha**

```ts
// src/components/demandas-premium/__tests__/delegacao-chip.test.ts
import { describe, it, expect } from "vitest";
import { rotuloDelegacaoChip } from "../delegacao-chip";

describe("rotuloDelegacaoChip", () => {
  it("a_delegar → Delegar a {primeiroNome}, tom a_delegar", () => {
    expect(rotuloDelegacaoChip({ statusDelegacao: "a_delegar", nome: "Amanda Silva" }))
      .toEqual({ texto: "Delegar a Amanda", tom: "a_delegar" });
  });

  it("delegado sem andamento → Delegado a {nome}, tom ativo", () => {
    expect(rotuloDelegacaoChip({ statusDelegacao: "delegado", nome: "Amanda Silva", delegacaoWorkStatus: null }))
      .toEqual({ texto: "Delegado a Amanda", tom: "ativo" });
  });

  it("delegado aguardando revisão → mostra o andamento", () => {
    expect(rotuloDelegacaoChip({ statusDelegacao: "delegado", nome: "Amanda Silva", delegacaoWorkStatus: "aguardando_revisao" }))
      .toEqual({ texto: "Delegado a Amanda · aguardando revisão", tom: "ativo" });
  });

  it("workStatus terminal → concluída, tom concluida", () => {
    expect(rotuloDelegacaoChip({ statusDelegacao: "delegado", nome: "Amanda", delegacaoWorkStatus: "concluida" }))
      .toEqual({ texto: "Delegado a Amanda · concluída", tom: "concluida" });
    expect(rotuloDelegacaoChip({ statusDelegacao: "delegado", nome: "Amanda", delegacaoWorkStatus: "protocolado" }).tom)
      .toBe("concluida");
  });

  it("sem delegação → null", () => {
    expect(rotuloDelegacaoChip({ statusDelegacao: null, nome: "X" })).toBeNull();
  });
});
```

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/components/demandas-premium/__tests__/delegacao-chip.test.ts` — FAIL (módulo não existe).

- [ ] **Step 2: Implementar**

```ts
// src/components/demandas-premium/delegacao-chip.ts
export type TomChip = "a_delegar" | "ativo" | "concluida";

const WORK_LABEL: Record<string, string> = {
  pendente: "enviado",
  aceita: "aceita",
  em_andamento: "em andamento",
  aguardando_revisao: "aguardando revisão",
  devolvida: "devolvida",
  revisado: "concluída",
  protocolado: "concluída",
  concluida: "concluída",
};

const TERMINAIS = new Set(["revisado", "protocolado", "concluida"]);

/** Texto + tom do chip de delegação. Null quando a demanda não está delegada. */
export function rotuloDelegacaoChip(p: {
  statusDelegacao?: string | null;
  delegacaoWorkStatus?: string | null;
  nome: string;
}): { texto: string; tom: TomChip } | null {
  const primeiro = p.nome.split(" ")[0] || p.nome;
  if (p.statusDelegacao === "a_delegar") {
    return { texto: `Delegar a ${primeiro}`, tom: "a_delegar" };
  }
  if (p.statusDelegacao === "delegado") {
    const ws = p.delegacaoWorkStatus;
    if (ws && TERMINAIS.has(ws)) {
      return { texto: `Delegado a ${primeiro} · concluída`, tom: "concluida" };
    }
    if (ws && WORK_LABEL[ws]) {
      return { texto: `Delegado a ${primeiro} · ${WORK_LABEL[ws]}`, tom: "ativo" };
    }
    return { texto: `Delegado a ${primeiro}`, tom: "ativo" };
  }
  return null;
}
```

- [ ] **Step 3: Rodar — passa**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/components/demandas-premium/__tests__/delegacao-chip.test.ts` — PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/demandas-premium/delegacao-chip.ts src/components/demandas-premium/__tests__/delegacao-chip.test.ts
git commit -m "feat(delegacao): rotuloDelegacaoChip com andamento do delegatário"
```

---

## Task 4: Router delegação — workStatus + retomar

**Files:**
- Modify: `src/lib/trpc/routers/delegacao.ts`

- [ ] **Step 1: atualizarStatus grava no campo novo**

Em `atualizarStatus` (delegacao.ts), no `db.update(demandas).set({...})` dentro de `if (delegacao.demandaId)` (linha ~286), trocar:
```ts
            statusDelegacao: input.status,
```
por:
```ts
            delegacaoWorkStatus: input.status,
```
(NÃO tocar `statusDelegacao` — ele é o estado de envio do defensor.)

- [ ] **Step 2: marcarDelegado também seta workStatus inicial**

Em `marcarDelegado` e `marcarDelegadoEmLote`, no `.set({ statusDelegacao: "delegado", updatedAt: new Date() })`, acrescentar `delegacaoWorkStatus: "pendente"` (recém-enviado, aguardando aceite):
```ts
        .set({ statusDelegacao: "delegado", delegacaoWorkStatus: "pendente", updatedAt: new Date() })
```

- [ ] **Step 3: Adicionar `retomar`**

Antes do fechamento do `delegacaoRouter`, adicionar:

```ts
  // Retomar a demanda: cancela a delegação (único caminho que a desfaz).
  retomar: protectedProcedure
    .input(z.object({ demandaId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [dem] = await db
        .update(demandas)
        .set({
          delegadoParaId: null,
          statusDelegacao: null,
          delegacaoWorkStatus: null,
          dataDelegacao: null,
          motivoDelegacao: null,
          updatedAt: new Date(),
        })
        .where(eq(demandas.id, input.demandaId))
        .returning();
      if (!dem) throw new TRPCError({ code: "NOT_FOUND", message: "Demanda não encontrada." });

      // Cancela delegações ativas no histórico e notifica quem recebia.
      const ativos = await db
        .update(delegacoesHistorico)
        .set({ status: "cancelada" })
        .where(
          and(
            eq(delegacoesHistorico.demandaId, input.demandaId),
            inArray(delegacoesHistorico.status, ["pendente", "aceita", "em_andamento", "aguardando_revisao"]),
          ),
        )
        .returning({ delegadoParaId: delegacoesHistorico.delegadoParaId });

      const destinatarios = new Set(ativos.map((a) => a.delegadoParaId).filter((x): x is number => !!x));
      const remetente = await db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
        columns: { name: true },
      });
      for (const destinatarioId of destinatarios) {
        await db.insert(notifications).values({
          userId: destinatarioId,
          title: "Delegação retomada",
          message: `${remetente?.name || "Um defensor"} retomou uma demanda que estava com você.`,
          type: "warning",
          actionUrl: "/admin/delegacoes",
          isRead: false,
        });
      }
      return dem;
    }),
```

(`eq`, `and`, `inArray`, `TRPCError`, `users`, `notifications`, `demandas`, `delegacoesHistorico` já estão importados.)

- [ ] **Step 4: Typecheck + commit**

Run: `npx tsc --noEmit 2>&1 | grep "routers/delegacao.ts" || echo "OK"` → `OK`.

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/trpc/routers/delegacao.ts
git commit -m "feat(delegacao): atualizarStatus grava workStatus + mutation retomar"
```

---

## Task 5: Router demandas — remover cancelamento + expor workStatus

**Files:**
- Modify: `src/lib/trpc/routers/demandas.ts`

- [ ] **Step 1: Remover o bloco de cancelamento do `update`**

Em `src/lib/trpc/routers/demandas.ts`, na mutation `update`, REMOVER o bloco inteiro que começa com o comentário `// Cancelar delegação:` e termina no fechamento do `if (data.status !== undefined || data.substatus !== undefined) { ... }` (o que faz `updateData.delegadoParaId = null` e marca histórico cancelada). Mudar status não deve mais mexer em delegação.

- [ ] **Step 2: Remover o bloco de cancelamento do `batchUpdate`**

Na mutation `batchUpdate`, REMOVER o bloco análogo (comentário `// Cancelar delegação em lote:` … `}` que nula os campos e marca histórico).

- [ ] **Step 3: Remover a const agora não usada**

Remover `const DELEGACAO_STATUS_ATIVOS = [...]` (perto do topo do arquivo) — ficou sem uso após remover os dois blocos. Confirmar com `grep -n DELEGACAO_STATUS_ATIVOS src/lib/trpc/routers/demandas.ts` que não há outras referências.

- [ ] **Step 4: Expor `delegacaoWorkStatus` no `list`**

No `select({...})` do `list` (perto de `statusDelegacao: demandas.statusDelegacao,` ~linha 135), adicionar:
```ts
          delegacaoWorkStatus: demandas.delegacaoWorkStatus,
```
Fazer o mesmo em qualquer outro select que já retorna `statusDelegacao` (ex.: ~linha 302), para consistência.

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit 2>&1 | grep "routers/demandas.ts" || echo "OK (só o erro pré-existente nomeAssistido permanece)"`
Expected: nenhum erro NOVO (o pré-existente `nomeAssistido` pode aparecer — ignorar).

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/trpc/routers/demandas.ts
git commit -m "feat(delegacao): status não cancela mais a delegação; expõe workStatus"
```

---

## Task 6: Card — chip com andamento + botão Retomar

**Files:**
- Modify: `src/components/demandas-premium/kanban-premium.tsx`
- Modify: `src/components/demandas-premium/demandas-premium-view.tsx`

- [ ] **Step 1: Tipo + mapeamento de `delegacaoWorkStatus`**

Em `kanban-premium.tsx`, na interface `KanbanDemanda` (onde há `statusDelegacao?: string | null;`, ~linha 100), adicionar:
```ts
  delegacaoWorkStatus?: string | null;
```
Em `demandas-premium-view.tsx`, no mapeamento (após `statusDelegacao: d.statusDelegacao ?? null,` ~linha 1110), adicionar:
```ts
      delegacaoWorkStatus: d.delegacaoWorkStatus ?? null,
```

- [ ] **Step 2: mutation `retomar` no card + manter as outras**

Em `kanban-premium.tsx`, junto às mutations do card (~linha 461-468), adicionar:
```ts
  const retomarDelegacao = trpc.delegacao.retomar.useMutation({
    onSuccess: () => { utilsDeleg.demandas.list.invalidate(); toast.success("Delegação retomada"); },
    onError: (e) => toast.error(e.message),
  });
```

- [ ] **Step 3: Chip via `rotuloDelegacaoChip` + botões**

No topo do arquivo, importar:
```ts
import { rotuloDelegacaoChip } from "./delegacao-chip";
```
Substituir o bloco do chip (atual `{demanda.delegadoPara && (statusDelegacao === "a_delegar" || "delegado") && (...)}`, ~linhas 930-963) por:

```tsx
        {(() => {
          const chip = demanda.delegadoPara
            ? rotuloDelegacaoChip({
                statusDelegacao: demanda.statusDelegacao,
                delegacaoWorkStatus: demanda.delegacaoWorkStatus,
                nome: demanda.delegadoPara,
              })
            : null;
          if (!chip) return null;
          const tomClass =
            chip.tom === "a_delegar"
              ? "border border-dashed border-violet-400 text-violet-600 dark:text-violet-300"
              : chip.tom === "concluida"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300";
          return (
            <div className="flex items-center justify-between mt-1 pl-8 gap-2">
              <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]", tomClass)}>
                <UserPlus className="h-3 w-3" />
                {chip.texto}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {demanda.statusDelegacao === "a_delegar" && (
                  <button
                    type="button"
                    className="text-[11px] text-violet-600 hover:underline"
                    onClick={(e) => { e.stopPropagation(); marcarDelegado.mutate({ demandaId: Number(demanda.id) }); }}
                  >
                    Marcar como delegado
                  </button>
                )}
                {demanda.statusDelegacao === "delegado" && (
                  <button
                    type="button"
                    className="text-[11px] text-neutral-500 hover:underline"
                    onClick={(e) => { e.stopPropagation(); reabrirDelegacao.mutate({ demandaId: Number(demanda.id) }); }}
                  >
                    Reabrir
                  </button>
                )}
                <button
                  type="button"
                  className="text-[11px] text-red-500 hover:underline"
                  onClick={(e) => { e.stopPropagation(); retomarDelegacao.mutate({ demandaId: Number(demanda.id) }); }}
                >
                  Retomar
                </button>
              </div>
            </div>
          );
        })()}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "kanban-premium|demandas-premium-view" || echo "OK"` → `OK`.

- [ ] **Step 5: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/demandas-premium/kanban-premium.tsx src/components/demandas-premium/demandas-premium-view.tsx
git commit -m "feat(delegacao): chip com andamento + botão Retomar no card"
```

---

## Task 7: Verificação ponta a ponta + merge

**Files:** nenhum.

- [ ] **Step 1: Suíte**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/components/demandas-premium/ src/components/demandas/` → PASS (bucketing + chip + mensagem).

- [ ] **Step 2: Typecheck (sem erros novos)**

Run: `npx tsc --noEmit 2>&1 | grep -E "schema/core|section-bucketing|delegacao-chip|routers/delegacao|routers/demandas|kanban-premium|demandas-premium-view" || echo "OK: nenhum erro novo da feature"`
Expected: `OK` (o erro pré-existente `demandas.ts` `nomeAssistido` não conta — confirmar que é o mesmo de main com `git show main:src/lib/trpc/routers/demandas.ts | grep -c "row.nomeAssistido"`).

- [ ] **Step 3: Smoke (dev server + browser, com DB)**

1. Card delegado-enviado fica em "Delegados" com chip "Delegado a X · enviado". Quando o delegatário avança (via página de Delegações), o chip vira "· em andamento"/"· aguardando revisão".
2. Mudar o status do card para Monitorar → vai para Monitorar **mantendo** o chip; o delegatário NÃO perde a tarefa (conferir `minhasDelegacoes` e `delegado_para_id` no banco — persiste).
3. "Retomar" → limpa a delegação, card volta à pipeline normal, histórico `cancelada`, notificação ao destinatário.
4. Delegatário conclui → chip "· concluída" (verde).

Verificar no banco: `psql "$DATABASE_URL" -c "SELECT id, status, substatus, status_delegacao, delegacao_work_status, delegado_para_id FROM demandas WHERE delegado_para_id IS NOT NULL LIMIT 5;"`

- [ ] **Step 4: Review final + merge**

Após aprovação do review, `superpowers:finishing-a-development-branch` → merge para main (o usuário pediu merge ao concluir).

---

## Notas de execução

- **Reversão:** as Tasks 5 removem o cancelamento entregue no branch anterior (`feat/fluxo-delegacao`). É intencional.
- **CI:** GH Actions falha por `pnpm-lock`; check real é o Vercel preview.
- **Erro pré-existente:** `demandas.ts` `row.nomeAssistido` (TS2551) existe em main — não é desta feature.
