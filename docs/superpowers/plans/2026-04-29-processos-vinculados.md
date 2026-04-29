# Processos Vinculados (Referência) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar de primeira-classe na UI o relacionamento entre processo principal e processos incidentais/apartados (revogação, MPU, HC, recursos, IP), com criação rápida a partir da página de demandas.

**Architecture:** Aproveitar campos existentes (`processos.tipoProcesso`, `processoOrigemId`, `casoId`, `isReferencia`) — zero migration. Novo procedure tRPC `processos.vinculados`, mutation `processos.criarVinculado`, componentes `<ProcessoTipoBadge>` + `<ProcessosVinculadosList>` + `<NovoProcessoVinculadoDialog>`, agrupamento por caso na ficha do assistido.

**Tech Stack:** Next.js 15, React 19, Drizzle ORM, PostgreSQL, tRPC, Tailwind CSS, shadcn/ui, Vitest.

**Spec:** `docs/superpowers/specs/2026-04-29-processos-vinculados-design.md`

**Pré-requisito:** `feat/registros-tipados` mergeada em `main` (registros viajam com `demandaId`).

---

## Pre-flight

**Branch hygiene:** Criar branch `feat/processos-vinculados` a partir de `origin/main` fresca após merge da `feat/registros-tipados`.

```bash
git fetch origin main
git checkout -b feat/processos-vinculados origin/main
pnpm install
pnpm tsc --noEmit | grep -E "(error|Error)" | wc -l   # Anote baseline
```

---

## Task 1: Constantes canônicas + `<ProcessoTipoBadge>`

**Files:**
- Create: `src/lib/processos/tipos.ts`
- Create: `src/components/processo/processo-tipo-badge.tsx`
- Create: `src/components/processo/__tests__/processo-tipo-badge.test.tsx`

- [ ] **Step 1.1: Constantes**

```ts
// src/lib/processos/tipos.ts
export const TIPOS_PROCESSO = {
  AP:        { label: "Ação Penal",         badge: "AP",        color: "slate"   },
  IP:        { label: "Inquérito Policial", badge: "IP",        color: "neutral" },
  MPU:       { label: "Medida Protetiva",   badge: "MPU",       color: "amber"   },
  REVOGACAO: { label: "Revogação",          badge: "Revogação", color: "blue"    },
  HC:        { label: "Habeas Corpus",      badge: "HC",        color: "rose"    },
  RECURSO:   { label: "Recurso",            badge: "Recurso",   color: "violet"  },
  EP:        { label: "Execução Penal",     badge: "EP",        color: "blue"    },
  PEDIDO:    { label: "Pedido Apartado",    badge: "Apartado",  color: "indigo"  },
} as const;

export type TipoProcesso = keyof typeof TIPOS_PROCESSO;

export const TIPOS_INCIDENTAIS: TipoProcesso[] =
  ["REVOGACAO","HC","RECURSO","MPU","IP","PEDIDO"];

export function tipoProcessoLabel(tipo: string | null | undefined): string {
  if (!tipo) return "Processo";
  return (TIPOS_PROCESSO as Record<string, { label: string }>)[tipo]?.label ?? tipo;
}
```

- [ ] **Step 1.2: Badge component**

```tsx
// src/components/processo/processo-tipo-badge.tsx
"use client";
import { cn } from "@/lib/utils";
import { TIPOS_PROCESSO, type TipoProcesso } from "@/lib/processos/tipos";

const COLOR_CLASSES: Record<string, string> = {
  slate:   "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
  neutral: "bg-neutral-100 text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-300",
  amber:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  blue:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  rose:    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  violet:  "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  indigo:  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
};

export function ProcessoTipoBadge({ tipo, className }: { tipo: string | null; className?: string }) {
  const cfg = TIPOS_PROCESSO[tipo as TipoProcesso] ?? TIPOS_PROCESSO.AP;
  return (
    <span className={cn(
      "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide",
      COLOR_CLASSES[cfg.color],
      className,
    )}>
      {cfg.badge}
    </span>
  );
}
```

- [ ] **Step 1.3: Teste smoke**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProcessoTipoBadge } from "../processo-tipo-badge";

