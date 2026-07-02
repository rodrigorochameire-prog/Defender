# OMBUDS — Auditoria Mobile (estado-da-arte) + Roadmap priorizado

**Data:** 2026-07-01
**Método:** 3 frentes de pesquisa SOTA (fontes 2024–2026) + 4 auditorias de superfície lendo o código de produção (worktree em `main` + declutter). Agentes em paralelo, síntese aqui.
**Escopo:** padrões transversais (valem para todas as ~86 seções) + deep-dives em Agenda/Audiências, Demandas/Triagem, Assistidos/Casos/Processos, Drive/Documentos/Dashboard.
**Já entregue nesta sessão (base):** Fase 0 (bottom nav 4 tabs + primitivos `ResponsiveDialog`/`ResponsiveTable`/`MobilePageShell`/`MobileActionBar`/`FilterSheet`), refino v2 (sidebar desktop legível, drawer ☰ restaurado no mobile, header `☰·título·🔔·⋯`), declutter da Agenda.

---

## 1. Referência estado-da-arte (2025–2026) — princípios + checklist

### Navegação & interação
- **Bottom nav de 3–5 destinos, persistente, na thumb-zone.** Não usar hamburger para destinos primários (NN/g: nav escondida ~15% mais lenta no mobile). *(Apple HIG Tab Bars; Material 3 Navigation bar; NN/g)*
- **Não empilhar padrões de nav** (nav bar + drawer juntos): o ideal é *trocar* responsivamente (bottom nav → rail → drawer). *(Material 3)* — **nota:** o OMBUDS mantém bottom nav **+** drawer ☰ juntos por decisão do usuário (86 seções); desvio consciente.
- **Bottom sheets > diálogos centrados** no mobile; detents medium/large; **sempre** um botão de fechar visível + suporte a Back (não só arrastar). *(NN/g Bottom sheet; Material 3; Apple HIG Modality)*
- **Busca no mobile = barra/ícone que abre uma view de busca full-screen.** Command palette (Cmd+K) é padrão **desktop** — nenhuma diretriz mobile o endossa. *(Material 3 Search; Apple HIG)* — **nota:** hoje a busca mobile do OMBUDS abre o command palette via ⋯; funciona, mas o padrão-ouro é uma busca full-screen dedicada.
- **2–4 ações visíveis; overflow só para 3+ secundárias.** Não enterrar ações frequentes no kebab. *(Material 3 App bars; NN/g)*
- **Gestos são enhancement com fallback visível.** Swipe-left = semântica destrutiva/apagar; `overscroll-behavior: contain` em scrollers horizontais/pull-to-refresh custom. *(NN/g Contextual swipe; Chrome overscroll-behavior)*

### Tipografia, toque, a11y, motion
- **Inputs ≥16px** (senão iOS dá zoom-on-focus). Corpo ≥16px, line-height 1.4–1.6. *(CSS-Tricks; NN/g)*
- **Alvos de toque 44×44pt (Apple) / 48dp (Material); piso legal WCAG 2.5.8 = 24px** + espaçamento ≥8px. Tratar **44px** como alvo real. *(Apple HIG; Material 3; W3C WCAG 2.2)*
- **Truncar metadado de baixo valor (IDs/datas/status) com expandir; deixar quebrar o texto que decide** (nome do caso, ato). *(density best practice)*
- **Contraste AA 4.5:1; foco visível (WCAG 2.4.11); ARIA em controles custom.** *(W3C)*
- **Micro-transições 150–300ms; `prefers-reduced-motion`.** *(Material 3; web.dev)* — **OK no OMBUDS:** já tratado global em `globals.css`.
- **`viewport-fit=cover` + `env(safe-area-inset-*)`** em toda chrome fixed/sticky (bottom nav, FAB, footers). *(web-standards.dev)*

