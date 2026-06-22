# Spec — Caderno de citações por categoria + filtro no painel

> Track E. Spec-driven + TDD. Lógica pura em `src/components/drive/citation-export.ts`;
> wiring no `AnnotationsPanel` (PdfViewerModal.tsx).

## Problema

O leitor tem 10 cores de grifo com **rótulos semânticos de defesa** (Fatos,
Contradições, Teses, Provas, Jurisprudência…). Mas o "Exportar grifos" atual gera
uma **lista plana por página**, ignorando a categoria — joga fora justamente a
estrutura que o defensor criou ao grifar com cores. E o painel não tem busca.

## Decisão

Transformar os grifos no **esqueleto da peça**: export agrupado por categoria, na
ordem da paleta, com referência de página. E um filtro de texto no painel.

## Contrato (`citation-export.ts`)

| Função | Regra |
|---|---|
| `buildCitationGroups(annotations, categories)` | filtra highlight/underline com `textoSelecionado`; agrupa por `cor`; grupos na ordem de `categories`; itens ordenados por página. Só inclui categorias com itens. |
| `citationsToText(groups)` | texto estruturado: `## <Categoria>` + linhas `• Pág. N: "<texto>"`, grupos separados por linha em branco. |
| `filterCitations(annotations, query)` | match case-insensitive (sem acento) em `textoSelecionado`/`texto`; query vazia → todos. |

`categories`: `{ color: string; label: string }[]` na ordem da paleta (vem de
`getAnnotationColorsWithLabels`). Módulo desacoplado das constantes de cor.

## Wiring

- `AnnotationsPanel` recebe `categories` (paleta resolvida) e usa
  `buildCitationGroups` + `citationsToText` no botão Exportar (agora "Exportar por
  categoria"); fallback: se nenhum grifo tem categoria útil, ainda exporta.
- Campo de busca no header do painel filtra a lista via `filterCitations`.

## Aceite

- [ ] testes: agrupa por categoria na ordem certa; ignora bookmark/note/sem-texto;
      ordena por página; texto estruturado; filtro com/sem acento e vazio.
- [ ] export copia o caderno agrupado; toast com contagem.
- [ ] busca filtra a lista em tempo real.
