---
name: analise-audiencias
description: "Gerador de análises processuais estratégicas e documentos para a Defensoria Pública do Estado da Bahia (DPE-BA), 7ª Regional – Camaçari. Use esta skill SEMPRE que o usuário pedir análises de audiências criminais, análises estratégicas de casos, análise de autos de prisão em flagrante, análise para Resposta à Acusação (RA), dossiês estratégicos de defesa, relatórios de audiência, ou qualquer análise processual. Também acione quando o usuário mencionar: 'análise de audiência', 'preparação de audiência', 'análise para RA', 'audiência de tráfico', 'audiência sumariante', 'audiência criminal', 'auto de prisão em flagrante', 'APF', 'relatório de audiência', 'dossiê estratégico', ou qualquer análise processual. Gera documentos estruturados em Google Docs ou .docx com formatação institucional da DPE-BA."
---

# Análises Processuais Estratégicas (DPE-BA, 7ª Regional – Camaçari)

Esta skill gera análises processuais estruturadas e documentos estratégicos para preparação de defesa criminal. Cada tipo de análise possui um prompt especializado na pasta `references/`, com templates de estruturação visual e tático-estratégica.

## Fluxo de Trabalho

1. **Identificar o tipo de análise** — Veja a tabela abaixo e pergunte ao usuário se não ficou claro
2. **Carregar o prompt específico** — Leia o arquivo correspondente em `references/`
3. **Coletar autos e documentação** — Peça que o usuário forneça autos, depoimentos, laudos
4. **Executar a análise** — Siga o prompt carregado para compor a análise estratégica
5. **Estruturar o documento** — Use a formatação institucional e visual descrita abaixo
6. **Salvar na pasta do usuário** (Google Docs ou .docx conforme apropriado)

## Tipos de Análise Disponíveis

| Tipo de Análise | Arquivo de Referência | Quando Usar |
|---|---|---|
| Análise para Resposta à Acusação (RA) | `references/analise_para_ra.md` | Preparação estratégica de RA com análise de nulidades, investigação defensiva, matriz de guerra fato vs versão |
| Análise para Audiência Criminal (Geral) | `references/analise_audiencia_criminal.md` | Análise processual completa de ação penal comum, exame de depoimentos, inconsistências, estratégia de inquirição |
| Análise para Audiência Sumariante | `references/analise_audiencia_sumariante.md` | Análise de processo sumariante com foco em nulidades, contradições, perfil de jurados e estratégia em plenário |
| Análise para Audiência de Tráfico | `references/analise_audiencia_trafico.md` | Dossiê estratégico de defesa especializado em crimes de tráfico, fragilidades técnicas da acusação, desclassificação para uso |
| Análise de Auto de Prisão em Flagrante | `references/analise_auto_prisao_flagrante.md` | Análise do APF para identificar ilegalidades, contradições, fundamento de relaxamento ou liberdade provisória |
| Relatório para Audiência de Justificação | `references/relatorio_audiencia_justificacao.md` | Parecer estratégico para audiência de justificação em Medida Protetiva de Urgência (Lei Maria da Penha) |

## Como Usar os Prompts de Referência

Cada arquivo em `references/` contém o prompt completo extraído do Gemini Gem correspondente. Ao gerar uma análise:

1. **Leia o arquivo de referência** correspondente ao tipo de análise solicitado
2. **Siga as instruções do prompt** como se fossem suas instruções de trabalho
3. **Incorpore os autos/documentação** fornecidos pelo usuário
4. **Estruture o documento** conforme templates de formatação descrito abaixo
5. **Revise para clareza, coerência e estratégia defensiva**

## Formatação Institucional para Análises

### Para Google Docs

- **Título**: Fonte Verdana, 14pt, negrito, centralizado
- **Subtítulos**: Verdana, 12pt, negrito, espaçamento 1.5
- **Corpo**: Verdana, 11pt, justificado, espaçamento 1.5
- **Listas**: Marcadores claros, indentação visual
- **Tabelas**: Bordas simples, cabeçalho em negrito
- **Divisões**: Use divisores (bookmarks/headings do Google Docs) para facilitar navegação
- **Ícones**: Discretos e profissionais no início de títulos principais (quando apropriado)
- **Hierarquia visual**: Estruture com títulos, subtítulos, negrito para termos-chave

### Para Documentos .docx — PADRÃO TIPOLÓGICO DE RELATÓRIO

> ⚠️ **Regra fundamental**: Análises e dossiês são documentos **internos de trabalho**. **NÃO levam assinatura de Defensor.** A assinatura formal é exclusiva de peças processuais (RA, apelação, HC, alegações finais) que tramitam nos autos. Relatórios encerram com **Rodapé do Relatório**.

