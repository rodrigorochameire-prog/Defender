# Análise profunda de intimação (varredura nível 3) + correção da detecção de MPU

**Data:** 2026-06-27
**Status:** Design aprovado (decisões do usuário registradas) — aguardando revisão do spec
**Autor:** Claude + Rodrigo

## Problema / objetivo

A varredura de triagem hoje classifica o ato, define prioridade/prazo e cria **um** registro de
ciência/diligência com o texto bruto do documento. Falta a camada de **interpretação**: um registro
de **anotação** que resuma, em linguagem objetiva, **o objeto da intimação e o que a DPE deve fazer**,
com lógica específica por tipo de intimação. Além disso, side-effects já detectados (agendar/reagendar
audiência) **nunca são executados**, e a **detecção de MPU no kanban está quebrada** (filtra pela classe
do processo, mas a maioria das MPUs são intimações `MPUMPCrim` dentro de processos `AP`).

### Decisões do usuário (2026-06-27)
1. **Motor de análise:** IA (daemon Max, `claude -p`, lane=ai) para os resumos/análises interpretativas.
2. **Escopo:** completo (todos os tipos de intimação de uma vez).
3. **Google Calendar:** inserir a audiência na agenda do OMBUDS agora; sync com Google depois.

## Comportamento por tipo de intimação (objetivo final)

| Intimação | Registro(s) | Agenda | Análise IA |
|---|---|---|---|
| Audiência designada | ciência + anotação (resumo + o que fazer) | **insere `audiencias`** (data/hora/tipo/local) | resumo |
| Audiência redesignada | ciência + anotação | **cancela a anterior do MESMO tipo + insere nova** | resumo |
| Sentença | ciência + anotação | — | resumo + **"cabe recurso?" (apelação; preliminar, revisar)** |
| Impronúncia / desclassificação / absolvição sumária | ciência + anotação | — | resumo + **recurso = RESE** (não apelação) |
| Pronúncia | ciência + anotação | (sessão júri se houver data) | **termos** (crime/qualificadoras/fundamentos) |
| Acórdão | ciência/diligência + anotação | — | resumo + **recurso = ED / REsp / RE** |
| Decisão (outra) | ciência/diligência + anotação | — | resumo do conteúdo |
| MPU (deferida/modulação/etc.) | **2 registros**: "Medidas protetivas deferidas" (determinístico) + "Relato da suposta vítima" (IA) | — | relato da vítima; medidas via parser |
| Resposta à acusação | diligência + anotação | — | o que preparar + **contato do assistido** (determinístico) |
| Alegações finais / memoriais | diligência + anotação | — | o que abordar |
| Contrarrazões (resposta a recurso do MP) | diligência + anotação | — | o que rebater |
| Execução penal (progressão/livramento/remição/falta grave) | diligência/ciência + anotação | — | resumo + providência |
| Edital / citação | ciência + anotação | — | resumo |
| Despacho administrativo (juntada, remessa ao MP, baixa) | ciência/anotação **only — NÃO enfileira IA** | — | — (skip) |

**Regra de enfileiramento IA:** só vão para a IA intimações com conteúdo interpretável. Atos de mera
ciência administrativa (remessa ao MP, juntada, baixa, edital sem conteúdo) recebem `enrichment_status="skipped"`
e não geram task — evita custo de IA inútil.

## Arquitetura — 2 fases

### Fase 1 — Varredura (determinística; estende `varredura_triagem.py`)
Por demanda triada, após `classify()`:
1. Atualiza `ato/prioridade/prazo` + cria registro base (ciência/diligência) — **já existe**, com guarda
   de idempotência `registro_exists(demanda_id, titulo)` **já implementada**. Inserir o registro base com
   `Prefer: return=representation` para obter o `id` (necessário p/ vincular `audiencia_id`).
2. **Persiste o texto completo** do documento em `registro.enrichment_data.raw_text` (jsonb), **não** em
   `conteudo` (este permanece legível/humano). Marca `enrichment_status` (ver máquina de estados abaixo).
   A IA lê `raw_text` — evita re-raspar o PJe (sem novo login).
