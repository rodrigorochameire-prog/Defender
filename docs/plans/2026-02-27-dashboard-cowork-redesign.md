# Design: Dashboard Melhorado + Equipe & Cowork Redesenhado

**Data**: 2026-02-27
**Status**: Aprovado para implementacao
**Escopo**: 3 fases independentes

---

## Contexto

O dashboard atual tem um "Registro Rapido" com visual destoante do Padrao Defender, vinculacao difícil a assistido/processo, e sem feedback pos-registro. A secao Cowork na sidebar tem apenas 2 itens (Delegacoes e Equipe), insuficiente para o fluxo colaborativo entre defensores, servidores e estagiarios. O ambiente de equipe precisa ser mais funcional, intuitivo e dinamico.

## Decisoes do Brainstorming

| Aspecto | Decisao |
|---------|---------|
| Prioridade | Tudo junto — 3 fases independentes |
| Sidebar Cowork | Expandir de 2 para 6 itens |
| Hierarquia | Defensor delega direto para servidor OU estagiario |
| Registro busca | Inline obrigatoria + criar novo assistido/processo se nao existir |
| Smart Link texto | REMOVIDO — complexo demais, focar em busca boa |
| Mural | Pagina dedicada com compartilhamento de artigos/jurisprudencia/noticias |
| Harmonia dashboard | Grid 2 colunas: Registro Rapido | Equipe & Cowork |

---

## Fase 1: Registro Rapido Redesenhado + Vinculacao

**Estimativa**: ~500 linhas alteradas
**Impacto**: Imediato no dia-a-dia

### 1.1 Card Compacto Padrao Defender

O registro rapido atual e substituido por um card colapsavel no topo do dashboard.

**Layout** (grid 2 colunas com Equipe ao lado):

```
┌─── Registro Rapido ──────────────┐  ┌──── Equipe & Cowork ───┐
│                                   │  │                         │
│  Assistido: [buscar...] [+ Novo]  │  │  [Del:3] [Mur:2] [Eq:5]│
│  Processo:  [buscar...] [+ Novo]  │  │                         │
│  Atribuicao: [select]             │  │  Atividade Recente:     │
│                                   │  │  * Maria aceitou...     │
│  Tipo: [Atend] [Info] [Dilig]     │  │  * Pedro concluiu...    │
│                                   │  │                         │
│  [Descricao...]  [Plaud] [IA]     │  │                         │
│                                   │  │                         │
│  [Registrar e Vincular ->]        │  │  [Ver tudo ->]          │
└───────────────────────────────────┘  └─────────────────────────┘
```

**Principios visuais**:
- `bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 rounded-xl`
- Icone header invertido: `bg-zinc-900 dark:bg-white` com Lucide `Plus`
- Titulo: `font-serif text-lg font-semibold`
- Tipo de registro: **chip group** (1 clique, nao select)
- Busca assistido/processo: primeiro campo, obrigatorio
- Botao principal: `bg-zinc-900 hover:bg-emerald-600 dark:bg-zinc-100 dark:hover:bg-emerald-500`
- Opcoes avancadas: colapsadas por padrao

### 1.2 Busca + Criacao Inline

**Campo Assistido**:
- Busca por nome ou CPF (debounce 300ms)
- Resultados com nome + CPF + status prisional
- Se nao encontra: botao "Criar novo assistido" inline
- Criar novo: nome + CPF minimo → cria assistido + pasta Drive automaticamente (`ensureDriveFolderForAssistido`)

**Campo Processo**:
- Filtrado pelos processos do assistido selecionado
- Busca por numero de processo
- Se nao encontra: botao "Criar novo processo" inline
- Criar novo: numero + atribuicao → vincula ao assistido

**Campo Atribuicao**:
- Auto-preenchido do processo se disponivel
- Select com opcoes: Tribunal do Juri, VVD, Execucao Penal, Substituicao Criminal, etc.

### 1.3 Tipos de Registro (Chip Group)

| Tipo | Icone | Cor chip |
|------|-------|----------|
| Atendimento | `Phone` | emerald |
| Informacao | `Info` | sky |
| Diligencia | `Search` | amber |
| Nota | `StickyNote` | zinc |
| Peticao | `FileText` | violet |
| Delegacao | `UserCheck` | violet |

Chips como botoes toggle: `px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all`
- Inativo: `bg-zinc-100 dark:bg-zinc-800 text-zinc-500`
- Ativo: cor semantica do tipo

### 1.4 Opcoes Avancadas (Colapsavel)

