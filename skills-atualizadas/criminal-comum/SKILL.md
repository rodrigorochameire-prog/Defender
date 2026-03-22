---
name: criminal-comum
description: "Gerador de peças jurídicas para a atribuição CRIMINAL COMUM da Defensoria Pública do Estado da Bahia (DPE-BA), 7ª Regional – Camaçari. Use esta skill SEMPRE que o usuário pedir qualquer peça de direito penal comum (não VVD, não júri, não execução penal): habeas corpus, requerimento de relaxamento/revogação de prisão preventiva, recurso em sentido estrito (RESE), apelação criminal, alegações finais criminais, resposta à acusação criminal, absolvição sumária, pedido de incidente de insanidade, diligências do art. 422 CPP, petição intermediária ou síntese processual. Também acione quando o usuário mencionar: 'HC', 'habeas', 'relaxamento', 'revogação de prisão', 'RESE', 'apelação criminal', 'alegações finais', 'resposta à acusação', 'RA criminal', 'insanidade', '422 CPP', 'petição intermediária', 'síntese processual', ou qualquer peça de defesa criminal geral. Gera documentos .docx com cabeçalho e rodapé institucionais da DPE-BA."
---

# Peças Jurídicas — Criminal Comum (DPE-BA, 7ª Regional – Camaçari)

Esta skill gera documentos .docx formatados com o padrão institucional da Defensoria Pública para a atribuição de **Criminal Comum**. Cada tipo de peça possui um prompt especializado na pasta `references/`.

## Fluxo de Trabalho

1. **Identificar o tipo de peça** — Veja a tabela abaixo e pergunte ao usuário se não ficou claro
2. **Carregar o prompt específico** — Leia o arquivo correspondente em `references/`
3. **Coletar informações do caso** — Peça dados do assistido, número dos autos, fatos relevantes
4. **Gerar a minuta** — Siga o prompt carregado para compor o conteúdo jurídico
5. **Gerar o .docx** — Use python-docx com a formatação institucional (veja seção abaixo)
6. **Salvar na pasta do usuário**

## Tipos de Peça Disponíveis

| Tipo de Peça | Arquivo de Referência | Quando Usar |
|---|---|---|
| Habeas Corpus | `references/habeas_corpus.md` | Coação ilegal, prisão sem fundamentação |
| HC por excesso prazal | `references/habeas_corpus_excesso_prazal.md` | Especificamente para excesso de prazo na prisão |
| Revogação/Relaxamento de prisão | `references/requerimento_relaxamento_revogacao.md` | Prisão preventiva sem pressupostos do art. 312 CPP |
| Recurso em Sentido Estrito | `references/recurso_em_sentido_estrito.md` | Contra decisão interlocutória |
| Apelação Criminal | `references/apelacao_criminal.md` | Contra sentença condenatória criminal comum |
| Alegações Finais (criminal) | `references/alegacoes_finais_criminal.md` | Memoriais após instrução criminal |
| Alegações Finais (aprimorado) | `references/alegacoes_finais_aprimorado.md` | Versão mais detalhada de alegações finais |
| Resposta à Acusação (Criminal) | `references/resposta_acusacao_criminal.md` | RA versão completa com análise estratégica |
| Resposta à Acusação (básica) | `references/resposta_acusacao_basica.md` | RA versão simplificada |
| Insanidade / Incidente / Quesitos | `references/insanidade_incidente_quesitos.md` | Pedido de incidente de insanidade mental |
| Petição intermediária | `references/peticao_intermediaria.md` | Petições diversas durante o processo |
| Síntese processual | `references/sintese_processual.md` | Resumo/síntese do processo |

> **Nota**: Peças específicas do Tribunal do Júri (apelação pós-júri, alegações finais do júri, diligências do 422 CPP, absolvição sumária) estão na skill **juri**.

## Como Usar os Prompts de Referência

Cada arquivo em `references/` contém o prompt completo extraído do Gemini Gem correspondente. Ao gerar uma peça:

1. **Leia o arquivo de referência** correspondente ao tipo de peça solicitado
2. **Siga as instruções do prompt** como se fossem suas instruções de trabalho
3. **Adapte com os dados reais** fornecidos pelo usuário
4. **Aplique a formatação DPE-BA** descrita abaixo ao gerar o .docx

