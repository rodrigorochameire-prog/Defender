---
name: analise-sentenca
description: Extrai inteligência estruturada de uma SENTENÇA CRIMINAL de 1º grau capturada do PJe — tipo de decisão, dispositivo, crimes imputados/condenados/absolvidos, dosimetria completa, teses defensivas acolhidas/rejeitadas, flags de alerta e recomendação de próximo passo. Use ao classificar/analisar uma sentença de 1º grau (condenatória, absolutória, parcial, absolvição sumária, extintiva, pronúncia/impronúncia/desclassificação). Lane=browser, orquestra o capture browser-lane.
---

# Análise de sentença criminal de 1º grau (lane ai — daemon Max)

## Papel

Extrair **inteligência estruturada** de uma sentença criminal de 1º grau: o que foi
decidido, como a pena foi dosada, quais teses da defesa passaram, onde há ângulo de
recurso e o que a Defensoria deve fazer a seguir. A saída alimenta tanto a estratégia
do caso quanto **agregados institucionais** (perfil de magistrados, taxas de acolhimento
de teses, recorrência de flags) — por isso as regras de des-identificação abaixo são
**load-bearing**.

## Orquestração (esta skill é a unidade de trabalho que o daemon browser-lane roda)

Você recebe, na **Instrução adicional**, um JSON com a tarefa em **snake_case** (como a varredura enfileira):
`{demanda_origem_id, numero_processo, pje_documento_id, assistido_id, atribuicao, registro_raw_text}`.
Ao chamar a mutation tRPC no passo 3, mapeie para **camelCase** (`demanda_origem_id`→`demandaOrigemId`, etc.).

1. **Capturar o PDF e o texto** — rode o script browser-lane com o payload:
   ```
   python3 .claude/skills/analise-sentenca/scripts/capturar_sentenca.py \
     --numero-processo "<numeroProcesso>" \
     --pje-documento-id "<pjeDocumentoId>" \
     --assistido-id <assistidoId> \
     --atribuicao "<atribuicao>"
   ```
   (ou `--json '{...}'` com as quatro chaves). A saída é um único objeto JSON:
   - `{"ok": true, "drive_files_row_id": <int>, "texto_integral": "<...>"}` → siga.
   - `{"ok": false, "error": "<msg>", "stage": "<...>"}` (exit ≠ 0) → **fallback**:
     use o `registro_raw_text` da Instrução adicional como `texto_integral` e `driveFileId = null`.
2. **Produzir o JSON `AnaliseSentenca`** a partir do `texto_integral` (schema abaixo).
3. **Persistir** chamando a mutation tRPC `sentencas.upsertFromAnalysis` com:
   ```json
   {
     "demandaOrigemId": <int>,
     "numeroProcesso": "<...>",
     "pjeDocumentoId": "<...>",
     "assistidoId": <int>,
     "atribuicao": "<...>",
     "driveFileId": <drive_files_row_id | null>,
     "analiseIa": { ...objeto AnaliseSentenca... }
   }
   ```
   (`driveFileId` = o `drive_files_row_id` inteiro devolvido pela captura, ou `null`
   no fallback.) A mutation é idempotente (dedup por processo+documento / demanda).

## Contrato de entrada

- Entrada = **texto integral** da sentença (`texto_integral`).
- **Token guard:** se o texto for muito grande, faça uma sumarização por seção primeiro
  — **relatório**, **fundamentação**, **dispositivo** e **dosimetria** — e depois um
  **passe estruturado final** sobre os resumos para emitir o JSON. Nunca trunque cega­mente:
  o dispositivo e a dosimetria são as seções de maior densidade probatória.
- Baseie-se **somente** no texto. Se uma seção não existir/for ilegível, use `null` ou
  array vazio e rebaixe o `confidence`. **No Invention** — não preencha pena/dosimetria
  por suposição.

## Contrato de saída (emita SOMENTE este objeto JSON)

Deve casar **campo a campo** com o tipo `AnaliseSentenca` de
`src/lib/db/schema/sentencas.ts`. Enums VERBATIM abaixo.

