# Tokens Detalhados - Padr\u00e3o Defender

## Paleta Completa

### Base (zinc)
```css
--zinc-50:  #fafafa    /* bg sutil */
--zinc-100: #f4f4f5    /* page bg claro, input bg */
--zinc-200: #e4e4e7    /* bordas claras */
--zinc-300: #d4d4d8    /* bordas ativas */
--zinc-400: #a1a1aa    /* texto muted claro */
--zinc-500: #71717a    /* texto secund\u00e1rio */
--zinc-600: #52525b    /* texto secund\u00e1rio escuro */
--zinc-700: #3f3f46    /* bordas dark */
--zinc-800: #27272a    /* card border dark, input bg dark */
--zinc-900: #18181b    /* card bg dark */
--zinc-950: #09090b    /* backgrounds extremos */
--custom:   #0f0f11    /* page bg escuro */
--custom:   #1f1f23    /* sidebar bg */
--custom:   #1a1a1e    /* sidebar via */
--custom:   #252529    /* sidebar header */
```

### Prim\u00e1ria (emerald)
```css
--emerald-50:  #ecfdf5
--emerald-100: #d1fae5   /* icon bg claro */
--emerald-200: #a7f3d0   /* hover border claro */
--emerald-400: #34d399   /* texto dark, badges dark */
--emerald-500: #10b981   /* dots, active borders */
--emerald-600: #059669   /* texto claro, \u00edcones claro */
```

### Sem\u00e2nticas
```css
/* Rose - Urg\u00eancia/VVD */
--rose-100/400/500/600: badges, dots, borders

/* Amber - Aviso/EP */
--amber-100/400/500/600: badges, dots, borders

/* Sky - Info/Substitui\u00e7\u00e3o */
--sky-100/400/500/600: badges, dots, borders

/* Violet - Distribui\u00e7\u00e3o */
--violet-100/400/500/600: badges, dots, borders

/* Cyan - Jurisprud\u00eancia */
--cyan-100/400/500/600: badges, dots, borders

/* Red - Falhas */
--red-100/400/600: error badges, error text
```

## Padr\u00f5es de Card

### Card B\u00e1sico
```tsx
<div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4">
  {children}
</div>
```

### Card Interativo (com hover emerald)
```tsx
<button className={cn(
  "bg-white dark:bg-zinc-900",
  "border border-zinc-200/80 dark:border-zinc-800/80",
  "rounded-xl p-4 cursor-pointer text-left",
  "transition-all duration-200",
  "hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-black/20",
  "hover:border-emerald-200/50 dark:hover:border-emerald-800/30",
  "hover:-translate-y-0.5"
)}>
  {children}
</button>
```

### Card com Cor Sem\u00e2ntica (atribui\u00e7\u00e3o)
```tsx
<button className={cn(
  "bg-white dark:bg-zinc-900",
  "border border-zinc-200/80 dark:border-zinc-800/80",
  "rounded-xl p-4 cursor-pointer text-left",
  "transition-all duration-200",
  "hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-black/20",
  atribuicao.hoverClass  // hover:border-{color}-300 dark:hover:border-{color}-500/30
)}>
  <span className={cn("h-2.5 w-2.5 rounded-full", atribuicao.dotClass)} />
  <Icon className={cn("h-4 w-4", atribuicao.iconClass)} />
</button>
```

## Padr\u00f5es de Sidebar

### Sidebar Integrada (estilo app)
```tsx
// Container
<aside className={cn(
  "flex flex-col border-r border-zinc-700/30",
  "bg-gradient-to-b from-[#1f1f23] via-[#1a1a1e] to-[#1f1f23]",
  "transition-all duration-300"
)}>

// Se\u00e7\u00e3o label
<span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
  Label
</span>

// Item inativo
<button className="text-zinc-400 hover:bg-zinc-700/40 hover:text-zinc-200 transition-all duration-150">

// Item ativo
<button className="bg-zinc-800/80 text-zinc-100 border-l-2 border-emerald-500">

// Divider
<div className="border-t border-zinc-700/30" />

// Footer
<div className="border-t border-zinc-700/30 bg-gradient-to-t from-[#1a1a1e] to-transparent">
```

## Padr\u00f5es de Stats

### Stats Inline (sofisticado)
```tsx
// Prefer\u00edvel a cards grandes. Dados estat\u00edsticos em linha, compactos.
<div className="flex items-center gap-6">
  <div className="flex items-center gap-2">
    <span className="text-sm font-bold tabular-nums text-zinc-800 dark:text-zinc-100">42</span>
    <span className="text-xs text-zinc-400">extra\u00eddos</span>
  </div>
  <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
  <div className="flex items-center gap-2">
    <span className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">3</span>
    <span className="text-xs text-zinc-400">pendentes</span>
  </div>
</div>
```

### Stats com Progresso Visual
```tsx
// Barra de progresso sutil
<div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
</div>
```

## Padr\u00f5es de Skeleton

```tsx
// Card skeleton
<div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 animate-pulse">
  <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
  <div className="h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800 mt-2" />
</div>
```

## Padr\u00f5es de Badge

```tsx
// Enrichment badges
{ label: "Extra\u00eddo", class: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30" }
{ label: "Pendente", class: "bg-zinc-100 dark:bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-500/30" }
{ label: "Falhou", class: "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30" }
```

## Acessibilidade

- Contraste WCAG AA (4.5:1 texto, 3:1 componentes)
- Focus visible: `focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2`
- `prefers-reduced-motion`: desabilitar `animate-pulse`, transi\u00e7\u00f5es
- `aria-label` em bot\u00f5es icon-only
- `role="status"` em badges din\u00e2micos
