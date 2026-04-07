# Redesign Padrão Defender v3 — Página de Assistido + Tokens

**Data:** 2026-04-02
**Escopo:** Refinar página de assistido, atualizar design tokens v3, preparar padrão para expansão ao resto da app
**Fluxo de dados:** Claude Code daemon (`claude -p`) → JSONB `casos.analysisData` → tRPC → componentes

---

## 1. Design Tokens v3 (`src/lib/config/design-tokens.ts`)

Atualizar de v2 para v3. Arquivo é a referência central — tudo que vier depois herda dele.

### Mudanças

| Token | v2 (atual) | v3 (novo) |
|-------|-----------|-----------|
| `TAB_STYLE` | Underline emerald (`border-b-2 border-emerald-500`) | Pill style (`bg-zinc-100` container, `bg-zinc-900 text-white` ativo) |
| `CARD_STYLE` | Só `base` e `highlight` | Adicionar `glass`: `bg-zinc-100/60 border border-zinc-200/80 rounded-lg` |
| Novo: `HEADER_STYLE` | — | `bg-gradient-to-br from-[#292930] to-[#202025] rounded-xl shadow-lg ring-1 ring-white/[0.04]` |
| Novo: `LIST_ITEM` | — | Padrão glass clean: ícone Lucide 13px inline zinc-500 + badge status funcional |
| `COLORS.primary` | emerald (genérico) | emerald = cor funcional de Júri. Sistema não tem cor primária decorativa |

### O que NÃO muda
- `TYPO` — tipografia já está correta
- `SPACE` — grid de 8px mantido
- `PILL_STYLE` — subabas mantidas
- Helpers: `urgencyColor()`, `prisaoColor()`, `audienciaUrgency()`

### Tokens novos

```typescript
export const HEADER_STYLE = {
  container: "rounded-xl bg-gradient-to-br from-[#292930] to-[#202025] shadow-lg shadow-black/10 ring-1 ring-white/[0.04]",
  text: "text-white font-serif text-lg font-semibold tracking-tight",
  label: "text-white/30 text-[9px] uppercase tracking-wider",
  value: "text-white/80 font-mono tracking-wide",
  separator: "w-[1.5px] h-3.5 bg-white/15 rounded-full",
  divider: "h-[2px] bg-white/15",
  bottomRow: "bg-white/[0.08] rounded-lg px-3.5 py-2.5",
  stat: "text-white/60 font-semibold",
  statLabel: "text-white/30",
} as const;

export const GLASS = {
  card: "bg-zinc-100/60 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.06] rounded-lg",
  hover: "hover:bg-zinc-100 dark:hover:bg-white/[0.07] transition-all duration-200",
  cardHover: "bg-zinc-100/60 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.06] rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.07] transition-all duration-200 cursor-pointer",
} as const;

export const LIST_ITEM = {
  container: "bg-zinc-100/60 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.06] rounded-lg px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-white/[0.07] cursor-pointer transition-all",
  icon: "w-[13px] h-[13px] text-zinc-500 dark:text-zinc-400 shrink-0",
  title: "text-[11px] font-medium text-foreground/80",
  meta: "text-[9px] text-muted-foreground",
  metaSep: " · ",
} as const;

export const TAB_STYLE_V3 = {
  bar: "flex items-center gap-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1",
  item: "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-white/5",
  active: "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm",
  badge: "text-[9px] min-w-[18px] text-center px-1 py-px rounded-full font-medium",
  badgeActive: "bg-white/20 text-white/70 dark:bg-zinc-700 dark:text-zinc-300",
  badgeInactive: "bg-zinc-200/60 dark:bg-white/10 text-zinc-400 dark:text-zinc-500",
} as const;
```

---

## 2. Header Refinado

### Escopo
Arquivo: `src/app/(dashboard)/admin/assistidos/[id]/page.tsx` (linha ~326)

### Mudanças
- Gradiente: `from-[#222228] to-[#18181b]` → `from-[#292930] to-[#202025]`
- Bottom row stats: `bg-white/[0.12]` → `bg-white/[0.08]`
- Separadores verticais: `bg-white/20` → `bg-white/15`
- Dot vermelho (preso): `border-[#222228]` → `border-[#292930]`

