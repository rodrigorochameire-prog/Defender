# Re-análise de demandas sob demanda (gatilho por demanda na leitura profunda)

**Data:** 2026-06-29
**Status:** Design aprovado (decisões do usuário registradas) — aguardando revisão do spec
**Autor:** Claude + Rodrigo
**Base / estende:**
- `2026-06-27-analise-profunda-intimacao-design.md` (v1 entregue)
- `2026-06-28-melhorias-analise-intimacao-v2-design.md` (v2 entregue)
- skill `varredura-triagem` (`varredura_triagem.py`) + skill `analise-intimacao` (lane=ai)
- router `intimacoes` (`criarVarreduraJob` / `statusVarredura`) + `VarreduraTriggerModal`

---

## Problema / objetivo

O pipeline de **leitura profunda** (varredura nível 2/3) já existe e funciona: lê o corpo do
expediente no PJe, classifica o `ato`, define `prioridade`/`prazo`, executa side-effects
(agendar/reagendar audiência via `designacao_parse.py`, medidas MPU via `mpu_parse.py`,
contato do assistido em resposta à acusação) e enfileira uma task de IA (`analise-intimacao`)
que escreve o resumo interpretativo e — na v2 — **sugere/corrige o `ato`** com confiança.

**Porém o pipeline só varre demandas em `status in (5_TRIAGEM, URGENTE)`**
(`varredura_triagem.py:211`, `list_demandas`). Isso cria um catch‑22:

> O **import** classifica o `ato` apenas por **metadados** (tipo do documento), nunca pelo
> conteúdo (`pje-parser.ts:1581` → `'Ciência'`; `intimacaoToImportRow`). Um expediente que
> é `Decisão` no PJe vira `ato="Ciência de decisão"` e a demanda é roteada para fora da
> Triagem (PREPARAÇÃO/ANALISAR). A leitura profunda — que corrigiria a classificação — **só
> roda na Triagem**. A demanda mal classificada fica escondida da própria correção.

### Casos reais que motivaram (2026-06-29)
1. **Fábio Pinheiro de Jesus** (`8014218-85.2025.8.05.0039`): intimação de recebimento da
   denúncia + ordem de **apresentar defesa preliminar (resposta à acusação)**. Import marcou
   `ato="Ciência de decisão"` e mandou para PREPARAÇÃO/ANALISAR. O prazo **urgente de 10 dias**
   fica invisível. A leitura profunda nunca o tocou (não está na Triagem).
2. **Designação de audiência não identificada**: o mesmo mecanismo — a designação só foi
   detectada quando o usuário criou o registro de ciência manualmente; a varredura automática
   não rodou na demanda por estar fora da Triagem.

### Objetivo
Dar ao pipeline existente um **gatilho por demanda(s)**: selecionar 1+ demandas em qualquer
coluna e rodar a leitura profunda **só nelas**, ignorando o filtro de status. Isso fecha o
catch‑22 sem mover a demanda no quadro.

---

## Decisões do usuário (2026-06-29)

| # | Decisão | Valor |
|---|---|---|
| Q1 | Fonte do conteúdo | **Híbrido**: daemon busca no PJe (Phase 1); cola manual de fallback (Phase 2) |
| Q2 | Aplicação das mudanças | **Auto-aplica, com flag de revisão** em baixa confiança (já é o comportamento do `write_analise.py`: só aplica ato em `confianca=alta` + ato genérico) |
| Q3 | Posição no quadro | **Só prioridade/prazo, NÃO move coluna/status** (já é o comportamento da varredura) |
| Q4 (revisada) | Motor de análise | **Reusar o pipeline Python+IA existente** e dar gatilho por demanda. **NÃO** portar o classificador para TS (seria reescrever pipeline maduro + abandonar v2). |
| — | Ajuste do import | **Fora de escopo** nesta rodada (usuário optou por não rotear "Ciência de decisão" para a Triagem automaticamente). |

---

## Non-goals (explícitos)
- **Não** portar o classificador para TS (decisão Q4 revisada).
- **Não** alterar `status`/coluna da demanda (só `ato/tipo_ato/prioridade/prazo` + registros + audiência).
- **Não** alterar o roteamento do import.
- **Não** mexer no GCal sync (a audiência entra em `audiencias`; sync com Google segue como hoje).

---

## Estado atual (o que já existe — reusar)

