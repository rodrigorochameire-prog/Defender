---
name: analise-intimacao
description: Enriquece a análise de intimações triadas — gera anotação com resumo do objeto, o que a DPE deve fazer, e análise por tipo (sentença→recurso, MPU→relato da vítima, pronúncia→termos). Lane=ai (daemon Max).
---

# Análise profunda de intimação (fase 2 — enriquecimento IA)

Você recebe, na **Instrução adicional**, um JSON `{"demanda_ids": [...]}`. Para cada
intimação já triada (fase 1 determinística), produza uma **anotação objetiva** para
o(a) Defensor(a): o que é a intimação e o que precisa ser feito.

## Procedimento (execute exatamente)

1. Extraia os ids da Instrução adicional.
2. Rode:
   `python3 .claude/skills-cowork/analise-intimacao/scripts/fetch_pending.py --ids <id1,id2,...>`
   → JSON array de itens: `{registro_id, demanda_id, ato, ato_atual, atribuicao,
   atribuicao_label, is_mpu, tipo_intimacao, assistido, processo, raw_text}`.
   Se vier `[]`, não há nada pendente — encerre.
2b. Carregue o **vocabulário canônico de atos** uma única vez:
   `cat src/config/atos-por-atribuicao.ts` (objeto `ATOS_POR_ATRIBUICAO`). Para cada
   item, os atos válidos são **somente** os da lista de `atribuicao_label`. Se
   `atribuicao_label` for `null` ou não estiver no objeto, não há vocabulário → não
   sugira ato (`ato_sugerido=null`).
3. Para CADA item, analise o `raw_text` e monte um objeto de resultado (schema abaixo).
4. Grave tudo de uma vez, passando o JSON array por stdin:
   `echo '<json_array>' | python3 .claude/skills-cowork/analise-intimacao/scripts/write_analise.py`
   (use um heredoc/arquivo temporário se o JSON for grande).
5. Reporte um resumo (quantas anotações, quantos relatos, quantos atos ajustados).

## Schema do resultado (por item)

```json
{
  "registro_id": <int>, "demanda_id": <int>,
  "assistido_id": null, "processo_id": null,
  "resumo_objeto": "Objeto: 1 frase curta — o que é esta intimação",
  "o_que_decidido": "1-2 frases: o que foi efetivamente decidido/determinado|null",
  "o_que_fazer": "Providência/Prazo: providência objetiva + prazo, se houver",
  "cabe_recurso": "sim|nao|talvez|null",
  "recurso_cabivel": "apelação|RESE|ED|REsp|RE|null",
  "fundamento_recurso": "1 frase de fundamento preliminar|null",
  "ato_atual": "<echo do ato_atual recebido no fetch>|null",
  "ato_sugerido": "ato do vocabulário canônico da atribuicao_label|null",
  "ato_confianca": "alta|media|baixa",
  "relato_vitima": "só MPU: relato da suposta vítima resumido|null",
  "termos_pronuncia": "só pronúncia: crime, qualificadoras, fundamentos|null"
}
```
> `assistido_id`/`processo_id` podem ficar null — o write resolve pelo registro base.
> Use os ids exatos vindos do fetch (`registro_id`, `demanda_id`).
> A anotação "Resumo e providências" é montada pelo write em seções curtas:
> **Objeto** (`resumo_objeto`) · **O que foi decidido** (`o_que_decidido`) ·
> **Providência/Prazo** (`o_que_fazer`) + bloco "Cabe recurso? (análise preliminar
> — revisar)". Mantenha cada seção enxuta.

## Sugestão de `ato` (vocabulário canônico — No Invention)

- `ato_sugerido` DEVE ser **exatamente** um item da lista de `atribuicao_label` em
  `ATOS_POR_ATRIBUICAO` (passo 2b). Nunca invente nome de ato. Fora da lista → `null`.
- Devolva `ato_atual` como veio no fetch (o write decide se troca).
- `ato_confianca`:
  - **alta** — o `raw_text` deixa o ato inequívoco (ex.: sentença condenatória →
    "Analisar sentença"/"Ciência de sentença"; designação de audiência →
    "Ciência designação de audiência"; pronúncia → "Ciência da pronúncia").
  - **media** — provável, mas o texto admite leitura alternativa.
  - **baixa** — texto insuficiente/ambíguo.
- O write só troca o `ato` da demanda quando `ato_confianca="alta"` **e** o `ato_atual`
  for genérico ("Analisar decisão/sentença/acórdão", "Ciência", "Cumprir despacho").
  Ato específico já definido nunca é sobrescrito — então, na dúvida, prefira `media`.

## Regras por tipo de intimação (use `ato`/`tipo_intimacao`/`raw_text`)

- **Sentença**: `resumo_objeto` = dispositivo (condenação/absolvição/penas).
  `cabe_recurso`: condenação→"sim"/apelação; absolvição→"nao". `fundamento_recurso`:
  ponto preliminar (ex.: dosimetria, nulidade, fragilidade probatória).
- **Impronúncia / desclassificação / absolvição sumária** (júri): recurso = **RESE**
  (não apelação). `cabe_recurso`="talvez", `recurso_cabivel`="RESE".
- **Acórdão**: recurso cabível = **ED** (omissão/contradição) ou **REsp/RE**
  (matéria de lei federal/constitucional). `cabe_recurso`="talvez" se houver ângulo.
- **Pronúncia**: `termos_pronuncia` = crime(s), qualificadoras mantidas/afastadas,
  fundamentos. `cabe_recurso`="talvez"/RESE.
- **Decisão (outra)**: `resumo_objeto` = o que foi decidido; `o_que_fazer` conforme.
- **MPU** (`is_mpu=true`): NÃO repita as medidas (a fase 1 já gravou "Medidas
  protetivas deferidas"). Aqui extraia o **`relato_vitima`** (o que a suposta
  vítima alegou) e oriente a defesa do requerido.
- **Resposta à acusação / alegações / memoriais / contrarrazões**: `o_que_fazer`
  com o foco da peça e o prazo; o contato do assistido já está no registro base.

## Princípios inegociáveis

- **"Cabe recurso" é SEMPRE preliminar** — o write já rotula "(análise preliminar
  — revisar)". Nunca afirme como conselho definitivo; na dúvida, "talvez".
- Seja **conciso e acionável** — o Defensor lê rápido. Sem juridiquês desnecessário.
- Baseie-se **somente** no `raw_text`. Se o texto for insuficiente, diga isso em
  `o_que_fazer` ("conferir inteiro teor no PJe") e deixe `cabe_recurso=null`.
- **Não** use ferramentas MCP nem rede além dos dois scripts. Apenas Bash + os scripts.
- Idempotente: o write não duplica anotação com mesmo título.
