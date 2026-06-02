# Agenda — Anotações rápidas visíveis + Patrocínio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir as anotações rápidas (com apagar) no painel lateral da agenda e permitir marcar o patrocínio do processo (Defensoria × Advogado particular) com nome do advogado.

**Architecture:** Duas colunas novas em `processos`. Lógica pura (normalização de patrocínio, remoção/ordenação de notas) extraída para helpers testáveis com vitest. Mutations tRPC finas que reusam os helpers. UI confinada ao `EventDetailSheet`, que já recarrega via `getAudienciaContext`.

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM (PostgreSQL/Supabase), Zod, vitest, React, Tailwind, date-fns.

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/db/schema/core.ts` | +`tipoPatrocinio`, +`advogadoParticular` na tabela `processos` |
| `drizzle/<gerado>.sql` | migração das colunas novas |
| `src/lib/processos/patrocinio.ts` (novo) | constantes + `normalizePatrocinio` (helper puro) |
| `src/lib/agenda/anotacoes-rapidas.ts` (novo) | `removeNotaByTimestamp`, `ordenarNotasDesc` (helpers puros) |
| `src/lib/trpc/routers/processos.ts` | mutation `setPatrocinio` + `setPatrocinioInput` exportado |
| `src/lib/trpc/routers/audiencias.ts` | mutation `removeQuickNote` + `removeQuickNoteInput`; `getAudienciaContext` devolve `autoresAnotacoes` |
| `src/hooks/use-audiencia-status-actions.ts` | +`removeNote` |
| `src/components/agenda/event-detail-sheet.tsx` | seção "Anotações rápidas"; controle de patrocínio + badge |
| `__tests__/unit/patrocinio.test.ts` (novo) | testa `normalizePatrocinio` + `setPatrocinioInput` |
| `__tests__/unit/anotacoes-rapidas.test.ts` (novo) | testa helpers de notas + `removeQuickNoteInput` |

---

## Task 1: Schema — colunas de patrocínio em `processos`

**Files:**
- Modify: `src/lib/db/schema/core.ts` (tabela `processos`, perto de `advogadoContrario` ~linha 187)
- Create: migração drizzle (gerada por comando)

- [ ] **Step 1: Adicionar colunas ao schema**

Em `src/lib/db/schema/core.ts`, logo após a linha `advogadoContrario: text("advogado_contrario"),`:

```ts
  tipoPatrocinio: varchar("tipo_patrocinio", { length: 20 }).notNull().default("DEFENSORIA"), // DEFENSORIA | PARTICULAR
  advogadoParticular: text("advogado_particular"),
```

(`varchar` e `text` já estão importados neste arquivo.)

- [ ] **Step 2: Gerar a migração**

Run: `npm run db:generate`
Expected: novo arquivo em `drizzle/` contendo `ADD COLUMN "tipo_patrocinio"` e `ADD COLUMN "advogado_particular"`.

- [ ] **Step 3: Aplicar a migração**

Run: `npm run db:push`
Expected: push concluído sem erro; colunas criadas.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema/core.ts drizzle/
git commit -m "feat(processos): colunas tipoPatrocinio e advogadoParticular"
```

---

## Task 2: Helper puro de patrocínio

**Files:**
- Create: `src/lib/processos/patrocinio.ts`
- Test: `__tests__/unit/patrocinio.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar `__tests__/unit/patrocinio.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalizePatrocinio, TIPOS_PATROCINIO } from "@/lib/processos/patrocinio";