## Formatação Institucional Obrigatória (PADRÃO DPE-BA)

### Página e Margens
- Tamanho: A4 (11906 x 16838 twips)
- Margem superior: 2552 twips (~4.5cm)
- Margem inferior: 1134 twips (2cm)
- Margem esquerda: 1418 twips (2.5cm)
- Margem direita: 1134 twips (2cm)
- Header distance: 567 twips / Footer distance: 567 twips

### Fonte e Corpo do Texto
- **Corpo**: Verdana, 12pt, justificado, recuo 1ª linha 720 twips, espaçamento 1.5, espaço após 10pt
- **Rodapé**: Arial Narrow, 8pt
- **Títulos de seção**: justificado, negrito, sem recuo, linha em branco real antes, espaço após 6pt

### Endereçamento e Epígrafe
- Endereçamento: justificado, negrito, sem recuo, espaço após 0pt + 2 linhas em branco
- Epígrafe: justificado, negrito, sem recuo, espaço após 20pt + 2 linhas em branco

### Qualificação + Nome da Peça
- No mesmo parágrafo (inline), com recuo de 1ª linha
- Nome do assistido em negrito, nome da peça em negrito

### Fecho e Assinatura — **EXCLUSIVO para peças processuais formais**
- "Nesses termos, pede deferimento." — parágrafo normal com recuo
- Data: justificado com recuo (NÃO centralizado), formato "DD de mês de YYYY"
- Assinatura: centralizado, negrito, "Rodrigo Rocha Meire" / "Defensor Público"

> ⚠️ **Exceção — Síntese Processual e documentos internos**: Síntese processual, análises, pareceres para uso interno **NÃO levam assinatura formal**. Encerram com Rodapé do Relatório: tabela discreta (fundo `FFF0F0`, borda top `991B1B`) com identificação do processo e nota "Documento de uso exclusivo interno · Não constitui peça processual".

### Cabeçalho e Rodapé
- Header: logo `assets/dpe_logo.png` centralizada, 1.777x1.101 inches, opacidade 60%
- Footer: borda superior 4pt, centralizado, Arial Narrow 8pt, "Defensoria Pública do Estado da Bahia" / "7ª Regional da DPE – Camaçari – Bahia."

## Como Gerar o Documento

Usar **python-docx** (Python). O script base está em `scripts/gerar_docx.py` — leia-o para a estrutura completa de formatação e helpers. Adapte o conteúdo conforme o tipo de peça.

Instalar: `pip install python-docx Pillow numpy --break-system-packages`

### Pré-processamento da Logo (opacidade 60%)

```python
from PIL import Image
import numpy as np
img = Image.open("assets/dpe_logo.png").convert("RGBA")
arr = np.array(img, dtype=np.float64)
opacity = 0.60
white = np.full_like(arr[:,:,:3], 255.0)
arr[:,:,:3] = arr[:,:,:3] * opacity + white * (1 - opacity)
arr[:,:,3] = 255
result = Image.fromarray(arr.astype(np.uint8)).convert("RGB")
result.save("dpe_logo_faded.png")
```

## Importante

- Sempre usar **python-docx** (não a biblioteca npm)
- Data gerada automaticamente em português (ex: "10 de março de 2026")
- Nome do arquivo: `[Tipo da Peça] - [Nome do Assistido].docx`
- Salvar na pasta do usuário

## Integração OMBUDS — Geração Automática de `_analise_ia.json`

> **OBRIGATÓRIO**: Ao final de TODA peça ou análise gerada por esta skill, ALÉM do documento .docx principal, salve também um arquivo `_analise_ia.json` na **pasta raiz do assistido no Google Drive**.

### Localização do arquivo

O JSON deve ser salvo na pasta do assistido — a mesma pasta onde o documento principal é salvo. Se já existir um `_analise_ia.json` anterior, **substitua-o** (sobrescreva).

### Schema do JSON

