# Eventos de Audiência (anotações / Concluir / manual) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar de forma estruturada audiências não realizadas (redesignada/suspensa, com ou sem nova data, com motivo), via parser de anotações rápidas com confirmação, via fluxo Concluir e via ajuste manual; flag "aguardando nova data" com resolução automática quando a nova designação chega.

**Architecture:** Três colunas novas em `audiencias` (`motivo_nao_realizacao`, `motivo_detalhe`, `aguardando_nova_data`); parser determinístico novo `parse-anotacao-audiencia.ts` (padrão do `detectar-designacao-audiencia`, gate de polaridade); mutation única `aplicarEventoAudiencia` que delega a `aplicarDesignacaoAudiencia` quando há nova data; resolução da flag dentro de `aplicarDesignacaoAudiencia`; UI: banner de detecção nas anotações rápidas, branch "não realizada" no ConcluirDialog, badge âmbar.

**Tech Stack:** Next.js + tRPC + Drizzle (Postgres/Supabase), vitest, shadcn/ui. Worktree: `/tmp/wt-eventos-audiencia`, branch `feat/eventos-audiencia-anotacoes`. Spec: `docs/superpowers/specs/2026-06-11-eventos-audiencia-anotacoes-design.md`.

**Atenção:** dois schemas espelhados (`drizzle/schema.ts` E `src/lib/db/schema/agenda.ts`) — toda mudança de coluna vai nos dois. Status sempre minúsculo. Testes: `npx vitest run <arquivo>`.

---

### Task 1: Colunas novas no schema + migração

**Files:**
- Modify: `src/lib/db/schema/agenda.ts` (tabela `audiencias`, após `gerarPrazoApos`)
- Modify: `drizzle/schema.ts` (tabela `audiencias`, após `gerarPrazoApos` linha ~378)
- Create: `drizzle/0051_audiencia_evento_nao_realizacao.sql`

- [ ] **Step 1: Adicionar colunas nos DOIS schemas** (mesmo trecho nos dois arquivos):

```ts
  // Evento de não realização (redesignação/suspensão) — spec 2026-06-11
  motivoNaoRealizacao: varchar("motivo_nao_realizacao", { length: 40 }),
  motivoDetalhe: text("motivo_detalhe"),
  aguardandoNovaData: boolean("aguardando_nova_data").default(false).notNull(),
```

- [ ] **Step 2: Criar a migração SQL** `drizzle/0051_audiencia_evento_nao_realizacao.sql`:

```sql
ALTER TABLE "audiencias" ADD COLUMN IF NOT EXISTS "motivo_nao_realizacao" varchar(40);
ALTER TABLE "audiencias" ADD COLUMN IF NOT EXISTS "motivo_detalhe" text;
ALTER TABLE "audiencias" ADD COLUMN IF NOT EXISTS "aguardando_nova_data" boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "audiencias_aguardando_nova_data_idx" ON "audiencias" ("aguardando_nova_data") WHERE "aguardando_nova_data";
```

- [ ] **Step 3: Typecheck**: `npx tsc --noEmit` → sem erros novos.
- [ ] **Step 4: Commit**: `git add -A && git commit -m "feat(schema): colunas de evento de não realização em audiencias"`

> A migração será aplicada no Supabase junto com o merge (fluxo usual do repo: SQL em drizzle/ aplicado manualmente/MCP). NÃO rodar `db:push`.

### Task 2: Parser `parseAnotacaoAudiencia` (TDD)

**Files:**
- Create: `src/lib/agenda/parse-anotacao-audiencia.ts`
- Test: `src/lib/agenda/__tests__/parse-anotacao-audiencia.test.ts` (criar pasta `__tests__` se faltar)

- [ ] **Step 1: Teste falhando** com os casos:

