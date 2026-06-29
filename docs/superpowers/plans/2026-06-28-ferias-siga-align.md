# Férias ↔ SIGA Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the shipped Férias módulo with SIGA's formal fields (numeroSolicitacao, nSiga, provimento, dataPublicacao, suspensa, situacaoSiga, sigaSyncedAt) and the **abono pecuniário** outcome (conversaoPecunia + valorAbonoCents), projecting the abono value to the vida_funcional event.

**Architecture:** Additive nullable columns on `ferias_parcelas` (one idempotent migration). The pure projection gains `valorCents` for abono. The `ferias` router accepts/persists the new fields and writes `valorCents`/`titulo` into the projection on both create and update. The Férias UI surfaces the new fields. Saldo logic is untouched.

**Tech Stack:** Next.js 15 (App Router, client), tRPC, Drizzle ORM (Postgres), Tailwind + Padrão Defender v5, vitest.

## Global Constraints

- Additive only: new columns are nullable (or boolean `DEFAULT false NOT NULL`); existing rows/behaviour unaffected. No enum changes, no `ferias_periodos` changes.
- **Saldo unchanged:** `computeSaldo` is abono-agnostic; an abono parcela still consumes dias. Do NOT touch `src/lib/ferias/saldo.ts`.
- **Abono projection:** when `conversaoPecunia` is true, the projected `vida_funcional_eventos` row gets `valorCents = valorAbonoCents ?? null` (NOT `?? 0`) and titulo suffix `" (abono pecuniário)"`; otherwise `valorCents = null`, titulo unchanged. Cluster stays `ausencias`, tipo `FERIAS`.
- **Router correctness (from spec review):** `criarParcela` must add `valorCents: proj.valorCents` to the evento insert; `atualizarParcela` must fetch `periodo` unconditionally and add `titulo`+`valorCents` to the evento SET. Validation: `conversaoPecunia` true requires `valorAbonoCents`.
- Privacy/transactions/soft-delete/titular guard: unchanged.
- Migration hand-scoped (NOT `db:generate`).

---

### Task 1: Schema additive columns + migration

**Files:**
- Modify: `src/lib/db/schema/ferias.ts`
- Create: `drizzle/0060_ferias_siga_align.sql`
- Modify: `src/lib/db/schema/__tests__/ferias-schema.test.ts`

**Interfaces:**
- Produces: 9 new columns on `feriasParcelas` (`numeroSolicitacao`, `nSiga`, `provimento`, `dataPublicacao`, `conversaoPecunia`, `valorAbonoCents`, `suspensa`, `situacaoSiga`, `sigaSyncedAt`).

- [ ] **Step 1: Extend the schema test (add failing assertion)**

Append a test to `src/lib/db/schema/__tests__/ferias-schema.test.ts` (inside the existing `describe`):

```ts
import { feriasParcelas } from "@/lib/db/schema";

it("ferias_parcelas has the SIGA alignment columns", () => {
  for (const col of ["numeroSolicitacao","nSiga","provimento","dataPublicacao","conversaoPecunia","valorAbonoCents","suspensa","situacaoSiga","sigaSyncedAt"]) {
    expect((feriasParcelas as Record<string, unknown>)[col]).toBeDefined();
  }
});
```

