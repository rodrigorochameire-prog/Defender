# Tasks: WhatsApp Defender Premium UI Polish

## Agrupamento por Subagent (paralelizavel)

### Agent A: CSS Animations + Skeletons + Empty States
| ID | Tarefa | Arquivo | Deps |
|----|--------|---------|------|
| T-01 | Adicionar @keyframes e utilities em globals.css | globals.css | - |
| T-02 | Criar MessageSkeleton (3-4 bubbles alternados, shimmer) | MessageSkeleton.tsx | T-01 |
| T-03 | Criar ConversationSkeleton (avatar + 2 linhas, shimmer) | ConversationSkeleton.tsx | T-01 |
| T-04 | Criar ChatEmptyState com SVG inline | ChatEmptyState.tsx | T-01 |
| T-05 | Criar ScrollToBottom FAB circular com badge | ScrollToBottom.tsx | T-01 |

### Agent B: MessageBubble + Input Bar + Selection Bar
| ID | Tarefa | Arquivo | Deps |
|----|--------|---------|------|
| T-06 | Extrair e criar MessageBubble premium | MessageBubble.tsx | - |
| T-07 | Redesign input bar (rounded-2xl, send circular, attachment menu) | ChatWindow.tsx (input area) | T-06 |
| T-08 | Selection bar flutuante bottom com backdrop-blur | ChatWindow.tsx (selection) | T-06 |
| T-09 | Integrar MessageBubble + skeletons + empty state + scroll FAB no ChatWindow | ChatWindow.tsx | T-06 |

### Agent C: ConversationList + Header + ContactDetails + Micro-interacoes
| ID | Tarefa | Arquivo | Deps |
|----|--------|---------|------|
| T-10 | ConversationList: avatar rings, media preview icons, hover polish | ConversationList.tsx | - |
| T-11 | Page header: shadow-xs, connection dot, acoes em menu | page.tsx | - |
| T-12 | ContactDetailsPanel: glassmorphism header, icones coloridos, mini-cards | ContactDetailsPanel.tsx | - |
| T-13 | Micro-interacoes: star rotate, send scale, FAB transition | Varios | T-10 |
