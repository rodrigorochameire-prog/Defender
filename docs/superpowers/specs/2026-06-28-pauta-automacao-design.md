# Spec — Automação da atualização da pauta de audiências

> Data: 2026-06-28 · Autor: Rodrigo Rocha Meire (DPE-BA) + Claude Code
> Status: aprovado para plano de implementação

## 1. Objetivo

Automatizar a atualização da pauta de audiências no OMBUDS, espelhando o pipeline
de importação de intimações (worker browser → staging → revisão → promote), em vez
do fluxo manual atual de copiar/colar o PDF da pauta. O resultado é o mesmo:
audiências criadas/atualizadas na tabela `audiencias`, com reconciliação de
redesignações — porém disparado por um botão (e pronto para um cron futuro).

Nível de automação escolhido: **híbrido** — botão manual com revisão agora; o
mesmo worker/job ficam prontos para um agendamento posterior auto-confirmar.

## 2. Contexto: como funciona hoje (fluxo manual)

Caminho atual: usuário cola o texto da pauta no `pje-agenda-import-modal.tsx` →
o modal faz o parsing em `eventos[]` → `onImport(eventos)` →
`audiencias.importBatch` (tRPC) cria/atualiza audiências e reconcilia.

A qualidade vive em duas camadas:

### Camada 1 — parsing (hoje dentro do componente React)
- `extrairAssistido` / `regexAssistido`: assistido = polo **após " X "**; papéis
  `REU|INVESTIGADO|REQUERIDO|FLAGRANTEADO|RECORRIDO|APELADO|AUTORIDADE`; extrai CPF;
  **filtra não-pessoas** (Ministério, VARA, DEAM, Polícia, "DT ", DELEGACIA,
  "segredo de justiça", `^\d{2}ª DT`); dedup por CPF/nome; Title Case.
- `mapearAtribuicao`: órgão + classe + texto → VVD / Júri / EP / Curadoria /
  Criminal Geral. Regra sutil: **não** classificar "Vara do Júri **e Execuções
  Penais**" como Execução Penal.
- `mapearSituacao` + `detectarSituacao`: ordem importa (redesignada contém
  "designada"; não-realizada contém "realizada").
- `toTitleCase` + `NAME_ACCENTS` (dicionário compartilhado); `detectarSlug` /
  `tipoPorSlug` (tipo de audiência + `duracaoMin`).

### Camada 2 — promote (`audiencias.importBatch`, server) — REUSAR INTACTO
- `statusCanonico` (agendada|redesignada|realizada|cancelada), `mapAtribuicao`,
  `mapArea`.
- Match fuzzy de assistido (`normalizarNome` + `calcularSimilaridade` + CPF) e
  criação de assistido/processo quando não existem.
- Batch pre-fetch (anti N+1) de CPFs e números de processo.
- Reconciliação via `idsParaSuperar` (`src/lib/agenda/reconciliar-pauta.ts`):
  marca como **redesignada** as audiências `agendada`, do mesmo processo, **dentro
  da janela de datas** da pauta, ausentes na nova pauta.

**Implicação de qualidade (crítica):** a reconciliação só é correta se a
importação cobrir **toda a janela** (todas as situações — designada, redesignada,
cancelada). Logo, o worker raspa **tudo no período**, não só "designada".

## 3. Descoberta de origem (PJe)

A pauta está em `https://pje.tjba.jus.br/pje/ProcessoAudiencia/PautaAudiencia/listView.seam`
— uma **tabela HTML filtrável e ordenável** (não só o PDF). Filtros no painel
esquerdo: Jurisdição, Órgão julgador, Magistrado, Conciliador, Situações
(checkboxes: Todas/Designada/Cancelada/Redesignada/Realizada/…), Período (De/Até).
Colunas: Data/hora · Processo · Órgão julgador · Partes · Classe judicial · Tipo
de audiência · Sala · Situação.

Decisão: **raspar a tabela** (como o worker de intimações faz com Expedientes),
não baixar/parsear o PDF. Mais robusto (dado estruturado, sem ruído de PDF e
cabeçalhos repetidos), e a ordenação "mais próxima → mais distante" vira
irrelevante (a data de cada linha é capturada e ordenada no banco/preview).

O PDF (`pje/seam/docstore/document.seam?docId=…`) era apenas o meio manual de
obter o mesmo dado.

## 4. Decisão central — fonte única de verdade do parsing

Os helpers de parsing vivem hoje **dentro** de `pje-agenda-import-modal.tsx`, não
reaproveitáveis no servidor. Reimplementá-los no worker Python criaria uma segunda
fonte de verdade que divergiria com o tempo (perda de qualidade).

**Refatoração (extend-only, não muda comportamento):** extrair os helpers puros
para `src/lib/agenda/parse-pauta.ts` (TS), e:

- O **worker** raspa apenas as **colunas brutas** da tabela → grava em staging.
  Nenhuma regra de negócio no Python.
- O **confirmar** (tRPC, server) reconstrói `eventos[]` a partir das colunas
  usando os **mesmos helpers TS** e chama o **`importBatch` existente**.