| Componente | Papel | Arquivo |
|---|---|---|
| `criarVarreduraJob` | Enfileira task lane=browser (1 por atribuição), payload em `instrucaoAdicional` | `src/lib/trpc/routers/intimacoes.ts:463` |
| `statusVarredura` | Status/etapa/resultado p/ poll da UI | `src/lib/trpc/routers/intimacoes.ts:523` |
| `VarreduraTriggerModal` | Modal global "Analisar triagem"; poll + invalida kanban | `src/components/demandas-premium/varredura-trigger-modal.tsx` |
| `varredura_triagem.py` | Lê PJe, classifica, side-effects, enfileira IA | `.claude/skills/varredura-triagem/scripts/varredura_triagem.py` |
| `list_demandas` | **Filtra `status in (5_TRIAGEM,URGENTE)`** + `atribuicao/since/limit` | idem `:206` |
| `analise-intimacao` | Task IA: resumo + `ato_sugerido`/`ato_confianca` | `.claude/skills-cowork/analise-intimacao/scripts/write_analise.py` |

---

## Design

### 1. Backend — escopo por demanda

#### 1a. Script: novo modo `--demanda-ids`
`varredura_triagem.py`:
- Novo arg `--demanda-ids` (CSV de inteiros). Mutuamente exclusivo com `--atribuicao/--since`.
- Novo método `list_demandas_by_ids(ids: list[int])`: mesmo `select` de `list_demandas`,
  porém o `where` é **`id=in.(...)` + `deleted_at=is.null` + `defensor_id=eq.<DEFENSOR_ID>`**.
  **Remove o filtro de status** — analisa a demanda em qualquer coluna.
- `main()`: se `args.demanda_ids` presente → `sb.list_demandas_by_ids(ids)`; senão fluxo atual.
- `print` de alvo ajustado: "alvo: N demandas (selecionadas)".
- Todo o resto (classify, side-effects, enfileiramento IA, idempotência) é **inalterado** —
  opera sobre a lista de demandas, seja qual for a origem.

#### 1b. Router: `criarVarreduraJob` aceita `demandaIds`
`intimacoes.ts:criarVarreduraJob`:
- **Mudança de schema (obrigatória):** hoje `atribuicoes: z.array(...).min(1)` é **required**.
  Passa a ser **opcional**, e adiciona-se `demandaIds: z.array(z.number().int()).min(1).max(50).optional()`,
  com um `.refine(...)` que exige **exatamente um** dos dois presente (XOR):
  ```ts
  z.object({
    atribuicoes: z.array(z.enum(ATRIBUICOES_PERMITIDAS)).min(1).optional(),
    demandaIds: z.array(z.number().int()).min(1).max(50).optional(),
    since: z.string().optional(),
    limit: z.number().int().min(1).max(500).optional(),
  }).refine(
    (v) => Boolean(v.atribuicoes?.length) !== Boolean(v.demandaIds?.length),
    { message: "Informe atribuicoes OU demandaIds (exatamente um)." },
  )
  ```
  Isso resolve a contradição: `mutate({ demandaIds: [...] })` (sem `atribuicoes`) passa a validar.
- Quando `demandaIds` presente:
  - Enfileira **UMA** task (não 1 por atribuição — os IDs já delimitam o alvo).
  - `instrucaoAdicional` carrega `{ demandaIds, modo: "cdp", defensorId }` (sem `atribuicao/since`).
  - `prompt`: `"Leitura profunda — N demandas selecionadas (lane browser)"`.
- Quando ausente (`atribuicoes` presente): comportamento atual (por atribuição) intacto.
- **Dedup/concorrência:** mantém o dedup atual (bloqueia se já houver varredura-triagem
  `pending/processing`) — o daemon usa **uma** sessão CDP, então execuções simultâneas
  brigariam pelo browser. Per-demanda respeita a mesma trava (retorna `existing` se houver job ativo).
  **UX (§2a/§2c):** quando o retorno é `existing`, exibir toast "Já há uma análise em andamento"
  (igual ao `VarreduraTriggerModal`) para o clique no card não parecer no-op.

#### 1c. Contrato com o daemon (dependência externa)
O daemon (Mac mini M4) lê `claude_code_tasks` e monta o comando do script a partir de
`instrucaoAdicional`. **Mudança no daemon:** quando o payload tiver `demandaIds`, passar
`--demanda-ids 1,2,3` em vez de `--atribuicao/--since`. Documentar no `m4-setup`.
> ⚠️ Sem essa mudança o gatilho enfileira mas o daemon roda o modo antigo. É o único ponto
> fora deste repo; tratar como pré-requisito de entrega.

### 2. UI — dois gatilhos

#### 2a. Demanda única (sheet)
No drawer/sheet da demanda, ação **"Analisar (leitura profunda)"** →
`criarVarreduraJob.mutate({ demandaIds: [demanda.id] })`. Reaproveita o padrão de
`VarreduraTriggerModal`: toast "Análise iniciada", poll de `statusVarredura`, ao concluir
invalida `demandas.list` (e o sheet refetch). Botão fica em estado "Analisando…" enquanto o
job está `pending/processing`.