describe("ProcessoTipoBadge", () => {
  it("renders all known tipos", () => {
    const tipos = ["AP","IP","MPU","REVOGACAO","HC","RECURSO","EP","PEDIDO"];
    tipos.forEach(t => render(<ProcessoTipoBadge tipo={t} />));
  });
  it("falls back to AP when tipo is unknown", () => {
    render(<ProcessoTipoBadge tipo="XYZ" />);
    expect(screen.getByText("AP")).toBeInTheDocument();
  });
  it("falls back to AP when tipo is null", () => {
    render(<ProcessoTipoBadge tipo={null} />);
    expect(screen.getByText("AP")).toBeInTheDocument();
  });
});
```

- [ ] **Step 1.4: Commit**

```bash
git add src/lib/processos/ src/components/processo/processo-tipo-badge.tsx src/components/processo/__tests__/
git commit -m "feat(processos): TIPOS_PROCESSO + <ProcessoTipoBadge> com 8 tipos canônicos"
```

---

## Task 2: tRPC `processos.vinculados`

**Files:**
- Modify: `src/lib/trpc/routers/processos.ts` (add procedure)
- Test: `src/lib/trpc/routers/__tests__/processos-vinculados.test.ts`

- [ ] **Step 2.1: Escrever testes (TDD)**

```ts
// src/lib/trpc/routers/__tests__/processos-vinculados.test.ts
import { describe, it, expect } from "vitest";
import { createCaller } from "../trpc-test-helper";

describe("processos.vinculados", () => {
  it("returns processos sharing casoId, principal first", async () => {
    const caller = await createCaller();
    const result = await caller.processos.vinculados({ processoId: 649 }); // AP João Batista
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].processoOrigemId).toBeNull(); // principal primeiro
    expect(result.some(p => p.tipoProcesso === "REVOGACAO")).toBe(true);
  });

  it("returns empty when processo has no casoId nor children", async () => {
    const caller = await createCaller();
    const result = await caller.processos.vinculados({ processoId: 99999 });
    expect(result).toEqual([]);
  });

  it("falls back to processoOrigemId when casoId is null", async () => {
    const caller = await createCaller();
    const result = await caller.processos.vinculados({ processoId: 2028 }); // revogação
    expect(result.some(p => p.id === 649)).toBe(true); // achou a AP via processoOrigemId
  });

  it("excludes self when excluirId provided", async () => {
    const caller = await createCaller();
    const result = await caller.processos.vinculados({ processoId: 649, excluirId: 649 });
    expect(result.some(p => p.id === 649)).toBe(false);
  });
});
```

- [ ] **Step 2.2: Implementar procedure**

Adicionar em `src/lib/trpc/routers/processos.ts`:

```ts
vinculados: protectedProcedure
  .input(z.object({
    processoId: z.number().optional(),
    casoId: z.number().optional(),
    excluirId: z.number().optional(),
  }))
  .query(async ({ ctx, input }) => {
    if (!input.processoId && !input.casoId) return [];

    let casoId = input.casoId;
    if (!casoId && input.processoId) {
      const [p] = await ctx.db.select({ casoId: processos.casoId })
        .from(processos)
        .where(eq(processos.id, input.processoId))
        .limit(1);
      casoId = p?.casoId ?? undefined;
    }

    if (casoId) {
      const rows = await ctx.db.select({
        id: processos.id,
        numeroAutos: processos.numeroAutos,
        tipoProcesso: processos.tipoProcesso,
        processoOrigemId: processos.processoOrigemId,
        classeProcessual: processos.classeProcessual,
        situacao: processos.situacao,
        isReferencia: processos.isReferencia,
      }).from(processos).where(and(
        eq(processos.casoId, casoId),
        input.excluirId ? ne(processos.id, input.excluirId) : undefined,
        isNull(processos.deletedAt),
      ));
      return rows.sort((a, b) => {
        if (a.processoOrigemId === null && b.processoOrigemId !== null) return -1;
        if (b.processoOrigemId === null && a.processoOrigemId !== null) return 1;
        return a.id - b.id;
      });
    }

    // Fallback: busca via processoOrigemId
    if (!input.processoId) return [];
    const ladders = await ctx.db.select({
      id: processos.id,
      numeroAutos: processos.numeroAutos,
      tipoProcesso: processos.tipoProcesso,
      processoOrigemId: processos.processoOrigemId,
      classeProcessual: processos.classeProcessual,
      situacao: processos.situacao,
      isReferencia: processos.isReferencia,
    }).from(processos).where(and(
      or(
        eq(processos.processoOrigemId, input.processoId),
        eq(processos.id, input.processoId),
      ),
      input.excluirId ? ne(processos.id, input.excluirId) : undefined,
      isNull(processos.deletedAt),
    ));
    return ladders;
  }),
