# Design — Paridade de anotações na triagem (Júri + EP + Criminal) e card nunca em branco

**Data:** 2026-07-01
**Autor:** Rodrigo Rocha Meire (via Claude Code)
**Status:** Design aprovado — aguardando revisão de spec
**Escopo:** Subsistema **A** de um plano maior (A → B → C). Este documento cobre **apenas A**.

---

## 1. Contexto e problema

Ao importar intimações do PJe, o OMBUDS roda a **varredura de triagem** (skill `varredura-triagem`) para classificar cada demanda e anotar o que precisa ser feito. Na prática, os cards de **Júri** em triagem aparecem **sem anotação ou com anotações genéricas**, e o defensor **não consegue visualizar o contexto, o objeto da intimação e o que é para fazer**.

A investigação do código (referências abaixo) identificou que a varredura é um pipeline de **duas fases**, e o card só exibe o resultado da fase 2:

- **Fase 1 (Python determinístico)** — `varredura_triagem.py` classifica por regex e grava **apenas** `ato`, `prioridade`, `prazo`, `revisao_pendente` na demanda (`apply_classification`, linhas 1049-1060). Cria um registro base titulado pelo `ato` e guarda o texto do documento em `enrichment_data.raw_text` (1094-1110).
- **Fase 2 (IA, daemon Max, skill `analise-intimacao`)** — `write_analise.py` grava um registro titulado exatamente **"Resumo e providências"** com as seções *Objeto / O que foi decidido / Providência+Prazo / Cabe recurso?* (write_analise.py:179-196). **É este texto que o card efetivamente mostra.**

O card busca o resumo por **match exato de título**: `src/lib/trpc/routers/demandas.ts:155` seleciona `left(registros.conteudo, 450)` de um registro `WHERE titulo = 'Resumo e providências'`. Sem esse registro da fase 2, o card mostra só um `ato` grosseiro.

### 1.1 Causas-raiz (todas rastreadas no código)

