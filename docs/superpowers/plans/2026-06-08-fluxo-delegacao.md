# Fluxo de delegação no Kanban — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Distinguir "a delegar" (pendente de envio) de "delegado" (recebido) no Kanban, corrigir o bug que prende demandas delegadas na coluna Delegação, cancelar a delegação ao mudar o status, e gerar a mensagem em bloco completa.

**Architecture:** `statusDelegacao` ganha dois valores canônicos (`a_delegar`/`delegado`) independentes da pipeline. O bucketing passa a chavear por `statusDelegacao`; o router de delegação ganha transições manuais; o de demandas cancela a delegação quando um status de pipeline é aplicado; a mensagem em bloco vira função pura sem truncamento.

**Tech Stack:** TypeScript, tRPC v11, Drizzle (Postgres), React/Next, Vitest (env node). Repo `/Users/rodrigorochameire/Projetos/Defender`, branch `feat/fluxo-delegacao`.

**Spec:** `docs/superpowers/specs/2026-06-08-fluxo-delegacao-design.md`

---

## File Structure

- Modify `src/config/demanda-status.ts` — `STATUS_DELEGACAO` const; split Delegação section into "A delegar"/"Delegados".
- Modify `src/components/demandas-premium/section-bucketing.ts` — `effectiveSectionKeys` by `statusDelegacao` (+ `statusDelegacao` on `BucketItem`).
- Modify `src/lib/trpc/routers/delegacao.ts` — `a_delegar` on criar/criarEmLote; move notification; add `marcarDelegado`/`marcarDelegadoEmLote`/`reabrirDelegacao`.
- Modify `src/lib/trpc/routers/demandas.ts` — cancel delegation when pipeline status applied to a delegated demanda.
- Create `src/components/demandas/delegacao-message.ts` — `montarMensagemDelegacao` (pure).
- Modify `src/components/demandas/delegacao-batch-modal.tsx` — use the pure fn (no `slice(0,5)`).
- Modify `src/components/demandas-premium/kanban-premium.tsx` — two-state chip + marcar/reabrir buttons; drop on delegation subsection.
- Modify `src/components/demandas-premium/demandas-premium-view.tsx` — drop key handling for `a_delegar`.
- Create `drizzle/0049_delegacao_backfill.sql` — backfill legacy statusDelegacao.
- Tests: `section-bucketing.test.ts`, `delegacao-message.test.ts`.

---

## Task 1: Constantes e subseções no config

**Files:**
- Modify: `src/config/demanda-status.ts`

- [ ] **Step 1: Adicionar a constante canônica**

Perto do topo dos exports de `src/config/demanda-status.ts` (após os imports), adicionar:

```ts
// Estados de envio da delegação (lado do defensor) — independem do status da pipeline.
export const STATUS_DELEGACAO = {
  A_DELEGAR: "a_delegar",
  DELEGADO: "delegado",
} as const;
export type StatusDelegacao = (typeof STATUS_DELEGACAO)[keyof typeof STATUS_DELEGACAO];
```

- [ ] **Step 2: Dividir a seção Delegação em duas**

Em `SUB_GROUP_SECTIONS.acompanhar` (linha ~143-146), trocar a entrada única `{ label: "Delegação", icon: UserPlus, statuses: ["delegar"] }` por:

```ts
  acompanhar: [
    { label: "Monitorar", icon: Eye, statuses: ["monitorar"] },
    { label: "A delegar", icon: UserPlus, statuses: ["a_delegar"] },
    { label: "Delegados", icon: UserPlus, statuses: ["delegado"] },
  ],
```

- [ ] **Step 3: Typecheck + commit**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep "demanda-status" || echo "OK"` → `OK`.

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/config/demanda-status.ts
git commit -m "feat(delegacao): STATUS_DELEGACAO + subseções A delegar/Delegados"
```

---

## Task 2: Bucketing por statusDelegacao

