# Padrão Defender v4 — Rollout Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar o Padrão Defender v4 (paleta neutra, page header card, dropdowns portal, cards com shadow) em todas as páginas da aplicação, usando Demandas como referência.

**Architecture:** Cada página com CollapsiblePageHeader já tem a estrutura. O trabalho é padronizar o conteúdo interno (Row 1, Row 2, botões, dropdowns, busca) seguindo o padrão estabelecido em Demandas.

**Tech Stack:** React 19, Next.js 15, Tailwind CSS, Lucide icons.

---

## Padrão de Referência (Demandas)

### Paleta (neutro puro R=G=B)

| Camada | Cor | Token/Classe |
|--------|-----|-------------|
| Sidebar | `#383838` | `.glass-sidebar` |
| Utility Bar | `#3a3a3a` | `HEADER_STYLE.utilityRow` |
| Page Header card | `#424242` | `HEADER_STYLE.container` |
| Bottom Row (dentro do card) | border-t `white/[0.06]` | Sem bg separado |
| Gap utility→header | `#f0f0f0` | Fundo da página |
| Fundo página | `#f0f0f0` | `bg-[#f0f0f0]` |
| Cards | `white` + `shadow-sm` | `bg-white shadow-sm shadow-black/[0.04]` |
| Collapsed bar | `#3e3e3e` | `HEADER_STYLE.collapsedBar` |

### Row 1 — Padrão

```tsx
<div className="flex items-center justify-between">
  {/* Esquerda: ícone + título + stats */}
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-xl bg-[#525252] flex items-center justify-center">
      <PageIcon className="w-4 h-4 text-white" />
    </div>
    <div>
      <h1 className="text-white text-[15px] font-semibold tracking-tight leading-tight">Título</h1>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="text-[10px] text-white/55 tabular-nums">N items</span>
      </div>
    </div>
  </div>

  {/* Direita: botões de ação */}
  <div className="flex items-center gap-1.5">
    <button className="w-8 h-8 rounded-xl bg-white/[0.08] text-white/70 ring-1 ring-white/[0.05] hover:bg-white/[0.14] hover:text-white transition-all duration-150 cursor-pointer flex items-center justify-center" title="Ação">
      <Icon className="w-[15px] h-[15px]" />
    </button>
    {/* Botão primário */}
    <button className="w-8 h-8 rounded-xl bg-white/90 text-neutral-700 shadow-sm ring-1 ring-white/[0.1] hover:bg-white hover:text-neutral-900 transition-all duration-150 cursor-pointer flex items-center justify-center" title="Nova">
      <Plus className="w-4 h-4" />
    </button>
  </div>
</div>
```

### Row 2 — Padrão

```tsx
<div className="flex items-center gap-2.5 flex-wrap overflow-x-auto scrollbar-none">
  {/* Pills/filtros */}
  <AtribuicaoPills variant="dark" ... />
  
  {/* Separador */}
  <div className="w-px h-5 bg-white/[0.10] shrink-0" />
  
  {/* Busca */}
  <div className="hidden sm:flex relative flex-1 max-w-[220px]">
    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" />
    <input className="w-full bg-black/[0.15] ring-1 ring-white/[0.08] rounded-lg py-1.5 pl-7 pr-3 text-[11px] text-white/90 placeholder:text-white/35 outline-none focus:bg-black/[0.25] focus:ring-white/[0.15] transition-all" />
  </div>
  
  {/* Separador */}
  <div className="w-px h-5 bg-white/[0.10] shrink-0" />
  
  {/* Dropdown/Settings */}
  <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.08] transition-all duration-200 cursor-pointer">
    <Settings className="w-[14px] h-[14px] text-white/50" />
  </button>
</div>
```

### Dropdowns — Padrão

```tsx
{isOpen && createPortal(
  <>
    <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
    <div 
      className="fixed z-[9999] w-48 bg-white dark:bg-neutral-900 rounded-xl shadow-xl shadow-black/[0.12] border border-neutral-200/80 dark:border-neutral-800 ring-1 ring-black/[0.04] py-1"
      style={(() => { const r = btnRef.current?.getBoundingClientRect(); return r ? { top: r.bottom + 4, right: window.innerWidth - r.right } : {}; })()}
    >
      <div className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-400">Seção</div>
      <button className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 text-[13px] cursor-pointer">
        <Icon className="w-3.5 h-3.5 text-neutral-400" />
        <span>Label</span>
      </button>
    </div>
  </>,
  document.body
)}
```

