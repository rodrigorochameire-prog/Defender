# Importação automatizada de intimações da Execução Penal (SEEU) → Triagem

**Data:** 2026-07-01
**Autor:** Rodrigo Rocha Meire (via Claude Code)
**Status:** Design aprovado — pendente spec review

---

## 1. Contexto e motivação

As intimações de **Execução Penal (EP)** não passam pelo PJe. Elas vivem no **SEEU**
(Sistema Eletrônico de Execução Unificado, do CNJ), na tela **Mesa do Defensor**
(`seeu.pje.jus.br`), que é um sistema separado com login e DOM próprios.

Hoje o OMBUDS já importa intimações de **VVD** e **Júri** do PJe através de um pipeline
maduro (worker de captura via CDP → `pje_import_staging` → parser TS → promoção para
`demandas`). A camada de **interpretação** (parser TS) e a de **promoção** já sabem lidar
com blocos do SEEU — o que falta é a camada de **captura**: um worker que raspe a Mesa do
Defensor. Este documento projeta essa Fase 1.

### O que já existe (não reconstruir)

| Peça | Arquivo | Estado |
|---|---|---|
| Parser SEEU | `src/lib/pje-parser.ts` (`parseSEEUIntimacoes`, `extrairDadosBlocoSEEU`, `intimacaoSEEUToDemanda`, `isSEEU`, `parseIntimacoesUnificado`) | Completo, mas com **2 bugs** revelados por dados reais (§4) |
| Promoção staging→demanda | `src/lib/services/pje-intimacoes-import.ts` (`intimacaoToImportRow` roteia por `sistema === "SEEU"`) | Pronto |
| Import via `importarDemandas` | `src/lib/services/pje-import.ts` | Pronto |
| Modal manual (copy-paste) | `src/components/demandas-premium/seeu-import-modal.tsx` | Existe (fluxo antigo, não-staging) |
| Biblioteca de domínio EP | `src/lib/services/tribunais/seeu-integration.ts` | Cálculos de pena/benefícios + URLs; `consultarSEEU` é MOCK |
| Atribuição `EXECUCAO_PENAL` | `src/lib/db/schema/enums.ts` (`atribuicaoEnum`) | Standalone, sem sufixo de comarca |

### Achados da inspeção ao vivo (2026-07-01, logado como RODRIGO ROCHA MEIRE / Defensoria Pública de Camaçari - BA)

- **Autenticação:** CNJ Keycloak SSO (`sso.cloud.pje.jus.br`, realm `pje`, client
  `seeu-frontend`). Opções: CPF/CNPJ+senha, Gov.BR, certificado digital. É um desafio JS
  (mesma família que quebrou o login HTTP-puro do PJe) → **login HTTP-puro é inviável;
  usar CDP-attach a um browser logado manualmente** (padrão que já funciona no PJe).
- **Mesa do Defensor é um frame:** `usuario/mesaDefensor1Grau.do`. A página-topo é vazia;
  o conteúdo está nesse iframe.
- **Abas** (links `<a>` sem href — o click submete `mesaDefensor1GrauForm`):
  Manifestação (16), Ciência (11), Pendências de Incidentes, Razões/Contrarrazões (0),
  Lembretes.
- **Filtro "Situação":** Recebidas e não Lidas / Lidas e Aguardando Análise / Aguardando
  Assinatura. A contagem da aba é o total; a lista mostra uma situação por vez.
- **Escopo por área de atuação:** o SEEU já limita os expedientes à área logada
  ("Defensoria Pública de Camaçari - BA"); **não há drill-down de vara** como no PJe.

### Prova de conceito (round-trip validado)

O `innerText` cru do frame `mesaDefensor1Grau.do` já está no formato que
`parseSEEUIntimacoes` espera. Rodando o parser real sobre o texto capturado ao vivo:
`isSEEU: true`, `sistema: SEEU`, **7/7 expedientes** extraídos, gerando demandas
`EXECUCAO_PENAL` com prazo. Isso confirma: a única lacuna é a captura.

