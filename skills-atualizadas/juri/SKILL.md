---
name: juri
description: "Gerador de peças jurídicas e análise estratégica para o TRIBUNAL DO JÚRI da Defensoria Pública do Estado da Bahia (DPE-BA), 7ª Regional – Camaçari. Use esta skill SEMPRE que o usuário mencionar: 'júri', 'tribunal do júri', 'plenário', 'jurados', 'sustentação oral', 'quesitos', 'pronúncia', 'impronúncia', 'desclassificação', 'homicídio qualificado', 'dossiê estratégico júri', 'slides do júri', 'preparação de júri', 'apelação pós-júri', 'alegações finais do júri', 'diligências 422 CPP', ou qualquer tópico relacionado ao julgamento perante jurados. Inclui geração de peças processuais (.docx) e relatórios de análise estratégica (markdown ou .docx), ambos com formatação institucional DPE-BA."
---

# Peças Processuais e Análise Estratégica — Tribunal do Júri (DPE-BA, 7ª Regional – Camaçari)

Esta skill gera documentos para a atribuição de **Tribunal do Júri** (judicium), incluindo peças processuais em .docx com padrão institucional e relatórios analíticos detalhados. Cada tipo de peça e análise possui um prompt especializado na pasta `references/`.

## Fluxo de Trabalho

1. **Identificar o tipo de demanda** — Veja as tabelas abaixo e pergunte ao usuário se não ficou claro
2. **Carregar o prompt específico** — Leia o arquivo correspondente em `references/`
3. **Coletar informações do caso** — Peça dados do assistido, número dos autos, versão dos fatos, documentação disponível
4. **Gerar a minuta** — Siga o prompt carregado para compor o conteúdo jurídico
5. **Formatar conforme o tipo** — Peças processuais em .docx (python-docx), análises em markdown ou .docx
6. **Salvar na pasta do usuário**

---

## SEÇÃO 1: Peças Processuais do Júri

Documentos formais que tramitam no processo perante o tribunal.

| Tipo de Peça | Arquivo de Referência | Quando Usar |
|---|---|---|
| Apelação Pós-Júri | `references/apelacao_pos_juri.md` | Recurso contra sentença condenatória do plenário |
| Alegações Finais do Júri | `references/alegacoes_finais_juri.md` | Memoriais orais/escritos antes do julgamento popular |
| Diligências 422 CPP | `references/diligencias_422_cpp.md` | Requisição de investigação complementar em fase de pronúncia/impronúncia |
| Absolvição Sumária / Alibe | `references/absolvicao_sumaria_alibe.md` | Pedido de rejeição da denúncia por prova manifesta de inocência |

> **Nota**: Peças de criminal comum (HC, apelação condenatória geral, resposta à acusação) estão na skill **criminal-comum**. Análises do júri (estratégia, preparação, dossiê) estão abaixo.

---

## SEÇÃO 2: Análise e Preparação do Júri

Relatórios estratégicos, análises técnicas e documentos de preparação para o plenário. Estes podem ser gerados em **markdown (por padrão)** ou em **.docx** caso o usuário solicite formatação formal.

| Tipo de Análise | Arquivo de Referência | Quando Usar |
|---|---|---|
| Análise Estratégica (Modelo Avançado) | `references/analise_estrategica_juri.md` | Inteligência defensiva abrangente: prova, estratégia, teatro do júri, gestão de atores |
| Análise Estruturada Completa | `references/analise_juri_estruturada.md` | Análise profunda: cabeçalho, envolvidos, provas técnicas, testemunhais, estratégia, plenário |
| Análise Estruturada Alternativa | `references/analise_juri_estruturada_2.md` | Versão alternativa com foco em relatório executivo, lacunas probatórias e teses defensivas |
| Análise para Preparação de Júri (422 CPP) | `references/analise_preparar_juri_422.md` | Análise direcionada à fase de pronúncia/impronúncia (art. 422 CPP) |
| Análise Rápida para Júri | `references/analise_para_juri.md` | Versão simplificada/executiva para consultas rápidas |
| Análise dos Jurados | `references/analise_dos_jurados.md` | Perfil e mapeamento estratégico dos jurados sorteados |
| Slides do Júri | `references/slides_do_juri.md` | Geração de conteúdo para apresentação visual em plenário (estrutura e tópicos) |
| Fábrica de Ideias Defensivas | `references/fabrica_ideias_defensivas.md` | Brainstorming de teses, contra-argumentos e linhas defensivas criativas |

---

## Como Usar os Prompts de Referência

Cada arquivo em `references/` contém o prompt completo extraído do Gemini Gem correspondente. Ao gerar uma peça ou análise:

1. **Leia o arquivo de referência** correspondente ao tipo solicitado
2. **Siga as instruções do prompt** como se fossem suas instruções de trabalho
3. **Adapte com os dados reais** fornecidos pelo usuário
4. **Aplique a formatação** descrita abaixo:
   - **Peças processuais**: SEMPRE em .docx com formatação DPE-BA
   - **Relatórios analíticos**: Por padrão em markdown; em .docx apenas se o usuário pedir

---

## Formatação Institucional Obrigatória para Peças Processuais (PADRÃO DPE-BA)

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
- Data: justificado com recuo (NÃO centralizado), formato "DD de mês de YYYY" (ex: "10 de março de 2026")
- Assinatura: centralizado, negrito, "Rodrigo Rocha Meire" / "Defensor Público"

> ⚠️ **Relatórios analíticos (dossiês, análises estratégicas, preparação de júri) NÃO levam assinatura.** São documentos internos de trabalho. Encerram com **Rodapé do Relatório** — ver seção abaixo.

### Cabeçalho e Rodapé
- Header: logo `assets/dpe_logo.png` centralizada, 1.777 x 1.101 inches, opacidade 60%
- Footer: borda superior 4pt, centralizado, Arial Narrow 8pt, "Defensoria Pública do Estado da Bahia" / "7ª Regional da DPE – Camaçari – Bahia."

---

## Como Gerar o Documento

### Para Peças Processuais (.docx)

Usar **python-docx** (Python). O script base está em `scripts/gerar_docx.py` — leia-o para a estrutura completa de formatação e helpers. Adapte o conteúdo conforme o tipo de peça.

Instalar: `pip install python-docx Pillow numpy --break-system-packages`

#### Pré-processamento da Logo (opacidade 60%)

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

### Para Relatórios Analíticos (.docx) — PADRÃO TIPOLÓGICO DE RELATÓRIO

Quando o usuário pedir um relatório/análise/dossiê em .docx, usar o **padrão tipológico de relatório** (NÃO o padrão de peça processual):

#### Estrutura visual obrigatória

**1. Banner principal** — Tabela 1 coluna, fundo `1A5C36` (verde Júri)
- Linha 1: Verdana 13pt, bold, branco, centralizado — `⚖  DOSSIÊ ESTRATÉGICO DE DEFESA`
- Linha 2 (mesma célula): Verdana 9pt, cor clara `A8D5B5`, centralizado — fase · atribuição · DPE-BA

**2. Tabela de identificação (4 colunas)**: PROCESSO | AUDIÊNCIA/FASE | VARA / JUÍZO | GERADO EM
- Fundo suave `EAF5EE`; rótulos 7pt cinza; valores bold 8.5pt verde

**3. Barra de progresso processual** (quando aplicável) — fase atual destacada em `1A5C36`

**4. Headings de seção** — Tabela 1 coluna, fundo `EAF5EE`, borda esquerda 32pt `1A5C36`, Verdana 10pt bold verde

**5. Subheadings** — Verdana 9.5pt bold verde + borda top suave `BBF7D0` via XML pBdr, space_before 12pt

**6. Corpo de texto**
- `add_para`: Verdana 9pt, cor `#2D3748`, alinhado à esquerda
- `add_bullet`: marcador `·  `, indent 320 twips, Verdana 9pt
- `add_mixed`: mistura bold/regular no mesmo parágrafo
- `add_quote`: 8.5pt itálico, indentado, cor `#4A5C6A`

**7. Separadores** — Via XML `pBdr/bottom` (cor D1D5DB, sz 4, single) — NÃO usar traços de texto

**8. Rodapé do Relatório** (encerra o documento — substitui assinatura)
- Tabela 1 coluna, fundo `EAF5EE`, borda superior `1A5C36`
- Linha 1 (bold 7.5pt verde): `[TIPO DO DOSSIÊ]  ·  [NÚMERO DO PROCESSO]  ·  [Nome do Assistido]`
- Linha 2 (itálico 7pt verde suave): `Elaborado em [DATA]  ·  Documento de uso exclusivo interno  ·  Defensoria Pública do Estado da Bahia  ·  Não constitui peça processual`

Exemplo de estrutura markdown para análises:

```markdown
# Análise Estratégica para Júri
## Cabeçalho de Identificação
**Réu**: João da Silva (Preso na Penitenciária de Feira de Santana)
**Ação Penal nº**: 0000123-45.2025.0000.0000
**Inquérito Policial nº**: 2024.0000.1234

## Sumário Executivo
[Conteúdo...]

## Análise da Prova
[Conteúdo...]
```

---

## Importante