### Cards (conteúdo) — Padrão

```css
bg-white dark:bg-neutral-900
shadow-sm shadow-black/[0.04]
hover:shadow-md hover:shadow-black/[0.08]
rounded-xl
border border-neutral-200/60
```

### Textos sobre fundo escuro

| Elemento | Classe |
|----------|--------|
| Título principal | `text-white text-[15px] font-semibold` |
| Stats/contagem | `text-white/55 text-[10px] tabular-nums` |
| Label seção | `text-white/80 text-[9px] uppercase tracking-wider font-semibold` |
| Ícone ativo | `text-white` |
| Ícone inativo | `text-white/50` |
| Separadores | `bg-white/[0.10]` |

---

## Páginas a Padronizar

### Grupo 1 — Páginas com header complexo (Row 1 + Row 2 + dropdowns)

Estas precisam do tratamento completo: Row 1 (ícone+título+stats+botões), Row 2 (pills/filtros/busca), dropdowns via portal.

| # | Página | Arquivo | Ícone correto (sidebar) | Complexidade |
|---|--------|---------|------------------------|-------------|
| 1 | **Agenda** | `src/app/(dashboard)/admin/agenda/page.tsx` | `Calendar` | Alta — período, filtros, view mode |
| 2 | **Processos** | `src/app/(dashboard)/admin/processos/page.tsx` | `FileText` | Alta — stats, filtros, busca |
| 3 | **Dashboard** | `src/app/(dashboard)/admin/dashboard/page.tsx` | `LayoutDashboard` | Média — stats, período |
| 4 | **WhatsApp** | `src/app/(dashboard)/admin/whatsapp/page.tsx` | `MessageCircle` | Média — refresh, abrir chat |

### Grupo 2 — Páginas com header simples (Row 1 + talvez busca)

| # | Página | Arquivo | Ícone correto | Complexidade |
|---|--------|---------|---------------|-------------|
| 5 | **Assistidos [id]** | `src/app/(dashboard)/admin/assistidos/[id]/page.tsx` | `User` | Média — título dinâmico, tabs |
| 6 | **Delegações** | `src/app/(dashboard)/admin/delegacoes/page.tsx` | `UserCheck` | Baixa |
| 7 | **Modelos** | `src/app/(dashboard)/admin/modelos/page.tsx` | `FileText` | Média — busca, categorias |
| 8 | **Prazos** | `src/app/(dashboard)/admin/prazos/page.tsx` | `Clock` | Média — filtro atribuição |
| 9 | **Instância Superior** | `src/app/(dashboard)/admin/instancia-superior/page.tsx` | `Landmark` | Média — stats grid |

### Grupo 3 — Páginas com header mínimo

| # | Página | Arquivo | Ícone | Complexidade |
|---|--------|---------|-------|-------------|
| 10 | **Calendar** | `src/app/(dashboard)/admin/calendar/page.tsx` | `Calendar` | Baixa |
| 11 | **Custódia** | `src/app/(dashboard)/admin/custodia/page.tsx` | `AlertTriangle` | Baixa |
| 12 | **Pareceres** | `src/app/(dashboard)/admin/pareceres/page.tsx` | `FileCheck` | Baixa |
| 13 | **Júri** | `src/app/(dashboard)/admin/juri/page.tsx` | `Scale` | Média — tabs |

### Grupo 4 — Páginas sem CollapsiblePageHeader (usam fallback)

Estas páginas NÃO têm header charcoal próprio. Precisam:
- Avaliar se devem ganhar `CollapsiblePageHeader` (páginas principais)
- Ou continuar com fallback `HeaderUtilityRow standalone` (páginas de config/settings)

Principais candidatas a receber header:
- `/admin/assistidos` (lista)
- `/admin/settings`
- `/admin/sync`
- `/admin/relatorios`

---

## Tasks

### Task 1: Atualizar design tokens e criar guia de referência

**Files:**
- Modify: `src/lib/config/design-tokens.ts`
- Modify: `.claude/skills/padrao-defender/SKILL.md`