**Files:**
- Modify: `src/components/demandas-premium/section-bucketing.ts`
- Test: `src/components/demandas-premium/__tests__/section-bucketing.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/components/demandas-premium/__tests__/section-bucketing.test.ts
import { describe, it, expect } from "vitest";
import { effectiveSectionKeys, bucketIntoSections, type BucketSection } from "../section-bucketing";

const SECOES: BucketSection[] = [
  { label: "Monitorar", statuses: ["monitorar"] },
  { label: "A delegar", statuses: ["a_delegar"] },
  { label: "Delegados", statuses: ["delegado"] },
];

describe("effectiveSectionKeys — delegação por statusDelegacao", () => {
  it("a_delegar vai para a seção 'A delegar'", () => {
    expect(
      effectiveSectionKeys({ id: 1, delegadoPara: "Amanda", statusDelegacao: "a_delegar" }),
    ).toEqual(["a_delegar"]);
  });

  it("delegado vai para a seção 'Delegados'", () => {
    expect(
      effectiveSectionKeys({ id: 2, delegadoPara: "Amanda", statusDelegacao: "delegado" }),
    ).toEqual(["delegado"]);
  });

  it("delegatário presente mas statusDelegacao nulo → cai no status da pipeline (não prende em delegação)", () => {
    const keys = effectiveSectionKeys({
      id: 3,
      delegadoPara: "Amanda",
      statusDelegacao: null,
      substatus: "monitorar",
    });
    expect(keys).toEqual(["monitorar"]);
  });

  it("sem delegação usa o substatus normalizado", () => {
    expect(effectiveSectionKeys({ id: 4, substatus: "4_MONITORAR" })).toEqual(["monitorar"]);
  });

  it("bucketIntoSections distribui nas subseções certas", () => {
    const { perSection } = bucketIntoSections(
      [
        { id: 1, delegadoPara: "Amanda", statusDelegacao: "a_delegar" },
        { id: 2, delegadoPara: "Emilly", statusDelegacao: "delegado" },
        { id: 3, statusDelegacao: null, substatus: "monitorar" },
      ],
      SECOES,
    );
    expect(perSection.get("A delegar")!.map((i) => i.id)).toEqual([1]);
    expect(perSection.get("Delegados")!.map((i) => i.id)).toEqual([2]);
    expect(perSection.get("Monitorar")!.map((i) => i.id)).toEqual([3]);
  });
});
```

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/components/demandas-premium/__tests__/section-bucketing.test.ts` — FAIL (statusDelegacao não existe em BucketItem / lógica antiga retorna ["delegar"]).

- [ ] **Step 2: Implementar**

Em `src/components/demandas-premium/section-bucketing.ts`:

1. Adicionar `statusDelegacao?: string | null;` à interface `BucketItem` (junto a `delegadoPara`).
2. Substituir `effectiveSectionKeys` por:

```ts
export function effectiveSectionKeys(item: BucketItem): string[] {
  // A dimensão delegação (statusDelegacao) tem precedência sobre o status da
  // pipeline. Não chaveamos mais pela mera presença de delegadoPara — uma
  // demanda com delegatário mas sem statusDelegacao (ex.: delegação cancelada)
  // volta a cair no status escolhido.
  if (item.statusDelegacao === "a_delegar") return ["a_delegar"];
  if (item.statusDelegacao === "delegado") return ["delegado"];
  return [normalizeStatusKey(item.substatus || item.status)];
}
```

- [ ] **Step 3: Rodar — passa**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/components/demandas-premium/__tests__/section-bucketing.test.ts` — 5 PASS.

- [ ] **Step 4: Typecheck + commit**

Run: `npx tsc --noEmit 2>&1 | grep "section-bucketing" || echo "OK"` → `OK`.

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/demandas-premium/section-bucketing.ts src/components/demandas-premium/__tests__/section-bucketing.test.ts
git commit -m "fix(delegacao): bucketing por statusDelegacao (corrige card preso na Delegação)"
```

---

## Task 3: Mensagem em bloco (função pura)

**Files:**
- Create: `src/components/demandas/delegacao-message.ts`
- Test: `src/components/demandas/__tests__/delegacao-message.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/components/demandas/__tests__/delegacao-message.test.ts
import { describe, it, expect } from "vitest";
import { montarMensagemDelegacao } from "../delegacao-message";

const oito = Array.from({ length: 8 }, (_, i) => ({
  processoNumero: `000${i}-00.2026`,
  assistidoNome: `Assistido ${i}`,
  ato: "Resposta à Acusação",
}));

