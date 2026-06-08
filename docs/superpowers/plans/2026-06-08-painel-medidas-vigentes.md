# Painel de medidas vigentes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expor e gerenciar as medidas protetivas estruturadas (`medidas_mpu`) num componente reutilizável consumido por três superfícies (aba MPU do caso, página global VVD, painel da agenda).

**Architecture:** Núcleo = rótulos PT-BR na taxonomia + 3 procedures tRPC (`listMedidas`/`setStatusMedida`/`addMedidaManual`) + componente apresentacional `MedidaMpuCard` e contêiner `MedidasVigentesPanel`. Os três consumidores são finos: aba do caso e página global em modo gestão, agenda read-only.

**Tech Stack:** TypeScript, tRPC v11, Drizzle (Postgres), React/Next, Tailwind + shadcn/ui, Vitest (env **node**). Repo `/Users/rodrigorochameire/Projetos/Defender`, branch `feat/painel-medidas-vigentes`.

**Spec:** `docs/superpowers/specs/2026-06-08-painel-medidas-vigentes-design.md`

**Nota de escopo:** `listMedidas` cobre `processoId` (core) e `processoVvdId`; `assistidoId` foi adiado (nenhum consumidor o usa). Testes miram helpers puros (env node, sem jsdom); procedures de banco verificam-se por typecheck + smoke (mesmo padrão do orquestrador do parser).

---

## File Structure

- Modify `src/lib/mpu/medidas-taxonomia.ts` — add `STATUS_MEDIDA`, `STATUS_MEDIDA_LABEL`, `rotuloMedida`.
- Modify `src/lib/mpu/__tests__/` — new `taxonomia-rotulos.test.ts`.
- Modify `src/lib/trpc/routers/mpu.ts` — add `listMedidas`, `setStatusMedida`, `addMedidaManual`.
- Create `src/components/mpu/medida-mpu-card.tsx` — one-measure card + pure helper `chipsDaMedida`.
- Create `src/components/mpu/__tests__/medida-mpu-card.test.ts` — test the pure helper.
- Create `src/components/mpu/medidas-vigentes-panel.tsx` — list + actions container.
- Modify `src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/_components/tab-mpu.tsx` — embed panel.
- Modify `src/app/(dashboard)/admin/vvd/medidas/page.tsx` — add structured section in detail panel.
- Modify `src/components/agenda/event-detail-sheet.tsx` — read-only panel near DossieV2Block.

---

## Task 1: Rótulos e status na taxonomia

**Files:**
- Modify: `src/lib/mpu/medidas-taxonomia.ts`
- Test: `src/lib/mpu/__tests__/taxonomia-rotulos.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/mpu/__tests__/taxonomia-rotulos.test.ts
import { describe, it, expect } from "vitest";
import {
  STATUS_MEDIDA,
  STATUS_MEDIDA_LABEL,
  rotuloMedida,
} from "../medidas-taxonomia";

describe("rótulos da taxonomia MPU", () => {
  it("rotuloMedida devolve o rótulo legal de um código conhecido", () => {
    expect(rotuloMedida("PROIBICAO_APROXIMACAO")).toBe("Proibição de aproximação");
    expect(rotuloMedida("AFASTAMENTO_LAR")).toBe("Afastamento do lar");
  });

  it("rotuloMedida devolve o próprio código quando desconhecido", () => {
    expect(rotuloMedida("XPTO")).toBe("XPTO");
  });

  it("STATUS_MEDIDA_LABEL cobre todos os status (inclui suspensa, sem prorrogada)", () => {
    const valores = Object.values(STATUS_MEDIDA);
    expect(valores.sort()).toEqual(
      ["ativa", "cumprida", "descumprida", "revogada", "suspensa"].sort(),
    );
    for (const s of valores) {
      expect(typeof STATUS_MEDIDA_LABEL[s]).toBe("string");
      expect(STATUS_MEDIDA_LABEL[s].length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run — fails (exports não existem)**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/lib/mpu/__tests__/taxonomia-rotulos.test.ts`
