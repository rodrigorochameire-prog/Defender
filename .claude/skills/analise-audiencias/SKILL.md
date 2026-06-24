---
name: analise-audiencias
description: "Gerador de análises processuais estratégicas e documentos para a Defensoria Pública do Estado da Bahia (DPE-BA), 7ª Regional – Camaçari. Use esta skill SEMPRE que o usuário pedir análises de audiências criminais, análises estratégicas de casos, análise de autos de prisão em flagrante, análise para Resposta à Acusação (RA), dossiês estratégicos de defesa, relatórios de audiência, ou qualquer análise processual. Também acione quando o usuário mencionar: 'análise de audiência', 'preparação de audiência', 'análise para RA', 'audiência de tráfico', 'audiência sumariante', 'audiência criminal', 'auto de prisão em flagrante', 'APF', 'relatório de audiência', 'dossiê estratégico', ou qualquer análise processual. Gera documentos estruturados em Google Docs ou .docx com formatação institucional da DPE-BA."
---

# Análises Processuais Estratégicas (DPE-BA, 7ª Regional – Camaçari)

Esta skill gera análises processuais estruturadas e documentos estratégicos para preparação de defesa criminal. Cada tipo de análise possui um prompt especializado na pasta `references/`, com templates de estruturação visual e tático-estratégica.

## Integração Obrigatória com Skills de Atribuição

Esta skill é o **motor central de análises**, mas cada atribuição criminal possui regras, estruturas e conhecimento específicos definidos em skills próprias. Ao gerar qualquer análise, é **obrigatório** identificar a atribuição do caso e carregar a skill correspondente para incorporar seu conhecimento especializado. A análise final deve refletir o melhor de ambas as skills — a estrutura operacional daqui com a profundidade temática da skill de atribuição.

> **Integração bidirecional**: esta skill carrega as skills de atribuição para enriquecer as análises, e as skills de atribuição referenciam esta skill para análises estratégicas e tripla saída.

### Mapa de Atribuições → Skills

| Atribuição do Caso | Skill a Carregar | Quando Identificar |
|---|---|---|
| **Tribunal do Júri** | `juri` | Homicídio doloso, tentativa de homicídio, crimes dolosos contra a vida, processo sumariante |
| **Criminal Comum** | `criminal-comum` | Tráfico, roubo, furto, estelionato, porte de arma, receptação, e demais crimes comuns |
| **Violência Doméstica** | `vvd` | Lei Maria da Penha, medida protetiva, VVD |
| **Execução Penal** | `execucao-penal` | Progressão de regime, livramento condicional, saída temporária, LEP |

### O que absorver da skill de atribuição

Ao ler o SKILL.md da atribuição, incorpore na análise:

1. **Padrões obrigatórios de redação** — preâmbulo, síntese processual, terminologia específica. Ex: no júri, usar "ilegalidade do procedimento de reconhecimento" (não "nulidade"); enquadrar corretamente o procedimento bifásico (pronúncia/impronúncia, não condenação/absolvição); etc.
2. **Estrutura de análise específica** — cada atribuição tem templates de análise mais completos em seus `references/`. Ex: o júri tem `analise_juri_estruturada.md` com seções de Prova Técnica, Preparação para Plenário, Análise de Jurados, Fábrica de Ideias Defensivas — conteúdo que enriquece a análise genérica
3. **Banco de modelos reais** — peças anteriores do Defensor na pasta "Petições por assunto" de cada atribuição, que informam estilo argumentativo e teses já utilizadas
4. **Pastas de processos específicas** — cada atribuição tem sua pasta própria de processos no Drive
5. **Regras especializadas** — reconhecimento fotográfico, quesitos, medidas protetivas, cálculos de pena — conforme a atribuição

### Paletas por Atribuição

Cada atribuição possui uma paleta visual própria para os PDFs gerados. A paleta é automaticamente aplicada ao gerar o PDF via `build_pdf(atribuicao="...")`:

