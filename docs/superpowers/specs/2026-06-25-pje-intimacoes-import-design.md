# Importação de Intimações do PJe por Atribuição — Design

> **Data:** 2026-06-25
> **Branch alvo:** a definir (feature branch a partir de `main`)
> **Status:** Design aprovado (brainstorm) — pendente revisão de spec e plano de implementação

## 1. Problema

Hoje, gerar demandas a partir das intimações/expedientes do PJe é manual: o(a) defensor(a) loga no PJe, abre o **Painel do Defensor → EXPEDIENTES**, **copia e cola** os expedientes de cada atribuição no `PJeImportModal`, revisa duplicidades e importa. É repetitivo, sujeito a erro e lento.

Queremos um **botão na página de demandas** que faça isso com poucos cliques, usando a infraestrutura de automação já existente (daemon + Claude Code/scrapers, custo zero via Claude Max), com:

- importação **por atribuição** (escolher quais: VVD, Júri; Execução Penal adiada);
- **scraping** dos expedientes replicando o que é feito manualmente;
- uma **página de staging** indicando quais demandas foram triadas e quais serão efetivamente inseridas, **evitando duplicidades** e intimações já inseridas antes;
- possibilidade de indicar o **intervalo** a importar e outras variáveis (limite, status destino);
- estrutura **segura e eficiente**, sem corromper a tabela `demandas` em caso de scrape falho.

## 2. Decisões (brainstorm)

| Decisão | Escolha |
|---|---|
| Modelo de commit | **Página de staging → usuário confirma → insere** (nada é escrito até aprovação) |
| Acesso ao PJe | **Híbrido**: CDP (Chromium já logado) primeiro, fallback login headless com credenciais |
| Dedup / histórico | **Tabela ledger dedicada (lean)** — memória permanente de toda intimação vista |
| Escopo | **VVD + Júri agora**; Execução Penal adiada (skill de classificação EP é follow-up) |

## 3. Princípio de arquitetura

**Python raspa e faz staging; TypeScript deduplica, confirma e insere.** Nada toca a tabela `demandas` até a aprovação do usuário. Isola o scraping (frágil: DOM do PJe, sessão, bot-detection) do caminho autoritativo de escrita, e reusa o parser/serviço de import já confiáveis.

```
Demandas page
  └─ ImportDropdown → "Importar Intimações do PJe" (nova entrada)
       modal: atribuições [✓ VVD] [✓ Júri] [ EP — em breve ]
              intervalo (de/até ou "últimos N dias") · limite · status destino (5_TRIAGEM)
           │ trpc intimacoes.criarImportJob(...)
           │   → dedup: nenhum job ativo p/ mesma atribuição
           │   → INSERT claude_code_tasks (lane='browser', skill='pje-intimacoes-import', payload)
           ▼
Daemon (browser lane, Supabase Realtime)
  └─ spawn pje_intimacoes_import.py
       1. acesso PJe HÍBRIDO: CDP :9222 → fallback login headless
       2. Painel do Defensor → EXPEDIENTES, filtra atribuição + intervalo + limite
       3. extrai cada expediente (DOM): processo, assistido, ato, datas, prazo, conteúdo, pjeDocumentoId
       4. decisão RÁPIDA via ledger (exato): nova / duplicada / já-importada  (Layer A)
       5. grava em pje_import_staging (NÃO em demandas)
       6. heartbeat task.etapa (~30s) → UI mostra progresso
           │ Realtime: task completed
           ▼
Staging page  /admin/demandas/importar/[jobId]
  • na carga: dedup FUZZY (TS verificarDuplicatas contra demandas vivas)  (Layer B)
  • resumo: raspadas N · novas M · duplicadas D · já importadas K  (por atribuição)
  • tabela agrupada por atribuição, 1 linha/intimação:
      badge NOVA / JÁ IMPORTADA / DUPLICADA / POSSÍVEL DUP · campos editáveis
      · link p/ demanda existente · checkbox (NOVA pré-marcada)
  • [Confirmar importação]
           │ trpc intimacoes.confirmarImport({ jobId, selectedIds, edits })
           ▼
  importarDemandas()  → cria demandas em 5_TRIAGEM (importBatchId=jobId)
                      → grava ledger p/ TODOS os itens (imported/skipped/duplicate)
                      → marca job concluído
```

