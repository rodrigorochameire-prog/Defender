# Re-análise de demandas sob demanda — Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir disparar a leitura profunda (varredura nível 2/3) em demanda(s) SELECIONADAS, em qualquer coluna do kanban, reaproveitando o pipeline Python+IA existente e ignorando o filtro de status `5_TRIAGEM/URGENTE`.

**Architecture:** UI (web/Vercel) enfileira uma task `claude_code_tasks` (lane=browser) com `demandaIds`; o daemon (Mac mini M4) roda `varredura_triagem.py --demanda-ids …` que consulta SÓ esses IDs (sem filtro de status), classifica, executa side-effects e enfileira a task de IA `analise-intimacao`. Nada novo no "cérebro" — só um novo ponto de entrada por demanda. Status/coluna nunca mudam (só ato/tipo_ato/prioridade/prazo + registros + audiência).

**Tech Stack:** Python 3.12 (script da skill), Next.js 15 + tRPC + Zod + Drizzle (router), React + React Query + sonner (UI), Vitest (testes TS), assert nativo (self-test Python).

**Spec:** `docs/superpowers/specs/2026-06-29-reanalise-demandas-sob-demanda-design.md`

**Non-goals (Phase 2 / fora):** cola manual de texto; port do classificador p/ TS; alteração do roteamento do import; mudança de status/coluna.

---

## File Structure

| Arquivo | Mudança | Responsabilidade |
|---|---|---|
| `.claude/skills/varredura-triagem/scripts/varredura_triagem.py` | Modify | Novo `--demanda-ids` + `list_demandas_by_ids` (sem filtro de status); helper puro `build_by_ids_params` p/ teste |
| `src/lib/trpc/routers/intimacoes.ts` | Modify | `criarVarreduraJob`: schema XOR `atribuicoes`/`demandaIds`; branch que enfileira 1 task com `demandaIds` |
| `src/lib/trpc/routers/__tests__/intimacoes-varredura-input.test.ts` | Create | Testa o refine XOR do input |
| `src/hooks/use-varredura-job.ts` | Create | Hook DRY: dispara `criarVarreduraJob`, faz poll de `statusVarredura`, invalida `demandas.list`; reaproveitado pelo card e pelo lote |
| `src/components/demandas-premium/demandas-premium-view.tsx` | Modify | Gatilho único (menu quick-actions do card) + gatilho em lote (barra de seleção) usando o hook |
| `.claude/skills-cowork/analise-intimacao/scripts/write_analise.py` | Modify | Seta `demandas.revisao_pendente=true` quando `ato_confianca in (media,baixa)` |
| `.claude/skills/m4-setup/SKILL.md` (ou doc do daemon) | Modify | Documentar contrato: payload com `demandaIds` → comando `--demanda-ids` |

> **Pré-requisito de entrega (fora deste repo):** o runner do daemon precisa mapear `instrucaoAdicional.demandaIds` → `--demanda-ids 1,2,3`. Sem isso, o gatilho enfileira mas o daemon roda o modo antigo (Task 7).

---

## Task 1: Python — modo `--demanda-ids` (sem filtro de status)

**Files:**
- Modify: `.claude/skills/varredura-triagem/scripts/varredura_triagem.py` (`list_demandas`/`main` por volta de `:206`, `:1491`)
- Test: self-test inline no próprio script (`build_by_ids_params`)

- [ ] **Step 1: Escrever o teste que falha (helper puro de query)**

Adicionar no fim do script (antes de `if __name__`):

```python
def build_by_ids_params(ids: list[int], defensor_id: int) -> list[str]:
    """Monta os params PostgREST para buscar demandas por ID, SEM filtro de
    status (analisa em qualquer coluna). Puro/testável."""
    ids_csv = ",".join(str(int(i)) for i in ids)
    return [
        "select=id,ato,assistido_id,processo_id,enrichment_data,pje_documento_id,"
        "processos!inner(numero_autos,atribuicao,vara,classe_processual,processosVvd:processos_vvd(tipo_processo,mpu_ativa)),"
        "assistidos!inner(nome)",
        f"id=in.({ids_csv})",
        f"defensor_id=eq.{defensor_id}",
        "deleted_at=is.null",
    ]


def _self_test_build_by_ids():
    p = build_by_ids_params([1368, 12], 1)
    joined = "&".join(p)
    assert "id=in.(1368,12)" in joined, joined
    assert "status=in." not in joined, "NÃO deve filtrar por status"
    assert "defensor_id=eq.1" in joined
    assert "deleted_at=is.null" in joined
    print("[self-test] build_by_ids_params OK")
```

