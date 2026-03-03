# UI/UX Overhaul — OMBUDS Design Vision

> Data: 2026-03-02
> Status: Em planejamento (feedback coletado)
> Epic Jira: SCRUM-33
> Stories: SCRUM-35 a SCRUM-46

## Visao Geral

Reforma visual completa da aplicacao OMBUDS, mantendo funcionalidades existentes e elevando a experiencia visual e de uso para nivel premium. Estilo hibrido pendendo para Apple/Vercel com referencias de Asana.

## Direcao Estetica

**Estilo**: Hibrido — base minimalista produtiva (Linear/Plane) com toques premium glass (Apple/Vercel). Pendendo mais para Apple/Vercel.

**Referencias Primarias**:
| Referencia | O que pegar | Stars |
|-----------|------------|-------|
| Apple Design | Glassmorphism, gradientes sutis, profundidade com blur, tipografia premium | - |
| Vercel Dashboard | Layout limpo, sidebar discreta, dark mode exemplar, micro-interacoes | - |
| Asana | Gestao de tarefas visual, transicoes suaves, cores por contexto, experience flow | - |
| Plane.so | Sidebar colapsavel, issue management UI, kanban premium | 40k+ |
| Dub.co | Analytics dashboard, mesma stack (Next.js + tRPC), status indicators | 20k+ |

**Referencias Secundarias**:
| Referencia | O que pegar | Stars |
|-----------|------------|-------|
| Twenty CRM | Contact management, record detail views | 25k+ |
| Magic UI | Animated counters, text reveals, loading animations | 19k+ |
| USWDS | Form patterns, accessibility, legal workflow patterns | Gov |
| Kiranism starter | RBAC nav, multi-theme, feature-based structure | 6k+ |

**Bibliotecas de Componentes Animados**:
- Magic UI (150+ animated components)
- Motion Primitives (scroll-based reveals, cursor effects)
- Animate UI (component-level Framer Motion animations)

## DNA Visual

### Paleta (evolucao do Padrao Defender)
- **Base**: Zinc neutro (mantem)
- **Accent**: Emerald (mantem, possivelmente ajustar tonalidade)
- **Glass**: backdrop-blur + border white/10% em elementos premium
- **Gradients**: Sutis, em KPIs e elementos de destaque

### Tipografia (mantem o sistema de 3 fontes)
- **Inter** — UI geral
- **Source Serif 4** — Documentos legais
- **JetBrains Mono** — Dados, CPF, numeros de processo

### Principios de Design
1. **Conteudo primeiro** — O dado e o protagonista, nao a interface
2. **Glass seletivo** — Glassmorphism apenas em elementos especiais (KPIs urgentes, sidebar, login)
3. **Micro-interacoes com proposito** — Cada animacao comunica algo (hover = clicavel, transition = mudanca de estado)
4. **Espacamento generoso** — Mais whitespace = mais respiracao = menos carga cognitiva
5. **Hierarquia tipografica** — Tamanho + peso > cor para criar hierarquia
6. **Dark mode primeiro** — Defensores trabalham longas horas, dark mode e o modo principal

---

## Feedback por Area (coletado em sessao de avaliacao)

### SCRUM-35 — Foundation (Design System Tokens & Componentes Base)
- Atualizar tokens para novo estilo Apple/Vercel
- **Stats cards globais**: formato menor, estilo Drive Hub (aplicar em Assistidos, Processos, Agenda, Delegacoes)
- Componentes base: Button (melhorar visual dos botoes em geral), Card, Badge (manter pequenos, melhorar design), Input, Table
- Definir animacoes e transicoes padrao (Framer Motion)
- Avaliar adocao seletiva de Magic UI

### SCRUM-36 — Sidebar & Navegacao
- **Estrutura**: manter organizacao em secoes e dropdowns
- **Visual**: sidebar ESCURA com GLASS (backdrop-blur sutil + borda translucida)
- Melhorar: cores, contrastes, efeitos, transicoes de abertura/fechamento
- Referencia: macOS dock / Apple sidebar / Vercel sidebar
- TopBar: polir tipografia e espacamento
- Breadcrumbs: manter, polir

### SCRUM-37 — Dashboard Principal
- **Nivel**: POLISH (nao redesign)
- Manter estrutura (Registro Rapido > Cowork > KPIs > Prazos > Audiencias)
- Melhorar: botoes (parecem datados), espacamento (pouco respiro), tipografia, efeitos
- NAO desnaturar o que funciona

### SCRUM-38 — Demandas (Lista + Premium View)
- **Nivel**: POLISH + EVOLUCAO
- Melhorar: tipografia mais escura, espacamento, hover effects, badges de status (manter pequenos)
- **Harmonia de cores**: equilibrar melhor as cores da pagina, avaliar tipografia em preto
- **Filtros**: simplificar redundancia dos filtros de atribuicao. Filtro discreto de status prisional (preso/solto/monitorado) com 1 clique
- **Modo sheet**: evoluir para experiencia de planilha real — navegacao com cursor pela tabela, funcoes tipo Excel (agregar, calcular)

### SCRUM-39 — Assistidos & Processos (Listas + Detalhe)
- **Cards (lista)**: POLUIDO visualmente. Precisa de melhor organizacao de informacoes, hierarquia visual clara, sistematicidade
- **Detalhe do Assistido**: layout tipo Twenty/Asana — header rico (avatar grande, status, KPIs inline), sidebar de contexto, tabs com conteudo mais rico, timeline de atividade
- **Processos**: mesma filosofia dos Assistidos (cards mais clean, detalhe mais rico)
- **Barra de FASE processual**: MANTER, so polir o visual
- **Stats cards**: formato menor estilo Drive Hub