### Reuso (sem alteração)
- Daemon `claude_code_tasks` (lane/lock/zombie-reaper), padrão Realtime de `preparar-audiencias`.
- Serviço `importarDemandas()` e `verificarDuplicatas()` (`src/lib/services/pje-import.ts`, `src/lib/pje-parser.ts`).
- Componente de tabela de revisão do `PJeImportModal`.
- Firewall anti-API-paga do daemon.

### Peças novas
- Entrada no `ImportDropdown` + modal de configuração da importação.
- Worker de scraping `scripts/pje_intimacoes_import.py` (espelha `varredura_triagem.py`).
- Skill `.claude/skills-cowork/pje-intimacoes-import/` (SKILL.md + references) + registro no `browser-broker-daemon.mjs`.
- Duas tabelas: `pje_import_staging` (efêmera), `pje_intimacoes_ledger` (permanente).
- Página de staging `/admin/demandas/importar/[jobId]`.
- Duas procedures tRPC: `intimacoes.criarImportJob`, `intimacoes.confirmarImport`.

## 4. Modelo de dados

### `pje_import_staging` — efêmera, 1 linha por expediente raspado

```
id                serial PK
jobId             text          -- = claude_code_tasks.id
atribuicao        atribuicaoEnum
processoNumero    varchar
assistidoNome     text
ato               text
tipoDocumento     text
dataExpedicao     timestamp
dataIntimacao     timestamp
prazo             date
conteudo          text          -- expediente completo (audit + reparse)
pjeDocumentoId    varchar       -- chave forte de dedup
contentHash       varchar(64)   -- sha256(processo+doc+conteudo_normalizado), fallback
decisao           stagingDecisaoEnum  -- 'nova' | 'duplicada' | 'ja_importada' | 'incerta'
matchedDemandaId  integer NULL
matchedLedgerId   integer NULL
selected          boolean       -- default true só para 'nova'
revisao           jsonb NULL    -- edições do usuário na página
createdAt         timestamp
```

Escrita pelo worker. Após confirm, pode ser podada (ex.: reter 30 dias para auditoria, depois apagar).

### `pje_intimacoes_ledger` — permanente

```
id                serial PK
pjeDocumentoId    varchar       -- unique (quando presente)
contentHash       varchar(64)   -- unique fallback quando pjeDocumentoId IS NULL
processoNumero    varchar
processoId        integer NULL
atribuicao        atribuicaoEnum
decisao           ledgerDecisaoEnum  -- 'imported' | 'skipped' | 'duplicate'
demandaId         integer NULL  -- setado quando imported
firstSeenAt       timestamp
lastSeenAt        timestamp     -- bump a cada reaparição em scrape
jobId             text          -- último job que tocou
```

Índices: unique em `pjeDocumentoId`; unique parcial em `contentHash WHERE pjeDocumentoId IS NULL`. É a tabela que faz uma intimação **skipped** parar de reaparecer, e que sobrevive ao arquivamento/exclusão de uma demanda.

## 5. Dedup em duas camadas (barato → rico)

1. **Layer A — ledger-exato (Python, no scrape).** Para cada expediente: `pjeDocumentoId` (ou `contentHash`) já no ledger? Se sim → `ja_importada`/`duplicada` (carrega `demandaId` anterior). Lookup determinístico; mata o "mesmo ruído todo scrape".
2. **Layer B — fuzzy ao vivo (TS, na carga da página).** Para linhas ainda `nova`, roda `verificarDuplicatas()` contra demandas **vivas**: mesmo processo + data próxima, ou processo + janela 30 dias + similaridade de nome > 0.85. Acerto rebaixa a linha para `incerta` com link à demanda candidata. Lógica atual, sem mudança, aplicada a linhas staged.

Badge resultante: `NOVA` (passou A e B) · `JÁ IMPORTADA` (ledger imported) · `DUPLICADA` (ledger dup ou B-exato) · `POSSÍVEL DUP` (B-fuzzy). Só `NOVA` é pré-marcada.

**Subtileza:** nem todo expediente expõe `pjeDocumentoId` limpo no DOM — por isso `contentHash` é a chave única de fallback, para o dedup nunca falhar "aberto".

## 6. Worker de scraping (`pje_intimacoes_import.py`, browser lane)

Modelado em `varredura_triagem.py` (já resolve CDP attach, navegação PJe, escrita Supabase).

