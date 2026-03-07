# Demandas Page — Polish V2

> Data: 2026-03-06
> Status: Aprovado

## Decisões

| Aspecto | Decisão |
|---------|---------|
| Tag atribuição | Left border 3px na `<tr>` (estilo Linear/Notion) |
| Deadline banner | Barra urgência acima toolbar, clicável filtra |
| Quick-preview | Sheet lateral 400px, ↑↓ navega, edição inline |
| Agrupamento | Toggle por status/atribuição, headers colapsáveis |

## 1. Left Border — Tag de Atribuição

- `<tr>` recebe `border-left: 3px solid {atribuicaoColor}`
- Remover barra colorida do `cellRenderers.index`
- Zona clicável nos primeiros 8px abre dropdown atribuição
- Hover: borda 4px com transição
- Mobile: mesma borda no container do card (substituir button de 2px)

## 2. Deadline Banner

- Posição: entre tabs e toolbar, só aparece se houver urgências
- Contadores: "⏰ N vencem hoje · N vencida · N esta semana"
- Cores: vencida=rose, hoje=amber, semana=yellow
- Click filtra, × dismiss (reaparece se novas)
- Mobile: mesma barra, text-xs

## 3. Row Quick-Preview (Sheet)

- Trigger: click no nome do assistido
- Sheet (shadcn) pela direita, ~400px
- Conteúdo: header, dados editáveis, links, ações, metadados
- ↑↓ navega entre demandas com painel aberto
- Esc/click fora fecha
- Mobile: bottom sheet full-width

## 4. Agrupamento Visual

- Toggle no toolbar: Sem grupo | Por Status | Por Atribuição
- Header colapsável: "▾ Analisar (12)" em zinc-50
- Grupo colapsado: "▸ Analisar (12) — 3 urgentes"
- State: `groupBy`, `collapsedGroups: Set<string>`
- Persistência: localStorage
- Mobile: mesmos headers no card view
