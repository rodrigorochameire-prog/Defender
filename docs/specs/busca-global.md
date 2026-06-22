# Spec — Busca rápida global (cmd+K)

> Track G. Spec-driven + TDD. Ranking puro em
> `src/components/demandas-premium/demanda-search.ts`; paleta em `DemandaSearchPalette.tsx`.

## Problema

A busca atual (`searchTerm`) filtra a lista in-place: substring simples, **sem
tolerância a acento**, sem ranking, e sem salto direto — para achar "João Silva" o
defensor digita e ainda rola. Com 200+ demandas, falta um atalho global de "ir para".

## Decisão

Uma **paleta cmd+K** (também `/`) que busca em **todas** as demandas (independente dos
filtros/aba atuais), ranqueia e, ao escolher, **abre o sheet** daquela demanda. Não
altera os filtros do board.

## Contrato (`demanda-search.ts`)

| Símbolo | Regra |
|---|---|
| `foldText(s)` | minúsculas + sem acento |
| `searchDemandas(demandas, query, limit=20)` | retorna `{ demanda, score, matchField }[]` ordenado por score desc, desempate por nome |

Pontuação (maior vence): nome prefixo (100) > nome início-de-palavra (80) > nome
substring (60); processo por dígitos — prefixo (90) / contém (70) quando a query tem ≥3
dígitos, ignorando máscara; ato substring (30). Score 0 → excluído. Query vazia → `[]`.

## Wiring

- Atalho global `⌘K`/`Ctrl+K` e `/` (fora de input) abre `DemandaSearchPalette`.
- Lista resultados (nome do assistido + nº processo + ato), navegação ↑/↓, Enter abre.
- `onSelect(demandaId)` chama o mesmo handler que abre o sheet ao clicar num card.

## Aceite

- [ ] testes: prefixo de nome > início-de-palavra > substring; processo por dígitos
      ignora máscara; tolerante a acento/caixa; ato pontua baixo; query vazia → [];
      respeita limit.
- [ ] ⌘K abre a paleta; Enter abre a demanda; Esc fecha.
