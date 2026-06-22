# Spec — Da leitura à peça (gerar minuta a partir dos grifos)

> Track J. Spec-driven + TDD. Montagem pura do prompt em
> `src/components/drive/minuta-prompt.ts`; wiring no leitor → `analise.criarTask` (daemon).

## Problema

O defensor grifa os autos por categoria (Fatos/Teses/Provas) e exporta o caderno de
citações — mas daí ainda escreve a peça do zero. As três peças já existem (grifos,
caderno, daemon com skill de peça); falta o **conector** que vira o caderno em rascunho.

## Decisão

Botão "Gerar minuta" no painel de anotações: monta uma instrução estruturada a partir
do caderno (citações por categoria) + contexto (assistido, processo, tipo de peça) e
cria uma tarefa para o daemon (`analise.criarTask`, skill `gerar-peca`/`dpe-ba-pecas`).
O resultado fica acessível no acompanhamento de análises.

## Contrato (`minuta-prompt.ts`)

| Função | Regra |
|---|---|
| `buildMinutaPrompt(groups, ctx)` | instrução para a skill: cabeçalho com tipo de peça + assistido + processo, regra "cite as páginas, não invente fatos", seguida do caderno (`citationsToText`). Sem citações → instrução clara de que não há grifos. |

`ctx`: `{ tipoPeca?: string; assistido?: string; processo?: string }`.

## Aceite

- [ ] testes: inclui tipoPeca/assistido/processo quando há; default de tipoPeca;
      embute o caderno; caso sem citações tem aviso; ordem cabeçalho→regra→caderno.
- [ ] botão cria a tarefa com a instrução; toast aponta o acompanhamento.