describe("montarMensagemDelegacao", () => {
  it("lista TODAS as demandas, sem truncar em 5", () => {
    const msg = montarMensagemDelegacao({
      destinatarioNome: "Amanda Silva",
      demandas: oito,
      instrucoes: "Elaborar minutas.",
      prazo: "2026-06-20",
      horaDoDia: 9,
    });
    // 8 itens numerados, o 8º presente
    expect(msg).toContain("8. ");
    expect(msg).not.toContain("e mais");
    expect(msg).toContain("Amanda"); // saudação com primeiro nome
    expect(msg).toContain("Elaborar minutas.");
  });

  it("saudação varia por hora", () => {
    const m = montarMensagemDelegacao({ destinatarioNome: "Ana", demandas: oito.slice(0, 1), horaDoDia: 20 });
    expect(m.startsWith("Boa noite")).toBe(true);
  });
});
```

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/components/demandas/__tests__/delegacao-message.test.ts` — FAIL (módulo não existe).

- [ ] **Step 2: Implementar**

```ts
// src/components/demandas/delegacao-message.ts
export interface DemandaMsg {
  processoNumero?: string;
  assistidoNome?: string;
  ato?: string;
}

export function montarMensagemDelegacao(params: {
  destinatarioNome: string;
  demandas: DemandaMsg[];
  instrucoes?: string;
  prazo?: string;
  /** Hora do dia (0-23) para a saudação. */
  horaDoDia: number;
}): string {
  const { destinatarioNome, demandas, instrucoes, prazo, horaDoDia } = params;
  const saudacao = horaDoDia < 12 ? "Bom dia" : horaDoDia < 18 ? "Boa tarde" : "Boa noite";
  const primeiroNome = destinatarioNome.split(" ")[0] || destinatarioNome;

  let msg = `${saudacao}, ${primeiroNome}!\n\nSegue(m) ${demandas.length} demanda(s) para você:\n`;

  demandas.forEach((d, i) => {
    msg += `\n${i + 1}. `;
    if (d.processoNumero) msg += `*${d.processoNumero}*`;
    if (d.assistidoNome) msg += ` — ${d.assistidoNome}`;
    if (d.ato) msg += ` (${d.ato})`;
  });

  if (instrucoes) msg += `\n\n📋 ${instrucoes}`;
  if (prazo) {
    const [y, m, dd] = prazo.split("-");
    msg += `\n⏰ Prazo sugerido: ${dd}/${m}/${y}`;
  }
  return msg;
}
```

- [ ] **Step 3: Rodar — passa**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/components/demandas/__tests__/delegacao-message.test.ts` — 2 PASS.

- [ ] **Step 4: Usar no batch modal**

Em `src/components/demandas/delegacao-batch-modal.tsx`, no `useEffect` que monta o preview (o bloco com `demandas.slice(0, 5)` e `... e mais ${demandas.length - 5}`), substituir a construção manual por:

```tsx
      import { montarMensagemDelegacao } from "./delegacao-message"; // (no topo do arquivo)
      // ...dentro do useEffect:
      const nomeDest = membrosEquipe?.find(m => m.id === parseInt(destinatarioId))?.name || "Colega";
      const msg = montarMensagemDelegacao({
        destinatarioNome: nomeDest,
        demandas: demandas.map(d => ({
          processoNumero: d.processoNumero,
          assistidoNome: d.assistidoNome,
          ato: d.ato,
        })),
        instrucoes,
        prazo: prazoSugerido || undefined,
        horaDoDia: new Date().getHours(),
      });
      setWhatsAppMsg(msg);