1. **Não existe `RULES_JURI`.** O classificador só tem `RULES_MPU` (VVD) e `RULES_EP`; Júri cai no `RULES_BASE` genérico → "Ciência" / "Analisar decisão" (`varredura_triagem.py:726-802`, ramos em 766 e 780).
2. **Heurísticas de Júri documentadas não estão implementadas.** `references/heuristicas-classificacao.md:151-189` lista pronúncia/impronúncia/**desclassificação**, mas não há padrão `desclassific` no script.
3. **Não há `fase`/`motivo` estruturados para Júri.** As colunas `fase_procedimento`/`motivo_ultima_intimacao` existem **só** em `processos_vvd` (`src/lib/db/schema/vvd.ts:166-174`) e só são emitidas por `RULES_MPU`.
4. **Documentos de Júri costumam ser PDF → corpo vazio → `skip_ai=True`.** `read_doc_content` retorna vazio para PDF-only (e o guard anti-ciência rejeita qualquer link que não seja `listProcessoCompletoAdvogado.seam`, linhas 922-925). Corpo vazio → `skip_ai=True` (1092-1093) → a demanda **não é enfileirada para a fase 2** → **nunca existe "Resumo e providências"** → card em branco/genérico.
5. **O card depende da fase 2 ter rodado.** Como `analiseResumo` exige o título exato (demandas.ts:155), qualquer demanda cuja IA está pendente, foi pulada ou falhou aparece em branco mesmo com a varredura "bem-sucedida".

### 1.2 Referências de código (estado atual)

- Skill: `.claude/skills-cowork/varredura-triagem/SKILL.md`
- Classificador / ausência de ramo Júri: `scripts/varredura_triagem.py:726-802` (766, 780)
- Padrões Júri em RULES_BASE: `:395-396, 437-440`; pronúncia via título "Sentença": `:576-581`
- Escrita fase/motivo (só MPU): `:1069-1077`
- Skip / não-IA: `:1092-1093`; leitura anti-ciência vazia: `:922-925`; enfileiramento IA: `:1586-1591`
- Regra `desclassific` documentada mas ausente: `references/heuristicas-classificacao.md:177-181`
- Schema `demandas`: `src/lib/db/schema/core.ts:313-391` (`enrichment_data` já tem chave tipada `fase_processual`)
- Schema `registros`: `src/lib/db/schema/agenda.ts:179-238`
- `processos_vvd` fase/motivo: `src/lib/db/schema/vvd.ts:166-174`
- Consumidores do `analiseResumo` (demandas.ts:155) — o resumo exibido na face do card do kanban: **`src/components/demandas-premium/kanban-premium.tsx:507` e `:984`**.
- Seção IA com campos rotulados/filtro por título: **`src/app/(dashboard)/admin/demandas/[id]/page.tsx:40, :147, :157`** (constante `IA_TITULOS` em `:40`; filtro `r.tipo === 'analise' || IA_TITULOS.has(titulo)` em `:147/:157`). **Não** está em `DemandaCard.tsx`.
- `src/components/demandas-premium/DemandaCard.tsx` renderiza apenas `demanda.providencias` e o badge `registrosCount` — **não** tem seção IA nem `IA_TITULOS`.
- Escritor fase 2: `.claude/skills-cowork/analise-intimacao/scripts/write_analise.py:179-196` — **grava três** registros `tipo='analise'` por demanda, em ordem crescente de `id`: `"Resumo e providências"` (196), `"Relato da suposta vítima"` (211), `"Termos da pronúncia"` (218). A inserção é guardada por `registro_exists(demanda_id, titulo)` (195) — se o título já existe, **pula** (não sobrescreve).
- Anotações manuais em outras telas também usam `tipo='analise'` (`admin/demandas/[id]/page.tsx`, `painel-servidor.tsx`, `delegacao.ts`).

---

## 2. Objetivo

Garantir que **toda demanda de triagem** — em especial **Júri**, mas com **paridade** para EP e Criminal — chegue ao card com **objeto, o que foi decidido, providência, prazo e cabe-recurso** visíveis, e que **nenhum card fique em branco** enquanto a IA está pendente ou o documento não pôde ser lido.

**Não-objetivos (ficam para B e C):**
- Camada de auditoria/histórico de importações e varreduras → **Subsistema B**.
- Roteamento automático de "ciência de sentença/acórdão" para `analise-sentenca`/`analise-acordao` e o modal "produzir peça" (alegações finais, apelação, RA) → **Subsistema C**. Aqui, A apenas garante que *qualquer* resumo de fase 2 (inclusive o de sentença, quando C existir) seja renderizado corretamente.

---

## 3. Decisões (tomadas no brainstorming)

| Decisão | Escolha |
|---|---|
| Correção do "PDF → skip → card em branco" | **OCR + fase-2 garantida + badge de fallback** |
| Abrangência | **Paridade completa: Júri + EP + Criminal** |
| Exibição no card | **Campos rotulados estruturados, expansíveis** |
| EP (fonte é SEEU, scraper pendente) | **Autorar regras EP agora; ligar quando o SEEU chegar** |
| Armazenamento de fase/motivo | **Genérico em `demandas.enrichment_data`** (VVD mantém colunas dedicadas por compat) |
| Onde roda o OCR | **Inline na varredura** (Mac local, lane browser) |

---

## 4. Design

O subsistema se divide em cinco unidades com fronteiras claras.

### A1 · Paridade do classificador (fase 1)

Adicionar dispatch por atribuição em `varredura_triagem.py`, espelhando o padrão existente de `RULES_MPU`/`RULES_EP`:

- **`RULES_JURI`** — implementa as heurísticas hoje só documentadas: pronúncia, impronúncia, **desclassificação**, sessão de julgamento/plenário, diligências 422, intimação para debates/alegações finais do sumário, apelação pós-júri, precatória. Cada regra emite `ato` + `prioridade` + `prazo` + `fase` + `motivo`.
- **`RULES_EP`** — ampliada agora para atos SEEU (progressão, livramento condicional, remição, saída temporária, incidentes, unificação/soma de penas), além dos atos EP que aparecem pela vara "Júri e Execuções" do PJe. Passa a valer plenamente quando a importação SEEU existir.
- **`RULES_CRIMINAL`** — criminal comum genérico: resposta à acusação, AIJ, alegações finais, sentença, recurso, RSE. **Autorada agora, porém inerte até existir uma atribuição Criminal:** hoje `ATRIB_UNIDADE` (varredura_triagem.py:87-91) só mapeia `VVD_CAMACARI`, `JURI_CAMACARI` e `EXECUCAO_PENAL` — não há token/unidade Criminal. Portanto `RULES_CRIMINAL` fica escrita e testada, mas só passa a despachar quando um token Criminal for adicionado ao pipeline de importação (mesmo tratamento dado ao EP/SEEU).
- **Refactor:** toda regra passa a carregar `fase`/`motivo` estruturados (não só MPU), fechando a paridade.

**Detecção de atribuição:** `is_juri` = `"JURI" in atribuicao` e `is_ep` = `"EXECUCAO_PENAL" in atribuicao` (ambos distinguíveis mesmo compartilhando a vara "Júri e Execuções"). `is_criminal` só existirá quando o token Criminal for criado; até lá o ramo é inalcançável por dispatch.

**Interface da regra:** contrato uniforme `{ ato, prioridade, prazo, fase, motivo }`. `classify` ganha ramos `if is_juri(atribuicao)` (ativo agora) e `if is_criminal(atribuicao)` (autorado, inerte).

**Roteamento de `fase`/`motivo` (correção de destino):** hoje `apply_classification` grava `fase`/`motivo` **exclusivamente** em `processos_vvd` (:1069-1077, `upsert_processo_vvd`). Emitir `fase`/`motivo` para Júri/EP/Criminal **sem rewire criaria linhas espúrias em `processos_vvd`** para processos não-VVD. Correção: `apply_classification` passa a gravar `fase`/`motivo` genéricos em **`demandas.enrichment_data`** para toda atribuição, e **restringe** a escrita em `processos_vvd` a VVD/MPU (`if is_mpu`/VVD).

### A1.1 · Vocabulário de `fase`/`motivo` por atribuição

O único enum existente hoje (`vvd.ts:167-174`) é específico de VVD. Para tornar as regras e os testes concretos, este design define os vocabulários iniciais (valores em `snake_case`; a lista final é fechada na implementação):

**Júri — `fase`:** `sumario_culpa`, `pronuncia`, `preparacao_plenario`, `plenario`, `pos_julgamento`.
**Júri — `motivo`:** `designacao_aij_1a_fase`, `alegacoes_finais_sumario`, `decisao_pronuncia`, `decisao_impronuncia`, `decisao_desclassificacao`, `diligencias_422`, `designacao_plenario`, `intimacao_sentenca_plenario`, `apelacao`, `contrarrazoes`, `precatoria`.

**EP (SEEU) — `fase`:** `execucao_provisoria`, `execucao_definitiva`.
**EP — `motivo`:** `calculo_pena`, `progressao_regime`, `livramento_condicional`, `remicao`, `saida_temporaria`, `incidente_falta_grave`, `unificacao_soma_penas`, `extincao_punibilidade`.

**Criminal (inerte) — `fase`:** `recebimento_denuncia`, `resposta_acusacao`, `instrucao`, `alegacoes_finais`, `sentenca`, `recurso`.
**Criminal — `motivo`:** `citacao_resposta_acusacao`, `designacao_aij`, `alegacoes_finais_memoriais`, `intimacao_sentenca`, `prazo_recurso`.

### A2 · Legibilidade garantida (eliminar o PDF-skip)

Redesenhar a etapa de leitura para nunca pular um ato substantivo por falta de texto:

1. Tentar a leitura por frame de texto (atual).
2. Se vazio **e** o ato não for meramente administrativo → obter o PDF **sem efetivar ciência**.

**Invariante de ciência (crítico):** o guard em `:922-925` rejeita qualquer URL que não seja `listProcessoCompletoAdvogado.seam` justamente porque `visualizarExpediente.seam` / o popup "TOMAR CIÊNCIA" **efetiva a ciência e dispara o prazo de 10 dias**. A correção **não** é "usar outro viewer do expediente" — isso é exatamente o que o guard existe para impedir. A rota segura é: **baixar o asset PDF de dentro dos autos completos** (`listProcessoCompletoAdvogado.seam`, que já é a única navegação permitida e **não** efetiva ciência) — abrir os autos do processo e extrair o documento correspondente ali. O popup do expediente (`visualizarExpediente.seam` / "TOMAR CIÊNCIA") **permanece proibido**. Sobre o PDF obtido: rodar `pdftotext`; se digitalizado/vazio → **OCR com tesseract**.

3. Guardar o texto extraído em `enrichment_data.raw_text` do registro de análise (ver A3). **Qualquer que seja o resultado, um ato não-administrativo é sempre enfileirado para a fase 2** — acaba o skip silencioso. Se nem os autos completos expuserem o documento de forma segura, o ato **não** é forçado por popup de ciência: cai no estado "documento não lido — revisão manual" (A3).

**Dependências:** `pdftotext` (poppler) e `tesseract` já instalados no Mac em `/opt/homebrew/bin` (hoje usados só por `preparar-audiencias`; passam a ser usados pela varredura na lane browser). Falha de extração/OCR não interrompe a varredura (ver A5).

### A2.2 · Contrato do registro de análise (compartilhado fase 1 ↔ fase 2)

Fonte única de verdade do resumo do card, para as fases 1 e 2 não colidirem:

- **Identidade:** exatamente **um** registro por demanda com `tipo='analise'` **e** `titulo='Resumo e providências'`. É o único registro tratado como "o resumo".
- **Marcador:** seu `enrichment_data` sempre contém a chave **`objeto`** — este é o discriminador que a query do card usa (ver A4). Os outros registros `tipo='analise'` da fase 2 (`"Relato da suposta vítima"`, `"Termos da pronúncia"`) e as anotações manuais **não** têm essa chave e portanto **não** são confundidos com o resumo.
- **Payload:** `enrichment_data = { objeto, decidido, providencia, prazo, recurso, _status }`, com `_status ∈ { 'pendente', 'concluido', 'nao_lido' }` e `_fonte ∈ { 'fase1', 'fase2' }`.
- **Semântica de escrita — select-then-update em nível de aplicação (sem DDL):** não há índice único em `registros(demanda_id, titulo)` (`agenda.ts:179-238` só tem PK serial), então **não** se usa `ON CONFLICT`. Em vez disso, para este título específico: `SELECT id FROM registros WHERE demanda_id=? AND tipo='analise' AND titulo='Resumo e providências' LIMIT 1` → se existe, `UPDATE`; senão, `INSERT` (mesmo padrão do `registro_exists` atual, mas com *update* no ramo "existe" em vez de *skip*). Fase 1 cria; fase 2 atualiza. (Os demais títulos da fase 2 continuam com `insert-if-not-exists` como hoje.) A rigor há uma janela de corrida teórica entre SELECT e INSERT, mitigada porque fase 1 e fase 2 da mesma demanda não rodam concorrentemente (fase 2 é enfileirada ao fim da fase 1).

### A3 · Card nunca em branco

A **fase 1** passa a **criar/atualizar o registro de análise** (contrato A2.2) já com os campos determinísticos que possui — `objeto` (≈ tipo de documento/título do ato), `providencia` (≈ `ato`), `prazo`, mais `fase`/`motivo` — e `_status='pendente'` + `_fonte='fase1'`. O card então nunca fica em branco: mostra esse conteúdo com badge **"análise IA pendente"**. Se a extração/OCR não conseguiu ler o documento, a fase 1 grava `_status='nao_lido'` e o card mostra **"documento não lido — revisão manual"**. Quando a **fase 2** (`analise-intimacao`) conclui, faz `UPDATE` do mesmo registro com a versão rica e `_status='concluido'` + `_fonte='fase2'`. Tudo envolto em try/except para a varredura nunca quebrar.

### A4 · Exibição estruturada no card

- A fase 2 (`write_analise.py`) grava o JSON `{ objeto, decidido, providencia, prazo, recurso }` no `enrichment_data` do registro de análise (A2.2), via `UPDATE`. O `conteudo` markdown permanece para a timeline.
- **Query do card** (`demandas.ts:155`): em vez de match por título exato, seleciona **o registro `tipo='analise'` mais recente cujo `enrichment_data ? 'objeto'`** (o marcador do contrato). Isso evita pegar `"Termos da pronúncia"`/`"Relato da suposta vítima"` (que têm `id` maior) e anotações manuais (sem a chave). Fallback de compatibilidade para registros antigos: se nenhum registro com a chave `objeto` existir, cair para `titulo = 'Resumo e providências'` como hoje.
- **Consumidores a alterar:** (a) a face do card do kanban de triagem — `kanban-premium.tsx:507` e `:984`, que renderizam `analiseResumo`; (b) a seção IA da tela de detalhe — `admin/demandas/[id]/page.tsx:40/:147/:157`, que hoje filtra `r.tipo === 'analise' || IA_TITULOS.has(titulo)`. A renderização estruturada nova deve **integrar-se à lógica `IA_TITULOS` existente** nessa tela de detalhe — quando o registro tiver o JSON de contrato, renderizar os campos rotulados; senão, manter o render atual do `conteudo`. `DemandaCard.tsx` (que só mostra `providencias`/`registrosCount`) não precisa mudar para o resumo.
- **Layout:** face do card mostra `Objeto → Providência · Prazo`; expandido revela **Objeto / O que foi decidido / Providência / Prazo / Cabe recurso?** a partir do JSON (sem parsing de markdown). Degradação graciosa para registros sem JSON.

### A5 · Testes, segurança e fronteiras

- **TDD do classificador:** tabela de textos representativos de expedientes Júri/EP/Criminal → asserts de `ato`/`fase`/`motivo`/`prioridade`. Testes separados para extração PDF/OCR (amostra digitalizada) e para o fallback da query do card.
- **Segurança de execução:** a varredura mantém o invariante de nunca quebrar — leitura/OCR/enfileiramento em try/except; falhas viram estado "revisão manual", não exceção.
- **Sigilo:** nada muda no tratamento de sigilo VVD/MPU; A não altera as regras de visibilidade.

---

## 5. Impacto em dados

- **Sem migração de schema (DDL).** `demandas.enrichment_data` (jsonb) já tem a chave tipada `fase_processual`; **adiciona-se a chave `motivo` ao tipo TS** em `core.ts` (é só tipagem do jsonb, não coluna). `registros.enrichment_data` (jsonb) já existe e passa a carregar o JSON de contrato da análise (A2.2).
- **Correção de destino:** `fase`/`motivo` genéricos passam a ser gravados em `demandas.enrichment_data` para toda atribuição; a escrita em `processos_vvd.fase_procedimento`/`motivo_ultima_intimacao` fica **restrita a VVD/MPU** (evita linhas espúrias em `processos_vvd`). VVD mantém as colunas dedicadas por compat.
- **Índice (opcional, perf):** avaliar índice GIN parcial em `registros.enrichment_data` para o predicado `? 'objeto'` se a query do card ficar quente; caso contrário, o filtro roda sobre o conjunto já reduzido por `demanda_id`.
- Registros antigos sem JSON continuam renderizando via `conteudo` (degradação graciosa).

---

## 6. Arquivos afetados (previsão)

| Arquivo | Mudança |
|---|---|
| `.claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py` | `RULES_JURI`, `RULES_CRIMINAL` (inerte), ampliar `RULES_EP`; dispatch por atribuição; **rotear fase/motivo para `demandas.enrichment_data`** e gatear `processos_vvd` a VVD/MPU; leitura PDF+OCR pela rota segura (autos completos); sempre enfileirar fase 2; upsert do registro de análise (contrato A2.2) com `_status`/`_fonte` |
| `.claude/skills-cowork/varredura-triagem/references/heuristicas-classificacao.md` | Alinhar doc ↔ código (Júri/EP/Criminal) + vocabulário A1.1 |
| `.claude/skills-cowork/analise-intimacao/scripts/write_analise.py` | Gravar JSON de contrato `{objeto,decidido,providencia,prazo,recurso,_status,_fonte}` via **select-then-update** (nível app, sem `ON CONFLICT`) do registro `'Resumo e providências'` |
| `src/lib/trpc/routers/demandas.ts` | Query do resumo: registro `tipo='analise'` mais recente com `enrichment_data ? 'objeto'`, fallback para título exato |
| `src/components/demandas-premium/kanban-premium.tsx` | Consumir o resumo estruturado na face do card do kanban (`:507`, `:984`); badges "IA pendente" / "documento não lido" |
| `src/app/(dashboard)/admin/demandas/[id]/page.tsx` | Integrar à seção IA (`IA_TITULOS` em `:40`; filtro em `:147/:157`): bloco expansível com campos rotulados a partir do JSON |
| `src/lib/db/schema/core.ts` | Adicionar chave `motivo` ao tipo do `enrichment_data` |
| Testes (Python + TS) | Classificador (tabela por vocabulário A1.1), extração PDF/OCR, discriminador da query (não pegar "Termos da pronúncia"/anotação manual) |

As cópias locais/mirror das skills devem ser sincronizadas conforme a skill `evolucao-skills`.

---

## 7. Critérios de aceitação

1. Uma intimação de **Júri** (pronúncia, impronúncia, desclassificação, sessão de plenário, diligências 422, alegações finais do sumário, apelação) recebe, na fase 1, `ato`/`prioridade`/`prazo` e `fase`/`motivo` **dentro do vocabulário A1.1** (asseríveis por valor exato na tabela de testes).
2. Um documento de Júri **somente-PDF/digitalizado** é obtido pela **rota segura dos autos completos** (sem efetivar ciência), lido via `pdftotext`/OCR e **enfileirado para a fase 2** (não mais pulado). Nenhuma navegação a `visualizarExpediente.seam`/"TOMAR CIÊNCIA" ocorre.
3. Nenhum card de triagem fica em branco: a fase 1 grava o registro de análise (contrato A2.2) com `_status='pendente'` (badge "análise IA pendente") ou `_status='nao_lido'` (estado "documento não lido — revisão manual").
4. Ao concluir a fase 2, o **mesmo** registro de análise é atualizado in-place (não duplicado) com `_status='concluido'`, e o card exibe, em campos rotulados expansíveis, **Objeto / O que foi decidido / Providência / Prazo / Cabe recurso?**.
5. **Discriminador da query:** dada uma demanda com registro `'Resumo e providências'` (com chave `objeto`) **e** um registro posterior `'Termos da pronúncia'` (sem a chave) **e** uma anotação manual `tipo='analise'`, o card exibe o **resumo**, não os outros dois.
6. **Paridade:** EP emite `ato`/`fase`/`motivo` (plenamente ativo quando a importação SEEU existir); `RULES_CRIMINAL` está escrita e testada, mas permanece inerte até existir um token de atribuição Criminal.
7. **Sem regressão:** VVD/MPU continuam gravando `processos_vvd.fase/motivo`; nenhuma linha `processos_vvd` é criada para Júri/EP/Criminal; a varredura nunca lança exceção não tratada.

---

## 8. Sequência maior (contexto)

- **A (este doc):** riqueza/paridade de anotação + card nunca em branco.
- **B:** auditabilidade de importações e varreduras (carimbar `resultado` da varredura, `ultimaVarredura`, ligação ledger→demanda, timestamps de proveniência, UI de histórico/revisão).
- **C:** roteamento por ato — (C1) ligar a inteligência de sentença/acórdão já construída nas branches `feat/sentenca-intelligence` (migração 0067) e `feat/acordao-intelligence` (0068) ao fluxo vivo; (C2) modal "produzir peça" que dispara download (principal + associados) → mídias (Lifesize + fallback PJe Mídias) → Drive/atendimentos → análise → relatório completo, por atribuição.
