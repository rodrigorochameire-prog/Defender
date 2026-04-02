---
name: padrao-defender
description: >
  Design system "Padrao Defender v3" para o projeto OMBUDS. Preto/branco como estrutura,
  glass translucido como linguagem de cards, cor apenas funcional (atribuicao).
  Use ao criar/editar componentes visuais, paginas, cards, sidebars, dashboards ou qualquer UI.
  Triggers: "padrao defender", "corrigir estilo", "fix style", "design system",
  "harmonizar visual", "modo claro/escuro", "dark mode", criar pagina, criar componente,
  layout, cards, stats.
---

# Padrao Defender v3 - Design System

> **Filosofia**: Preto e branco como estrutura. Glass translucido como linguagem. Cor apenas com significado funcional (atribuicao).

## Principios

1. **Preto/branco sao a estrutura** — headers, icones, tabs, bordas. Sem cores decorativas.
2. **Glass e a linguagem de cards** — `bg-zinc-100/60` com `border-zinc-200/80`. Leve, translucido, uniforme.
3. **Cor so quando funcional** — emerald no botao Analisar (juri), amber (VVD), sky (EP). Badge de atribuicao usa cor. Resto e monocromatico.
4. **Header escuro, conteudo claro** — 2 blocos visuais: charcoal gradient no header, card branco para conteudo.

## Header de Pagina (charcoal)

```tsx
// Container — sempre escuro, independente do tema
<div className="mx-4 lg:mx-6 mt-3 px-5 pt-4 pb-3 rounded-xl bg-gradient-to-br from-[#222228] to-[#18181b] shadow-lg shadow-black/10 ring-1 ring-white/[0.04]">

// Textos sobre fundo escuro
Nome:     text-white font-serif text-lg font-semibold
CPF:      text-white/80 font-mono
Labels:   text-white/30 text-[9px] uppercase tracking-wider
Links:    text-white/70 hover:text-white
Separadores verticais: w-[1.5px] h-3.5 bg-white/20
Divider horizontal:    h-[2px] bg-white/20

// Avatar — sempre branco com iniciais pretas
<div className="h-12 w-12 rounded-xl bg-white text-zinc-900 font-bold" />

// Badge de atribuicao — unico elemento colorido
<span className="bg-emerald-600 text-white" />  // Juri
<span className="bg-amber-500 text-white" />    // VVD
<span className="bg-sky-600 text-white" />      // EP

// Botoes
Analisar:   cor da atribuicao (emerald/amber/sky/zinc)
Promptorio: text-white/80 border-white/20 bg-white/10 hover:bg-white/20

// Bottom row — glass integrado
<div className="bg-white/[0.12] rounded-lg px-3.5 py-2.5">
  Case pill: text-white/90 font-bold
  Stats:    text-white/60 (numeros) text-white/30 (labels)
  Drive:    text-white/60 (count) text-white/30 (label)
</div>
```

## Cards Glass (summary, blocos de analise)

```tsx
// Card glass — padrao para TODOS os cards
<div className="bg-zinc-100/60 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.06] rounded-lg p-3.5 hover:bg-zinc-100 dark:hover:bg-white/[0.07] transition-all duration-200">

// Icone container — preto com icone branco
<div className="w-7 h-7 rounded-md bg-zinc-800 dark:bg-zinc-700 flex items-center justify-center">
  <Icon className="w-3 h-3 text-white" />
</div>

// Labels de card
<span className="text-[9px] uppercase tracking-wider font-semibold text-zinc-900 dark:text-zinc-400" />

// Valores
<span className="text-sm font-semibold text-foreground" />

// Texto secundario
<span className="text-xs text-muted-foreground" />
```

## Blocos de Analise (accordion)

```tsx
// Trigger — glass com titulo uppercase
<AccordionTrigger className="bg-zinc-100/60 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.06] rounded-xl px-4 py-3">
  // Icone: bg-zinc-800 text-white (preto, monocromatico)
  // Titulo: text-[13px] font-bold uppercase tracking-wide text-zinc-900
  // Count: text-[9px] bg-zinc-200/80 text-zinc-500 rounded-full

// Conteudo expandido
<AccordionContent className="bg-white dark:bg-zinc-900/80 border border-t-0 border-zinc-200/80 dark:border-white/[0.06] rounded-b-xl px-4">

// Sub-rows
<CollapsibleTrigger className="bg-zinc-100 dark:bg-[#0f0f11] rounded-lg p-2.5 text-xs font-medium">
```

