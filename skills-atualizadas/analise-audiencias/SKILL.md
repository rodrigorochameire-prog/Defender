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

## Formatação para Google Docs

- **Título**: Verdana, 14pt, negrito, centralizado
- **Subtítulos**: Verdana, 12pt, negrito, espaçamento 1.5
- **Corpo**: Verdana, 11pt, justificado, espaçamento 1.5
- Usar headings/bookmarks para navegação, negrito para termos-chave, tabelas comparativas quando necessário

## Relatórios .docx

> Padrão tipológico completo (banner, headings, corpo, rodapé): [`_shared/padrao-relatorio.md`](../_shared/padrao-relatorio.md).
> Geração python-docx e formatação DPE-BA: [`_shared/formatacao-dpe-ba.md`](../_shared/formatacao-dpe-ba.md).

A cor-tema varia por atribuição — consultar tabela de cores em [`_shared/padrao-relatorio.md`](../_shared/padrao-relatorio.md).

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

> Regras gerais: [`_shared/formatacao-dpe-ba.md`](../_shared/formatacao-dpe-ba.md).
> Nome do arquivo: `[Tipo da Análise] - [Nome do Assistido].docx` ou `.pdf`
> Garantir que análises sejam compreensíveis em leitura rápida (clareza visual).
> Sempre marcar vulnerabilidades, contradições e teses potenciais em destaque.
> Indicar referências aos trechos/linhas específicas dos autos quando citar.

## Integração OMBUDS — `_analise_ia.json`

> Campos comuns, regras e localização: [`_shared/schema-base.md`](../_shared/schema-base.md).

### Payload específico da Análise de Audiências

```json
{
  "payload": {
    "perguntas_por_testemunha": [
      { "nome": "<nome>", "tipo": "ACUSACAO|DEFESA|INFORMANTE", "perguntas": [] }
    ],
    "contradicoes": [
      { "testemunha": "<nome>", "delegacia": "<versão>", "juizo": "<versão>", "contradicao": "<descrição>" }
    ],
    "orientacao_ao_assistido": "<orientação de postura e pontos a enfatizar no interrogatório>",
    "nulidades_identificadas": [],
    "provas_a_requerer": []
  }
}
```

### Valores de `tipo`
`audiencia_criminal` · `audiencia_sumariante` · `audiencia_trafico` · `apf` · `audiencia_justificacao` · `analise_ra`

## Linguagem Estratégica da Defesa

> Diretrizes completas: [`_shared/linguagem-estrategica.md`](../_shared/linguagem-estrategica.md).
