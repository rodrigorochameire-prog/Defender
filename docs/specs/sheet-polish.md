# Spec — Polish do sheet (recolher/expandir tudo)

> Track H. Spec-driven + TDD. Helpers puros em
> `src/components/demandas-premium/sheet-sections.ts`; wiring no DemandaQuickPreview.

## Problema

Ao trocar de demanda, o sheet abre várias seções (registros, próxima audiência…). Não
há "recolher tudo" — o defensor clica seção por seção (7×) para reduzir o ruído.

## Decisão

Um único botão no cabeçalho do ToC que alterna **recolher tudo ↔ expandir tudo**,
persistindo no mesmo `localStorage` (`DEMANDAS_SECOES_KEY`).

## Contrato (`sheet-sections.ts`)

| Função | Regra |
|---|---|
| `setAllSections(map, value)` | novo mapa com todas as chaves = `value` |
| `areAllOpen(map)` | true se o mapa é não-vazio e todos os valores são true |
| `nextToggleAll(map)` | valor a aplicar: se todos abertos → `false`; senão → `true` |

## Aceite

- [ ] testes: setAllSections preserva chaves; areAllOpen com vazio/misto/todos;
      nextToggleAll inverte só quando tudo aberto.
- [ ] botão alterna todas as seções e persiste; ícone/rótulo reflete o estado.

## Fora deste track (exigem migration/router — follow-up)

Nota interna privada, vincular a caso inline, "última edição por" e a consolidação do
editor de processo tocam schema/router; ficam para um próximo passo com aval.
