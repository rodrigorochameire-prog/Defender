---
name: execucao-penal
description: "Gerador de peças jurídicas e análises estratégicas — EXECUÇÃO PENAL (DPE-BA, 7ª Regional – Camaçari). Use SEMPRE que o usuário pedir: autorização para trabalho em comarca diversa, análise de prescrição executória, falta de intimação, varredura de conformidade da execução, risco de reconversão de pena, reeducando não localizado, endereço desatualizado, intimação por edital, progressão de regime, livramento condicional, saída temporária, ou qualquer matéria da LEP. Acione ao ouvir: 'execução penal', 'LEP', 'pena', 'regime', 'progressão', 'falta de intimação', 'prescrição executória', 'livramento condicional', 'reconversão', 'reeducando', 'varredura da execução', 'análise do processo de execução', 'endereço nos autos', 'intimação inválida'. Gera .docx institucional DPE-BA."
---

# Peças Jurídicas — Execução Penal (DPE-BA, 7ª Regional – Camaçari)

Esta skill gera documentos .docx formatados com o padrão institucional da Defensoria Pública para a atribuição de **Execução Penal**. Cada tipo de peça possui um prompt especializado na pasta `references/`.

## Fluxo de Trabalho

1. **Identificar o tipo de peça** — Veja a tabela abaixo e pergunte ao usuário se não ficou claro
2. **Carregar o prompt específico** — Leia o arquivo correspondente em `references/`
3. **Coletar informações do caso** — Peça dados do assistido, número da execução, fatos relevantes
4. **Gerar a minuta** — Siga o prompt carregado para compor o conteúdo jurídico
5. **Gerar o .docx** — Use python-docx com a formatação institucional (veja seção abaixo)
6. **Salvar na pasta do usuário**

## Tipos de Peça e Análise Disponíveis

| Tipo | Arquivo de Referência | Quando Usar |
|---|---|---|
| Autorização para Trabalho em Comarca Diversa | `references/ep_requerimento_ausencia_comarca.md` | Assistido obtém emprego em outra cidade, precisa de autorização para residir/trabalhar fora da comarca |
| Análise Pontual de Prescrição / Falta de Intimação | `references/analisar_falta_intimacao_ep.md` | Verificação rápida de prescrição da pretensão executória, falta de intimação, atualização de endereço (prompt original extraído do Gemini Gem) |
| **Varredura Completa de Conformidade da Execução** | `references/analise_varredura_conformidade_ep.md` | **Quando houver risco de reconversão por não localização, intimação por edital questionável, endereço potencialmente desatualizado, ou sempre que o defensor quiser fazer uma varredura completa buscando qualquer brecha defensiva.** Analisa prescrição, rastreia endereços e telefones em toda a execução E no processo de conhecimento, verifica validade da intimação e do edital, faz compliance geral da guia, e produz relatório com recomendação de peça. |
| **Impugnação à Reconversão — Reeducando Não Localizado / Sem Admonitória** | `references/ep_impugnacao_reconversao_nao_localizado.md` | **Quando houver pedido de reconversão baseado em não localização do reeducando, ausência de audiência admonitória, endereço da guia desatualizado, ou edital sem data/condições expressas.** Contém a argumentação completa: dever ativo de busca do Estado (distinção com art. 367 CPP), fundamento ressocializador da LEP, procedimento bifásico correto (edital de admonitória com data → edital de justificativa → só então reconversão), diligências exigíveis (DETRAN, Receita Federal/CPF, INSS, TRE, telefone da guia), e alertas sobre o que **não** invocar (art. 50, V, LEP; revelia no processo de conhecimento). |
| **Extinção da Punibilidade — Prescrição da Pretensão Executória** | `references/ep_extincao_prescricao_executoria.md` | **Quando a análise indicar possível consumação do prazo prescricional executório — especialmente em execuções de PSC com reeducando não localizado, detração relevante que reduz a PPL remanescente a menos de 1 ano, e trânsito em julgado há mais de 3 anos sem interrupção.** Contém: regra crítica sobre PPL vs PSC, estrutura argumentativa completa (prescrição + imputação ao Estado + dever de esgotamento de sistemas), 4 precedentes verificados (TJ-SP, STJ×2, TJ-BA), tabela de dispositivos e checklist de verificação pré-peça. |

> **Nota**: Outras peças de execução penal (progressão de regime, saída temporária, livramento condicional) podem ser geradas seguindo o mesmo padrão, com prompts complementares a serem adicionados conforme necessidade.

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

> ⚠️ **Exceção — Análises e Varreduras**: A **Varredura Completa de Conformidade** e a **Análise de Prescrição/Falta de Intimação** são documentos **internos de trabalho** e **NÃO levam assinatura**. Encerram com Rodapé do Relatório (ver abaixo).

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

### Para Relatórios e Análises (.docx) — PADRÃO TIPOLÓGICO DE RELATÓRIO

**Cor-tema da Execução Penal: `1E3A8A` (azul profundo) · Fundo suave: `EEF4FF` · Cor clara: `93C5FD`**

