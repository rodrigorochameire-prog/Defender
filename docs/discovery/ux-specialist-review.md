# UX Specialist Review — Phase 6

> **Brownfield Discovery** | Revisado por @ux-design-expert (Uma)
> **Data:** 2026-03-25
> **Projeto:** OMBUDS — Sistema de Gestao de Casos para Defensoria Publica
> **Documento base:** `technical-debt-DRAFT.md` v1.0

---

## Respostas ao Architect

### 1. O design system v10.0 tem documentacao formal (Storybook, Figma, ou similar)?

**NAO.** Nao existe Storybook (nenhum diretorio `.storybook/`), nenhuma referencia a Figma no codigo, e nenhum arquivo de documentacao formal do design system. O design system existe apenas como implementacao em `globals.css` (tokens CSS v10.0) e nos proprios componentes. As variaveis de design tokens em HSL sao bem definidas, mas a documentacao e implicitamente o codigo.

**Impacto:** Sem documentacao visual, nao ha fonte de verdade para novos componentes. Isso explica diretamente a proliferacao de variantes duplicadas (stats cards, page headers) — cada nova pagina "reinventa" o componente porque nao ha catalogo para consultar.

**Recomendacao:** Priorizar a criacao de um Storybook minimo com os 30 componentes UI + 10 componentes shared mais usados. Estimativa: 16-24h para setup inicial + catalogacao.

---

### 2. Qual o impacto real de acessibilidade no contexto de defensores publicos?

**IMPACTO ELEVADO — mais do que aparenta.** O contexto juridico amplifica a necessidade de acessibilidade:

1. **Defensores com deficiencia visual/motora** — A Defensoria Publica, como orgao do estado, e obrigada a garantir acessibilidade para seus proprios servidores (Decreto 5.296/2004, LBI 13.146/2015). Defensores com baixa visao ou deficiencia motora DEVEM poder usar a ferramenta.

2. **Uso sob pressao cognitiva** — Defensores em audiencia, no plenario do Juri, ou atendendo reus presos operam sob stress e fadiga. Boas praticas de acessibilidade (contraste, hierarquia visual, tamanhos de toque adequados) beneficiam TODOS os usuarios nessas condicoes.

3. **Conformidade institucional** — Se o OMBUDS for adotado institucionalmente pela Defensoria Publica (nao apenas uso individual), a ferramenta precisa cumprir WCAG 2.1 AA como requisito legal para sistemas de orgaos publicos (e-MAG - Modelo de Acessibilidade em Governo Eletronico).

4. **Uso mobile em campo** — Defensores visitam presidios, delegacias e foruns com iluminacao variavel. Contraste adequado e tamanhos de toque sao essenciais.

**Conclusao:** A severidade de UX-005 (acessibilidade) deve ser elevada de MEDIUM para **HIGH**. Nao e apenas inclusao — e requisito legal para adocao institucional.

---

### 3. Os componentes duplicados (5 stats cards) sao variantes intencionais ou evolucao organica?

**EVOLUCAO ORGANICA confirmada pela analise do codigo.** Evidencias:

| Componente | Evidencia de evolucao |
|------------|----------------------|
| `stats-card.tsx` (223 linhas) | Versao original — usa cores raw (`text-emerald-600`, `bg-zinc-100`), sem tokens semanticos. Inclui `StatsGrid` e `StatRow`. |
| `stats-card-compact.tsx` (99 linhas) | Reescrita simplificada — docstring diz "Segue o padrao visual de Demandas/Dashboard". Duplica `StatsGrid` com API diferente (2\|3\|4 vs 2-8 colunas). |
| `stats-card-enhanced.tsx` (192 linhas) | Terceira iteracao — usa tokens semanticos (`bg-card`, `text-foreground`). Exporta `StatsCard` com mesmo nome da original, causando conflito de import. Inclui OUTRO `CompactStatsCard` interno. |
| `stats-card-premium.tsx` (172 linhas) | Quarta iteracao — docstring "Combina visual clean do Dashboard + efeitos hover das Demandas". Adiciona `href` prop, efeito `hover:-translate-y-0.5`, `Link` support. |
| `kpi-card-premium.tsx` (212 linhas) | Quinta iteracao — muda prop `label` para `title`, usa sistema de gradientes por cor (emerald/blue/amber/rose/violet/zinc), adiciona `size` prop. Usa `<a>` ao inves de `Link`. |
| `page-layout.tsx` StatCard | Sexta variante — sistema CSS-class (`stat-card`), completamente diferente das outras. |