---

## 2. Escopo

### Nesta Fase 1 (in scope)
- Corrigir os 2 bugs do parser SEEU (TDD com fixtures reais).
- Tabelas SEEU próprias: `seeu_import_staging`, `seeu_ledger` (migration).
- Worker de captura `seeu-intimacoes-import` (skill + script Python CDP) para as abas
  **Manifestação, Ciência, Razões/Contrarrazões** (mesmo formato de tabela).
- Router tRPC `seeuIntimacoes` (criar job / listar staging / confirmar), reusando a
  promoção existente. Tudo entra em **triagem**, diferenciado pelo **ato**.
- Habilitar `EXECUCAO_PENAL` no gate de atribuições e na UI (modal + página de revisão).

### Fora desta Fase (follow-ups)
- **Fase 1.5 — Pendências de Incidentes:** fluxo diferente (exige selecionar Juízo,
  mostra indicadores em vez da tabela de expedientes). Mapear e integrar depois.
- **Fase 2 — Análise da Triagem de EP (generalizada):** varredura que lê cada intimação
  com cuidado, escreve na demanda um resumo de contexto + o que fazer; quando **não for
  mera ciência**, acopla as skills de **baixar autos + análise completa**
  (`/analise-ep|vvd|juri`) e organiza no Drive. Estende a skill `varredura-triagem`.
  Ganha spec próprio.
- Automação pelo daemon (sessão CDP persistente + relogin) — segue o mesmo caminho do PJe,
  fora de escopo aqui.

### Não-objetivos (YAGNI)
- Nenhuma escrita no SEEU (jamais clicar "Dispensar Juntada", "Analisar", assinar etc.).
- Nenhum cálculo de pena/benefício nesta fase (já existe em `seeu-integration.ts`; é
  insumo da Fase 2, não da importação).
- Sem multi-comarca no worker: a área de atuação do SEEU já resolve o escopo.

---

## 3. Arquitetura

Espelha a arquitetura **captura / interpretação / promoção** do PJe, com fonte de dados e
tabelas próprias do SEEU.

```
[Browser logado no SEEU (CDP)]
        │  (worker anexa, read-only)
        ▼
seeu_intimacoes_import.py  ── CAPTURA ──►  seeu_import_staging   (bloco cru + campos)
   (skill seeu-intimacoes-import)          seeu_ledger           (dedup processo+Seq)
        │
        ▼
router seeuIntimacoes (tRPC)
   criarImportJob → claude_code_tasks (lane=browser, skill=seeu-intimacoes-import)
   listStaging    → parseIntimacoesUnificado(conteudo)  ── INTERPRETAÇÃO ──►
   confirmarImport → intimacaoSEEUToDemanda → importarDemandas  ── PROMOÇÃO ──► demandas (triagem)
        │
        ▼
UI: seeu-import-modal (async) + página de revisão /admin/demandas/importar/[taskId]
```

### 3.1 Fronteiras (o que cada unidade faz)

| Unidade | Faz | Depende de | NÃO faz |
|---|---|---|---|
| `seeu_intimacoes_import.py` | Navega a Mesa (CDP), extrai blocos crus por aba, dedup Layer-A, grava staging | CDP browser logado, Supabase | Interpretar semântica; escrever em `demandas` ou no SEEU |
| Parser SEEU (TS) | `texto → IntimacaoSEEU[] → demanda` | nada (puro) | I/O, rede |
| Router `seeuIntimacoes` | Orquestra job, enriquece staging, promove | parser + `importarDemandas` | Scraping |
| UI modal + revisão | Dispara job, revisa/desmarca, confirma | router | Regra de negócio |

---

## 4. Correção do parser (TDD)

Dados reais expuseram 2 bugs em `extrairDadosBlocoSEEU`/`parseSEEUIntimacoes`. Corrigir
**antes** do worker, dirigido por testes com o texto capturado ao vivo como fixture.

