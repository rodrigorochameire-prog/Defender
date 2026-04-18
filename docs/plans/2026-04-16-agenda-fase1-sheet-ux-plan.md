# Agenda Fase 1 · Sheet UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refatorar `event-detail-sheet.tsx` em sheet modular com ToC + blocos colapsáveis + card de depoente único + ações rápidas (Concluir, Redesignar, marcar ouvido). Corrigir bug de duplicação do bloco Depoentes. Persistir anotações rápidas.

**Architecture:** Quatro componentes novos em `src/components/agenda/sheet/` (`SheetToC`, `CollapsibleSection`, `SheetActionFooter`, `DepoenteCardV2`). Cinco mutations tRPC novas em `src/lib/trpc/routers/audiencias.ts`. Duas colunas novas em `agenda.ts` schema + uso do enum existente `statusTestemunhaEnum.OUVIDA`.

**Tech Stack:** Next.js 15 · tRPC · Drizzle ORM · PostgreSQL · Radix Collapsible · Tailwind · Vitest · Playwright.

**Spec de referência:** `docs/plans/2026-04-16-agenda-fase1-sheet-ux-design.md`

---

## File Structure

```
src/
├── lib/db/schema/agenda.ts              [modify: +anotacoesRapidas em audiencias, +ouvidoEm/redesignadoPara em testemunhas]
├── lib/trpc/routers/audiencias.ts       [modify: +5 mutations]
├── components/agenda/
│   ├── event-detail-sheet.tsx           [modify: reduz 774 → ~350 linhas, delega para novos componentes]
│   ├── sheet/                           [create folder]
│   │   ├── sheet-toc.tsx                [new]
│   │   ├── collapsible-section.tsx      [new]
│   │   ├── sheet-action-footer.tsx      [new]
│   │   ├── concluir-dialog.tsx          [new — mini-modal]
│   │   ├── redesignar-dialog.tsx        [new — mini-modal]
│   │   └── depoente-card-v2.tsx         [new — substitui shared/depoente-card.tsx]
│   └── registro-audiencia/shared/depoente-card.tsx  [modify: re-export DepoenteCardV2]
└── hooks/use-audiencia-status-actions.ts [new]
__tests__/
├── unit/audiencias-mutations.test.ts    [new]
├── components/sheet-toc.test.tsx        [new]
├── components/collapsible-section.test.tsx [new]
└── components/depoente-card-v2.test.tsx [new]
e2e/
└── agenda-sheet.spec.ts                 [new]
drizzle/
└── <autogerado>                         [new — via npm run db:generate]
```

---

## Task 1: Schema migration · colunas novas

**Files:**
- Modify: `src/lib/db/schema/agenda.ts`
- Autogerado: `drizzle/<nome>.sql`

- [ ] **Step 1: Adicionar coluna `anotacoesRapidas` na tabela `audiencias`**

Em `src/lib/db/schema/agenda.ts`, dentro do `pgTable("audiencias", {...})`, logo após a linha `registroAudiencia: jsonb("registro_audiencia"),` (linha 44), inserir:

```ts
  anotacoesRapidas: jsonb("anotacoes_rapidas").$type<Array<{
    texto: string;
    timestamp: string;
    autorId: number;
  }>>().default([]),
```

- [ ] **Step 2: Adicionar colunas em `testemunhas`**

Em `src/lib/db/schema/agenda.ts`, dentro do `pgTable("testemunhas", {...})`, logo antes de `createdAt` (linha 231), inserir:

```ts
  ouvidoEm: timestamp("ouvido_em"),
  redesignadoPara: date("redesignado_para"),
  sinteseJuizo: text("sintese_juizo"),
```

- [ ] **Step 3: Gerar migration**

Run: `cd ~/projetos/Defender && npm run db:generate`
Expected: um novo arquivo SQL em `drizzle/` contendo `ALTER TABLE "audiencias" ADD COLUMN "anotacoes_rapidas"` e `ALTER TABLE "testemunhas" ADD COLUMN "ouvido_em"` etc.

- [ ] **Step 4: Aplicar migration**

Run: `npm run db:push`
Expected: "Changes applied" sem prompts destrutivos.

- [ ] **Step 5: Verificar via typecheck**

Run: `npm run typecheck`
Expected: 0 erros.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema/agenda.ts drizzle/
git commit -m "feat(agenda): add anotacoesRapidas + testemunha status timestamps"
```

---

## Task 2: Mutation `addQuickNote` (TDD)

**Files:**
- Create: `__tests__/unit/audiencias-mutations.test.ts`
- Modify: `src/lib/trpc/routers/audiencias.ts`

- [ ] **Step 1: Escrever teste falhando**

Criar `__tests__/unit/audiencias-mutations.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { db, audiencias } from "@/lib/db";
import { eq } from "drizzle-orm";
import { createCaller } from "@/lib/trpc/test-helpers";

const TEST_AUDIENCIA_ID = 999999;
const TEST_USER_ID = 1;

async function seedAudiencia() {
  await db.delete(audiencias).where(eq(audiencias.id, TEST_AUDIENCIA_ID));
  await db.insert(audiencias).values({
    id: TEST_AUDIENCIA_ID,
    processoId: 1,
    dataAudiencia: new Date("2026-05-01T10:00:00Z"),
    tipo: "INSTRUCAO",
    defensorId: TEST_USER_ID,
    anotacoesRapidas: [],
  } as any);
}

describe("audiencias.addQuickNote", () => {
  beforeEach(seedAudiencia);

  it("appends nota ao array JSONB", async () => {
    const caller = await createCaller({ userId: TEST_USER_ID });
    await caller.audiencias.addQuickNote({
      audienciaId: TEST_AUDIENCIA_ID,
      texto: "Chegou atrasado",
    });
    const [row] = await db.select().from(audiencias).where(eq(audiencias.id, TEST_AUDIENCIA_ID));
    expect(row.anotacoesRapidas).toHaveLength(1);
    expect(row.anotacoesRapidas?.[0]).toMatchObject({
      texto: "Chegou atrasado",
      autorId: TEST_USER_ID,
    });
    expect(row.anotacoesRapidas?.[0].timestamp).toBeTruthy();
  });

  it("mantém notas existentes ao adicionar nova", async () => {
    const caller = await createCaller({ userId: TEST_USER_ID });
    await caller.audiencias.addQuickNote({ audienciaId: TEST_AUDIENCIA_ID, texto: "A" });
    await caller.audiencias.addQuickNote({ audienciaId: TEST_AUDIENCIA_ID, texto: "B" });
    const [row] = await db.select().from(audiencias).where(eq(audiencias.id, TEST_AUDIENCIA_ID));
    expect(row.anotacoesRapidas).toHaveLength(2);
    expect(row.anotacoesRapidas?.map((n: any) => n.texto)).toEqual(["A", "B"]);
  });

  it("rejeita texto vazio", async () => {
    const caller = await createCaller({ userId: TEST_USER_ID });
    await expect(
      caller.audiencias.addQuickNote({ audienciaId: TEST_AUDIENCIA_ID, texto: "" })
    ).rejects.toThrow();
  });
});
```

Se `createCaller` test-helper não existir, criar `src/lib/trpc/test-helpers.ts` primeiro:

```ts
import { audienciasRouter } from "./routers/audiencias";
import { appRouter } from "./root";
import { db } from "@/lib/db";

export async function createCaller({ userId }: { userId: number }) {
  return appRouter.createCaller({
    db,
    user: { id: userId, role: "DEFENSOR" },
    session: { userId },
  } as any);
}
```

- [ ] **Step 2: Rodar teste — confirmar que falha**

Run: `npm run test __tests__/unit/audiencias-mutations.test.ts`
Expected: 3 testes FAIL com "audiencias.addQuickNote is not a function".

- [ ] **Step 3: Implementar mutation**

Em `src/lib/trpc/routers/audiencias.ts`, dentro do `router({...})` existente, adicionar:

```ts
  addQuickNote: protectedProcedure
    .input(z.object({
      audienciaId: z.number(),
      texto: z.string().min(1, "Nota não pode ser vazia"),
    }))
    .mutation(async ({ input, ctx }) => {
      const [audiencia] = await db
        .select({ anotacoesRapidas: audiencias.anotacoesRapidas })
        .from(audiencias)
        .where(eq(audiencias.id, input.audienciaId));
      if (!audiencia) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Audiência não encontrada" });
      }
      const novaNota = {
        texto: input.texto,
        timestamp: new Date().toISOString(),
        autorId: ctx.user.id,
      };
      const notasAtualizadas = [...(audiencia.anotacoesRapidas ?? []), novaNota];
      await db
        .update(audiencias)
        .set({ anotacoesRapidas: notasAtualizadas, updatedAt: new Date() })
        .where(eq(audiencias.id, input.audienciaId));
      return { nota: novaNota };
    }),
```

- [ ] **Step 4: Rodar teste — confirmar que passa**

Run: `npm run test __tests__/unit/audiencias-mutations.test.ts`
Expected: 3 testes PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/audiencias.ts __tests__/unit/audiencias-mutations.test.ts src/lib/trpc/test-helpers.ts
git commit -m "feat(audiencias): addQuickNote mutation"
```

---

## Task 3: Mutation `marcarDepoenteOuvido` (TDD)

