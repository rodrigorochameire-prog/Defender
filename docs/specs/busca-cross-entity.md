# Spec — Busca global cross-entity (cmd+K v2)

> Track L (#3). Spec-driven + TDD. Ranking puro genérico em
> `src/lib/search/entity-search.ts`; wiring estende a paleta cmd+K.

## Problema

O ⌘K atual busca só Demandas. O defensor quer ir para **qualquer entidade** —
assistido, processo, caso, audiência — em duas teclas.

## Decisão

Um ranking genérico sobre entidades normalizadas `{ id, kind, label, sublabel?,
numero? }`, reaproveitado pela paleta. Cada fonte (assistidos, processos, casos,
demandas, audiências) se converte nesse formato; o ranking é único e testado.

## Contrato (`entity-search.ts`)

| Símbolo | Regra |
|---|---|
| `EntityKind` | `"assistido" \| "processo" \| "caso" \| "demanda" \| "audiencia"` |
| `foldText(s)` | minúsculas + sem acento |
| `searchEntities(entities, query, limit=20)` | `{ entity, score }[]` ordenado por score desc, desempate por label; query vazia → [] |

Pontuação: label prefixo (100) > início-de-palavra (80) > substring (60); `numero` por
dígitos — prefixo (90) / contém (70) quando a query tem ≥3 dígitos; sublabel substring
(40). Score 0 → excluído.

## Wiring

- A paleta agrega assistidos/processos/casos/demandas/audiências convertidos em
  `SearchEntity`; `onSelect(kind, id)` navega para a rota da entidade.

## Aceite

- [ ] testes: prefixo de label vence; numero por dígitos ignora máscara; sublabel
      pontua baixo; tolerante a acento; query vazia → []; limite; mistura de kinds.
