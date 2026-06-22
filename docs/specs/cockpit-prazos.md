# Spec — Cockpit de prazos (chips fixos clicáveis)

> Track F. Spec-driven + TDD. Apresentação pura em
> `src/components/demandas-premium/prazo-cockpit.ts`; wiring em demandas-premium-view.

## Problema

As contagens de prazo (atrasados/hoje/semana/sem-prazo) já existem (`pillCounts`,
`matchesPill`), mas ficam **escondidas dentro de um popover de filtros**. A maior
ansiedade do defensor — não perder prazo — não tem leitura imediata. É preciso abrir o
popover para saber quantos estão atrasados.

## Decisão

Uma **barra fixa no topo de Demandas** com chips sempre visíveis: "Atrasados N ·
Vencem hoje N · Esta semana N · Sem prazo N". Cada chip:
- mostra a contagem (de `pillCounts`, que já respeita os filtros de atribuição/área);
- ao clicar, **alterna o filtro** correspondente (reusa `togglePill` + `pillFilters`);
- realça quando ativo.

Reaproveita 100% da lógica de filtro existente; o novo código é só apresentação.

## Contrato (`prazo-cockpit.ts`)

| Símbolo | Regra |
|---|---|
| `PrazoKey` | `"atrasados" \| "hoje" \| "semana" \| "sem_prazo"` |
| `buildPrazoCockpit(counts, active)` | retorna `{ chips, totalEmRisco, hasUrgencia }` |
| `chips` | ordem fixa por severidade: atrasados(danger) → hoje(warn) → semana(neutral) → sem_prazo(muted); cada um `{ key, label, count, tone, active }` |
| `totalEmRisco` | `atrasados + hoje` (o que exige ação imediata) |
| `hasUrgencia` | `totalEmRisco > 0` |

`active` aceita `Set<string>` ou `string[]`. Contagem ausente → 0.

## Aceite

- [ ] testes: mapeia counts→chips na ordem/severidade certa; reflete `active`
      (Set e array); `totalEmRisco`/`hasUrgencia`; chaves ausentes viram 0.
- [ ] barra fixa renderiza os 4 chips com contagem; clique alterna o filtro.
- [ ] realce visual quando o chip está ativo; tom danger destacado se há atrasados.
