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

## Card Content Pattern (construido em 12/04/2026)

### Card wrapper com hover

```tsx
<Card className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden hover:shadow-md hover:shadow-black/[0.06] hover:border-neutral-300/80 dark:hover:border-neutral-700/60 focus-within:shadow-md focus-within:border-neutral-300/80 dark:focus-within:border-neutral-700/60 transition-all duration-200">
```

### Card header (variacao D + inset separator)

```tsx
{/* Header com barra lateral 4px + inset separator */}
<div className="px-5 py-4 border-l-[4px] border-l-neutral-300 dark:border-l-neutral-600 flex items-center justify-between">
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
      <Icon className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
    </div>
    <div>
      <h3 className="text-[13px] font-semibold text-foreground tracking-tight">Titulo</h3>
      <p className="text-[10px] text-muted-foreground tabular-nums">N total · N detalhe</p>
    </div>
  </div>
  <button className="ghost-btn h-7 text-xs text-muted-foreground hover:text-emerald-600">Ver todas →</button>
</div>
<div className="mx-5 h-px bg-neutral-200/40 dark:bg-neutral-800/40" />
{/* Body */}
```

Regras:
- **border-l-[4px] border-l-neutral-300** para cards genéricos
- **border-l-{cor-funcional}** para cards de área (emerald para Júri, amber para VVD, etc.)
- Separador é **inset** (mx-5), não full-width (border-b)
- Stats no **subtitle inline** ("N total · N vencidos"), não em pill badges
- Sem cores no texto de stats (tudo text-muted-foreground, sem vermelho)

### Mini-card list items (dentro de cards)

```tsx
{/* Container: space-y-1.5 p-3 (gap entre items, padding geral) */}
<div className="space-y-1.5 p-3 max-h-[400px] overflow-y-auto">
  {items.map(item => (
    <Link href={...} className="block">
      <div className="flex items-stretch rounded-lg bg-neutral-50/50 dark:bg-neutral-800/20 border border-transparent hover:border-neutral-200/80 dark:hover:border-neutral-700/60 hover:bg-white dark:hover:bg-neutral-800/40 hover:shadow-sm transition-all duration-150 overflow-hidden cursor-pointer">
        {/* Barra de atribuicao — unica cor funcional */}
        <div className={cn("w-1 flex-shrink-0", atribColor)} />
        {/* Conteudo */}
        <div className="flex items-center gap-3 px-3 py-2.5 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-foreground truncate">Nome</p>
            <p className="text-[11px] text-muted-foreground truncate">Detalhe</p>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground tabular-nums">Info</span>
        </div>
      </div>
    </Link>
  ))}
</div>
```

Regras:
- Cada item é um container autônomo (rounded-lg, bg sutil, hover)
- **NAO usar divide-y** — usar space-y-1.5 entre mini-cards
- Barra lateral colorida (w-1) como **unico elemento cromatico** por item
- **SEM badges de atribuicao** inline — a barra ja comunica
- Countdown/prazo como **texto puro** (nao chip colorido)

### Section dividers (linha centrada)

```tsx
<div className="flex items-center gap-3 px-1">
  <div className="flex-1 h-px bg-neutral-200/60 dark:bg-neutral-800/60" />
  <h2 className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">Label da Secao</h2>
  <div className="flex-1 h-px bg-neutral-200/60 dark:bg-neutral-800/60" />
</div>
```

Regras:
- Mixed-case (nao UPPERCASE)
- Sem barra verde ou colorida (era v4, removida)
- Linhas finas dos dois lados

### Input fields

```tsx
<input className="w-full h-9 text-xs rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-900 text-foreground/80 px-3 focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-400 dark:focus:border-emerald-600 transition-all" />
```

Regras:
- **bg-white** (nao bg-muted — evita inputs "cinza" dentro de cards brancos)
- **rounded-lg** (nao rounded-md)
- Focus ring emerald

### Primary button (CTA)

```tsx
<button className="h-8 px-3 rounded-xl bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition-all duration-150 cursor-pointer flex items-center gap-1.5 text-[11px] font-semibold shrink-0">
  <Plus className="w-3.5 h-3.5" />
  Novo
</button>
```

### Row 2 responsiva (padrao Agenda/Demandas)

```tsx
<div className="flex items-center gap-2.5">
  {/* LEFT GROUP — pills + controles (flex-1 min-w-0 overflow-x-auto) */}
  <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-x-auto scrollbar-none">
    <AtribuicaoPills variant="dark" compact />
    <div className="w-px h-5 bg-white/[0.10] shrink-0" />
    <ViewModeDropdown variant="dark" />
    <button>Settings</button>
  </div>
  {/* RIGHT CLUSTER — busca (shrink-0, oculta em mobile) */}
  <div className="hidden md:flex relative w-[220px] shrink-0">
    <input ... />
  </div>
</div>
```

Regras:
- **NAO usar flex-wrap** — uma row sempre
- **NAO usar ml-auto** em meio a flow (causa wrap esquisito)
- Left group: flex-1, overflow scroll se tight
- Right cluster: shrink-0, hidden em mobile

## Checklist Pre-Delivery (atualizado)

```
[ ] Cards com shadow-sm + hover:shadow-md + focus-within:shadow-md
[ ] Card headers com border-l-[4px] + inset separator (mx-5 h-px)
[ ] Mini-card list items (rounded-lg, bg-neutral-50/50, hover, barra lateral)
[ ] Section dividers: linha centrada (nao barra verde)
[ ] Stats inline no subtitle (nao pill badges)
[ ] Inputs bg-white rounded-lg focus:ring-emerald
[ ] Fundo #f5f5f5 (neutral-100)
[ ] Botoes primarios emerald-500 rounded-xl shrink-0
[ ] Row 2: justify-between, left flex-1 + right shrink-0
[ ] Tipografia: titulo text-[13px] font-semibold, subtitle text-[10px]
[ ] Dropdowns via createPortal
[ ] CollapsiblePageHeader com title + icon
[ ] Responsivo (hidden md:flex, overflow-x-auto)
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
| Dashboard (referencia completa v5) | `src/app/(dashboard)/admin/dashboard/page.tsx` |
| Demandas (referencia kanban+header) | `src/components/demandas-premium/demandas-premium-view.tsx` |
| AtribuicaoPills | `src/components/demandas-premium/AtribuicaoPills.tsx` |
| EquipeCoworkCard | `src/components/dashboard/equipe-cowork-card.tsx` |
| RadarWidget | `src/components/dashboard/radar-widget.tsx` |
| ViewModeDropdown | `src/components/shared/view-mode-dropdown.tsx` |
| Sidebar | `src/components/layouts/admin-sidebar.tsx` |
| Atribuicoes Config | `src/lib/config/atribuicoes.ts` |
| Verificacao TDD | `scripts/verify-padrao-defender.sh` |
| Globals CSS | `src/app/globals.css` |