**Diagnostico:** Cada variante foi criada para uma pagina especifica, copiando e evoluindo a anterior. As diferencas reais sao: (a) tokens vs cores raw, (b) presenca de `href`/`Link`, (c) sistema de sizing, (d) efeitos hover. Todas poderiam ser um unico componente com props de variante.

**Agravante:** `stats-card-enhanced.tsx` exporta `StatsCard` com o mesmo nome de `stats-card.tsx`, o que cria ambiguidade de import e risco de usar a versao errada.

---

### 4. Ha planos de suporte a impressao para pecas processuais e oficios?

**MINIMO e ad-hoc.** Apenas 2 pontos de impressao encontrados no codigo:

1. **Juri Relatorio** (`admin/juri/relatorio/[avaliacaoId]/page.tsx`) — Unico arquivo com `@media print` (estilos basicos: sticky→static, font-size 12px, hide `.print:hidden`). Tem botao de impressao.
2. **Ficha do Assistido** (`assistidos/[id]/_components/ficha-sheet.tsx`) — Chama `window.print()` mas **sem nenhum estilo `@media print`** dedicado, ou seja, imprime o layout da tela como esta.

**Ausentes (criticos para Defensoria):**
- Oficios (pagina oficial, requer cabecalho institucional)
- Modelos de documentos (templates juridicos)
- Pareceres (opiniao tecnica formal)
- Processos (resumo processual)
- Relatorios estatisticos

**Conclusao:** A severidade de UX-009 deve ser elevada de LOW para **MEDIUM-HIGH**. Para uma ferramenta juridica, a impressao de documentos e um fluxo central, nao periferico. Defensores precisam imprimir oficios, pareceres e fichas de atendimento regularmente.

---

## Debitos Validados