Expected: FAIL (`STATUS_MEDIDA` / `rotuloMedida` is not exported).

- [ ] **Step 3: Implement — append to `src/lib/mpu/medidas-taxonomia.ts`**

```ts
export const STATUS_MEDIDA = {
  ATIVA: "ativa",
  CUMPRIDA: "cumprida",
  DESCUMPRIDA: "descumprida",
  REVOGADA: "revogada",
  SUSPENSA: "suspensa",
} as const;

export type StatusMedida = (typeof STATUS_MEDIDA)[keyof typeof STATUS_MEDIDA];

export const STATUS_MEDIDA_LABEL: Record<StatusMedida, string> = {
  ativa: "Ativa",
  cumprida: "Cumprida",
  descumprida: "Descumprida",
  revogada: "Revogada",
  suspensa: "Suspensa",
};

/** Rótulo legal (do catálogo) para um código de medida; fallback = o próprio código. */
export function rotuloMedida(codigo: string): string {
  const cat = CATALOGO_MEDIDAS.find((c) => c.codigo === codigo);
  return cat ? cat.rotulo : codigo;
}
```

- [ ] **Step 4: Run — passes**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/lib/mpu/__tests__/taxonomia-rotulos.test.ts`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/mpu/medidas-taxonomia.ts src/lib/mpu/__tests__/taxonomia-rotulos.test.ts
git commit -m "feat(mpu): status e rótulos PT-BR na taxonomia"
```

---

## Task 2: Procedure `listMedidas`

**Files:**
- Modify: `src/lib/trpc/routers/mpu.ts`

- [ ] **Step 1: Implement — substituir o conteúdo de `src/lib/trpc/routers/mpu.ts`**

