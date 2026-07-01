# Heurísticas de classificação — Varredura da Triagem

Tabela de regras para mapear o conteúdo lido de uma intimação ao `ato` e demais
campos da demanda. Aplicar **em ordem** — a primeira regra que casa vence.

## Padrão de matching

Cada regra tem:
- **Pattern** — regex ou keyword no `innerText` do documento (case-insensitive,
  sem acentos para reduzir false-negative)
- **ato** — valor exato em `atos-por-atribuicao.ts` (case-sensitive!)
- **prioridade** — `URGENTE` | `ALTA` | `NORMAL` | `BAIXA`
- **prazo** — dias ou `null`
- **registro_tipo** — `ciencia` | `diligencia` | `anotacao`
- **side_effects** — ex.: `agendar_audiencia`, `marcar_concluido`, `marcar_sem_atuacao`

---

## VVD (Violência Doméstica)

```yaml
- nome: AIJ designada
  pattern: '(designo|designada|fica designada).{0,40}(audiencia|aij|instrucao e julgamento)'
  ato: 'Ciência designação de audiência'
  prioridade: NORMAL
  registro_tipo: ciencia
  side_effects: [agendar_audiencia]
  campos_extras:
    tipo_audiencia: INSTRUCAO

- nome: AIJ redesignada
  pattern: '(redesigno|redesignada|fica redesignada).{0,40}(audiencia|aij)'
  ato: 'Ciência redesignação de audiência'
  prioridade: NORMAL
  registro_tipo: ciencia
  side_effects: [reagendar_audiencia]
  campos_extras:
    tipo_audiencia: INSTRUCAO

- nome: Justificação designada
  pattern: 'designada.{0,30}audiencia.{0,15}justificacao'
  ato: 'Ciência designação de audiência'
  prioridade: NORMAL
  registro_tipo: ciencia
  side_effects: [agendar_audiencia]
  campos_extras:
    tipo_audiencia: JUSTIFICACAO

- nome: Resposta à acusação
  pattern: '(nomeada a defensoria|vistas? a dpe).{0,80}resposta a acusacao|apresente.{0,20}resposta a acusacao'
  ato: 'Resposta à Acusação'
  prioridade: URGENTE
  prazo: 10
  registro_tipo: diligencia

- nome: Alegações finais
  pattern: 'prazo (sucessivo )?de \d+ dias.{0,40}alegacoes finais|memoriais finais'
  ato: 'Alegações finais'
  prioridade: URGENTE
  prazo: 5
  registro_tipo: diligencia

- nome: Memoriais
  pattern: 'apresentar memoriais|prazo.{0,30}memoriais'
  ato: 'Memoriais'
  prioridade: URGENTE
  prazo: 5
  registro_tipo: diligencia

- nome: Manifestação sobre laudo
  pattern: 'manifeste-?se sobre o laudo|vistas?.{0,15}laudo'
  ato: 'Manifestação sobre laudo'
  prioridade: NORMAL
  prazo: 5
  registro_tipo: diligencia

- nome: Manifestação sobre revogação MPU
  pattern: 'manifeste-?se.{0,30}(revogacao|modulacao).{0,15}(mpu|medida protetiva)'
  ato: 'Manifestação sobre MPU'
  prioridade: NORMAL
  prazo: 5
  registro_tipo: diligencia

- nome: Cumprir despacho
  pattern: 'deixo de conhecer|formular em autos proprios|providencie .{0,40}'
  ato: 'Cumprir despacho'
  prioridade: URGENTE
  registro_tipo: diligencia

- nome: Sentença absolutória
  pattern: '(sentenca|julgo).{0,200}absolv'
  ato: 'Ciência absolvição'
  prioridade: NORMAL
  registro_tipo: ciencia

- nome: Sentença condenatória
  pattern: '(sentenca|julgo).{0,200}condeno'
  ato: 'Ciência condenação'
  prioridade: ALTA
  registro_tipo: ciencia

- nome: Sentença genérica
  pattern: '\bsentenca\b'
  ato: 'Analisar sentença'
  prioridade: URGENTE
  prazo: 5
  registro_tipo: diligencia

- nome: Acórdão improvido
  pattern: '\bacordao\b.{0,500}(improvido|desprovido|nao provido)'
  ato: 'Ciência acórdão'
  prioridade: NORMAL
  registro_tipo: ciencia

- nome: Acórdão genérico
  pattern: '\bacordao\b'
  ato: 'Analisar acórdão'
  prioridade: URGENTE
  prazo: 15
  registro_tipo: diligencia

- nome: Decisão interlocutória
  pattern: '\bdecisao\b'
  ato: 'Analisar decisão'
  prioridade: NORMAL
  registro_tipo: diligencia

- nome: Arquivamento definitivo
  pattern: 'arquivado definitivamente|arquivamento definitivo'
  ato: 'Ciência'
  prioridade: BAIXA
  registro_tipo: ciencia
  side_effects: [marcar_concluido]

- nome: Sigiloso sem visibilidade
  pattern: 'sigiloso.{0,30}sem visibilidade|peticionar.{0,30}fora dos autos'
  ato: 'Outro'
  prioridade: BAIXA
  registro_tipo: anotacao
  side_effects: [marcar_sem_atuacao]

- nome: Renúncia indeferida (réu com particular)
  pattern: 'reu.{0,40}advogado particular|renuncia.{0,30}indeferida'
  ato: 'Ciência'
  prioridade: BAIXA
  registro_tipo: anotacao
```

