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

### Para Documentos .docx

- **Página e Margens**: A4, margem superior 2552 twips, inferior 1134, esquerda 1418, direita 1134
- **Fonte**: Verdana, 12pt, justificado, espaçamento 1.5, recuo 1ª linha 720 twips
- **Título do documento**: 14pt, negrito, centralizado
- **Títulos de seção**: 12pt, negrito, sem recuo
- **Rodapé**: Arial Narrow, 8pt, "Defensoria Pública do Estado da Bahia" / "7ª Regional da DPE – Camaçari – Bahia."
- **Assinatura**: Centralizado, negrito, "Rodrigo Rocha Meire" / "Defensor Público"

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
- Nome do arquivo: `[Tipo da Análise] - [Nome do Assistido].docx` ou `.pdf`
- Salvar na pasta do usuário
- Garantir que análises sejam compreensíveis em leitura rápida (clareza visual)
- Sempre marcar vulnerabilidades, contradições e teses potenciais em negrito ou destaque
- Indicar referências aos trechos/linhas específicas dos autos quando citar