### Dados densos, performance, PWA
- **Tabelas → cards <600px**; scroll horizontal só quando a relação entre colunas importa, com coluna-âncora `sticky`. *(Material 3; mobile-table UX 2025)*
- **Listas longas: virtualização** (>~1k linhas), sticky section headers, momentum scroll. *(Material 3 Lists)*
- **Skeletons só >500ms e no tamanho exato do conteúdo** (senão causam o CLS que deveriam evitar); optimistic UI em ações CRUD (mover card, mudar status). *(NN/g; web.dev)*
- **Kanban no telefone = uma coluna por vez (swipe/tabs)**, não board espremido. **PDF = scroll vertical contínuo + pinch-zoom**, sem painéis desktop. *(Any.do; Apple HIG)*
- **Core Web Vitals p75 mobile: LCP <2.5s, INP <200ms, CLS <0.1.** Reservar dimensões de mídia (`aspect-ratio`). *(web.dev / Google)*
- **PWA: manifest completo, SW/HTTPS, cache-first estático + SWR para API.** *(MDN; web.dev)*

---

## 2. Padrões transversais — o que se repete em TODAS as superfícies

Estes são os de **maior alcance** (tocam a maioria das páginas) — por isso encabeçam o roadmap.

| # | Problema sistêmico | Evidência (recorrente) | Princípio SOTA |
|---|---|---|---|
| T1 | **Alvos de toque sub-44px** (`h-6`/`h-7`/`h-8` = 24–32px) em quase todo botão de ícone, header, footer, ações de card | Agenda, Demandas, Assistidos, Processos, Drive, PDF | 44pt/48dp |
| T2 | **Texto significativo a 9–11px** (`text-[9px]/[10px]/[11px]`) para dados reais (datas, base legal, status, CPF, contadores) | Agenda (event-detail-sheet), Demandas (compact), Assistidos (card + [id]) | corpo ≥14–16px |
| T3 | **Inputs de busca <16px** (`text-[11px]`/`text-xs`) → zoom-on-focus no iOS | Demandas `:2858`, Agenda campos, Assistidos | inputs ≥16px |
| T4 | **Ações só-no-hover** (`opacity-0 group-hover:opacity-100`) invisíveis ao toque, sem fallback | Agenda (evento-card), Drive (file list/grid), Assistidos | affordance + touch |
| T5 | **Filtros crammed inline / popover `w-60` bespoke** em vez de `ResponsiveDialog`/Sheet (que já existe!) | Demandas `:2919` (e `FilterSectionsCompact` importado mas **nunca renderizado**), Processos, Agenda | filtros em sheet |
| T6 | **Diálogos largos ainda como `Dialog` centrado** (não bottom sheet) no mobile | Agenda (detail/create/import modals), Drive | sheets > dialogs |
| T7 | **`100vh` (não `100dvh`/`svh`)** → clipping sob a chrome do browser mobile | Drive `page.tsx:19` | viewport dinâmico |
| T8 | **Safe-area ausente** em FABs/footers sticky (nav já usa; o resto não) | Demandas FAB, Agenda footer, PDF | `env(safe-area-inset-*)` |

**Já bons (transversais):** `prefers-reduced-motion` global; `ResponsiveDialog` (bottom sheet no mobile) quando usado; skeletons/empty/error states presentes; grids KPI colapsam bem (`grid-cols-2`); Recharts `ResponsiveContainer`.

---

## 3. Deep-dives por superfície (achados concretos)

### Agenda / Audiências
- **[BUG] Buscar/Filtros do menu "…" não fazem nada no mobile** — o JSX que eles controlam é `hidden md:flex` (`agenda/page.tsx:1635`). Busca e filtro **indisponíveis** no telefone. *(alta prioridade — é funcional, não cosmético)*
- **Mês/Semana não caem para lista-agenda** — grids `grid-cols-7`/`grid-cols-8` sem fallback; colunas ~44px, nomes de evento escondidos (`hidden sm:inline`) → perda silenciosa de info; popover de evento `w-[320px]` renderiza fora da tela.
- **Diálogos são `Dialog` desktop** (detalhe/criar/import), header com até 6 botões `h-8` em `flex-wrap`.
- Ações só-hover (evento-card), texto 9–10px, alvos sub-44px, sem safe-area no footer sticky.
- **Bom:** `EventDetailSheet` full-screen no mobile; `audiencias/page.tsx` com `overflow-x-auto` + label curto/longo; pills `overflow-x-auto`.