---

## Júri (Tribunal do Júri) — IMPLEMENTADO (`RULES_JURI`, `varredura_triagem.py`)

Aplicada quando `"JURI" in atribuicao` (ex.: `JURI_CAMACARI`), **antes** de
`RULES_BASE`. Primeira regra que casa vence — a ordem abaixo é a ordem real de
avaliação (note: impronúncia e desclassificação vêm ANTES de pronúncia porque
"impronunci..." contém a substring "pronunci"). Cada linha grava
`fase_processual`/`motivo` em `demandas.enrichment_data` (vocabulário §A1.1).

| # | Pattern (regex, texto normalizado) | Ato | Prioridade | Prazo | Registro | Fase | Motivo | Side effects / extras |
|---|---|---|---|---|---|---|---|---|
| 1 | `impronunci` | Analisar impronúncia | ALTA | — | diligencia | `pronuncia` | `decisao_impronuncia` | — |
| 2 | `desclassific` | Ciência de desclassificação | NORMAL | — | ciencia | `pronuncia` | `decisao_desclassificacao` | — |
| 3 | `art\.?\s*422\|(preclu\|transitad).{0,40}pronuncia\|diligencias.{0,20}(plenario\|422)\|rol.{0,20}testemunhas.{0,20}plenario\|prepara\w*.{0,20}plenario` | Diligências do 422 | ALTA | 5 | diligencia | `preparacao_plenario` | `diligencias_422` | — |
| 4 | `\bpronunci` | Analisar pronúncia (RESE) | URGENTE | 5 | diligencia | `pronuncia` | `decisao_pronuncia` | — |
| 5 | `sessao de julgamento.{0,30}(tribunal do juri\|plenario)\|design\w*.{0,20}plenario\|sessao.{0,15}plenario` | Ciência sessão de plenário | ALTA | — | ciencia | `plenario` | `designacao_plenario` | `agendar_audiencia` (tipo_audiencia=JURI) |
| 6 | `(alegacoes finais\|memoriais).{0,40}(sumario\|primeira fase\|1a fase)\|(primeira fase\|sumario).{0,40}(alegacoes finais\|memoriais)` | Alegações finais (sumário) | URGENTE | 5 | diligencia | `sumario_culpa` | `alegacoes_finais_sumario` | — |
| 7 | `(designo\|designada\|fica designada).{0,40}(audiencia\|aij\|instrucao)` | Ciência designação de AIJ | NORMAL | — | ciencia | `sumario_culpa` | `designacao_aij_1a_fase` | `agendar_audiencia` (tipo_audiencia=INSTRUCAO) |
| 8 | `(conselho de sentenca\|tribunal do juri).{0,60}conden\|conden\w*.{0,40}(conselho de sentenca\|tribunal do juri)\|sentenca.{0,40}(plenario\|conselho de sentenca)` | Analisar apelação (art. 593 III) | URGENTE | 5 | diligencia | `pos_julgamento` | `intimacao_sentenca_plenario` | — |
| 9 | `contrarraz` | Contrarrazões | URGENTE | 8 | diligencia | `pos_julgamento` | `contrarrazoes` | — |
| 10 | `\bapel` | Analisar apelação | URGENTE | 5 | diligencia | `pos_julgamento` | `apelacao` | — |
| 11 | `precatoria` | Cumprir precatória | NORMAL | — | diligencia | — | `precatoria` | — |
| 12 | `tomar ciencia\|intimacao\|\bciencia\b` | Ciência | BAIXA | — | ciencia | — | — | — |

