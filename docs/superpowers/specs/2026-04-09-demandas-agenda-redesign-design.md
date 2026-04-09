# Redesign Demandas + Agenda — Padrão Defender v3

**Goal:** Alinhar as páginas de Demandas e Agenda com o Padrão Defender v3, usando a página de Assistido como referência visual. Manter lógica do kanban e calendário intacta — mudar apenas visual, estrutura do header e hierarquia de cor.

**Brainstorming session:** `.superpowers/brainstorm/31747-1775757089/`

---

## Decisões Consolidadas

### 1. Header Charcoal Unificado (Demandas + Agenda)

Ambas as páginas adotam o mesmo padrão de header:

**Linha 1:** Ícone Lucide + Título da página + stats micro-badges inline + botões de ação (Importar, Exportar, Nova Demanda / Novo Evento)

**Linha 2 (separada por border-top 1px rgba branco):** Attribution pills + Search input + Separator | View mode dropdown + Filter icon + Sort icon + Config icon + Charts icon

- **Stats:** Micro-badges ao lado do título. Ex: `47 total` (rgba branco) + `5 urgentes` (rgba vermelho). Discretos, não ocupam linha própria.
- **Attribution pills:** Dentro do header charcoal, fundo `rgba(255,255,255,0.05)`, pill ativa com `rgba(255,255,255,0.08)`. Dots coloridos por atribuição. Contagem em cada pill.
- **Search:** Input inline com ícone Search (Lucide), `rgba(255,255,255,0.05)` background.
- **Separadores:** Barras verticais 1px `rgba(255,255,255,0.08)` entre grupos funcionais.

**Agenda-específico:** Linha 2 inclui navegação de mês (setas ChevronLeft/ChevronRight + label "Abril 2026" + botão "Hoje") entre pills e tools.

**Tokens:** Usar `HEADER_STYLE.container` para gradiente, `HEADER_STYLE.label`/`value` para textos.

### 2. View Mode — Botão único com dropdown (Opção C)

O switch de visualização (Kanban/Tabela/Lista para Demandas; Mês/Semana/Lista para Agenda) é um **tool icon** com micro-chevron, na mesma fileira de Filtro/Ordenar/Config.

- Ícone do modo atual (ex: LayoutGrid para Kanban, Calendar para Mês)
- Micro-chevron `8px` no canto inferior direito
- Background `rgba(255,255,255,0.08)` (levemente mais visível que os outros tools)
- Clique abre dropdown escuro com as opções (ícone + label + checkmark no ativo)

**Elimina a toolbar separada.** Tudo fica no header charcoal.

### 3. Kanban Cards — Glass + Status-first (Demandas)

Cards do kanban usam `GLASS.cardHover` com barra lateral esquerda na cor do **status** (não atribuição).