```ts
import { describe, it, expect } from "vitest";
import { parseAnotacaoAudiencia } from "../parse-anotacao-audiencia";

describe("parseAnotacaoAudiencia", () => {
  it("detecta redesignação por ausência da vítima, sem nova data (caso real 11/06)", () => {
    const r = parseAnotacaoAudiencia("Audiência redesignada, por ausência da suposta vítima, apesar de intimada.");
    expect(r).toMatchObject({ evento: "redesignada", motivo: "ausencia_vitima", novaData: null });
  });
  it("detecta suspensão pelo juízo (pauta_juizo)", () => {
    const r = parseAnotacaoAudiencia("Audiência suspensa pelo juízo; cartório designará nova data.");
    expect(r).toMatchObject({ evento: "suspensa", motivo: "pauta_juizo", novaData: null });
  });
  it("detecta redesignação COM nova data e hora", () => {
    const r = parseAnotacaoAudiencia("Audiência adiada para 22/07/2026 às 14h30 por ausência de testemunha.");
    expect(r).toMatchObject({ evento: "adiada", motivo: "ausencia_testemunha", novaData: "2026-07-22", novaHora: "14:30" });
  });
  it("réu não conduzido", () => {
    const r = parseAnotacaoAudiencia("Cancelada: réu preso não foi conduzido (sem escolta).");
    expect(r).toMatchObject({ evento: "cancelada", motivo: "reu_nao_conduzido" });
  });
  it("problema técnico de videoconferência", () => {
    const r = parseAnotacaoAudiencia("Audiência não foi realizada por falha na videoconferência.");
    expect(r).toMatchObject({ motivo: "problema_tecnico" });
  });
  it("evento sem motivo do catálogo cai em outro", () => {
    const r = parseAnotacaoAudiencia("Audiência redesignada por motivo de força maior.");
    expect(r).toMatchObject({ evento: "redesignada", motivo: "outro" });
  });
  it("polaridade: audiência realizada NÃO dispara", () => {
    expect(parseAnotacaoAudiencia("Audiência realizada, vítima ouvida em juízo.")).toBeNull();
    expect(parseAnotacaoAudiencia("Audiência mantida para a data designada.")).toBeNull();
  });
  it("anotação não relacionada retorna null", () => {
    expect(parseAnotacaoAudiencia("Assistido pediu cópia da denúncia.")).toBeNull();
    expect(parseAnotacaoAudiencia("Conversar com a genitora antes da instrução.")).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**: `npx vitest run src/lib/agenda/__tests__/parse-anotacao-audiencia.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 3: Implementação**:

