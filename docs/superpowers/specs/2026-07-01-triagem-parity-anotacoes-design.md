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
- Card: `src/components/demandas-premium/DemandaCard.tsx:329-348, 434-503, 723-791`
- Filtro de título do resumo: `src/lib/trpc/routers/demandas.ts:155`
- Escritor fase 2: `.claude/skills-cowork/analise-intimacao/scripts/write_analise.py:179-196`

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
- **`RULES_CRIMINAL`** — criminal comum genérico: resposta à acusação, AIJ, alegações finais, sentença, recurso, RSE.
- **Refactor:** toda regra passa a carregar `fase`/`motivo` estruturados (não só MPU), fechando a paridade.

**Interface da regra:** contrato uniforme `{ ato, prioridade, prazo, fase, motivo }`. `classify` ganha ramos `if is_juri(atribuicao)` e `if is_criminal(atribuicao)` análogos aos existentes.

### A2 · Legibilidade garantida (eliminar o PDF-skip)

Redesenhar a etapa de leitura para nunca pular um ato substantivo por falta de texto:

1. Tentar a leitura por frame de texto (atual).
2. Se vazio **e** o ato não for meramente administrativo → **baixar o PDF do documento** pela sessão browser/CDP já existente da varredura, rodar `pdftotext`; se o PDF for digitalizado/vazio → **OCR com tesseract** (ambos já presentes no stack: poppler + tesseract). O guard anti-ciência (`:922-925`) ganha um caminho ciente de Júri para buscar o documento real (viewer diferente de `listProcessoCompletoAdvogado.seam`).
3. Guardar o texto extraído em `enrichment_data.raw_text` do registro base. **Qualquer que seja o resultado, um ato não-administrativo é sempre enfileirado para a fase 2** — acaba o skip silencioso.

**Dependências:** `pdftotext` (poppler) e `tesseract` disponíveis localmente no Mac (lane browser). Falha de OCR não interrompe a varredura (ver A5).

### A3 · Card nunca em branco

A fase 1 passa a gravar sempre uma **pré-análise determinística** que o card pode ler de imediato: `ato` + `fase`/`motivo` + `prazo` + badge **"análise IA pendente"**. Quando a fase 2 (`analise-intimacao`) conclui, ela **sobrescreve** com a versão rica. Se o OCR ainda assim não conseguiu ler o documento, o card mostra a pré-análise + estado **"documento não lido — revisão manual"** (em vez de parecer vazio-mas-ok). Tudo envolto em try/except para a varredura nunca quebrar.

### A4 · Exibição estruturada no card

- A fase 2 (`analise-intimacao` / `write_analise.py`) passa a emitir também um **JSON** em `registros.enrichment_data`: `{ objeto, decidido, providencia, prazo, recurso }`. O `conteudo` markdown permanece para a timeline.
- A query do card em `demandas.ts:155` **deixa de exigir o título exato** `'Resumo e providências'` e passa a puxar o **registro `tipo='analise'` mais recente** — assim o resumo da IA, o fallback da fase 1 e (depois, em C) o resumo de sentença/acórdão aparecem de forma uniforme.
- `DemandaCard.tsx` renderiza um bloco expansível: a face do card mostra um resumo conciso `Objeto → Providência · Prazo`; expandido revela os campos rotulados **Objeto / O que foi decidido / Providência / Prazo / Cabe recurso?** — a partir do JSON, sem parsing de markdown. Fallback: se o registro não tiver JSON (registros antigos), renderiza o `conteudo` como hoje.

### A5 · Testes, segurança e fronteiras

- **TDD do classificador:** tabela de textos representativos de expedientes Júri/EP/Criminal → asserts de `ato`/`fase`/`motivo`/`prioridade`. Testes separados para extração PDF/OCR (amostra digitalizada) e para o fallback da query do card.
- **Segurança de execução:** a varredura mantém o invariante de nunca quebrar — leitura/OCR/enfileiramento em try/except; falhas viram estado "revisão manual", não exceção.
- **Sigilo:** nada muda no tratamento de sigilo VVD/MPU; A não altera as regras de visibilidade.

---

## 5. Impacto em dados

- **Sem migração de schema.** `demandas.enrichment_data` (jsonb) já tem a chave tipada `fase_processual`; adiciona-se `motivo` (e mantém-se `ato`). `registros.enrichment_data` (jsonb) já existe e passa a carregar o JSON estruturado da análise.
- `processos_vvd.fase_procedimento`/`motivo_ultima_intimacao` continuam sendo escritos para VVD (compat).
- Registros antigos sem JSON continuam renderizando via `conteudo` (degradação graciosa).

---

## 6. Arquivos afetados (previsão)

| Arquivo | Mudança |
|---|---|
| `.claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py` | `RULES_JURI`, `RULES_CRIMINAL`, ampliar `RULES_EP`; dispatch por atribuição; fase/motivo uniformes; leitura PDF+OCR; sempre enfileirar fase 2; pré-análise determinística |
| `.claude/skills-cowork/varredura-triagem/references/heuristicas-classificacao.md` | Alinhar doc ↔ código (Júri/EP/Criminal) |
| `.claude/skills-cowork/analise-intimacao/scripts/write_analise.py` | Emitir JSON `{objeto,decidido,providencia,prazo,recurso}` em `registros.enrichment_data` |
| `src/lib/trpc/routers/demandas.ts` | Query do resumo: último `tipo='analise'` em vez de título exato |
| `src/components/demandas-premium/DemandaCard.tsx` | Bloco expansível com campos rotulados a partir do JSON; badges "IA pendente" / "documento não lido" |
| Testes (Python + TS) | Classificador, extração PDF/OCR, fallback da query |

As cópias locais/mirror das skills devem ser sincronizadas conforme a skill `evolucao-skills`.

---

## 7. Critérios de aceitação

1. Uma intimação de **Júri** (pronúncia, impronúncia, desclassificação, sessão de plenário, diligências 422, alegações finais do sumário, apelação) recebe `ato`/`fase`/`motivo`/`prioridade` corretos na fase 1.
2. Um documento de Júri **somente-PDF/digitalizado** é lido via `pdftotext`/OCR e **enfileirado para a fase 2** (não mais pulado).
3. Nenhum card de triagem fica em branco: enquanto a IA está pendente, o card mostra a pré-análise + badge "análise IA pendente"; se o documento não foi lido, mostra "documento não lido — revisão manual".
4. Ao concluir a fase 2, o card exibe, em campos rotulados expansíveis, **Objeto / O que foi decidido / Providência / Prazo / Cabe recurso?**.
5. **Paridade:** EP e Criminal também emitem `ato`/`fase`/`motivo` (EP fica plenamente ativo quando a importação SEEU existir).
6. A query do card exibe o resumo a partir do registro `tipo='analise'` mais recente, sem depender do título exato.
7. Nenhuma regressão em VVD/MPU; varredura nunca lança exceção não tratada.

---

## 8. Sequência maior (contexto)

- **A (este doc):** riqueza/paridade de anotação + card nunca em branco.
- **B:** auditabilidade de importações e varreduras (carimbar `resultado` da varredura, `ultimaVarredura`, ligação ledger→demanda, timestamps de proveniência, UI de histórico/revisão).
- **C:** roteamento por ato — (C1) ligar a inteligência de sentença/acórdão já construída nas branches `feat/sentenca-intelligence` (migração 0067) e `feat/acordao-intelligence` (0068) ao fluxo vivo; (C2) modal "produzir peça" que dispara download (principal + associados) → mídias (Lifesize + fallback PJe Mídias) → Drive/atendimentos → análise → relatório completo, por atribuição.