**Hierarquia de cor no card (prioridade):**
1. **Borda lateral esquerda (2.5px)** = cor do grupo de status (triagem=#a1a1aa, preparação=#fbbf24, diligências=#60a5fa, saída=#f97316, concluída=#22c55e)
2. **Dot + label do status no footer** = mesma cor, reforça o estado. Label em font-weight: 500.
3. **Flag "Preso"** = vermelho #ef4444 com ícone AlertCircle (Lucide). Só quando aplicável.
4. **Badge de atribuição** = micro badge (7px, uppercase, border 1px semitransparente, fundo com 50% opacidade). **Só visível quando filtro "Todos" está ativo.** Quando filtrado por atribuição específica, badge escondido.
5. **Data/prazo** = neutro #ccc com ícone Calendar (Lucide)

**Estrutura do card:**
```
[barra status 2.5px] [padding-left 8px]
  Nome do Assistido                    [badge atribuição?]
  8001234-56.2024 (monospace, #bbb)
  [ícone] Crime / tipo penal (#999)    [dot preso?]
  ─────────────────── (border-top 1px)
  [dot] Status label              data/prazo
```

**Colunas kanban:** Fundo neutro, header com dot na cor do grupo + label uppercase + count badge. Coluna "Concluída" com opacity: 0.5.

**Subgrupos:** "Em Andamento" agrupa Preparação + Diligências com labels sutis inline (8px uppercase #ccc) dentro da mesma coluna.

### 4. Calendário — Híbrido G (Agenda)

Grid contínuo glass com dias que têm eventos automaticamente elevated.

**Células do dia:**
- Base: `background: rgba(255,255,255,0.55)`, gap: 1px, `border-radius: 8px` no container do grid
- Dias com eventos: `background: rgba(255,255,255,0.85)`, `box-shadow: 0 1px 4px rgba(0,0,0,0.04)`
- Hoje: `background: rgba(255,255,255,0.95)`, `box-shadow: 0 2px 8px rgba(0,0,0,0.06)`, número com fundo preto invertido
- Outro mês: `background: rgba(245,245,244,0.35)`, número #ccc
- Lógica: `className={cn("day", hasEvents && "day-elevated", isToday && "day-today")}`

**Day-of-week header:** 9px uppercase bold #bbb

### 5. Event Chips no Calendário — 2 linhas + barra esquerda (Opção A)

Formato de duas linhas mantido (como está hoje), com barra lateral esquerda de status.

**Estrutura:**
```
[barra status 2.5px vertical] [padding-left 8px]
  09:00  AIJ                   [dot preso?]
  André Luiz Cerqueira
```

- **Barra esquerda:** 2.5px, cor do status (agendada=#a1a1aa, realizada=#22c55e, reagendada=#f59e0b, cancelada=#ef4444)
- **Linha 1:** Horário (8-9px, bold, cor do status, tabular-nums) + Tipo abreviado (7-7.5px, bold, #bbb, uppercase). Tipo só aparece quando não-AIJ OU quando há espaço. Para AIJ (default, 90%), pode omitir se o dia está lotado.
- **Linha 2:** Nome do assistido (8.5-9px, medium, #555, truncate)
- **Dots contextuais:** Vermelho = preso. Dot de atribuição só quando filtro "Todos" ativo.
- **Card:** `background: rgba(255,255,255,0.8)`, `border: 1px solid rgba(229,229,229,0.5)`, `border-radius: 6px`
- **"+N mais":** 7px, #aaa, font-weight: 600

### 6. Ícones — Lucide Only

Zero emojis em toda a UI. Todos os ícones são Lucide React:
- Sidebar: Layers, FileText, LayoutGrid, Calendar, User, Shield
- Header: LayoutGrid/Calendar (page icon), Search, Plus, Download, Upload
- Tools: Filter, ArrowDownUp, Settings, BarChart3
- Cards: FileText, Scale, Phone, Calendar, AlertCircle
- View mode: LayoutGrid (Kanban), Table2 (Tabela), List (Lista), Calendar (Mês), CalendarDays (Semana)

### 7. Cores de Atribuição — Condicionais e Sutis

**Regra:** `showAtribBadge = selectedFilter === "todos"`

Quando múltiplas atribuições estão misturadas (filtro "Todos"):
- Badge micro no card (7px, uppercase, border 1px semitransparente com 20% opacidade da cor, fundo 50% opacidade)
- Dot de 5px nos attribution pills do header

Quando filtrado por atribuição específica:
- Badge de atribuição **escondido** nos cards — redundante
- Tudo fica B&W/glass com cor apenas de status

**Paleta de atribuição (do `atribuicoes.ts`):**
- VVD: #CA8A04 (yellow-600), badge bg rgba(254,243,199,0.5)
- Júri: #16A34A (green-600), badge bg rgba(209,250,229,0.5)
- Exec. Penal: #2563EB (blue-600), badge bg rgba(219,234,254,0.5)
- Criminal: #DC2626 (red-600), badge bg rgba(254,226,226,0.5)
- Substituição: #9333EA (purple-600)

### 8. Consistência Entre Páginas

| Elemento | Demandas | Agenda | Assistido |
|---|---|---|---|
| Header | Charcoal + stats + pills + tools | Charcoal + nav mês + pills + tools | Charcoal + dados do caso |
| Cards/Cells | Glass kanban cards | Glass day cells (G hybrid) | Glass analysis blocks |
| Status color | Borda esquerda + dot + label | Barra esquerda chip + horário | Dot no status |
| Atrib. color | Badge condicional | Dot condicional | Badge no header |
| View switch | Tool icon + dropdown | Tool icon + dropdown | Tabs pill v3 |
| Tabs | TAB_STYLE_V3 | TAB_STYLE_V3 | TAB_STYLE_V3 |
| Icons | Lucide only | Lucide only | Lucide only |

### 9. O Que NÃO Muda

- Lógica do kanban (drag-and-drop, colunas, status transitions)
- Lógica do calendário (data sources, event creation, PJe import)
- tRPC routers e queries
- Modelo de dados
- Comportamento de clique (1 clique = Sheet, 2 cliques = registro — já implementado)
- Filtros avançados (FilterSectionsCompact permanece, só visual)

---

## Arquivos Afetados (Estimativa)

### Demandas
| Arquivo | Mudança |
|---|---|
| `src/components/demandas-premium/demandas-premium-view.tsx` | Header charcoal, absorver toolbar, view mode dropdown |
| `src/components/demandas-premium/kanban-premium.tsx` | Cards glass, borda status, badge atribuição condicional |
| `src/components/demandas-premium/DemandaCard.tsx` | Glass + status-first styling |
| `src/components/demandas-premium/AtribuicaoPills.tsx` | Dark variant para header charcoal |
| `src/components/demandas-premium/PageHeader.tsx` | Substituir por header charcoal inline |

### Agenda
| Arquivo | Mudança |
|---|---|
| `src/app/(dashboard)/admin/agenda/page.tsx` | Header charcoal, absorver filtros, nav mês inline |
| `src/components/agenda/calendar-month-view.tsx` | Grid G hybrid, cells glass, chips com barra esquerda status |
| `src/components/agenda/calendar-week-view.tsx` | Mesmo tratamento visual |
| `src/components/agenda/agenda-filters.tsx` | Absorver no header ou simplificar |

### Shared
| Arquivo | Mudança |
|---|---|
| `src/lib/config/design-tokens.ts` | Novos tokens se necessário (CHIP_STYLE, DAY_CELL) |
| `src/components/shared/view-mode-dropdown.tsx` | Novo componente: tool icon + dropdown de views |
