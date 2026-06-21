# Spec — Vincular demanda a um Caso (inline no sheet)

> Follow-up. Spec-driven + TDD. Busca pura em
> `src/components/demandas-premium/caso-picker.ts`; router `demandas.update` + UI no sheet.

## Problema

A demanda tem `casoId` (já no schema), mas não há como ligar/desligar a demanda de um
Caso/dossiê pelo sheet — o defensor precisa ir a outra página. Casos concentram teoria
do caso, teses, fatos: vincular dá contexto rico à demanda.

## Decisão

- `demandas.update` aceita `casoId` (nullable → desvincular). Flui via `...data` para a
  coluna existente.
- Controle inline no sheet (seção Identificação): mostra o Caso vinculado (com link) e
  permite buscar/vincular ou desvincular. Busca via `casos.list`.

## Contrato (`caso-picker.ts`)

| Função | Regra |
|---|---|
| `casoLabel(caso)` | `codigo ? "<codigo> · <titulo>" : titulo` |
| `searchCasos(casos, query, limit=20)` | query vazia → primeiros `limit` (sem ranking); senão ranqueia por título (prefixo 100 / início-de-palavra 80 / substring 60) e código (70), tolerante a acento. |

## Aceite

- [ ] testes: label com/sem código; query vazia → todos (até limit); prefixo de título
      vence; código casa; acento/caixa; sem match → []; limite.
- [ ] router aceita casoId/null; UI vincula e desvincula; mostra o caso atual.
