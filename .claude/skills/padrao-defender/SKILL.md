---
name: padrao-defender
description: >
  Design system "Padrao Defender" para o projeto OMBUDS. Minimalismo institucional
  com zinc neutro + emerald como cor de acao. Use ao criar/editar componentes visuais,
  paginas, cards, sidebars, dashboards ou qualquer UI. Triggers: "padrao defender",
  "corrigir estilo", "fix style", "design system", "harmonizar visual", "modo claro/escuro",
  "dark mode", criar pagina, criar componente, layout, cards, stats.
---

# Padrao Defender - Design System

> **Filosofia**: Minimalismo Institucional. Cores neutras por padrao, cor apenas com significado semantico.

## Tokens Fundamentais

### Modo Claro / Escuro (class-based)

`darkMode: ["class"]` em `tailwind.config.ts`. Toggle via classe `dark` no `<html>`.

| Elemento | Claro | Escuro |
|----------|-------|--------|
| Pagina bg | `bg-zinc-100` | `dark:bg-[#0f0f11]` |
| Card bg | `bg-white` | `dark:bg-zinc-900` |
| Card border | `border-zinc-200/80` | `dark:border-zinc-800/80` |
| Card rounded | `rounded-xl` | idem |
| Texto primario | `text-zinc-900` | `dark:text-zinc-100` |
| Texto secundario | `text-zinc-500` | `dark:text-zinc-400` |
| Texto muted | `text-zinc-400` | `dark:text-zinc-500` |
| Label micro | `text-[10px] uppercase tracking-wider text-zinc-400` | `dark:text-zinc-500` |
| Input bg | `bg-zinc-100` | `dark:bg-zinc-800` |
| Divider | `border-zinc-200/50` | `dark:border-zinc-800/50` |

### Icone de Header (invertido)

```tsx
<div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
  <Icon className="w-5 h-5 text-white dark:text-zinc-900" />
</div>
```

### Hover Padrao (emerald)

```tsx
"hover:border-emerald-200/50 dark:hover:border-emerald-800/30"
"hover:shadow-md hover:shadow-zinc-200/50 dark:hover:shadow-black/20"
"transition-all duration-200"
```

### Stats Cards: SEMPRE `gradient="zinc"`

```tsx
<KPICardPremium gradient="zinc" />
// NUNCA gradient="blue/rose/amber"
```

Preferir stats inline/compactos a cards grandes.

## Sidebar (sempre escura, organica)

A sidebar da aplicacao e SEMPRE escura. Sub-sidebars integram-se organicamente:

```
bg-gradient-to-b from-[#1f1f23] via-[#1a1a1e] to-[#1f1f23]
border-r border-zinc-700/30
```

- Hover: `hover:bg-zinc-700/40 hover:text-zinc-200`
- Active: `bg-zinc-800/80 text-zinc-100` + `border-l-2 border-{color}-500`
- Labels: `text-[10px] uppercase tracking-wider text-zinc-500`
- Texto inativo: `text-zinc-400`
- Dividers: `border-zinc-700/30`
- NUNCA `bg-white` em sidebars

## Tipografia

| Nivel | Classes |
|-------|---------|
| H1 | `font-serif text-2xl font-semibold` |
| H2 | `font-sans text-lg font-semibold` |
| Labels | `font-sans text-xs uppercase tracking-wider` |
| Body | `font-sans text-sm` |
| Dados | `font-mono text-sm` (CPF, processo) |

Proibido: magic numbers (`text-[11px]`, `text-[13px]`). Usar `text-xs`, `text-sm`, `text-[10px]`.

## Cores Semanticas

| Cor | Uso |
|-----|-----|
| `emerald` | Acoes, hover, success, IA |
| `rose` | Erros, urgencias, VVD |
| `amber` | Avisos, execucao penal |
| `sky` | Info, substituicao |
| `violet` | Distribuicao |
| `cyan` | Jurisprudencia |
| `zinc` | Padrao neutro |

## Componentes de Referencia

| Componente | Path |
|------------|------|
| KPICardPremium | `src/components/shared/kpi-card-premium.tsx` |
| StatusBadge | `src/components/shared/status-badge.tsx` |
| SwissCard | `src/components/ui/swiss-card.tsx` |
| PageLayout | `src/components/shared/page-layout.tsx` |

## Checklist

```
[ ] Lucide icons (sem emojis)
[ ] cursor-pointer em clicaveis
[ ] Hover 150-300ms transitions
[ ] WCAG AA contraste
[ ] Focus states visiveis
[ ] Responsivo (375/768/1024/1440px)
[ ] Dark mode funcional
[ ] gradient="zinc" em stats
[ ] Hover emerald
[ ] Sidebars escuras integradas
[ ] Sem magic numbers tipografia
```

## Referencia Completa

Tokens detalhados, padroes de cards, sidebar, stats, badges, skeletons: `references/tokens.md`