### Demandas / Triagem
- **A landing mobile É uma tabela espremida:** `viewMode` default = `"compact"`; cada linha crama 4–5 widgets editáveis a 9–10px num strip ~24px (`DemandaCompactView.tsx:1539`).
- **Hit-zone de 12px** para editar cor de atribuição (`e.clientX - rect.left < 12`) — impossível no toque.
- Bulk toolbar: 3 `select` + 4 botões `h-7` sem wrap → overflow a 375px.
- Filtros num popover `w-60` (não sheet); `FilterSectionsCompact` importado e **nunca usado**.
- **Bom:** Kanban tem layout mobile real (tabs de coluna + `MobileCardList`); `DemandaCard` tem layout mobile bem feito (nome 16px, 2-col); FAB 48px; states ok.

### Assistidos / Casos / Processos
- **[alto] Busca de assistido some no mobile** (`hidden sm:block`, `page.tsx:977`) — sem entrada alternativa; não dá para buscar por nome/CPF na UI visível.
- **[alto] Processos:** sem `effectiveViewMode`; toggle "list" renderiza `DataTable` com colunas `min-w-[200px]…` → tabela com scroll horizontal a 375px.
- Alvos sub-44px em ações de card; tab bar do `[id]` (9 tabs) a 32px sem hint de scroll; texto 9–11px em CPF/RG/telefone.
- **Bom:** `effectiveViewMode` força cards no mobile (assistidos); master-detail cai para `Sheet` full-width; skeletons/empty; KPIs colapsam.

### Drive / Documentos / Dashboard
- **[alto] PDF viewer é a pior superfície:** painel de índice `w-72` ligado por default (deixa ~85px para a página a 375px); toolbar de ~20 ícones `h-8` sem wrap/overflow; **sem pinch-zoom** (só botões).
- **[alto] Drive list:** colunas fixas (`w-20`/`w-24`…) truncam todo nome de arquivo; ações só-hover.
- **[alto] Dashboard `RelatorioDetailTable`:** `grid-cols-[1fr_repeat(6,48px)_56px]` sem fallback → overflow/coluna-nome ~zero.
- `100vh` (não `dvh`) no Drive; `modelos` header sem wrap.
- **Bom:** `DriveSidebar` já faz rail-desktop + `Sheet`-mobile (padrão correto!); `DriveDetailPanel` sheet full-width; grid de arquivos 2-up; charts do dashboard com `ResponsiveContainer`.

---

## 4. Roadmap priorizado (impacto × esforço × alcance)

Legenda: **Impacto** (valor pro defensor no celular) · **Esforço** (dev) · **Alcance** (nº de telas afetadas). Ordenado por valor/esforço.

### 🟢 Quick wins (alto valor, baixo esforço)
| ID | Ação | Alcance | Notas |
|---|---|---|---|
| Q1 | **Corrigir Buscar/Filtros da Agenda** (menu "…" não funciona no mobile) — abrir num `ResponsiveDialog`/Sheet | Agenda | é **bug funcional** |
| Q2 | **Busca mobile em Assistidos** (some hoje) — ícone → campo full-width/sheet | Assistidos | perda de função |
| Q3 | **Inputs de busca → 16px** no mobile (`text-base md:text-xs`) — mata o zoom-on-focus iOS | transversal (T3) | 1 linha por input |
| Q4 | **Processos: `effectiveViewMode` = cards no mobile** (como Assistidos/Demandas) | Processos | reusa padrão |
| Q5 | **`100vh` → `100dvh`** no shell do Drive (e varrer outros) | Drive+ | clipping |
| Q6 | **Safe-area no FAB de Demandas** e footers sticky | Demandas, Agenda | `pb-[env(...)]` |