Se nenhuma regra Júri casar → fallback para o título genérico da timeline
(`_decide_by_titulo`) + `RULES_BASE`.

---

## Execução Penal — IMPLEMENTADO (`RULES_EP`, `varredura_triagem.py`)

Aplicada quando `"EXECUCAO_PENAL" in atribuicao`, **antes** de `RULES_BASE`.
Todos os atos, exceto o último (fallback genérico "decisão"), gravam
`fase="execucao_definitiva"` — a distinção fica no `motivo`.

| # | Pattern (regex, texto normalizado) | Ato | Prioridade | Prazo | Registro | Fase | Motivo |
|---|---|---|---|---|---|---|---|
| 1 | `extin\w*.{0,20}punibilidade\|pena.{0,10}cumprida\|prescri(c\|ç)` | Extinção da punibilidade | ALTA | 5 | diligencia | `execucao_definitiva` | `extincao_punibilidade` |
| 2 | `reconvers` | Manifestação contra reconversão | ALTA | 5 | diligencia | `execucao_definitiva` | `incidente_falta_grave` |
| 3 | `regress.{0,20}regime\|falta grave` | Manifestação contra regressão | URGENTE | 5 | diligencia | `execucao_definitiva` | `incidente_falta_grave` |
| 4 | `rescis.{0,20}anpp\|descumpr.{0,20}anpp` | Impugnação à rescisão de ANPP | URGENTE | 5 | diligencia | `execucao_provisoria` | `incidente_falta_grave` |
| 5 | `sursis` | Alteração de condição do SURSIS | NORMAL | 5 | diligencia | `execucao_definitiva` | `progressao_regime` |
| 6 | `livramento condicional` | Livramento condicional | NORMAL | 5 | diligencia | `execucao_definitiva` | `livramento_condicional` |
| 7 | `remi(c\|ç)` | Remição de pena | NORMAL | 5 | diligencia | `execucao_definitiva` | `remicao` |
| 8 | `progress.{0,20}regime\|requisit.{0,20}progress\|calculo.{0,15}pena\|atestado.{0,15}pena` | Requerimento de progressão | NORMAL | 5 | diligencia | `execucao_definitiva` | `progressao_regime` |
| 9 | `sa(i\|í)da tempor` | Saída temporária | NORMAL | 5 | diligencia | `execucao_definitiva` | `saida_temporaria` |
| 10 | `permiss.{0,15}sa(i\|í)da` | Permissão de saída | NORMAL | 5 | diligencia | `execucao_definitiva` | `saida_temporaria` |
| 11 | `prisao domiciliar\|domiciliar` | Prisão domiciliar | URGENTE | 5 | diligencia | `execucao_definitiva` | `progressao_regime` |
| 12 | `indulto\|comuta(c\|ç)` | Indulto | ALTA | 5 | diligencia | `execucao_definitiva` | `extincao_punibilidade` |
| 13 | `transfer.{0,20}(unidade\|autos\|presidio)` | Transferência de unidade | NORMAL | 5 | diligencia | `execucao_definitiva` | `unificacao_soma_penas` |
| 14 | `unifica(c\|ç).{0,20}pena\|soma.{0,10}pena` | Unificação/soma de penas | NORMAL | 5 | diligencia | `execucao_definitiva` | `unificacao_soma_penas` |
| 15 | `\bdecisao\b` (fallback genérico) | Analisar decisão | NORMAL | — | diligencia | `execucao_definitiva` | `calculo_pena` |

Se nenhuma regra EP casar → fallback para o título genérico da timeline +
`RULES_BASE`.

