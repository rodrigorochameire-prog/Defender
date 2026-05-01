# Sidebar Hover-to-Open Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No modo colapsado da sidebar admin, abrir os popovers de categoria por hover (delay de 120ms pra abrir, 150ms grace pra fechar) em vez de exigir clique. Modo expandido inalterado.

**Architecture:** Mudança concentrada na função `SidebarPopoverMenu` em `src/components/layouts/admin-sidebar.tsx` (linhas 358-474). Adiciona dois timers (`useRef<NodeJS.Timeout>`) controlados por handlers `onMouseEnter`/`onMouseLeave` plugados no `SidebarMenuItem` (envolvendo o ícone) e no `PopoverContent`. `useIsMobile()` desativa hover em touch — clique permanece funcional como toggle. As 8 categorias (Principal, Cadastros, Documentos, Cowork, News, Ferramentas, Mais, Júri/VVD/EP) herdam o novo comportamento sem mudanças próprias.

**Tech Stack:** Next.js 15, React 18, Radix UI Popover, `useIsMobile` hook (`src/hooks/use-mobile.ts`), Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-05-01-sidebar-hover-collapsed-design.md`

---

## File Structure

| Arquivo | Mudança | Responsabilidade |
|---|---|---|
| `src/components/layouts/admin-sidebar.tsx` | Modify (linhas 6-16, 55, 358-474) | Adicionar `useRef` ao import do React; adicionar handlers de hover, timers e `isMobile` no `SidebarPopoverMenu`; plugar handlers no `SidebarMenuItem` e `PopoverContent`; cancelar timers no clique |

Não há criação de novos arquivos. Toda a mudança fica num único componente reutilizado pelas 8 categorias do menu.

---

## Task 1: Adicionar timers de hover e handlers em `SidebarPopoverMenu`

**Files:**
- Modify: `src/components/layouts/admin-sidebar.tsx:55` (adicionar `useRef` ao import do React)
- Modify: `src/components/layouts/admin-sidebar.tsx:378-384` (adicionar refs e handlers dentro de `SidebarPopoverMenu`)

- [ ] **Step 1: Adicionar `useRef` ao import existente do React**

Localizar a linha 55 do arquivo:

```tsx
import { CSSProperties, ReactNode, useEffect, useMemo, useState } from "react";
```

Substituir por:

```tsx
import { CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from "react";
```

Razão: `useIsMobile` já está importado na linha 57; só falta `useRef` pra os timers.

- [ ] **Step 2: Adicionar refs, constantes e handlers dentro de `SidebarPopoverMenu`**

Localizar o início do corpo da função `SidebarPopoverMenu` (linhas 378-384):

```tsx
  const [open, setOpen] = useState(false);
  const theme = SECTION_THEMES[themeKey];
  const hasActiveItem = items.some(item =>
    item.exactMatch ? pathname === item.path : pathname.startsWith(item.path)
  );

  return (
```

Substituir por:

```tsx
  const [open, setOpen] = useState(false);
  const theme = SECTION_THEMES[themeKey];
  const hasActiveItem = items.some(item =>
    item.exactMatch ? pathname === item.path : pathname.startsWith(item.path)
  );

  // Hover-to-open (apenas desktop; mobile/touch usa clique)
  const isMobile = useIsMobile();
  const openTimerRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const HOVER_OPEN_DELAY = 120;
  const HOVER_CLOSE_DELAY = 150;

  const cancelTimers = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleEnter = () => {
    if (isMobile) return;
    cancelTimers();
    if (open) return;
    openTimerRef.current = setTimeout(() => setOpen(true), HOVER_OPEN_DELAY);
  };

  const handleLeave = () => {
    if (isMobile) return;
    cancelTimers();
    closeTimerRef.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY);
  };

  useEffect(() => {
    return () => cancelTimers();
  }, []);

  return (
```

- [ ] **Step 3: Verificar build TypeScript**

Run: `cd ~/projetos/Defender && npx tsc --noEmit 2>&1 | grep "admin-sidebar.tsx"`

Expected: sem erros relacionados a `admin-sidebar.tsx`. Se aparecerem erros do tipo "Cannot find name 'useRef'" ou "Cannot find name 'useIsMobile'", revisar imports.

- [ ] **Step 4: Commit**

```bash
git add src/components/layouts/admin-sidebar.tsx
git commit -m "feat(sidebar): add hover timers and handlers in SidebarPopoverMenu"
```

---

## Task 2: Plugar handlers no `SidebarMenuItem`, `PopoverContent` e clique

**Files:**
- Modify: `src/components/layouts/admin-sidebar.tsx:386-401` (envolver `SidebarMenuItem` com handlers, adicionar `onClick` no botão)
- Modify: `src/components/layouts/admin-sidebar.tsx:401-406` (adicionar handlers no `PopoverContent`)

- [ ] **Step 1: Adicionar `onMouseEnter`/`onMouseLeave` no `SidebarMenuItem` e `onClick` no botão**

Localizar o bloco JSX no return (linhas 386-401):

```tsx
    <SidebarMenuItem>
      <CollapsedTooltip label={label} open={open}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "h-10 w-10 p-0 mx-auto transition-all duration-200 rounded-xl flex items-center justify-center",
                hasActiveItem
                  ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20"
                  : "text-neutral-500 dark:text-neutral-400 hover:bg-white/[0.06] hover:text-neutral-200"
              )}
            >
              <HeaderIcon className="h-5 w-5" />
            </button>
          </PopoverTrigger>
