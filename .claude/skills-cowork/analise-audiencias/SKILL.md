---
name: analise-audiencias
description: "Gerador de análises processuais estratégicas e documentos para a Defensoria Pública do Estado da Bahia (DPE-BA), 7ª Regional – Camaçari. Use esta skill SEMPRE que o usuário pedir análises de audiências criminais, análises estratégicas de casos, análise de autos de prisão em flagrante, análise para Resposta à Acusação (RA), dossiês estratégicos de defesa, relatórios de audiência, ou qualquer análise processual. Também acione quando o usuário mencionar: 'análise de audiência', 'preparação de audiência', 'análise para RA', 'audiência de tráfico', 'audiência sumariante', 'audiência criminal', 'auto de prisão em flagrante', 'APF', 'relatório de audiência', 'dossiê estratégico', ou qualquer análise processual. Gera documentos estruturados em Google Docs ou .docx com formatação institucional da DPE-BA."
---

# Análises Processuais Estratégicas (DPE-BA, 7ª Regional – Camaçari)

Esta skill gera análises processuais estruturadas e documentos estratégicos para preparação de defesa criminal. Cada tipo de análise possui um prompt especializado na pasta `references/`, com templates de estruturação visual e tático-estratégica.

## Fluxo de Trabalho

1. **Identificar o tipo de análise** — Veja a tabela abaixo e pergunte ao usuário se não ficou claro
2. **Carregar o prompt específico** — Leia o arquivo correspondente em `references/`
3. **Localizar o processo do assistido** — Busque a pasta do assistido nos diretórios de processos (ver "Pastas de Processos") e leia PDFs dos autos, transcrições de depoimentos e documentos do caso
4. **Consultar peças anteriores similares** — Se relevante, busque peças do mesmo tipo em "Petições por assunto" (ver "Banco de Modelos") para entender como o Defensor estrutura sua argumentação e análise
5. **Coletar informações complementares** — Se os autos/documentos não forem suficientes, peça dados adicionais ao usuário
6. **Executar a análise** — Siga o prompt carregado, incorporando os dados extraídos do processo
7. **Gerar TRIPLA SAÍDA obrigatória** — Leia `references/tripla_saida.md` e siga as instruções. Toda análise DEVE produzir 3 arquivos:
   - **PDF** (ReportLab, paleta Navy/Steel v3) — use `scripts/gerar_pdf_v3_template.py` como base
   - **MD** (para exibição no Cowork)
   - **JSON** (`_analise_ia.json` para OMBUDS)
8. **Salvar na pasta do assistido** e apresentar links ao defensor

---

## Banco de Modelos Reais (Petições por Assunto)

Peças anteriores do Defensor servem como base de conhecimento para gerar análises mais precisas — o estilo argumentativo, as teses utilizadas e a estrutura das peças informam a análise estratégica.

**Caminho base**: `Meu Drive 2/1 - Defensoria 9ª DP/Petições por assunto (DOC)/`

| Subpasta | Utilidade para Análises |
|---|---|
| `1 Alegações Finais/` | Estrutura argumentativa e teses defensivas já utilizadas |
| `2 Apelação/` | Teses recursais e fundamentação |
| `3 Contrarrazões de Apelação/` | Contra-argumentos a teses do MP |
| `4 Contrarrazões de RESE/` | Defesa contra recursos do MP |
| `5 Diligências 422/` | Diligências complementares — base para análise de lacunas probatórias |
| `6 HC/` | Argumentação sobre ilegalidades prisionais |
| `7 Prisão e cautelares/` | Teses sobre desproporcionalidade de medidas |
| `8 RESE/` | Argumentação recursal |
| `9 Resposta à acusação/` | Primeira defesa — análise de nulidades e teses preliminares |
| `10 Execução Penal/` | Referência para análise de casos em execução |
| `11 Violência Doméstica/` | Referência para análise de casos de VVD |

**Como usar**: Ao preparar uma análise estratégica, consulte modelos de peças do mesmo tipo de crime ou situação processual. As teses, contra-argumentos e estratégias já utilizadas em peças anteriores enriquecem a análise do caso atual.

---

## Pastas de Processos dos Assistidos

Os processos individuais são a fonte primária de dados para gerar as análises. Organizados por atribuição:

| Atribuição | Caminho da Pasta |
|---|---|
| Criminal Comum | `Meu Drive 2/1 - Defensoria 9ª DP/Processos/` |
| Júri | `Meu Drive 2/1 - Defensoria 9ª DP/Processos - Júri/` |
| VVD | `Meu Drive 2/1 - Defensoria 9ª DP/Processos - VVD/` |
| Execução Penal | `Meu Drive 2/1 - Defensoria 9ª DP/Processos - Execução Penal/` |
| Substituição Criminal | `Meu Drive 2/1 - Defensoria 9ª DP/Processos - Substituição criminal/` |
| Grupo do Júri | `Meu Drive 2/1 - Defensoria 9ª DP/Processos - Grupo do juri/` |

**Como usar**: Quando o usuário pedir análise de um caso específico, busque o nome do assistido nas pastas de processos. Leia PDFs dos autos, transcrições de depoimentos e documentos. Essa é a matéria-prima factual para a análise estratégica.

