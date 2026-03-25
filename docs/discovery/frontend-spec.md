# OMBUDS Frontend/UX Specification & Audit

> **Phase 3 - Brownfield Discovery**
> Generated: 2026-03-24 | Agent: @ux-design-expert (Uma)

---

## 1. UI Component Library

**Primary library: shadcn/ui (Radix primitives + Tailwind CSS)**

The project uses the shadcn/ui pattern -- Radix UI primitives wrapped in Tailwind-styled components under `src/components/ui/`. There is no `components.json` file (shadcn CLI config) present, meaning components were likely added manually or the config was removed.

### UI Primitives Catalog (30 components)

| Component | File | Radix-based? |
|-----------|------|:---:|
| Accordion | `ui/accordion.tsx` | Yes |
| AlertDialog | `ui/alert-dialog.tsx` | Yes |
| Avatar | `ui/avatar.tsx` | Yes |
| Badge | `ui/badge.tsx` | No |
| Button | `ui/button.tsx` | Yes (Slot) |
| Calendar | `ui/calendar.tsx` | No (react-day-picker) |
| Card | `ui/card.tsx` | No |
| Checkbox | `ui/checkbox.tsx` | Yes |
| Collapsible | `ui/collapsible.tsx` | Yes |
| Command | `ui/command.tsx` | No (cmdk) |
| Dialog | `ui/dialog.tsx` | Yes |
| DropdownMenu | `ui/dropdown-menu.tsx` | Yes |
| HoverCard | `ui/hover-card.tsx` | Yes |
| Input | `ui/input.tsx` | No |
| Label | `ui/label.tsx` | Yes |
| Popover | `ui/popover.tsx` | Yes |
| Progress | `ui/progress.tsx` | Yes |
| ProgressToast | `ui/progress-toast.tsx` | Custom |
| RadioGroup | `ui/radio-group.tsx` | Yes |
| ScrollArea | `ui/scroll-area.tsx` | Yes |
| Select | `ui/select.tsx` | Yes |
| Separator | `ui/separator.tsx` | Yes |
| Sheet | `ui/sheet.tsx` | Yes |
| Sidebar | `ui/sidebar.tsx` | Custom |
| Skeleton | `ui/skeleton.tsx` | No |
| Switch | `ui/switch.tsx` | Yes |
| Table | `ui/table.tsx` | No |
| Tabs | `ui/tabs.tsx` | Yes |
| Textarea | `ui/textarea.tsx` | No |
| Tooltip | `ui/tooltip.tsx` | Yes |

### Shared/Application Components (55 files in `src/components/shared/`)

Key reusable application components include:
- **EmptyState / SearchEmpty / ListEmpty** -- standardized empty state variants
- **FilterBar / FilterChips / FilterTabs** -- filtering system
- **DataTable** -- Linear/Attio-inspired table with header/body/row/cell
- **ConfirmDialog** -- confirmation modal with destructive variant
- **PageHeader / PageHeaderPremium / PageHeaderCompact** -- 3 header variants
- **StatsCard / StatsCardCompact / StatsCardEnhanced / StatsCardPremium / KpiCardPremium** -- 5 stats card variants
- **StatusBadge / StatusIndicator** -- status display
- **CommandPalette** -- global Cmd+K search
- **MobileBottomNav** -- iOS-style bottom navigation
- **FloatingAgendaButton** -- floating action button
- **SwissTable / SwissSectionHeader** -- Swiss-design-inspired components
- **Timeline** -- chronological event display
- **AudioRecorder / VoiceMemosButton / TranscriptViewer** -- audio/media
- **PhotoUpload / InlineAutocomplete / MentionTextarea** -- advanced inputs

### Additional libraries used
- **lucide-react** -- Icons (sole icon library, no emoji as icons)
- **recharts** -- Charts and data visualization
- **react-day-picker** -- Calendar widget
- **cmdk** -- Command palette
- **@dnd-kit** -- Drag and drop (Kanban board)
- **sonner** -- Toast notifications
- **motion (framer-motion)** -- Animations
- **react-dropzone** -- File upload
- **react-pdf / pdfjs-dist** -- PDF viewing
- **react-leaflet** -- Maps
- **react-markdown** -- Markdown rendering