### 🟡 Médios (alto valor, esforço médio)
| ID | Ação | Alcance | Notas |
|---|---|---|---|
| M1 | **Sweep de alvos de toque ≥44px** (`h-7`/`h-8` → `h-11` no mobile) — via utilitário/classe compartilhada `min-touch` + varredura | transversal (T1) | maior alcance |
| M2 | **Ações só-hover → visíveis/tap no mobile** (remover `opacity-0 group-hover`; usar `md:opacity-0 md:group-hover`) | Agenda, Drive, Assistidos (T4) | discoverability |
| M3 | **Filtros → `ResponsiveDialog`/Sheet** (Demandas usa o `FilterSectionsCompact` já importado; Processos; Agenda) | 3 telas (T5) | remove dead code |
| M4 | **Demandas: landing mobile = `DemandaCard` list** (não o compact espremido) | Demandas | reusa card pronto |
| M5 | **Tabelas densas → cards** (Processos list, Dashboard `RelatorioDetailTable`, Drive list) via `ResponsiveTable`/DataCards | Processos, Dashboard, Drive (T2) | primitivo existe |
| M6 | **Pilha do texto pequeno → escala mobile** (9–11px → ≥12–14px para conteúdo) | transversal (T2) | legibilidade |

### 🔴 Maiores (alto valor, esforço alto)
| ID | Ação | Alcance | Notas |
|---|---|---|---|
| L1 | **PDF viewer mobile** — índice em drawer, toolbar em overflow/2 linhas, pinch-zoom, fit-width | Drive/PDF | pior superfície |
| L2 | **Agenda mês/semana → lista-agenda no mobile** (reusar `day-events-sheet`) + diálogos → bottom sheets + header two-row estrito (o item já parqueado) | Agenda | maior tela mobile |
| L3 | **Busca mobile full-screen dedicada** (em vez do command palette via ⋯) — alinha com SOTA | transversal | padrão-ouro |

### 🔵 Fundacionais (habilitam os sweeps)
| ID | Ação | Notas |
|---|---|---|
| F1 | **Primitivos/utilitários mobile**: classe `min-touch` (44px), default `text-base` em inputs, `TapZone`/`SwipeRow`, e um **lint/checklist** que pegue `h-6/h-7` em botões e `text-[≤11px]` em conteúdo | multiplica velocidade dos sweeps M1/M2/M6 |
| F2 | **Adotar os 4 primitivos órfãos da Fase 0** (`ResponsiveTable`, `MobilePageShell`, `MobileActionBar`, `FilterSheet`) nos sweeps acima | fecham o débito da Fase 0 |

---

## 5. Recomendação de sequência
1. **Sprint 1 (quick wins Q1–Q6):** correções funcionais + iOS-zoom + cards em Processos. Baixo risco, alta percepção.
2. **Sprint 2 (F1 + M1 + M2):** fundação (utilitário de toque + lint) e os dois sweeps transversais de maior alcance (toque + hover→touch).
3. **Sprint 3 (M3–M6):** filtros em sheet, Demandas card-landing, tabelas→cards, escala tipográfica.
4. **Sprint 4 (L1–L3):** PDF viewer, Agenda mês/semana + two-row, busca full-screen.

Cada item vira seu próprio ciclo design → build → verify (com verificação on-device, que ficou pendente nas entregas recentes).

---

## Fontes
web.dev (Web Vitals, CLS, Service Workers) · Google Search Central (Core Web Vitals) · MDN (PWAs installable) · Apple HIG (Tab Bars, Sheets, Modality, Accessibility, Layout) · Material 3 (Navigation bar, Bottom sheets, Lists, App bars, Search, motion tokens, structure) · NN/g (hamburger menus, mobile navigation, bottom sheet, contextual swipe, mobile input checklist, EAS framework, skeleton screens, touch target size) · W3C WCAG 2.2 (2.5.5/2.5.8 target size, 2.4.11 focus appearance, contrast) · CSS-Tricks (16px iOS zoom, notch/safe-area) · web-standards.dev (safe-area-inset).