| ID | Debito | Sev. DRAFT | Sev. Validada | Horas Est. | Impacto UX | Impacto Visual | Notas |
|----|--------|-----------|--------------|-----------|-----------|---------------|-------|
| UX-001 | Zero error boundaries (0 `error.tsx` em 134 rotas) | CRITICAL | **CRITICAL** | 8-12h | **ALTO** — usuario perde trabalho sem feedback | Baixo | Confirmo severidade. Adicionar `error.tsx` no root, admin, e rotas data-heavy (juri, processos, drive). Prioridade P1 de UX. |
| UX-002 | Sem validacao de formularios (useState/FormData raw) | HIGH | **HIGH** | 40-60h | **ALTO** — erros nao aparecem nos campos, dados invalidos | Medio | Confirmo. Escopo grande: estimar 40-60h considerando ~50+ formularios. Adotar react-hook-form + Zod. Iniciar pelas rotas de CRUD (assistidos, processos, demandas). |
| UX-003 | Componentes monoliticos (10+ arquivos >1000 linhas) | HIGH | **HIGH** | 32-48h | **MEDIO** — performance de render em paginas pesadas | Baixo | Confirmo. Impacto UX principal: lag de interacao em PdfViewerModal (3.671 linhas) e Cockpit do Juri (2.695 linhas). Decompor por area funcional. |
| UX-004 | Componentes duplicados (5 stats cards, 4 headers, 2 empty states) | HIGH | **HIGH** | 16-24h | **MEDIO** — inconsistencia visual entre paginas | **ALTO** | Confirmo e elevo impacto visual. 6 variantes de stats card (incluindo page-layout.tsx), 3 StatsGrid duplicados, nomes de export conflitantes. Consolidar em 1 StatsCard com variant/size props. |
| UX-005 | Acessibilidade fraca (33 ARIA, sem skip nav, `<div onClick>`) | MEDIUM | **HIGH** | 24-32h | **ALTO** — exclusao de usuarios, barreira legal para adocao institucional | Baixo | **ELEVADO de MEDIUM para HIGH.** 24 `<div onClick>` em 15 arquivos. Apenas 34 aria attrs em 20 arquivos. `prefers-reduced-motion` so em 1 arquivo (globals.css). Zero skip-nav funcional. Requisito legal (e-MAG) se adocao institucional. |
| UX-006 | 117 de 125 rotas admin sem `loading.tsx` | MEDIUM | **MEDIUM** | 12-16h | **MEDIO** — tela branca durante carregamento | Baixo | Confirmo. O fallback global `<Suspense>` com `<LoadingSpinner>` mitiga parcialmente, mas e generico. Priorizar rotas com data fetching pesado (juri, oficios, relatorios). Skeletons ja existem — so precisam ser conectados. |
| UX-007 | Toast como unico feedback de erro (944 usos) | MEDIUM | **MEDIUM** | 16-24h | **ALTO** — erros de formulario desaparecem em 3s | Medio | Confirmo. Toasts sao efemeros — inadequados para erros de validacao. Precisa de inline errors (resolvido parcialmente com UX-002) + alert banners para erros persistentes (offline, falha de sync). |
| UX-008 | Mix de tokens e cores raw (emerald-600, zinc-900) | MEDIUM | **MEDIUM** | 8-12h | Baixo | **MEDIO** — inconsistencia de cores entre temas | Confirmo. Verificado nos proprios stats cards: `stats-card.tsx` usa `text-emerald-600`, `bg-zinc-100`, enquanto `stats-card-enhanced.tsx` usa `bg-card`, `text-foreground`. Mudanca de marca exigiria tocar dezenas de arquivos. |
| UX-009 | Sem print styles (1 arquivo com `@media print`) | LOW | **MEDIUM-HIGH** | 20-28h | **ALTO** — documentos juridicos nao imprimem adequadamente | Medio | **ELEVADO de LOW para MEDIUM-HIGH.** Apenas juri relatorio tem `@media print`. Ficha do assistido chama `window.print()` sem estilos. Oficios, pareceres, modelos — todos sem suporte. Impressao e fluxo central na Defensoria. |
| UX-010 | Dois sistemas de layout (CSS-class + component-based) | LOW-MEDIUM | **LOW-MEDIUM** | 12-16h | Baixo | Baixo | Confirmo. 99 usos de CSS-class layouts em 13 arquivos (principalmente paginas mais novas). 49 usos de `stat-card` CSS class. Modelo mental dividido, mas funcional. Prioridade baixa — migrar gradualmente para component-based. |

---

## Debitos Adicionados

### UX-011: Ausencia de React.memo / memoizacao em componentes pesados (SEVERITY: MEDIUM)

**Descoberta:** Apenas 3 usos de `React.memo` em todo o projeto (2 no PdfViewerModal, 1 no DemandaCompactView). Em um app com 363 componentes e paginas com 2000+ linhas, a ausencia de memoizacao causa re-renders desnecessarios.

**Impacto UX:** Lag perceptivel em paginas data-heavy (dashboard com 20+ stats cards, Kanban com dezenas de cards, tabelas com 100+ linhas).

**Horas:** 8-12h (identificar componentes puros e aplicar memo seletivamente)

**Recomendacao:** Aplicar `React.memo` em: StatsCard, EntityCard, EntityRow, DataTable rows, Kanban cards. Usar `useMemo` para listas filtradas em Demandas e Processos.

---

### UX-012: Ausencia de focus management em modais e sheets (SEVERITY: MEDIUM)

**Descoberta:** Nenhum uso de `focus-trap` customizado (1 referencia encontrada, em `clipboard.ts` — nao relacionado). O Radix UI provee focus trapping automatico nos seus Dialog/Sheet, mas componentes custom (como modais inline, popovers do sidebar) nao tem.

**Impacto UX:** Usuarios de teclado podem "perder" o foco ao abrir paineis laterais ou modais customizados. No contexto de audiencia (Cockpit do Juri), isso interrompe o fluxo de trabalho.

**Horas:** 6-8h

**Recomendacao:** Auditar modais/sheets customizados. Garantir que todos usem Radix Dialog ou implementem focus trap. Adicionar `autoFocus` no primeiro campo interativo.

---

### UX-013: Ausencia de Storybook / catalogo visual de componentes (SEVERITY: MEDIUM)

