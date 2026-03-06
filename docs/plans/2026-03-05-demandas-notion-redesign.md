# Demandas Page — Notion-style Clean Redesign

> Data: 2026-03-05
> Status: Aprovado

## Decisões

| Aspecto | Decisão |
|---------|---------|
| Direção visual | Notion-style Clean — minimalismo, whitespace, sem caixas dentro de caixas |
| Header | Compacto inline (~56px): título + contadores + ícones menores + "Nova" |
| Ícones de ação | Manter inline compactos (sem menu overflow) |
| Analytics/Infográficos | Tab separada (não abaixo da lista) |
| Linhas da lista | Duas linhas melhoradas: sem placeholders, prazo badge, urgência visual |

## 1. Header Compacto

- Remover: ícone preto 44px, subtítulo, padding excessivo
- Título "Demandas" em `text-xl font-semibold` (sans-serif)
- Contadores inline: `77 ativas · 5 urgentes · 2 presos` em `text-sm text-zinc-400`
- 5 ícones de ação em `w-8 h-8 text-zinc-400 hover:text-zinc-700`
- Botão "+ Nova" compacto
- Mobile: contadores em 2ª linha, ícones em menu `⋯`

## 2. Tabs + Toolbar

### Tabs
- `[Lista]` `[Analytics]` `[Infográficos]` — underline na ativa
- Tab Lista = planilha atual
- Tab Analytics = gráficos/histórico (movidos de "abaixo da lista")
- Tab Infográficos = os 4 cards de gráfico

### Toolbar (uma linha, sem card wrapper)
- Esquerda: Search borderless com hint `⌘K`
- Centro: Atribuição pills toggle — `Júri 25` `VD 50` `EP 2`
- Direita: Sort dropdown + view toggles (`w-7 h-7`) + presos + lixeira
- Sem progress bar (contagem no pill já basta)
- Mobile: search expansível via ícone, pills scroll horizontal

## 3. Linhas da Lista

### Linha 1 (primária)
- Barra lateral colorida 3px (manter)
- Status: `●` colorido + texto, SEM pill background
- Nome do assistido em `font-medium`
- Prazo badge: `5d` pill compacto / `rose` pulsante se < 3d / nada se vazio

### Linha 2 (secundária)
- Processo `font-mono text-xs text-zinc-400`
- Tipo de ato `text-xs text-zinc-500`
- Crime/assunto se existir
- SEM placeholder text ("ajustar status e ato" removido)

### Urgência visual
- Réu preso: borda `rose-500` + ícone cadeado
- Prazo vencido: `bg-rose-50/30`
- Normal: zebra `white/zinc-50`

### Hover
- Fundo `zinc-100/50`
- Ações rápidas: ✓ Resolver + ⋯ Menu

### Edição inline: mantida (Enter, data-edit-trigger, cores dinâmicas)

## 4. Mobile

- Header: título + contadores + FAB flutuante "+"
- Tabs scrolláveis horizontais
- Search: ícone → expande full-width
- Cards: sem `#` index, mais compactos
- Swipe left → ações rápidas

## Espaço ganho

~200px+ no topo da página recuperados para conteúdo.
