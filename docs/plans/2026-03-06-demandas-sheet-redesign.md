# Demandas Sheet Redesign — Professional Polish

**Data**: 2026-03-06
**Status**: Aprovado

## 1. Table Rows (Flat Clean)

- Click na row inteira abre Quick-Preview Sheet
- Double-click em células mantém edição inline
- Espaçamento vertical: py-3
- Dividers: border-zinc-100/50
- Hover: bg-zinc-50/50 + cursor-pointer
- Row selecionada (Sheet aberto): bg-emerald-50/40 ring-1 ring-emerald-200/50
- Remover ícones hover (Eye, Copy, ExternalLink) da célula assistido — movem para Sheet
- Manter: left-border atribuição, status dot+label

## 2. Sheet Hero Header

- Gradiente sutil da cor da atribuição (5-10% opacidade)
- Avatar circular com iniciais (2 letras, bg da cor atribuição)
  - Preparado para foto futura (aceita `avatarUrl` prop)
- Nome: text-xl font-bold
- Chips: Preso (rose), Urgente (orange) como tags
- Links: "Ver assistido ↗" e "Ver processo ↗" inline
- Processo: font-mono + copy button
- Navigation sticky: ↑↓ + "3 de 77" counter + X close

## 3. Progress Bar

- Pipeline: Analisar → Monitorar → Protocolar → Resolver
- Etapa atual: cor do status, bold
- Anteriores: emerald check
- Futuras: zinc-300
- Clicável: muda status

## 4. Card Sections

### 📋 Classificação (bg zinc-50, rounded-xl, p-4)
- Status (dropdown) + Atribuição (dropdown com ícone) — lado a lado
- Ato/Tipo (dropdown) — abaixo, full width

### 📅 Prazo & Providências (bg zinc-50)
- Prazo: date picker + badge urgência
- Providências: textarea editável min-h-[80px]

### 📎 Metadados (colapsável)
- Data importação, estado prisional, batch

## 5. Sticky Actions

- Barra fixa no bottom do Sheet
- [✓ Resolver] [📦 Arquivar] [🗑]
- Separada do scroll, com border-top e bg-white

## Arquivos afetados

- `DemandaQuickPreview.tsx` — redesign completo
- `DemandaCompactView.tsx` — row click, remover hover icons, spacing
- `demandas-premium-view.tsx` — passar index/total para nav counter
