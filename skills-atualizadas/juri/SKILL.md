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

## Formatação Institucional e Geração .docx

> Padrões de página, margens, fontes, cabeçalho/rodapé e instruções python-docx: [`_shared/formatacao-dpe-ba.md`](../_shared/formatacao-dpe-ba.md).

## Relatórios Analíticos (.docx)

> Padrão tipológico completo (banner, headings, corpo, rodapé): [`_shared/padrao-relatorio.md`](../_shared/padrao-relatorio.md).

**Cor-tema do Júri**: `1A5C36` (verde) · Fundo: `EAF5EE` · Clara: `A8D5B5`

---

## Importante

> Regras gerais de nomenclatura e salvamento: [`_shared/formatacao-dpe-ba.md`](../_shared/formatacao-dpe-ba.md).
> Análises podem ter saída em markdown (não obrigatoriamente .docx).

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

## Integração OMBUDS — `_analise_ia.json`

> Campos comuns, regras de preenchimento e localização: [`_shared/schema-base.md`](../_shared/schema-base.md).

### Payload específico do Júri

```json
{
  "payload": {
    "tipo_peca": "<nome da peça/análise gerada>",
    "fase_processual": "<sumario_culpa|pronuncia|preparacao_plenario|plenario|pos_juri>",
    "qualificadoras_imputadas": [],
    "teses_subsidiarias": [],
    "tese_plenario": "<tese principal para sustentação oral>",
    "pedidos": [],
    "perguntas_por_testemunha": [
      { "nome": "<nome>", "tipo": "ACUSACAO|DEFESA|INFORMANTE", "perguntas": [] }
    ],
    "contradicoes": [
      { "testemunha": "<nome>", "delegacia": "<versão>", "juizo": "<versão>", "contradicao": "<descrição>" }
    ],
    "orientacao_ao_assistido": "<orientação de postura para plenário>",
    "perfil_jurados": "<observações sobre jurados sorteados>"
  }
}
```

### Valores de `tipo`
`juri_apelacao` · `juri_alegacoes_finais` · `juri_diligencias_422` · `juri_absolvicao_sumaria` · `juri_analise_estrategica` · `juri_analise_estruturada` · `juri_preparacao_422` · `juri_analise_rapida` · `juri_analise_jurados` · `juri_slides` · `juri_fabrica_ideias`

---

## Linguagem Estratégica da Defesa

> Diretrizes completas: [`_shared/linguagem-estrategica.md`](../_shared/linguagem-estrategica.md).