#### 1. Página e cabeçalho DPE-BA
- A4 (11906 × 16838 twips) · margem superior 2552 · inferior 1134 · esquerda 1418 · direita 1134
- Header: logo `assets/dpe_logo.png` centralizada, 1.777 × 1.101 inches, opacidade 55%
- Footer: borda superior 4pt, centralizado, Arial Narrow 8pt — "Defensoria Pública do Estado da Bahia" / "7ª Regional da DPE – Camaçari – Bahia."

#### 2. Banner principal do documento
- Tabela 1 coluna, fundo na **cor-tema da atribuição** (ver paleta abaixo)
- **Linha 1**: Verdana 13pt, bold, branco, centralizado — ex: `⚖  DOSSIÊ ESTRATÉGICO DE DEFESA`
- **Linha 2** (mesma célula): Verdana 9pt, cor clara, centralizado — fase processual · atribuição · DPE-BA

#### 3. Tabela de identificação (4 colunas)
- Colunas: PROCESSO | [FASE/AUDIÊNCIA] | VARA / JUÍZO | GERADO EM
- Fundo suave da cor-tema; rótulos em 7pt cinza; valores em bold 8.5pt na cor-tema

#### 4. Barra de progresso processual (quando aplicável)
- Fases sequenciais do processo com a fase atual destacada na cor-tema

#### 5. Headings de seção
- Tabela 1 coluna, fundo suave da cor-tema, borda esquerda 32pt na cor-tema
- Verdana 10pt, bold, cor-tema, indent 240 twips, space_before/after 7pt

#### 6. Subheadings
- Verdana 9.5pt, bold, cor-tema · borda top suave (cor-tema clara) via XML pBdr · space_before 12pt

#### 7. Corpo de texto
- `add_para`: Verdana 9pt, cor #2D3748, alinhado à esquerda, space_after 5pt
- `add_bullet`: marcador `·  `, indent 320 twips / first-line -160 twips, Verdana 9pt
- `add_mixed`: mistura bold/regular no mesmo parágrafo (bold em cor-tema)
- `add_quote`: 8.5pt itálico, indentado, cor #4A5C6A

#### 8. Separadores entre subseções
- Via borda inferior do parágrafo (XML `pBdr/bottom`) — **NÃO usar traços de texto**
- Cor: D1D5DB · sz: 4 · single

#### 9. Rodapé do Relatório (obrigatório no final — substitui assinatura)
- Tabela 1 coluna, fundo suave da cor-tema, borda superior na cor-tema
- **Linha 1** (bold, 7.5pt, cor-tema): `[TIPO DO DOSSIÊ]  ·  [NÚMERO DO PROCESSO]  ·  [Nome do Assistido]`
- **Linha 2** (itálico, 7pt, cor suave): `Elaborado em [DATA]  ·  Documento de uso exclusivo interno  ·  Defensoria Pública do Estado da Bahia  ·  Não constitui peça processual`

#### Paleta de cores por atribuição

| Atribuição | Cor-tema (hex) | Fundo suave | Cor clara (sutil) |
|---|---|---|---|
| Tribunal do Júri | `1A5C36` | `EAF5EE` | `A8D5B5` |
| VVD / Maria da Penha | `92400E` | `FFFBEB` | `FCD34D` |
| Execução Penal | `1E3A8A` | `EEF4FF` | `93C5FD` |
| Criminal Comum | `991B1B` | `FFF0F0` | `FCA5A5` |
| APF / Plantão | `374151` | `F1F5F9` | `94A3B8` |

#### Hierarquia tipológica resumida
```
BANNER (cor-tema escura)
  → TABELA 4 COLUNAS (fundo suave)
    → BARRA DE PROGRESSO (fase atual em cor-tema)
      → HEADING (fundo suave + borda esquerda cor-tema)
        → subheading (bold 9.5pt cor-tema + borda top suave)
          → add_para · add_bullet · add_mixed · add_quote
          → build_alert_box (borda esquerda contextual)
      → SEPARADOR (borda inferior D1D5DB via pBdr)
RODAPÉ DO RELATÓRIO (fundo suave + borda top — SEM assinatura)
```

## Como Gerar o Documento

### Para Análises em Google Docs
- Estruture em Google Docs com headings/bookmarks para navegação
- Use negrito e formatação visual para destacar elementos estratégicos
- Inclua tabelas comparativas quando necessário (depoimentos, contradições, cronologia)
- Garanta que ao copiar/colar a formatação seja preservada

### Para Documentos .docx
Usar **python-docx** (Python). O script base está em `scripts/gerar_docx.py` — leia-o para a estrutura completa de formatação.

Instalar: `pip install python-docx Pillow numpy --break-system-packages`

### Pré-processamento da Logo (opacidade 60%)

```python
from PIL import Image
import numpy as np
img = Image.open("assets/dpe_logo.png").convert("RGBA")
arr = np.array(img, dtype=np.float64)
opacity = 0.60
# Misturar com branco na proporção da opacidade
white = np.full_like(arr[:,:,:3], 255.0)
arr[:,:,:3] = arr[:,:,:3] * opacity + white * (1 - opacity)
arr[:,:,3] = 255  # totalmente opaco após blend
result = Image.fromarray(arr.astype(np.uint8)).convert("RGB")
result.save("dpe_logo_faded.png")
```