## Tabs (pill style)

```tsx
// Container — cinza claro
<div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">

// Tab ativa — pill preta
<button className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md shadow-sm" />

// Tab inativa
<button className="text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60" />

// Count badges
Ativa: bg-white/20 text-white/70
Inativa: bg-zinc-200/60 text-zinc-400
```

## Sidebar (sempre escura)

```
bg-gradient-to-b from-[#1f1f23] via-[#1a1a1e] to-[#1f1f23]
border-r border-zinc-700/30
```

- Hover: `hover:bg-zinc-700/40 hover:text-zinc-200`
- Active: `bg-zinc-800/80 text-zinc-100`
- Labels: `text-[10px] uppercase tracking-wider text-zinc-500`
- NUNCA `bg-white` em sidebars

## Tipografia

| Nivel | Classes |
|-------|---------|
| H1 (nome) | `font-serif text-lg font-semibold tracking-tight` |
| H2 (secao) | `text-[13px] font-bold uppercase tracking-wide` |
| Labels | `text-[9px] uppercase tracking-wider font-semibold` |
| Body | `text-sm text-zinc-600 dark:text-zinc-400` |
| Dados | `font-mono text-[11px]` (CPF, processo) |
| Links | `text-xs font-medium` |

## Cores Funcionais (UNICA cor permitida)

| Atribuicao | Cor | Uso |
|-----------|-----|-----|
| Juri | `emerald-600` | Badge, botao Analisar |
| VVD | `amber-500` | Badge, botao Analisar |
| Execucao Penal | `sky-600` | Badge, botao Analisar |
| Substituicao | `zinc-700` | Badge, botao Analisar |

**Tudo mais e preto/branco/zinc.** Sem emerald em hover generico, sem cores em icones de bloco, sem tint colorido em cards.

## Container de Conteudo

```tsx
// Envolve summary + tabs + conteudo num card unico
<div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/60 dark:border-zinc-800/40 overflow-hidden">
```

## Status Prisional

- Preso: dot vermelho 12px no canto do avatar (`bg-red-500 border-2 border-[#222228]`)
- Solto: texto `text-white/50` no header
- NAO usar badge textual grande

## WhatsApp Links

```tsx
// Assistido — icone emerald (acao principal)
<svg className="w-3 h-3 text-emerald-400" />

// Contato familiar — icone neutro
<svg className="w-3 h-3 text-white/40" />

// Com rotulo
<span className="text-white/30 text-[9px] uppercase">CPF</span>
<span className="text-white/30 text-[9px] uppercase">Tel</span>
<span className="text-white/30 text-[9px] uppercase">{parentesco}</span>
```

## Checklist

```
[ ] Lucide icons (sem emojis)
[ ] Icones de bloco em bg-zinc-800 text-white (monocromatico)
[ ] Glass em todos os cards (bg-zinc-100/60 border-zinc-200/80)
[ ] Header charcoal gradient (from-[#222228] to-[#18181b])
[ ] Tabs pill style (bg-zinc-100, ativa bg-zinc-900)
[ ] Cor APENAS no badge de atribuicao e botao Analisar
[ ] Avatar branco com iniciais pretas
[ ] cursor-pointer em clicaveis
[ ] Hover 150-300ms transitions
[ ] WCAG AA contraste
[ ] Focus states visiveis
[ ] Responsivo (375/768/1024/1440px)
[ ] Dark mode funcional
[ ] Sem magic numbers tipografia
```

## Referencia de Implementacao

| Componente | Path |
|------------|------|
| Assistido page | `src/app/(dashboard)/admin/assistidos/[id]/page.tsx` |
| Overview panel | `src/app/(dashboard)/admin/assistidos/[id]/_components/overview-panel.tsx` |
| Analise blocks | `src/app/(dashboard)/admin/assistidos/[id]/_components/analise-blocks.tsx` |
| Analise tab | `src/app/(dashboard)/admin/assistidos/[id]/_components/analise-tab.tsx` |
| Analise button | `src/app/(dashboard)/admin/assistidos/[id]/_components/analise-button.tsx` |
| Promptorio modal | `src/app/(dashboard)/admin/assistidos/[id]/_components/promptorio-modal.tsx` |
| Processo header | `src/components/processo/processo-header.tsx` |
| Processo tabs | `src/components/processo/processo-tabs.tsx` |