### O que NÃO muda
- Avatar branco com iniciais pretas
- Badge de atribuição (emerald/amber/sky/zinc)
- Botões (Analisar cor da atribuição, Promptório ghost)
- CPF/Tel/WhatsApp layout
- CasoBar component

---

## 3. Abas Internas — Glass Clean

### Padrão universal para itens de lista

```
Glass card (LIST_ITEM.container)
├── Ícone Lucide inline (LIST_ITEM.icon) + título (LIST_ITEM.title)
├── Badge status à direita (cor funcional do status)
└── Metadata compacta (LIST_ITEM.meta, separada por ·)
```

### Mudanças por aba

#### Demandas (parcial — já glass)
- Remover barra accent lateral (`w-0.5 rounded-full`)
- Adicionar ícone `ClipboardList` inline (13px, zinc-500)
- Manter badge de status com cores existentes: red=URGENTE, amber=ATENDER, emerald=CONCLUIDO/PROTOCOLADO, purple=MONITORAR, zinc=FILA
- Botão "Nova Demanda": `text-muted-foreground hover:text-foreground` (remover `hover:text-emerald-600`)

#### Audiências (refazer)
- De: `border border-border rounded-lg p-3`
- Para: `LIST_ITEM.container`
- Ícone `Calendar` inline
- Badge: blue=Agendada, emerald=Realizada, amber=Adiada, zinc=default
- Meta: data formatada + local numa linha com ·

#### Ofícios (refazer)
- De: `bg-muted/50 hover:border-emerald-500/20`
- Para: `LIST_ITEM.container`
- Ícone `FileText` inline
- Badge: yellow=Rascunho, blue=Revisão, emerald=Enviado, zinc=Arquivado
- Remover hover emerald
- Meta: número processo + tipo + data numa linha com ·
- Manter ícone Sparkles (violet-400) quando `geradoPorIA`
- Botão "Novo Ofício": `bg-zinc-800 hover:bg-zinc-700 text-white` (remover emerald)

#### Mídias
- MidiasHub é componente separado — adequar ao glass onde possível, sem reescrever
- Prioridade menor

#### Timeline / Radar
- Componentes especializados com visualização própria — manter

---

## 4. Aba Análise — Blocos Expandidos

### De 5 blocos para 8 blocos dedicados

| # | Bloco | Ícone Lucide | Accordion trigger |
|---|-------|-------------|-------------------|
| 1 | Resumo Executivo | `FileText` | Glass, ícone bg-zinc-800 |
| 2 | Painel de Depoentes | `Users` | Glass, ícone bg-zinc-800 |
| 3 | Depoimentos Comparados | `GitCompareArrows` | Glass, ícone bg-zinc-800 |
| 4 | Perguntas Estratégicas | `MessageCircleQuestion` | Glass, ícone bg-zinc-800 |
| 5 | Teses Defensivas | `Shield` | Glass, ícone bg-zinc-800 |
| 6 | Orientação ao Assistido | `UserCheck` | Glass, ícone bg-zinc-800 |
| 7 | Cronologia | `Clock` | Glass, ícone bg-zinc-800 |
| 8 | Mapa | `MapPin` | Glass, ícone bg-zinc-800 |

### Conteúdo de cada bloco

#### 1. Resumo Executivo
- Resumo em 3 parágrafos (narrativa condensada)
- KPIs em glass cards (documentos analisados, pessoas, eventos)
- Alertas operacionais: boxes com borda lateral colorida (red=risco, amber=atenção, emerald=positivo, blue=info)
- Checklist tático 48h: lista com checkboxes do que fazer imediatamente

#### 2. Painel de Depoentes
- Tabela: Nome | Papel | Delegacia (sim/data) | Juízo (sim/data) | Plenário | Status Intimação
- Status intimação com ícones: CheckCircle2=intimado (emerald), Clock=em curso (amber), XCircle=frustrada (red), AlertTriangle=sem diligência (zinc)
- Alerta abaixo da tabela: quem está sem intimação, risco para audiência
- Cada linha clicável para expandir perfil detalhado