```

- [ ] **Step 2.3: Rodar testes**

```bash
pnpm vitest run src/lib/trpc/routers/__tests__/processos-vinculados.test.ts
```
Expected: PASS.

- [ ] **Step 2.4: Refatorar `getById` para reusar `vinculados`**

Em `processos.ts:247-307`, substituir a query inline por chamada interna ao `vinculados`. Garantir que o output mantém o shape esperado por `<ProcessoHeader>`.

- [ ] **Step 2.5: Commit**

```bash
git commit -am "feat(processos): tRPC vinculados procedure + refatora getById para reusar"
```

---

## Task 3: `<ProcessosVinculadosList>` + integração no `<ProcessoHeader>`

**Files:**
- Create: `src/components/processo/processos-vinculados-list.tsx`
- Create: `src/components/processo/processo-vinculado-row.tsx`
- Modify: `src/components/processo/processo-header.tsx` (substituir bloco atual)

- [ ] **Step 3.1: `<ProcessoVinculadoRow>`**

```tsx
"use client";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProcessoTipoBadge } from "./processo-tipo-badge";
import { cn } from "@/lib/utils";

interface Props {
  proc: {
    id: number;
    numeroAutos: string | null;
    tipoProcesso: string | null;
    classeProcessual?: string | null;
    situacao?: string | null;
  };
  hierarchy: "principal" | "incidental";
  isCurrent?: boolean;
}

export function ProcessoVinculadoRow({ proc, hierarchy, isCurrent }: Props) {
  return (
    <Link href={`/admin/processos/${proc.id}`}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors group",
        hierarchy === "incidental" && "ml-4",
        isCurrent && "bg-white/[0.06]",
      )}
    >
      <ProcessoTipoBadge tipo={proc.tipoProcesso} />
      <span className="text-[12px] text-white/80 font-mono">{proc.numeroAutos}</span>
      {proc.classeProcessual && (
        <span className="text-[10px] text-white/40 truncate">· {proc.classeProcessual}</span>
      )}
      <ChevronRight className="ml-auto h-3 w-3 text-white/30 group-hover:text-white/60" />
    </Link>
  );
}
```

- [ ] **Step 3.2: `<ProcessosVinculadosList>`**

```tsx
"use client";
import { api } from "@/lib/trpc/react";
import { ProcessoVinculadoRow } from "./processo-vinculado-row";
import { NovoProcessoVinculadoButton } from "./novo-processo-vinculado-button";