```ts
/**
 * Parser determinístico de anotações rápidas: detecta evento de NÃO realização
 * de audiência (redesignada/suspensa/adiada/cancelada), motivo pelo catálogo e
 * nova data/hora quando presentes. Padrão do parseDecisaoMPU: catálogo de
 * regex + gate de polaridade — na dúvida retorna null (falso negativo seguro).
 * Nunca aplica nada: quem aplica é audiencias.aplicarEventoAudiencia, após
 * confirmação do usuário.
 */
import { parseAudienciaFromText } from "@/lib/audiencia-parser";

export type EventoAudiencia = "redesignada" | "suspensa" | "adiada" | "cancelada";
export type MotivoNaoRealizacao =
  | "ausencia_vitima" | "ausencia_testemunha" | "ausencia_reu"
  | "reu_nao_conduzido" | "pauta_juizo" | "problema_tecnico" | "outro";

export interface AnotacaoAudienciaParsed {
  evento: EventoAudiencia;
  motivo: MotivoNaoRealizacao;
  motivoDetalhe: string;
  novaData: string | null; // YYYY-MM-DD
  novaHora: string | null; // HH:MM
}

const EVENTOS: Array<{ needle: RegExp; evento: EventoAudiencia }> = [
  { needle: /redesignad/i, evento: "redesignada" },
  { needle: /suspens[aã]o|suspensa/i, evento: "suspensa" },
  { needle: /adiad/i, evento: "adiada" },
  { needle: /cancelad|n[aã]o\s+(?:foi\s+)?realizad|n[aã]o\s+se\s+realizou/i, evento: "cancelada" },
];

// Termos que afirmam realização/manutenção — se presentes SEM termo de evento,
// a anotação não é um evento de não realização.
const POLARIDADE_POSITIVA = /\b(realizada|mantida|confirmada|ocorreu)\b/i;

const MOTIVOS: Array<{ needle: RegExp; motivo: MotivoNaoRealizacao }> = [
  { needle: /v[ií]tima/i, motivo: "ausencia_vitima" },
  { needle: /testemunha/i, motivo: "ausencia_testemunha" },
  { needle: /(?:r[ée]u|acusad[oa]|assistid[oa])\s+(?:preso\s+)?n[aã]o\s+(?:foi\s+)?conduzid|sem\s+escolta|n[aã]o\s+conduzid/i, motivo: "reu_nao_conduzido" },
  { needle: /aus[êe]ncia\s+do\s+(?:r[ée]u|acusad)|r[ée]u\s+(?:ausente|n[aã]o\s+compareceu)/i, motivo: "ausencia_reu" },
  { needle: /excesso\s+de\s+pauta|pauta\s+do\s+ju[ií]zo|pelo\s+ju[ií]zo|magistrad|ju[ií]z[ao]?\s+ausente|de\s+of[ií]cio/i, motivo: "pauta_juizo" },
  { needle: /videoconfer|v[ií]deo\s*confer|sistema|link|t[ée]cnic|internet|balc[aã]o\s+virtual/i, motivo: "problema_tecnico" },
];

export function parseAnotacaoAudiencia(texto: string | null | undefined): AnotacaoAudienciaParsed | null {
  if (!texto) return null;
  const evento = EVENTOS.find((e) => e.needle.test(texto))?.evento ?? null;
  if (!evento) return null;
  // Gate de polaridade: "realizada/mantida" só invalida quando o termo positivo
  // não está negado no próprio match de evento (ex.: "não foi realizada" já
  // virou evento "cancelada" acima e não deve cair aqui).
  const positivo = texto.match(POLARIDADE_POSITIVA);
  if (positivo && !/n[aã]o\s+(?:foi\s+|se\s+)?$/i.test(texto.slice(Math.max(0, positivo.index! - 12), positivo.index))) {
    if (positivo[1].toLowerCase() !== "realizada" || !/n[aã]o/i.test(texto)) return null;
  }
  const motivo = MOTIVOS.find((m) => m.needle.test(texto))?.motivo ?? "outro";
  const { data, hora } = parseAudienciaFromText(texto);
  return { evento, motivo, motivoDetalhe: texto.trim(), novaData: data, novaHora: data ? (hora ?? "00:00") : null };
}

/** Rótulos para UI (banner, badge, selects). */
export const MOTIVO_LABELS: Record<MotivoNaoRealizacao, string> = {
  ausencia_vitima: "Ausência da vítima",
  ausencia_testemunha: "Ausência de testemunha",
  ausencia_reu: "Ausência do réu",
  reu_nao_conduzido: "Réu não conduzido",
  pauta_juizo: "Pauta/juízo",
  problema_tecnico: "Problema técnico",
  outro: "Outro",
};
export const EVENTO_LABELS: Record<EventoAudiencia, string> = {
  redesignada: "Redesignação",
  suspensa: "Suspensão",
  adiada: "Adiamento",
  cancelada: "Cancelamento",
};
```

ATENÇÃO ao gate de polaridade: o caso "Audiência não foi realizada por falha…" já casa `cancelada` pelo próprio regex de evento; o teste "realizada, vítima ouvida" não tem termo de evento e retorna null antes. Se a heurística do trecho acima ficar frágil nos testes, simplificar para: `if (POLARIDADE_POSITIVA.test(texto) && !/n[aã]o\s+(foi\s+|se\s+)?realiz/i.test(texto) && evento === null)` — o essencial é: **com** termo de evento explícito (redesignada/suspensa/adiada/cancelada) o evento vence; **sem** termo de evento, null. Ajustar até os 8 testes passarem sem enfraquecê-los.

- [ ] **Step 4: Rodar até passar**: `npx vitest run src/lib/agenda/__tests__/parse-anotacao-audiencia.test.ts` → 8 passed.
- [ ] **Step 5: Commit**: `git commit -m "feat(agenda): parser de anotações rápidas para eventos de audiência"`

### Task 3: Mutation `aplicarEventoAudiencia` + resolução automática da flag

**Files:**
- Modify: `src/lib/registros/aplicar-designacao-audiencia.ts` (resolução da flag no início de `aplicarDesignacaoAudiencia`)
- Modify: `src/lib/trpc/routers/audiencias.ts` (nova mutation, junto de `marcarConcluida` ~linha 2312; `addQuickNote` ~2200; `proximaAgendada` ~787)

- [ ] **Step 1: Resolução automática** — em `aplicarDesignacaoAudiencia`, logo após o `const { processoId, ... } = params;`:

```ts
  // Nova designação resolve a pendência "aguardando nova data" do processo
  // (redesignação sem data registrada via anotação/Concluir — spec 2026-06-11).
  await tx
    .update(audiencias)
    .set({ aguardandoNovaData: false, updatedAt: new Date() })
    .where(and(eq(audiencias.processoId, processoId), eq(audiencias.aguardandoNovaData, true)));
```