### Bug 1 — Swap de `dataEnvio`/`ultimoDia` (CRÍTICO: corrompe prazo)
`inicioBloco = posicaoProcesso - 50` (linha ~1410) inclui, para linhas após a primeira, o
**último dia da linha anterior** dentro do bloco, que então é lido como a **primeira data**
(dataEnvio) do bloco atual → envio e último dia trocados. Ex. real: Seq 1552 saiu
`env=09/07 ult=29/06` quando o correto é `env=29/06 ult=09/07`.

**Correção:** não recuar 50 chars fixos. Capturar o `Seq` com regex que olha só o trecho
imediatamente anterior ao número do processo (o Seq aparece a ~1–10 chars: `Seq\t\nProcesso`),
sem cruzar a fronteira da linha anterior. Datas passam a vir só do corpo do próprio bloco.

### Bug 2 — Nome do Executado invade `Terceiro:`/`Polo Ativo:`
A regex multi-linha de nome em maiúsculas é gulosa quando há bloco `Terceiro:` logo após
`Executado:`. Ex. real: Seq 1552 saiu `"Nadson Wesley... \n\n\nterceiro"`.

**Correção:** delimitar a captura do nome até o próximo rótulo conhecido
(`Terceiro:`, `Polo Ativo:`, `Polo Passivo:`, `Data de Envio`, ou linha em branco dupla).

### Ruído novo a filtrar
- `[ Dispensar Juntada ]` (aparece nas linhas da aba Ciência).

### Fixtures
Salvar 2 capturas reais como fixtures de teste: aba **Manifestação** (multi-parte, com
`Terceiro:`) e aba **Ciência** (com `[ Dispensar Juntada ]`). Testes asseguram:
datas corretas por linha, nome sem vazamento, `ato` correto por aba, `seq` presente.

---

## 5. Modelo de dados (tabelas próprias)

Migration nova (Drizzle) — sem tocar nas tabelas do PJe.

### `seeu_import_staging`
Espelha `pje_import_staging` + campos ricos do SEEU:

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid pk | |
| `jobId` | fk → `claude_code_tasks.id` | |
| `atribuicao` | atribuicaoEnum | sempre `EXECUCAO_PENAL` (Fase 1) |
| `tab` | text | `manifestacao` \| `ciencia` \| `razoes` (origem) |
| `ato` | text | derivado do `tab` (Manifestação/Ciência/Razões) |
| `processoNumero` | varchar(40) | CNJ |
| `seq` | integer | Seq do SEEU (chave forte junto com processo) |
| `assistidoNome` | text | Executado/Deprecado |
| `classeProcessual` | text | Execução da Pena / Medidas Alternativas / … |
| `assuntoPrincipal` | text | PPL / PRD / ANPP / … |
| `dataEnvio` | timestamp | |
| `ultimoDia` | timestamp | |
| `prazo` | date | último dia normalizado |
| `conteudo` | text | **bloco cru** (fonte da verdade p/ o parser) |
| `contentHash` | varchar(64) not null | fallback de dedup |
| `decisao` | stagingDecisaoEnum default `nova` | |
| `matchedDemandaId` / `matchedLedgerId` | fk nullable | |
| `selected` | bool default false | |
| `revisao` | jsonb | edições do usuário |
| `createdAt` | timestamp | |

Índices: `jobId`, `contentHash`, (`processoNumero`,`seq`).

### `seeu_ledger`
Espelha `pje_intimacoes_ledger`, com a **chave forte = processo+Seq**:

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid pk | |
| `processoNumero` | varchar(40) not null | parte da chave forte |
| `seq` | integer not null | parte da chave forte |
| `contentHash` | varchar(64) not null | fallback |
| `atribuicao` | atribuicaoEnum | |
| `ato` | text | |
| `decisao` | ledgerDecisaoEnum not null | |
| `demandaId` | fk nullable | preenchido na promoção |
| `firstSeenAt` / `lastSeenAt` | timestamp | |
| `jobId` | fk | |

Índices únicos parciais: **único (`processoNumero`,`seq`)**; `contentHash` único como
fallback quando `seq` ausente (não deve ocorrer, mas defende).