---

## 2. Design System / Tokens

**Rating: STRONG -- Well-defined, dual-mode (light/dark) with a "medium" third theme**

### Color Palette

The design system uses HSL CSS custom properties (`globals.css` v10.0):

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `--primary` | `162 63% 35%` (emerald) | `162 70% 50%` | Brand color |
| `--background` | `0 0% 98%` (#FAFAFA) | `240 10% 8%` | Page background |
| `--foreground` | `240 10% 10%` (#1A1A1A) | `240 5% 98%` | Text |
| `--destructive` | `0 72% 51%` | `0 72% 58%` | Error/danger |
| `--warning` | `38 92% 50%` | `38 92% 55%` | Warning |
| `--success` | `162 63% 35%` | `162 70% 50%` | Success |
| `--info` | `210 100% 50%` | `210 100% 55%` | Info |

Semantic colors (success, warning, info, destructive) are defined with foreground pairs. Sidebar-specific tokens exist for all three theme modes.

### Typography

**Three-font system (Inter / Source Serif 4 / JetBrains Mono):**

| Font | Variable | Usage |
|------|----------|-------|
| Inter | `--font-sans` | UI text, body |
| Source Serif 4 | `--font-serif` | Headings, legal display |
| JetBrains Mono | `--font-mono` | Code, process numbers, CPF |

Font aliases: `font-display` and `font-legal` map to serif; `font-data` maps to mono.

Typography scale defined both as CSS variables (`--text-xs` through `--text-4xl`) and via Tailwind base layer styles for h1-h6, p, small.

### Spacing

4px base grid defined as CSS variables: `--spacing-xs` (4px) through `--spacing-3xl` (64px).

### Shadows

Extensive shadow system (14 named shadows in Tailwind config): `card`, `card-hover`, `sidebar`, `float`, `glass`, `glass-dark`, `apple`, `apple-hover`, `apple-dark`, `apple-dark-hover` plus standard sm/md/lg/xl.

### Animations & Transitions

- Transition tokens: `--transition-fast` (150ms), `--transition-base` (300ms), `--transition-slow` (500ms)
- 11 keyframe animations in Tailwind config (accordion, fade, slide, pulse, shimmer, glow, blur-in, number-tick)
- 10 animation utilities in globals.css (fade-in, slide-in-right, slide-in-left, scale-in, expand-row, shimmer loading, pulse-soft, spin-smooth, bounce-soft, message-in)
- WhatsApp-specific animations with `prefers-reduced-motion` override
- Apple-style hover effects (`hover-apple`)
- Glassmorphism utilities (`glass`, `glass-dark`, `glass-card`)

### Border Radius

Token-based: `--radius: 0.5rem` with derived lg/md/sm values.

### Theming

**Three theme modes:**
1. **Light** -- Standard light UI
2. **Medium** -- Light pages with dark sidebar (zinc-800)
3. **Dark** -- Full dark mode

Theme is applied via class on `<html>` element with a blocking `<script>` to prevent flash. Custom `ThemeProvider` context manages state with `localStorage` persistence.

---

## 3. Layout Patterns

### Application Shell

```
RootLayout (lang="pt-BR", fonts, providers)
  -> (dashboard) layout (auth guard, redirect if not logged in)
    -> admin layout (AdminSidebar wrapper)
      -> page content
```

### Sidebar

The `AdminSidebar` component (`src/components/layouts/admin-sidebar.tsx`, **2,026 lines**) is the central navigation component. It implements:

- **Collapsible sidebar** with resizable width (persisted to localStorage)
- **Menu organization** in 8 navigation groups:
  1. **Main** -- Dashboard, Demandas, Agenda, Drive, WhatsApp
  2. **Cadastros** -- Assistidos, Processos, Casos, Solar, Mapa
  3. **Documentos** -- Distribuicao, Oficios, Modelos, Jurisprudencia, Legislacao
  4. **Cowork** -- Delegacoes, Equipe, Mural, Agenda Equipe, Pareceres, Coberturas
  5. **News** -- Noticias, Radar Criminal, Institucional
  6. **Tools** -- Logica, Calculadoras, Inteligencia, Investigacao, Palacio da Mente, Simulador 3D
  7. **Specialty Modules** -- Juri (with sub-sections), VVD, EP
  8. **More** -- Integracoes, Relatorios, Sync, Settings
- **Role-based visibility** via `requiredRoles` per menu item
- **Premium glassmorphism styling** per theme mode
- **Popover menus** for grouped sub-navigation
- **Breadcrumbs** and **StatusBar** in the header area
- **Command palette** (Cmd+K) trigger
- **Notifications popover**
- **Context control** for nucleo/assignment switching

### Mobile Layout

- **MobileBottomNav** -- fixed bottom tab bar (md:hidden) with 5 items (Home, Assistidos, Demandas, Agenda, Drive)
- **Sheet-based mobile sidebar** via shadcn sidebar component
- Mobile font-size bump to 17px base on screens < 640px
- Safe area inset support for iOS (`pb-[env(safe-area-inset-bottom)]`)

### Page Structure

The `PageLayout` component provides a standardized page shell:
- Header with icon, title, description, actions
- Stats bar (optional)
- Filters area (optional)
- Main content
- Configurable max-width (sm through full)
- Compact mode option

---

## 4. Page Inventory

**Total: 134 page.tsx files across 4 route groups**

### Auth Routes (3 pages)
| Route | Page |
|-------|------|
| `/login` | Login form |
| `/register` | Registration form |
| `/forgot-password` | Password recovery |

### Public Routes (2 pages)
| Route | Page |
|-------|------|
| `/reset-password` | Password reset |
| `/~offline` | Offline fallback (PWA) |

### Legal Routes (2 pages)
| Route | Page |
|-------|------|
| `/privacidade` | Privacy policy |
| `/termos` | Terms of service |

### Dashboard/Admin Routes (125+ pages)

**Core Management:**
- Dashboard (main + varas-criminais)
- Demandas (list, detail, create)
- Assistidos (list, detail, edit, create)
- Processos (list, detail, edit, create, sistematizacao)
- Casos (list, detail, create)

**Scheduling & Calendar:**
- Agenda, Calendar, Audiencias

**Documents & Files:**
- Drive, Modelos (list, detail, create, generate), Oficios (list, detail, create, templates), Documentos, Distribuicao, Templates

**Communication:**
- WhatsApp (chat, import, templates, vincular), Notifications, Notification Templates

**Jury System (14 pages):**
- Sessions list, detail, create
- Cockpit (live plenarium)
- Jurados (list, detail, profiler)
- Avaliacao, Registro, Relatorio
- Cosmovisao, Recursos, Execucao
- Inteligencia, Investigacao, Laboratorio, Provas, Teses, Historico, Calculadora

**Violence Against Women (VVD) (5 pages):**
- Dashboard, Medidas, Processos, Intimacoes, Partes

**Legal Research:**
- Jurisprudencia (list, detail, create), Legislacao

**Team/Collaboration:**
- Equipe, Delegacoes, Coberturas, Mural, Pareceres, Agenda Equipe

**Intelligence & Tools:**
- Inteligencia, Diligencias, Logica, Calculadoras, Calculadora Prazos, Palacio da Mente, Simulador 3D, Observatory

**Administration:**
- Settings (general, dados, drive, drive/auto-vincular, enrichment)
- Usuarios (list, convite), Workspaces, Profile, Audit Logs
- Sync, Integracoes, Relatorios (general, desfechos, juizes)

**Other:**
- Busca (search), Kanban, Custodia (main, inspecoes, lotacao), Beneficios, Medidas (main, risco), Prazos, Progressoes, Reu Preso, Radar, Noticias, Institucional, Defensoria, Tribunais, Preview Perfis

---

## 5. User Flows

### Authentication Flow
```
Landing Page -> Login -> [email + password] -> Dashboard
                       -> Forgot Password -> Reset Email -> Reset Password
```
- No OAuth/social login
- No MFA
- Server-side session via Jose JWT cookies
- Auth guard at dashboard layout level (redirect to /login)
- Already-authenticated users redirected from auth pages to /admin

### Case Management Flow
```
Dashboard
  -> Assistidos (clients) -> Create/Edit client -> View detail (processos, documents)
  -> Processos (cases) -> Create/Edit -> Detail view -> Sistematizacao
  -> Casos (grouped cases) -> Create -> Detail (audiencias hub, timeline)
  -> Demandas (tasks) -> Create/Quick edit -> Kanban/List view -> Delegation
```

### Document Handling Flow
```
Drive -> Upload files -> Link to processo/assistido -> View/PDF reader
Modelos -> Create template -> Generate from template
Oficios -> Create oficio from template -> Send/manage
```

### Jury Trial Flow (Specialized)
```
Juri Sessions -> Create session -> Prepare (war room, quesitos, provas)
  -> Cockpit (live plenarium) -> Registro (record) -> Avaliacao (evaluate)
  -> Relatorio (report) -> Cosmovisao (analytics) -> Recursos (appeals)
```

### Notifications Flow
```
Header bell icon -> NotificationsPopover -> View all notifications page
Automated toasts: Plaud arrival, Radar matches, Prazo alerts
```

---

## 6. Forms & Validation

### Form Pattern

**No form library used.** Forms are implemented with native React patterns:
- `useState` for form state management
- `FormData` from native form events
- `onSubmit` handlers with manual state tracking
- `isLoading` state for submit buttons

Example (login form):
```tsx
async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  // manual extraction and API call
}
```

### Validation

- **Zod** is a dependency but is used primarily for tRPC input schemas on the server side
- **No client-side form validation library** (no react-hook-form, no formik)
- Client-side validation is ad-hoc per component (manual checks before submission)
- No visible form-level error display pattern (no FormField, FormMessage components)

### Form UI Components
- `Input` -- standard text input with focus ring
- `Textarea` -- text area
- `Select` -- Radix select
- `Checkbox`, `Switch`, `RadioGroup` -- toggle inputs
- `Calendar` (react-day-picker) -- date selection
- `InlineAutocomplete`, `MentionTextarea` -- advanced inputs
- `CustomSelect` -- standalone custom select component

---

## 7. Loading / Error States

### Loading States

**8 loading.tsx files** exist for key routes:
- `admin/agenda/loading.tsx`
- `admin/assistidos/loading.tsx`
- `admin/casos/loading.tsx`
- `admin/dashboard/loading.tsx`
- `admin/demandas/loading.tsx`
- `admin/drive/loading.tsx`
- `admin/processos/loading.tsx`
- `admin/sync/loading.tsx`

**Skeleton Components** (`src/components/shared/skeletons.tsx`):
- `PageSkeleton` -- generic page loading
- `DashboardSkeleton` -- dashboard-specific skeleton
- `TableSkeleton` -- table loading state
- `AccordionSkeleton`, `WallSkeleton`, `CalendarSkeleton` -- specialized skeletons

**Loading Utilities** (`src/components/shared/loading.tsx`):
- `LoadingSpinner` -- centered spinning circle
- `LoadingPage` -- full-height spinner
- `LoadingCard` -- card with skeleton lines
- `LoadingTable` -- table rows skeleton
- `LoadingStats` -- 4-card grid skeleton

**Global Suspense** -- Root `Providers` wraps children in `<Suspense fallback={<LoadingSpinner />}>`.

### Error States

- **No error.tsx files** in any route -- zero Next.js error boundaries
- **No ErrorBoundary component** anywhere in the codebase
- **Not-found page** exists (`src/app/not-found.tsx`) with premium design
- Error handling relies entirely on toast notifications via sonner

### Empty States

Well-implemented via reusable `EmptyState`, `SearchEmpty`, `ListEmpty` components with variants (default, search, error) and configurable sizes (sm, md, lg).

---

## 8. Responsiveness

### Approach

**Tailwind responsive utilities** used throughout. Mobile-first considerations exist:

- **Mobile bottom navigation** (`MobileBottomNav`) -- fixed bottom bar on `md:hidden`
- **Font size adjustment** -- Base font bumped to 17px on mobile (`@media max-width: 640px`)
- **Small text protection** -- `.text-[10px]` and `.text-[11px]` overridden to 12px/13px on mobile
- **StatsGrid** -- 2 columns on mobile, expanding to 4-6 on desktop
- **CardHeader/CardContent** -- responsive padding (`p-5 sm:p-6`)
- **PageLayout** -- responsive padding (`p-4 sm:p-6 md:p-8`)
- **`useIsMobile` hook** -- detects viewport < 768px via matchMedia
- **Safe area insets** -- iOS notch/home bar support in bottom nav
- **Sidebar** -- collapses on mobile via Sheet component

### Breakpoints (standard Tailwind)
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1400px (container max-width)

---

## 9. Accessibility

### Current State: BELOW STANDARD

**ARIA attributes** -- Only 33 total occurrences across 20 files. Very sparse usage.

**What exists:**
- Focus visible rings on interactive elements (buttons, inputs)
- Semantic HTML in some components (`<nav>`, `<main>`, headings hierarchy)
- `htmlFor` on login form labels
- Radix UI primitives provide built-in a11y (dialogs, menus, tooltips) -- this is the strongest a11y asset
- `prefers-reduced-motion` respected but only for WhatsApp animations (1 file)
- `role="status"` on some loading states (solar batch operations)

**What is missing:**
- No `aria-label` on icon-only buttons across most of the app
- No skip navigation link
- No `aria-live` regions for dynamic content updates (toasts rely on sonner's built-in)
- No explicit keyboard navigation beyond what Radix provides
- No contrast testing evidence
- No screen reader testing
- `<label>` elements use custom styling but not always the shadcn `Label` component
- Mobile bottom nav links have no `aria-current` attribute
- Many interactive elements use `<div onClick>` instead of `<button>`

---

## 10. Internationalization

### Status: NOT IMPLEMENTED

- **No i18n library** installed (no next-intl, react-i18next, or similar)
- **All strings are hardcoded in Brazilian Portuguese (pt-BR)**
- `<html lang="pt-BR">` is correctly set
- Date formatting uses `date-fns` which supports locales, but strings are embedded
- The application is purpose-built for Brazilian public defenders -- i18n may not be a priority
- Estimated 5,000+ hardcoded Portuguese strings across 134 pages and 363 components

---

## 11. Component Quality

### Positive Patterns

1. **Consistent use of shadcn/ui primitives** with `cn()` utility for class merging
2. **CVA (class-variance-authority)** used for Button variants -- good pattern
3. **forwardRef** used correctly on UI primitives
4. **Reusable shared components** -- EmptyState, FilterBar, DataTable, StatsCard, PageHeader
5. **Context providers** well-structured (Theme, Assignment, Profissional, ProcessingQueue, EntitySheet)
6. **Custom hooks** for cross-cutting concerns (useIsMobile, usePermissions, useDebounce, useOfflineSync)
7. **Semantic font aliases** (font-legal, font-data)
8. **Three-theme system** is a unique and thoughtful feature
9. **Role-based UI** via `usePermissions` and `requiredRoles` on menu items
10. **PWA support** (service worker, manifest, offline page)

### Problems

1. **Monolithic admin-sidebar** -- 2,026 lines in a single file
2. **Feature pages too large** -- Multiple pages exceed 1,500 lines (cockpit: 2,695, processos: 2,082, agenda: 2,016, dashboard: 1,989, assistidos: 1,754)
3. **Component size** -- PdfViewerModal (3,671 lines), demandas-premium-view (2,905 lines), DriveDetailPanel (2,163 lines)
4. **Duplicated component patterns** (see Section 12)

---

## 12. Frontend/UX Technical Debts

### DEBT-UX-001: Duplicate / Overlapping Components (SEVERITY: HIGH)

**Stats cards** -- 5 near-identical variants:
- `shared/stats-card.tsx` (223 lines)
- `shared/stats-card-compact.tsx` (99 lines)
- `shared/stats-card-enhanced.tsx` (192 lines)
- `shared/stats-card-premium.tsx` (172 lines)
- `shared/kpi-card-premium.tsx` (212 lines)
- Plus `StatCard` inside `page-layout.tsx`

**Page headers** -- 4 variants across files:
- `shared/page-header.tsx` (PageHeader + PageHeaderPremium) -- 129 lines
- `shared/page-header-compact.tsx` -- 48 lines
- `shared/page-header-premium.tsx` -- 34 lines (thin re-export?)
- `PageHeader` inside `shared/page-layout.tsx` (different implementation)

**EmptyState** -- 2 implementations:
- `shared/empty-state.tsx` (reusable, well-typed)
- `EmptyState` inside `shared/page-layout.tsx` (simpler, CSS-class-based)

**Dashboard panel** -- 2 versions:
- `dashboard/dashboard-por-perfil.tsx`
- `dashboard/dashboard-por-perfil-v2.tsx`

**Recommendation:** Consolidate into a single StatsCard with variant prop, single PageHeader with variant prop, single EmptyState component. Remove v1/v2 dashboard duplicates.

---

### DEBT-UX-002: No Error Boundaries (SEVERITY: HIGH)

Zero `error.tsx` files across all 134 routes. No React ErrorBoundary component. If any page throws during render, the user sees the Next.js default error page or a blank screen.

**Recommendation:** Add `error.tsx` at minimum to:
- `(dashboard)/admin/error.tsx` -- catch-all for admin
- Root `error.tsx` -- catch-all for the entire app
- Consider specialized error boundaries for data-heavy pages (processos, juri cockpit)

---

### DEBT-UX-003: No Form Validation Library (SEVERITY: HIGH)

Forms use raw `useState` + `FormData` with no validation framework despite Zod being available. This means:
- No consistent error display on form fields
- No client-side validation before submission
- Reliance on server-side validation only
- No FormField/FormMessage pattern

**Recommendation:** Adopt react-hook-form + @hookform/resolvers/zod. Reuse existing Zod schemas from tRPC routers for client-side validation.

---

### DEBT-UX-004: Monolithic Components (SEVERITY: HIGH)

Files exceeding 1,000 lines that need decomposition:

| File | Lines | Recommendation |
|------|------:|----------------|
| `layouts/admin-sidebar.tsx` | 2,026 | Split into NavItem, NavGroup, SidebarHeader, SidebarFooter, MobileSheet |
| `drive/PdfViewerModal.tsx` | 3,671 | Extract toolbar, page renderer, annotation layer, thumbnail sidebar |
| `demandas-premium/demandas-premium-view.tsx` | 2,905 | Extract list, kanban, filters, modals into separate files |
| `drive/DriveDetailPanel.tsx` | 2,163 | Extract file info, preview, actions, metadata sections |
| `demandas-premium/DemandaCompactView.tsx` | 1,724 | Extract row component, inline editors |
| `whatsapp/ChatWindow.tsx` | 1,330 | Extract message list, input area, header, context panel |
| `juri/cockpit page.tsx` | 2,695 | Extract timer, voting panel, jury list, notes |
| Dashboard page | 1,989 | Extract sections into separate components |

---

### DEBT-UX-005: Accessibility Gaps (SEVERITY: MEDIUM-HIGH)

- Only 33 ARIA attribute usages across 363 components
- No skip-to-content link
- No `aria-label` on most icon-only buttons
- No `aria-current="page"` on navigation items
- `prefers-reduced-motion` only handled for WhatsApp animations, not globally
- Many `<div onClick>` patterns instead of `<button>` elements
- No documented WCAG compliance level target

**Recommendation:**
1. Add `aria-label` to all icon-only buttons
2. Add skip navigation link
3. Extend `prefers-reduced-motion` to all animations
4. Audit and replace `<div onClick>` with `<button>` or `<a>`
5. Add `aria-current="page"` to active nav items

---

### DEBT-UX-006: Missing Loading States for Most Routes (SEVERITY: MEDIUM)

Only 8 of 125+ admin routes have `loading.tsx` files. Routes without loading states show nothing during data fetching (or the global Suspense spinner).

**Missing loading states for:** Juri (14 pages), VVD (5 pages), Oficios (7 pages), Settings (5 pages), Jurisprudencia (3 pages), WhatsApp (5 pages), and 70+ other routes.

**Recommendation:** Add `loading.tsx` to all route groups using the existing skeleton components. Priority: juri, whatsapp, oficios, jurisprudencia, settings.

---

### DEBT-UX-007: Hardcoded Strings / No i18n (SEVERITY: LOW-MEDIUM)

All UI text is hardcoded in Portuguese. While the app targets Brazilian users exclusively, hardcoded strings:
- Make consistent text changes difficult
- Prevent reuse in other Portuguese-speaking countries
- Make testing more brittle

**Recommendation:** Not urgent given the target audience, but consider extracting at least shared strings (button labels, status names, error messages) into constants files for consistency.

---

### DEBT-UX-008: Toast as Primary Error Feedback (SEVERITY: MEDIUM)

944 toast invocations across 167 files. While sonner toasts are properly configured (richColors, glass styling, top-right position, 3s duration), they are the ONLY user feedback mechanism for errors. No inline form errors, no alert banners for persistent issues, no error recovery UI.

**Recommendation:** Complement toasts with:
- Inline form field errors (via react-hook-form)
- Alert banners for persistent errors (e.g., "Offline mode")
- Retry buttons on failed data loads

---

### DEBT-UX-009: Inconsistent Color References (SEVERITY: LOW-MEDIUM)

Some components use design token colors (`text-primary`, `bg-destructive`), while others use raw Tailwind colors (`text-emerald-600`, `bg-zinc-900`, `text-rose-600`). Examples:
- Login page: `bg-[#0f0f11]`, `bg-emerald-600`, `text-zinc-500`
- StatsCard: `border-emerald-200`, `text-zinc-700`, `bg-zinc-100`
- MobileBottomNav: `bg-[#1f1f23]/95`, `text-emerald-400`

This creates maintenance risk if the brand color changes from emerald.

**Recommendation:** Replace raw emerald/zinc references with design tokens. Add more semantic tokens if needed (e.g., `--nav-background`, `--stat-highlight`).

---

### DEBT-UX-010: No Print Styles (SEVERITY: LOW)

Only 1 file has `@media print` rules (juri relatorio). A legal case management system would benefit from print-optimized views for:
- Case summaries
- Reports
- Oficios
- Document templates

**Recommendation:** Add print stylesheet utility classes. Consider "Print" buttons that render print-optimized layouts.

---

### DEBT-UX-011: Mixed Layout Systems (SEVERITY: LOW-MEDIUM)

Two layout systems coexist:
1. **CSS-class-based** (`page-container`, `page-header`, `stats-row`, `section-card`, etc. in `page-layout.tsx`)
2. **Component-based** (shadcn Card, PageHeader, PageLayout wrapper)

The CSS class approach references classes not defined in `globals.css` (likely in another stylesheet or generated), creating a split mental model.

**Recommendation:** Standardize on the component-based approach. Phase out CSS-class-based layouts.

---

## Summary

### Strengths
1. Well-defined design token system with HSL variables and light/medium/dark themes
2. Proper shadcn/ui component library foundation with Radix primitives
3. Rich set of shared reusable components (empty states, filters, data tables, stats cards)
4. Good mobile considerations (bottom nav, font scaling, safe areas)
5. Premium animation/transition system (Apple-style, glassmorphism)
6. Role-based navigation and permissions
7. PWA support with offline page
8. Sonner toast integration for user feedback
9. Command palette for power users
10. Comprehensive page inventory covering the full legal workflow

### Critical Debts (Prioritized)
1. **No error boundaries** -- app crashes silently
2. **No form validation** -- poor data integrity UX
3. **Monolithic components** -- maintenance nightmare (10+ files over 1,000 lines)
4. **Duplicate component variants** -- 5 stats cards, 4 page headers
5. **Accessibility gaps** -- minimal ARIA, no skip nav
6. **Missing loading states** -- 117 of 125 admin routes lack loading.tsx
7. **Toast-only error handling** -- no inline errors or persistent alerts
8. **Inconsistent color tokens** -- mix of tokens and raw values