- [ ] **Step 2: Mutation no router** (após `marcarConcluida`). Imports já existentes no arquivo: `withTransaction`, `audiencias`, `audienciasHistorico`, `TRPCError`, `sql`. Adicionar import de `aplicarDesignacaoAudiencia, limparCalendarSupersedidas` de `@/lib/registros/aplicar-designacao-audiencia` e dos types do parser:

```ts
  // Funil único de "audiência não realizada": banner das anotações rápidas,
  // fluxo Concluir e ajuste manual. Sem nova data → flag aguardandoNovaData;
  // com nova data → delega a aplicarDesignacaoAudiencia (cria a nova, cancela
  // futuras fora do dia). Spec docs/superpowers/specs/2026-06-11-*.md
  aplicarEventoAudiencia: protectedProcedure
    .input(z.object({
      audienciaId: z.number(),
      evento: z.enum(["redesignada", "suspensa", "adiada", "cancelada"]),
      motivo: z.enum(["ausencia_vitima", "ausencia_testemunha", "ausencia_reu", "reu_nao_conduzido", "pauta_juizo", "problema_tecnico", "outro"]),
      motivoDetalhe: z.string().optional(),
      novaData: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      novaHora: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      novoLocal: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const resultado = await withTransaction(async (tx) => {
        const [atual] = await tx.select().from(audiencias).where(eq(audiencias.id, input.audienciaId));
        if (!atual) throw new TRPCError({ code: "NOT_FOUND", message: "Audiência não encontrada" });

        await tx
          .update(audiencias)
          .set({
            status: input.evento === "cancelada" ? "cancelada" : "redesignada",
            motivoNaoRealizacao: input.motivo,
            motivoDetalhe: input.motivoDetalhe ?? null,
            aguardandoNovaData: input.evento !== "cancelada" && !input.novaData,
            updatedAt: new Date(),
          })
          .where(eq(audiencias.id, input.audienciaId));

        if (!input.novaData) {
          return { googleCalendarEventId: atual.googleCalendarEventId, designacao: null, processoId: atual.processoId };
        }
        const designacao = await aplicarDesignacaoAudiencia(tx, {
          processoId: atual.processoId,
          assistidoId: atual.assistidoId ?? 0,
          defensorId: atual.defensorId ?? ctx.user.id,
          det: {
            data: input.novaData,
            horario: input.novaHora ?? "00:00",
            tipo: atual.tipo,
            local: input.novoLocal ?? atual.local,
            redesignacao: true,
            modalidade: null,
            trecho: input.motivoDetalhe ?? `Evento aplicado manualmente (${input.evento})`,
          },
          origem: "evento de audiência (anotação/conclusão)",
        });
        return { googleCalendarEventId: atual.googleCalendarEventId, designacao, processoId: atual.processoId };
      });

      // GCal best-effort fora da transação (padrão do módulo)
      if (resultado.designacao) {
        limparCalendarSupersedidas(resultado.processoId, resultado.designacao.supersedidas);
      } else if (resultado.googleCalendarEventId) {
        limparCalendarSupersedidas(resultado.processoId, [{ id: input.audienciaId, googleCalendarEventId: resultado.googleCalendarEventId }]);
      }
      return { ok: true, novaAudiencia: resultado.designacao?.audiencia ?? null };
    }),
```

Conferir o shape de `DesignacaoAudiencia` em `src/lib/registros/detectar-designacao-audiencia.ts` e ajustar o objeto `det` aos campos reais (ex.: se `modalidade`/`trecho` forem opcionais, omitir).

- [ ] **Step 3: `addQuickNote` devolve a detecção** — no fim da mutation existente, trocar `return { nota: novaNota };` por:

```ts
      const { parseAnotacaoAudiencia } = await import("@/lib/agenda/parse-anotacao-audiencia");
      return { nota: novaNota, deteccao: parseAnotacaoAudiencia(input.texto) };
```

- [ ] **Step 4: `proximaAgendada` ignora pendentes** — na query (~linha 800), acrescentar ao `and(...)`:

```ts
            eq(audiencias.aguardandoNovaData, false),
```

