# Spec — Kanban: consciência de WIP por coluna

> Track I. Spec-driven + TDD. Núcleo puro em
> `src/components/demandas-premium/kanban-wip.ts`; wiring no `ColumnHeader`.

## Problema

A coluna "Em andamento" cresce sem limite. O defensor acumula mais demandas ativas do
que consegue tocar — sem nenhum sinal visual de sobrecarga (best practice Kanban: WIP).

## Decisão

Um indicador de saúde no badge de contagem da coluna: tom neutro até o limite saudável,
**âmbar** ao passar do aviso, **vermelho** ao passar do limite. Aplica-se só às colunas
com limite configurado (hoje, `em_andamento`).

## Contrato (`kanban-wip.ts`)

| Símbolo | Regra |
|---|---|
| `WipLimits` | `{ warn: number; danger: number }` |
| `WIP_LIMITS` | `{ em_andamento: { warn: 15, danger: 25 } }` |
| `wipHealth(count, limit?)` | sem limite → `"ok"`; `>= danger` → `"danger"`; `>= warn` → `"warn"`; senão `"ok"` |

## Aceite

- [ ] testes: sem limite sempre ok; limites de aviso/perigo; bordas exatas.
- [ ] badge muda de tom (âmbar/vermelho) ao exceder; tooltip explica o WIP.