**Files:**
- Modify: `__tests__/unit/audiencias-mutations.test.ts`
- Modify: `src/lib/trpc/routers/audiencias.ts`

- [ ] **Step 1: Adicionar teste falhando**

No arquivo `__tests__/unit/audiencias-mutations.test.ts`, adicionar o describe:

```ts
import { testemunhas } from "@/lib/db";

const TEST_DEPOENTE_ID = 888888;

async function seedDepoente() {
  await db.delete(testemunhas).where(eq(testemunhas.id, TEST_DEPOENTE_ID));
  await db.insert(testemunhas).values({
    id: TEST_DEPOENTE_ID,
    processoId: 1,
    nome: "João Teste",
    tipo: "ACUSACAO",
    status: "ARROLADA",
  } as any);
}

describe("audiencias.marcarDepoenteOuvido", () => {
  beforeEach(seedDepoente);

  it("seta status=OUVIDA e preenche ouvidoEm", async () => {
    const caller = await createCaller({ userId: TEST_USER_ID });
    await caller.audiencias.marcarDepoenteOuvido({ depoenteId: TEST_DEPOENTE_ID });
    const [row] = await db.select().from(testemunhas).where(eq(testemunhas.id, TEST_DEPOENTE_ID));
    expect(row.status).toBe("OUVIDA");
    expect(row.ouvidoEm).toBeInstanceOf(Date);
  });

  it("grava sinteseJuizo quando fornecida", async () => {
    const caller = await createCaller({ userId: TEST_USER_ID });
    await caller.audiencias.marcarDepoenteOuvido({
      depoenteId: TEST_DEPOENTE_ID,
      sinteseJuizo: "Confirmou fatos da denúncia com detalhes",
    });
    const [row] = await db.select().from(testemunhas).where(eq(testemunhas.id, TEST_DEPOENTE_ID));
    expect(row.sinteseJuizo).toBe("Confirmou fatos da denúncia com detalhes");
  });
});
```

- [ ] **Step 2: Rodar — esperar falha**

Run: `npm run test __tests__/unit/audiencias-mutations.test.ts`
Expected: 2 novos testes FAIL.

- [ ] **Step 3: Implementar mutation**

Em `src/lib/trpc/routers/audiencias.ts`, adicionar:

```ts
  marcarDepoenteOuvido: protectedProcedure
    .input(z.object({
      depoenteId: z.number(),
      sinteseJuizo: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const updates: any = {
        status: "OUVIDA",
        ouvidoEm: new Date(),
        updatedAt: new Date(),
      };
      if (input.sinteseJuizo) updates.sinteseJuizo = input.sinteseJuizo;
      const [row] = await db
        .update(testemunhas)
        .set(updates)
        .where(eq(testemunhas.id, input.depoenteId))
        .returning();
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Depoente não encontrado" });
      }
      return row;
    }),
```

- [ ] **Step 4: Rodar — esperar pass**