```ts
import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { processos } from "@/lib/db/schema/core";
import { processosVVD, medidasMPU } from "@/lib/db/schema/vvd";
import { parseDecisaoMPU } from "@/lib/mpu/parse-decisao";
import { MEDIDA_MPU, STATUS_MEDIDA } from "@/lib/mpu/medidas-taxonomia";

const MEDIDA_CODIGOS = Object.values(MEDIDA_MPU) as [string, ...string[]];
const STATUS_VALUES = Object.values(STATUS_MEDIDA) as [string, ...string[]];

/** Resolve o id de processo_vvd a partir de um processoId core (via CNJ) ou direto. */
async function resolverProcessoVvdId(input: {
  processoId?: number;
  processoVvdId?: number;
}): Promise<number | null> {
  if (input.processoVvdId) return input.processoVvdId;
  if (!input.processoId) return null;
  const [proc] = await db
    .select({ numero: processos.numeroAutos })
    .from(processos)
    .where(eq(processos.id, input.processoId))
    .limit(1);
  if (!proc?.numero) return null;
  const [pvvd] = await db
    .select({ id: processosVVD.id })
    .from(processosVVD)
    .where(eq(processosVVD.numeroAutos, proc.numero))
    .limit(1);
  return pvvd?.id ?? null;
}

export const mpuRouter = router({
  // Dry-run: extrai as medidas do texto SEM persistir. Usado no preview do editor.
  previewMedidas: protectedProcedure
    .input(z.object({ texto: z.string().min(1).max(20000) }))
    .query(({ input }) => parseDecisaoMPU(input.texto)),

  // Lista as medidas estruturadas de um processo (por processoId core ou processoVvdId).
  listMedidas: protectedProcedure
    .input(
      z.object({
        processoId: z.number().optional(),
        processoVvdId: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      const processoVvdId = await resolverProcessoVvdId(input);
      if (!processoVvdId) {
        return { processoVvdId: null, numeroAutos: null, mpu: null, medidas: [] };
      }
      const [pvvd] = await db
        .select({
          numeroAutos: processosVVD.numeroAutos,
          mpuAtiva: processosVVD.mpuAtiva,
          dataDecisaoMPU: processosVVD.dataDecisaoMPU,
          dataVencimentoMPU: processosVVD.dataVencimentoMPU,
          distanciaMinima: processosVVD.distanciaMinima,
        })
        .from(processosVVD)
        .where(eq(processosVVD.id, processoVvdId))
        .limit(1);
      const medidas = await db
        .select()
        .from(medidasMPU)
        .where(eq(medidasMPU.processoVvdId, processoVvdId))
        .orderBy(asc(medidasMPU.id));
      return {
        processoVvdId,
        numeroAutos: pvvd?.numeroAutos ?? null,
        mpu: pvvd
          ? {
              ativa: pvvd.mpuAtiva,
              dataDecisao: pvvd.dataDecisaoMPU,
              dataVencimento: pvvd.dataVencimentoMPU,
              distanciaMinima: pvvd.distanciaMinima,
            }
          : null,
        medidas,
      };
    }),

  // Muda o status de uma medida; marca origem='manual' (blinda da reimportação).
  setStatusMedida: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(STATUS_VALUES) }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(medidasMPU)
        .set({ status: input.status, origem: "manual", updatedAt: new Date() })
        .where(eq(medidasMPU.id, input.id))
        .returning();
      return row ?? null;
    }),

  // Adiciona uma medida manualmente (origem='manual').
  addMedidaManual: protectedProcedure
    .input(
      z.object({
        processoVvdId: z.number(),
        codigo: z.enum(MEDIDA_CODIGOS),
        artigo: z.string().max(20).optional(),
        distanciaMetros: z.number().int().positive().optional(),
        parametros: z
          .object({
            protegidos: z.array(z.string()).optional(),
            meios: z.array(z.string()).optional(),
            lugares: z.array(z.string()).optional(),
            valor: z.string().optional(),
          })
          .optional(),
        dataDecisao: z.string().optional(),
        dataVencimento: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [row] = await db
        .insert(medidasMPU)
        .values({
          processoVvdId: input.processoVvdId,
          codigo: input.codigo,
          artigo: input.artigo ?? null,
          distanciaMetros: input.distanciaMetros ?? null,
          parametros: input.parametros ?? null,
          literal: null,
          dataDecisao: input.dataDecisao ?? null,
          dataVencimento: input.dataVencimento ?? null,
          status: "ativa",
          origem: "manual",
        })
        .returning();
      return row;
    }),
});
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep "routers/mpu.ts" || echo "OK"`
Expected: `OK`. (Ignore os 3 erros pré-existentes em `routers/vvd.ts` linhas 618/996/1135.)

- [ ] **Step 3: Smoke — listMedidas devolve linhas de um processo com medidas**

Use um processo_vvd que já tenha medidas (ou gere via Ciência de MPU). Confirme contagem:

Run: `psql "$DATABASE_URL" -c "SELECT m.processo_vvd_id, count(*) FROM medidas_mpu m GROUP BY 1 ORDER BY 2 DESC LIMIT 3;"`
Expected: pelo menos uma linha com count>0 (use esse `processo_vvd_id` no smoke da UI mais tarde). Se vazio, gere medidas salvando uma Ciência de MPU com o texto da decisão Cacia num processo MPU.

- [ ] **Step 4: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/lib/trpc/routers/mpu.ts
git commit -m "feat(mpu): listMedidas/setStatusMedida/addMedidaManual no router"
```

---

## Task 3: Card de uma medida + helper puro

**Files:**
- Create: `src/components/mpu/medida-mpu-card.tsx`
- Test: `src/components/mpu/__tests__/medida-mpu-card.test.ts`

- [ ] **Step 1: Write the failing test (helper puro, env node)**

```ts
// src/components/mpu/__tests__/medida-mpu-card.test.ts
import { describe, it, expect } from "vitest";
import { chipsDaMedida } from "../medida-mpu-card";