```

Remover o trecho antigo (`let msg = ...; demandas.slice(0,5).forEach(...); if (demandas.length > 5) ...`). Manter o resto do `useEffect` (guardas `enviarWhatsApp && !editandoWhatsApp`).

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit 2>&1 | grep -E "delegacao-message|delegacao-batch-modal" || echo "OK"` → `OK`.

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/demandas/delegacao-message.ts src/components/demandas/__tests__/delegacao-message.test.ts src/components/demandas/delegacao-batch-modal.tsx
git commit -m "feat(delegacao): mensagem em bloco completa (sem truncar em 5)"
```

---

## Task 4: Router de delegação — a_delegar + transições

**Files:**
- Modify: `src/lib/trpc/routers/delegacao.ts`

- [ ] **Step 1: criar/criarEmLote setam a_delegar e NÃO notificam**

Em `delegacao.ts`:
- Na mutation `criar`: no `db.update(demandas).set({...})`, trocar `statusDelegacao: "pendente"` por `statusDelegacao: "a_delegar"`. **Remover** o bloco que insere a `notifications` do destinatário (o `await db.insert(notifications)...` no fim do `criar`). Manter a criação do `delegacoesHistorico`.
- Na mutation `criarEmLote`: no `tx.update(demandas).set({...})`, trocar `statusDelegacao: "pendente"` por `statusDelegacao: "a_delegar"`. **Remover** o `tx.insert(notifications)` consolidado. Manter o insert em lote do histórico.

- [ ] **Step 2: Adicionar marcarDelegado / marcarDelegadoEmLote / reabrirDelegacao**

Antes do fechamento do `delegacaoRouter`, adicionar:

```ts
  // Marca a demanda como entregue (a_delegar → delegado) e notifica o destinatário.
  marcarDelegado: protectedProcedure
    .input(z.object({ demandaId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [dem] = await db
        .update(demandas)
        .set({ statusDelegacao: "delegado", updatedAt: new Date() })
        .where(eq(demandas.id, input.demandaId))
        .returning();
      if (!dem) throw new TRPCError({ code: "NOT_FOUND", message: "Demanda não encontrada." });
      if (dem.delegadoParaId) {
        const remetente = await db.query.users.findFirst({
          where: eq(users.id, ctx.user.id),
          columns: { name: true },
        });
        await db.insert(notifications).values({
          userId: dem.delegadoParaId,
          title: "Nova demanda delegada",
          message: `${remetente?.name || "Um defensor"} delegou uma demanda para você.`,
          type: "info",
          actionUrl: "/admin/delegacoes",
          isRead: false,
        });
      }
      return dem;
    }),

  marcarDelegadoEmLote: protectedProcedure
    .input(z.object({ demandaIds: z.array(z.number()).min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      const rows = await db
        .update(demandas)
        .set({ statusDelegacao: "delegado", updatedAt: new Date() })
        .where(inArray(demandas.id, input.demandaIds))
        .returning();
      const remetente = await db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
        columns: { name: true },
      });
      // Uma notificação por destinatário distinto.
      const porDestinatario = new Map<number, number>();
      for (const r of rows) {
        if (r.delegadoParaId)
          porDestinatario.set(r.delegadoParaId, (porDestinatario.get(r.delegadoParaId) ?? 0) + 1);
      }
      for (const [destinatarioId, count] of porDestinatario) {
        await db.insert(notifications).values({
          userId: destinatarioId,
          title: `${count} demanda(s) delegada(s)`,
          message: `${remetente?.name || "Um defensor"} delegou ${count} demanda(s) para você.`,
          type: "info",
          actionUrl: "/admin/delegacoes",
          isRead: false,
        });
      }
      return { count: rows.length };
    }),

  // Reabre (delegado → a_delegar), sem notificar.
  reabrirDelegacao: protectedProcedure
    .input(z.object({ demandaId: z.number() }))
    .mutation(async ({ input }) => {
      const [dem] = await db
        .update(demandas)
        .set({ statusDelegacao: "a_delegar", updatedAt: new Date() })
        .where(eq(demandas.id, input.demandaId))
        .returning();
      if (!dem) throw new TRPCError({ code: "NOT_FOUND", message: "Demanda não encontrada." });
      return dem;
    }),
```

(`eq`, `inArray`, `TRPCError`, `users`, `notifications`, `demandas` já estão importados no arquivo.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "routers/delegacao.ts" || echo "OK"` → `OK`. (Ignore os 3 erros pré-existentes em `routers/vvd.ts`.)

- [ ] **Step 4: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/trpc/routers/delegacao.ts
git commit -m "feat(delegacao): a_delegar no criar + marcarDelegado/reabrir + notificação no delegado"
```

---

## Task 5: Cancelar delegação ao mudar status (router demandas)

**Files:**
- Modify: `src/lib/trpc/routers/demandas.ts`

- [ ] **Step 1: Limpar delegação quando um status de pipeline é aplicado a um card delegado**

Na mutation `update` (em `src/lib/trpc/routers/demandas.ts`), depois de montar `updateData` e ANTES do `db.update(demandas).set(updateData)`, inserir a detecção. Buscar o estado anterior já existe (`const [anterior] = await db.select()...` — note que hoje isso ocorre depois; reordenar para antes do update, ou reusar). Implementação:

```ts
      // Cancelar delegação: se um status/substatus de pipeline é aplicado a uma
      // demanda atualmente delegada, a delegação é desfeita (o defensor retomou).
      // a_delegar/delegado nunca chegam por aqui (vêm do router de delegação),
      // então qualquer status/substatus aqui é da pipeline.
      if (data.status !== undefined || data.substatus !== undefined) {
        const [atual] = await db
          .select({ delegadoParaId: demandas.delegadoParaId, statusDelegacao: demandas.statusDelegacao })
          .from(demandas)
          .where(eq(demandas.id, id));
        if (atual?.delegadoParaId || atual?.statusDelegacao) {
          updateData.delegadoParaId = null;
          updateData.statusDelegacao = null;
          updateData.dataDelegacao = null;
          updateData.motivoDelegacao = null;
          // Marca a delegação ativa no histórico como cancelada.
          await db
            .update(delegacoesHistorico)
            .set({ status: "cancelada" })
            .where(
              and(
                eq(delegacoesHistorico.demandaId, id),
                inArray(delegacoesHistorico.status, ["pendente", "aceita", "em_andamento", "aguardando_revisao"]),
              ),
            );
        }
      }