```json
{
  "schema_version": "1.0",
  "tipo": "<habeas_corpus|relaxamento_revogacao|rese|apelacao_criminal|alegacoes_finais|resposta_acusacao|insanidade|peticao_intermediaria|sintese_processual>",
  "gerado_em": "<ISO 8601 — ex: 2026-03-22T14:30:00-03:00>",
  "assistido": "<nome completo do assistido>",
  "processo": "<número do processo no formato CNJ>",
  "resumo_fato": "<2-3 frases resumindo o fato apurado>",
  "tese_defesa": "<tese principal de defesa utilizada na peça>",
  "estrategia_atual": "<estratégia adotada ou recomendada>",
  "crime_principal": "<tipo penal imputado>",
  "pontos_criticos": ["<ponto crítico 1>", "<ponto crítico 2>"],
  "payload": {
    "tipo_peca": "<nome da peça gerada>",
    "teses_subsidiarias": ["<tese 1>", "<tese 2>"],
    "nulidades_arguidas": ["<nulidade 1>", "<nulidade 2>"],
    "pedidos": ["<pedido 1>", "<pedido 2>"],
    "status_prisional": "<preso|solto|medidas_cautelares|null>",
    "urgencia": "<alta|media|baixa>"
  }
}
```

### Regras de preenchimento

- `tipo`: usar o valor que melhor corresponde à peça gerada
- Campos sem informação disponível: usar `null` (não omitir o campo)
- Arrays sem itens: usar `[]` (não omitir)
- `gerado_em`: data/hora atual em ISO 8601 com fuso de Brasília (-03:00)
- O JSON deve ser válido e bem formatado (indentado com 2 espaços)

### Confirmação obrigatória

Após salvar o JSON, exiba a mensagem:
```
✅ _analise_ia.json salvo na pasta do assistido — pronto para importar no OMBUDS via botão "Importar do Cowork"
```

---

## Linguagem Estratégica da Defesa

A escolha das palavras numa minuta não é neutra — ela pode reforçar ou desconstruir a narrativa acusatória. Como Defensoria Pública, a peça deve ser tecnicamente rigorosa e, ao mesmo tempo, evitar termos que implicitamente aceitem a versão da acusação. Aplique este critério em todas as minutas.

### Evite "vítima" para se referir ao ofendido

A palavra "vítima" pressupõe que um crime ocorreu e que aquela pessoa o sofreu — premissa que a defesa contesta. Use alternativas neutras ou factuais:

| Em vez de | Prefira |
|-----------|---------|
| "a vítima foi hospitalizada" | "Fulano foi hospitalizado" (nome próprio) |
| "a vítima declarou" | "o ofendido declarou" / "Fulano declarou" |
| "a vítima faleceu" | "o ofendido veio a óbito" / "Fulano faleceu" |
| "os familiares da vítima" | "os familiares do falecido" / "familiares de Fulano" |

**Exceção importante**: quando o próprio assistido é a pessoa ofendida num processo distinto (ex.: registros de violência doméstica sofrida), "vítima" é favorável à defesa e deve ser mantido. Também é apropriado dizer que o assistido é "vítima de violência doméstica" em peças de VVD/criminal, mas prefira a terminologia oficial da Lei Maria da Penha: **"em situação de violência doméstica"** (art. 5º, Lei nº 11.340/2006).

### Outras escolhas linguísticas que importam

- **"supostamente"** e **"alegadamente"**: use ao narrar os fatos da denúncia — "o fato supostamente ocorrido em..."; "a conduta alegadamente praticada..."
- **"fato apurado"** ou **"fato narrado na denúncia"**: prefira a "crime" quando a autoria ou tipicidade está em disputa
- **"o assistido"** / **"a requerente"** / **"o acusado"**: corretos e neutros; evite expressões que antecipem julgamento
- **"o ofendido"**: tecnicamente adequado quando a lei processual assim o designa; não carrega a carga emocional de "vítima"
- **Verbos no condicional**: ao descrever fatos da acusação, prefira "teria praticado", "teria dito", "teria agredido"

### Raciocínio por trás dessa diretriz

O objetivo não é negar a realidade dos fatos, mas garantir que a minuta da Defensoria não construa, inadvertidamente, a narrativa da acusação. O juiz lê a peça da defesa e deve perceber, desde as primeiras linhas, que há uma perspectiva própria — técnica, respeitosa e distinta. Essa disciplina linguística é parte da estratégia defensiva, não mero preciosismo.