---

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

## Formatação e Geração de Documentos — Tripla Saída

**Regra obrigatória**: toda análise gera 3 arquivos. Leia `references/tripla_saida.md` para a especificação completa.

| Formato | Ferramenta | Paleta | Template |
|---|---|---|---|
| **PDF** | ReportLab | Navy/Steel v3 (`#1D3461`, `#2E6DA4`, `#D6E8F7`) | `scripts/gerar_pdf_v3_template.py` |
| **MD** | Markdown puro | — | Headers, tabelas, blockquotes |
| **JSON** | JSON nativo | — | Schema `_analise_ia.json` (ver abaixo) |
| **DOCX** (opcional) | `scripts/gerar_docx.py` | Navy/Steel v3 | Sob demanda do usuário |

O PDF é gerado via script Python/ReportLab (não via conversão docx→pdf). Use o template `scripts/gerar_pdf_v3_template.py` que já contém a paleta, estilos e helpers (section_heading, make_table, alert_red/blue/green, quote_box, etc.).

## Estruturas Tipicamente Incluídas em Análises

### Análise Criminal Completa
1. **Painel de Controle**: Nomes, processos, IP, policiais, pessoas arroladas
2. **Resumo Executivo**: Síntese estratégica em 3 parágrafos
3. **Status Processual**: Prescrição, intimações, pontos urgentes
4. **Perfil dos Envolvidos**: Réu(s), vítima(s), policiais, testemunhas
5. **Radiografia da Acusação**: Tese, testemunhas, provas materiais
6. **Análise Crítica de Depoimentos**: Mapeamento, contradições, credibilidade
7. **Tabela Comparativa**: Depoimentos delegacia vs juízo
8. **Inconsistências da Acusação**: Vulnerabilidades, nulidades, insuficiência probatória
9. **Estratégia Defensiva**: Teses viáveis, construção narrativa, plano de ação
10. **Perguntas Estratégicas**: Para inquirição de policiais, vítima, testemunhas
11. **Orientação ao Assistido**: Postura, riscos, ênfases em interrogatório
12. **Perspectiva Plenária** (se sumariante): Preparação para júri

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
- Nomes dos arquivos:
  - PDF: `[Tipo da Análise] - [Nome do Assistido].pdf`
  - MD: `[Tipo da Análise] - [Nome do Assistido] - YYYY-MM-DD.md`
  - JSON: `_analise_ia.json` (sempre mesmo nome, sobrescreve)
- Salvar tudo na pasta do assistido
- Garantir que análises sejam compreensíveis em leitura rápida (clareza visual)
- Sempre marcar vulnerabilidades, contradições e teses potenciais em negrito ou destaque
- Indicar referências aos trechos/linhas específicas dos autos quando citar
- Ao final, apresentar os 3 links:
  ```
  📄 [View PDF](computer:///caminho/arquivo.pdf)
  📝 [View MD](computer:///caminho/arquivo.md)
  ✅ `_analise_ia.json` salvo — pronto para importar no OMBUDS
  ```


---

## Output Estruturado — _analise_ia.json

**SEMPRE ao final de cada análise**, além de salvar o `.md` / `.docx`, salvar o arquivo `_analise_ia.json` na **mesma pasta raiz do assistido no Drive** com o seguinte schema:

```json
{
  "schema_version": "1.0",
  "tipo": "<audiencia_criminal|audiencia_sumariante|juri|vvd|execucao_penal|ra>",
  "gerado_em": "<ISO 8601>",
  "assistido": "<nome completo>",
  "processo": "<número dos autos>",
  "resumo_fato": "<síntese do fato em 2-3 frases>",
  "tese_defesa": "<tese principal identificada>",
  "estrategia_atual": "<estratégia recomendada>",
  "crime_principal": "<tipo penal principal>",
  "pontos_criticos": ["<ponto 1>", "<ponto 2>"],
  "payload": {
    "perguntas_por_testemunha": [
      { "nome": "<nome>", "tipo": "ACUSACAO|DEFESA", "perguntas": ["<p1>", "<p2>"] }
    ],
    "contradicoes": [
      { "testemunha": "<nome>", "delegacia": "<versão>", "juizo": "<versão>", "contradicao": "<descrição>" }
    ],
    "orientacao_ao_assistido": "<orientação para o interrogatório>"
  }
}
```

**Instrução de salvamento:**
1. Gere o JSON com os campos preenchidos da análise atual
2. Salve como `_analise_ia.json` na pasta raiz do assistido (substituindo se já existir)
3. Informe ao final: "✅ `_analise_ia.json` salvo — pronto para importar no OMBUDS via botão 'Importar do Cowork'"

**Campos do payload variam por tipo:**
- `audiencia_criminal` / `audiencia_sumariante`: `perguntas_por_testemunha`, `contradicoes`, `orientacao_ao_assistido`
- `juri`: adicionar `perspectiva_plenaria`, `quesitos_criticos`
- `vvd`: adicionar `medidas_protetivas_vigentes`, `historico_violencia`
- `execucao_penal`: adicionar `beneficios_pendentes`, `datas_criticas`