```

Confirme que `delegacoesHistorico` está importado em `demandas.ts` (se não, adicionar ao import de `@/lib/db/schema`). `and`/`inArray`/`eq` já são usados no arquivo.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "routers/demandas.ts" || echo "OK"` → `OK`.

- [ ] **Step 3: Smoke (se houver DATABASE_URL)**

Best-effort: numa demanda delegada, aplicar `status:"4_MONITORAR"` via update e confirmar que `delegado_para_id`/`status_delegacao` ficaram nulos:
`psql "$DATABASE_URL" -c "SELECT id, status, status_delegacao, delegado_para_id FROM demandas WHERE status_delegacao IS NULL AND delegado_para_id IS NULL LIMIT 1;"` — relate o que viu (ou pule se sem URL).

- [ ] **Step 4: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/trpc/routers/demandas.ts
git commit -m "feat(delegacao): mudar status da pipeline cancela a delegação"
```

---

## Task 6: Card — chips de dois estados + botões marcar/reabrir

**Files:**
- Modify: `src/components/demandas-premium/kanban-premium.tsx`
- Modify: `src/components/demandas-premium/demandas-premium-view.tsx`

- [ ] **Step 1: Chip de dois estados (kanban-premium.tsx)**

Localizar o chip de delegação (~linha 920, condicional `demanda.delegadoPara && demanda.statusDelegacao && demanda.statusDelegacao !== "pendente"`). Substituir a lógica de exibição por:

```tsx
        {demanda.delegadoPara && (demanda.statusDelegacao === "a_delegar" || demanda.statusDelegacao === "delegado") && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]",
              demanda.statusDelegacao === "a_delegar"
                ? "border border-dashed border-violet-400 text-violet-600 dark:text-violet-300"
                : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
            )}
          >
            <UserPlus className="h-3 w-3" />
            {demanda.statusDelegacao === "a_delegar" ? "Delegar a" : "Delegado a"}{" "}
            {demanda.delegadoPara.split(" ")[0]}
          </span>
        )}
```

(Confirme que `UserPlus` de `lucide-react` e `cn` estão importados no arquivo — `cn` está; adicionar `UserPlus` se faltar.)

- [ ] **Step 2: Botões marcar/reabrir no card (kanban-premium.tsx)**

Dentro do `KanbanCard`, declarar as mutations e renderizar o botão conforme o estado. Perto das outras mutations do componente (ou via `trpc` direto no card):

```tsx
  const utilsDeleg = trpc.useUtils();
  const marcarDelegado = trpc.delegacao.marcarDelegado.useMutation({
    onSuccess: () => { utilsDeleg.demandas.invalidate(); toast.success("Marcada como delegada"); },
    onError: (e) => toast.error(e.message),
  });
  const reabrirDelegacao = trpc.delegacao.reabrirDelegacao.useMutation({
    onSuccess: () => { utilsDeleg.demandas.invalidate(); toast.success("Delegação reaberta"); },
    onError: (e) => toast.error(e.message),
  });
```

E no rodapé do card, quando houver delegação:

```tsx
  {demanda.statusDelegacao === "a_delegar" && (
    <button
      className="text-[11px] text-violet-600 hover:underline"
      onClick={(e) => { e.stopPropagation(); marcarDelegado.mutate({ demandaId: Number(demanda.id) }); }}
    >
      Marcar como delegado
    </button>
  )}
  {demanda.statusDelegacao === "delegado" && (
    <button
      className="text-[11px] text-neutral-500 hover:underline"
      onClick={(e) => { e.stopPropagation(); reabrirDelegacao.mutate({ demandaId: Number(demanda.id) }); }}
    >
      Reabrir
    </button>
  )}