describe("chipsDaMedida", () => {
  it("monta chips de protegidos, meios e lugares com rótulos legíveis", () => {
    const chips = chipsDaMedida({
      protegidos: ["ofendida", "familiares"],
      meios: ["telefone", "redes_sociais"],
      lugares: ["trabalho_vitima"],
      valor: undefined,
    });
    expect(chips).toContain("Ofendida");
    expect(chips).toContain("Familiares");
    expect(chips).toContain("Telefone");
    expect(chips).toContain("Redes sociais");
    expect(chips).toContain("Trabalho da vítima");
  });

  it("devolve lista vazia quando não há parâmetros", () => {
    expect(chipsDaMedida(null)).toEqual([]);
    expect(chipsDaMedida({})).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — fails (módulo não existe)**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/components/mpu/__tests__/medida-mpu-card.test.ts`
Expected: FAIL (`Cannot find module '../medida-mpu-card'`).

- [ ] **Step 3: Implement `src/components/mpu/medida-mpu-card.tsx`**

```tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { rotuloMedida, STATUS_MEDIDA_LABEL, type StatusMedida } from "@/lib/mpu/medidas-taxonomia";
import type { MedidaMPURow } from "@/lib/db/schema/vvd";

const PROTEGIDO_LABEL: Record<string, string> = {
  ofendida: "Ofendida",
  familiares: "Familiares",
  testemunhas: "Testemunhas",
};
const MEIO_LABEL: Record<string, string> = {
  telefone: "Telefone",
  email: "E-mail",
  redes_sociais: "Redes sociais",
  mensagens: "Mensagens",
  interposta_pessoa: "Interposta pessoa",
};
const LUGAR_LABEL: Record<string, string> = {
  residencia_vitima: "Residência da vítima",
  trabalho_vitima: "Trabalho da vítima",
  outro: "Outro",
};

type Parametros = MedidaMPURow["parametros"];

/** Helper puro: traduz os parâmetros estruturados em chips legíveis. */
export function chipsDaMedida(parametros: Parametros): string[] {
  if (!parametros) return [];
  const chips: string[] = [];
  for (const p of parametros.protegidos ?? []) chips.push(PROTEGIDO_LABEL[p] ?? p);
  for (const m of parametros.meios ?? []) chips.push(MEIO_LABEL[m] ?? m);
  for (const l of parametros.lugares ?? []) chips.push(LUGAR_LABEL[l] ?? l);
  if (parametros.valor) chips.push(parametros.valor);
  return chips;
}

const STATUS_CLASS: Record<StatusMedida, string> = {
  ativa: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  suspensa: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  cumprida: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  descumprida: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  revogada: "bg-neutral-100 text-neutral-500 line-through dark:bg-neutral-800",
};

export function MedidaMpuCard({
  medida,
  actions,
}: {
  medida: MedidaMPURow;
  actions?: React.ReactNode;
}) {
  const status = (medida.status ?? "ativa") as StatusMedida;
  const chips = chipsDaMedida(medida.parametros);
  return (
    <div className="rounded-lg border border-amber-200/60 bg-amber-50/30 p-3 dark:border-amber-900/40 dark:bg-amber-950/10">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            {rotuloMedida(medida.codigo)}
          </p>
          {medida.artigo && (
            <p className="text-[11px] text-neutral-500">art. {medida.artigo}</p>
          )}
        </div>
        <Badge className={cn("shrink-0", STATUS_CLASS[status])}>
          {STATUS_MEDIDA_LABEL[status]}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {typeof medida.distanciaMetros === "number" && (
          <span className="rounded bg-amber-200/50 px-1.5 py-0.5 text-[11px] text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
            {medida.distanciaMetros} m
          </span>
        )}
        {chips.map((c, i) => (
          <span
            key={`${i}-${c}`}
            className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
          >
            {c}
          </span>
        ))}
      </div>
      {medida.dataVencimento && (
        <p className="mt-1 text-[11px] text-neutral-500">
          Vence em {medida.dataVencimento}
        </p>
      )}
      {actions && <div className="mt-2">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Run — passes**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/components/mpu/__tests__/medida-mpu-card.test.ts`
Expected: PASS (2).

- [ ] **Step 5: Typecheck + commit**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep "medida-mpu-card" || echo "OK"` → `OK`.

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/mpu/medida-mpu-card.tsx src/components/mpu/__tests__/medida-mpu-card.test.ts
git commit -m "feat(mpu): MedidaMpuCard + helper chipsDaMedida"
```

---

## Task 4: Contêiner `MedidasVigentesPanel`

**Files:**
- Create: `src/components/mpu/medidas-vigentes-panel.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Loader2, Plus, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MedidaMpuCard } from "./medida-mpu-card";
import {
  MEDIDA_MPU,
  STATUS_MEDIDA,
  STATUS_MEDIDA_LABEL,
  rotuloMedida,
  type StatusMedida,
} from "@/lib/mpu/medidas-taxonomia";

type Props =
  | { processoId: number; processoVvdId?: undefined; readOnly?: boolean }
  | { processoVvdId: number; processoId?: undefined; readOnly?: boolean };

export function MedidasVigentesPanel(props: Props) {
  const readOnly = props.readOnly ?? false;
  const queryInput =
    "processoVvdId" in props && props.processoVvdId != null
      ? { processoVvdId: props.processoVvdId }
      : { processoId: (props as { processoId: number }).processoId };

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.mpu.listMedidas.useQuery(queryInput);

  const setStatus = trpc.mpu.setStatusMedida.useMutation({
    onSuccess: () => {
      utils.mpu.listMedidas.invalidate();
      toast.success("Status atualizado");
    },
    onError: (e) => toast.error(e.message),
  });
  const addManual = trpc.mpu.addMedidaManual.useMutation({
    onSuccess: () => {
      utils.mpu.listMedidas.invalidate();
      toast.success("Medida adicionada");
      setAddOpen(false);
      setNovoCodigo("");
      setNovaDistancia("");
    },
    onError: (e) => toast.error(e.message),
  });

  const [addOpen, setAddOpen] = useState(false);
  const [novoCodigo, setNovoCodigo] = useState<string>("");
  const [novaDistancia, setNovaDistancia] = useState<string>("");

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando medidas…
      </div>
    );
  }

  const medidas = data?.medidas ?? [];

  if (medidas.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700">
        <Scale className="mx-auto mb-1 h-5 w-5 opacity-50" />
        Nenhuma medida estruturada. Gere pela Ciência de MPU ou adicione manualmente.
        {!readOnly && data?.processoVvdId && (
          <div className="mt-2">
            <AddButton onClick={() => setAddOpen(true)} />
          </div>
        )}
        {!readOnly && (
          <AddDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            codigo={novoCodigo}
            setCodigo={setNovoCodigo}
            distancia={novaDistancia}
            setDistancia={setNovaDistancia}
            pending={addManual.isPending}
            onSubmit={() =>
              data?.processoVvdId &&
              novoCodigo &&
              addManual.mutate({
                processoVvdId: data.processoVvdId,
                codigo: novoCodigo as keyof typeof MEDIDA_MPU,
                distanciaMetros: novaDistancia ? Number(novaDistancia) : undefined,
              })
            }
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {medidas.map((m) => (
          <MedidaMpuCard
            key={m.id}
            medida={m}
            actions={
              readOnly ? undefined : (
                <Select
                  value={m.status ?? "ativa"}
                  onValueChange={(status) => setStatus.mutate({ id: m.id, status })}
                >
                  <SelectTrigger className="h-7 w-40 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(STATUS_MEDIDA).map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {STATUS_MEDIDA_LABEL[s as StatusMedida]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            }
          />
        ))}
      </div>
      {!readOnly && data?.processoVvdId && (
        <>
          <AddButton onClick={() => setAddOpen(true)} />
          <AddDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            codigo={novoCodigo}
            setCodigo={setNovoCodigo}
            distancia={novaDistancia}
            setDistancia={setNovaDistancia}
            pending={addManual.isPending}
            onSubmit={() =>
              novoCodigo &&
              addManual.mutate({
                processoVvdId: data.processoVvdId!,
                codigo: novoCodigo as keyof typeof MEDIDA_MPU,
                distanciaMetros: novaDistancia ? Number(novaDistancia) : undefined,
              })
            }
          />
        </>
      )}
    </div>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={onClick}>
      <Plus className="h-3.5 w-3.5" /> Adicionar medida
    </Button>
  );
}

function AddDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  codigo: string;
  setCodigo: (v: string) => void;
  distancia: string;
  setDistancia: (v: string) => void;
  pending: boolean;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-sm space-y-3">
        <h3 className="text-sm font-semibold">Adicionar medida manual</h3>
        <div className="space-y-1">
          <Label className="text-xs">Medida</Label>
          <Select value={props.codigo} onValueChange={props.setCodigo}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Selecione…" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(MEDIDA_MPU).map((c) => (
                <SelectItem key={c} value={c} className="text-sm">
                  {rotuloMedida(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Distância (m) — opcional</Label>
          <Input
            type="number"
            value={props.distancia}
            onChange={(e) => props.setDistancia(e.target.value)}
            placeholder="ex.: 300"
          />
        </div>
        <Button
          size="sm"
          disabled={!props.codigo || props.pending}
          onClick={props.onSubmit}
          className="w-full"
        >
          {props.pending ? "Salvando…" : "Adicionar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep "medidas-vigentes-panel" || echo "OK"`
Expected: `OK`. Corrija erros de tipo (ex.: o union de props, o cast de `status`/`codigo`) até limpar. Se o `onValueChange={(status) => setStatus.mutate({ id, status })}` reclamar do tipo de `status`, faça `status as StatusMedida` no cast do mutate input (o router valida em runtime).

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/mpu/medidas-vigentes-panel.tsx
git commit -m "feat(mpu): MedidasVigentesPanel (lista + status + adicionar manual)"
```

---

## Task 5: Consumidor — aba MPU do caso

**Files:**
- Modify: `src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/_components/tab-mpu.tsx`

- [ ] **Step 1: Substituir o corpo do componente para embutir o painel**

Mantém a resolução do `procRef` existente (via `trpc.processos.listByCaso`) e troca o bloco de aviso/link por `<MedidasVigentesPanel processoId={procRef.id} />`, preservando o link "vista técnica" como ação secundária:

```tsx
"use client";

import { trpc } from "@/lib/trpc/client";
import { MedidasVigentesPanel } from "@/components/mpu/medidas-vigentes-panel";

interface Props { casoId: number; }

export function TabMpu({ casoId }: Props) {
  const { data: procs = [], isLoading } = trpc.processos.listByCaso.useQuery({ casoId });
  if (isLoading) return <p className="p-4 italic text-neutral-400">Carregando…</p>;
  const list = procs as any[];
  const procRef = list.find((p) => p.isReferencia) ?? list[0];
  if (!procRef) {
    return <p className="p-4 italic text-neutral-400">Nenhum processo no caso.</p>;
  }
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Medidas protetivas (MPU)</h3>
        <a
          href={`/admin/processos/${procRef.id}?raw=1`}
          className="text-xs text-neutral-500 underline-offset-2 hover:underline"
        >
          Vista técnica →
        </a>
      </div>
      <MedidasVigentesPanel processoId={procRef.id} />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep "tab-mpu" || echo "OK"`
Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add "src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/_components/tab-mpu.tsx"
git commit -m "feat(mpu): aba MPU do caso exibe e gerencia medidas vigentes"
```

---

## Task 6: Consumidor — página global VVD

**Files:**
- Modify: `src/app/(dashboard)/admin/vvd/medidas/page.tsx`

- [ ] **Step 1: Importar o painel**

No topo do arquivo, junto aos demais imports de componentes:

```ts
import { MedidasVigentesPanel } from "@/components/mpu/medidas-vigentes-panel";
```

- [ ] **Step 2: Inserir a seção estruturada no painel de detalhe**

Localize, no bloco que renderiza `processoDetalhes` (a partir da linha ~570, onde mostra `mpuAtiva`, `distanciaMinima` e `dataVencimentoMPU`), o ponto logo APÓS o resumo MPU e ANTES (ou depois) do histórico (`processoDetalhes.historico`). Insira:

```tsx
              <div className="mt-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Medidas estruturadas
                </h4>
                <MedidasVigentesPanel processoVvdId={selectedProcesso.id} />
              </div>
```

Use `selectedProcesso.id` (já existe no escopo — é o id de `processos_vvd`). Confirme com `grep -n "selectedProcesso" src/app/(dashboard)/admin/vvd/medidas/page.tsx` que o id está acessível nesse ponto do JSX.

- [ ] **Step 3: Typecheck**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep "vvd/medidas/page" || echo "OK"`
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add "src/app/(dashboard)/admin/vvd/medidas/page.tsx"
git commit -m "feat(mpu): seção de medidas estruturadas na página global VVD"
```

---

## Task 7: Consumidor — painel da agenda (read-only)

**Files:**
- Modify: `src/components/agenda/event-detail-sheet.tsx`

- [ ] **Step 1: Importar o painel**

No topo (junto a `import { DossieV2Block } from "./sheet/dossie-v2-block";`):

```ts
import { MedidasVigentesPanel } from "@/components/mpu/medidas-vigentes-panel";
```

- [ ] **Step 2: Renderizar read-only perto do DossieV2Block**

Localize a linha que renderiza `<DossieV2Block dossie={dossieV2} />` (~515). Logo após ela, dentro do mesmo container, insira um bloco condicionado a `processoId` numérico:

```tsx
                {typeof processoId === "number" && (
                  <div className="mt-3">
                    <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                      Medidas protetivas vigentes
                    </h4>
                    <MedidasVigentesPanel processoId={processoId} readOnly />
                  </div>
                )}
```

- [ ] **Step 3: Typecheck**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep "event-detail-sheet" || echo "OK"`
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/agenda/event-detail-sheet.tsx
git commit -m "feat(mpu): resumo read-only de medidas vigentes na agenda"
```

---

## Task 8: Verificação ponta a ponta

**Files:** nenhum (verificação).

- [ ] **Step 1: Suíte completa**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx vitest run src/lib/mpu/ src/components/mpu/`
Expected: PASS (todos — taxonomia-rotulos + medida-mpu-card + os do parser).

- [ ] **Step 2: Typecheck global (sem erros novos)**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep -E "src/components/mpu|routers/mpu|tab-mpu|vvd/medidas/page|event-detail-sheet" || echo "OK: nenhum erro novo da feature"`
Expected: `OK: nenhum erro novo da feature`. (Os 3 erros pré-existentes em `routers/vvd.ts` 618/996/1135 permanecem e não contam.)

- [ ] **Step 3: Smoke de UI (com dev server + browser)**

Suba o dev server e confira, num processo MPU com medidas (use o `processo_vvd_id` do smoke da Task 2):
1. Caso → aba MPU: cards aparecem; mudar status mostra toast e persiste (reabrir confirma); "Adicionar medida" insere uma linha `origem='manual'`.
2. `admin/vvd/medidas` → selecionar o processo: seção "Medidas estruturadas" aparece com os cards.
3. Agenda → abrir evento do processo: "Medidas protetivas vigentes" aparece read-only (sem dropdown/sem botão adicionar).

Confirme via banco que o status manual marcou origem:
Run: `psql "$DATABASE_URL" -c "SELECT id, codigo, status, origem FROM medidas_mpu ORDER BY updated_at DESC LIMIT 5;"`
Expected: a linha cujo status você mudou tem `origem='manual'`.

---

## Self-review notes

- **CI:** GH Actions falha por `pnpm-lock` ausente; check real é o Vercel preview (memória `ci_main_pnpm_bug`).
- **Dialog:** `AddDialog` usa só `Dialog`/`DialogContent` de `@/components/ui/dialog` (shadcn) — sem `DialogHeader`/`DialogTitle` por simplicidade (o título é um `<h3>` interno).
- **Entrega:** ao final, `superpowers:finishing-a-development-branch` → merge para main (o usuário pediu merge em main ao concluir).