(If `feriasParcelas` is already imported in the file, don't duplicate the import.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/db/schema/__tests__/ferias-schema.test.ts`
Expected: FAIL — the new columns are undefined.

- [ ] **Step 3: Add the columns to the schema**

In `src/lib/db/schema/ferias.ts`, change the import line to include `boolean` and `bigint`:

```ts
import { pgTable, pgEnum, serial, integer, text, date, boolean, bigint, timestamp, index } from "drizzle-orm/pg-core";
```

In the `feriasParcelas` definition, add these columns right after `observacoes: text("observacoes"),` (before `createdAt`):

```ts
  numeroSolicitacao: text("numero_solicitacao"),
  nSiga: text("n_siga"),
  provimento: text("provimento"),
  dataPublicacao: date("data_publicacao"),
  conversaoPecunia: boolean("conversao_pecunia").default(false).notNull(),
  valorAbonoCents: bigint("valor_abono_cents", { mode: "number" }),
  suspensa: boolean("suspensa").default(false).notNull(),
  situacaoSiga: text("situacao_siga"),
  sigaSyncedAt: timestamp("siga_synced_at"),
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/db/schema/__tests__/ferias-schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the scoped migration**

Hand-write `drizzle/0060_ferias_siga_align.sql` (do NOT run `db:generate`):

```sql
-- Alinhamento Férias↔SIGA: campos formais + abono em ferias_parcelas (aditivo/idempotente).
ALTER TABLE "ferias_parcelas" ADD COLUMN IF NOT EXISTS "numero_solicitacao" text;--> statement-breakpoint
ALTER TABLE "ferias_parcelas" ADD COLUMN IF NOT EXISTS "n_siga" text;--> statement-breakpoint
ALTER TABLE "ferias_parcelas" ADD COLUMN IF NOT EXISTS "provimento" text;--> statement-breakpoint
ALTER TABLE "ferias_parcelas" ADD COLUMN IF NOT EXISTS "data_publicacao" date;--> statement-breakpoint
ALTER TABLE "ferias_parcelas" ADD COLUMN IF NOT EXISTS "conversao_pecunia" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ferias_parcelas" ADD COLUMN IF NOT EXISTS "valor_abono_cents" bigint;--> statement-breakpoint
ALTER TABLE "ferias_parcelas" ADD COLUMN IF NOT EXISTS "suspensa" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ferias_parcelas" ADD COLUMN IF NOT EXISTS "situacao_siga" text;--> statement-breakpoint
ALTER TABLE "ferias_parcelas" ADD COLUMN IF NOT EXISTS "siga_synced_at" timestamp;
```

(Apply with `npm run db:push` where a DB exists; idempotent.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema/ferias.ts drizzle/0060_ferias_siga_align.sql src/lib/db/schema/__tests__/ferias-schema.test.ts
git commit -m "feat(ferias-siga): colunas formais SIGA + abono em ferias_parcelas + migration 0060"
```

---

### Task 2: Projection — valorCents + abono

**Files:**
- Modify: `src/lib/ferias/projecao.ts`
- Modify: `src/lib/ferias/__tests__/projecao.test.ts`

**Interfaces:**
- Produces: `ProjecaoEvento` gains `valorCents: number | null`; `projecaoEventoDeParcela`'s parcela arg gains `conversaoPecunia?: boolean` and `valorAbonoCents?: number | null`.

- [ ] **Step 1: Update + extend the test**

In `src/lib/ferias/__tests__/projecao.test.ts`, the existing `projecaoEventoDeParcela` test asserts an exact object via `toEqual`. Add `valorCents: null` to that expected object (non-abono case). Then add two new cases:

```ts
it("abono parcela carries valorCents and a titulo suffix", () => {
  const proj = projecaoEventoDeParcela(
    { id: 7, dataInicio: "2026-07-01", dataFim: "2026-07-10", status: "concluida", conversaoPecunia: true, valorAbonoCents: 50000 },
    { aquisitivoInicio: "2025-01-01", aquisitivoFim: "2025-12-31" }, 1,
  );
  expect(proj.valorCents).toBe(50000);
  expect(proj.titulo).toBe("Férias 2025 — 1ª parcela (abono pecuniário)");
  expect(proj.status).toBe("concluido");
});

it("abono with null valorAbonoCents projects valorCents null (not 0)", () => {
  const proj = projecaoEventoDeParcela(
    { id: 1, dataInicio: "2026-07-01", dataFim: "2026-07-02", status: "programada", conversaoPecunia: true, valorAbonoCents: null },
    { aquisitivoInicio: "2025-01-01", aquisitivoFim: "2025-12-31" }, 1,
  );
  expect(proj.valorCents).toBeNull();
});

it("non-abono parcela has valorCents null and no suffix", () => {
  const proj = projecaoEventoDeParcela(
    { id: 2, dataInicio: "2026-07-01", dataFim: "2026-07-02", status: "programada" },
    { aquisitivoInicio: "2025-01-01", aquisitivoFim: "2025-12-31" }, 2,
  );
  expect(proj.valorCents).toBeNull();
  expect(proj.titulo).toBe("Férias 2025 — 2ª parcela");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/ferias/__tests__/projecao.test.ts`
Expected: FAIL — `valorCents` is not on the projection / parcela arg doesn't accept abono fields.

- [ ] **Step 3: Update the implementation**

Replace the `ProjecaoEvento` type and `projecaoEventoDeParcela` in `src/lib/ferias/projecao.ts` with:

```ts
export type ProjecaoEvento = {
  tipo: "FERIAS";
  cluster: "ausencias";
  titulo: string;
  dataEvento: string;
  dataFim: string;
  status: "previsto" | "em_curso" | "concluido";
  valorCents: number | null;
  dados: { feriasParcelaId: number | null };
};

export function projecaoEventoDeParcela(
  parcela: { id: number | null; dataInicio: string; dataFim: string; status: string; conversaoPecunia?: boolean; valorAbonoCents?: number | null },
  periodo: { aquisitivoInicio: string; aquisitivoFim: string },
  ordem: number,
): ProjecaoEvento {
  const baseTitulo = tituloParcela({ aquisitivoInicio: periodo.aquisitivoInicio, aquisitivoFim: periodo.aquisitivoFim, ordem });
  const abono = parcela.conversaoPecunia === true;
  return {
    tipo: "FERIAS",
    cluster: "ausencias",
    titulo: abono ? `${baseTitulo} (abono pecuniário)` : baseTitulo,
    dataEvento: parcela.dataInicio,
    dataFim: parcela.dataFim,
    status: statusEventoDeParcela(parcela.status),
    valorCents: abono ? (parcela.valorAbonoCents ?? null) : null,
    dados: { feriasParcelaId: parcela.id },
  };
}
```

(`statusEventoDeParcela`, `tituloParcela`, `anoLabel` unchanged.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/ferias/__tests__/projecao.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ferias/projecao.ts src/lib/ferias/__tests__/projecao.test.ts
git commit -m "feat(ferias-siga): projeção carrega valorCents + sufixo de abono"
```

---

### Task 3: Router — inputs, persistence, projection writes

**Files:**
- Modify: `src/lib/trpc/routers/ferias.ts`
- Modify: `src/lib/trpc/routers/__tests__/ferias-router.test.ts`

**Interfaces:**
- Consumes: Task 1 columns; Task 2 projection (now returns `valorCents`).
- Produces: `criarParcela`/`atualizarParcela` accept the SIGA fields; `listar` returns them; both write `valorCents`/`titulo` to the projection.

- [ ] **Step 1: Extend the structural test (add failing assertions)**

Add to `src/lib/trpc/routers/__tests__/ferias-router.test.ts` (inside the existing `describe` that reads `ferias.ts` source):

```ts
it("criarParcela writes valorCents into the evento insert", () => {
  // the evento insert must include valorCents from the projection
  expect(src).toMatch(/valorCents:\s*proj\.valorCents/);
});
it("atualizarParcela fetches periodo unconditionally (not only on date change)", () => {
  // the periodo fetch must NOT be nested only under an if(input.dataInicio...) block
  const idx = src.indexOf("atualizarParcela");
  const seg = src.slice(idx);
  expect(seg).toContain("Período não encontrado");
  // titulo + valorCents propagated to the evento update
  expect(seg).toMatch(/titulo:\s*proj\.titulo/);
  expect(seg).toMatch(/valorCents:\s*proj\.valorCents/);
});
it("rejects conversaoPecunia without valorAbonoCents", () => {
  expect(src).toMatch(/Convers[aã]o em pec[úu]nia exige valor/);
});
it("persists the SIGA fields (numeroSolicitacao, provimento, conversaoPecunia)", () => {
  expect(src).toContain("numeroSolicitacao");
  expect(src).toContain("provimento");
  expect(src).toContain("conversaoPecunia");
});
```

(If the file's source variable isn't named `src`, match the existing test's variable.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/trpc/routers/__tests__/ferias-router.test.ts`
Expected: FAIL — the new patterns aren't in the router yet.

- [ ] **Step 3: Replace `criarParcela` with the SIGA-aware version**

In `src/lib/trpc/routers/ferias.ts`, replace the entire `criarParcela` procedure with:

```ts
  criarParcela: protectedProcedure
    .input(z.object({
      periodoId: z.number().int(),
      dataInicio: ISO,
      dataFim: ISO,
      substitutoId: z.number().int().nullable().optional(),
      seiProtocolo: z.string().nullable().optional(),
      observacoes: z.string().nullable().optional(),
      numeroSolicitacao: z.string().nullable().optional(),
      nSiga: z.string().nullable().optional(),
      provimento: z.string().nullable().optional(),
      dataPublicacao: ISO.nullable().optional(),
      conversaoPecunia: z.boolean().optional(),
      valorAbonoCents: z.number().int().min(0).nullable().optional(),
      suspensa: z.boolean().optional(),
      situacaoSiga: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [periodo] = await db.select().from(feriasPeriodos)
        .where(and(eq(feriasPeriodos.id, input.periodoId), isNull(feriasPeriodos.deletedAt))).limit(1);
      if (!periodo) throw new TRPCError({ code: "NOT_FOUND", message: "Período não encontrado" });
      if (periodo.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera suas férias" });
      if (input.dataFim < input.dataInicio) throw new TRPCError({ code: "BAD_REQUEST", message: "dataFim anterior a dataInicio" });
      if (input.substitutoId != null && input.substitutoId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode ser seu próprio substituto" });
      }
      if (input.conversaoPecunia && (input.valorAbonoCents === null || input.valorAbonoCents === undefined)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Conversão em pecúnia exige valor do abono" });
      }

      const novos = diasInclusive(input.dataInicio, input.dataFim);

      return await db.transaction(async (tx) => {
        // saldo guard inside the transaction (atomicidade; ver nota original).
        const existentes = await tx.select().from(feriasParcelas)
          .where(and(eq(feriasParcelas.periodoId, periodo.id), isNull(feriasParcelas.deletedAt)));
        const lite: ParcelaLite[] = existentes.map((p) => ({ id: p.id, dataInicio: p.dataInicio, dataFim: p.dataFim, status: p.status }));
        const saldo = computeSaldo(periodo.diasDireito, lite);
        if (saldo.disponiveis < novos) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Saldo insuficiente (${saldo.disponiveis} disponíveis, ${novos} solicitados)` });
        }

        const ordem = existentes.filter((p) => p.dataInicio < input.dataInicio).length + 1;

        let afastamentoId: number | null = null;
        if (input.substitutoId != null) {
          const [af] = await tx.insert(afastamentos).values({
            defensorId: ctx.user.id,
            substitutoId: input.substitutoId,
            dataInicio: input.dataInicio,
            dataFim: input.dataFim,
            tipo: "FERIAS",
            motivo: "Férias",
            ativo: true,
            acessoDemandas: true,
            acessoEquipe: false,
          }).returning({ id: afastamentos.id });
          afastamentoId = af.id;
        }

        const proj = projecaoEventoDeParcela(
          { id: null, dataInicio: input.dataInicio, dataFim: input.dataFim, status: "programada",
            conversaoPecunia: input.conversaoPecunia ?? false, valorAbonoCents: input.valorAbonoCents ?? null },
          periodo, ordem,
        );
        const [evento] = await tx.insert(vidaFuncionalEventos).values({
          defensorId: ctx.user.id,
          tipo: proj.tipo, cluster: proj.cluster, titulo: proj.titulo,
          dataEvento: proj.dataEvento, dataFim: proj.dataFim, status: proj.status,
          valorCents: proj.valorCents,
          origem: "manual", dados: { feriasParcelaId: null },
        }).returning({ id: vidaFuncionalEventos.id });

        const [parcela] = await tx.insert(feriasParcelas).values({
          periodoId: periodo.id,
          defensorId: ctx.user.id,
          dataInicio: input.dataInicio,
          dataFim: input.dataFim,
          status: "programada",
          substitutoId: input.substitutoId ?? null,
          afastamentoId,
          vidaFuncionalEventoId: evento.id,
          seiProtocolo: input.seiProtocolo ?? null,
          observacoes: input.observacoes ?? null,
          numeroSolicitacao: input.numeroSolicitacao ?? null,
          nSiga: input.nSiga ?? null,
          provimento: input.provimento ?? null,
          dataPublicacao: input.dataPublicacao ?? null,
          conversaoPecunia: input.conversaoPecunia ?? false,
          valorAbonoCents: input.valorAbonoCents ?? null,
          suspensa: input.suspensa ?? false,
          situacaoSiga: input.situacaoSiga ?? null,
        }).returning();

        await tx.update(vidaFuncionalEventos)
          .set({ dados: { feriasParcelaId: parcela.id } })
          .where(eq(vidaFuncionalEventos.id, evento.id));

        return parcela;
      });
    }),