#### 2b. Lote (kanban)
O kanban (`demandas-premium-view.tsx`) não tem multi-seleção hoje. Adicionar:
- **Modo seleção**: checkbox por card (ou clique com modificador) acumulando `Set<number>`.
- **Barra de ação** flutuante "Analisar selecionadas (N)" → `criarVarreduraJob({ demandaIds: [...] })`.
- Limite de 50 (alinhado ao `.max(50)` do input). Acima disso, avisar.
- Reusa o mesmo poll/invalidate.

#### 2c. Feedback de progresso
Reaproveita `statusVarredura` (já existe). Indicador "Analisando…" no card/sheet enquanto
`pending/processing`. Ao concluir: toast + invalida kanban. Em baixa confiança, a própria
demanda fica com sinalização de **revisão pendente** (ver §3).

### 3. Confiança e revisão (reuso, sem código novo de motor)
- `write_analise.py` já só aplica `ato_sugerido` quando `ato_confianca='alta'` **e** o ato atual
  é genérico (`ATO_GENERICO`) — nunca sobrescreve ato específico. Mantido.
- Baixa/média confiança: o ato não é trocado e o resumo IA registra a incerteza. A coluna
  `demandas.revisao_pendente` **já existe** (`core.ts:353`, `notNull default false`), então é
  tarefa pequena e definitiva: `write_analise.py` seta `revisao_pendente=true` quando
  `ato_confianca in (media, baixa)` e o card renderiza um selo "revisar". (Sem migração.)

### 4. Phase 2 — cola manual (fallback do híbrido)
Entrada "Colar texto" no sheet da demanda: usuário cola o conteúdo do expediente →
mutation (web, sem daemon) que grava o texto como `registro.enrichment_data.raw_text`,
roda os parsers determinísticos (designação/MPU já portados em Python — aqui precisaríamos
de um caminho que reuse o pipeline; **decisão de implementação na Phase 2**: enfileirar a
mesma task IA com `raw_text` já preenchido, pulando o scraping) e marca `enrichment_status`.
Mantida **separada e posterior** ao Phase 1 (YAGNI: Phase 1 já resolve Fábio e a audiência).

---

## Idempotência (preservada — já existe no pipeline)
- Registro base: `registro_exists(demanda_id, titulo)` evita duplicar.
- Audiência: chave `(processo_id, data_audiencia, tipo)`; redesignação cancela só as do mesmo
  tipo antes de inserir (`designacao_parse.py` + `aplicar-designacao-audiencia.ts`).
- Medidas MPU: `status=eq.ativa` na revogação; não rebaixa revogadas.
- Re-rodar a leitura profunda na mesma demanda **não duplica** nem regride.

---

## Verificação / testes
- `python3 -m py_compile varredura_triagem.py` limpo.
- Self-test do novo `list_demandas_by_ids`: monta a URL com `id=in.(...)` e **sem** filtro de
  status (assert na query string).
- `npx tsc --noEmit` limpo (input do router).
- Teste do router: `criarVarreduraJob({ demandaIds: [x] })` insere 1 task com
  `instrucaoAdicional.demandaIds = [x]` e sem `atribuicao`.
- Smoke manual: selecionar Fábio → "Analisar" → daemon roda `--demanda-ids` → ato vira
  "Resposta à Acusação" (alta confiança, ato atual genérico), prazo 10d, prioridade URGENTE,
  registro IA criado, **coluna inalterada**.
- Revisor adversarial: confere que (a) o filtro de status some só no caminho por-IDs;
  (b) o caminho por atribuição segue idêntico; (c) dedup/concorrência preservados;
  (d) nenhuma mudança de `status`/coluna.

---

## Riscos / questões abertas
1. **Daemon command mapping (§1c)** — pré-requisito fora do repo. Sem ele, o gatilho não
   executa o modo novo. Mitigar: documentar no `m4-setup` e validar com 1 demanda antes de
   liberar o lote.
2. **Sessão CDP única** — só um job por vez (dedup mantido). Lote grande = 1 job sequencial.
3. **Demandas de atribuições diferentes no mesmo lote** — o script por-IDs não usa
   `--atribuicao`, então funciona; a classificação por atribuição vem do `processos.atribuicao`
   de cada demanda (o `select` já traz). Verificar que `classify`/vocabulário usa a atribuição
   da demanda, não um global.
4. **`max(50)`** — teto pragmático p/ não estourar uma sessão CDP longa; ajustável.

---

## Anexo — correção já aplicada (relacionada, fora do escopo do feature)
Durante o diagnóstico, corrigida a **regressão do sheet de audiências**
(`src/app/(dashboard)/admin/audiencias/page.tsx`): removido o teto `limit: 500` (com a tabela
> 600 linhas e ordem ASC, as audiências futuras/auto-agendadas caíam fora da janela) +
tradução de status canônico (`agendada → DESIGNADA`, etc.) para casar coluna do Kanban e KPIs.