```

Confirme o nome correto do invalidador da lista de demandas (grep `useUtils` / `trpc.demandas.` no arquivo). Se a lista é `trpc.demandas.list`/`listPremium`, invalidar esse especificamente em vez de `demandas.invalidate()`. Use o que o arquivo já usa para refetch após mutações.

- [ ] **Step 3: Drop na subseção de delegação (demandas-premium-view.tsx)**

Em `handleStatusChange` (linha ~1212), a guarda `if (key === "delegar" && demanda)` deve também aceitar a nova chave `a_delegar` (drop na subseção "A delegar"):

```tsx
    if ((key === "delegar" || key === "a_delegar") && demanda) {
```

(Drop na subseção "Delegados" não deve abrir o seletor; com a guarda acima, `delegado` cai no fluxo normal de status — o que dispararia o cancelamento. Para evitar, adicionar logo no início de `handleStatusChange`: `if (key === "delegado") return;` — drop em "Delegados" é no-op.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "kanban-premium|demandas-premium-view" || echo "OK"` → `OK`. Resolver erros (ex.: `Number(demanda.id)` quando id é string — ok; tipos das mutations).

- [ ] **Step 5: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/demandas-premium/kanban-premium.tsx src/components/demandas-premium/demandas-premium-view.tsx
git commit -m "feat(delegacao): chip delegar/delegado + botões marcar/reabrir no card"
```

---

## Task 7: Backfill dos delegados atuais

**Files:**
- Create: `drizzle/0049_delegacao_backfill.sql`

- [ ] **Step 1: Escrever a migration**

```sql
-- drizzle/0049_delegacao_backfill.sql
-- Demandas já delegadas (apareciam como "Delegada a X") → estado "delegado".
UPDATE demandas
SET status_delegacao = 'delegado'
WHERE delegado_para_id IS NOT NULL
  AND (status_delegacao IS NULL OR status_delegacao NOT IN ('a_delegar', 'delegado'));
```

- [ ] **Step 2: Aplicar (se houver DATABASE_URL)**

Run: `psql "$DATABASE_URL" -f drizzle/0049_delegacao_backfill.sql 2>&1 | tail -3` — relatar nº de linhas atualizadas. Se sem URL, pular e anotar (a SQL fica versionada).

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add drizzle/0049_delegacao_backfill.sql
git commit -m "chore(delegacao): backfill statusDelegacao=delegado para delegadas legadas"
```

---

## Task 8: Verificação ponta a ponta

**Files:** nenhum.

- [ ] **Step 1: Suíte**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/components/demandas-premium/ src/components/demandas/` → PASS (bucketing + message).

- [ ] **Step 2: Typecheck (sem erros novos)**

Run: `npx tsc --noEmit 2>&1 | grep -E "demanda-status|section-bucketing|routers/delegacao|routers/demandas|delegacao-message|delegacao-batch-modal|kanban-premium|demandas-premium-view" || echo "OK: nenhum erro novo da feature"`
Expected: `OK: nenhum erro novo da feature`. (Os 3 erros pré-existentes em `routers/vvd.ts` permanecem.)

- [ ] **Step 3: Smoke de UI (dev server + browser)**

1. Delegar em bloco (selecionar ≥6 cards → Delegar): a mensagem lista TODAS as demandas (sem "e mais N"); cards vão para subseção **A delegar** com chip "Delegar a X".
2. Num card "A delegar", clicar **Marcar como delegado** → move para **Delegados**, chip "Delegado a X", destinatário recebe notificação.
3. Num card delegado, mudar o status para **Monitorar** → some da Delegação e aparece em Monitorar; `delegado_para_id`/`status_delegacao` nulos no banco.

---

## Notas de execução

- **CI:** GH Actions falha por `pnpm-lock`; check real é o Vercel preview (memória `ci_main_pnpm_bug`).
- **Entrega:** ao final, `superpowers:finishing-a-development-branch` → merge para main (o usuário pediu merge ao concluir).
- **Risco:** `handleStatusChange` é sensível — confirmar que as chaves de drop (`a_delegar`/`delegado`) e o fluxo do PessoaSelector seguem coerentes; o cancelamento server-side cobre o caso de mudar status por qualquer caminho.