---

## 6. Worker `seeu-intimacoes-import`

Nova skill em `.claude/skills/seeu-intimacoes-import/` (SKILL.md + `scripts/seeu_intimacoes_import.py`),
espelhando `pje-intimacoes-import`. Reusa utilidades já provadas (SupabaseExt,
`connect_over_cdp`, `compute_content_hash`, carregamento de `.env`).

> **Dedup NÃO é reuso drop-in.** O `decide_layer_a` do PJe indexa só por `pjeDocumentoId`
> (`by_doc`) e `content_hash` (`by_hash`). O SEEU não tem doc-id; sua chave forte é
> `(processoNumero, seq)`. O worker SEEU precisa de:
> (a) um `load_ledger_index` variante que monte um índice `by_processo_seq` a partir do
>     `seeu_ledger`, e
> (b) um `decide_layer_a` que consulte primeiro `by_processo_seq`, com `by_hash` de
>     fallback. Orçar isso no plano como código novo (pequeno, mas não é cópia direta).

### CLI
```
python3 seeu_intimacoes_import.py --job-id N \
    --atribuicoes EXECUCAO_PENAL \
    [--abas manifestacao,ciencia,razoes] \
    [--situacao "Recebidas e não Lidas"] \
    [--modo cdp] [--limit 200]
```

### Fluxo
1. `connect_over_cdp(CDP_URL)` (porta configurável; default 9222). Se não houver sessão
   SEEU logada → falha ruidosa pedindo login manual (não tenta logar via HTTP).
2. Localizar o frame cuja URL contém `mesaDefensor1Grau.do`.
3. Para cada aba em `--abas`:
   - Clicar o `<a>` da aba por **texto**, via `el.click()` em JS (submete
     `mesaDefensor1GrauForm`) — nunca por ID (padrão anti-frágil já usado no PJe).
   - Aguardar tabela estável (esperar `resultTable` recarregar).
   - Ler `frame.body.innerText` da tabela; derivar `ato` da aba.
   - Paginação: se houver mais páginas, avançar via
     `document.forms['mesaDefensor1GrauForm']` e concatenar (guard anti-loop por Seq visto).
4. Para cada expediente: `decide_layer_a` contra o índice do `seeu_ledger` (chave
   processo+Seq; fallback content_hash). Gravar 1 linha em `seeu_import_staging`
   (`selected = decisao=='nova'`). Se `!= nova`, bump `lastSeenAt` no ledger.
5. Ao fim, atualizar `claude_code_tasks`: `status=completed`,
   `resultado={raspadas, abas, atribuicao}`.

### Invioláveis
- Escreve só em `seeu_import_staging`, `seeu_ledger`, `claude_code_tasks`.
- **Nunca** clica "Dispensar Juntada", "Analisar", assinar, nem navega para peticionar.
- Read-only sobre o SEEU: só leitura de DOM + troca de aba/paginação.

---

## 7. Router, gate e UI

### Router `src/lib/trpc/routers/seeuIntimacoes.ts`
Espelha `intimacoes.ts`, apontando para as tabelas SEEU:
- `criarImportJob({ atribuicoes: ["EXECUCAO_PENAL"], abas?, situacao? })` → insere
  `claude_code_tasks` (`skill: "seeu-intimacoes-import"`, `lane: "browser"`), dedup de job
  ativo. Retorna `{ success, existing, taskId }`.
- `listStaging({ jobId })` → lê `seeu_import_staging`, re-parseia `conteudo` com
  `parseIntimacoesUnificado` para campos derivados, aplica Layer-B (dedup vs demandas
  vivas) quando `status === completed`.
- `confirmarImport({ jobId, selectedIds, edits })` → `stagingRowToImportRow` (sistema
  SEEU) → `importarDemandas(rows, userId, false)` → escreve `seeu_ledger` para todas as
  linhas. **Todas as demandas nascem em triagem** (status conforme ato: `ciencia` para
  Ciência; `analisar`/triagem para os demais).