- O **modal de texto colado** passa a usar os mesmos helpers → **uma fonte de
  verdade**, exercida pelos dois caminhos.

Como o worker raspa **colunas já separadas**, a derivação é mais simples e
confiável que a de texto corrido (dispensa os 3 métodos de fallback do modal e a
ambiguidade de "qual coluna é qual").

Funções a extrair para `parse-pauta.ts` (puras, testáveis):
- `toTitleCase` (ou reusar de `@/lib/utils/title-case`) + `conectivos`.
- `mapearAtribuicao(orgao, classe, texto)`.
- `extrairAssistidos(partesTexto): AssistidoInfo[]` (regex de papéis + filtro de
  não-pessoas + CPF + dedup).
- `mapearSituacao(situacao)`.
- `linhaParaEvento(cols): ParsedEvento` — monta o `ParsedEvento` a partir das
  colunas estruturadas {dataHora, processo, orgao, partes, classe, tipo, sala,
  situacao}, usando os helpers acima + `detectarSlug`/`tipoPorSlug` + duração.

O `ParsedEvento` e o contrato de `importBatch` **não mudam**.

## 5. Modelo de dados

Nova tabela efêmera `pauta_import_staging` (espelha `pje_import_staging`; sem
ledger — `importBatch` já é idempotente e reconcilia por processo+data+tipo):

| coluna | tipo | nota |
|---|---|---|
| `id` | serial PK | |
| `job_id` | int FK `claude_code_tasks` | |
| `atribuicao` | varchar | unidade de origem (VVD_CAMACARI/JURI_CAMACARI) |
| `data_audiencia` | timestamp | data+hora da linha |
| `processo_numero` | varchar | CNJ |
| `orgao_julgador` | text | bruto |
| `partes_raw` | text | célula "Partes" bruta |
| `classe_raw` | text | célula "Classe" |
| `tipo_raw` | text | célula "Tipo de audiência" |
| `sala` | varchar | |
| `situacao` | varchar | designada/redesignada/cancelada/… |
| `content_hash` | varchar | sha256(processo|data|tipo|situacao) p/ dedup intra-job |
| `selected` | boolean default true | |
| `revisao` | jsonb | edições do usuário no preview |

**Sem ledger** (diferença proposital vs. intimações): audiência é entidade com
estado; `importBatch` + `idsParaSuperar` já tratam dedup/atualização/reconciliação.

## 6. Worker `importar_pauta.py` (browser lane)

Espelha `pje_intimacoes_import.py`. Reusa `load_env`, `Supabase`, attach CDP e o
padrão de navegação JSF por texto (sem IDs JSF). Para cada unidade do
`ATRIB_UNIDADE` (mesmo mapa de intimações: VVD Camaçari + Vara do Júri e Execuções
Penais Camaçari):

1. Navega `PautaAudiencia/listView.seam`.
2. Seta filtros: Jurisdição (comarca), Órgão julgador (unidade), **Situações =
   Todas**, Período (De/Até — default hoje → +60d, recebidos via CLI). Ordenação é
   indiferente (capturamos a data por linha).
3. Clica PESQUISA.
4. Raspa as linhas da tabela (com paginação) — colunas brutas.
5. Grava em `pauta_import_staging` (uma linha por audiência); `content_hash` evita
   duplicatas intra-job.
6. Atualiza `claude_code_tasks` (etapa/status/resultado), com status por unidade.

CLI: `--job-id`, `--atribuicoes`, `--since`, `--until`, `--modo cdp|direct`.

**NUNCA** escreve em `audiencias`/`assistidos`/`processos` — só staging + task.

Seletores da tabela serão validados ao vivo na implementação (mesmo método usado
para a tabela de Expedientes).

## 7. tRPC `pauta.*`

- `criarImportJob({ atribuicoes, since?, until? })` → enfileira task
  `skill='importar-pauta'`, `lane='browser'`. Retorna `jobId`.
- `listStaging({ jobId })` → status do job + linhas de staging **já derivadas**
  pelos helpers de `parse-pauta.ts` (preview rico: assistido, tipo, atribuição,
  situação) + contagem de reconciliação prevista (quantas existentes na janela
  ficariam órfãs).
- `confirmarImport({ jobId, selectedIds, edits? })` → aplica edições no staging,
  monta `eventos[]` via `parse-pauta.ts`, chama `audiencias.importBatch(eventos)`
  (que reconcilia sozinho), e retorna `{ importadas, atualizadas, reconciliadas,
  ignoradas }`.

## 8. Daemon

Registrar `importar-pauta` no `SKILL_REGISTRY` de `browser-broker-daemon.mjs`
(`interactive: true`, igual a `pje-intimacoes-import`), apontando para o
interpretador venv + `importar_pauta.py` com timeout ~30 min.

## 9. UI/UX (Padrão Defender v5)

Branco + shadow, neutro, cor só funcional, Lucide, sem o azul pesado do modal
atual.

**Entrada:** botão ícone-only no header da Agenda (Row 1), `RefreshCw`, tooltip
"Atualizar pauta".

**Modal** com segmented control monocromático: **"Do PJe (automático)"**
(primário) e **"Colar texto"** (fallback — o parser atual, agora sobre
`parse-pauta.ts`).