```

Substituir por:

```tsx
    <SidebarMenuItem onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <CollapsedTooltip label={label} open={open}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              onClick={() => {
                cancelTimers();
                setOpen((o) => !o);
              }}
              className={cn(
                "h-10 w-10 p-0 mx-auto transition-all duration-200 rounded-xl flex items-center justify-center",
                hasActiveItem
                  ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20"
                  : "text-neutral-500 dark:text-neutral-400 hover:bg-white/[0.06] hover:text-neutral-200"
              )}
            >
              <HeaderIcon className="h-5 w-5" />
            </button>
          </PopoverTrigger>
```

Razão: `onMouseEnter`/`onMouseLeave` no `SidebarMenuItem` cobrem o "hover sobre o ícone". `onClick` cancela timers de hover em curso e alterna estado imediatamente — assim, se o usuário clica enquanto um timer de abrir/fechar está rodando, o clique vence.

- [ ] **Step 2: Adicionar `onMouseEnter`/`onMouseLeave` no `PopoverContent`**

Localizar (linhas 401-406):

```tsx
          <PopoverContent
            side="right"
            align="start"
            sideOffset={28}
            className="w-56 p-0 glass-dark shadow-2xl shadow-black/40 border-white/[0.08] rounded-xl overflow-hidden"
          >
```

Substituir por:

```tsx
          <PopoverContent
            side="right"
            align="start"
            sideOffset={28}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            className="w-56 p-0 glass-dark shadow-2xl shadow-black/40 border-white/[0.08] rounded-xl overflow-hidden"
          >
```

Razão: o `PopoverContent` é renderizado em portal, então `mouseLeave` do `SidebarMenuItem` dispara assim que o cursor cruza o gap de 28px entre ícone e popover. Adicionar handlers no popover faz com que entrar nele cancele o timer de fechamento (durante a janela de 150ms de grace) e sair dele inicie um novo.

- [ ] **Step 3: Verificar build TypeScript**

Run: `cd ~/projetos/Defender && npx tsc --noEmit 2>&1 | grep "admin-sidebar.tsx"`

Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/layouts/admin-sidebar.tsx
git commit -m "feat(sidebar): wire hover handlers to icon and popover"
```

---

## Task 3: Validação manual no browser

**Files:** nenhum (validação)

Esta tarefa é puramente de teste manual — sem testes automatizados porque (1) timers + DOM hover são frágeis em jsdom, (2) o projeto não tem setup de Testing Library pra esse arquivo, e (3) o spec lista validação manual como caminho oficial. Cada checkbox abaixo deve ser exercitado antes de marcar a tarefa como completa.

- [ ] **Step 1: Verificar que dev server está rodando limpo**

Run:
```bash
cd ~/projetos/Defender
lsof -ti:3000 | xargs kill -9 2>/dev/null
rm -rf .next
npm run dev
```

Aguardar mensagem "Ready in Xms" no terminal. Abrir `http://localhost:3000/admin` no Chrome.

Razão: matar porta + limpar `.next` evita estado caching que mascara mudanças (preferência registrada do usuário pra dev local).

- [ ] **Step 2: Colapsar a sidebar**

No `/admin`, encontrar o trigger de colapsar (`SidebarTrigger`) e clicar pra entrar no modo rail. Confirmar que só os ícones aparecem.

- [ ] **Step 3: Validar abertura por hover (delay de 120ms)**

- [ ] Passar o cursor sobre o ícone "Principal" (Home, primeiro depois do avatar). Após ~120ms, popover abre com Dashboard, Demandas, Agenda, Drive, WhatsApp.
- [ ] Mover cursor pra fora do ícone antes de 120ms (passagem rápida). Popover **não** abre.
- [ ] Repetir hover em "Cadastros", "Documentos", "Cowork", "News", "Ferramentas", "Mais". Cada um abre seu popover correspondente.

