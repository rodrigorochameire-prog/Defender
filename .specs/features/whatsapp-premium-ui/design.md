# Design: WhatsApp Defender Premium UI Polish

## Decisoes de Arquitetura

### ADR-01: CSS-only animations (sem Framer Motion)
**Status:** Aceita
**Contexto:** Precisamos de animacoes suaves sem aumentar bundle
**Decisao:** Usar Tailwind CSS + @keyframes custom em globals.css
**Consequencias:** Bundle zero adicional, mas animacoes limitadas a CSS

### ADR-02: Componente MessageBubble extraido
**Status:** Aceita
**Contexto:** ChatWindow.tsx tem 1287 linhas, renderizacao de mensagens inline
**Decisao:** Extrair MessageBubble como componente separado com estilos premium
**Consequencias:** Melhor manutenibilidade, reutilizacao, testing

### ADR-03: SVG inline para empty states
**Status:** Aceita
**Contexto:** Ilustracoes para empty states
**Decisao:** SVGs minimalistas inline (sem dependencias externas)
**Consequencias:** Zero requests extras, facil customizacao de cores

## Componentes

### Novos Componentes
| Componente | Responsabilidade |
|------------|------------------|
| MessageBubble.tsx | Bubble individual com estilos premium, timestamps inline, status |
| ChatEmptyState.tsx | Ilustracoes SVG para estados vazios |
| MessageSkeleton.tsx | Skeleton loading para mensagens |
| ConversationSkeleton.tsx | Skeleton loading para lista de contatos |
| ScrollToBottom.tsx | FAB circular com badge de novas msgs |

### Componentes Modificados
| Componente | Mudancas |
|------------|----------|
| ChatWindow.tsx | Usar MessageBubble, ScrollToBottom, skeletons, input bar redesign, selection bar flutuante |
| ConversationList.tsx | Avatar rings, media preview icons, shimmer skeletons, hover polish |
| ContactDetailsPanel.tsx | Glassmorphism header, icones coloridos, mini-cards processos |
| page.tsx | Header shadow, connection dot, empty state |
| globals.css | @keyframes para slide-up, scale-in, shimmer, bounce-subtle |

## CSS Animations (globals.css)

```css
/* Novas animacoes */
@keyframes slide-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes bounce-subtle {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Tailwind utilities via @layer */
@layer utilities {
  .animate-slide-up { animation: slide-up 0.2s ease-out; }
  .animate-scale-in { animation: scale-in 0.15s ease-out; }
  .animate-shimmer {
    background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.1) 50%, transparent 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
  .animate-bounce-subtle { animation: bounce-subtle 0.3s ease-in-out; }
  .animate-fade-in { animation: fade-in 0.2s ease-out; }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .animate-slide-up, .animate-scale-in, .animate-shimmer,
  .animate-bounce-subtle, .animate-fade-in {
    animation: none !important;
  }
}
```

## UI/UX Design por Componente

### MessageBubble Design
```
Outbound:                         Inbound:
┌────────────────────────┐   ┌────────────────────────┐
│ Texto da mensagem      │   │ Texto da mensagem      │
│ que pode ter varias    │   │ recebida do contato    │
│ linhas                 │   │                        │
│            14:32 ✓✓ ───┤   ├── 14:30               │
└────────────────────────┘   └────────────────────────┘
  bg-emerald-50/emerald-950     bg-white/zinc-800
  rounded-2xl shadow-sm          rounded-2xl shadow-sm
  ml-auto                        mr-auto
```

### Input Bar Design
```
┌─ bg-zinc-50 dark:bg-zinc-900 ────────────────────────────┐
│  ┌─ rounded-2xl border ─────────────────────┐  ┌──────┐ │
│  │ 📎  Digite uma mensagem...                │  │  ➤   │ │
│  └──────────────────────────────────────────┘  └──────┘ │
│   ^attachment                                  ^send btn │
│   button                                    circular     │
│                                             emerald      │
└──────────────────────────────────────────────────────────┘
```

### Selection Bar Design (flutuante)
```
                    ┌── backdrop-blur-lg rounded-2xl shadow-lg ──┐
                    │ ✕ 3 selecionadas  📌 💾 ✨ 📋            │
                    └────────────────────────────────────────────┘
                      ^fixed bottom-4, centered, animate-slide-up
```

### Scroll FAB Design
```
       ┌────┐
       │ ↓  │  <- circular, shadow-lg
       │ 3  │  <- badge with unread count
       └────┘
  position: absolute bottom-20 right-4
  animate-scale-in on appear
```

### Empty State Design
```
┌──────────────────────────────────────┐
│                                      │
│         ╭──╮    ╭──╮                │
│         │💬│    │💬│                │
│         ╰──╯    ╰──╯                │
│                                      │
│    Selecione uma conversa            │
│    para comecar                      │
│                                      │
│    Escolha um contato na lista       │
│    ao lado para ver as mensagens     │
│                                      │
└──────────────────────────────────────┘
  bg with subtle legal-themed pattern
```