```

- [ ] **Step 4: Replace `atualizarParcela` with the SIGA-aware version**

Replace the entire `atualizarParcela` procedure with:

```ts
  atualizarParcela: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      status: z.enum(["programada", "homologada", "em_fruicao", "concluida", "cancelada"]).optional(),
      dataInicio: ISO.optional(),
      dataFim: ISO.optional(),
      seiProtocolo: z.string().nullable().optional(),
      observacoes: z.string().nullable().optional(),
      numeroSolicitacao: z.string().nullable().optional(),
      nSiga: z.string().nullable().optional(),
      provimento: z.string().nullable().optional(),
      dataPublicacao: ISO.nullable().optional(),
      conversaoPecunia: z.boolean().optional(),
      valorAbonoCents: z.number().int().min(0).nullable().optional(),
      suspensa: z.boolean().optional(),
      situacaoSiga: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [parcela] = await db.select().from(feriasParcelas)
        .where(and(eq(feriasParcelas.id, input.id), isNull(feriasParcelas.deletedAt))).limit(1);
      if (!parcela) throw new TRPCError({ code: "NOT_FOUND", message: "Parcela não encontrada" });
      if (parcela.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera suas férias" });

      if (input.status && input.status !== parcela.status && !podeTransicionar(parcela.status, input.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Transição inválida: ${parcela.status} → ${input.status}` });
      }

      const novaInicio = input.dataInicio ?? parcela.dataInicio;
      const novaFim = input.dataFim ?? parcela.dataFim;
      if (novaFim < novaInicio) throw new TRPCError({ code: "BAD_REQUEST", message: "dataFim anterior a dataInicio" });

      const novaConversao = input.conversaoPecunia ?? parcela.conversaoPecunia;
      const novoValorAbono = input.valorAbonoCents === undefined ? parcela.valorAbonoCents : input.valorAbonoCents;
      if (novaConversao && (novoValorAbono === null || novoValorAbono === undefined)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Conversão em pecúnia exige valor do abono" });
      }

      // período sempre buscado: necessário p/ saldo E p/ reconstruir a projeção (título/ordem)
      const [periodo] = await db.select().from(feriasPeriodos)
        .where(and(eq(feriasPeriodos.id, parcela.periodoId), isNull(feriasPeriodos.deletedAt))).limit(1);
      if (!periodo) throw new TRPCError({ code: "NOT_FOUND", message: "Período não encontrado" });

      const irmas = await db.select().from(feriasParcelas)
        .where(and(eq(feriasParcelas.periodoId, parcela.periodoId), isNull(feriasParcelas.deletedAt)));

      if (input.dataInicio || input.dataFim) {
        const lite: ParcelaLite[] = irmas
          .filter((p) => p.id !== parcela.id)
          .map((p) => ({ id: p.id, dataInicio: p.dataInicio, dataFim: p.dataFim, status: p.status }));
        const saldo = computeSaldo(periodo.diasDireito, lite);
        const novos = diasInclusive(novaInicio, novaFim);
        if ((input.status ?? parcela.status) !== "cancelada" && saldo.disponiveis < novos) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Saldo insuficiente para a nova janela" });
        }
      }

      const novoStatus = input.status ?? parcela.status;
      const ordemBase = irmas.map((p) => ({ id: p.id, dataInicio: p.id === parcela.id ? novaInicio : p.dataInicio }));
      const ordem = ordemDe(ordemBase, novaInicio, parcela.id);
      const proj = projecaoEventoDeParcela(
        { id: parcela.id, dataInicio: novaInicio, dataFim: novaFim, status: novoStatus,
          conversaoPecunia: novaConversao, valorAbonoCents: novoValorAbono },
        periodo, ordem,
      );

      return await db.transaction(async (tx) => {
        await tx.update(feriasParcelas).set({
          status: novoStatus,
          dataInicio: novaInicio,
          dataFim: novaFim,
          seiProtocolo: input.seiProtocolo === undefined ? parcela.seiProtocolo : input.seiProtocolo,
          observacoes: input.observacoes === undefined ? parcela.observacoes : input.observacoes,
          numeroSolicitacao: input.numeroSolicitacao === undefined ? parcela.numeroSolicitacao : input.numeroSolicitacao,
          nSiga: input.nSiga === undefined ? parcela.nSiga : input.nSiga,
          provimento: input.provimento === undefined ? parcela.provimento : input.provimento,
          dataPublicacao: input.dataPublicacao === undefined ? parcela.dataPublicacao : input.dataPublicacao,
          conversaoPecunia: novaConversao,
          valorAbonoCents: novoValorAbono,
          suspensa: input.suspensa ?? parcela.suspensa,
          situacaoSiga: input.situacaoSiga === undefined ? parcela.situacaoSiga : input.situacaoSiga,
          updatedAt: new Date(),
        }).where(eq(feriasParcelas.id, parcela.id));

        if (parcela.afastamentoId != null) {
          const ativo = novoStatus !== "cancelada" && novoStatus !== "concluida";
          await tx.update(afastamentos)
            .set({ ativo, dataInicio: novaInicio, dataFim: novaFim, updatedAt: new Date() })
            .where(eq(afastamentos.id, parcela.afastamentoId));
        }

        if (parcela.vidaFuncionalEventoId != null) {
          if (novoStatus === "cancelada") {
            await tx.update(vidaFuncionalEventos).set({ deletedAt: new Date() })
              .where(eq(vidaFuncionalEventos.id, parcela.vidaFuncionalEventoId));
          } else {
            await tx.update(vidaFuncionalEventos).set({
              status: proj.status,
              dataEvento: proj.dataEvento, dataFim: proj.dataFim,
              titulo: proj.titulo, valorCents: proj.valorCents,
              updatedAt: new Date(),
            }).where(eq(vidaFuncionalEventos.id, parcela.vidaFuncionalEventoId));
          }
        }
        return { ok: true };
      });
    }),
```

- [ ] **Step 5: Surface the new fields in `listar`**

In the `listar` parcela mapping (the object returned per parcela, currently ending at `observacoes: p.observacoes,`), add after `observacoes: p.observacoes,`:

```ts
            numeroSolicitacao: p.numeroSolicitacao,
            nSiga: p.nSiga,
            provimento: p.provimento,
            dataPublicacao: p.dataPublicacao,
            conversaoPecunia: p.conversaoPecunia,
            valorAbonoCents: p.valorAbonoCents,
            suspensa: p.suspensa,
            situacaoSiga: p.situacaoSiga,
```

- [ ] **Step 6: Run the structural test + typecheck**

Run: `npx vitest run src/lib/trpc/routers/__tests__/ferias-router.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: no new errors from `ferias.ts`. (Confirm `parcela.conversaoPecunia` etc. are typed after Task 1, and `vidaFuncionalEventos.valorCents` accepts `number | null`.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/trpc/routers/ferias.ts src/lib/trpc/routers/__tests__/ferias-router.test.ts
git commit -m "feat(ferias-siga): router aceita/persiste campos SIGA + abono; projeção grava valorCents/titulo"
```

---

### Task 4: UI — SIGA fields in the Férias view

**Files:**
- Modify: `src/app/(dashboard)/admin/ferias/_components/ferias-view.tsx`

**Interfaces:**
- Consumes: `trpc.ferias.listar` now returns the SIGA fields; `criarParcela`/`atualizarParcela` accept them.

- [ ] **Step 1: Read the file and locate the per-período "nova parcela" form and the parcela row rendering.**

Read `src/app/(dashboard)/admin/ferias/_components/ferias-view.tsx`. The per-período form already collects `{ inicio, fim, substitutoId, sei }` into `parcelaForm[periodo.id]`. The parcela rows render window + status chip + actions.

- [ ] **Step 2: Add the new fields to the nova-parcela form state + inputs**

Extend the per-período form state shape to also hold `provimento`, `numeroSolicitacao`, `conversaoPecunia` (boolean, default false), `valorAbono` (string, R$), `suspensa` (boolean). Add inputs to the form using the existing `inputCls` (dark-mode aware), e.g.:

```tsx
<label className="text-xs">Provimento<input className={inputCls} value={f.provimento ?? ""} onChange={(e) => set({ provimento: e.target.value })} /></label>
<label className="text-xs">Nº Solicitação<input className={inputCls} value={f.numeroSolicitacao ?? ""} onChange={(e) => set({ numeroSolicitacao: e.target.value })} /></label>
<label className="text-xs flex items-center gap-1 mt-4">
  <input type="checkbox" checked={!!f.conversaoPecunia} onChange={(e) => set({ conversaoPecunia: e.target.checked })} /> Converter em pecúnia (abono)
</label>
{f.conversaoPecunia && (
  <label className="text-xs">Valor abono (R$)<input type="number" step="0.01" min="0" className={cn(inputCls, "w-28")} value={f.valorAbono ?? ""} onChange={(e) => set({ valorAbono: e.target.value })} /></label>
)}
<label className="text-xs flex items-center gap-1 mt-4">
  <input type="checkbox" checked={!!f.suspensa} onChange={(e) => set({ suspensa: e.target.checked })} /> Suspensa
</label>
```

In the `criarParcela.mutate({...})` call for that form, add:

```tsx
  provimento: f.provimento || null,
  numeroSolicitacao: f.numeroSolicitacao || null,
  conversaoPecunia: !!f.conversaoPecunia,
  valorAbonoCents: f.conversaoPecunia && f.valorAbono ? Math.round(Number(f.valorAbono) * 100) : null,
  suspensa: !!f.suspensa,
```

- [ ] **Step 3: Show the new fields on parcela rows**

In the parcela `<li>` metadata line, after the substituto info, add (using a `brl` helper — if none exists in the file, add `const brl = (c: number) => (c/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});`):

```tsx
{p.conversaoPecunia && <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400">abono{p.valorAbonoCents != null ? ` ${brl(p.valorAbonoCents)}` : ""}</span>}
{p.suspensa && <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">suspensa</span>}
{p.provimento && <span className="ml-2 text-[10px] text-muted-foreground">prov. {p.provimento}</span>}
{p.situacaoSiga && <span className="ml-2 text-[10px] text-muted-foreground">SIGA: {p.situacaoSiga}</span>}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors from `ferias-view.tsx`. (The `listar` output type now includes the new fields, so `p.conversaoPecunia` etc. are typed.)

- [ ] **Step 5: Run the full férias suite**

Run: `npx vitest run src/lib/ferias src/lib/db/schema/__tests__/ferias-schema.test.ts src/lib/trpc/routers/__tests__/ferias-router.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/admin/ferias/_components/ferias-view.tsx"
git commit -m "feat(ferias-siga): UI com campos formais SIGA + abono pecuniário"
```

---

## Self-Review

**Spec coverage:**
- §4 additive columns + migration → Task 1. ✓
- §5 projection valorCents/abono → Task 2 (incl. updating the existing toEqual test + `?? null`). ✓
- §6 router (inputs, criar valorCents insert + persist, atualizar unconditional periodo fetch + titulo/valorCents SET + persist, validation, listar) → Task 3. ✓
- §7 UI (form fields + row chips, R$, dark-mode) → Task 4. ✓
- §8 testing (projecao abono + null, router structural for valorCents/periodo/titulo/validation, schema columns, migration) → Tasks 1–3. ✓
- §9 out-of-scope respected: no scraper, no suspensão history, no situação auto-mapping, saldo untouched. ✓

**Placeholder scan:** no TBDs; full code for every change. Task 4's "read the file and locate" is a real instruction (the file's form-state shape is the implementer's to extend in place); concrete JSX + mutate-field code is provided.

**Type consistency:** `ProjecaoEvento.valorCents` (Task 2) consumed by the router's evento insert/SET (Task 3). New columns (Task 1) read by router persistence (Task 3) and `listar`, then by the UI (Task 4). `valorAbonoCents` is `number | null` end-to-end; `conversaoPecunia`/`suspensa` boolean. Abono `?? null` (never `?? 0`) in projection.