3. **Executa side-effects** (hoje só marcados):
   - `agendar_audiencia` / `reagendar_audiencia`: extrai data/horário/tipo/local via novo
     `designacao_parse.py` (porta de `detectar-designacao-audiencia.ts` **+ `tipos-audiencia.ts`** —
     `detectarSlug`/`tipoPorSlug`, p/ resolver o tipo canônico). Insere linha em `audiencias` com TODOS os
     vínculos (`processo_id`, `assistido_id`, `defensor_id`, `data_audiencia` ISO `-03:00`, `horario`,
     `tipo`, `local`, `titulo`, `descricao`, `status="agendada"`).
     **Idempotência:** chave `(processo_id, data_audiencia, tipo)` — não insere se já existe igual.
     **Redesignação:** cancela apenas audiências abertas do processo **do mesmo tipo** (não todas), depois
     insere a nova. Vincula `registro.audiencia_id` (PATCH no registro base com o id retornado).
     Sem data → diligência "definir data da audiência" (não inventa data). `google_calendar_event_id=NULL`.
     Atenção ao enum: `audiencias.status` usa "agendada"/"cancelada"/"realizada" (≠ enum de `registros`).
   - MPU: novo `mpu_parse.py` (porta de `parse-decisao.ts` + `medidas-taxonomia.ts`) extrai medidas →
     grava `processos_vvd.medidas_deferidas` (jsonb), `tipos_mpu`, `distancia_minima`, `data_decisao_mpu` →
     cria registro **"Medidas protetivas deferidas"** (tipo `anotacao`).
   - Resposta à acusação: busca `assistidos.telefone/telefone_contato/nome_contato/parentesco_contato`
     e injeta no registro base.
4. Enfileira **1 task IA** em `claude_code_tasks` (lane=ai, skill `analise-intimacao`,
   `instrucao_adicional={demanda_ids:[...]}`) — apenas demandas com `enrichment_status="pending"`
   (não `skipped`).

### Fase 2 — Enriquecimento IA (daemon Max, `claude -p`, skill `analise-intimacao`)
Consome a task de `claude_code_tasks` (lane=ai, via o daemon `claude-code-daemon.mjs` existente).
Para cada registro base com `enrichment_status="pending"`:
1. Marca `processing`. Lê `enrichment_data.raw_text` + `ato` + contexto (assistido/processo).
2. `claude -p` com **saída estruturada (JSON)**: `{ resumo_objeto, o_que_fazer, tipo_analise,
   sentenca:{resumo, cabe_recurso, recurso_cabivel, fundamento}, decisao:{resumo},
   mpu:{relato_vitima}, pronuncia:{termos} }`.
3. Escreve registro **`anotacao`** "Resumo e providências (IA)" = resumo do objeto + o que fazer.
   - Sentença/acórdão/impronúncia → bloco "Cabe recurso? (análise preliminar — revisar)" com o recurso
     cabível (apelação/RESE/ED/REsp/RE).
   - MPU → cria registro separado **"Relato da suposta vítima"**.
   - Pronúncia → termos.
4. Marca registro base `enrichment_status="done"` + grava `enrichment_data` (mantém `raw_text`).
   Idempotente: não recria anotação se já existir título igual na demanda.

### Máquina de estados `enrichment_status` + re-drive
`pending` → (task IA) → `processing` → `done` | `error`. `skipped` = não-interpretável (sem IA).
**Re-drive:** a cada nova varredura (e/ou um cron leve), registros presos em `pending`/`error`/`processing`
há > 30 min são re-enfileirados. Falha de IA nunca trava o registro para sempre.

## Correção: detecção de MPU no kanban (bug)

**Causa:** filtro usa `processos[0].tipo === "MPU"`, mas 25/45 demandas VVD são `MPUMPCrim` (classe da
**intimação**, em `enrichment_data.tipo_processo`) dentro de processos `AP` (classe do processo, que
nunca é sobrescrita por design).