E incluir `aguardandoNovaData: audiencias.aguardandoNovaData, motivoNaoRealizacao: audiencias.motivoNaoRealizacao` no select de `proximaAgendada` e no `getAudienciaContext` (grep `getAudienciaContext` no router; adicionar os dois campos onde a audiência é selecionada/retornada, se o select for explícito).

- [ ] **Step 5: Typecheck + testes**: `npx tsc --noEmit && npx vitest run` → verde.
- [ ] **Step 6: Commit**: `git commit -m "feat(audiencias): mutation aplicarEventoAudiencia + resolução automática da flag"`

### Task 4: UI — banner de detecção nas anotações rápidas

**Files:**
- Create: `src/components/agenda/sheet/evento-detectado-banner.tsx`
- Modify: `src/hooks/use-audiencia-status-actions.ts` (addNote captura `deteccao`; nova mutation `aplicarEvento`)
- Modify: `src/components/agenda/event-detail-sheet.tsx` (seção anotações rápidas, linhas ~681-729; input da nota — grep `addNote.mutate`)

- [ ] **Step 1: Hook** — em `use-audiencia-status-actions.ts` adicionar:

```ts
  const aplicarEvento = trpc.audiencias.aplicarEventoAudiencia.useMutation({
    onSuccess: (r) => {
      toast.success(r.novaAudiencia ? "Evento aplicado — nova audiência criada" : "Evento aplicado — aguardando nova data");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
```

e exportá-la no return. O `addNote` mantém como está (o componente lê `data.deteccao` do retorno da mutation via `onSuccess` local no call-site).

- [ ] **Step 2: Banner** `evento-detectado-banner.tsx` — componente controlado:

```tsx
"use client";

import { useState } from "react";
import { CalendarClock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EVENTO_LABELS, MOTIVO_LABELS,
  type AnotacaoAudienciaParsed, type MotivoNaoRealizacao,
} from "@/lib/agenda/parse-anotacao-audiencia";

interface Props {
  deteccao: AnotacaoAudienciaParsed;
  isPending: boolean;
  onAplicar: (d: AnotacaoAudienciaParsed) => void;
  onDescartar: () => void;
}

/** Banner âmbar exibido sob a anotação quando o parser detecta evento de não
 *  realização. Nada é aplicado sem o clique em Aplicar. */
export function EventoDetectadoBanner({ deteccao, isPending, onAplicar, onDescartar }: Props) {
  const [motivo, setMotivo] = useState<MotivoNaoRealizacao>(deteccao.motivo);
  const [novaData, setNovaData] = useState(deteccao.novaData ?? "");
  const [novaHora, setNovaHora] = useState(deteccao.novaHora ?? "");
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 px-3 py-2 space-y-2">
      <div className="flex items-start gap-2">
        <CalendarClock className="w-3.5 h-3.5 mt-0.5 text-amber-600 shrink-0" />
        <p className="flex-1 text-xs text-amber-800 dark:text-amber-200">
          Detectado: <strong>{EVENTO_LABELS[deteccao.evento]}</strong>
          {" — "}{MOTIVO_LABELS[motivo]}
          {novaData ? ` — nova data ${novaData.split("-").reverse().join("/")}${novaHora ? ` às ${novaHora}` : ""}` : " — sem nova data (cartório designará)"}
        </p>
        <button type="button" aria-label="Descartar" className="text-amber-500 hover:text-amber-700 p-0.5" onClick={onDescartar}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <Label className="text-[10px]">Motivo</Label>
          <select
            className="block h-7 rounded-md border border-amber-300 bg-white dark:bg-neutral-900 px-2 text-xs"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value as MotivoNaoRealizacao)}
          >
            {Object.entries(MOTIVO_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-[10px]">Nova data (se já houver)</Label>
          <Input type="date" className="h-7 w-32 text-xs" value={novaData} onChange={(e) => setNovaData(e.target.value)} />
        </div>
        <div>
          <Label className="text-[10px]">Hora</Label>
          <Input type="time" className="h-7 w-20 text-xs" value={novaHora} onChange={(e) => setNovaHora(e.target.value)} />
        </div>
        <Button
          size="sm"
          className="h-7 bg-amber-600 hover:bg-amber-700 text-white"
          disabled={isPending}
          onClick={() => onAplicar({ ...deteccao, motivo, novaData: novaData || null, novaHora: novaData ? (novaHora || "00:00") : null })}
        >
          {isPending ? "Aplicando…" : "Aplicar"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Integrar no `event-detail-sheet.tsx`** — estado local `const [deteccaoPendente, setDeteccaoPendente] = useState<AnotacaoAudienciaParsed | null>(null);`. No call-site do `addNote.mutate(...)` (grep), acrescentar `{ onSuccess: (r) => { if (r.deteccao) setDeteccaoPendente(r.deteccao); } }`. Render do banner no topo da seção "Anotações rápidas" (antes do `<ul>`):

```tsx
                {deteccaoPendente && audienciaIdNum && (
                  <EventoDetectadoBanner
                    deteccao={deteccaoPendente}
                    isPending={actions.aplicarEvento.isPending}
                    onDescartar={() => setDeteccaoPendente(null)}
                    onAplicar={(d) =>
                      actions.aplicarEvento.mutate(
                        {
                          audienciaId: audienciaIdNum,
                          evento: d.evento,
                          motivo: d.motivo,
                          motivoDetalhe: d.motivoDetalhe,
                          ...(d.novaData ? { novaData: d.novaData, novaHora: d.novaHora ?? "00:00" } : {}),
                        },
                        { onSuccess: () => setDeteccaoPendente(null) }
                      )
                    }
                  />
                )}