- [ ] **Step 2: Rodar o self-test e ver FALHAR (função ainda não existe / assert)**

Run: `cd .claude/skills/varredura-triagem/scripts && python3 -c "import varredura_triagem as v; v._self_test_build_by_ids()"`
Expected: `AttributeError` (antes de criar) — confirma que o teste exercita código novo.

- [ ] **Step 3: Implementar `list_demandas_by_ids` + arg `--demanda-ids` + wiring no `main`**

Em `Supabase`, ao lado de `list_demandas`:

```python
    def list_demandas_by_ids(self, ids: list[int]) -> list[dict]:
        params = build_by_ids_params(ids, DEFENSOR_ID)
        return self._req("GET", "/rest/v1/demandas?" + "&".join(params))
```

Em `main()`, novo arg + seleção da fonte:

```python
    parser.add_argument("--demanda-ids", default=None,
                        help="CSV de IDs de demanda. Analisa SÓ essas, em qualquer coluna (ignora filtro de status). Exclusivo com --atribuicao/--since.")
    ...
    if args.demanda_ids:
        ids = [int(x) for x in args.demanda_ids.split(",") if x.strip()]
        demandas = sb.list_demandas_by_ids(ids)
        print(f"[varredura] alvo: {len(demandas)} demandas (selecionadas)")
    else:
        demandas = sb.list_demandas(args.atribuicao, args.since, args.limit)
        print(f"[varredura] alvo: {len(demandas)} demandas em triagem")
```

> O resto de `main`/`varredura` (modos cdp/direct/manual-review, classify, side-effects, enfileiramento IA) NÃO muda — opera sobre `demandas`, seja qual for a fonte. `--atribuicao` continua passado a `varredura()`; com `--demanda-ids` ele é `None`, e a atribuição de cada demanda vem do `select` (`processos.atribuicao`).

- [ ] **Step 4: Rodar o self-test e ver PASSAR**

Run: `cd .claude/skills/varredura-triagem/scripts && python3 -c "import varredura_triagem as v; v._self_test_build_by_ids()"`
Expected: `[self-test] build_by_ids_params OK`

- [ ] **Step 5: Compilar o script**

Run: `python3 -m py_compile .claude/skills/varredura-triagem/scripts/varredura_triagem.py`
Expected: sem saída (exit 0)

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/varredura-triagem/scripts/varredura_triagem.py
git commit -m "feat(varredura): modo --demanda-ids (analisa demandas selecionadas, sem filtro de status)"
```

---

## Task 2: Router — `criarVarreduraJob` aceita `demandaIds` (XOR)

**Files:**
- Modify: `src/lib/trpc/routers/intimacoes.ts:463-517`
- Test: `src/lib/trpc/routers/__tests__/intimacoes-varredura-input.test.ts`

- [ ] **Step 1: Extrair o schema do input p/ const exportada (testável) + escrever o teste que falha**

No `intimacoes.ts`, acima do router, exportar:

```ts
export const criarVarreduraJobInput = z
  .object({
    atribuicoes: z.array(z.enum(ATRIBUICOES_PERMITIDAS)).min(1).optional(),
    demandaIds: z.array(z.number().int()).min(1).max(50).optional(),
    since: z.string().optional(),
    limit: z.number().int().min(1).max(500).optional(),
  })
  .refine(
    (v) => Boolean(v.atribuicoes?.length) !== Boolean(v.demandaIds?.length),
    { message: "Informe atribuicoes OU demandaIds (exatamente um)." },
  );
```

Teste (`__tests__/intimacoes-varredura-input.test.ts`):

```ts
import { describe, it, expect } from "vitest";
import { criarVarreduraJobInput } from "../intimacoes";