#### 3. Depoimentos Comparados
- Tabela comparativa: Ponto | Delegacia | Juízo | Convergência (check/x)
- Convergência: emerald=converge, red=diverge
- Cada pessoa expandível para depoimento completo (fase policial vs judicial)
- Trechos-chave destacados em quote blocks

#### 4. Perguntas Estratégicas
- Agrupadas por testemunha (collapsible por pessoa)
- Cada pergunta: texto da pergunta + objetivo (muted) + contexto (muted)
- Visual: lista numerada dentro de cada grupo
- Pronto para imprimir/levar na audiência

#### 5. Teses Defensivas
- Tese principal em destaque (glass card maior)
- Teses subsidiárias em lista
- Nulidades identificadas
- Fundamento legal de cada tese
- Módulos RA se aplicável (Radar Liberdade, Saneamento, etc.)

#### 6. Orientação ao Assistido
- Texto direto, linguagem simples
- Seções: comportamento, riscos, ênfases, o que não fazer
- Visual: prose com headers h3 dentro do bloco

#### 7. Cronologia
- Timeline vertical com dots coloridos por tipo de ato
- Dupla: fatos do crime (esquerda) + atos processuais (direita)
- Cada evento: data + descrição + fonte + relevância

#### 8. Mapa
- Manter componente existente (locais, câmeras, residências)

### Type expandido (`AnalysisBlocksData`)

Adicionar ao type existente:

```typescript
// Novos campos
painelDepoentes?: {
  nome: string;
  papel: string;
  delegacia?: { presente: boolean; data?: string };
  juizo?: { presente: boolean; data?: string };
  plenario?: string;
  statusIntimacao: "intimado" | "em_curso" | "frustrada" | "sem_diligencia" | "dispensado";
}[];

depoimentosComparados?: {
  ponto: string;
  delegacia: string;
  juizo: string;
  convergencia: boolean;
}[];

depoimentosCompletos?: {
  nome: string;
  fasePolicial?: string;
  faseJudicial?: string;
  plenario?: string;
}[];

perguntasEstrategicas?: {
  testemunha: string;
  perguntas: {
    pergunta: string;
    objetivo: string;
    contexto?: string;
  }[];
}[];

orientacaoAssistido?: string;

alertasOperacionais?: {
  tipo: "risco" | "atencao" | "info" | "positivo";
  texto: string;
}[];

checklistTatico?: string[];
```

### Estado vazio
Blocos sem dados mostram mensagem: "Analise este caso para gerar [nome do bloco]." com botão que abre o Promptório com a skill adequada.

### Fonte de dados
```
Botão Analisar → claude_code_tasks (banco) → daemon claude -p (Mac Mini)
→ resultado salvo em casos.analysisData (JSONB) → tRPC getAnaliseDoCaso → componentes
```

Dados legados (batch antigo) preenchem Resumo e Teses. Demais blocos ficam vazios até re-análise via Claude Code.

---

## 5. Drive Redesign

### Escopo
Arquivo: `src/components/drive/DriveTabEnhanced.tsx` (componente compartilhado, usado em assistido e processo)

### Visual
- Itens de arquivo: glass cards (`LIST_ITEM.container`)
- Ícone Lucide inline por tipo: `FileText` (docs), `Music` (áudio), `Video` (vídeo), `Image` (imagem), `File` (genérico)
- Enrichment status badge: emerald=Extraído, amber=Processando (animate-pulse), red=Falhou, zinc=Pendente (cores já existentes em `drive-constants.ts`)
- Pastas: glass card com fundo levemente diferente (`bg-zinc-200/40`) + ícone `FolderOpen`
- Arquivos dentro de pastas: indentação `pl-6`
- Remover qualquer hover emerald — usar hover neutro

### Funcionalidade nova

#### Filtros por tipo (pills no topo)
- Todos | Autos | Laudos | Certidões | Áudios | Vídeos
- Baseado nos campos `documentType` e `categoria` existentes
- Pill style: `TAB_STYLE_V3` (mas menor, text-[10px])

