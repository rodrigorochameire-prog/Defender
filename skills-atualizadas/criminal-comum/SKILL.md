---
name: criminal-comum
description: "Gerador de peças jurídicas para a atribuição CRIMINAL COMUM da Defensoria Pública do Estado da Bahia (DPE-BA), 7ª Regional – Camaçari. Use esta skill SEMPRE que o usuário pedir qualquer peça de direito penal comum (não VVD, não júri, não execução penal): habeas corpus, requerimento de relaxamento/revogação de prisão preventiva, recurso em sentido estrito (RESE), apelação criminal, alegações finais criminais, resposta à acusação criminal, absolvição sumária, pedido de incidente de insanidade, diligências do art. 422 CPP, petição intermediária ou síntese processual. Também acione quando o usuário mencionar: 'HC', 'habeas', 'relaxamento', 'revogação de prisão', 'RESE', 'apelação criminal', 'alegações finais', 'resposta à acusação', 'RA criminal', 'insanidade', '422 CPP', 'petição intermediária', 'síntese processual', ou qualquer peça de defesa criminal geral. Gera documentos .docx com cabeçalho e rodapé institucionais da DPE-BA."
---

# Peças Jurídicas — Criminal Comum (DPE-BA, 7ª Regional – Camaçari)

Esta skill gera documentos .docx formatados com o padrão institucional da Defensoria Pública para a atribuição de **Criminal Comum**. Cada tipo de peça possui um prompt especializado na pasta `references/`.

## Fluxo de Trabalho

1. **Identificar o tipo de peça** — Veja a tabela abaixo e pergunte ao usuário se não ficou claro
2. **Carregar o prompt específico** — Leia o arquivo correspondente em `references/`
3. **Coletar informações do caso** — Peça dados do assistido, número dos autos, fatos relevantes
4. **Gerar a minuta** — Siga o prompt carregado para compor o conteúdo jurídico
5. **Gerar o .docx** — Use python-docx com a formatação institucional (veja seção abaixo)
6. **Salvar na pasta do usuário**

## Tipos de Peça Disponíveis

| Tipo de Peça | Arquivo de Referência | Quando Usar |
|---|---|---|
| Habeas Corpus | `references/habeas_corpus.md` | Coação ilegal, prisão sem fundamentação |
| HC por excesso prazal | `references/habeas_corpus_excesso_prazal.md` | Especificamente para excesso de prazo na prisão |
| Revogação/Relaxamento de prisão | `references/requerimento_relaxamento_revogacao.md` | Prisão preventiva sem pressupostos do art. 312 CPP |
| Recurso em Sentido Estrito | `references/recurso_em_sentido_estrito.md` | Contra decisão interlocutória |
| Apelação Criminal | `references/apelacao_criminal.md` | Contra sentença condenatória criminal comum |
| Alegações Finais (criminal) | `references/alegacoes_finais_criminal.md` | Memoriais após instrução criminal |
| Alegações Finais (aprimorado) | `references/alegacoes_finais_aprimorado.md` | Versão mais detalhada de alegações finais |
| Resposta à Acusação (Criminal) | `references/resposta_acusacao_criminal.md` | RA versão completa com análise estratégica |
| Resposta à Acusação (básica) | `references/resposta_acusacao_basica.md` | RA versão simplificada |
| Insanidade / Incidente / Quesitos | `references/insanidade_incidente_quesitos.md` | Pedido de incidente de insanidade mental |
| Petição intermediária | `references/peticao_intermediaria.md` | Petições diversas durante o processo |
| Síntese processual | `references/sintese_processual.md` | Resumo/síntese do processo |

> **Nota**: Peças específicas do Tribunal do Júri (apelação pós-júri, alegações finais do júri, diligências do 422 CPP, absolvição sumária) estão na skill **juri**.

## Como Usar os Prompts de Referência

Cada arquivo em `references/` contém o prompt completo extraído do Gemini Gem correspondente. Ao gerar uma peça:

1. **Leia o arquivo de referência** correspondente ao tipo de peça solicitado
2. **Siga as instruções do prompt** como se fossem suas instruções de trabalho
3. **Adapte com os dados reais** fornecidos pelo usuário
4. **Aplique a formatação DPE-BA** descrita abaixo ao gerar o .docx

## Formatação Institucional e Geração .docx

> Padrões completos: [`_shared/formatacao-dpe-ba.md`](../_shared/formatacao-dpe-ba.md).

> ⚠️ **Exceção**: Síntese processual e documentos internos **NÃO levam assinatura formal**. Encerram com Rodapé do Relatório (fundo `FFF0F0`, borda top `991B1B`). Ver [`_shared/padrao-relatorio.md`](../_shared/padrao-relatorio.md).

**Cor-tema do Criminal Comum**: `991B1B` (vermelho) · Fundo: `FFF0F0` · Clara: `FCA5A5`

## Importante

> Regras gerais de nomenclatura e salvamento: [`_shared/formatacao-dpe-ba.md`](../_shared/formatacao-dpe-ba.md).

## Integração OMBUDS — `_analise_ia.json`

> Campos comuns, regras e localização: [`_shared/schema-base.md`](../_shared/schema-base.md).

### Payload específico do Criminal Comum

```json
{
  "payload": {
    "tipo_peca": "<nome da peça gerada>",
    "teses_subsidiarias": [],
    "nulidades_arguidas": [],
    "pedidos": [],
    "status_prisional": "<preso|solto|medidas_cautelares|null>",
    "urgencia": "<alta|media|baixa>"
  }
}
```

### Valores de `tipo`
`habeas_corpus` · `relaxamento_revogacao` · `rese` · `apelacao_criminal` · `alegacoes_finais` · `resposta_acusacao` · `insanidade` · `peticao_intermediaria` · `sintese_processual`

---

## Linguagem Estratégica da Defesa

> Diretrizes completas: [`_shared/linguagem-estrategica.md`](../_shared/linguagem-estrategica.md).