- Criar demanda vinculada (checkbox)
- Salvar no Google Drive (checkbox)
- Agendar retorno (date picker)
- Prioridade (se criar demanda): BAIXA / NORMAL / ALTA / URGENTE / REU PRESO

### 1.5 Feedback Pos-Registro

**Toast rico** (Sonner):
```
[check] Atendimento registrado para Joao da Silva
        Ver no perfil ->  |  Ver processo ->
```

- Link direto ao perfil do assistido
- Link direto ao processo (se vinculado)
- Registro aparece na timeline do assistido/processo

### 1.6 Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/app/(dashboard)/admin/dashboard/page.tsx` | Reescrever componente RegistroRapidoAprimorado |
| `src/components/dashboard/registro-rapido-card.tsx` | **NOVO** — Card isolado, reutilizavel |
| `src/components/dashboard/assistido-search-inline.tsx` | **NOVO** — Busca + criacao inline |
| `src/components/dashboard/processo-search-inline.tsx` | **NOVO** — Busca + criacao inline |

---

## Fase 2: Sidebar Cowork Expandida + Dashboard Equipe

**Estimativa**: ~400 linhas alteradas
**Impacto**: Melhoria visual imediata + navegacao

### 2.1 Sidebar — Secao Cowork (6 itens)

```typescript
const COWORK_NAV = [
  { label: "Delegacoes", path: "/admin/delegacoes", icon: "ClipboardList", badge: "pendentes" },
  { label: "Equipe", path: "/admin/equipe", icon: "UsersRound" },
  // --- divider ---
  { label: "Mural", path: "/admin/mural", icon: "MessageSquare", badge: "nao-lidas" },
  { label: "Agenda", path: "/admin/agenda-equipe", icon: "CalendarDays", badge: "hoje" },
  { label: "Pareceres", path: "/admin/pareceres", icon: "FileCheck", badge: "pendentes" },
  { label: "Coberturas", path: "/admin/coberturas", icon: "ArrowLeftRight", badge: "ativas" },
];
```

**Visual**:
- Hover: `hover:bg-zinc-700/40 hover:text-zinc-200`
- Active: `bg-zinc-800/80 text-zinc-100 border-l-2 border-violet-500`
- Badges: `bg-violet-500/20 text-violet-300 text-[10px] font-semibold px-1.5 rounded-full`
- Divider sutil entre Equipe e Mural: `border-zinc-700/30`
- Permissions: todos veem Mural e Agenda; Delegacoes/Pareceres por role

### 2.2 Cards de Equipe no Dashboard

Cards compactos ao lado do Registro Rapido:

```
┌─ Equipe & Cowork ──────────────────────────────┐
│                                                  │
│  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐   │
│  │  Del   │  │ Mural │  │Equipe │  │ Cob   │   │
│  │   3    │  │   2   │  │   5   │  │   1   │   │
│  │pending │  │ novas │  │ativos │  │ ativa │   │
│  └───────┘  └───────┘  └───────┘  └───────┘   │
│                                                  │
│  Atividade Recente                              │
│  * Maria aceitou delegacao "Minuta..."    2min  │
│  * Pedro concluiu diligencia "Cert..."   15min  │
│  * Ana publicou no mural: "Audiencia..." 1h    │
│  * Rodrigo compartilhou jurisprudencia   2h    │
│                                                  │
│                               [Ver tudo ->]     │
└──────────────────────────────────────────────────┘
```

**Visuais dos mini-cards**:
- `bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 rounded-lg p-3`
- Numero: `text-xl font-bold text-zinc-900 dark:text-zinc-100`
- Label: `text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500`
- Clicaveis: `cursor-pointer hover:border-violet-300 dark:hover:border-violet-700 transition-all`
- Click navega para pagina respectiva

**Activity Feed**:
- Timeline vertical com dots coloridos por tipo de atividade
- Max 5 itens, link "Ver tudo" para pagina de atividades
- Dot colors: emerald (aceita), amber (em andamento), violet (mural), sky (parecer)

### 2.3 Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/components/layouts/admin-sidebar.tsx` | Expandir COWORK_NAV para 6 itens + divider |
| `src/app/(dashboard)/admin/dashboard/page.tsx` | Adicionar EquipeCoworkCard ao lado do Registro Rapido |
| `src/components/dashboard/equipe-cowork-card.tsx` | **NOVO** — Card de resumo da equipe |

---

## Fase 3: Mural Interativo + Agenda da Equipe + Pareceres

**Estimativa**: ~600 linhas (3 paginas novas)
**Impacto**: Colaboracao funcional