Quando gerar a Varredura de Conformidade, Análise de Prescrição ou qualquer relatório interno, usar o padrão visual de relatório — NÃO o padrão de peça processual:

**1. Banner principal** — Tabela 1 coluna, fundo `1E3A8A`
- Linha 1: Verdana 13pt, bold, branco, centralizado — ex: `📋  VARREDURA DE CONFORMIDADE — EXECUÇÃO PENAL`
- Linha 2 (mesma célula): Verdana 9pt, cor `93C5FD`, centralizado — fase · LEP · DPE-BA

**2. Tabela de identificação (4 colunas)**: EXECUÇÃO | FASE/STATUS | VARA / JUÍZO | GERADO EM
- Fundo suave `EEF4FF`; rótulos 7pt cinza; valores bold 8.5pt azul

**3. Headings de seção** — Tabela 1 coluna, fundo `EEF4FF`, borda esquerda 32pt `1E3A8A`, Verdana 10pt bold azul

**4. Subheadings** — Verdana 9.5pt bold azul + borda top suave via XML pBdr, space_before 12pt

**5. Corpo de texto**
- `add_para`: Verdana 9pt, cor `#2D3748`, alinhado à esquerda
- `add_bullet`: marcador `·  `, indent 320 twips, Verdana 9pt
- Cards de alerta: borda esquerda contextual — vermelho `7F1D1D` para risco crítico, âmbar `92400E` para atenção, verde `1A5C36` para ok

**6. Separadores** — Via XML `pBdr/bottom` (cor D1D5DB, sz 4, single) — NÃO usar traços de texto

**7. Rodapé do Relatório** (encerra o documento — substitui assinatura)
- Tabela 1 coluna, fundo `EEF4FF`, borda superior `1E3A8A`
- Linha 1 (bold 7.5pt azul): `[TIPO DA ANÁLISE]  ·  [NÚMERO DA EXECUÇÃO]  ·  [Nome do Reeducando]`
- Linha 2 (itálico 7pt azul suave): `Elaborado em [DATA]  ·  Documento de uso exclusivo interno  ·  Defensoria Pública do Estado da Bahia  ·  Não constitui peça processual`

## Importante

- Sempre usar **python-docx** (não a biblioteca npm)
- Data gerada automaticamente em português (ex: "10 de março de 2026")
- **Peças processuais**: `[Tipo da Peça] - [Nome do Assistido].docx`
- **Relatórios/Análises**: `[Tipo de Análise] - [Nome do Reeducando] - [Data].docx`
- Salvar na pasta do usuário


## Integração OMBUDS — Geração Automática de `_analise_ia.json`

> **OBRIGATÓRIO**: Ao final de TODA peça ou análise gerada por esta skill, ALÉM do documento .docx principal, salve também um arquivo `_analise_ia.json` na **pasta raiz do assistido no Google Drive**.

### Localização do arquivo

O JSON deve ser salvo na pasta do assistido — a mesma pasta onde o documento principal é salvo. Se já existir um `_analise_ia.json` anterior, **substitua-o** (sobrescreva).

### Schema do JSON

```json
{
  "schema_version": "1.0",
  "tipo": "<ep_autorizacao_trabalho|ep_prescricao|ep_varredura_conformidade|ep_impugnacao_reconversao|ep_extincao_prescricao>",
  "gerado_em": "<ISO 8601 — ex: 2026-03-22T14:30:00-03:00>",
  "assistido": "<nome completo do assistido/reeducando>",
  "processo": "<número da execução no formato CNJ>",
  "resumo_fato": "<2-3 frases resumindo a situação da execução>",
  "tese_defesa": "<tese principal — ex: prescrição executória, nulidade da intimação>",
  "estrategia_atual": "<estratégia adotada ou recomendada>",
  "crime_principal": "<tipo penal da condenação originária>",
  "pontos_criticos": ["<ponto crítico 1>", "<ponto crítico 2>"],
  "payload": {
    "tipo_peca": "<nome da peça/análise gerada>",
    "regime_atual": "<aberto|semiaberto|fechado|psc|prd|livramento|null>",
    "pena_total": "<ex: 2 anos e 6 meses de reclusão>",
    "pena_restante": "<ex: 1 ano e 3 meses>",
    "data_transito": "<data do trânsito em julgado — ISO 8601 ou null>",
    "prescricao_executoria": {
      "prazo_aplicavel": "<ex: 3 anos (art. 109, VI, CP)>",
      "data_inicio": "<data de início da contagem>",
      "data_consumacao": "<data em que se consuma ou null>",
      "status": "<consumada|iminente|vigente|null>"
    },
    "intimacao": {
      "tipo": "<pessoal|edital|nao_realizada|null>",
      "valida": "<true|false|null>",
      "observacoes": "<detalhes sobre irregularidades>"
    },
    "endereco_atualizado": "<true|false|null>",
    "diligencias_esgotadas": "<true|false|null>",
    "pedidos": ["<pedido 1>", "<pedido 2>"],
    "urgencia": "<alta|media|baixa>"
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