**Descoberta:** Zero configuracao de Storybook, zero referencia a Figma, zero documentacao visual. O design system v10.0 existe apenas no codigo.

**Impacto UX:** Indireto mas significativo — e a causa raiz da duplicacao de componentes (UX-004). Sem catalogo, cada nova feature reinventa componentes.

**Horas:** 16-24h (setup + catalogacao dos 30 UI + 15 shared components principais)

**Recomendacao:** Instalar Storybook para Next.js. Criar stories para: Button, Input, Select, StatsCard (consolidado), PageHeader (consolidado), EmptyState, DataTable, Badge, Dialog, Sheet. Isso serve tambem como base para testes visuais futuros.

---

### UX-014: `<a href>` vs `<Link>` inconsistente em componentes de navegacao (SEVERITY: LOW)

**Descoberta:** `kpi-card-premium.tsx` usa `<a href>` (linha 182) com comentario "Importar Link dinamicamente nao funciona bem", enquanto `stats-card-premium.tsx` usa `<Link>` do Next.js corretamente. Isso causa full page reloads desnecessarios.

**Impacto UX:** Navegacao via KPI cards causa flash branco (full reload) ao inves de transicao SPA suave.

**Horas:** 2h

**Recomendacao:** Substituir `<a href>` por `<Link>` do Next.js em todos os componentes de navegacao.

---

### UX-015: Ausencia de feedback haptico / visual em acoes destrutivas (SEVERITY: LOW-MEDIUM)

**Descoberta:** O `ConfirmDialog` existe para acoes destrutivas, mas 944 toasts sao usados como feedback primario. Nao ha confirmacao visual pos-acao (animacao de sucesso, transicao de estado). Acoes como "deletar processo" ou "arquivar demanda" nao tem peso visual proporcional a sua gravidade.

**Impacto UX:** Em um sistema juridico, acoes irreversiveis precisam de feedback claro. O toast de 3s pode passar despercebido, especialmente sob pressao em audiencia.

**Horas:** 8-12h

**Recomendacao:** Adicionar: (1) confirmacao com delay para acoes destrutivas criticas (ex: "Tem certeza? Aguarde 3s..."), (2) animacao de sucesso/feedback inline apos acoes, (3) undo para acoes reversiveis (soft delete).

---

## Recomendacoes de Design

### 1. Consolidacao de StatsCard — Proposta de API Unificada

Consolidar as 6 variantes em um unico componente:

```tsx
<StatsCard
  label="Total de Processos"
  value={142}
  icon={Scale}
  variant="success"        // default | success | danger | warning | info | primary
  size="md"                // compact | sm | md | lg
  visual="clean"           // clean | gradient | premium
  trend={{ value: 12, direction: "up" }}
  subtitle="Ativos"
  href="/admin/processos"  // suporta Link interno
  onClick={handleClick}    // alternativa a href
  loading={false}          // skeleton integrado
/>
```

**Migracao:** Criar o componente unificado, depois migrar pagina por pagina. Manter exports legados como aliases durante a transicao.

---

### 2. Sistema de Print Styles para Documentos Juridicos

Criar um utilitario de impressao reutilizavel:

1. **`PrintLayout` wrapper** — componente que aplica estilos de impressao (margens A4, cabecalho institucional, fonte serif para texto juridico)
2. **Classes utilitarias** — `print:hidden`, `print:block`, `print:text-black`, `print:bg-white`, `screen:hidden`
3. **Paginas de impressao dedicadas** — `/admin/oficios/[id]/print`, `/admin/assistidos/[id]/ficha-print`
4. **Cabecalho institucional** — Logo da Defensoria, nome da comarca, defensor, data

**Prioridade:** Oficios > Ficha do Assistido > Pareceres > Relatorios

---

### 3. Plano de Acessibilidade Incremental

**Sprint 1 (8h) — Quick wins:**
- Adicionar skip-to-content link no layout root
- Substituir 24 `<div onClick>` por `<button>` em 15 arquivos
- Adicionar `aria-label` em botoes icon-only do sidebar e header
- Estender `prefers-reduced-motion` para todas as animacoes em globals.css