### 3.1 Mural da Equipe — Pagina `/admin/mural`

**Funcionalidades**:
- Posts com categorias: Aviso, Pergunta, Lembrete, Compartilhamento
- Mentions: `@Maria` notifica a pessoa
- Reacoes rapidas: 3 icones Lucide (ThumbsUp, Check, Eye)
- Pin: Posts importantes fixos no topo
- Filtro: Por autor, categoria, data

**Compartilhamento de Conteudo Juridico** (subcategorias):

| Tipo | Campos | Preview |
|------|--------|---------|
| Artigo | URL + titulo + trecho | Card com link |
| Jurisprudencia | Tribunal + numero + ementa | Card formatado |
| Noticia | URL + manchete + fonte | Card com link |

Preview automatico: ao colar URL, busca og:title e og:image para gerar card visual.

**Schema** (novo ou extensao da tabela existente `muralPosts`):

```typescript
muralPosts: {
  id: serial,
  workspaceId: uuid,
  autorId: uuid (FK users),
  categoria: varchar, // 'aviso' | 'pergunta' | 'lembrete' | 'compartilhamento'
  subcategoria: varchar, // null | 'artigo' | 'jurisprudencia' | 'noticia'
  conteudo: text,
  metadata: jsonb, // { url, titulo, trecho, tribunal, numero, ementa, fonte, ogImage }
  isPinned: boolean,
  createdAt: timestamp,
  updatedAt: timestamp,
}

muralReacoes: {
  id: serial,
  postId: integer (FK muralPosts),
  userId: uuid (FK users),
  tipo: varchar, // 'like' | 'check' | 'eye'
  createdAt: timestamp,
}

muralMentions: {
  id: serial,
  postId: integer (FK muralPosts),
  userId: uuid (FK users),
  isRead: boolean,
}
```

**Layout da pagina**:

```
┌─ Mural da Equipe ─────────── [Filtros: Todos | Avisos | Perguntas | Compartilhamentos]
│
│  ┌─ Novo post ─────────────────────────────────────────────┐
│  │ [Aviso v]  O que deseja compartilhar?       [@] [Enviar]│
│  │ [Compartilhar artigo/jurisprudencia/noticia ->]         │
│  └─────────────────────────────────────────────────────────┘
│
│  FIXADOS
│  ┌─────────────────────────────────────────────────────────┐
│  │ Aviso  *  Rodrigo  *  ha 2 dias                [Desfixar]
│  │ Audiencias de custodia voltam presenciais em marco.     │
│  │                               ThumbsUp:3  Check:1  Eye:2│
│  └─────────────────────────────────────────────────────────┘
│
│  RECENTES
│  ┌─────────────────────────────────────────────────────────┐
│  │ Compartilhamento (Jurisprudencia)  *  Maria  *  ha 1h  │
│  │ ┌─ STJ - REsp 1.234.567/BA ───────────────────────┐    │
│  │ │ Ementa: Trafico de drogas. Dosimetria. Natureza  │    │
│  │ │ e quantidade da droga. Minorante do art. 33...   │    │
│  │ └──────────────────────────────────────────────────┘    │
│  │ "Olhem essa decisao, relevante para o caso do Joao"     │
│  │                               ThumbsUp:5  Check:2  Eye:3│
│  └─────────────────────────────────────────────────────────┘
│
│  ┌─────────────────────────────────────────────────────────┐
│  │ Pergunta  *  Pedro  *  ha 3h                            │
│  │ @Rodrigo O assistido Joao Silva ligou sobre execucao.   │
│  │ Pode orientar?                          [Responder]     │
│  └─────────────────────────────────────────────────────────┘
```

### 3.2 Agenda da Equipe — Pagina `/admin/agenda-equipe`

**Visoes**:
- **Dia**: Timeline vertical, cada membro como coluna
- **Semana**: Grid 7 dias x N membros (compact)
- **Lista**: Proximos compromissos agrupados por data

**Fontes de dados automaticas**:
- Prazos de demandas (do sistema)
- Audiencias (se cadastradas)
- Coberturas/afastamentos ativos
- Eventos manuais criados pela equipe

**Layout (visao Dia)**:

```
┌─ Agenda da Equipe ──── [Dia] [Semana] [Lista] ── [+ Evento]
│
│  Hoje, 27/02/2026
│
│  ┌─ Rodrigo ──────┐  ┌─ Maria ───────┐  ┌─ Pedro ───────┐
│  │ 09:00 Audiencia │  │ 10:00 Prazo   │  │ (Ferias ate   │
│  │ Joao Silva      │  │ Alegacoes     │  │  03/03)       │
│  │ Vara do Juri    │  │ Proc. 0500... │  │               │
│  │                 │  │               │  │ Cobertura:    │
│  │ 14:00 Prazo     │  │ 14:00 Audienc.│  │ Maria         │
│  │ Resposta Acus.  │  │ Vara VVD      │  │               │
│  └─────────────────┘  └───────────────┘  └───────────────┘
```

### 3.3 Pareceres — Pagina `/admin/pareceres`

**Tabs**:
- **Recebidos**: Pareceres que me pediram (pendente -> responder)
- **Enviados**: Pareceres que eu solicitei (status: pendente, respondido)

**Card de parecer**:
```
┌─────────────────────────────────────────────────────────────┐
│ Parecer sobre execucao penal        PENDENTE  |  URGENTE    │
│ Solicitado por: Rodrigo             ha 2 horas              │
│ Assistido: Joao Silva  |  Processo: 0500123-45.2024         │
│                                                              │
│ "Preciso de opiniao sobre a possibilidade de progressao..." │
│                                                              │
│ [Responder]                                      [Recusar]  │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Coberturas — Pagina `/admin/coberturas`

Pagina dedicada para gerenciar afastamentos (atualmente so acessivel via modal):
- Lista de coberturas ativas e futuras
- Criar novo afastamento
- Visualizar quem esta cobrindo quem

### 3.5 Arquivos a Criar/Modificar

| Arquivo | Acao | ~Linhas |
|---------|------|---------|
| `src/app/(dashboard)/admin/mural/page.tsx` | **NOVO** — Pagina do mural | ~250 |
| `src/app/(dashboard)/admin/agenda-equipe/page.tsx` | **NOVO** — Pagina da agenda | ~200 |
| `src/app/(dashboard)/admin/pareceres/page.tsx` | **NOVO** — Pagina de pareceres | ~150 |
| `src/app/(dashboard)/admin/coberturas/page.tsx` | **NOVO** — Pagina de coberturas | ~100 |
| `src/lib/db/schema.ts` | Novas tabelas: muralPosts, muralReacoes, muralMentions | ~50 |
| `src/lib/trpc/routers/mural.ts` | **NOVO** — Router do mural | ~150 |

---

## Regras de Harmonia Visual (Padrao Defender)

Todos os componentes seguem o mesmo padrao:

| Elemento | Classes |
|----------|---------|
| Card bg | `bg-white dark:bg-zinc-900` |
| Card border | `border-zinc-200/80 dark:border-zinc-800/80 rounded-xl` |
| Titulo secao | `font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-100` |
| Icone header | `w-10 h-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center` |
| Hover card | `hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all` |
| Label micro | `text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500` |
| Botao principal | `bg-zinc-900 hover:bg-emerald-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-emerald-500` |
| Stats numbers | `text-2xl font-bold text-zinc-900 dark:text-zinc-100` |
| Activity dots | Cor semantica por tipo (emerald/amber/violet/sky) |

**Grid do dashboard**:
- Desktop: `grid grid-cols-1 lg:grid-cols-2 gap-6` (Registro | Equipe)
- Ambos cards: mesma `min-h` para alinhamento
- Mobile: empilham verticalmente

---

## Sequencia de Implementacao

```
Fase 1 (Registro Rapido) ..................................... 2-3h
  1. Criar registro-rapido-card.tsx (card isolado)
  2. Criar assistido-search-inline.tsx (busca + criar novo)
  3. Criar processo-search-inline.tsx (busca + criar novo)
  4. Integrar no dashboard com grid 2 colunas
  5. Toast rico com deep links
  6. Build + Deploy

Fase 2 (Sidebar + Dashboard Equipe) .......................... 1-2h
  1. Expandir admin-sidebar.tsx (6 itens Cowork)
  2. Criar equipe-cowork-card.tsx
  3. Integrar ao lado do registro rapido
  4. Build + Deploy

Fase 3 (Mural + Agenda + Pareceres) .......................... 3-4h
  1. Schema: muralPosts, muralReacoes, muralMentions
  2. Router: mural.ts com CRUD + reacoes + mentions
  3. Pagina /admin/mural
  4. Pagina /admin/agenda-equipe
  5. Pagina /admin/pareceres (migrar componentes existentes)
  6. Pagina /admin/coberturas (migrar modal existente)
  7. Build + Deploy
```

**Total estimado**: ~1500 linhas, 7-9h, 6 arquivos novos
