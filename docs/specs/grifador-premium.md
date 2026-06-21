# Spec — Grifador premium: toolbar colapsável (estilo GoodNotes)

> Track B. Spec-driven + TDD. Invariantes puras em
> `src/components/drive/annotation-toolbar.ts`; wiring em `PdfViewerModal.tsx`.

## Problema

A barra de anotação (`PdfViewerModal.tsx`, bloco "Floating Annotation Toolbar") é uma
faixa de largura total com `border-b` que **ocupa uma linha inteira e empurra o PDF
para baixo**. Ao grifar autos por longos períodos, isso rouba área de leitura e mantém
muito *chrome* na frente do conteúdo — o oposto do fluxo GoodNotes.

## Decisão

Tornar a barra **colapsável** sem perder a função de grifar. A arquitetura já permite:
`annotationMode` é estado independente, a captura de seleção vive no container da
página e os overlays renderizam a partir da lista de anotações — nada depende da barra
estar visível (confirmado no código).

- **Expandida**: barra cheia de hoje + botão *minimizar* (chevron).
- **Colapsada**: pílula flutuante mínima (posição absoluta, **não empurra o conteúdo**)
  com o ícone do modo ativo + swatch da cor + botão expandir. O modo de grifo
  **permanece ativo** — selecionar texto continua criando grifos.
- Sair da anotação (modo `none`) sempre reseta o colapso (não faz sentido manter pílula
  sem modo ativo).

## Contrato (`annotation-toolbar.ts`)

| Função | Regra |
|---|---|
| `isAnnotating(mode)` | `mode !== "none"` |
| `showFullToolbar(mode, collapsed)` | anotando **e** não-colapsada |
| `showCompactPalette(mode, collapsed)` | anotando **e** colapsada (grifo segue ativo) |
| `reconcileCollapsed(mode, collapsed)` | `isAnnotating(mode) ? collapsed : false` |

Invariante central: **colapsar nunca altera `mode`** — o grifo continua ativo
colapsado. `showFullToolbar` e `showCompactPalette` são mutuamente exclusivas e nunca
ambas verdadeiras.

## Aceite

- [ ] testes cobrem as 4 funções e a exclusividade full/compact.
- [ ] barra ganha botão minimizar; pílula flutuante expande de volta.
- [ ] grifar funciona com a barra colapsada (estado de modo preservado).
- [ ] fechar anotação reseta o colapso.