**Acesso — híbrido, fail-loud:**
1. CDP attach `http://127.0.0.1:9222` (Chromium logado); verifica sessão viva (elemento logado presente).
2. Sem CDP/não logado → Chromium headless + login com `PJE_CPF`/`PJE_SENHA`.
3. Ambos falham → task `failed`, `etapa = "Abra o PJe logado ou configure credenciais"`. Nunca raspa silenciosamente vazio.

**Extração — Painel do Defensor → EXPEDIENTES:**
- Uma passada por atribuição selecionada (mapear `VVD_CAMACARI`/`JURI_CAMACARI` aos filtros de competência/órgão do painel).
- Aplicar intervalo (de/até ou "últimos N dias") e limite de itens do payload.
- Por expediente, extrair **campos estruturados do DOM** (mais robusto que copy-paste): processo, assistido, tipo de documento/ato, data expedição, data intimação, prazo, conteúdo, `pjeDocumentoId` quando presente.
- `contentHash = sha256(processo + pjeDocumentoId + conteudo_normalizado)`.
- Layer-A ledger lookup → set `decisao` → INSERT em `pje_import_staging`. Bump `lastSeenAt` em hits de ledger.
- Heartbeat `task.etapa` a cada ~30s (`"VVD: 14/40 expedientes…"`). Reaper de 35 min é o backstop.

**Limitado por design:** intervalo + limite de itens limitam cada execução; scrape mal configurado não dispara em fuga.

## 7. Página de staging (`/admin/demandas/importar/[jobId]`)

- **Em execução:** view de progresso assinada à task row (Realtime) — `etapa`, contagem, por atribuição (padrão de `preparar-audiencias`).
- **Concluída:** carrega staging → roda **Layer-B fuzzy** (TS) → renderiza.
  - **Barra de resumo:** `raspadas N · novas M · duplicadas D · já importadas K`, por atribuição.
  - **Tabela agrupada** (por atribuição), 1 linha/expediente, reusando a tabela de revisão do `PJeImportModal`:
    - Badge: `NOVA` · `JÁ IMPORTADA` · `DUPLICADA` · `POSSÍVEL DUP` (link p/ demanda #X).
    - Campos editáveis inline (match de assistido, ato, prazo, atribuição) → gravados em `staging.revisao`.
    - Checkbox por linha; **só NOVA pré-marcada**. Ação em lote "selecionar todas as novas".
  - **Filtros:** mostrar/ocultar duplicadas, filtrar por atribuição.
- **[Confirmar importação]** → `intimacoes.confirmarImport({ jobId, selectedIds, edits })`:
  1. Monta rows dos itens selecionados (+ edições) e chama `importarDemandas()` → demandas em `5_TRIAGEM` com `importBatchId = jobId`.
  2. Upsert no ledger para **todo** item staged: selecionado→`imported` (+`demandaId`), desmarcado-conhecido→`skipped`, dups→`duplicate`.
  3. Marca job concluído; toast de resultado (`12 importadas, 3 puladas`).

**Após o import:** as novas demandas entram no fluxo normal de triagem — `varredura-triagem` classifica fase/ato como hoje. Esta feature é dona de *trazê-las limpas e sem duplicidade*; a classificação permanece onde já vive.

## 8. Erros & segurança

- Scrape falho → staging guarda linhas parciais + banner de erro; usuário re-roda o job. Nada em `demandas`.
- Dedup de job: nenhum import concorrente para a mesma atribuição (via `activeBlockers` do `task-lifecycle`).
- Re-rodar scrape é seguro — ledger + staging dão upsert por `pjeDocumentoId`/`contentHash`, sem linhas duplicadas.
- Credenciais só no caminho de fallback; CDP preferido. Firewall anti-API-paga já garantido pelo daemon.
- Intervalo + limite de itens limitam cada execução.

## 9. Fora de escopo (follow-ups)

- **Skill de classificação de Execução Penal** (fase de execução, atos típicos: progressão, livramento, falta grave) — separada, depois.
- Importação **agendada/automática** (cron sem revisão) — esta entrega é sempre review-then-commit.
- Classificação fase/ato no momento do import — permanece em `varredura-triagem`.

## 10. Specs relacionadas

- `2026-04-06-pje-scan-intimacoes-design.md` — scan/scraping de intimações anterior (verificar reuso/sobreposição).
- `2026-06-03-preview-importacao-classificacao-design.md` — preview de importação/classificação (reusar padrões de UI).
- `2026-04-06-pje-import-modal-redesign-design.md` — modal de import atual (componente de tabela a reusar).