Modo "Do PJe":
- **Unidades**: chips com realce na cor funcional (amber VVD, emerald Júri/EP),
  ambas marcadas por padrão.
- **Período**: dois date inputs `bg-white rounded-lg focus:ring-emerald`, default
  hoje → +60d, editáveis ("próximos 60 dias" como helper).
- Botão primário **"Atualizar"** (emerald, `RefreshCw`).
- **Rodando**: faixa de progresso com status por unidade (spinner neutro), igual
  ao worker de intimações.

Preview:
- Stats inline: `N encontradas · X novas · Y já na agenda · Z p/ reconciliar`.
- **Callout de reconciliação** (se Z>0): card amber discreto — "Z audiência(s)
  serão marcadas como redesignada (slot antigo superado)", com lista expansível.
  Visível **antes** de confirmar.
- **Lista agrupada por dia**, do mais próximo ao mais distante; section divider de
  data centralizado. Mini-card por audiência: barra lateral = atribuição; linha 1
  = horário (mono) · badge tipo · **assistido**; linha 2 = processo (mono) · badge
  situação (designada=neutro, redesignada=amber, cancelada=red); checkbox (tudo
  marcado por padrão).
- Rodapé sticky: **"Importar N selecionadas"** (emerald) + Cancelar.

Resultado: toast/resumo — `N importadas · M atualizadas · K reconciliadas`.

Checklist v5: Lucide (sem emoji), `cursor-pointer`, hover 150–200ms, cards
`bg-white shadow-sm`, fundo neutral-100, cor só funcional, responsivo, WCAG AA,
dropdowns via portal se houver.

## 10. Tratamento de erros

- Sessão PJe caída / não logado → task `failed` com etapa orientando login (o
  worker é `interactive`; só roda na máquina com 2FA, como intimações).
- Modal de resultado/filtro do PJe travando → reusar a estratégia robusta de
  dispensa de modal já criada para a varinha (X → Esc → poll).
- Worker nunca escreve em tabelas finais; falha deixa staging parcial marcado pelo
  `job_id` (descartável).
- `confirmarImport` roda em transação (como `importBatch` hoje).

## 11. Testes

- **Unit** em `parse-pauta.ts` com casos reais da pauta de Camaçari:
  - "Em segredo de justiça - CPF: … (REQUERENTE) X NOME (REQUERIDO)" → assistido =
    o requerido, não o segredo.
  - múltiplos réus ligados por "e" → ambos extraídos, sem o "e" no nome.
  - AUTORIDADE no polo passivo (após o X) capturado; AUTORIDADE no polo ativo
    (antes do X, MP) ignorado.
  - "Vara do Júri e Execuções Penais" → atribuição Júri, não EP.
  - situação redesignada/não-realizada não caindo em designada/realizada.
- **Mapeamento coluna→evento** (`linhaParaEvento`): colunas estruturadas →
  `ParsedEvento` correto.
- Worker: testes dos helpers puros (sem Playwright), como em
  `pje_intimacoes_import` (normalize/hash).

## 12.1 Notas de implementação (refinamentos da revisão do spec)

Pontos verificados contra o código real, a observar no plano:

1. **Shape de retorno do `importBatch`.** Ele retorna
   `{ superados, importados, duplicados, atualizados, duplicadosProcessos,
   assistidosCriados }`. O `confirmarImport` faz um **remap** para a UI:
   `importadas←importados`, `atualizadas←atualizados`,
   `reconciliadas←superados`, `ignoradas←duplicados`. Nenhum campo passa direto
   sem mapeamento.

2. **Seleção parcial vs. janela.** O `importBatch` deriva a janela de
   reconciliação e o conjunto de processos tocados a partir dos `eventos` que
   **efetivamente recebe**. Se o usuário desmarcar linhas no preview, o número de
   "reconciliadas" realizado diverge do `Z` previsto por `listStaging`. Decisão:
   o callout `Z` é **recalculado a partir da seleção atual** (desmarcar um processo
   = seu slot antigo não será superado, e o callout reflete isso). Default: tudo
   marcado.

3. **Janela derivada dos eventos, não do período de scrape.** A janela de
   reconciliação vem do min/max das datas dos **eventos importados**, não do
   `--since/--until`. Caso de borda pré-existente (herdado do `importBatch`
   reusado, não uma regressão): um slot fantasma cuja data antiga seja posterior a
   todos os eventos raspados fica fora da janela e não é superado. Apenas
   documentar; não tratar como bug novo.

4. **Como chamar o `importBatch` no servidor.** O `confirmarImport` deve invocar a
   lógica via **função compartilhada extraída**, não chamar o procedure tRPC
   servidor-a-servidor. Seguir exatamente o padrão de `intimacoes.confirmarImport`
   como referência de estruturação.

## 12. Fora de escopo (YAGNI)

- Cron/agendamento automático (o worker+job ficam prontos; ligar depois).
- Ledger de pauta (desnecessário — `importBatch` reconcilia).
- Descoberta dinâmica de todas as unidades (fixado em VVD + Júri/EP por ora).
- Parsing de PDF (substituído por scraping da tabela).
