---
name: padrao-defender
description: >
  Design system "Padrao Defender v5" para o projeto OMBUDS. Paleta HSL 240 2% barely-cool,
  CollapsiblePageHeader, cards com shadow, dropdowns portal.
  Use ao criar/editar componentes visuais, paginas, cards, sidebars, dashboards ou qualquer UI.
  Triggers: "padrao defender", "corrigir estilo", "fix style", "design system",
  "harmonizar visual", "modo claro/escuro", "dark mode", criar pagina, criar componente,
  layout, cards, stats.
---

# Padrão Defender v5 — Design System

> Refinamento da paleta v4: shift de HSL 0 (neutro puro) para HSL 240 2% (barely cool neutral), com luminâncias harmonizadas. Aprovado em 2026-04-11 após iteração com o usuário.

> **Filosofia**: Cinza barely-cool (HSL 240 2%) como estrutura. Cards brancos com shadow como conteudo. Cor apenas funcional (atribuicao nos cards kanban). Header escuro colapsavel.

## Principios

1. **HSL 240 2% (barely cool)** — sidebar, utility bar, page header usam HSL 240 2% (#3e3e41, #464649, #414144). Praticamente neutro — nao "azulado" (hue 220+ e muito blue), nao "warm bege" (hue 0-40). O leve shift para hue 240 da profundidade sem cor aparente.
2. **Luminancias harmonizadas** — sidebar (l=25) proxima do utility (l=28), com Row 1 (l=26) entre as duas e Row 2 via overlay `bg-white/[0.10]` (l≈30). Cria gradiente de profundidade sidebar→utility→header.
3. **Cards brancos com shadow** — `bg-white shadow-sm shadow-black/[0.04]` sobre fundo `#f5f5f5` (neutral-100). Profundidade via shadow, nao cor.
4. **Cor so quando funcional** — emerald no botao Analisar (juri), amber (VVD), sky (EP). Badge de atribuicao usa cor nos cards kanban com `border: groupColor+40` + `bg: groupColor+14` (border + fill sutil) em vez de fill solido `groupColor+2E`. Switch de atribuicao e monocromatico.
5. **Bordas crisp white/[0.08]** — aresta visivel entre camadas sem escurecer o fill. Usado em utility bar border-b, ring em botoes, separadores.
6. **Shell shadow** — inset highlight `rgba(255,255,255,0.05)` 1px no topo + drop shadow sutil `0 2px 12px -4px rgba(15,23,42,0.10)` para lift do fundo claro.
7. **Row 2 mais clara que Row 1** — Row 1 (container solido #414144) ancora o titulo; Row 2 (overlay `white/[0.10]` sobre Row 1) acolhe filtros/pills com luminancia ligeiramente maior (l≈30 vs l=26).
8. **Header colapsavel** — utility bar + page header card. Colapsa ao scrollar.
9. **Dropdowns via portal** — `createPortal(menu, document.body)` com `fixed z-[9999]`.

## Paleta

| Camada | Cor | HSL | Uso |
|--------|-----|-----|-----|
| Sidebar | `#3e3e41` | 240 2% 25% | Moldura lateral, sempre escura |
| Sidebar dark (dark mode) | `#232324` | 240 2% 14% | Sidebar em dark mode |
| Utility Bar | `#464649` | 240 2% 28% | Barra topo (breadcrumbs, cmd+K) |
| Page Header (Row 1) | `#414144` | 240 2% 26% | Card do titulo da pagina |
| Icone titulo | `#525252` | 0 0% 32% | Container do icone no Row 1 (mantido) |
| Bottom Row | border-t `white/[0.06]` | — | Separacao interna do card (sem bg proprio) |
| Fundo pagina | `#f5f5f5` | 0 0% 96% | neutral-100 — fundo claro harmonizado |
| Cards | `white` + `shadow-sm` | — | Conteudo elevado |
| Collapsed | `#464649` | 240 2% 28% | Barra colapsada ao scrollar |

## CollapsiblePageHeader

```tsx
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";

<CollapsiblePageHeader
  title="Nome da Pagina"
  icon={LucideIcon}       // Mesmo icone da sidebar
  collapsedStats={...}    // Stats inline para modo colapsado
  collapsedPill={...}     // Pill ativa no colapsado
  collapsedSearch={...}   // Busca compacta no colapsado
  bottomRow={...}         // Row 2: pills, busca, filtros
>
  {/* Row 1: titulo + stats + botoes */}
</CollapsiblePageHeader>
```

## Row 1 — Titulo + Acoes

```tsx
<div className="flex items-center justify-between">
  {/* Esquerda */}
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-xl bg-[#525252] flex items-center justify-center">
      <PageIcon className="w-4 h-4 text-white" />
    </div>
    <div>
      <h1 className="text-white text-[15px] font-semibold tracking-tight leading-tight">Titulo</h1>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="text-[10px] text-white/55 tabular-nums">N items</span>
        <span className="text-white/25">·</span>
        <span className="text-[10px] text-red-400 tabular-nums">N urgentes</span>
      </div>
    </div>
  </div>

  {/* Direita — botoes icone-only */}
  <div className="flex items-center gap-1.5">
    <button className="w-8 h-8 rounded-xl bg-white/[0.08] text-white/70 ring-1 ring-white/[0.05] hover:bg-white/[0.14] hover:text-white transition-all duration-150 cursor-pointer flex items-center justify-center" title="Acao">
      <Icon className="w-[15px] h-[15px]" />
    </button>
    {/* Botao primario (branco) */}
    <button className="w-8 h-8 rounded-xl bg-white/90 text-neutral-700 shadow-sm ring-1 ring-white/[0.1] hover:bg-white hover:text-neutral-900 transition-all duration-150 cursor-pointer flex items-center justify-center" title="Nova">
      <Plus className="w-4 h-4" />
    </button>
  </div>
</div>
```

## Row 2 — Pills + Busca + Settings

```tsx
<div className="flex items-center gap-2.5 flex-wrap overflow-x-auto scrollbar-none">
  <AtribuicaoPills variant="dark" singleSelect compact ... />

  <div className="w-px h-5 bg-white/[0.10] shrink-0" />

  <div className="hidden sm:flex relative flex-1 max-w-[220px]">
    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" />
    <input
      placeholder="Buscar..."
      className="w-full bg-black/[0.15] ring-1 ring-white/[0.08] rounded-lg py-1.5 pl-7 pr-3 text-[11px] text-white/90 placeholder:text-white/35 outline-none focus:bg-black/[0.25] focus:ring-white/[0.15] transition-all"
    />
  </div>

  <div className="w-px h-5 bg-white/[0.10] shrink-0" />

  <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.08] transition-all duration-200 cursor-pointer" title="Configuracoes">
    <Settings className="w-[14px] h-[14px] text-white/50" />
  </button>
</div>
```

## Dropdowns — Portal Pattern

```tsx
import { createPortal } from "react-dom";

const btnRef = useRef<HTMLButtonElement>(null);
const [isOpen, setIsOpen] = useState(false);

// No JSX:
{isOpen && createPortal(
  <>
    <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
    <div
      className="fixed z-[9999] w-48 bg-white dark:bg-neutral-900 rounded-xl shadow-xl shadow-black/[0.12] border border-neutral-200/80 dark:border-neutral-800 ring-1 ring-black/[0.04] py-1"
      style={(() => {
        const r = btnRef.current?.getBoundingClientRect();
        return r ? { top: r.bottom + 4, right: window.innerWidth - r.right } : {};
      })()}
    >
      <div className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-400">Secao</div>
      <button className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 text-[13px] cursor-pointer">
        <Icon className="w-3.5 h-3.5 text-neutral-400" />
        <span>Label</span>
      </button>
    </div>
  </>,
  document.body
)}
```

## Cards (conteudo)

```tsx
// Card padrao
<div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm shadow-black/[0.04] hover:shadow-md hover:shadow-black/[0.08] transition-all">

// Card kanban
<div className="bg-white dark:bg-neutral-900 rounded-xl border-[1.5px] shadow-sm shadow-black/[0.04] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
```

## Sidebar

```tsx
// Item expandido
isActive
  ? "bg-white/[0.12] text-white font-semibold"  // + barra emerald 2px
  : "text-white/60 hover:text-white/90 hover:bg-white/[0.08]"

// Icone
isActive ? "text-emerald-400" : "text-white/50"

// Divider
"h-px bg-white/[0.06]"

// Section label
"text-[10px] font-bold text-white/30 uppercase tracking-wider"
```

## FABs (botoes flutuantes)

```tsx
<button className={cn(
  "fixed z-[51] flex items-center justify-center",
  "w-10 h-10 rounded-2xl shadow-md shadow-black/[0.08]",
  "bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm",
  "text-neutral-600 dark:text-neutral-300",
  "ring-1 ring-black/[0.06] dark:ring-white/[0.08]",
  "hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600",
  "transition-all duration-200 active:scale-95 cursor-pointer"
)}>
```

## Tipografia

| Nivel | Classes |
|-------|---------|
| Titulo pagina | `text-white text-[15px] font-semibold tracking-tight` |
| Stats | `text-[10px] text-white/55 tabular-nums` |
| Label secao (header) | `text-white/80 text-[9px] uppercase tracking-wider font-semibold` |
| Label secao (dropdown) | `text-[9px] font-semibold uppercase tracking-wider text-neutral-400` |
| Body | `text-sm text-neutral-600 dark:text-neutral-400` |
| Dados mono | `font-mono text-[11px]` (CPF, processo) |
| Item dropdown | `text-[13px]` |
| Sidebar item | `text-[12px] font-medium` |
| Sidebar label | `text-[10px] font-bold text-white/30 uppercase tracking-wider` |

## Cores Funcionais (UNICA cor no switch)

| Atribuicao | Cor | Onde aparece |
|-----------|-----|-------------|
| Juri | `emerald-600` | Badge nos cards kanban, botao Analisar |
| VVD | `amber-500` | Badge nos cards kanban |
| Execucao Penal | `sky-600` | Badge nos cards kanban |
| Substituicao | `zinc-700` | Badge nos cards kanban |

**Switch de atribuicao e monocromatico** — ativo `bg-white/[0.12] text-white`, inativo `text-white/45`.

## Checklist Pre-Delivery

```
[ ] Lucide icons (sem emojis)
[ ] Icone da pagina consistente com sidebar
[ ] Cores hardcoded substituidas por opacidades relativas
[ ] Dropdowns via createPortal (nao absolute)
[ ] Cards com shadow-sm
[ ] Fundo #f5f5f5 (neutral-100)
[ ] Botoes icone-only com title tooltip
[ ] CollapsiblePageHeader usado
[ ] Row 1 + Row 2 no padrao
[ ] Responsivo (flex-wrap, hidden sm:flex)
[ ] WCAG AA contraste
[ ] cursor-pointer em clicaveis
[ ] Hover transitions 150-200ms
```

## Referencia de Implementacao

| Componente | Path |
|------------|------|
| CollapsiblePageHeader | `src/components/layouts/collapsible-page-header.tsx` |
| HeaderUtilityRow | `src/components/layouts/header-utility-row.tsx` |
| PageHeaderContext | `src/components/layouts/page-header-context.tsx` |
| Design Tokens | `src/lib/config/design-tokens.ts` |
| Demandas (referencia) | `src/components/demandas-premium/demandas-premium-view.tsx` |
| AtribuicaoPills | `src/components/demandas-premium/AtribuicaoPills.tsx` |
| ViewModeDropdown | `src/components/shared/view-mode-dropdown.tsx` |
| FABs | `src/components/shared/floating-agenda.tsx`, `floating-demandas.tsx`, `feedback-fab.tsx` |
| Sidebar | `src/components/layouts/admin-sidebar.tsx` |
| Globals CSS | `src/app/globals.css` |