**Sprint 2 (8h) — Navegacao:**
- Adicionar `aria-current="page"` nos items de navegacao ativos
- Garantir `aria-live="polite"` para atualizacoes dinamicas (contadores, status)
- Auditar contraste de cores nos 3 temas (light, medium, dark)

**Sprint 3 (8h) — Formularios:**
- Integrar com react-hook-form para `aria-invalid`, `aria-describedby` nos campos
- Adicionar `<label>` associados a todos os inputs
- Garantir tab order logico nas paginas de CRUD

**Sprint 4 (8h) — Avancado:**
- Focus management em modais customizados
- Testes com screen reader (VoiceOver no macOS)
- Documentar nivel WCAG atingido

---

### 4. Hierarquia de Feedback de Erro

Substituir o modelo "toast para tudo" por uma hierarquia:

| Tipo de Erro | Mecanismo | Duracao | Exemplo |
|-------------|-----------|---------|---------|
| Validacao de campo | Inline (abaixo do campo) | Persistente ate corrigir | "CPF invalido" |
| Erro de acao | Toast | 5s | "Falha ao salvar. Tente novamente." |
| Erro de sistema | Alert banner (topo) | Persistente ate resolver | "Modo offline — dados serao sincronizados" |
| Erro critico | Error boundary (pagina) | Persistente | "Algo deu errado. Recarregue a pagina." |
| Acao destrutiva | ConfirmDialog + undo | 10s para undo | "Processo arquivado. [Desfazer]" |

---

### 5. Priorizacao Final (Perspectiva UX)

A priorizacao deve considerar: **impacto na experiencia do usuario > conformidade legal > consistencia visual**

| Prioridade | ID | Debito | Justificativa UX |
|-----------|-----|--------|-----------------|
| **P1** | UX-001 | Error boundaries | Usuario perde trabalho sem feedback. Crash silencioso e o pior cenario UX. |
| **P2** | UX-002 + UX-007 | Validacao de forms + hierarquia de erro | 50+ formularios sem validacao client-side. Erros so via toast efemero. |
| **P3** | UX-005 | Acessibilidade | Requisito legal para adocao institucional. Quick wins em 8h. |
| **P4** | UX-009 | Print styles | Fluxo central da Defensoria. Oficios e fichas precisam de impressao. |
| **P5** | UX-004 + UX-013 | Consolidar duplicados + Storybook | Causa raiz da divergencia visual. Previne futuras duplicacoes. |
| **P6** | UX-003 | Decompor monolitos | Performance e manutencao. PdfViewerModal e Cockpit sao criticos. |
| **P7** | UX-006 | Loading states | 117 rotas sem loading.tsx. Skeletons ja existem — so conectar. |
| **P8** | UX-011 | Memoizacao | Performance em paginas data-heavy. |
| **P9** | UX-008 + UX-010 | Tokens + layout unificado | Consistencia de longo prazo. Migrar gradualmente. |
| **P10** | UX-012 + UX-014 + UX-015 | Focus management, Link, feedback | Polimento. Resolver conforme encontrar. |

---

## Resumo de Horas Estimadas

| Categoria | Horas Min | Horas Max |
|-----------|----------|----------|
| Debitos existentes (UX-001 a UX-010) | 189 | 262 |
| Debitos novos (UX-011 a UX-015) | 40 | 58 |
| **Total** | **229** | **320** |

**Estimativa realista para 1 desenvolvedor:** 6-8 semanas de trabalho focado, priorizando P1-P4 nas primeiras 2 semanas.

---

## Ajustes Solicitados ao DRAFT

1. **UX-005:** Elevar severidade de MEDIUM para **HIGH** (justificativa legal detalhada acima)
2. **UX-009:** Elevar severidade de LOW para **MEDIUM-HIGH** (impressao e fluxo central)
3. **UX-004:** Adicionar nota sobre 6 variantes (nao 5) e conflito de nome de export
4. **Priorizacao Tier 4:** Mover UX-005 (acessibilidade) do Tier 4 para **Tier 2** — nao e otimizacao, e fundacao
5. **Priorizacao Tier 4:** Mover UX-009 (print) para **Tier 3** — nao e otimizacao, e funcionalidade core

---

*Revisao completa. Pronto para Phase 7 (@qa QA Review).*