```

- [ ] **Step 4: Ação "Estruturar" em notas existentes** — no `<li>` de cada nota (junto do botão Trash2, linhas ~709-723), botão que roda o parser client-side na nota:

```tsx
                        <button
                          type="button"
                          aria-label="Estruturar anotação"
                          title="Detectar evento de audiência"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-amber-600 cursor-pointer p-1"
                          onClick={() => {
                            const d = parseAnotacaoAudiencia(n.texto);
                            if (d) setDeteccaoPendente(d);
                            else toast.info("Nenhum evento de audiência detectado nesta anotação");
                          }}
                        >
                          <CalendarClock className="w-3.5 h-3.5" />
                        </button>
```

(parser é puro, roda no client; imports: `parseAnotacaoAudiencia`, `CalendarClock`, `toast` de sonner — conferir se já importado.)

- [ ] **Step 5: Build/typecheck**: `npx tsc --noEmit` → ok.
- [ ] **Step 6: Commit**: `git commit -m "feat(agenda): banner de detecção de evento nas anotações rápidas"`

### Task 5: UI — fluxo Concluir com "não realizada"

**Files:**
- Modify: `src/components/agenda/sheet/concluir-dialog.tsx` (arquivo inteiro tem 73 linhas)
- Modify: `src/components/agenda/sheet/sheet-action-footer.tsx` (call-site, linhas ~104-110)

- [ ] **Step 1: ConcluirDialog ganha a pergunta "foi realizada?"** — novo estado `const [realizada, setRealizada] = useState<boolean>(true);` + estados `motivo`, `temNovaData`, `novaData`, `novaHora`. RadioGroup inicial Sim/Não acima do bloco atual; quando **Não**, esconder o RadioGroup de resultado e mostrar: select de motivo (mesmo catálogo `MOTIVO_LABELS`), RadioGroup "Já saiu com nova data?" Sim/Não, e inputs date/time quando sim. A prop `onConfirm` muda para união discriminada:

```ts
export type ConclusaoAudiencia =
  | { realizada: true; resultado: "sentenciado" | "instrucao_encerrada" | "outra"; observacao: string }
  | { realizada: false; motivo: MotivoNaoRealizacao; observacao: string; novaData: string | null; novaHora: string | null };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (c: ConclusaoAudiencia) => void;
  isPending: boolean;
}
```

Botão de confirmação: rótulo "Confirmar conclusão" quando realizada, "Registrar não realização" quando não; manter classes/tamanhos do arquivo atual (estética intacta no ramo realizada).

- [ ] **Step 2: Call-site no `sheet-action-footer.tsx`** — no `onConfirm`, ramificar:

```tsx
        onConfirm={(c) => {
          if (c.realizada) {
            actions.concluir.mutate({ audienciaId, resultado: c.resultado, observacao: c.observacao }, { onSuccess: () => setConcluirOpen(false) });
          } else {
            actions.aplicarEvento.mutate(
              {
                audienciaId,
                evento: "redesignada",
                motivo: c.motivo,
                motivoDetalhe: c.observacao || undefined,
                ...(c.novaData ? { novaData: c.novaData, novaHora: c.novaHora ?? "00:00" } : {}),
              },
              { onSuccess: () => setConcluirOpen(false) }
            );
          }
        }}