interface Props {
  processoId: number;
  showCreateButton?: boolean;
  currentId?: number;
}
export function ProcessosVinculadosList({ processoId, showCreateButton, currentId }: Props) {
  const { data: vinculados = [] } = api.processos.vinculados.useQuery({ processoId });
  if (vinculados.length === 0 && !showCreateButton) return null;

  const principal = vinculados.find(p => p.processoOrigemId === null);
  const incidentais = vinculados.filter(p => p.processoOrigemId !== null);

  return (
    <div className="space-y-0.5">
      {principal && <ProcessoVinculadoRow proc={principal} hierarchy="principal" isCurrent={principal.id === currentId} />}
      {incidentais.map(p => (
        <ProcessoVinculadoRow key={p.id} proc={p} hierarchy="incidental" isCurrent={p.id === currentId} />
      ))}
      {showCreateButton && <NovoProcessoVinculadoButton processoOrigemId={principal?.id ?? processoId} />}
    </div>
  );
}
```

- [ ] **Step 3.3: Integrar no `<ProcessoHeader>`**

Substituir o bloco atual (linhas 171-180) por:

```tsx
{(casoInfo || vinculados.length > 0) && (
  <div className="mt-3 pt-3 border-t border-white/[0.06]">
    <h3 className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Processos vinculados</h3>
    <ProcessosVinculadosList processoId={id} showCreateButton currentId={id} />
  </div>
)}
```

- [ ] **Step 3.4: Validar visualmente**

```bash
pnpm dev
```
Abrir `/admin/processos/{id da AP do João}` — deve mostrar AP no topo + Revogação indentada.

- [ ] **Step 3.5: Commit**

```bash
git commit -am "feat(processo-header): lista hierárquica de processos vinculados com badges"
```

---

## Task 4: `processos.criarVinculado` + Dialog

**Files:**
- Modify: `src/lib/trpc/routers/processos.ts` (add mutation)
- Create: `src/components/processo/novo-processo-vinculado-dialog.tsx`
- Create: `src/components/processo/novo-processo-vinculado-button.tsx`

- [ ] **Step 4.1: Mutation tRPC**

```ts
criarVinculado: protectedProcedure
  .input(z.object({
    processoOrigemId: z.number(),
    numeroAutos: z.string().min(20).max(30),
    tipoProcesso: z.enum(["REVOGACAO","HC","RECURSO","MPU","IP","PEDIDO"]),
    classeProcessual: z.string().optional(),
    assunto: z.string().optional(),
    moverDemandaId: z.number().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    return await ctx.db.transaction(async (tx) => {
      const [origem] = await tx.select().from(processos)
        .where(eq(processos.id, input.processoOrigemId)).limit(1);
      if (!origem) throw new TRPCError({ code: "NOT_FOUND" });

      let casoId = origem.casoId;
      if (!casoId) {
        const [assistido] = await tx.select({ nome: assistidos.nome })
          .from(assistidos).where(eq(assistidos.id, origem.assistidoId)).limit(1);
        const [novo] = await tx.insert(casos).values({
          titulo: `${assistido.nome} — ${origem.area}`,
          atribuicao: mapAreaParaAtribuicao(origem.area),
          assistidoId: origem.assistidoId,
          defensorId: ctx.session.user.id,
          status: "ativo",
        }).returning({ id: casos.id });
        casoId = novo.id;
        await tx.update(processos).set({ casoId }).where(eq(processos.id, origem.id));
      }

      const [novoProc] = await tx.insert(processos).values({
        assistidoId: origem.assistidoId,
        numeroAutos: input.numeroAutos,
        comarca: origem.comarca,
        vara: origem.vara,
        area: origem.area,
        classeProcessual: input.classeProcessual,
        assunto: input.assunto,
        tipoProcesso: input.tipoProcesso,
        processoOrigemId: origem.id,
        casoId,
        defensorId: ctx.session.user.id,
        situacao: "ativo",
      }).returning();

      if (input.moverDemandaId) {
        await tx.update(demandas)
          .set({ processoId: novoProc.id, updatedAt: new Date() })
          .where(eq(demandas.id, input.moverDemandaId));
      }
      return novoProc;
    });
  }),
```

Helper `mapAreaParaAtribuicao` em `src/lib/processos/tipos.ts`:

```ts
export function mapAreaParaAtribuicao(area: string): string {
  const map: Record<string, string> = {
    VIOLENCIA_DOMESTICA: "VVD_CAMACARI",
    JURI: "JURI_CAMACARI",
    EXECUCAO_PENAL: "EXECUCAO_PENAL",
    CRIMINAL: "CRIMINAL_CAMACARI",
  };
  return map[area] ?? "SUBSTITUICAO";
}
```

- [ ] **Step 4.2: Dialog**

```tsx
// src/components/processo/novo-processo-vinculado-dialog.tsx
"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/trpc/react";
import { TIPOS_INCIDENTAIS, TIPOS_PROCESSO } from "@/lib/processos/tipos";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processoOrigemId: number;
  moverDemandaId?: number;
}
export function NovoProcessoVinculadoDialog({ open, onOpenChange, processoOrigemId, moverDemandaId }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [numeroAutos, setNumeroAutos] = useState("");
  const [tipo, setTipo] = useState<typeof TIPOS_INCIDENTAIS[number]>("REVOGACAO");
  const [assunto, setAssunto] = useState("");

  const create = api.processos.criarVinculado.useMutation({
    onSuccess: (novoProc) => {
      utils.processos.vinculados.invalidate();
      utils.processos.getById.invalidate();
      toast.success("Processo vinculado criado");
      onOpenChange(false);
      router.push(`/admin/processos/${novoProc.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{moverDemandaId ? "Mover para autos apartados" : "Novo processo vinculado"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Número dos autos</Label>
            <Input value={numeroAutos} onChange={e => setNumeroAutos(e.target.value)} placeholder="0000000-00.0000.0.00.0000" />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS_INCIDENTAIS.map(t => (
                  <SelectItem key={t} value={t}>{TIPOS_PROCESSO[t].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assunto (opcional)</Label>
            <Input value={assunto} onChange={e => setAssunto(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!numeroAutos || create.isPending}
            onClick={() => create.mutate({ processoOrigemId, numeroAutos, tipoProcesso: tipo, assunto: assunto || undefined, moverDemandaId })}
          >
            {create.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4.3: Botão**

```tsx
// src/components/processo/novo-processo-vinculado-button.tsx
"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NovoProcessoVinculadoDialog } from "./novo-processo-vinculado-dialog";

export function NovoProcessoVinculadoButton({ processoOrigemId }: { processoOrigemId: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="text-[11px] h-7 gap-1.5 text-white/50 hover:text-white/90">
        <Plus className="w-3 h-3" /> Novo vinculado
      </Button>
      <NovoProcessoVinculadoDialog open={open} onOpenChange={setOpen} processoOrigemId={processoOrigemId} />
    </>
  );
}
```

- [ ] **Step 4.4: Validar fluxo**

Browser:
- Abrir AP do João
- Clicar "Novo vinculado"
- Preencher número fictício, tipo "MPU"
- Confirma → redireciona para o processo novo, lista atualizada na AP

- [ ] **Step 4.5: Commit**

```bash
git commit -am "feat(processos): criar processo vinculado a partir do principal (dialog + mutation)"
```

---

## Task 5: "Mover para autos apartados" na demanda

**Files:**
- Modify: `src/components/demandas-premium/demandas-premium-view.tsx` (add menu item)

- [ ] **Step 5.1: Achar menu kebab da demanda**

```bash
grep -n "DropdownMenu\|MoreVertical\|kebab" src/components/demandas-premium/demandas-premium-view.tsx | head -10
```

- [ ] **Step 5.2: Adicionar item de menu**

No menu kebab da demanda, antes de "Excluir":

```tsx
<DropdownMenuItem onClick={() => setMoverDialogOpen(true)}>
  <FileSymlink className="w-3.5 h-3.5 mr-2" />
  Mover para autos apartados
</DropdownMenuItem>

{moverDialogOpen && (
  <NovoProcessoVinculadoDialog
    open={moverDialogOpen}
    onOpenChange={setMoverDialogOpen}
    processoOrigemId={demanda.processoId}
    moverDemandaId={demanda.id}
  />
)}
```

- [ ] **Step 5.3: Validar**

Browser:
- Abrir demanda existente
- Menu kebab → "Mover para autos apartados"
- Dialog abre com tipo `REVOGACAO` default
- Confirmar — demanda some da AP, aparece no novo processo, com timeline de registros íntegra

- [ ] **Step 5.4: Commit**

```bash
git commit -am "feat(demandas): mover demanda para autos apartados (cria processo vinculado)"
```

---

## Task 6: Aba "Processos" agrupada na ficha do assistido

**Files:**
- Modify: `src/app/(dashboard)/admin/assistidos/[id]/page.tsx` (ou componente da aba "Processos")
- Modify: `src/lib/trpc/routers/assistidos.ts` (procedure que lista processos pode precisar incluir `casoId`)

- [ ] **Step 6.1: Ver procedure atual**

```bash
grep -n "processos\|casoId" src/lib/trpc/routers/assistidos.ts | head -10
```

- [ ] **Step 6.2: Ajustar procedure para retornar `casoId` + `tipoProcesso`**

Garantir que o `select` da listagem de processos do assistido inclui esses campos.

- [ ] **Step 6.3: Renderizar agrupado**

```tsx
// src/components/assistido/aba-processos.tsx (ou inline)
const grupos = useMemo(() => {
  const porCaso: Record<string, typeof processos> = {};
  const orfaos: typeof processos = [];
  for (const p of processos) {
    if (p.casoId) {
      const k = String(p.casoId);
      (porCaso[k] = porCaso[k] || []).push(p);
    } else {
      orfaos.push(p);
    }
  }
  return { porCaso, orfaos };
}, [processos]);

return (
  <div className="space-y-4">
    {Object.entries(grupos.porCaso).map(([casoId, procs]) => {
      const principal = procs.find(p => p.processoOrigemId === null) ?? procs[0];
      return (
        <div key={casoId} className="rounded-lg border p-3 space-y-1">
          <h3 className="text-xs font-semibold text-muted-foreground">Caso #{casoId}</h3>
          <ProcessosVinculadosList processoId={principal.id} />
        </div>
      );
    })}
    {grupos.orfaos.length > 0 && (
      <div className="rounded-lg border border-dashed p-3 space-y-1">
        <h3 className="text-xs italic text-muted-foreground">Sem caso vinculado</h3>
        {grupos.orfaos.map(p => <ProcessoVinculadoRow key={p.id} proc={p} hierarchy="principal" />)}
      </div>
    )}
  </div>
);
```

- [ ] **Step 6.4: Validar**

Browser:
- Ficha do João Batista → aba "Processos"
- Caso 62 com AP no topo + Revogação indentada
- Outros assistidos com processos órfãos aparecem na seção "Sem caso vinculado"

- [ ] **Step 6.5: Commit**

```bash
git commit -am "feat(assistido): aba Processos agrupada por caso com hierarquia AP→incidentais"
```

---

## Task 7: Script de inferência de `tipoProcesso` (cleanup retroativo)

**Files:**
- Create: `scripts/inferir-tipo-processo.ts`

- [ ] **Step 7.1: Heurística**

```ts
// scripts/inferir-tipo-processo.ts
const REGRAS: { match: RegExp; tipo: string }[] = [
  { match: /medida.*protetiva|maria.*penha/i, tipo: "MPU" },
  { match: /habeas.*corpus/i, tipo: "HC" },
  { match: /revoga[çc][ãa]o.*pris[ãa]o/i, tipo: "REVOGACAO" },
  { match: /apela[çc][ãa]o|recurso.*estrito/i, tipo: "RECURSO" },
  { match: /inqu[ée]rito/i, tipo: "IP" },
  { match: /execu[çc][ãa]o.*penal/i, tipo: "EP" },
];

// Lê processos onde tipo_processo = 'AP' (default) mas classe sugere outro tipo
// Sugere atualização (dry-run primeiro). Aplicar com --apply.
```

- [ ] **Step 7.2: Rodar dry-run**

```bash
npx tsx scripts/inferir-tipo-processo.ts
```

Revisar saída com o usuário antes de `--apply`.

- [ ] **Step 7.3: Commit**

```bash
git add scripts/inferir-tipo-processo.ts
git commit -m "chore(scripts): inferir tipoProcesso a partir de classeProcessual (heurística)"
```

---

## Task 8: Atualizar skill `/peca-vvd` para criar processo vinculado quando peça é incidental

**Files:**
- Modify: `Skills - harmonizacao/vvd/SKILL.md` (Drive canônico)
- Sync para `.claude/skills-cowork/vvd/SKILL.md`

- [ ] **Step 8.1: Adicionar bloco "Após gerar a peça"**

Quando a peça gerada for revogação/HC/recurso/MPU, instruir o Claude a:
1. Abrir um diálogo confirmando se deseja criar processo vinculado
2. Após aprovação, chamar a mutation `processos.criarVinculado` com o número informado

- [ ] **Step 8.2: Documentar**

Adicionar exemplo no `SKILL.md` mostrando o fluxo de protocolo + cadastro automático.

- [ ] **Step 8.3: Commit**

```bash
git commit -am "docs(skills): peca-vvd cria processo vinculado para peças incidentais"
```

---

## Task 9: Final review + merge

- [ ] **Step 9.1: Diff completo**

```bash
git log --oneline origin/main..HEAD
git diff origin/main...HEAD --stat
```

- [ ] **Step 9.2: Smoke test end-to-end**

- AP do João: header mostra AP + Revogação como vinculados
- Criar novo vinculado tipo HC
- Mover demanda existente para autos apartados
- Ficha do assistido: aba Processos agrupada
- Script de inferência: dry-run sem erros

- [ ] **Step 9.3: Type-check + tests + build**

```bash
pnpm tsc --noEmit
pnpm vitest run
pnpm build
```

- [ ] **Step 9.4: Push branch + merge para main**

```bash
git push -u origin feat/processos-vinculados
# Workflow Defender: merge direto via @devops, push.
```

---

## Self-Review

**Spec coverage:**
- ✅ Distinguir tipo no card (Task 1+3)
- ✅ Botão "Novo vinculado" no header (Task 4)
- ✅ Atalho na demanda "Mover para autos apartados" (Task 5)
- ✅ Aba "Processos" agrupada (Task 6)
- ✅ tRPC `vinculados` + `criarVinculado` (Tasks 2+4)
- ✅ Script de inferência (Task 7)
- ✅ Skill atualizada (Task 8)

**Type consistency:**
- `TIPOS_PROCESSO` é fonte única (TS + Zod enum derivam dela)
- `tipoProcesso: string | null` consistente do banco até a UI (badge faz fallback)

**Risk reminders:**
- `tipoProcesso` permanece `varchar(30)` — typo controlado por Zod no `criarVinculado`. Se virar problema, criar enum PostgreSQL em task posterior.
- `casoId` órfão (processo sem caso) cobre cenário legado — mostrado em seção separada na ficha
- Mutation cria caso automaticamente se não existir — idempotente com a primeira chamada

**Placeholders scan:** Sem TBD/TODO.
