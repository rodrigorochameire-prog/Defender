---
name: dpe-ba-pecas
description: "Gerador de peças jurídicas da Defensoria Pública do Estado da Bahia (DPE-BA), 7ª Regional – Camaçari. Use esta skill SEMPRE que o usuário pedir para criar qualquer documento jurídico/peça processual: requerimentos, petições, manifestações, alegações finais, memoriais, habeas corpus, recursos, ofícios, pareceres, ou qualquer outro documento institucional da DPE-BA. Também acione quando o usuário mencionar: 'peça', 'petição', 'requerimento', 'documento jurídico', 'DPE', 'Defensoria', 'formatação institucional', 'modelo padrão', ou quiser gerar documentos .docx com cabeçalho e rodapé da Defensoria Pública da Bahia."
---

# Gerador de Peças Jurídicas — DPE-BA (7ª Regional – Camaçari)

Esta skill gera documentos .docx formatados com o padrão institucional da Defensoria Pública do Estado da Bahia, 7ª Regional de Camaçari. Todas as peças seguem a identidade visual e formatação oficial aprovada.

## Fluxo de Trabalho

1. **Identificar o tipo de peça** — pergunte ao usuário qual tipo de documento deseja (ver `references/tipos_de_pecas.md`)
2. **Coletar informações do caso** — pergunte dados do assistido, número dos autos, comarca, fatos relevantes
3. **Gerar com python-docx** — usar o script `scripts/gerar_docx.py` como base, adaptando o conteúdo
4. **Salvar na pasta do caso** — o arquivo final vai para a pasta do usuário

## Formatação Institucional Obrigatória (PADRÃO APROVADO)

Estas especificações são o padrão fixo definitivo. Não altere sem instrução explícita do usuário.

### Página e Margens
- Tamanho: A4 (11906 x 16838 twips)
- Margem superior: **2552 twips** (~4.5cm, garante espaço entre logo e corpo)
- Margem inferior: 1134 twips (2cm)
- Margem esquerda: **1418 twips** (2.5cm, adequado para grampeamento)
- Margem direita: 1134 twips (2cm)
- Header distance: 567 twips
- Footer distance: 567 twips

### Fonte
- **Corpo do texto**: Garamond, 12pt
- **Rodapé**: Arial Narrow, 8pt

### Corpo do Texto
- Alinhamento: **justificado**
- Recuo de primeira linha: 720 twips
- Espaçamento entre linhas: **1.5**
- Espaço após parágrafo: 10pt
- Espaço antes de parágrafo: 0pt

### Títulos de Seção (ex: "I – SÍNTESE FÁTICA")
- **Linha em branco real antes** do título (parágrafo vazio editável pelo usuário)
- Alinhamento: justificado
- Negrito
- Sem recuo de primeira linha
- Espaço antes: 0pt (a separação é feita pela linha em branco)
- Espaço após: 6pt

### Endereçamento
- Justificado, negrito, sem recuo
- Espaço após: 0pt
- **Duas linhas em branco** entre endereçamento e epígrafe

### Epígrafe (nº dos autos)
- Justificado, negrito, sem recuo
- Espaço após: 20pt
- **Duas linhas em branco** entre epígrafe e qualificação

### Qualificação + Nome da Peça
- No mesmo parágrafo (inline), com recuo de primeira linha
- Nome do assistido em negrito, nome da peça em negrito

### Padrão Obrigatório de Preâmbulo (VIGENTE)

**Formato**: nome do assistido PRIMEIRO, depois Defensoria, depois fundamento constitucional.

```
[NOME DO ASSISTIDO EM MAIÚSCULAS], [qualificação — ex: "já qualificado nos autos" ou dados completos],
representado pela Defensoria Pública do Estado da Bahia,
com fundamento no art. 134 da Constituição da República,
por meio do defensor público subscritor,
vem respeitosamente perante V. Exa. apresentar [NOME DA PEÇA EM MAIÚSCULAS], nos termos que seguem:
```

**Formatação**:
- Nome do assistido: **negrito**
- Nome da peça: **negrito**
- Restante do texto: sem negrito
- Nunca usar: "Lei Complementar nº 80/1994", "LC Estadual nº 26/2006", "por intermédio da DEFENSORIA PÚBLICA"
- Sempre usar: "representado pela Defensoria Pública do Estado da Bahia, com fundamento no art. 134 da Constituição da República, por meio do defensor público subscritor"

### Fecho e Data
- "Nesses termos, pede deferimento." — parágrafo normal com recuo
- "Camaçari – BA, [DATA]." — **justificado com recuo** (NÃO centralizado), mesmo espaçamento do corpo

### Assinatura
- Centralizado, negrito
- Linha 1: "Rodrigo Rocha Meire"
- Linha 2: "Defensor Público"
- Espaçamento simples (line_spacing_rule = 1), sem espaço extra