## Estruturas Tipicamente Incluídas em Análises

### Análise Criminal Completa
1. **Painel de Controle**: Nomes, processos, IP, policiais, pessoas arroladas
2. **Resumo Executivo**: Síntese estratégica em 3 parágrafos
3. 🎯 **Painel de Depoentes**: Tabela de status de todos os depoentes para a próxima audiência — quem já foi ouvido, quem falta, status de intimação (✅ intimado / ⚠️ diligência em curso / ❌ frustrada / 🔴 não localizado / ➖ dispensado) + situação específica do réu + alerta operacional
4. **Cronologia Processual**: Data de cada ato relevante (denúncia, recebimento, RA, audiências, citação, nomeação DPE etc.)
5. **Perfil dos Envolvidos**: Réu(s), vítima(s), policiais, testemunhas
5. **Radiografia da Acusação**: Tese, testemunhas, provas materiais
6. **Análise Crítica de Depoimentos**: Mapeamento, contradições, credibilidade
7. **Tabela Comparativa**: Depoimentos delegacia vs juízo
8. **Inconsistências da Acusação**: Vulnerabilidades, nulidades, insuficiência probatória
9. **Estratégia Defensiva**: Teses viáveis, construção narrativa, plano de ação
10. **Perguntas Estratégicas**: Para inquirição de policiais, vítima, testemunhas
11. **Orientação ao Assistido**: Postura, riscos, ênfases em interrogatório
12. **Perspectiva Plenária** (se sumariante): Preparação para júri
13. **Reprodução Integral dos Depoimentos**: Todos os depoentes em cada fase (delegacia / juízo / plenário)

### Análise para RA
1. **Módulo 0**: Radar de Liberdade (status prisional)
2. **Módulo 1**: Saneamento e acesso à informação
3. **Módulo 2**: Autópsia do inquérito (nulidades, cadeia de custódia)
4. **Módulo 3**: Engenharia forense (provas técnicas, quesitos)
5. **Módulo 4**: OSINT e investigação defensiva
6. **Módulo 5**: Matriz de guerra (fato vs versão)
7. **Módulo 6**: A peça (estratégia da RA)
8. **Checklist Tático**: Plano de ação 48h

## Importante

- Data gerada automaticamente em português (ex: "10 de março de 2026")
- Nome do arquivo: `[Tipo da Análise] - [Nome do Assistido].docx` ou `.pdf`
- Salvar na pasta do usuário
- Garantir que análises sejam compreensíveis em leitura rápida (clareza visual)
- Sempre marcar vulnerabilidades, contradições e teses potenciais em negrito ou destaque
- Indicar referências aos trechos/linhas específicas dos autos quando citar

## Integração OMBUDS — Geração Automática de `_analise_ia.json`

> **OBRIGATÓRIO**: Ao final de TODA análise gerada por esta skill, ALÉM do documento principal (.docx ou .md), salve também um arquivo `_analise_ia.json` na **pasta raiz do assistido no Google Drive**.

### Localização do arquivo

O JSON deve ser salvo na pasta do assistido — a mesma pasta onde o documento principal é salvo. Se a pasta for, por exemplo, `/Meu Drive/1 - Defensoria 9ª DP/Assistidos/João da Silva/`, o JSON ficará em:

`/Meu Drive/1 - Defensoria 9ª DP/Assistidos/João da Silva/_analise_ia.json`

Se já existir um `_analise_ia.json` anterior, **substitua-o** (sobrescreva).

### Schema do JSON

```json
{
  "schema_version": "1.0",
  "tipo": "<audiencia_criminal|audiencia_sumariante|audiencia_trafico|apf|audiencia_justificacao|analise_ra>",
  "gerado_em": "<ISO 8601 — ex: 2026-03-22T14:30:00-03:00>",
  "assistido": "<nome completo do assistido>",
  "processo": "<número do processo no formato CNJ>",
  "resumo_fato": "<2-3 frases resumindo o fato apurado>",
  "tese_defesa": "<tese principal de defesa identificada>",
  "estrategia_atual": "<estratégia recomendada para a próxima fase>",
  "crime_principal": "<tipo penal imputado>",
  "pontos_criticos": ["<ponto crítico 1>", "<ponto crítico 2>"],
  "payload": {
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
    "orientacao_ao_assistido": "<orientação de postura e pontos a enfatizar no interrogatório>",
    "nulidades_identificadas": ["<nulidade 1>", "<nulidade 2>"],
    "provas_a_requerer": ["<prova 1>", "<prova 2>"]
  }
}
```

### Regras de preenchimento

- `tipo`: usar o valor que melhor corresponde à análise gerada (audiencia_criminal, audiencia_sumariante, audiencia_trafico, apf, audiencia_justificacao, analise_ra)
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