- Sempre usar **python-docx** (não a biblioteca npm) para documentos .docx
- Data gerada automaticamente em português (ex: "10 de março de 2026")
- **Nome do arquivo para peças processuais**: `[Tipo da Peça] - [Nome do Assistido].docx`
- **Nome do arquivo para análises**: `[Tipo de Análise] - [Nome do Assistido] - [Data].md` (ou .docx se solicitado)
- Salvar na pasta do usuário
- Análises podem ter saída em markdown (não obrigatoriamente .docx)

---

## Contexto Institucional

A Defensoria Pública do Estado da Bahia (DPE-BA) é instituição essencial para a justiça, fornecendo orientação jurídica integral e defesa dos direitos humanos dos necessitados. A 7ª Regional com sede em Camaçari atende o litoral do Recôncavo Baiano. Os documentos produzidos por esta skill seguem rigorosamente os padrões institucionais e éticos da corporação, garantindo qualidade técnica e representação adequada perante órgãos judiciais.

---

## Fluxo de Consulta Rápida

**Usuário diz**: "Preciso de uma análise estratégica para júri"

1. Carregue `references/analise_estrategica_juri.md`
2. Peça: número do processo, nomes dos réus, resumo dos fatos, provas disponíveis
3. Siga o prompt de análise estratégica (Relatório Analítico de Combate, Diretrizes, Inteligência, Teatro do Júri)
4. Forneça em markdown por padrão

**Usuário diz**: "Preciso de alegações finais do júri em .docx"

1. Carregue `references/alegacoes_finais_juri.md`
2. Peça: dados dos autos, tese principal, qualificadoras imputadas, provas em instrução
3. Siga o prompt (síntese, materialidade, autoria, desclassificação, qualificadoras)
4. Gere em .docx com formatação DPE-BA usando python-docx
5. Salve como: `Alegações Finais do Júri - [Nome Assistido].docx`

---

## Integração OMBUDS — Geração Automática de `_analise_ia.json`

> **OBRIGATÓRIO**: Ao final de TODA peça ou análise gerada por esta skill, ALÉM do documento principal (.docx ou .md), salve também um arquivo `_analise_ia.json` na **pasta raiz do assistido no Google Drive**.

### Localização do arquivo

O JSON deve ser salvo na pasta do assistido — a mesma pasta onde o documento principal é salvo. Se já existir um `_analise_ia.json` anterior, **substitua-o** (sobrescreva).

### Schema do JSON

```json
{
  "schema_version": "1.0",
  "tipo": "<juri_apelacao|juri_alegacoes_finais|juri_diligencias_422|juri_absolvicao_sumaria|juri_analise_estrategica|juri_analise_estruturada|juri_preparacao_422|juri_analise_rapida|juri_analise_jurados|juri_slides|juri_fabrica_ideias>",
  "gerado_em": "<ISO 8601 — ex: 2026-03-22T14:30:00-03:00>",
  "assistido": "<nome completo do assistido>",
  "processo": "<número do processo no formato CNJ>",
  "resumo_fato": "<2-3 frases resumindo o fato apurado>",
  "tese_defesa": "<tese principal de defesa — ex: legítima defesa, desclassificação>",
  "estrategia_atual": "<estratégia adotada ou recomendada para o plenário>",
  "crime_principal": "<tipo penal — ex: homicídio qualificado art. 121 §2º CP>",
  "pontos_criticos": ["<ponto crítico 1>", "<ponto crítico 2>"],
  "payload": {
    "tipo_peca": "<nome da peça/análise gerada>",
    "fase_processual": "<sumario_culpa|pronuncia|preparacao_plenario|plenario|pos_juri>",
    "qualificadoras_imputadas": ["<qualificadora 1>", "<qualificadora 2>"],
    "teses_subsidiarias": ["<tese 1>", "<tese 2>"],
    "tese_plenario": "<tese principal para sustentação oral>",
    "pedidos": ["<pedido 1>", "<pedido 2>"],
    "perguntas_por_testemunha": [
      {
        "nome": "<nome da testemunha>",
        "tipo": "ACUSACAO|DEFESA|INFORMANTE",
        "perguntas": ["<pergunta 1>", "<pergunta 2>"]
      }
    ],
    "contradicoes": [
      {
        "testemunha": "<nome>",
        "delegacia": "<versão na delegacia>",
        "juizo": "<versão em juízo>",
        "contradicao": "<descrição da contradição>"
      }
    ],
    "orientacao_ao_assistido": "<orientação de postura para plenário>",
    "perfil_jurados": "<observações sobre jurados sorteados, se disponível>"
  }
}
```

### Regras de preenchimento

- `tipo`: usar o valor que melhor corresponde à peça/análise gerada
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