- [ ] **Step 4: Validar transição cursor → popover (grace de 150ms)**

- [ ] Hover sobre "Principal" → popover abre → mover cursor pra dentro do popover atravessando o gap. Popover **fica aberto**.
- [ ] Sair do popover. Após ~150ms, popover fecha sozinho.
- [ ] Sair do popover e voltar dentro de 150ms. Popover **continua aberto** (timer cancelado).

- [ ] **Step 5: Validar clique como toggle**

- [ ] Clicar no ícone "Principal" com popover fechado. Abre **imediatamente** (sem esperar 120ms).
- [ ] Clicar no ícone "Principal" com popover aberto. Fecha imediatamente.
- [ ] Clicar em "Demandas" dentro do popover. Navega pra `/admin/demandas` e popover fecha.

- [ ] **Step 6: Validar acessibilidade por teclado**

- [ ] Tab até focar o ícone "Principal". Pressionar Enter ou Space. Popover abre.
- [ ] Tab/Shift+Tab dentro do popover navega entre itens.
- [ ] Esc fecha o popover (Radix default).

- [ ] **Step 7: Validar comportamento mobile**

- [ ] Abrir DevTools → Toggle device toolbar (Cmd+Shift+M) → escolher iPhone 14 Pro (largura < 768px).
- [ ] Recarregar a página.
- [ ] Tocar (clique simulado) no ícone "Principal". Popover abre.
- [ ] Tocar fora. Popover fecha.
- [ ] Verificar que **passar o mouse simulado** sobre outros ícones **não dispara abertura** (em mobile os handlers retornam early via `isMobile`).

- [ ] **Step 8: Validar regressão do modo expandido**

- [ ] Sair do modo mobile, voltar ao desktop, expandir a sidebar.
- [ ] Hover sobre "Principal" no modo expandido **não** abre nada automaticamente — só clicar no chevron expande inline.
- [ ] Confirmar que comportamento expandido segue idêntico ao anterior.

- [ ] **Step 9: Validar que tooltip não conflita**

- [ ] No modo colapsado, hover sobre ícone "Principal". Durante a abertura do popover, a tooltip de label "Principal" **não aparece** (já é suprimida via `open={open}` em `CollapsedTooltip`).

- [ ] **Step 10: Validar cleanup de timers ao trocar de página**

- [ ] No modo colapsado, hover sobre "Principal" pra abrir popover.
- [ ] Antes de fechar, clicar em "Demandas" (navega).
- [ ] Hover sobre "Cadastros". Popover abre normalmente — sem comportamento errático que sugira timer órfão da rota anterior.

- [ ] **Step 11: Commit final + documentar resultado**

Se todas as validações acima passaram:

```bash
git log --oneline -3
```

Confirmar que os 2 commits da implementação estão lá. Sem mais alterações — não há commit nesta tarefa, é puramente verificação.

Se alguma validação falhou, **não commitar**. Voltar à Task correspondente, corrigir, refazer Task 3 inteira.

---

## Self-review

**Spec coverage:**
- Hover open com 120ms delay → Task 1 Step 2 (`HOVER_OPEN_DELAY`)
- Grace close de 150ms → Task 1 Step 2 (`HOVER_CLOSE_DELAY`)
- Cursor pode transitar entre ícone e popover → Task 2 Steps 1-2 (handlers em ambos)
- Clique alterna estado e cancela timers → Task 2 Step 1 (`onClick` chama `cancelTimers()` + `setOpen(o => !o)`)
- Mobile só clique → Task 1 Step 2 (`if (isMobile) return` em `handleEnter`/`handleLeave`)
- Acessibilidade preservada (Radix `PopoverTrigger`) → não requer mudança, validado em Task 3 Step 6
- Cleanup de timer no unmount → Task 1 Step 2 (`useEffect` cleanup)
- Modo expandido inalterado → não há mudança na implementação expandida, validado em Task 3 Step 8
- 8 categorias herdam comportamento → Task 1+2 modificam o `SidebarPopoverMenu` único; categorias chamam-no via `isCollapsed` branch

**Placeholder scan:** revisado, sem TBDs, sem "implement later", todos os blocos de código estão completos.

**Type consistency:** `setOpen(o => !o)` consistente com `useState<boolean>`. `openTimerRef`/`closeTimerRef` tipados como `NodeJS.Timeout | null`. `handleEnter`/`handleLeave` referenciados pelo mesmo nome em todos os lugares.