describe("criarVarreduraJobInput (XOR)", () => {
  it("aceita só atribuicoes", () => {
    expect(criarVarreduraJobInput.safeParse({ atribuicoes: ["VVD_CAMACARI"] }).success).toBe(true);
  });
  it("aceita só demandaIds", () => {
    expect(criarVarreduraJobInput.safeParse({ demandaIds: [1368] }).success).toBe(true);
  });
  it("rejeita os dois juntos", () => {
    expect(criarVarreduraJobInput.safeParse({ atribuicoes: ["VVD_CAMACARI"], demandaIds: [1] }).success).toBe(false);
  });
  it("rejeita nenhum", () => {
    expect(criarVarreduraJobInput.safeParse({}).success).toBe(false);
  });
  it("rejeita lote > 50", () => {
    expect(criarVarreduraJobInput.safeParse({ demandaIds: Array.from({ length: 51 }, (_, i) => i + 1) }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver FALHAR**

Run: `npx vitest run src/lib/trpc/routers/__tests__/intimacoes-varredura-input.test.ts`
Expected: FAIL (`criarVarreduraJobInput` não exportado / schema antigo é required).

- [ ] **Step 3: Trocar o `.input(...)` do router pela const e ramificar a mutation**

`criarVarreduraJob`:
- `.input(criarVarreduraJobInput)`.
- No corpo, após o dedup existente:

```ts
      // Branch por demanda: 1 task com os IDs, sem atribuição/since.
      if (input.demandaIds?.length) {
        const [task] = await db
          .insert(claudeCodeTasks)
          .values({
            skill: "varredura-triagem",
            lane: "browser",
            prompt: `Leitura profunda — ${input.demandaIds.length} demanda(s) selecionada(s) (lane browser)`,
            instrucaoAdicional: JSON.stringify({
              demandaIds: input.demandaIds,
              modo: "cdp",
              defensorId: ctx.user.id,
            }),
            status: "pending",
            createdBy: ctx.user.id,
          })
          .returning({ id: claudeCodeTasks.id });
        return { success: true, existing: false, taskIds: [task.id] };
      }

      // (fluxo por atribuição existente, inalterado, abaixo)
```

> Mantém o dedup atual (bloqueia se já houver varredura ativa — sessão CDP única). O branch por-demanda fica **depois** do early-return de dedup, então também respeita a trava.

- [ ] **Step 4: Rodar e ver PASSAR + typecheck**

Run: `npx vitest run src/lib/trpc/routers/__tests__/intimacoes-varredura-input.test.ts && npx tsc --noEmit`
Expected: testes PASS; tsc sem erros novos.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/intimacoes.ts src/lib/trpc/routers/__tests__/intimacoes-varredura-input.test.ts
git commit -m "feat(intimacoes): criarVarreduraJob aceita demandaIds (XOR com atribuicoes)"
```

---

## Task 3: Hook DRY `useVarreduraJob` (dispara + poll + invalida)

**Files:**
- Create: `src/hooks/use-varredura-job.ts`

Extrai o padrão já usado em `varredura-trigger-modal.tsx` (dispara `criarVarreduraJob`, faz poll de `statusVarredura`, invalida `demandas.list` ao concluir) para reuso pelo card e pelo lote. Sem teste unitário (hook de UI/efeito) — verificação manual no smoke (Task 4/5).

- [ ] **Step 1: Implementar o hook**

```ts
"use client";
import { useEffect, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

export function useVarreduraJob() {
  const utils = trpc.useUtils();
  const [jobId, setJobId] = useState<number | null>(null);

  const criar = trpc.intimacoes.criarVarreduraJob.useMutation({
    onSuccess: (res) => {
      if (res?.existing) {
        toast.info("Já há uma análise em andamento");
      } else {
        toast.success("Análise iniciada", {
          description: "O daemon vai ler os autos — o kanban atualiza ao concluir.",
        });
        const first = res?.taskIds?.[0];
        if (typeof first === "number") setJobId(first);
      }
    },
    onError: (e) => toast.error("Erro ao iniciar análise: " + e.message),
  });

  // Mesmo padrão do VarreduraTriggerModal: o `data` do useQuery dirige o efeito.
  const { data: status } = trpc.intimacoes.statusVarredura.useQuery(
    { jobId: jobId ?? 0 },
    {
      enabled: jobId != null,
      refetchInterval: (q) => {
        const s = q.state.data?.status;
        return s === "pending" || s === "processing" ? 4000 : false;
      },
    },
  );

  useEffect(() => {
    if (jobId == null || !status) return;
    if (status.status === "completed") {
      toast.success("Análise concluída");
      utils.demandas.list.invalidate();
      setJobId(null);
    } else if (status.status === "failed") {
      toast.error("A análise falhou");
      setJobId(null);
    }
  }, [jobId, status, utils]);

  const analisar = useCallback(
    (demandaIds: number[]) => criar.mutate({ demandaIds }),
    [criar],
  );

  return { analisar, isPending: criar.isPending, isRunning: jobId != null };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros novos. (Se o `getData` não casar o tipo, usar o mesmo padrão do modal — `useQuery` retornando `data` em vez de `getData`.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-varredura-job.ts
git commit -m "feat(hooks): useVarreduraJob — dispara/poll/invalida da leitura profunda (DRY)"
```

---

## Task 4: Gatilho único no card (menu quick-actions)

**Files:**
- Modify: `src/components/demandas-premium/demandas-premium-view.tsx` (grid de quick-actions ~`:547-557`)

> **Instância única do hook:** chamar `useVarreduraJob()` **uma vez no nível da view**
> (`demandas-premium-view.tsx`, a mesma instância usada na Task 5) e passar `analisar` +
> `isRunning` ao card via props. Evita N subscrições ociosas de `statusVarredura` (uma por
> card). NÃO instanciar o hook dentro de cada `DemandaCard`.

- [ ] **Step 1: Passar `analisar`/`isRunning` (props) ao card e adicionar o item de menu**

Adicionar props ao card (ex.: `onAnalisar?: (id: number) => void; analisando?: boolean`),
fiadas pela view a partir do hook. No grid Edit/Copy/Archive/Delete, adicionar um botão:

```tsx
<button
  disabled={isRunning}
  onClick={() => { analisar([parseInt(demanda.id, 10)]); setShowQuickActions(false); }}
  className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all disabled:opacity-50"
>
  {/* ícone Lucide ScanSearch/Sparkles — seguir o padrão dos vizinhos */}
  <span className="text-[10px]">Analisar</span>
</button>
```

> `demanda.id` é string no card — converter p/ number. Reusar um ícone Lucide já importado no arquivo (não adicionar emoji).

- [ ] **Step 2: Typecheck + smoke manual**

Run: `npx tsc --noEmit`
Smoke: abrir o kanban, menu de um card → "Analisar" → toast "Análise iniciada" (ou "Já há uma análise em andamento"). Confirmar que uma task `varredura-triagem` lane=browser foi inserida com `instrucaoAdicional.demandaIds=[id]`.

- [ ] **Step 3: Commit**

```bash
git add src/components/demandas-premium/demandas-premium-view.tsx
git commit -m "feat(demandas): gatilho 'Analisar (leitura profunda)' no menu do card"
```

---

## Task 5: Gatilho em lote (barra de seleção)

**Files:**
- Modify: `src/components/demandas-premium/demandas-premium-view.tsx` (handlers de batch ~`:1771`; barra de seleção que renderiza quando `selectedIds.size > 0`)

> **Nota (drift do spec):** o spec §2b diz "o kanban não tem multi-seleção hoje" — está
> **desatualizado**. A view já tem `isSelectMode`, `selectedIds: Set<string>` (`:793`),
> `setSelectedIds`, `batchUpdateMutation` e handlers (`handleBatchAtoChange` `:1771`). Esta
> task **reusa** essa infra; não recriar seleção.

- [ ] **Step 1: Handler de lote + botão na barra**

Ao lado de `handleBatchAtoChange`:

```ts
const handleBatchAnalisar = () => {
  if (selectedIds.size === 0) return;
  const numericIds = Array.from(selectedIds).map(id => parseInt(id, 10)).filter(id => !isNaN(id));
  if (numericIds.length === 0) return;
  if (numericIds.length > 50) { toast.error("Selecione no máximo 50 demandas por análise"); return; }
  analisar(numericIds);
  setSelectedIds(new Set());
  setIsSelectMode(false);
};
```

Na barra de ações em lote (onde já existem status/ato/atribuição/deletar), adicionar botão **"Analisar selecionadas (N)"** chamando `handleBatchAnalisar`, `disabled={isRunning}`. Usar `useVarreduraJob` no escopo da view (mesma instância do hook para `analisar`/`isRunning`).

- [ ] **Step 2: Typecheck + smoke**

Run: `npx tsc --noEmit`
Smoke: entrar em modo seleção, marcar 2-3 cards → "Analisar selecionadas (N)" → toast; 1 task enfileirada com todos os IDs; seleção limpa.

- [ ] **Step 3: Commit**

```bash
git add src/components/demandas-premium/demandas-premium-view.tsx
git commit -m "feat(demandas): ação em lote 'Analisar selecionadas' na barra de seleção"
```

---

## Task 6: Selo de revisão em baixa confiança (v2)

**Files:**
- Modify: `.claude/skills-cowork/analise-intimacao/scripts/write_analise.py` (bloco que aplica `ato_sugerido`, ~`:159-165`)

- [ ] **Step 1: Setar `revisao_pendente` quando confiança não-alta**

⚠️ `write_analise.py` **não tem PATCH multi-campo** da demanda. O único update é
`update_demanda_ato(demanda_id, novo_ato)` (`:93`, manda só `{"ato":...}`) e ele roda
**apenas** dentro de `if ato_ajuste:` (confiança alta, `:192-194`). Para media/baixa não
existe PATCH onde "pegar carona" — escrever `patch[...]` daria `NameError`. Adicionar uma
chamada **explícita** via o helper `req` (`:73`), no loop por demanda, após calcular
`ato_conf` (~`:161`), **sem** estar gated por `ato_ajuste` nem pelo bloco de registro:

```python
        if ato_conf in ("media", "baixa"):
            req("PATCH", f"/rest/v1/demandas?id=eq.{demanda_id}",
                {"revisao_pendente": True}, prefer="return=minimal")
```

(`demanda_id` já está em escopo no loop — é o mesmo usado em `update_demanda_ato`. Coluna
já existe — `core.ts:353`, `notNull default false`. Só seta True; nunca rebaixa p/ False.)

- [ ] **Step 2: Compilar**

Run: `python3 -m py_compile .claude/skills-cowork/analise-intimacao/scripts/write_analise.py`
Expected: exit 0.

- [ ] **Step 3 (UI, opcional se ainda não houver selo):** confirmar que o card lê `revisao_pendente` e mostra um selo "revisar"; se não houver, adicionar selo simples no `DemandaCard.tsx`. Verificar antes com grep `revisao_pendente` em `src/components/demandas-premium`.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills-cowork/analise-intimacao/scripts/write_analise.py
git commit -m "feat(analise-intimacao): marca revisao_pendente quando ato_confianca media/baixa"
```

---

## Task 7: Contrato do daemon (`--demanda-ids`) — pré-requisito de entrega

**Files:**
- Modify: `.claude/skills/m4-setup/SKILL.md` (ou a doc do runner do daemon que monta o comando a partir de `claude_code_tasks.instrucao_adicional`)

- [ ] **Step 1: Documentar e implementar o mapeamento**

No runner do daemon (lane=browser, skill=varredura-triagem): quando `instrucaoAdicional` tiver `demandaIds`, montar o comando com `--demanda-ids 1,2,3` (em vez de `--atribuicao/--since`). Passar `--defensor-id` a partir de `defensorId`. Documentar o contrato no `m4-setup`.

- [ ] **Step 2: Validar com 1 demanda (Fábio, id 1368) ANTES de liberar o lote**

Smoke E2E: com o Chromium logado no PJe (modo cdp), disparar pelo card de Fábio → daemon roda `--demanda-ids 1368` → confirmar no banco que a leitura profunda rodou (registro de análise IA criado; `ato`/`prioridade`/`prazo` revisados pela IA; **coluna inalterada**).

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/m4-setup/SKILL.md
git commit -m "docs(m4-setup): contrato demandaIds → --demanda-ids no runner do daemon"
```

---

## Verificação final (gate verde)

- [ ] `python3 -m py_compile` dos dois scripts — exit 0.
- [ ] `python3 -c "import varredura_triagem as v; v._self_test_build_by_ids()"` — OK.
- [ ] `npx vitest run src/lib/trpc/routers/__tests__/intimacoes-varredura-input.test.ts` — PASS.
- [ ] `npx tsc --noEmit` — sem erros novos.
- [ ] Smoke único (Fábio) E2E pelo daemon — ato corrigido, coluna intacta.
- [ ] Smoke lote (2-3 demandas fora da Triagem) — 1 task, todos os IDs, seleção limpa.
- [ ] Revisor adversarial: confere que (a) o filtro de status some SÓ no caminho por-IDs; (b) o fluxo por atribuição segue idêntico; (c) dedup/sessão CDP única preservados; (d) nenhuma mudança de `status`/coluna em nenhum caminho.