> **Correção de precisão (regra #1):** o pattern original era `extin(c|ç)`
> (só cobria "extinção"/"extinguir"). Foi **ampliado** para `extin\w*` durante
> a implementação porque intimações reais usam a forma "**extinta** a
> punibilidade" (particípio), que `extin(c|ç)` não casava. Se essa regra for
> reescrita/parafraseada no futuro, preservar `extin\w*` (não regredir para
> `extin(c|ç)`), sob pena de perder o caso mais comum na prática.

---

## Criminal Comum — IMPLEMENTADO, AUTORADA PORÉM INERTE (`RULES_CRIMINAL`, `varredura_triagem.py`)

Aplicada quando `"CRIMINAL" in atribuicao`, **antes** de `RULES_BASE`.
**Inerte em produção**: `ATRIB_UNIDADE` ainda não mapeia nenhuma unidade
`CRIMINAL_*` para uma vara real do PJe, então o scraping automático nunca
passa `atribuicao` contendo `"CRIMINAL"` — este ramo só é alcançado quando
`atribuicao` é passada manualmente (ex.: chamadas diretas a `classify()`,
testes). Fica pronta para quando a unidade Criminal for cadastrada.

| # | Pattern (regex, texto normalizado) | Ato | Prioridade | Prazo | Registro | Fase | Motivo |
|---|---|---|---|---|---|---|---|
| 1 | `resposta a acusacao\|arts?\.?\s*396` | Resposta à Acusação | URGENTE | 10 | diligencia | `resposta_acusacao` | `citacao_resposta_acusacao` |
| 2 | `(alegacoes finais\|memoriais)` | Alegações finais (memoriais) | URGENTE | 5 | diligencia | `alegacoes_finais` | `alegacoes_finais_memoriais` |
| 3 | `(designo\|designada\|fica designada).{0,40}(audiencia\|aij\|instrucao)` | Ciência designação de AIJ | NORMAL | — | ciencia | `instrucao` | `designacao_aij` (`agendar_audiencia`, tipo_audiencia=INSTRUCAO) |
| 4 | `\bsentenca\b` | Analisar sentença | URGENTE | 5 | diligencia | `sentenca` | `intimacao_sentenca` |
| 5 | `\bapel\|recurso em sentido estrito\|\brese\b` | Analisar recurso | URGENTE | 5 | diligencia | `recurso` | `prazo_recurso` |
| 6 | `tomar ciencia\|intimacao\|\bciencia\b` | Ciência | BAIXA | — | ciencia | — | — |

Se nenhuma regra Criminal casar → fallback para o título genérico da timeline
+ `RULES_BASE`.

---

## Leitura PDF/OCR (anti-ciência)

A varredura só extrai texto de PDF a partir dos **autos digitais completos**
(`listProcessoCompletoAdvogado.seam`), NUNCA a partir de
`visualizarExpediente.seam` (o popup do botão **"TOMAR CIÊNCIA"** no painel de
Expedientes). Abrir esse popup **efetiva a ciência** no PJe e dispara o prazo
de 10 dias corridos — por isso `read_doc_content` (linha ~1066) e
`baixar_pdf_autos` (linha ~1194) rejeitam qualquer link que não contenha
`listprocessocompletoadvogado.seam` na URL, ou que contenha
`visualizarexpediente.seam`/`tomarciencia`. Quando o link é rejeitado, a
demanda cai em `manual-review` em vez de arriscar dar ciência automaticamente.

Extração de texto do PDF (`extract_pdf_text(pdf_path)`):
1. Tenta `pdftotext -layout` (rápido, funciona para PDF nativo/texto real).
2. Se o resultado vier vazio ou com menos de 20 caracteres (PDF digitalizado/
   escaneado), cai para OCR: `pdftoppm -r 200 -png` (rasteriza cada página) →
   `tesseract <png> - -l por` (OCR em português) por página, concatenando o
   resultado.
3. Nunca lança exceção — qualquer erro ou binário ausente (`pdftotext`,
   `pdftoppm`, `tesseract`) retorna string vazia, e o pipeline trata isso como
   "conteúdo não lido" (`content_ok=False` → `_status="nao_lido"` no registro
   de análise, ver `SKILL.md`).

`baixar_pdf_autos` só é chamado depois que `read_doc_content` já validou que o
link é de autos completos — a trava é aplicada nos dois pontos (defesa em
profundidade), pois são dois fluxos de navegação distintos.

---

## Fallback (qualquer atribuição)

```yaml
- nome: PDF (binário) — leitura manual
  pattern: __frame_binario__   # detectado no extractor
  ato: 'Analisar decisão'
  prioridade: NORMAL
  registro_tipo: diligencia
  campos_extras:
    revisao_pendente: true

- nome: Conteúdo curto / sem match
  pattern: __no_match__
  ato: 'Ciência'                # mantém default
  prioridade: NORMAL
  registro_tipo: anotacao
  campos_extras:
    revisao_pendente: true
```

---

## Notas operacionais

- **Sempre normalizar acentos antes do regex** (`unicodedata.normalize('NFD', text).encode('ascii','ignore').decode().lower()`).
- **Não mexer em `status`** — a varredura não altera o ponto do kanban; isso é
  decisão do Rodrigo após revisar.
- **Prazo expresso vence presunção** — se o doc diz "5 dias", usar isso ao
  invés do default da regra.
- **Datas relativas** — `prazo` deve ser convertido para data absoluta usando
  data de intimação eletrônica (expedição + 10 dias corridos), conforme
  `reference_prazo_intimacao_eletronica.md`.