#### Filtros por status de extração
- Todos | Extraído | Pendente | Falhou
- Baseado no campo `enrichmentStatus`
- Pode ser combinado com filtro de tipo

#### Preview inline
- Clicar num arquivo abre Sheet lateral
- Mostra: nome, tipo, data, status extração
- Se extraído: mostra conteúdo do `enrichmentData` (resumo, texto extraído, metadados)
- Botão "Abrir no Drive" (link externo)
- Botão "Transcrever" para áudios/vídeos pendentes

#### Hierarquia visual
- Pastas como headers colapsáveis (Collapsible)
- Arquivos indentados dentro da pasta
- Breadcrumb de navegação quando dentro de subpasta

### O que NÃO muda
- Lógica de upload e integração Google Drive
- View modes (tree/timeline/status/processo) — mantém mas com visual glass
- Busca (Command/Popover existente) — manter funcionalidade, adequar visual

---

## Cores Funcionais — Referência Consolidada

Todas as cores usadas na aplicação, documentadas para consistência:

### Status de Demanda
| Status | Cor | Classes |
|--------|-----|---------|
| URGENTE | Red | `bg-red-100 text-red-700` |
| ATENDER | Amber | `bg-amber-100 text-amber-700` |
| MONITORAR | Purple | `bg-purple-100 text-purple-700` |
| FILA | Zinc | `bg-zinc-100 text-zinc-600` |
| PROTOCOLADO | Emerald | `bg-emerald-100 text-emerald-700` |
| CIÊNCIA | Sky | `bg-sky-100 text-sky-700` |
| CONCLUÍDO | Emerald | `bg-emerald-100 text-emerald-700` |
| ARQUIVADO | Zinc | `bg-zinc-100 text-zinc-400` |

### Status de Audiência
| Status | Cor | Classes |
|--------|-----|---------|
| Agendada | Blue | `bg-blue-100 text-blue-600` |
| Realizada | Emerald | `bg-emerald-100 text-emerald-600` |
| Adiada | Amber | `bg-amber-100 text-amber-600` |

### Status de Ofício
| Status | Cor | Classes |
|--------|-----|---------|
| Rascunho | Yellow | `bg-yellow-500/10 text-yellow-600` |
| Revisão | Blue | `bg-blue-500/10 text-blue-600` |
| Enviado | Emerald | `bg-emerald-500/10 text-emerald-600` |
| Arquivado | Zinc | `bg-zinc-500/10 text-zinc-500` |

### Atribuição (única cor decorativa permitida)
| Atribuição | Cor | Badge |
|-----------|-----|-------|
| Júri | Emerald | `bg-emerald-600 text-white` |
| VVD | Amber | `bg-amber-500 text-white` |
| Execução Penal | Sky | `bg-sky-600 text-white` |
| Substituição | Zinc | `bg-zinc-700 text-white` |
| Curadoria | Purple | `bg-purple-500 text-white` |

### Enrichment Status (Drive)
| Status | Cor | Classes |
|--------|-----|---------|
| Extraído | Emerald | `bg-emerald-100 text-emerald-700` |
| Processando | Amber | `bg-amber-100 text-amber-700 animate-pulse` |
| Pendente | Zinc | `bg-zinc-100 text-zinc-600` |
| Falhou | Red | `bg-red-100 text-red-700` |

---

## Ordem de Implementação

1. **design-tokens.ts** — atualizar/adicionar tokens v3
2. **Header** — trocar gradiente e opacidades
3. **Abas internas** — Demandas, Audiências, Ofícios → glass clean
4. **Aba Análise** — expandir type + criar 8 componentes de bloco
5. **Drive** — redesign visual + filtros + preview inline

Cada etapa pode ser deployada independentemente sem quebrar o resto.

---

## Fora de Escopo

- Redesign de outras páginas (processo, dashboard, lista de assistidos) — será feito depois, usando os tokens v3 como referência
- Mudanças na sidebar
- Mudanças no daemon/skills do Claude Code
- Novos dados no banco — os campos JSONB já suportam estrutura flexível
- Dark mode redesign — manter os tokens dark existentes, adequar onde necessário