| Atribuição | Cores Principais | Paleta |
|---|---|---|
| **Júri** | Verde (#1B5E3B, #2E8B57, #D4EDDA) | Verde suave |
| **Criminal Comum** | Teal (#1A5C5C, #2E8B8B, #D4EDED) | Teal suave |
| **VVD** | Dourado (#6B4C00, #B8860B, #FFF8DC) | Amarelo suave |
| **Execução Penal** | Navy/Steel (#1D3461, #2E6DA4, #D6E8F7) | Steel soft (padrão) |
| **Substituição Criminal** | Bordô (#7B2D3B, #C0616F, #FDE8EC) | Rosa suave |

**Importante**: Os alertas (red, green, blue, amber) mantêm suas cores próprias **em todas as paletas**.

### Skills Transversais (sempre consultar quando relevante)

- **`linguagem-defensiva`** — substituição de termos acusatórios por neutros/defensivos ("acusado" → "defendido", "confessou" → "relatou", etc.)
- **`citacoes-seguras`** — protocolo anti-alucinação para súmulas e jurisprudência
- **`citacao-depoimentos`** — formato correto para citar trechos de depoimentos com timestamps e identificação de quem perguntou
- **`dpe-ba-pecas`** — regras canônicas de formatação de peças (nome inline, nulidade ≠ ilegalidade, paragrafação funcional, preâmbulo)

### Exemplo prático da integração

Quando o usuário pede "faça relatório" para um caso de tentativa de homicídio:
1. Esta skill (`analise-audiencias`) é acionada → identifica tipo "audiência sumariante"
2. Pelo tipo penal (tentativa de homicídio = crime doloso contra a vida) → carrega `juri/SKILL.md`
3. Lê `juri/references/analise_juri_estruturada.md` para a estrutura expandida
4. Lê `analise-audiencias/references/analise_audiencia_sumariante.md` para o prompt operacional
5. Combina ambos: painel de depoentes + análise de provas técnicas + preparação para plenário + análise de jurados + fábrica de ideias defensivas
6. Aplica linguagem defensiva e citações seguras

---

## Fluxo de Trabalho

1. **Identificar o tipo de análise** — Veja a tabela "Tipos de Análise" abaixo e pergunte ao usuário se não ficou claro
2. **Identificar a atribuição e carregar a skill correspondente** — Pelo tipo penal do caso, leia o SKILL.md da skill de atribuição E o reference de análise mais adequado dela (ver "Integração Obrigatória" acima). **Este passo é OBRIGATÓRIO.**
3. **Carregar o prompt específico desta skill** — Leia o arquivo correspondente em `references/`
4. **Localizar o processo do assistido** — Busque a pasta do assistido nos diretórios de processos (ver "Pastas de Processos" desta skill E da skill de atribuição) e leia PDFs dos autos, transcrições de depoimentos e documentos do caso
   - **Mídias e transcrição da instrução** (módulo `preparar-audiencias/references/midias_e_transcricao.md`): se a análise depende da prova oral já produzida, conferir se a pasta já tem as mídias/transcrições; se faltar, varrer as atas, baixar (`scripts/baixar_midias_lifesize.py`) e transcrever (`scripts/transcrever_midias.py`) com dedup. Citar com timestamp e conferir de ouvido.
5. **Consultar peças anteriores similares** — Se relevante, busque peças do mesmo tipo em "Petições por assunto" (ver "Banco de Modelos" desta skill E da skill de atribuição)
6. **Coletar informações complementares** — Se os autos/documentos não forem suficientes, peça dados adicionais ao usuário
7. **Executar a análise integrando ambas as skills** — Siga o prompt desta skill + a estrutura e regras da skill de atribuição, incorporando os dados extraídos do processo. O resultado deve combinar o melhor de cada skill.
8. **Gerar TRIPLA SAÍDA obrigatória** — Leia `references/tripla_saida.md` e siga as instruções. Toda análise DEVE produzir 3 arquivos:
   - **PDF** (ReportLab, paleta correspondente à atribuição) — use `scripts/gerar_pdf_v3_template.py` como base, chamando `build_pdf(..., atribuicao="nome_atribuicao")`
   - **MD** (para exibição no Cowork)
   - **JSON** (`_analise_ia.json` para OMBUDS)
9. **Salvar na pasta do assistido** e apresentar links ao defensor

---

## Banco de Modelos Reais (Petições por Assunto)

Peças anteriores do Defensor servem como base de conhecimento para gerar análises mais precisas — o estilo argumentativo, as teses utilizadas e a estrutura das peças informam a análise estratégica.

**Caminho base**: `Meu Drive/1 - Defensoria 9ª DP/4 - Peças/Petições por assunto (DOC)/`

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
| Criminal Comum | `Meu Drive/1 - Defensoria 9ª DP/3 - Casos/Processos/` |
| Júri | `Meu Drive/1 - Defensoria 9ª DP/3 - Casos/Processos - Júri/` |
| VVD | `Meu Drive/1 - Defensoria 9ª DP/3 - Casos/Processos - VVD/` |
| Execução Penal | `Meu Drive/1 - Defensoria 9ª DP/3 - Casos/Processos - Execução Penal/` |
| Substituição Criminal | `Meu Drive/1 - Defensoria 9ª DP/3 - Casos/Processos - Substituição criminal/` |
| Grupo do Júri | `Meu Drive/1 - Defensoria 9ª DP/7 - Júri/Processos - Grupo do juri/` |

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
| **PDF** | ReportLab | Varia por atribuição (ver seção "Paletas por Atribuição") | `scripts/gerar_pdf_v3_template.py` com `atribuicao` param |
| **MD** | Markdown puro | — | Headers, tabelas, blockquotes |
| **JSON** | JSON nativo | — | Schema `_analise_ia.json` (ver abaixo) |
| **DOCX** (opcional) | `scripts/gerar_docx.py` | Varia por atribuição | Sob demanda do usuário |

O PDF é gerado via script Python/ReportLab (não via conversão docx→pdf). Use o template `scripts/gerar_pdf_v3_template.py` que já contém múltiplas paletas, estilos e helpers (section_heading, make_table, alert_red/blue/green, quote_box, etc.). Chame `build_pdf(..., atribuicao="juri")` (ou outra atribuição) para aplicar a paleta correta.

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

## Output Estruturado — _analise_ia.json (SCHEMA CANÔNICO)

> **Esta skill é a fonte canônica do schema `_analise_ia.json`.** As skills de atribuição (criminal-comum, juri, vvd, execucao-penal) referenciam este schema — não o duplicam.

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

## Histórico

| Data | Caso | Lição |
|---|---|---|
| 2026-06-10 | Integração mídias + transcrição | Quando a análise depende da prova oral já produzida, conferir/baixar/transcrever as mídias da pasta do assistido (módulo midias_e_transcricao de preparar-audiencias) com dedup antes de analisar; citar com timestamp em vez de só parafrasear o IP. |
