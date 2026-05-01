# Sidebar — Abertura por Hover no Modo Colapsado

**Data:** 2026-05-01
**Autor:** Rodrigo Rocha Meireles
**Componente afetado:** `src/components/layouts/admin-sidebar.tsx` — função `SidebarPopoverMenu` (linhas 358-474)

## Contexto

A sidebar admin tem dois modos: **expandido** (mostra labels e lista inline com chevron) e **colapsado** (rail estreito só com ícones, como na captura de 2026-05-01 13:52). No modo colapsado, cada categoria (Principal, Cadastros, Documentos, Cowork, News, Ferramentas, Mais, Júri/VVD/EP) abre um popover com seus subitens **mediante clique** no ícone.

Cada navegação custa hoje **2 cliques**: um pra abrir o popover, outro pra ir no item. Com 8 categorias usadas dezenas de vezes por dia, isso vira fricção visível.

## Objetivo

No modo colapsado, abrir o popover ao **passar o cursor** sobre o ícone, eliminando o primeiro clique. Modo expandido permanece inalterado.

## Decisões de design

### Escopo

- **Apenas modo colapsado.** Modo expandido continua com chevron-clique. Razão: no expandido a seção expande inline empurrando o conteúdo abaixo — hover automático causaria layout shifts conforme o cursor desce a sidebar, com cascata de aberturas/fechamentos. Popover flutuante (modo colapsado) não tem esse problema.
- Mudança concentrada em `SidebarPopoverMenu`. As 8 categorias herdam o novo comportamento sem alterações próprias.

### Comportamento de hover

| Evento | Resultado |
|---|---|
| Cursor entra no ícone | Inicia timer de 120ms; ao expirar, abre popover |
| Cursor sai do ícone antes dos 120ms | Cancela timer (não abre) |
| Cursor sai do ícone OU do popover | Inicia timer de 150ms; ao expirar, fecha |
| Cursor volta pro ícone OU popover dentro dos 150ms | Cancela timer (não fecha) |
| Clique no ícone | Cancela timers + alterna estado imediatamente |
| Clique em item dentro do popover | Navega + fecha |
| Clique fora | Fecha (Radix `onOpenChange`) |

**Constantes:** `HOVER_OPEN_DELAY = 120ms`, `HOVER_CLOSE_DELAY = 150ms`. Padrão Linear/Notion/macOS — abre rápido sem ser nervoso, fecha com grace suficiente pra cobrir o trânsito do cursor entre ícone e popover (28px de `sideOffset`).

### Mobile / touch

`useIsMobile()` (já disponível no projeto, hook reativo) checado dentro dos handlers `handleEnter`/`handleLeave`. Em mobile, ambos retornam imediatamente sem ativar timers — o tap continua sendo a única forma de abrir, comportamento atual preservado.

### Acessibilidade

- Foco por teclado (Tab) + Enter/Space continua abrindo via Radix `PopoverTrigger` — não é tocado.
- `aria-*` do Radix Popover preservado.
- Tooltip do label colapsado (`CollapsedTooltip`) já é suprimida quando `open=true` — sem conflito com hover.

## Arquitetura técnica

### Estado adicional em `SidebarPopoverMenu`

```ts
const isMobile = useIsMobile();
const openTimerRef = useRef<NodeJS.Timeout | null>(null);
const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

const HOVER_OPEN_DELAY = 120;
const HOVER_CLOSE_DELAY = 150;

const cancelTimers = () => {
  if (openTimerRef.current) clearTimeout(openTimerRef.current);
  if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  openTimerRef.current = null;
  closeTimerRef.current = null;
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

useEffect(() => () => cancelTimers(), []); // cleanup on unmount
```

### Onde plugar os handlers

```tsx
<SidebarMenuItem onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
  <CollapsedTooltip label={label} open={open}>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={() => { cancelTimers(); setOpen(o => !o); }}
          className={...}
        >
          <HeaderIcon className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={28}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className="..."
      >
        {/* conteúdo igual ao atual */}
      </PopoverContent>
    </Popover>
  </CollapsedTooltip>
</SidebarMenuItem>
```

**Sutilezas:**

- `onMouseEnter`/`onMouseLeave` no `SidebarMenuItem` (envolve o botão) **e** no `PopoverContent`. Isso permite o cursor transitar entre ícone e popover (atravessando os 28px de gap) sem disparar fechamento — qualquer entrada no popover cancela o timer.
- O clique chama `cancelTimers()` antes de `setOpen(o => !o)` pra evitar conflito com timer de hover em curso.
- `cancelTimers` no cleanup do useEffect previne timers órfãos quando o componente desmonta (ex.: troca de página).

## Validação

Antes de marcar como pronto, validar manualmente em `npm run dev`:

**Desktop (mouse):**
- [ ] Hover sobre ícone "Principal" abre popover após ~120ms
- [ ] Mover cursor rapidamente passando por vários ícones não abre nenhum
- [ ] Cursor sai do ícone → entra no popover dentro de 150ms → fica aberto
- [ ] Cursor sai do popover → fecha após 150ms
- [ ] Clique no ícone abre/fecha imediatamente (sem esperar 120ms)
- [ ] Clique em item navega e fecha popover
- [ ] Tab + Enter abre popover (acessibilidade)
- [ ] Trocar de página com popover aberto não vaza timer

**Mobile / touch (DevTools mobile mode):**
- [ ] Tap no ícone abre popover (hover não dispara)
- [ ] Tap em item navega e fecha
- [ ] Tap fora fecha

**Visual / regressão:**
- [ ] Tooltip do label não aparece simultaneamente com popover
- [ ] Modo expandido inalterado (chevron click continua igual)
- [ ] Funciona em todas as 8 categorias (Principal, Cadastros, Documentos, Cowork, News, Ferramentas, Mais, Júri/VVD/EP)

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Timer órfão após unmount | `useEffect` cleanup chama `cancelTimers()` |
| Conflito hover-timer + clique | Clique chama `cancelTimers()` antes de alternar estado |
| Hover acidental ao mover cursor entre ícones | Delay de 120ms — cursor brushando passa antes do timer expirar |
| Popover fecha sozinho ao tentar entrar nele | Grace de 150ms cobre o gap de 28px (`sideOffset`); `onMouseEnter` no `PopoverContent` cancela o timer |
| Mobile sem hover quebra | `isMobile` check em ambos handlers; comportamento de tap-to-open preservado |
| Acessibilidade por teclado | Inalterada — Radix `PopoverTrigger` continua tratando Tab/Enter/Space |

## Fora de escopo

- Modo expandido (continua chevron-clique).
- Mudanças visuais no popover ou nos ícones.
- Reorganização das categorias ou itens.
- Atalhos de teclado pra abrir popover específico.