```json
{
  "tipoDecisao": "CONDENATORIA | ABSOLUTORIA | PARCIAL | ABSOLVICAO_SUMARIA | EXTINTIVA_PUNIBILIDADE | PRONUNCIA | IMPRONUNCIA | DESCLASSIFICACAO",
  "resultado": "1 frase — o resultado global da sentença para o réu",
  "dispositivoResumo": "resumo fiel do dispositivo (condenação/absolvição/extinção + penas)",
  "crimesImputados":  [ { "artigo": "<ex: art. 157, §2º, II, CP>", "descricao": "<nome do crime>" } ],
  "crimesCondenados": [ { "artigo": "<...>", "descricao": "<...>" } ],
  "crimesAbsolvidos": [ { "artigo": "<...>", "descricao": "<...>" } ],
  "pena": {
    "privativa": { "anos": <int>, "meses": <int>, "dias": <int> },
    "regimeInicial": "FECHADO | SEMIABERTO | ABERTO | null",
    "substituicaoPRD": { "concedida": <bool>, "quais": ["<pena restritiva de direitos>"] },
    "sursis": <bool>,
    "diasMulta": <int | null>,
    "valorMulta": "<ex: 1/30 do salário mínimo | null>",
    "detracaoConsiderada": <bool>
  },
  "dosimetria": {
    "penaBase": "<ex: 5 anos e 4 meses | null>",
    "circunstanciasJudiciais": [
      { "circunstancia": "<ex: culpabilidade / antecedentes / conduta social / ...>",
        "valoracao": "FAVORAVEL | DESFAVORAVEL | NEUTRA",
        "fundamento": "<por que o juízo valorou assim>" }
    ],
    "atenuantes": ["<atenuante reconhecida>"],
    "agravantes": ["<agravante reconhecida>"],
    "causasAumento": ["<causa de aumento aplicada>"],
    "causasDiminuicao": ["<causa de diminuição aplicada>"],
    "penaDefinitiva": "<ex: 6 anos de reclusão | null>"
  },
  "tesesDefensivas": {
    "acolhidas":  ["<tese da defesa acolhida — genérica, sem nome do réu>"],
    "rejeitadas": ["<tese da defesa rejeitada — genérica, sem nome do réu>"]
  },
  "provasValoradas": ["<prova que fundamentou a decisão — ex: prova testemunhal, perícia, confissão>"],
  "fundamentosChave": ["<fundamento decisório central — genérico, sem identificadores pessoais>"],
  "precedentesCitados": ["<súmula / tese / julgado citado na sentença — ex: Súmula 444 STJ>"],
  "juizProlator": "<nome do(a) magistrado(a) que prolatou a sentença>",
  "dataSentenca": "<YYYY-MM-DD da sentença, ou null>",
  "recurso": {
    "prazoRecursal": "<ex: 5 dias (apelação) | null>",
    "recursoCabivel": "<apelação | RESE | embargos de declaração | null>",
    "fundamentoRecurso": "<ângulo recursal preliminar — ex: dosimetria, nulidade, fragilidade probatória | null>"
  },
  "flagsAlerta": ["<red flag defensivo — genérico, sem nome do réu>"],
  "impactoParaDefesa": "1-2 frases — o que esta sentença significa para a defesa do réu",
  "recomendacaoProxPasso": "providência objetiva no imperativo + prazo (ex: 'Interpor apelação em 5 dias')",
  "confidence": "alta | media | baixa"
}
```

### Notas de preenchimento
- `pena` e `dosimetria` podem ser `null` inteiros quando a decisão **não condena**
  (absolutória, extintiva, impronúncia, absolvição sumária). Em condenação parcial,
  preencha com a pena efetivamente aplicada.
- `tipoDecisao` deve refletir o dispositivo: júri 1ª fase → `PRONUNCIA` / `IMPRONUNCIA`
  / `DESCLASSIFICACAO` / `ABSOLVICAO_SUMARIA`; extinção (prescrição, morte, etc.) →
  `EXTINTIVA_PUNIBILIDADE`; condenação + absolvição no mesmo dispositivo → `PARCIAL`.
- `recurso.recursoCabivel`: condenação/absolvição → **apelação**; pronúncia / impronúncia
  / desclassificação / absolvição sumária (júri) → **RESE**; omissão/contradição → **ED**.

## Guia de `flagsAlerta` (red flags defensivos)

Aponte sinais que abrem ângulo de defesa/recurso. Exemplos canônicos (frasear genérico):
- "regime mais gravoso que o cabível (Súmula 718/719 STF)";
- "circunstância judicial negativada sem fundamento idôneo (Súmula 444 STJ)";
- "dosimetria genérica / pena-base elevada sem fundamentação concreta";
- "condenação fundada só em depoimento de policial";
- "negativa de substituição/sursis sem fundamentação";
- "valoração negativa de inquéritos/ações em curso como maus antecedentes (Súmula 444 STJ)";
- "fixação de regime sem observância das frações do art. 33 CP".

## Restrição de des-identificação (LOAD-BEARING)

Os campos-array que alimentam **agregados institucionais** —
`tesesDefensivas` (`acolhidas`/`rejeitadas`), `flagsAlerta`, `fundamentosChave` e
`precedentesCitados` — DEVEM ser frasados de forma **genérica** e **NÃO podem conter**
o nome do assistido, CPF ou qualquer identificador pessoal. Refira-se ao acusado como
**"o réu"/"a ré"**. O **único** nome próprio admitido em toda a saída é `juizProlator`
(o magistrado). Os demais campos narrativos (`resultado`, `dispositivoResumo`,
`impactoParaDefesa`, `recomendacaoProxPasso`) também não devem expor CPF nem dados
sensíveis além do estritamente necessário.

## Princípios inegociáveis

- **"Cabe recurso" é sempre preliminar** — `recurso.fundamentoRecurso` é um ângulo a
  conferir, não conselho definitivo. Na dúvida, `null`.
- **No Invention** — toda afirmação tem que estar no texto; sem texto, `null`/array vazio
  e `confidence` mais baixo.
- **Conciso e acionável** — o Defensor lê rápido; `recomendacaoProxPasso` no imperativo
  com prazo.
- **Não** use ferramentas MCP nem rede além do script de captura e da mutation tRPC.
- **Idempotente** — `sentencas.upsertFromAnalysis` deduplica; reprocessar não duplica.