**Correção (sem fragmentar a fonte de verdade):**
1. **Estender** o helper canônico `src/lib/mpu.ts` para aceitar opcionalmente `enrichmentTipoProcesso`,
   **mantendo todos os checks atuais** (`processoVvd.tipoProcesso === "MPU"`, `mpuAtiva === true`,
   `numeroAutos.startsWith("MPUMP")`) e **adicionando** `^MPU` na classe da intimação. O regex em `ato`
   entra só como **fallback de última instância** (documentado), por ser fuzzy.
2. `demandas.list` (`src/lib/trpc/routers/demandas.ts`): **adicionar `enrichmentData` ao select**
   (e join em `processos_vvd` p/ `mpuAtiva`, se reusar o helper completo), computar `isMpu` server-side e
   **propagar pelo mapper client** (`demandas-premium-view.tsx:1112`).
3. Kanban: filtro 3-estados (2157-2161), **contador `tipoProcessoCounts` (2480-2491) E a pílula (2765)**
   passam a usar `demanda.isMpu`. Semântica de exibição: uma demanda MPUMPCrim-dentro-de-AP conta como MPU
   no switch; o chip de classe continua "AP" (classe do processo) — `isMpu` é a verdade p/ filtro, o chip é
   a classe canônica do processo. Documentar para não confundir.
4. Espelhar a mesma lógica no worker Python (`_is_mpu`) — hoje já cobre `tipo_processo`/`mpu_ativa`/`MPUMP`;
   adicionar o sinal da classe da intimação (`enrichment_data.tipo_processo` `^MPU`).

## Entregáveis
1. `varredura_triagem.py`: executor de side-effects (agenda + MPU + contato), persistência de texto em
   `enrichment_data.raw_text`, máquina `enrichment_status`, enfileiramento da task IA, `return=representation`
   no registro base, espelho do `_is_mpu` com classe da intimação.
2. `designacao_parse.py` + **porta de `tipos-audiencia.ts`** + testes (data/hora/tipo/local; designação ×
   redesignação; idempotência por `(processo_id, data, tipo)`).
3. `mpu_parse.py` + testes (medidas canônicas, distância, ofendida).
4. Skill `analise-intimacao/` (SKILL.md + script lane=ai) + prompt + schema + writer de registros.
5. Daemon ai (`claude-code-daemon.mjs`): registro/roteamento da skill `analise-intimacao` (lane=ai) +
   payload `{demanda_ids}`; re-drive de `pending/error/processing` antigos.
6. `src/lib/mpu.ts`: estender helper canônico (param `enrichmentTipoProcesso`). `demandas.list`: select
   `enrichmentData` + join `processos_vvd` + `isMpu`. `demandas-premium-view.tsx`: mapper + filtro +
   contador + pílula usando `isMpu`.
7. **Corpus de fixtures compartilhado** (JSON input→expected) consumido pelos testes TS e Python dos
   parsers MPU/designação — força paridade mecânica (evita drift como no `_is_mpu`). Teste da saída IA só
   valida o envelope (sempre "preliminar — revisar"; JSON válido), nunca o veredito.

## Riscos / mitigações
- **"Cabe recurso" é juízo sensível** → marcar SEMPRE como "análise preliminar — revisar"; nunca
  apresentar como conselho definitivo.
- **Parsing de data de audiência falha** → fallback diligência "definir data" (não inventa data).
- **Custo/latência IA** → 1 task por lote; processa em sequência; não bloqueia a varredura.
- **Idempotência** → guarda por (demanda_id, titulo) em todos os registros; re-rodar não duplica.
- **Anti-ciência** → mantida (worker só lê `listProcessoCompletoAdvogado.seam`).

## Não-objetivos (desta fase)
- Sync Google Calendar (fica para fase posterior).
- Prazo na agenda (continua em `demandas.prazo` + kanban).
- Geração automática de peças (só análise/registros).