- [ ] Atualizar o skill `padrao-defender` com a paleta v4 completa
- [ ] Documentar todos os padrões (Row 1, Row 2, dropdowns, cards, textos)
- [ ] Commit

### Task 2: Padronizar Agenda (Grupo 1)

**Files:**
- Modify: `src/app/(dashboard)/admin/agenda/page.tsx`

- [ ] Row 1: ícone Calendar w-9 bg-[#525252], título text-[15px], stats text-white/55
- [ ] Row 1: botões w-8 rounded-xl bg-white/[0.08] ring-1
- [ ] Row 2: separadores bg-white/[0.10] h-5, busca bg-black/[0.15] rounded-lg
- [ ] Row 2: filtros/settings concentrados num único dropdown ⚙ via createPortal
- [ ] Verificar ícone consistente com sidebar
- [ ] Commit

### Task 3: Padronizar Processos (Grupo 1)

**Files:**
- Modify: `src/app/(dashboard)/admin/processos/page.tsx`

- [ ] Mesmo padrão Row 1 + Row 2
- [ ] Stats ribbon no padrão (text-white/55, sem badges pesados)
- [ ] Dropdowns via createPortal
- [ ] Commit

### Task 4: Padronizar Dashboard (Grupo 1)

**Files:**
- Modify: `src/app/(dashboard)/admin/dashboard/page.tsx`

- [ ] Row 1 com ícone LayoutDashboard, stats, período
- [ ] Cards do dashboard: shadow-sm, rounded-xl, border-neutral-200/60
- [ ] Commit

### Task 5: Padronizar WhatsApp (Grupo 1)

**Files:**
- Modify: `src/app/(dashboard)/admin/whatsapp/page.tsx`

- [ ] Row 1: ícone MessageCircle, botões refresh/abrir
- [ ] Commit

### Task 6: Padronizar Grupo 2 (5 páginas)

**Files:**
- Modify: `assistidos/[id]/page.tsx`, `delegacoes/page.tsx`, `modelos/page.tsx`, `prazos/page.tsx`, `instancia-superior/page.tsx`

- [ ] Para cada: Row 1 no padrão (ícone, título, stats, botões)
- [ ] Row 2 se existir: busca/filtros no padrão
- [ ] Dropdowns via createPortal se existirem
- [ ] Commit por batch de 2-3 páginas

### Task 7: Padronizar Grupo 3 (4 páginas)

**Files:**
- Modify: `calendar/page.tsx`, `custodia/page.tsx`, `pareceres/page.tsx`, `juri/page.tsx`

- [ ] Row 1 mínimo no padrão
- [ ] Commit

### Task 8: Padronizar cards e tabelas globais

**Files:**
- Modify: componentes de card/tabela usados em múltiplas páginas

- [ ] Auditar todos os componentes de card (DemandaCard, etc.)
- [ ] Aplicar shadow-sm, rounded-xl, border-neutral-200/60
- [ ] Tabelas: header com bg-neutral-50, borders sutis
- [ ] Commit

### Task 9: Padronizar Assistidos lista e outras páginas Grupo 4

**Files:**
- Avaliar e adicionar CollapsiblePageHeader onde faz sentido

- [ ] `/admin/assistidos` — adicionar header se não tem
- [ ] Páginas de config/settings — manter fallback
- [ ] Commit

### Task 10: Fundo global e variáveis CSS

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`

- [ ] Garantir `#f0f0f0` como fundo padrão em todas as rotas
- [ ] Verificar dark mode consistency
- [ ] Verificar sidebar variables CSS (--sidebar-*)
- [ ] Commit

### Task 11: Mobile polish

- [ ] Testar todas as páginas em 375px, 768px
- [ ] Bottom row: flex-wrap + scrollbar-none funciona
- [ ] FABs posicionados corretamente com mobile nav
- [ ] Collapsed header proporcional
- [ ] Commit

### Task 12: Review final e cleanup

- [ ] Buscar hardcoded colors remanescentes (`bg-[#4a4a`, `bg-[#52`, etc.)
- [ ] Substituir por tokens ou opacidades relativas
- [ ] Remover código morto (states não usados, imports não usados)
- [ ] Build final
- [ ] Commit