```

`isPending` vira `actions.concluir.isPending || actions.aplicarEvento.isPending`. Conferir as props reais nas linhas 104-110 antes de editar.

- [ ] **Step 3: Typecheck**: `npx tsc --noEmit` → ok.
- [ ] **Step 4: Commit**: `git commit -m "feat(agenda): fluxo Concluir com ramo de audiência não realizada"`

### Task 6: UI — badge "Aguardando nova data" + ajuste manual

**Files:**
- Create: `src/components/agenda/aguardando-nova-data-badge.tsx`
- Modify: `src/components/agenda/event-detail-sheet.tsx` (header do sheet — grep o bloco que mostra status/tipo no topo)
- Modify: `src/components/agenda/audiencia-manager-modal.tsx` (aba "geral": campos motivo + flag)
- Modify: componentes que exibem `proximaAgendada` (`src/components/demandas-premium/demandas-premium-view.tsx`, `src/components/demandas-premium/DemandaQuickPreview.tsx` — grep `proximaAgendada`)

- [ ] **Step 1: Badge** componente puro:

```tsx
import { CalendarClock } from "lucide-react";
import { MOTIVO_LABELS, type MotivoNaoRealizacao } from "@/lib/agenda/parse-anotacao-audiencia";

export function AguardandoNovaDataBadge({ motivo }: { motivo?: string | null }) {
  const label = motivo ? MOTIVO_LABELS[motivo as MotivoNaoRealizacao] ?? motivo : null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
      <CalendarClock className="w-3 h-3" />
      Aguardando nova data{label ? ` — ${label.toLowerCase()}` : ""}
    </span>
  );
}
```

- [ ] **Step 2: Exibir no sheet** — onde o header renderiza o status da audiência (grep `status` no event-detail-sheet, bloco do topo), adicionar `{(ctx as any)?.audiencia?.aguardandoNovaData && <AguardandoNovaDataBadge motivo={(ctx as any)?.audiencia?.motivoNaoRealizacao} />}`. Garantir que `getAudienciaContext` retorna os campos (Task 3 Step 4).
- [ ] **Step 3: Exibir junto de `proximaAgendada`** nos dois componentes de demandas (grep) — quando a query retornar null mas o processo tiver audiência pendente, não inventar nada agora (YAGNI): apenas, onde a audiência aparece com `status`, mostrar o badge se `aguardandoNovaData`. Se o shape retornado não tiver os campos, pular este step e anotar no PR.
- [ ] **Step 4: Ajuste manual no `audiencia-manager-modal.tsx`** — na aba geral, junto do campo status existente (grep `status` no arquivo): select de motivo (opções `MOTIVO_LABELS`) + checkbox "Aguardando nova data", persistidos via mutation `update` existente — para isso, adicionar `motivoNaoRealizacao: z.string().optional(), motivoDetalhe: z.string().optional(), aguardandoNovaData: z.boolean().optional()` ao input da mutation `update` (router linhas ~903-920) e ao `.set()` correspondente.
- [ ] **Step 5: Typecheck + suite completa**: `npx tsc --noEmit && npx vitest run` → verde.
- [ ] **Step 6: Commit**: `git commit -m "feat(agenda): badge aguardando nova data + ajuste manual de motivo/flag"`

### Task 7: Verificação e entrega

- [ ] **Step 1: Build**: `npm run build` (Turbopack; em caso de erro de prod-only, lembrar TDZ ordem de hooks).
- [ ] **Step 2: Aplicar migração 0051 no Supabase** (MCP/SQL editor) ANTES de testar com dados reais.
- [ ] **Step 3: Smoke E2E** (dev server + browser): abrir a audiência VVD de 11/06 10h, conferir banner na anotação existente via "Estruturar", aplicar sem nova data → badge âmbar aparece e `proximaAgendada` da demanda não mostra mais essa audiência.
- [ ] **Step 4: Push por ref explícito + PR** (padrão worktree do repo): `git push origin HEAD:feat/eventos-audiencia-anotacoes && gh pr create --fill`; merge via `gh pr merge --squash` e conferir `state=MERGED` (o checkout local de main pode falhar — só conferir o estado).