> Reuso: `stagingRowToImportRow`, `enrichStagingWithLiveDedup`, `computeContentHash`,
> `normalizeConteudo` são parametrizados por tabela ou copiados minimamente. A promoção em
> si (`intimacaoSEEUToDemanda` → `importarDemandas`) é idêntica à do PJe.

### Gate de atribuições
- `intimacoes.ts` mantém PJe. O novo router habilita `EXECUCAO_PENAL`.
- (Se optarmos por unificar depois, `EXECUCAO_PENAL` entra em `ATRIBUICOES_PERMITIDAS`.)

### UI
- Novo item no dropdown de importação → `seeu-import-modal` **assíncrono** (espelho de
  `intimacoes-import-modal.tsx`, não o copy-paste antigo), que dispara `criarImportJob` e
  navega para `/admin/demandas/importar/[taskId]`.
- **Página de revisão — decisão:** *parametrizar*, não bifurcar. A página
  `/admin/demandas/importar/[taskId]` lê a `claude_code_tasks` e, pelo `skill` da task
  (`pje-intimacoes-import` vs `seeu-intimacoes-import`), escolhe qual router chamar
  (`intimacoes.*` vs `seeuIntimacoes.*`). As colunas exibidas são quase idênticas (a linha
  parseada tem a mesma forma); campos extras do SEEU (`seq`, `classeProcessual`) entram como
  colunas opcionais. Evita duplicar a página e mantém um só fluxo de revisão para o usuário.

---

## 8. Fluxo de uso (Fase 1)

1. Usuário loga no SEEU no browser CDP (manual).
2. No OMBUDS, dispara "Importar intimações — Execução Penal (SEEU)".
3. Job criado (`claude_code_tasks`, lane=browser). Worker roda
   (`--atribuicoes EXECUCAO_PENAL --abas manifestacao,ciencia,razoes`).
4. Staging populado; usuário revisa/desmarca em `/admin/demandas/importar/[jobId]`.
5. Confirma → demandas `EXECUCAO_PENAL` em **triagem**, ato conforme a aba.
6. (Fase 2, depois) varredura da triagem lê cada uma, resume o contexto e, se não for
   mera ciência, dispara baixa de autos + análise completa + organização no Drive.

---

## 9. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Prazo errado por swap de datas | Corrigir Bug 1 com teste **antes** do worker; validar prazos contra "Último Dia" da tela |
| RichFaces/Struts racy (aba não recarrega) | Esperar `resultTable` estável + palavra-chave; guard `seen_seq` na paginação (padrão PJe) |
| Clicar ação destrutiva por engano | Whitelist de cliques (só abas/paginação); testes de guarda; jamais seletores de "Dispensar/Analisar" |
| Conflito de sessão CDP | Worker anexa read-only; documenta uso de browser dedicado se houver outro controlador |
| Situação filtra linhas (perder expedientes) | Default "Recebidas e não Lidas"; opção de iterar situações; contagem da aba serve de conferência |
| Formato de "Pendências de Incidentes" diverge | Fora da Fase 1 (Fase 1.5) — não bloqueia a entrega |

---

## 10. Critérios de aceite (Fase 1)

- [ ] Testes do parser passam com fixtures reais (datas corretas por linha, nome sem
      vazamento, `ato` por aba, `seq` presente) — Bugs 1 e 2 corrigidos.
- [ ] Migration cria `seeu_import_staging` e `seeu_ledger` com índice único
      (`processoNumero`,`seq`).
- [ ] Worker raspa Manifestação+Ciência+Razões via CDP, grava staging, dedup por
      processo+Seq, sem nunca escrever no SEEU.
- [ ] Router SEEU cria job, lista staging parseado e promove para `demandas` em triagem.
- [ ] UI: dropdown → modal assíncrono → revisão → confirmação, com `EXECUCAO_PENAL`
      habilitado.
- [ ] Rodar ao vivo em Camaçari: os 16 (Manifestação) + 11 (Ciência) do dia importam sem
      duplicar em reexecução.
```