### Cabeçalho (Header)
- Logo DPE-BA centralizada, dimensões: `width=Inches(1.777), height=Inches(1.101)`
- Usar a imagem `assets/dpe_logo.png` como base
- **Aplicar opacidade de 60%** diretamente na imagem via Python (blend com branco) — NÃO usar alphaModFix no XML, pois muitos visualizadores ignoram
- A imagem deve ser salva como RGB (não RGBA)

### Rodapé (Footer)
- Borda superior: linha simples, 4pt, preta
- Centralizado, Arial Narrow 8pt
- Espaçamento simples (line: 240)
- Linha 1: "Defensoria Pública do Estado da Bahia"
- Linha 2: "7ª Regional da DPE – Camaçari – Bahia."

### Linhas em Branco
- Usar parágrafos vazios reais (editáveis no Word) ao invés de space_before/after fixos
- Isso permite que o usuário ajuste manualmente ao editar a peça

## Como Gerar o Documento

Usar **python-docx** (Python), NÃO a biblioteca npm docx (JavaScript). O python-docx gera headers que renderizam corretamente em todos os visualizadores.

Instalar: `pip install python-docx --break-system-packages`

O script base completo está em `scripts/gerar_docx.py`. Leia-o para entender a estrutura e adapte conforme o tipo de peça.

### Pré-processamento da Logo

A opacidade da logo deve ser aplicada diretamente nos pixels da imagem antes de inserir no docx:

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


### Nulidade ≠ Ilegalidade da Prova — distinção obrigatória

São categorias distintas com consequências distintas:

- **Nulidade processual** (arts. 563 e ss. CPP): vício de ato processual (citação, intimação, sentença) → ato deve ser declarado nulo → fenômeno intraprocessual
- **Ilegalidade da prova** (art. 157 CPP + art. 5º, LVI, CF): prova obtida em violação a norma constitucional ou legal → inadmissível, não pode ser valorada → fenômeno extraprocessual

O STJ adotou o termo **"invalidade"** + **"impossibilidade de valoração"** (HC 598.886/SC) — não nulidade.

✅ Usar: "A Defesa suscita a ilegalidade da [prova] e sua inadmissibilidade probatória, com impossibilidade de valoração para qualquer fim decisório (arts. [norma violada] e 157 do CPP)"
❌ Nunca: "A Defesa requer a declaração de nulidade da [prova]"

**Casos frequentes:**
- Reconhecimento sem art. 226 CPP → ilegalidade + inadmissibilidade (não nulidade)
- Busca pessoal sem fundada suspeita (art. 244 CPP) → prova ilegal
- Violação de domicílio (art. 5º, XI, CF) → prova ilícita
- Interceptação sem autorização judicial → prova ilícita

### Reconhecimento irregular — ataca o PROCEDIMENTO, não "a identificação de [nome]"

O art. 226 CPP é o **parâmetro mínimo legal** para reconhecimento com confiabilidade epistêmica. Seus requisitos existem para mitigar o **viés de confirmação**: fenômeno cognitivo pelo qual a mente, diante de opção única ou sugerida, tende a confirmar o apresentado, ainda que a memória seja fragmentada ou contaminada.

**Descumprimento → contaminação → higidez inviabilizada → inadmissibilidade (art. 157 CPP)**

✅ Sujeito correto: "A Defesa suscita a ilegalidade do **procedimento** adotado para fins de identificação, e a consequente inadmissibilidade probatória do elemento identificatório assim produzido."
❌ Nunca: "A Defesa suscita a ilegalidade da identificação de [NOME]" — o sujeito é o procedimento, não a pessoa

### Paragrafação funcional — cada parágrafo, uma unidade de raciocínio

Evitar megaparágrafos. A regra não é de tamanho, mas de coerência temática: cada parágrafo deve abrir e fechar uma unidade de raciocínio, tema ou abordagem. Quando o texto muda de eixo, abrir novo parágrafo — mesmo que a mudança seja sutil.

**O leitor deve conseguir identificar, ao começar um novo parágrafo, que se inicia um novo tema, raciocínio ou abordagem.**

Cortes naturais mais frequentes em peças jurídicas:
- **Conceitual** (o que é o instituto / por que existe) → **Jurisprudencial** (o que os tribunais fixaram)
- **Normativo** (o que a lei exige) → **Factual** (o que ocorreu no caso concreto)
- **Descritivo** (o que aconteceu) → **Analítico** (o que isso significa juridicamente)
- **Tese** → **Fundamentos** → **Pedido**

Megaparágrafos são admissíveis apenas quando os raciocínios são verdadeiramente inseparáveis e a divisão prejudicaria a coesão do argumento.


## Tipos de Peças

Consulte `references/tipos_de_pecas.md` para estrutura detalhada e prompts pré-definidos para cada tipo de peça processual.

## Importante

- Sempre usar **python-docx** (não a biblioteca npm)
- A data deve ser gerada automaticamente com a data atual em português
- Nome do arquivo: `[Tipo da Peça] - [Nome do Assistido].docx`
- Salvar na pasta do caso do usuário


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
