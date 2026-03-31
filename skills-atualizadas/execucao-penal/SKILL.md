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

## Formatação Institucional e Geração .docx

> Padrões de página, margens, fontes, cabeçalho/rodapé e instruções python-docx: [`_shared/formatacao-dpe-ba.md`](../_shared/formatacao-dpe-ba.md).

> ⚠️ **Exceção — Análises e Varreduras**: A Varredura Completa de Conformidade e a Análise de Prescrição/Falta de Intimação são documentos **internos de trabalho** e **NÃO levam assinatura**. Encerram com Rodapé do Relatório.

## Relatórios e Análises (.docx)

> Padrão tipológico completo: [`_shared/padrao-relatorio.md`](../_shared/padrao-relatorio.md).

**Cor-tema da Execução Penal**: `1E3A8A` (azul profundo) · Fundo: `EEF4FF` · Clara: `93C5FD`

Cards de alerta: borda esquerda contextual — vermelho `7F1D1D` para risco crítico, âmbar `92400E` para atenção, verde `1A5C36` para ok.

## Importante

> Regras gerais: [`_shared/formatacao-dpe-ba.md`](../_shared/formatacao-dpe-ba.md).
> **Peças processuais**: `[Tipo da Peça] - [Nome do Assistido].docx`
> **Relatórios/Análises**: `[Tipo de Análise] - [Nome do Reeducando] - [Data].docx`

## Integração OMBUDS — `_analise_ia.json`

> Campos comuns, regras e localização: [`_shared/schema-base.md`](../_shared/schema-base.md).

### Payload específico da Execução Penal

```json
{
  "payload": {
    "tipo_peca": "<nome da peça/análise gerada>",
    "regime_atual": "<aberto|semiaberto|fechado|psc|prd|livramento|null>",
    "pena_total": "<ex: 2 anos e 6 meses de reclusão>",
    "pena_restante": "<ex: 1 ano e 3 meses>",
    "data_transito": "<ISO 8601 ou null>",
    "prescricao_executoria": {
      "prazo_aplicavel": "<ex: 3 anos (art. 109, VI, CP)>",
      "data_inicio": "<data de início>",
      "data_consumacao": "<data ou null>",
      "status": "<consumada|iminente|vigente|null>"
    },
    "intimacao": {
      "tipo": "<pessoal|edital|nao_realizada|null>",
      "valida": "<true|false|null>",
      "observacoes": "<detalhes sobre irregularidades>"
    },
    "endereco_atualizado": "<true|false|null>",
    "diligencias_esgotadas": "<true|false|null>",
    "pedidos": [],
    "urgencia": "<alta|media|baixa>"
  }
}
```

### Valores de `tipo`
`ep_autorizacao_trabalho` · `ep_prescricao` · `ep_varredura_conformidade` · `ep_impugnacao_reconversao` · `ep_extincao_prescricao`

## Linguagem Estratégica da Defesa

> Diretrizes completas: [`_shared/linguagem-estrategica.md`](../_shared/linguagem-estrategica.md).
