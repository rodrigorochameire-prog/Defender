# Spec — Leitor: caneta livre (ink)

> Track D. Spec-driven + TDD. Geometria pura em
> `src/components/drive/ink-geometry.ts`; captura em `InkCanvas.tsx`; wiring em
> `PdfViewerModal.tsx`; persistência via `annotations` router.

## Problema

O leitor tem grifo/sublinhado/nota/marcador, mas **não tem desenho à mão livre**
(assinar, circular, ligar elementos) — o recurso-assinatura do GoodNotes.

## Modelo de dados

Reaproveita `driveFileAnnotations` (`tipo` é `varchar(20)`, sem migration):
- `tipo: "ink"`
- `posicao: { paths: [[ [x,y], ... ]], strokeWidth }` com **coordenadas normalizadas
  [0..1]** relativas à página (resilientes a zoom/tamanho do canvas, como os grifos).
- `cor`: reaproveita a paleta existente.

## Geometria pura (`ink-geometry.ts`)

| Função | Regra |
|---|---|
| `normalizePoint({x,y}, w, h)` | `[x/w, y/h]`, clamp [0,1] |
| `denormalizePoint([x,y], w, h)` | `{x: x*w, y: y*h}` |
| `simplify(points, epsilon)` | Ramer–Douglas–Peucker — remove pontos redundantes |
| `toSvgPath(points)` | string `M..L..` (suavizada por ponto médio quadrático) |

Invariantes testadas: roundtrip normalize→denormalize ≈ identidade; `simplify` remove
colineares e preserva extremos; `toSvgPath` começa com `M` e cobre todos os pontos.

## Captura (`InkCanvas.tsx`)

Overlay absoluto sobre a página. Pointer events coletam pontos; ao soltar, chama
`onStrokeComplete(normalizedPaths, bbox)`. Componente isolado (testável/raciocinável
fora do leitor de 4k linhas).

## Wiring (`PdfViewerModal.tsx`)

- `annotationMode` ganha `"ink"`; pílula "Caneta" na toolbar.
- Quando `mode==="ink"`, monta `<InkCanvas>` sobre a página; no fim do traço, cria a
  annotation `ink` (optimistic, mesma mutation dos grifos).
- Renderiza ink salvos como `<svg><path>` desnormalizados para o tamanho atual.

## Aceite

- [ ] geometria testada (roundtrip, simplify, toSvgPath).
- [ ] router aceita `tipo:"ink"` + `posicao.paths`.
- [ ] `"ink"` integra as invariantes de toolbar (full/compact continuam exclusivas).
- [ ] compila; render verificável no navegador (desenho precisa de QA visual).