### SCRUM-40 — Drive & Documentos
- **Nivel**: REDESIGN PROFUNDO
- **Navegacao de pastas**: mais fluida, breadcrumbs melhorados, transicoes suaves
- **Preview de documentos**: PDF viewer melhor, preview inline, menos cliques para ver conteudo
- **Sidebar do Drive**: espaco vazio no topo, nao harmoniza com resto, falta efeitos de abertura, UX precisa ser premium
- Referencia: Google Drive, Notion docs

### SCRUM-41 — Agenda & Calendario
- **Stats cards**: menores, formato estilo Drive Hub
- **Filtros**: melhorar botoes
- **Calendario**: polir views de mes e semana, melhorar vista de lista
- **Modal de dia**: so mostra 2 eventos com scroll — precisa melhorar para mostrar mais
- **Modal de audiencia**: tanto o primeiro (rapido) quanto o segundo (completo) — funcionalidade otima, falta polish de UI/UX
- **Integracao**: conectar melhor com enrichment engine e dados estruturados do "sistema nervoso defensivo"

### SCRUM-42 — Cowork (Delegacoes, Equipe, Mural)
- **Nivel**: POLISH UNIFORME
- Delegacoes: KPIs + tabs funcionais, polir visual
- Mural: feed com tipos funciona bem, polir cards e bordas
- Equipe: polir cards de perfil
- Aplicar mesmos principios de tipografia, espacamento, efeitos

### SCRUM-43 — Ferramentas (Calculadoras, Inteligencia, Logica)
- **Nivel**: POLISH UNIFORME
- Inteligencia: layout 2 colunas bom, harmonizar cores das categorias com design system (roxo atual destoa)
- Calculadoras: inputs premium, resultados animados
- Logica: editor limpo

### SCRUM-44 — Modulos Especializados (Juri, VVD, EP)
- **Nivel**: POLISH UNIFORME (avaliar no browser quando prioritario)
- Aplicar mesmos principios das core pages

### SCRUM-45 — Auth Pages (Login, Register, Reset)
- **Nivel**: POLISH (nao avaliado no browser — redirect por estar logado)
- Manter dark mode como padrao
- Melhorar visual premium Apple-style, ambient glow refinado

### SCRUM-46 — Micro-Interacoes & Polish Final
- Loading states com skeletons + shimmer
- Toast notifications premium
- Empty states (ja existem, polir)
- Error states amigaveis
- Hover effects consistentes em toda app
- Page transitions suaves
- Garantir prefers-reduced-motion

---

## Decisoes Confirmadas

| Decisao | Escolha |
|---------|---------|
| Estilo geral | Hibrido Apple/Vercel/Asana (premium glass) |
| Sidebar | Escura com glass (backdrop-blur + translucent border) |
| Stats cards | Formato menor estilo Drive Hub (global) |
| Dashboard | Polish, nao redesign |
| Demandas | Polish + filtros + modo sheet Excel |
| Assistidos/Processos | Cards mais clean + detalhe tipo Twenty/Asana |
| Drive | Redesign profundo (nav + preview + sidebar) |
| Agenda | Polish + modais + integracao enrichment |
| Cowork/Ferramentas | Polish uniforme |
| Figma | Usar para prototipar mudancas significativas |

## Processo de Trabalho

1. **Avaliacao no browser** — CONCLUIDA (sessao 2026-03-02)
2. **Design no Figma** — Prototipar mudancas significativas (Drive, Assistidos detalhe, Sidebar)
3. **Implementacao por area** — Uma Story de cada vez, validando no browser
4. **Sem quebrar funcionalidade** — Cada Story e um PR isolado que nao altera logica de negocio

## Stack Tecnica da Reforma

- Tailwind CSS (ja em uso)
- shadcn/ui (ja em uso)
- Framer Motion / Motion (ja parcialmente em uso)
- Magic UI (a adicionar seletivamente)
- Figma (para prototipar mudancas)

## Metricas de Sucesso

- [ ] Consistencia visual entre todas as 109 paginas
- [ ] Dark mode perfeito (contraste 15.8:1+, padding adequado)
- [ ] Lighthouse Performance > 90
- [ ] WCAG AA compliance (contraste 4.5:1 minimo)
- [ ] Tempo de navegacao entre secoes < 2 cliques
- [ ] prefers-reduced-motion respeitado

## Ordem de Prioridade Sugerida

1. SCRUM-35 — Foundation (tokens, componentes base) — BASE PARA TUDO
2. SCRUM-36 — Sidebar (escura + glass)
3. SCRUM-37 — Dashboard (polish)
4. SCRUM-38 — Demandas (polish + filtros + sheet)
5. SCRUM-39 — Assistidos/Processos (cards + detalhe)
6. SCRUM-40 — Drive (redesign profundo)
7. SCRUM-41 — Agenda (polish + modais)
8. SCRUM-42 — Cowork (polish)
9. SCRUM-43 — Ferramentas (polish)
10. SCRUM-44 — Modulos especializados (polish)
11. SCRUM-45 — Auth pages (polish)
12. SCRUM-46 — Micro-interacoes (polish final)