describe("normalizePatrocinio", () => {
  it("zera o advogado quando o tipo é DEFENSORIA", () => {
    expect(normalizePatrocinio("DEFENSORIA", "Dr. Fulano")).toEqual({
      tipoPatrocinio: "DEFENSORIA",
      advogadoParticular: null,
    });
  });

  it("mantém o nome do advogado (trim) quando PARTICULAR", () => {
    expect(normalizePatrocinio("PARTICULAR", "  Dra. Beltrana  ")).toEqual({
      tipoPatrocinio: "PARTICULAR",
      advogadoParticular: "Dra. Beltrana",
    });
  });

  it("PARTICULAR sem nome vira null", () => {
    expect(normalizePatrocinio("PARTICULAR", "   ")).toEqual({
      tipoPatrocinio: "PARTICULAR",
      advogadoParticular: null,
    });
  });

  it("expõe os tipos válidos", () => {
    expect(TIPOS_PATROCINIO).toEqual(["DEFENSORIA", "PARTICULAR"]);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest run __tests__/unit/patrocinio.test.ts`
Expected: FAIL — `Cannot find module '@/lib/processos/patrocinio'`.

- [ ] **Step 3: Implementar o helper**

Criar `src/lib/processos/patrocinio.ts`:

```ts
export const TIPOS_PATROCINIO = ["DEFENSORIA", "PARTICULAR"] as const;
export type TipoPatrocinio = (typeof TIPOS_PATROCINIO)[number];

/**
 * Normaliza a dupla (tipo, advogado): DEFENSORIA nunca carrega advogado;
 * nome em branco vira null.
 */
export function normalizePatrocinio(
  tipoPatrocinio: TipoPatrocinio,
  advogadoParticular?: string | null,
): { tipoPatrocinio: TipoPatrocinio; advogadoParticular: string | null } {
  if (tipoPatrocinio === "DEFENSORIA") {
    return { tipoPatrocinio, advogadoParticular: null };
  }
  const nome = (advogadoParticular ?? "").trim();
  return { tipoPatrocinio, advogadoParticular: nome.length > 0 ? nome : null };
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run __tests__/unit/patrocinio.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/processos/patrocinio.ts __tests__/unit/patrocinio.test.ts
git commit -m "feat(processos): helper puro normalizePatrocinio"
```

---

## Task 3: Mutation `setPatrocinio`

**Files:**
- Modify: `src/lib/trpc/routers/processos.ts` (adicionar ao `processosRouter`; `processos`, `users` já importados; `eq` já importado)
- Test: `__tests__/unit/patrocinio.test.ts` (acrescentar bloco)

- [ ] **Step 1: Acrescentar o teste do input schema**

Adicionar ao fim de `__tests__/unit/patrocinio.test.ts`:

```ts
import { setPatrocinioInput } from "@/lib/trpc/routers/processos";

describe("setPatrocinioInput", () => {
  it("aceita DEFENSORIA sem advogado", () => {
    const r = setPatrocinioInput.safeParse({ processoId: 1, tipoPatrocinio: "DEFENSORIA" });
    expect(r.success).toBe(true);
  });
  it("aceita PARTICULAR com advogado", () => {
    const r = setPatrocinioInput.safeParse({
      processoId: 1, tipoPatrocinio: "PARTICULAR", advogadoParticular: "Dr. X",
    });
    expect(r.success).toBe(true);
  });
  it("rejeita tipo inválido", () => {
    const r = setPatrocinioInput.safeParse({ processoId: 1, tipoPatrocinio: "OUTRO" });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run __tests__/unit/patrocinio.test.ts`
Expected: FAIL — `setPatrocinioInput` não exportado.

- [ ] **Step 3: Implementar a mutation**

No topo de `src/lib/trpc/routers/processos.ts`, adicionar o import do helper:

```ts
import { normalizePatrocinio, TIPOS_PATROCINIO } from "@/lib/processos/patrocinio";
```

Acima de `export const processosRouter = router({`, exportar o input:

```ts
export const setPatrocinioInput = z.object({
  processoId: z.number(),
  tipoPatrocinio: z.enum(TIPOS_PATROCINIO),
  advogadoParticular: z.string().nullable().optional(),
});
```

Dentro de `processosRouter` (ex.: logo após a mutation `update`), adicionar:

```ts
  setPatrocinio: protectedProcedure
    .input(setPatrocinioInput)
    .mutation(async ({ input }) => {
      const { tipoPatrocinio, advogadoParticular } = normalizePatrocinio(
        input.tipoPatrocinio,
        input.advogadoParticular,
      );
      const [atualizado] = await db
        .update(processos)
        .set({ tipoPatrocinio, advogadoParticular, updatedAt: new Date() })
        .where(eq(processos.id, input.processoId))
        .returning();
      if (!atualizado) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Processo não encontrado" });
      }
      return atualizado;
    }),
```

(`TRPCError` já está importado neste arquivo.)

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run __tests__/unit/patrocinio.test.ts`
Expected: PASS (7 testes no total).

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/processos.ts __tests__/unit/patrocinio.test.ts
git commit -m "feat(processos): mutation setPatrocinio"
```

---

## Task 4: Helpers puros de anotações rápidas

**Files:**
- Create: `src/lib/agenda/anotacoes-rapidas.ts`
- Test: `__tests__/unit/anotacoes-rapidas.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar `__tests__/unit/anotacoes-rapidas.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  removeNotaByTimestamp,
  ordenarNotasDesc,
  type NotaRapida,
} from "@/lib/agenda/anotacoes-rapidas";

const notas: NotaRapida[] = [
  { texto: "primeira", timestamp: "2026-06-01T10:00:00.000Z", autorId: 1 },
  { texto: "segunda", timestamp: "2026-06-02T10:00:00.000Z", autorId: 2 },
];

describe("removeNotaByTimestamp", () => {
  it("remove a nota com o timestamp informado", () => {
    const r = removeNotaByTimestamp(notas, "2026-06-01T10:00:00.000Z");
    expect(r).toHaveLength(1);
    expect(r[0].texto).toBe("segunda");
  });
  it("não altera quando o timestamp não existe", () => {
    expect(removeNotaByTimestamp(notas, "2030-01-01T00:00:00.000Z")).toHaveLength(2);
  });
  it("tolera lista nula/indefinida", () => {
    expect(removeNotaByTimestamp(null, "x")).toEqual([]);
    expect(removeNotaByTimestamp(undefined, "x")).toEqual([]);
  });
});

describe("ordenarNotasDesc", () => {
  it("ordena da mais recente para a mais antiga sem mutar a original", () => {
    const r = ordenarNotasDesc(notas);
    expect(r.map((n) => n.texto)).toEqual(["segunda", "primeira"]);
    expect(notas[0].texto).toBe("primeira"); // original intacta
  });
  it("tolera lista nula", () => {
    expect(ordenarNotasDesc(null)).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run __tests__/unit/anotacoes-rapidas.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar os helpers**

Criar `src/lib/agenda/anotacoes-rapidas.ts`:

```ts
export type NotaRapida = {
  texto: string;
  timestamp: string;
  autorId: number;
};

/** Remove a nota cujo timestamp bate exatamente. Tolerante a null/undefined. */
export function removeNotaByTimestamp(
  notas: NotaRapida[] | null | undefined,
  timestamp: string,
): NotaRapida[] {
  return (notas ?? []).filter((n) => n.timestamp !== timestamp);
}

/** Retorna nova lista ordenada do timestamp mais recente para o mais antigo. */
export function ordenarNotasDesc(
  notas: NotaRapida[] | null | undefined,
): NotaRapida[] {
  return [...(notas ?? [])].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run __tests__/unit/anotacoes-rapidas.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/agenda/anotacoes-rapidas.ts __tests__/unit/anotacoes-rapidas.test.ts
git commit -m "feat(agenda): helpers puros de anotações rápidas"
```

---

## Task 5: Mutation `removeQuickNote` + autores em `getAudienciaContext`

**Files:**
- Modify: `src/lib/trpc/routers/audiencias.ts` (`removeNotaByTimestamp` e `users` a importar; `inArray`, `eq`, `TRPCError` já importados)
- Test: `__tests__/unit/anotacoes-rapidas.test.ts` (acrescentar bloco)

- [ ] **Step 1: Acrescentar o teste do input schema**

Adicionar ao fim de `__tests__/unit/anotacoes-rapidas.test.ts`:

```ts
import { removeQuickNoteInput } from "@/lib/trpc/routers/audiencias";

describe("removeQuickNoteInput", () => {
  it("aceita audienciaId + timestamp", () => {
    const r = removeQuickNoteInput.safeParse({
      audienciaId: 1, timestamp: "2026-06-01T10:00:00.000Z",
    });
    expect(r.success).toBe(true);
  });
  it("rejeita sem timestamp", () => {
    const r = removeQuickNoteInput.safeParse({ audienciaId: 1 });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run __tests__/unit/anotacoes-rapidas.test.ts`
Expected: FAIL — `removeQuickNoteInput` não exportado.

- [ ] **Step 3: Implementar import, input e mutation**

Em `src/lib/trpc/routers/audiencias.ts`:

Adicionar à linha de import do core (`import { analysisJobs } from "@/lib/db/schema/core";`) o `users`:

```ts
import { analysisJobs, users } from "@/lib/db/schema/core";
```

Adicionar o import do helper:

```ts
import { removeNotaByTimestamp } from "@/lib/agenda/anotacoes-rapidas";
```

Antes de `export const`/`router({` do arquivo (perto dos outros), exportar o input:

```ts
export const removeQuickNoteInput = z.object({
  audienciaId: z.number(),
  timestamp: z.string().min(1),
});
```

Logo após a mutation `addQuickNote` (que termina por volta da linha 1999), adicionar:

```ts
  removeQuickNote: protectedProcedure
    .input(removeQuickNoteInput)
    .mutation(async ({ input }) => {
      const [audiencia] = await db
        .select({ anotacoesRapidas: audiencias.anotacoesRapidas })
        .from(audiencias)
        .where(eq(audiencias.id, input.audienciaId));
      if (!audiencia) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Audiência não encontrada" });
      }
      const antes = audiencia.anotacoesRapidas ?? [];
      const depois = removeNotaByTimestamp(antes, input.timestamp);
      await db
        .update(audiencias)
        .set({ anotacoesRapidas: depois, updatedAt: new Date() })
        .where(eq(audiencias.id, input.audienciaId));
      return { removed: depois.length < antes.length };
    }),
```

- [ ] **Step 4: Enriquecer `getAudienciaContext` com nomes dos autores**

Em `getAudienciaContext`, logo antes do `return {` (~linha 632), inserir:

```ts
      // Autores das anotações rápidas (id -> nome) para exibição no painel
      const autorIds = Array.from(
        new Set((aud.anotacoesRapidas ?? []).map((n) => n.autorId)),
      );
      let autoresAnotacoes: Record<number, string> = {};
      if (autorIds.length > 0) {
        const autoresRows = await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, autorIds));
        autoresAnotacoes = Object.fromEntries(
          autoresRows.map((u) => [u.id, u.name]),
        );
      }
```

E adicionar a chave ao objeto de retorno:

```ts
      return {
        audiencia: aud,
        processo: proc,
        assistido: assist,
        caso,
        atendimentos: atendimentosResult,
        diligencias: diligenciasResult,
        anotacoes: anotacoesResult,
        testemunhas: testemunhasResult,
        analysisData,
        autoresAnotacoes,
      };
```

- [ ] **Step 5: Rodar testes e confirmar que passam**

Run: `npx vitest run __tests__/unit/anotacoes-rapidas.test.ts`
Expected: PASS (7 testes no total).

- [ ] **Step 6: Verificar typecheck**

Run: `npm run typecheck`
Expected: sem erros novos relacionados a `audiencias.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/trpc/routers/audiencias.ts __tests__/unit/anotacoes-rapidas.test.ts
git commit -m "feat(agenda): removeQuickNote + autores das anotações no contexto"
```

---

## Task 6: Hook — `removeNote` e mutation de patrocínio

**Files:**
- Modify: `src/hooks/use-audiencia-status-actions.ts`

- [ ] **Step 1: Adicionar `removeNote` ao hook**

Em `src/hooks/use-audiencia-status-actions.ts`, logo após o bloco `addNote = trpc.audiencias.addQuickNote...`:

```ts
  const removeNote = trpc.audiencias.removeQuickNote.useMutation({
    onSuccess: () => {
      toast.success("Anotação removida");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
```

E incluir no retorno:

```ts
  return { concluir, redesignar, marcarOuvido, redesignarDep, addNote, removeNote };
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: sem erros novos.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-audiencia-status-actions.ts
git commit -m "feat(agenda): hook removeNote"
```

---

## Task 7: UI — seção "Anotações rápidas" no painel

**Files:**
- Modify: `src/components/agenda/event-detail-sheet.tsx`

- [ ] **Step 1: Imports**

Em `src/components/agenda/event-detail-sheet.tsx`. Já existem: `ptBR` (date-fns/locale), `useEffect`, `useState`, `toast`, `cn`. Ajustar/adicionar:

- Trocar `import { format } from "date-fns";` por `import { format, formatDistanceToNow } from "date-fns";`
- Acrescentar `Trash2` ao bloco de import de `lucide-react` já existente (linhas 8-10).
- Adicionar duas linhas novas:

```ts
import { Input } from "@/components/ui/input";
import { ordenarNotasDesc } from "@/lib/agenda/anotacoes-rapidas";
```

- [ ] **Step 2: Derivar as notas ordenadas + autores**

Junto às outras derivações (perto de `const ad = ctx?.analysisData;`, ~linha 140):

```ts
  const anotacoesRapidas = ordenarNotasDesc((ctx as any)?.audiencia?.anotacoesRapidas);
  const autoresAnotacoes: Record<number, string> = (ctx as any)?.autoresAnotacoes ?? {};
```

- [ ] **Step 3: Renderizar a seção logo após "Resumo Executivo"**

Localizar a `CollapsibleSection id="resumo"` (~linha 360) e, imediatamente após o seu fechamento `</CollapsibleSection>`, inserir:

```tsx
              <CollapsibleSection
                id="anotacoes-rapidas"
                label="Anotações rápidas"
                count={anotacoesRapidas.length}
                defaultOpen
              >
                {anotacoesRapidas.length === 0 ? (
                  <EmptyHint text="Nenhuma anotação ainda" />
                ) : (
                  <ul className="space-y-2">
                    {anotacoesRapidas.map((n) => (
                      <li
                        key={n.timestamp}
                        className="group flex items-start gap-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-neutral-800 dark:text-neutral-100 whitespace-pre-wrap break-words">
                            {n.texto}
                          </p>
                          <p className="mt-0.5 text-[10px] text-neutral-400">
                            {autoresAnotacoes[n.autorId] ?? "—"} ·{" "}
                            {formatDistanceToNow(new Date(n.timestamp), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label="Apagar anotação"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-red-500 cursor-pointer p-1"
                          disabled={actions.removeNote.isPending || !audienciaIdNum}
                          onClick={() =>
                            audienciaIdNum &&
                            actions.removeNote.mutate({
                              audienciaId: audienciaIdNum,
                              timestamp: n.timestamp,
                            })
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CollapsibleSection>
```

- [ ] **Step 4: Verificar typecheck/build**

Run: `npm run typecheck`
Expected: sem erros novos no arquivo.

- [ ] **Step 5: Verificação manual no navegador**

Run: `npm run dev` e abrir uma audiência no painel da agenda.
Expected: enviar uma anotação rápida pelo rodapé → ela aparece na seção "Anotações rápidas" (com autor e "há instantes"); clicar na lixeira remove a nota imediatamente.

- [ ] **Step 6: Commit**

```bash
git add src/components/agenda/event-detail-sheet.tsx
git commit -m "feat(agenda): exibir anotações rápidas no painel com apagar"
```

---

## Task 8: UI — controle de patrocínio + badge

**Files:**
- Modify: `src/components/agenda/event-detail-sheet.tsx`

- [ ] **Step 1: Estado local e derivações**

Junto às derivações de `processo` (perto de `const processoId = ...`, ~linha 143):

```ts
  const tipoPatrocinio: "DEFENSORIA" | "PARTICULAR" =
    ((ctx?.processo as any)?.tipoPatrocinio as "DEFENSORIA" | "PARTICULAR") ?? "DEFENSORIA";
  const advogadoParticular: string | null =
    (ctx?.processo as any)?.advogadoParticular ?? null;
```

Adicionar estado controlado para o input do advogado (junto aos outros `useState`, ~linha 71):

```ts
  const [advogadoDraft, setAdvogadoDraft] = useState("");
```

Sincronizar o draft quando o contexto carrega (junto aos efeitos existentes, ou criar um `useEffect`):

```ts
  useEffect(() => {
    setAdvogadoDraft(advogadoParticular ?? "");
  }, [advogadoParticular, processoId]);
```

- [ ] **Step 2: Mutation de patrocínio**

Junto aos outros hooks de mutation (perto de `const actions = useAudienciaStatusActions(...)`, ~linha 103):

```ts
  const utils = trpc.useUtils();
  const setPatrocinio = trpc.processos.setPatrocinio.useMutation({
    onSuccess: () => {
      if (audienciaIdNum) utils.audiencias.getAudienciaContext.invalidate({ audienciaId: audienciaIdNum });
    },
    onError: (e) => toast.error(e.message),
  });
```

(`toast` já está importado no arquivo.)

- [ ] **Step 3: Renderizar o controle na zona de metadados do processo**

Localizar onde o número dos autos / vara são exibidos no cabeçalho (usa `processoNum`/`vara`, ~linha 300-360, dentro do header antes das `CollapsibleSection`). Inserir o bloco abaixo nessa zona de metadados:

```tsx
              {processoId && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[10px] uppercase tracking-wide text-neutral-400">Patrocínio</span>
                  <div className="inline-flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                    {(["DEFENSORIA", "PARTICULAR"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        disabled={setPatrocinio.isPending}
                        onClick={() =>
                          setPatrocinio.mutate({
                            processoId,
                            tipoPatrocinio: opt,
                            advogadoParticular: opt === "PARTICULAR" ? advogadoDraft : null,
                          })
                        }
                        className={cn(
                          "px-2.5 py-1 text-xs cursor-pointer transition-colors",
                          tipoPatrocinio === opt
                            ? "bg-emerald-500 text-white"
                            : "bg-transparent text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800",
                        )}
                      >
                        {opt === "DEFENSORIA" ? "Defensoria" : "Particular"}
                      </button>
                    ))}
                  </div>
                  {tipoPatrocinio === "PARTICULAR" && (
                    <Input
                      value={advogadoDraft}
                      onChange={(e) => setAdvogadoDraft(e.target.value)}
                      onBlur={() => {
                        const atual = advogadoParticular ?? "";
                        if (advogadoDraft.trim() !== atual.trim()) {
                          setPatrocinio.mutate({
                            processoId,
                            tipoPatrocinio: "PARTICULAR",
                            advogadoParticular: advogadoDraft,
                          });
                        }
                      }}
                      placeholder="Nome do advogado"
                      className="h-7 text-xs rounded-lg w-48"
                    />
                  )}
                  {tipoPatrocinio === "PARTICULAR" && advogadoParticular && (
                    <span className="text-[10px] rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5">
                      ⚖ Particular — {advogadoParticular}
                    </span>
                  )}
                </div>
              )}
```

(`Input` e `cn` já foram garantidos nos imports da Task 7 Step 1 / já existentes no arquivo.)

- [ ] **Step 4: Verificar typecheck**

Run: `npm run typecheck`
Expected: sem erros novos.

- [ ] **Step 5: Verificação manual no navegador**

Run: `npm run dev` e abrir uma audiência.
Expected: alternar Defensoria/Particular persiste (reabrir o painel mantém o estado); escolher Particular exibe o input; digitar o nome e sair do campo salva; o badge "Particular — {nome}" aparece; voltar para Defensoria limpa o nome.

- [ ] **Step 6: Commit**

```bash
git add src/components/agenda/event-detail-sheet.tsx
git commit -m "feat(agenda): controle de patrocínio Defensoria/Particular no painel"
```

---

## Verificação final

- [ ] **Rodar a suíte unitária dos arquivos novos**

Run: `npx vitest run __tests__/unit/patrocinio.test.ts __tests__/unit/anotacoes-rapidas.test.ts`
Expected: PASS (todos).

- [ ] **Typecheck geral**

Run: `npm run typecheck`
Expected: sem erros novos introduzidos por este trabalho.

- [ ] **Conferir os 6 critérios de aceite do spec** (`docs/superpowers/specs/2026-06-02-agenda-anotacoes-patrocinio-design.md`).