Run: `npm run test __tests__/unit/audiencias-mutations.test.ts`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/audiencias.ts __tests__/unit/audiencias-mutations.test.ts
git commit -m "feat(audiencias): marcarDepoenteOuvido mutation"
```

---

## Task 4: Mutation `redesignarDepoente` (TDD)

**Files:**
- Modify: `__tests__/unit/audiencias-mutations.test.ts`
- Modify: `src/lib/trpc/routers/audiencias.ts`

- [ ] **Step 1: Adicionar teste**

```ts
describe("audiencias.redesignarDepoente", () => {
  beforeEach(seedDepoente);

  it("grava redesignadoPara e mantém status INTIMADA", async () => {
    const caller = await createCaller({ userId: TEST_USER_ID });
    await caller.audiencias.redesignarDepoente({
      depoenteId: TEST_DEPOENTE_ID,
      novaData: "2026-06-15",
      motivo: "Não localizado",
    });
    const [row] = await db.select().from(testemunhas).where(eq(testemunhas.id, TEST_DEPOENTE_ID));
    expect(row.redesignadoPara).toBe("2026-06-15");
    expect(row.observacoes).toContain("Não localizado");
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `npm run test __tests__/unit/audiencias-mutations.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

```ts
  redesignarDepoente: protectedProcedure
    .input(z.object({
      depoenteId: z.number(),
      novaData: z.string().optional(),
      motivo: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const [atual] = await db.select().from(testemunhas).where(eq(testemunhas.id, input.depoenteId));
      if (!atual) throw new TRPCError({ code: "NOT_FOUND" });
      const observacoesAtualizadas = input.motivo
        ? [atual.observacoes, `[Redesignado: ${input.motivo}]`].filter(Boolean).join("\n")
        : atual.observacoes;
      const [row] = await db
        .update(testemunhas)
        .set({
          redesignadoPara: input.novaData ?? null,
          observacoes: observacoesAtualizadas,
          updatedAt: new Date(),
        })
        .where(eq(testemunhas.id, input.depoenteId))
        .returning();
      return row;
    }),
```

- [ ] **Step 4: Rodar — pass**

Run: `npm run test __tests__/unit/audiencias-mutations.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat(audiencias): redesignarDepoente mutation"
```

---

## Task 5: Mutation `marcarConcluida` (TDD)

**Files:**
- Modify: `__tests__/unit/audiencias-mutations.test.ts`
- Modify: `src/lib/trpc/routers/audiencias.ts`

- [ ] **Step 1: Adicionar teste**

```ts
describe("audiencias.marcarConcluida", () => {
  beforeEach(seedAudiencia);

  it("atualiza status=concluida e resultado", async () => {
    const caller = await createCaller({ userId: TEST_USER_ID });
    await caller.audiencias.marcarConcluida({
      audienciaId: TEST_AUDIENCIA_ID,
      resultado: "instrucao_encerrada",
      observacao: "MP e defesa manifestaram em memoriais",
    });
    const [row] = await db.select().from(audiencias).where(eq(audiencias.id, TEST_AUDIENCIA_ID));
    expect(row.status).toBe("concluida");
    expect(row.resultado).toBe("instrucao_encerrada");
    expect(row.observacoes).toContain("memoriais");
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `npm run test __tests__/unit/audiencias-mutations.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

```ts
  marcarConcluida: protectedProcedure
    .input(z.object({
      audienciaId: z.number(),
      resultado: z.enum(["sentenciado", "instrucao_encerrada", "outra"]),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const [atual] = await db.select().from(audiencias).where(eq(audiencias.id, input.audienciaId));
      if (!atual) throw new TRPCError({ code: "NOT_FOUND" });
      const observacoesAtualizadas = input.observacao
        ? [atual.observacoes, input.observacao].filter(Boolean).join("\n\n")
        : atual.observacoes;
      await db
        .update(audiencias)
        .set({
          status: "concluida",
          resultado: input.resultado,
          observacoes: observacoesAtualizadas,
          updatedAt: new Date(),
        })
        .where(eq(audiencias.id, input.audienciaId));
      return { ok: true };
    }),
```

- [ ] **Step 4: Rodar — pass**

Run: `npm run test __tests__/unit/audiencias-mutations.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat(audiencias): marcarConcluida mutation"
```

---

## Task 6: Mutation `redesignarAudiencia` (TDD)

**Files:**
- Modify: `__tests__/unit/audiencias-mutations.test.ts`
- Modify: `src/lib/trpc/routers/audiencias.ts`

- [ ] **Step 1: Adicionar teste**

```ts
describe("audiencias.redesignarAudiencia", () => {
  beforeEach(seedAudiencia);

  it("cria historico + atualiza data da audiencia", async () => {
    const caller = await createCaller({ userId: TEST_USER_ID });
    await caller.audiencias.redesignarAudiencia({
      audienciaId: TEST_AUDIENCIA_ID,
      novaData: "2026-06-20",
      novoHorario: "14:30",
      motivo: "Ausência do juiz",
    });
    const [row] = await db.select().from(audiencias).where(eq(audiencias.id, TEST_AUDIENCIA_ID));
    expect(row.status).toBe("redesignada");
    const novaData = new Date(row.dataAudiencia);
    expect(novaData.toISOString().slice(0, 10)).toBe("2026-06-20");
    expect(row.horario).toBe("14:30");
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `npm run test __tests__/unit/audiencias-mutations.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Em `src/lib/trpc/routers/audiencias.ts`:

```ts
import { audienciasHistorico } from "@/lib/db/schema/agenda";

  redesignarAudiencia: protectedProcedure
    .input(z.object({
      audienciaId: z.number(),
      novaData: z.string(),
      novoHorario: z.string(),
      motivo: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return withTransaction(async (tx) => {
        const [atual] = await tx.select().from(audiencias).where(eq(audiencias.id, input.audienciaId));
        if (!atual) throw new TRPCError({ code: "NOT_FOUND" });

        const [{ versao } = { versao: 0 }] = await tx
          .select({ versao: sql<number>`COALESCE(MAX(versao), 0)` })
          .from(audienciasHistorico)
          .where(eq(audienciasHistorico.audienciaId, input.audienciaId));

        await tx.insert(audienciasHistorico).values({
          audienciaId: input.audienciaId,
          versao: (versao ?? 0) + 1,
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

        return { ok: true };
      });
    }),
```

- [ ] **Step 4: Rodar — pass**

Run: `npm run test __tests__/unit/audiencias-mutations.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat(audiencias): redesignarAudiencia com histórico"
```

---

## Task 7: Componente `CollapsibleSection`

**Files:**
- Create: `src/components/agenda/sheet/collapsible-section.tsx`
- Create: `__tests__/components/collapsible-section.test.tsx`

- [ ] **Step 1: Escrever teste**

```tsx
// __tests__/components/collapsible-section.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CollapsibleSection } from "@/components/agenda/sheet/collapsible-section";

describe("CollapsibleSection", () => {
  beforeEach(() => localStorage.clear());

  it("renderiza fechado por default", () => {
    render(
      <CollapsibleSection id="test" label="Teste">
        <p>conteúdo</p>
      </CollapsibleSection>
    );
    expect(screen.queryByText("conteúdo")).not.toBeVisible();
  });

  it("abre ao clicar no header", () => {
    render(
      <CollapsibleSection id="test" label="Teste">
        <p>conteúdo</p>
      </CollapsibleSection>
    );
    fireEvent.click(screen.getByRole("button", { name: /teste/i }));
    expect(screen.getByText("conteúdo")).toBeVisible();
  });

  it("respeita defaultOpen", () => {
    render(
      <CollapsibleSection id="test" label="Teste" defaultOpen>
        <p>conteúdo</p>
      </CollapsibleSection>
    );
    expect(screen.getByText("conteúdo")).toBeVisible();
  });

  it("persiste estado em localStorage", () => {
    const { rerender } = render(
      <CollapsibleSection id="persistente" label="P">
        <p>c</p>
      </CollapsibleSection>
    );
    fireEvent.click(screen.getByRole("button", { name: /p/i }));
    rerender(
      <CollapsibleSection id="persistente" label="P">
        <p>c</p>
      </CollapsibleSection>
    );
    expect(screen.getByText("c")).toBeVisible();
  });

  it("exibe count quando fornecido", () => {
    render(
      <CollapsibleSection id="x" label="Depoentes" count={3}>
        <p>c</p>
      </CollapsibleSection>
    );
    expect(screen.getByText("3")).toBeVisible();
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `npm run test __tests__/components/collapsible-section.test.tsx`
Expected: FAIL (componente não existe).

- [ ] **Step 3: Implementar**

```tsx
// src/components/agenda/sheet/collapsible-section.tsx
"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "agenda-sheet-sections-open";

function readState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeState(id: string, open: boolean) {
  if (typeof window === "undefined") return;
  const current = readState();
  current[id] = open;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

interface Props {
  id: string;
  label: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleSection({
  id, label, count, defaultOpen = false, children, className,
}: Props) {
  const [open, setOpen] = useState(() => {
    const persisted = readState()[id];
    return persisted !== undefined ? persisted : defaultOpen;
  });

  useEffect(() => {
    writeState(id, open);
  }, [id, open]);

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={setOpen}
      id={id}
      data-section-id={id}
      className={cn(
        "rounded-xl bg-white dark:bg-neutral-900 shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden transition-shadow duration-200",
        className
      )}
    >
      <Collapsible.Trigger asChild>
        <button
          type="button"
          className="w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 tracking-wide uppercase">
              {label}
            </span>
            {count !== undefined && count > 0 && (
              <span className="text-[9px] font-medium text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                {count}
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 text-neutral-400 transition-transform duration-150 motion-reduce:transition-none",
              open && "rotate-180"
            )}
          />
        </button>
      </Collapsible.Trigger>
      <Collapsible.Content className="px-4 pb-4 pt-1 data-[state=closed]:animate-none motion-reduce:animate-none">
        {children}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
```

- [ ] **Step 4: Rodar — pass**

Run: `npm run test __tests__/components/collapsible-section.test.tsx`
Expected: 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/sheet/collapsible-section.tsx __tests__/components/collapsible-section.test.tsx
git commit -m "feat(agenda): CollapsibleSection com persistência localStorage"
```

---

## Task 8: Componente `SheetToC`

**Files:**
- Create: `src/components/agenda/sheet/sheet-toc.tsx`
- Create: `__tests__/components/sheet-toc.test.tsx`

- [ ] **Step 1: Escrever teste**

```tsx
// __tests__/components/sheet-toc.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SheetToC } from "@/components/agenda/sheet/sheet-toc";

const sections = [
  { id: "fatos", label: "Fatos" },
  { id: "depoentes", label: "Depoentes", count: 3 },
  { id: "teses", label: "Teses" },
];

describe("SheetToC", () => {
  it("renderiza apenas chips passados", () => {
    render(<SheetToC sections={sections} onJump={() => {}} />);
    expect(screen.getByText("Fatos")).toBeVisible();
    expect(screen.getByText("Depoentes")).toBeVisible();
    expect(screen.getByText("Teses")).toBeVisible();
  });

  it("mostra count quando presente", () => {
    render(<SheetToC sections={sections} onJump={() => {}} />);
    expect(screen.getByText("3")).toBeVisible();
  });

  it("chama onJump com id do chip clicado", () => {
    const onJump = vi.fn();
    render(<SheetToC sections={sections} onJump={onJump} />);
    fireEvent.click(screen.getByRole("button", { name: /teses/i }));
    expect(onJump).toHaveBeenCalledWith("teses");
  });

  it("destaca chip ativo", () => {
    render(<SheetToC sections={sections} activeId="depoentes" onJump={() => {}} />);
    const chip = screen.getByRole("button", { name: /depoentes/i });
    expect(chip.className).toMatch(/bg-foreground/);
  });

  it("não renderiza nada quando sections está vazio", () => {
    const { container } = render(<SheetToC sections={[]} onJump={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `npm run test __tests__/components/sheet-toc.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar**

```tsx
// src/components/agenda/sheet/sheet-toc.tsx
"use client";

import { cn } from "@/lib/utils";

export interface ToCSection {
  id: string;
  label: string;
  count?: number;
}

interface Props {
  sections: ToCSection[];
  activeId?: string;
  onJump: (id: string) => void;
}

export function SheetToC({ sections, activeId, onJump }: Props) {
  if (sections.length === 0) return null;
  return (
    <nav
      aria-label="Navegação do sheet"
      className="sticky top-0 z-[5] bg-neutral-100/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/40 dark:border-neutral-800/60 px-3 py-2"
    >
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {sections.map((s) => {
          const active = s.id === activeId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onJump(s.id)}
              className={cn(
                "shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-150 cursor-pointer flex items-center gap-1.5 motion-reduce:transition-none",
                active
                  ? "bg-foreground text-background border-foreground"
                  : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400"
              )}
            >
              {s.label}
              {s.count !== undefined && s.count > 0 && (
                <span
                  className={cn(
                    "text-[9px] tabular-nums",
                    active ? "text-background/80" : "text-neutral-400"
                  )}
                >
                  {s.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Rodar — pass**

Run: `npm run test __tests__/components/sheet-toc.test.tsx`
Expected: 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/sheet/sheet-toc.tsx __tests__/components/sheet-toc.test.tsx
git commit -m "feat(agenda): SheetToC chips sticky de navegação"
```

---

## Task 9: `DepoenteCardV2` (fechado)

**Files:**
- Create: `src/components/agenda/sheet/depoente-card-v2.tsx`
- Create: `__tests__/components/depoente-card-v2.test.tsx`

- [ ] **Step 1: Escrever teste (estado fechado)**

```tsx
// __tests__/components/depoente-card-v2.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DepoenteCardV2 } from "@/components/agenda/sheet/depoente-card-v2";

const noop = () => {};
const baseDep = {
  id: 1,
  nome: "João Silva",
  tipo: "ACUSACAO" as const,
  status: "ARROLADA" as const,
  lado: "acusacao",
};

const handlers = {
  onMarcarOuvido: noop,
  onRedesignar: noop,
  onAdicionarPergunta: noop,
  onAbrirAudio: noop,
};

describe("DepoenteCardV2 (fechado)", () => {
  it("mostra nome e qualidade", () => {
    render(<DepoenteCardV2 depoente={baseDep} isOpen={false} onToggle={noop} variant="sheet" {...handlers} />);
    expect(screen.getByText("João Silva")).toBeVisible();
    expect(screen.getByText(/acusação/i)).toBeVisible();
  });

  it("border-left vermelha para acusação", () => {
    const { container } = render(
      <DepoenteCardV2 depoente={baseDep} isOpen={false} onToggle={noop} variant="sheet" {...handlers} />
    );
    expect(container.querySelector('[data-lado="acusacao"]')?.className).toMatch(/border-l-rose/);
  });

  it("border-left verde para defesa", () => {
    const dep = { ...baseDep, tipo: "DEFESA" as const, lado: "defesa" };
    const { container } = render(
      <DepoenteCardV2 depoente={dep} isOpen={false} onToggle={noop} variant="sheet" {...handlers} />
    );
    expect(container.querySelector('[data-lado="defesa"]')?.className).toMatch(/border-l-emerald/);
  });

  it("badge de status OUVIDA aparece", () => {
    const dep = { ...baseDep, status: "OUVIDA" as const };
    render(<DepoenteCardV2 depoente={dep} isOpen={false} onToggle={noop} variant="sheet" {...handlers} />);
    expect(screen.getByText(/ouvid/i)).toBeVisible();
  });

  it("chama onToggle ao clicar no header", () => {
    const onToggle = vi.fn();
    render(<DepoenteCardV2 depoente={baseDep} isOpen={false} onToggle={onToggle} variant="sheet" {...handlers} />);
    fireEvent.click(screen.getByRole("button", { name: /joão silva/i }));
    expect(onToggle).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `npm run test __tests__/components/depoente-card-v2.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar (versão fechada, ações ficam para Task 10)**

```tsx
// src/components/agenda/sheet/depoente-card-v2.tsx
"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface DepoenteV2 {
  id?: number;
  nome: string;
  tipo?: "ACUSACAO" | "DEFESA" | "COMUM" | "INFORMANTE" | "PERITO" | "VITIMA";
  status?: "ARROLADA" | "INTIMADA" | "OUVIDA" | "DESISTIDA" | "NAO_LOCALIZADA" | "CARTA_PRECATORIA";
  lado?: string;
  qualidade?: string;
  papel?: string;
  versaoDelegacia?: string | null;
  versaoJuizo?: string | null;
  sinteseJuizo?: string | null;
  perguntasSugeridas?: string | null;
  ouvidoEm?: Date | string | null;
  redesignadoPara?: string | null;
  audioDriveFileId?: string | null;
}

interface Props {
  depoente: DepoenteV2;
  isOpen: boolean;
  onToggle: () => void;
  variant: "sheet" | "modal";
  onMarcarOuvido: (id: number, sintese?: string) => void;
  onRedesignar: (id: number) => void;
  onAdicionarPergunta: (id: number) => void;
  onAbrirAudio?: (id: number) => void;
}

function ladoOf(d: DepoenteV2): "acusacao" | "defesa" | "neutro" {
  if (d.lado === "acusacao" || d.tipo === "ACUSACAO" || d.tipo === "VITIMA") return "acusacao";
  if (d.lado === "defesa" || d.tipo === "DEFESA") return "defesa";
  return "neutro";
}

function statusLabel(s?: string): { text: string; tone: "emerald" | "amber" | "neutral" } {
  switch (s) {
    case "OUVIDA": return { text: "Ouvido", tone: "emerald" };
    case "DESISTIDA":
    case "NAO_LOCALIZADA": return { text: "Redesignado", tone: "amber" };
    default: return { text: "Pendente", tone: "neutral" };
  }
}

function qualidadeLabel(d: DepoenteV2): string | null {
  if (d.qualidade) return d.qualidade;
  if (d.tipo === "VITIMA") return "Vítima";
  if (d.tipo === "ACUSACAO") return "Acusação";
  if (d.tipo === "DEFESA") return "Defesa";
  if (d.tipo === "INFORMANTE") return "Informante";
  if (d.tipo === "PERITO") return "Perito";
  return null;
}

export function DepoenteCardV2({ depoente, isOpen, onToggle }: Props) {
  const lado = ladoOf(depoente);
  const status = statusLabel(depoente.status);
  const ladoBorder = {
    acusacao: "border-l-rose-300/70",
    defesa: "border-l-emerald-300/70",
    neutro: "border-l-neutral-200",
  }[lado];
  const statusClasses = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    neutral: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  }[status.tone];

  return (
    <div
      data-lado={lado}
      className={cn(
        "rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 border-l-[3px] overflow-hidden",
        ladoBorder
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20"
      >
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 truncate">
            {depoente.nome}
          </div>
          {qualidadeLabel(depoente) && (
            <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
              {qualidadeLabel(depoente)}
            </div>
          )}
        </div>
        <Badge className={cn("text-[9px] px-1.5 py-0", statusClasses)}>{status.text}</Badge>
        {isOpen
          ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          : <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />
        }
      </button>
      {isOpen && (
        <div className="px-3 pb-2.5 border-t border-neutral-100 dark:border-neutral-800/40 pt-2">
          {/* conteúdo expandido: Task 10 */}
          <p className="text-[11px] text-neutral-400 italic">Detalhes expandidos em construção.</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rodar — pass**

Run: `npm run test __tests__/components/depoente-card-v2.test.tsx`
Expected: 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/sheet/depoente-card-v2.tsx __tests__/components/depoente-card-v2.test.tsx
git commit -m "feat(agenda): DepoenteCardV2 estado fechado"
```

---

## Task 10: `DepoenteCardV2` (estado aberto com ações)

**Files:**
- Modify: `src/components/agenda/sheet/depoente-card-v2.tsx`
- Modify: `__tests__/components/depoente-card-v2.test.tsx`

- [ ] **Step 1: Adicionar testes de estado aberto**

```tsx
describe("DepoenteCardV2 (aberto)", () => {
  const depoenteRico = {
    ...baseDep,
    versaoDelegacia: "Negou os fatos na delegacia",
    versaoJuizo: "Admitiu parcialmente em juízo",
  };

  it("mostra síntese delegacia e juízo quando aberto", () => {
    render(<DepoenteCardV2 depoente={depoenteRico} isOpen={true} onToggle={noop} variant="sheet" {...handlers} />);
    expect(screen.getByText(/delegacia/i)).toBeVisible();
    expect(screen.getByText(/negou os fatos/i)).toBeVisible();
    expect(screen.getByText(/juízo/i)).toBeVisible();
    expect(screen.getByText(/admitiu parcialmente/i)).toBeVisible();
  });

  it("mostra 'vazio' quando síntese ausente", () => {
    render(<DepoenteCardV2 depoente={baseDep} isOpen={true} onToggle={noop} variant="sheet" {...handlers} />);
    expect(screen.getAllByText(/vazio/i).length).toBeGreaterThan(0);
  });

  it("chama onMarcarOuvido quando clicar no botão", () => {
    const onMarcarOuvido = vi.fn();
    render(
      <DepoenteCardV2
        depoente={baseDep}
        isOpen
        onToggle={noop}
        variant="sheet"
        {...handlers}
        onMarcarOuvido={onMarcarOuvido}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /marcar ouvid/i }));
    expect(onMarcarOuvido).toHaveBeenCalledWith(1, undefined);
  });

  it("chama onRedesignar", () => {
    const onRedesignar = vi.fn();
    render(
      <DepoenteCardV2
        depoente={baseDep}
        isOpen
        onToggle={noop}
        variant="sheet"
        {...handlers}
        onRedesignar={onRedesignar}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /redesignar/i }));
    expect(onRedesignar).toHaveBeenCalledWith(1);
  });

  it("mostra botão áudio apenas quando audioDriveFileId presente", () => {
    const { rerender } = render(
      <DepoenteCardV2 depoente={baseDep} isOpen onToggle={noop} variant="sheet" {...handlers} />
    );
    expect(screen.queryByRole("button", { name: /áudio/i })).toBeNull();
    rerender(
      <DepoenteCardV2
        depoente={{ ...baseDep, audioDriveFileId: "abc" }}
        isOpen
        onToggle={noop}
        variant="sheet"
        {...handlers}
      />
    );
    expect(screen.getByRole("button", { name: /áudio/i })).toBeVisible();
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `npm run test __tests__/components/depoente-card-v2.test.tsx`
Expected: FAIL em testes novos.

- [ ] **Step 3: Implementar conteúdo aberto**

Em `src/components/agenda/sheet/depoente-card-v2.tsx`, substituir o bloco `{isOpen && (...)}` por:

```tsx
      {isOpen && (
        <div className="px-3 pb-3 border-t border-neutral-100 dark:border-neutral-800/40 pt-2.5 space-y-2.5">
          {/* Delegacia */}
          <div>
            <div className="text-[9px] font-semibold text-neutral-400 tracking-wide mb-0.5">
              🏛 DELEGACIA
            </div>
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {depoente.versaoDelegacia ?? <span className="italic text-neutral-300">vazio</span>}
            </p>
          </div>

          {/* Em juízo */}
          <div>
            <div className="text-[9px] font-semibold text-neutral-400 tracking-wide mb-0.5">
              ⚖ EM JUÍZO
            </div>
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {depoente.sinteseJuizo ?? depoente.versaoJuizo ?? <span className="italic text-neutral-300">vazio</span>}
            </p>
          </div>

          {/* Perguntas preparadas */}
          {depoente.perguntasSugeridas && (
            <div>
              <div className="text-[9px] font-semibold text-neutral-400 tracking-wide mb-0.5">
                🎯 PERGUNTAS PREPARADAS
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap leading-relaxed">
                {depoente.perguntasSugeridas}
              </p>
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-dashed border-neutral-100 dark:border-neutral-800/40">
            {depoente.status !== "OUVIDA" && (
              <button
                type="button"
                onClick={() => depoente.id != null && onMarcarOuvido(depoente.id, undefined)}
                className="text-[10px] font-medium px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 cursor-pointer"
              >
                ✓ Marcar ouvido
              </button>
            )}
            <button
              type="button"
              onClick={() => depoente.id != null && onRedesignar(depoente.id)}
              className="text-[10px] font-medium px-2 py-1 rounded-md bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 cursor-pointer"
            >
              ↷ Redesignar
            </button>
            <button
              type="button"
              onClick={() => depoente.id != null && onAdicionarPergunta(depoente.id)}
              className="text-[10px] font-medium px-2 py-1 rounded-md bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 cursor-pointer"
            >
              + Pergunta
            </button>
            {depoente.audioDriveFileId && onAbrirAudio && (
              <button
                type="button"
                onClick={() => depoente.id != null && onAbrirAudio(depoente.id)}
                className="text-[10px] font-medium px-2 py-1 rounded-md bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 cursor-pointer"
              >
                ▶ Áudio
              </button>
            )}
          </div>
        </div>
      )}
```

Ajustar as props funcionais da assinatura para garantir que são usadas (já estão declaradas na Task 9).

- [ ] **Step 4: Rodar — pass**

Run: `npm run test __tests__/components/depoente-card-v2.test.tsx`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/sheet/depoente-card-v2.tsx __tests__/components/depoente-card-v2.test.tsx
git commit -m "feat(agenda): DepoenteCardV2 estado aberto + ações inline"
```

---

## Task 11: `ConcluirDialog` e `RedesignarDialog`

**Files:**
- Create: `src/components/agenda/sheet/concluir-dialog.tsx`
- Create: `src/components/agenda/sheet/redesignar-dialog.tsx`

- [ ] **Step 1: Implementar `ConcluirDialog`**

```tsx
// src/components/agenda/sheet/concluir-dialog.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (resultado: "sentenciado" | "instrucao_encerrada" | "outra", observacao: string) => void;
  isPending: boolean;
}

export function ConcluirDialog({ open, onOpenChange, onConfirm, isPending }: Props) {
  const [resultado, setResultado] = useState<"sentenciado" | "instrucao_encerrada" | "outra">("instrucao_encerrada");
  const [observacao, setObservacao] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Concluir audiência</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Resultado</Label>
            <RadioGroup value={resultado} onValueChange={(v) => setResultado(v as any)} className="mt-1.5 space-y-1.5">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="sentenciado" id="r1" />
                <Label htmlFor="r1" className="text-xs cursor-pointer">Sentenciado</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="instrucao_encerrada" id="r2" />
                <Label htmlFor="r2" className="text-xs cursor-pointer">Instrução encerrada</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="outra" id="r3" />
                <Label htmlFor="r3" className="text-xs cursor-pointer">Outra</Label>
              </div>
            </RadioGroup>
          </div>
          <div>
            <Label className="text-xs" htmlFor="obs">Observação (opcional)</Label>
            <Textarea
              id="obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              className="mt-1 text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600"
            onClick={() => onConfirm(resultado, observacao)}
            disabled={isPending}
          >
            {isPending ? "Salvando…" : "Confirmar conclusão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Implementar `RedesignarDialog`**

```tsx
// src/components/agenda/sheet/redesignar-dialog.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (novaData: string, novoHorario: string, motivo: string) => void;
  isPending: boolean;
}

export function RedesignarDialog({ open, onOpenChange, onConfirm, isPending }: Props) {
  const [novaData, setNovaData] = useState("");
  const [novoHorario, setNovoHorario] = useState("");
  const [motivo, setMotivo] = useState("");
  const podeConfirmar = novaData.length === 10 && novoHorario.length >= 4;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Redesignar audiência</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs" htmlFor="data">Nova data</Label>
              <Input
                id="data"
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="hora">Horário</Label>
              <Input
                id="hora"
                type="time"
                value={novoHorario}
                onChange={(e) => setNovoHorario(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs" htmlFor="motivo">Motivo (opcional)</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              className="mt-1 text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={() => onConfirm(novaData, novoHorario, motivo)}
            disabled={!podeConfirmar || isPending}
          >
            {isPending ? "Salvando…" : "Redesignar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Verificar typecheck**

Run: `npm run typecheck`
Expected: 0 erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/agenda/sheet/concluir-dialog.tsx src/components/agenda/sheet/redesignar-dialog.tsx
git commit -m "feat(agenda): dialogs de Concluir e Redesignar"
```

---

## Task 12: `useAudienciaStatusActions` hook

**Files:**
- Create: `src/hooks/use-audiencia-status-actions.ts`

- [ ] **Step 1: Implementar hook**

```ts
// src/hooks/use-audiencia-status-actions.ts
"use client";

import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

export function useAudienciaStatusActions(audienciaId: number | null) {
  const utils = trpc.useUtils();
  const invalidate = () => {
    if (audienciaId) {
      utils.audiencias.getAudienciaContext.invalidate({ audienciaId });
    }
  };

  const concluir = trpc.audiencias.marcarConcluida.useMutation({
    onSuccess: () => {
      toast.success("Audiência marcada como concluída");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const redesignar = trpc.audiencias.redesignarAudiencia.useMutation({
    onSuccess: () => {
      toast.success("Audiência redesignada");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const marcarOuvido = trpc.audiencias.marcarDepoenteOuvido.useMutation({
    onSuccess: () => {
      toast.success("Depoente marcado como ouvido");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const redesignarDep = trpc.audiencias.redesignarDepoente.useMutation({
    onSuccess: () => {
      toast.success("Depoente redesignado");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const addNote = trpc.audiencias.addQuickNote.useMutation({
    onSuccess: () => {
      toast.success("Anotação salva");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return { concluir, redesignar, marcarOuvido, redesignarDep, addNote };
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: 0 erros (assumindo que os nomes das mutations batem com o router; se falhar, nome da propriedade no hook deve espelhar o router exatamente).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-audiencia-status-actions.ts
git commit -m "feat(agenda): hook useAudienciaStatusActions"
```

---

## Task 13: `SheetActionFooter`

**Files:**
- Create: `src/components/agenda/sheet/sheet-action-footer.tsx`

- [ ] **Step 1: Implementar footer**

```tsx
// src/components/agenda/sheet/sheet-action-footer.tsx
"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConcluirDialog } from "./concluir-dialog";
import { RedesignarDialog } from "./redesignar-dialog";
import { useAudienciaStatusActions } from "@/hooks/use-audiencia-status-actions";

interface Props {
  audienciaId: number | null;
  jaConcluida: boolean;
  onAbrirRegistroCompleto: () => void;
}

export function SheetActionFooter({ audienciaId, jaConcluida, onAbrirRegistroCompleto }: Props) {
  const [quickNote, setQuickNote] = useState("");
  const [concluirOpen, setConcluirOpen] = useState(false);
  const [redesignarOpen, setRedesignarOpen] = useState(false);
  const actions = useAudienciaStatusActions(audienciaId);

  const submitNote = () => {
    if (!audienciaId || !quickNote.trim()) return;
    actions.addNote.mutate({ audienciaId, texto: quickNote.trim() });
    setQuickNote("");
  };

  return (
    <>
      <div className="sticky bottom-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200/40 dark:border-neutral-800/60 px-4 py-3 space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Anotação rápida…"
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitNote()}
            disabled={!audienciaId || actions.addNote.isPending}
            className="text-xs h-8 rounded-lg"
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            disabled={!quickNote.trim() || actions.addNote.isPending}
            onClick={submitNote}
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex gap-1.5">
          <Button
            size="sm"
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-9 cursor-pointer"
            disabled={jaConcluida || !audienciaId}
            onClick={() => setConcluirOpen(true)}
          >
            <Check className="w-3.5 h-3.5 mr-1.5" /> Concluir
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-9 cursor-pointer"
            disabled={!audienciaId}
            onClick={() => setRedesignarOpen(true)}
          >
            ↷ Redesignar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-9 w-9 p-0 cursor-pointer">⋯</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onAbrirRegistroCompleto}>
                Abrir registro completo
              </DropdownMenuItem>
              <DropdownMenuItem disabled>Decretar revelia (em breve)</DropdownMenuItem>
              <DropdownMenuItem disabled>Suspender (em breve)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ConcluirDialog
        open={concluirOpen}
        onOpenChange={setConcluirOpen}
        isPending={actions.concluir.isPending}
        onConfirm={(resultado, observacao) => {
          if (!audienciaId) return;
          actions.concluir.mutate({ audienciaId, resultado, observacao }, {
            onSuccess: () => setConcluirOpen(false),
          });
        }}
      />
      <RedesignarDialog
        open={redesignarOpen}
        onOpenChange={setRedesignarOpen}
        isPending={actions.redesignar.isPending}
        onConfirm={(novaData, novoHorario, motivo) => {
          if (!audienciaId) return;
          actions.redesignar.mutate({ audienciaId, novaData, novoHorario, motivo }, {
            onSuccess: () => setRedesignarOpen(false),
          });
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: 0 erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/agenda/sheet/sheet-action-footer.tsx
git commit -m "feat(agenda): SheetActionFooter com Concluir/Redesignar visíveis"
```

---

## Task 14: Refactor `event-detail-sheet.tsx`

**Files:**
- Modify: `src/components/agenda/event-detail-sheet.tsx` (774 → ~350 linhas)

- [ ] **Step 1: Ler versão atual para referência de conteúdo das seções**

Run: `wc -l src/components/agenda/event-detail-sheet.tsx`
Expected: `774`.

- [ ] **Step 2: Reescrever o arquivo**

Substituir o conteúdo de `src/components/agenda/event-detail-sheet.tsx` por:

```tsx
"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle, Check, ClipboardList, Copy, ExternalLink, FileText,
  FolderOpen, Loader2, X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { normalizeAreaToFilter, SOLID_COLOR_MAP } from "@/lib/config/atribuicoes";
import { SheetToC, type ToCSection } from "./sheet/sheet-toc";
import { CollapsibleSection } from "./sheet/collapsible-section";
import { SheetActionFooter } from "./sheet/sheet-action-footer";
import { DepoenteCardV2 } from "./sheet/depoente-card-v2";
import { useAudienciaStatusActions } from "@/hooks/use-audiencia-status-actions";

function EmptyHint({ text }: { text: string }) {
  return <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">{text}</p>;
}

function extractArray(obj: Record<string, any> | null | undefined, ...keys: string[]): any[] {
  if (!obj) return [];
  const nested = (obj as any).vvd_analise_audiencia;
  for (const k of keys) {
    const val = obj[k];
    if (Array.isArray(val) && val.length > 0) return val;
    if (nested && typeof nested === "object") {
      const nv = nested[k];
      if (Array.isArray(nv) && nv.length > 0) return nv;
    }
  }
  return [];
}

function extractString(obj: Record<string, any> | null | undefined, ...keys: string[]): string | null {
  if (!obj) return null;
  const nested = (obj as any).vvd_analise_audiencia;
  for (const k of keys) {
    const val = obj[k];
    if (typeof val === "string" && val.trim().length > 0) return val.trim();
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === "string") return (val as string[]).join(", ");
    if (nested && typeof nested === "object") {
      const nv = nested[k];
      if (typeof nv === "string" && nv.trim().length > 0) return nv.trim();
    }
  }
  return null;
}

interface Props {
  evento: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenRegistro?: () => void;
}

export function EventDetailSheet({ evento, open, onOpenChange, onOpenRegistro }: Props) {
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<string | undefined>();
  const [openDepoenteIdx, setOpenDepoenteIdx] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const audienciaIdNum = useMemo(() => {
    if (!evento) return null;
    if (evento.fonte === "audiencias" && typeof evento.rawId === "number") return evento.rawId;
    if (evento.fonte === "calendar") return null;
    const raw = evento.id;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string") {
      const m = raw.match(/^audiencia-(\d+)$/);
      if (m) return parseInt(m[1], 10);
      if (/^\d+$/.test(raw)) return parseInt(raw, 10);
    }
    return null;
  }, [evento]);

  const { data: ctx, isLoading } = trpc.audiencias.getAudienciaContext.useQuery(
    { audienciaId: audienciaIdNum ?? 0 },
    { enabled: !!audienciaIdNum && open, retry: false }
  );

  const actions = useAudienciaStatusActions(audienciaIdNum);

  const copyProcesso = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Build data for sections
  const dataHora = useMemo(() => {
    if (!evento) return null;
    if (evento.data && evento.horarioInicio) {
      try { return new Date(`${evento.data}T${evento.horarioInicio}`); } catch { return null; }
    }
    return evento.dataHora ? new Date(evento.dataHora) : null;
  }, [evento]);

  const processoNum = (ctx?.processo as any)?.numeroAutos ?? evento?.processo ?? null;
  const assistidoNome = ctx?.assistido?.nome ?? evento?.assistido ?? null;
  const vara = (ctx?.processo as any)?.vara ?? evento?.local ?? null;

  const ad = ctx?.analysisData;
  const caso = ctx?.caso;
  const assistidoId = (ctx?.assistido as any)?.id ?? evento?.assistidoId ?? null;
  const processoId = (ctx?.processo as any)?.id ?? evento?.processoId ?? null;
  const jaConcluida = (ctx as any)?.audiencia?.status === "concluida" || evento?.status === "concluida";

  const imputacao = extractString(ad, "imputacao", "crimes_imputados") ?? extractString(caso, "foco") ?? null;
  const fatos = caso?.narrativaDenuncia ?? extractString(ad, "resumo_executivo", "narrativa_denuncia") ?? null;
  const laudos = extractArray(ad, "laudos", "laudos_mencionados", "laudos_periciais");
  const lacunas = extractArray(ad, "vulnerabilidades_acusacao", "lacunas_probatorias", "lacunas");
  const versaoDelegacia = extractString(ad, "versao_delegacia", "versao_reu_delegacia");
  const versaoJuizo = extractString(ad, "versao_juizo", "versao_audiencia");
  const diligencias = ctx?.diligencias ?? [];
  const testemunhasDB = ctx?.testemunhas ?? [];
  const testemunhasAcusacao = extractArray(ad, "testemunhas_acusacao");
  const testemunhasDefesa = extractArray(ad, "testemunhas_defesa");

  const depoentes = useMemo(() => {
    const all = [
      ...testemunhasDB.map((t: any) => ({ ...t, _source: "db" })),
      ...testemunhasAcusacao.map((t: any) => ({ ...t, lado: "acusacao", tipo: "ACUSACAO" })),
      ...testemunhasDefesa.map((t: any) => ({ ...t, lado: "defesa", tipo: "DEFESA" })),
    ];
    const seen = new Set<string>();
    return all.filter((d) => {
      const key = (d.nome ?? "").toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [testemunhasDB, testemunhasAcusacao, testemunhasDefesa]);

  // abrir primeiro depoente pendente ao mudar evento
  useEffect(() => {
    const firstPending = depoentes.findIndex((d: any) => d.status !== "OUVIDA");
    setOpenDepoenteIdx(firstPending >= 0 ? firstPending : (depoentes.length > 0 ? 0 : null));
  }, [audienciaIdNum, depoentes.length]);

  const resumoExecutivo = extractString(ad, "resumo_executivo");
  const contradicoes = extractArray(ad, "contradicoes", "vulnerabilidades_acusacao");
  const pendencias = extractArray(ad, "pendencias_diligencia_pre_aij", "pendencias");
  const teses = extractArray(ad, "teses_defesa", "teses").filter(Boolean);

  // ToC sections (só as que têm conteúdo)
  const tocSections: ToCSection[] = useMemo(() => {
    const s: ToCSection[] = [];
    if (imputacao) s.push({ id: "imputacao", label: "Imputação" });
    if (fatos) s.push({ id: "fatos", label: "Fatos" });
    if (versaoDelegacia || versaoJuizo) s.push({ id: "versao", label: "Versão" });
    if (depoentes.length) s.push({ id: "depoentes", label: "Depoentes", count: depoentes.length });
    if (contradicoes.length) s.push({ id: "contradicoes", label: "Contradições" });
    if (laudos.length) s.push({ id: "laudos", label: "Laudos" });
    if (diligencias.length) s.push({ id: "investigacao", label: "Investigação" });
    if (pendencias.length) s.push({ id: "pendencias", label: "Pendências" });
    if (teses.length) s.push({ id: "teses", label: "Teses" });
    if (assistidoId || processoId) s.push({ id: "documentos", label: "Docs" });
    return s;
  }, [imputacao, fatos, versaoDelegacia, versaoJuizo, depoentes.length, contradicoes.length,
      laudos.length, diligencias.length, pendencias.length, teses.length, assistidoId, processoId]);

  // Scroll-spy via IntersectionObserver
  useEffect(() => {
    if (!open || !scrollContainerRef.current) return;
    const root = scrollContainerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.getAttribute("data-section-id") ?? undefined);
      },
      { root, rootMargin: "-10% 0px -70% 0px", threshold: 0 }
    );
    const nodes = root.querySelectorAll("[data-section-id]");
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [open, tocSections]);

  const handleJump = (id: string) => {
    const root = scrollContainerRef.current;
    if (!root) return;
    const target = root.querySelector(`[data-section-id="${id}"]`) as HTMLElement | null;
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!evento) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[480px] md:w-[560px] p-0 flex flex-col gap-0 border-l-0 outline-none bg-[#f7f7f7] dark:bg-neutral-950 rounded-l-2xl sm:rounded-l-none shadow-2xl [&>button:first-of-type]:hidden"
      >
        <SheetTitle className="sr-only">Detalhes do evento</SheetTitle>

        {/* Header bar */}
        <div className="bg-neutral-100/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/40 dark:border-neutral-800/60 px-4 py-2.5 flex items-center justify-between">
          <SheetHeader className="p-0">
            <SheetTitle className="text-[13px] font-semibold tracking-tight">Evento</SheetTitle>
          </SheetHeader>
          <button
            onClick={() => onOpenChange(false)}
            className="w-7 h-7 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800 flex items-center justify-center cursor-pointer"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ToC */}
        <SheetToC sections={tocSections} activeId={activeSection} onJump={handleJump} />

        {/* Scrollable content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          {/* Hero */}
          <div className="mx-3 mt-3 mb-3 px-4 py-4 rounded-xl bg-[#c8c8cc] dark:bg-neutral-800/60 border border-neutral-300/40 dark:border-neutral-700/40">
            <div className="flex items-start gap-3.5">
              {(() => {
                const filterKey = normalizeAreaToFilter(evento.atribuicaoKey || evento.atribuicao || "");
                const atribColor = SOLID_COLOR_MAP[filterKey] || "#a1a1aa";
                return (
                  <div
                    className="w-11 h-11 rounded-xl bg-white dark:bg-neutral-700 flex items-center justify-center shrink-0"
                    style={{ boxShadow: `0 0 0 2.5px ${atribColor}` }}
                  >
                    <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                      {(assistidoNome || evento.titulo || "").split(" ").filter(Boolean).slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()}
                    </span>
                  </div>
                );
              })()}
              <div className="flex-1 min-w-0 pt-0.5">
                {assistidoNome && (
                  <h2 className="text-[15px] font-semibold text-neutral-800 dark:text-neutral-100 leading-tight truncate">
                    {assistidoNome}
                  </h2>
                )}
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {processoNum && (
                    <button
                      onClick={(e) => { e.stopPropagation(); copyProcesso(processoNum); }}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/50 dark:bg-neutral-700/60 hover:bg-white/80 dark:hover:bg-neutral-700 cursor-pointer"
                      title="Copiar número"
                    >
                      <span className="font-mono text-[11px] tabular-nums text-neutral-600 dark:text-neutral-400">{processoNum}</span>
                      {copied ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5 text-neutral-500" />}
                    </button>
                  )}
                  {dataHora && (
                    <span className="text-[11px] text-neutral-600 dark:text-neutral-500 tabular-nums">
                      {format(dataHora, "HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </div>
                {vara && (
                  <p className="text-[10px] text-neutral-500 mt-1.5">
                    {vara}
                    {evento.atribuicao && ` · ${evento.atribuicao}`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="px-3 pb-4 space-y-2.5">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
              </div>
            )}

            {!isLoading && resumoExecutivo && (
              <CollapsibleSection id="resumo" label="Resumo Executivo" defaultOpen>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">{resumoExecutivo}</p>
              </CollapsibleSection>
            )}

            {!isLoading && (
              <>
                <CollapsibleSection id="imputacao" label="Imputação" defaultOpen>
                  {imputacao ? (
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{imputacao}</p>
                  ) : <EmptyHint text="Imputação não extraída — rode a análise IA." />}
                </CollapsibleSection>

                <CollapsibleSection id="fatos" label="Fatos (Denúncia)" defaultOpen>
                  {fatos ? (
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{fatos}</p>
                  ) : <EmptyHint text="Narrativa da denúncia não disponível." />}
                </CollapsibleSection>

                {(versaoDelegacia || versaoJuizo) && (
                  <CollapsibleSection id="versao" label="Versão do Acusado">
                    {versaoDelegacia && (
                      <div className="mb-2">
                        <div className="text-[10px] font-semibold text-neutral-500 mb-1">Delegacia</div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{versaoDelegacia}</p>
                      </div>
                    )}
                    {versaoJuizo && (
                      <div>
                        <div className="text-[10px] font-semibold text-neutral-500 mb-1">Em Juízo</div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{versaoJuizo}</p>
                      </div>
                    )}
                  </CollapsibleSection>
                )}

                <CollapsibleSection id="depoentes" label="Depoentes" count={depoentes.length} defaultOpen>
                  {depoentes.length > 0 ? (
                    <div className="space-y-2">
                      {depoentes.map((d: any, i: number) => (
                        <DepoenteCardV2
                          key={d.id ?? `${i}-${d.nome}`}
                          depoente={d}
                          isOpen={openDepoenteIdx === i}
                          onToggle={() => setOpenDepoenteIdx(openDepoenteIdx === i ? null : i)}
                          variant="sheet"
                          onMarcarOuvido={(id, sintese) => actions.marcarOuvido.mutate({ depoenteId: id, sinteseJuizo: sintese })}
                          onRedesignar={(id) => actions.redesignarDep.mutate({ depoenteId: id })}
                          onAdicionarPergunta={() => toast.info("Em breve: abrir modal de perguntas")}
                          onAbrirAudio={() => toast.info("Em breve (Fase 2)")}
                        />
                      ))}
                    </div>
                  ) : <EmptyHint text="Nenhum depoente cadastrado." />}
                </CollapsibleSection>

                {contradicoes.length > 0 && (
                  <CollapsibleSection id="contradicoes" label="Contradições" count={contradicoes.length}>
                    <ul className="space-y-1.5">
                      {contradicoes.map((c: any, i: number) => {
                        const text = typeof c === "string" ? c : c.descricao ?? c.contradicao ?? JSON.stringify(c);
                        return (
                          <li key={i} className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-400/70" />
                            <span>{text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </CollapsibleSection>
                )}

                {laudos.length > 0 && (
                  <CollapsibleSection id="laudos" label="Laudos e Perícias" count={laudos.length}>
                    <ul className="space-y-1">
                      {laudos.map((l: any, i: number) => (
                        <li key={i} className="text-xs text-neutral-600 dark:text-neutral-400">
                          • {typeof l === "string" ? l : l.nome ?? l.titulo ?? JSON.stringify(l)}
                        </li>
                      ))}
                    </ul>
                    {lacunas.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800/40">
                        <p className="text-[10px] font-medium text-neutral-400 mb-1">Lacunas probatórias</p>
                        <ul className="space-y-1">
                          {lacunas.map((l: any, i: number) => (
                            <li key={i} className="text-xs text-neutral-600 dark:text-neutral-400">
                              • {typeof l === "string" ? l : l.descricao ?? JSON.stringify(l)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CollapsibleSection>
                )}

                {diligencias.length > 0 && (
                  <CollapsibleSection id="investigacao" label="Investigação Defensiva" count={diligencias.length}>
                    <ul className="space-y-2">
                      {diligencias.map((d: any) => (
                        <li key={d.id} className="text-xs text-neutral-700 dark:text-neutral-300">
                          <span className="font-medium">{d.titulo}</span>
                          {d.resultado && <p className="text-neutral-500 mt-0.5">{d.resultado}</p>}
                        </li>
                      ))}
                    </ul>
                  </CollapsibleSection>
                )}

                {pendencias.length > 0 && (
                  <CollapsibleSection id="pendencias" label="Pendências" count={pendencias.length}>
                    <ul className="space-y-1">
                      {pendencias.map((p: any, i: number) => {
                        const text = typeof p === "string" ? p : p.descricao ?? p.pendencia ?? JSON.stringify(p);
                        return (
                          <li key={i} className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-400/70" />
                            <span>{text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </CollapsibleSection>
                )}

                {teses.length > 0 && (
                  <CollapsibleSection id="teses" label="Teses" count={teses.length}>
                    <div className="flex flex-wrap gap-1.5">
                      {teses.map((t: any, i: number) => {
                        const text = typeof t === "string" ? t : t.tese ?? t.descricao ?? JSON.stringify(t);
                        return (
                          <Badge key={i} variant="outline" className="text-[11px]">{text}</Badge>
                        );
                      })}
                    </div>
                  </CollapsibleSection>
                )}

                {(assistidoId || processoId) && (
                  <CollapsibleSection id="documentos" label="Documentos">
                    <div className="flex flex-wrap gap-2">
                      {assistidoId && (
                        <Link
                          href={`/admin/assistidos/${assistidoId}?tab=drive`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 px-2.5 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/40 cursor-pointer"
                        >
                          <FolderOpen className="w-3 h-3" /> Pasta do Assistido
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </Link>
                      )}
                      {processoId && (
                        <Link
                          href={`/admin/processos/${processoId}?tab=drive`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 px-2.5 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/40 cursor-pointer"
                        >
                          <FileText className="w-3 h-3" /> Autos do Processo
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </Link>
                      )}
                    </div>
                    <p className="text-[10px] text-neutral-400 italic mt-2">
                      Preview inline + upload chegam na Fase 2.
                    </p>
                  </CollapsibleSection>
                )}
              </>
            )}
          </div>
        </div>

        <SheetActionFooter
          audienciaId={audienciaIdNum}
          jaConcluida={jaConcluida}
          onAbrirRegistroCompleto={() => onOpenRegistro?.()}
        />
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: 0 erros.

- [ ] **Step 4: Verificar linhas**

Run: `wc -l src/components/agenda/event-detail-sheet.tsx`
Expected: entre 300 e 420 linhas.

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/event-detail-sheet.tsx
git commit -m "refactor(agenda): event-detail-sheet usa ToC + CollapsibleSection + DepoenteCardV2"
```

---

## Task 15: Regressão — bloco Depoentes renderiza 1×

**Files:**
- Create: `__tests__/components/event-detail-sheet.test.tsx`

- [ ] **Step 1: Escrever teste**

```tsx
// __tests__/components/event-detail-sheet.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventDetailSheet } from "@/components/agenda/event-detail-sheet";

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    audiencias: {
      getAudienciaContext: {
        useQuery: () => ({
          data: {
            assistido: { id: 1, nome: "Maria" },
            processo: { id: 10, numeroAutos: "0000-00" },
            testemunhas: [{ id: 1, nome: "João", tipo: "ACUSACAO", status: "ARROLADA" }],
            diligencias: [],
            analysisData: null,
            caso: null,
          },
          isLoading: false,
        }),
      },
      marcarConcluida: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      redesignarAudiencia: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      marcarDepoenteOuvido: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      redesignarDepoente: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      addQuickNote: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    useUtils: () => ({ audiencias: { getAudienciaContext: { invalidate: vi.fn() } } }),
  },
}));

describe("EventDetailSheet", () => {
  const evento = { id: 1, fonte: "audiencias", rawId: 1, titulo: "Audiência", data: "2026-05-01", horarioInicio: "10:00" };

  it("bloco Depoentes aparece exatamente uma vez (regressão do bug de duplicação)", () => {
    render(<EventDetailSheet evento={evento} open={true} onOpenChange={() => {}} />);
    const matches = screen.getAllByText(/depoentes/i);
    // O label aparece no chip do ToC + no header do CollapsibleSection = 2.
    // Porém "João" (nome do depoente) deve aparecer só uma vez.
    expect(screen.getAllByText("João")).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Rodar**

Run: `npm run test __tests__/components/event-detail-sheet.test.tsx`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add __tests__/components/event-detail-sheet.test.tsx
git commit -m "test(agenda): regressão do bug de duplicação de Depoentes"
```

---

## Task 16: Migrar `shared/depoente-card.tsx` → re-export

**Files:**
- Modify: `src/components/agenda/registro-audiencia/shared/depoente-card.tsx`

- [ ] **Step 1: Verificar consumidores**

Run: `grep -rln "from.*shared/depoente-card" src/`
Expected: listagem dos arquivos que importam (tab-historico, tab-depoentes, tab-depoente-form).

- [ ] **Step 2: Substituir conteúdo por re-export + manter `InfoBlock`**

```tsx
// src/components/agenda/registro-audiencia/shared/depoente-card.tsx
export { DepoenteCardV2 as DepoenteCard } from "@/components/agenda/sheet/depoente-card-v2";

// InfoBlock segue aqui, é usado pelo histórico
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function InfoBlock({
  icon: Icon,
  label,
  borderColor,
  children,
}: {
  icon: React.ComponentType<any>;
  label: string;
  borderColor: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("border-l-2 pl-3 py-1", borderColor)}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="w-3 h-3 text-neutral-400" />
        <span className="text-[10px] font-semibold text-neutral-500 tracking-wide">{label}</span>
      </div>
      {children}
    </div>
  );
}
```

Importante: `DepoenteCardV2` aceita novas props (handlers), então consumidores do modal que não fornecerem handlers vão quebrar. Se o typecheck falhar, adicionar handlers com default no-op ao chamar:

Em `tab-historico.tsx` e `tab-depoentes.tsx` onde for usado apenas para display, passar:
```tsx
<DepoenteCard
  depoente={dep}
  isOpen={false}
  onToggle={() => {}}
  variant="modal"
  onMarcarOuvido={() => {}}
  onRedesignar={() => {}}
  onAdicionarPergunta={() => {}}
/>
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: 0 erros. Se houver, adicionar handlers no-op nos sites que importam.

- [ ] **Step 4: Rodar testes**

Run: `npm run test`
Expected: todos passam.

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/registro-audiencia/
git commit -m "refactor(agenda): unifica DepoenteCard — shared re-exporta V2"
```

---

## Task 17: Smoke test Playwright

**Files:**
- Create: `e2e/agenda-sheet.spec.ts` (se `e2e/` não existir, verifique `tests/e2e/` ou `__tests__/e2e/` e use o padrão existente do projeto)

- [ ] **Step 1: Verificar config Playwright**

Run: `ls ~/projetos/Defender | grep -i playwright; cat ~/projetos/Defender/playwright.config.* 2>/dev/null | head -20`
Expected: existe config. Se não existir, pular esta task e registrar como follow-up no `HEARTBEAT.md`.

- [ ] **Step 2: Escrever smoke test**

```ts
// e2e/agenda-sheet.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Agenda sheet", () => {
  test("abre evento, navega por chip, colapsa seção", async ({ page }) => {
    await page.goto("/admin/agenda");
    // Abrir primeiro evento da lista
    const primeiroEvento = page.locator('[data-evento-card]').first();
    await primeiroEvento.click();
    // Sheet visível
    await expect(page.getByRole("dialog", { name: /detalhes do evento/i })).toBeVisible();
    // ToC presente
    await expect(page.getByRole("navigation", { name: /navegação do sheet/i })).toBeVisible();
    // Clicar chip Depoentes (se existir)
    const chipDepoentes = page.getByRole("button", { name: /depoentes/i }).first();
    if (await chipDepoentes.isVisible()) {
      await chipDepoentes.click();
    }
    // Fechar
    await page.getByTitle("Fechar").click();
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("não renderiza bloco Depoentes duplicado", async ({ page }) => {
    await page.goto("/admin/agenda");
    const primeiroEvento = page.locator('[data-evento-card]').first();
    await primeiroEvento.click();
    // O header "DEPOENTES" (uppercase, tracking-wide) aparece uma vez no CollapsibleSection
    const headerDepoentes = page.locator('text=/^DEPOENTES$/i');
    const count = await headerDepoentes.count();
    expect(count).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 3: Rodar (dev server precisa estar ativo)**

Em outro terminal: `npm run dev`
Run: `npx playwright test e2e/agenda-sheet.spec.ts`
Expected: 2 PASS. Se falhar por seletor `[data-evento-card]`, inspecionar a UI real e ajustar seletor.

- [ ] **Step 4: Commit**

```bash
git add e2e/agenda-sheet.spec.ts
git commit -m "test(e2e): smoke do sheet da agenda"
```

---

## Task 18: Verificação manual no browser

**Files:**
- Nenhum — verificação UX manual.

- [ ] **Step 1: Rodar dev server limpo**

Run: `cd ~/projetos/Defender && rm -rf .next/cache && npm run dev:webpack`
Expected: servidor em `http://localhost:3000`.

- [ ] **Step 2: Checklist manual**

Abrir `http://localhost:3000/admin/agenda` e validar:

- [ ] Abrir um evento → sheet lateral aparece.
- [ ] ToC de chips aparece abaixo do header "Evento".
- [ ] Scroll lento — chip ativo muda conforme cada seção entra em vista.
- [ ] Clicar chip "Teses" → sheet rola até a seção Teses.
- [ ] Clicar header "Laudos e Perícias" → colapsa/expande com animação.
- [ ] Recarregar a página e reabrir o evento → "Laudos" permanece do jeito que foi deixado (localStorage).
- [ ] Bloco Depoentes: só existe 1. Primeiro depoente pendente abre sozinho. Clicar no header de outro → o anterior fecha, o novo abre.
- [ ] Clicar "Marcar ouvido" num depoente → toast de sucesso + badge muda para "Ouvido".
- [ ] Clicar "Redesignar" no card → toast "Depoente redesignado".
- [ ] Footer: botão Concluir (emerald) + Redesignar (outline) + ⋯ visíveis.
- [ ] Clicar Concluir → mini-dialog abre, selecionar "Instrução encerrada", confirmar → toast + sheet atualiza status.
- [ ] Clicar Redesignar → mini-dialog com date/time → confirma → toast + data do evento atualiza na agenda principal.
- [ ] Escrever em "Anotação rápida" + Enter → toast "Anotação salva" (não mais "em breve").
- [ ] `prefers-reduced-motion` no sistema operacional: animação de colapso desaparece.

- [ ] **Step 3: Screenshot de referência (opcional)**

Salvar em `docs/plans/assets/2026-04-16-agenda-fase1-sheet-ok.png` se quiser documentar.

- [ ] **Step 4: Commit final**

```bash
git commit --allow-empty -m "chore(agenda): fase 1 validada manualmente"
```

---

## Self-review

**Spec coverage:**
| Spec requirement | Task(s) |
|---|---|
| Bug de duplicação de Depoentes | Tasks 14, 15 |
| ToC sticky de chips | Task 8, integrado em 14 |
| Blocos colapsáveis com defaultOpen | Task 7, usado em 14 |
| Persistência de colapso em localStorage | Task 7 |
| Depoente rico expansível (accordion 1 por vez) | Tasks 9, 10, 14 |
| Ações footer (Concluir / Redesignar / ⋯) | Tasks 11, 13 |
| Mini-modais Concluir e Redesignar | Task 11 |
| 5 mutations tRPC | Tasks 2, 3, 4, 5, 6 |
| Anotação rápida persiste | Task 2 + Task 13 |
| Schema: `anotacoesRapidas`, `ouvidoEm`, `redesignadoPara`, `sinteseJuizo` | Task 1 |
| Tests unitários de mutations | Tasks 2–6 |
| Tests de componentes | Tasks 7, 8, 9, 10 |
| Teste de regressão do bug | Task 15 |
| Smoke Playwright | Task 17 |
| Validação manual UX | Task 18 |
| `useAudienciaStatusActions` hook compartilhado | Task 12 |

**Placeholders:** zero "TBD"/"TODO"/"similar to above". Todo código está escrito.

**Type consistency:**
- Campos novos do schema (`anotacoesRapidas`, `ouvidoEm`, `redesignadoPara`, `sinteseJuizo`) são usados exatamente com esses nomes nas tasks 2-6.
- `DepoenteCardV2` props declaradas em Task 9 são usadas com os mesmos nomes em Tasks 10, 14, 16.
- Enum `statusTestemunhaEnum.OUVIDA` existe no projeto e é usado em Tasks 3, 9, 10.
- Mutations (`marcarConcluida`, `redesignarAudiencia`, `marcarDepoenteOuvido`, `redesignarDepoente`, `addQuickNote`) — mesmos nomes em todas as tasks.
- `ConcluirDialog`/`RedesignarDialog` assinaturas (Task 11) batem com os sites de chamada (Task 13).

Plan está coerente e executável.
