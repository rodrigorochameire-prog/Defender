# Atendimentos Redesign — Backlog técnico (derivado da spec)

> Gerado na Fase 0 (discovery). Fonte: `ombuds-atendimentos-redesign-spec.md` + mapeamento da árvore de componentes. Execução fase a fase, testes antes de refator estrutural, validação no browser, merge por fase completa. **Reaproveita a linguagem premium de `components/demandas-premium/`** (já em produção/main) — este redesign é "aplicar o padrão Demandas ao módulo Atendimentos", não greenfield.

## Mapa de componentes (estado atual)
| Área | Arquivo | Linhas | Nota |
|------|---------|-------|------|
| Page | `app/(dashboard)/admin/atendimentos/page.tsx` | 10 | wrapper → `AtendimentosView` |
| Page | `app/(dashboard)/admin/atendimentos/novo/page.tsx` | 7 | redirect legado `?novo=1` |
| **View (orquestrador)** | `components/atendimentos/atendimentos-view.tsx` | **921** | 3 views (Lista/Cards/Calendário) + filtros + KPIs + sheet + modal |
| Cards | `components/atendimentos/atendimentos-cards.tsx` | 227 | grid agrupado por dia; ações no hover |
| Calendário | `components/atendimentos/atendimentos-calendar.tsx` | 391 | grid mensal + painel do dia |
| KPIs/Insights | `components/atendimentos/atendimentos-insights.tsx` | 246 | produtividade/conversão/área/evolução (Recharts) |
| **Workspace (detalhe)** | `components/atendimentos/atendimento-detail-sheet.tsx` | **931** | seções colapsáveis: resumo/próximos passos/registros/dossiê/autos/anexos |
| Form (criar/editar) | `components/atendimentos/atendimento-form-modal.tsx` | 687 | inclui prefill de retorno + áudio |
| **Gerar demanda** | `components/atendimentos/gerar-demanda-popover.tsx` | 373 | popover; atribuição/ato/prazo/réu preso/registro inicial |
| Vínculos | `components/atendimentos/atendimento-vinculos.tsx` | 247 | ofícios + diligências (próximos passos) |
| Dossiê | `components/atendimentos/dossie-atendimento-block.tsx` | 179 | render do contexto OMBUDS |
| Config (domínio) | `components/atendimentos/config.ts` | 196 | status/área/subtipo configs + AREA→ATRIBUIÇÃO + URLs |
| Helpers | `components/atendimentos/agenda-helpers.ts` | 121 | presets de período · `isPendente` · agrupamento por dia |
| Cor de área | `components/atendimentos/area-color.ts` | 21 | hex por área |
| Status badges (compartilhado) | `components/shared/status-badge.tsx` | 384 | `StatusBadge`/`PrazoBadge`/`AreaBadge` |
| tRPC | `lib/trpc/routers/atendimentos.ts` | 900 | CRUD + transcrição + Plaud + stats + autocompletes |

**Stack de testes**: vitest + @testing-library/react (`__tests__/components/*.test.tsx`, `components/atendimentos/__tests__/*.test.ts`), Playwright (`e2e/smoke.spec.ts`). Já existem `agenda-helpers.test.ts` (115) e `config-maps.test.ts` (72).

## Base reutilizável (de `demandas-premium/`, já na main)
| Padrão da spec Atendimentos | Reusar de demandas-premium |
|------------------------------|----------------------------|
| `AtendimentoSegmentedControl` / modos | `sheet/SheetModeTabs.tsx` + `sheet/sheet-modes.ts` (chegam à main no merge do Demandas Fase 4) |
| `AtendimentoKPICard` (cockpit operacional) | `PrazoCockpitBar.tsx` + `prazo-cockpit.ts` (chips com tons danger/warn/neutral/muted) |
| Curadoria de badge (1 forte + 1 sutil) | `instituto-badge.tsx`, `StatusPipelineSelector.tsx` |
| `AtendimentoSectionPanel` / `NextStepsPanel` | `sheet/secoes-manifest.ts` + `sheet/secoes/*` |
| Gerar demanda como superfície nobre (wizard) | `pje-import-modal.tsx` (wizard 4 etapas) |
| `MetadataLine` (área·tipo em tipografia) | padrão tipográfico do `DemandaCard.tsx` |

## Riscos transversais
- **Workspace de 931 linhas + view de 921**: alto risco de regressão. Mitigação: extrair seções/hooks com contrato testado antes de mudar visual.
- **Auto-sync commita a árvore sozinho**: trabalhar em `feat/atendimentos-redesign`, commitar cedo, **stagear paths explícitos** (memória `git-add-pathspec`). Nunca `git add -A`.
- **3 view modes** (Lista/Cards/Calendário): mudança de anatomia do item precisa valer nos 3.
- **Atendimento é um `registro`** (tabela `registros`, não tabela própria) — mudanças de shape passam pela config e pelo router; cuidado com `processosCitados` (JSONB) e `dossieAtendimento` (JSONB).
- **Push na main = deploy de produção**: branch dedicada; só mergeia fase completa+testada.
- **Dependência da main**: o padrão de modos do sheet (`SheetModeTabs`) só estará na main quando `feat/demandas-redesign` mergear. Até lá, ou copiar o padrão, ou sincronizar antes da Fase 4 deste backlog.

## Backlog por fase

### Fase 0 — Discovery (concluída)
- [x] 0.1 Mapear árvore de componentes do módulo.
- [x] 0.2 Inventariar config/helpers/badges/stack de testes + base reutilizável de `demandas-premium`.
- [x] 0.3 **Baseline**: `e2e/smoke.spec.ts` estendido com bloco `describe.skip` "Atendimentos baseline" (render → trocar view → abrir workspace → agendar retorno/gerar demanda → abrir form). Hook de teste `data-atendimento-card` no card (cards-view) e na list row (view) — convenção espelhada de `data-evento-card`. Rodar manualmente com sessão logada (vide comentário no spec).

### Fase 1 — Sistema semântico e design system local (concluída — DoD: badges/cores/metadados testados, sem mudança de layout ainda)
- [x] 1.1 `AtendimentoStatusBadge`/`ReadinessBadge` (`atendimento-badges.tsx`): 1 forte (status) + 1 sutil (readiness). Status virou **fonte única central** em `lib/config/tipologia/atendimento.ts` (segue o padrão `VisualTipo`+`info()` do registry; `a_registrar` é estado de 1ª classe = agendado vencido).
- [x] 1.2 `MetadataLine`: área + tipo em **tipografia secundária** (`metadataLine` em `atendimento-semantica.ts`, usando `AREA_CONFIG`/`SUBTIPO_CONFIG`). VVD/Júri/Exec./Inicial/Retorno deixam de ser badge.
- [x] 1.3 Direção cromática no registry central: **strong** = A registrar (âmbar) + Cancelado (rosa); **soft** = Realizado (esmeralda) + Agendado (sky). Campos `tone`/`strength` tornam a régua testável.
- [x] 1.4 **Testes**: `__tests__/unit/tipologia-atendimento.test.ts` (resolução de status + tom/força + paleta), `atendimento-semantica.test.ts` (metadataLine + readiness), `__tests__/components/atendimento-badges.test.tsx` (render + 1 só badge forte). 24/24 ✓.
- **Pendente p/ Fase 2** (rewiring, fora do DoD da Fase 1): consumir os primitivos nas cards/list rows e aposentar `STATUS_CONFIG`/`SUBTIPO_CONFIG`/chip âmbar inline de `config.ts`/`atendimentos-cards.tsx`/`atendimentos-view.tsx`.

### Fase 2 — Lista / fila operacional (concluída)
- [x] 2.1 Header (padrão Demandas: `CollapsiblePageHeader`+`HeaderSlotTitle`, busca, CTA Novo) + KPIs operacionais (A registrar · Hoje · Próximos 7 dias · Realizados no mês) **já existiam**; mantidos.
- [x] 2.2 `AtendimentoSegmentedControl`: modos **Visão geral · A registrar · Agenda · Histórico** numa barra do corpo (rótulo + ícone + contador de A registrar). Fonte única `atendimento-modos.ts` (`modeFilters` puro/testado) que deriva status + `apenasPendentes`. **Substituiu as pills de status**; vista "Agenda"→"Calendário" p/ evitar colisão de nome. Período/tipo/área seguem no popover.
- 2.3 `AtendimentoListRow`/`AtendimentoCard`: anatomia da spec (L1 hora+status … L6 ação+overflow); **1 ação dominante** (Gerar demanda só quando for próximo passo; Registrar domina pendência).
  - [x] **cards-view** (`atendimentos-cards.tsx`): consome `AtendimentoStatusBadge` (1 forte; chip âmbar inline + `STATUS_CONFIG` aposentados aqui), `MetadataLine` (área·tipo em texto, com `areaLabel` fiel à atribuição do processo) e `ReadinessBadge` (sutil; sparkle do rodapé migrado). Acento de cor da área preservado na barra lateral.
  - [x] **list-row** (`AtendimentoCard` em `atendimentos-view.tsx`): status saiu da coluna estreita da hora p/ a linha do nome (eleva o sinal "A registrar"); subtipo/área-chip → `MetadataLine`; sparkle do dossiê → `ReadinessBadge`. `STATUS_CONFIG`/`SUBTIPO_CONFIG`/`Sparkles` aposentados no arquivo. Acento + wash da área preservados.
  - [x] **calendário** (`atendimentos-calendar.tsx`, painel do dia): status inline → `AtendimentoStatusBadge` (compacto, sem ícone); área/subtipo coloridos → `MetadataLine`; + `ReadinessBadge`. `STATUS_CONFIG`/`SUBTIPO_CONFIG` aposentados. Acento âmbar/área preservado. **Rewiring da anatomia (2.3) concluído nas 3 vistas.**
- [x] 2.4 "A registrar" é fila prioritária: modo dedicado + KPI clicável (atalho) + banner contextual; "Histórico" (realizados/passado) separado de "Agenda" (agendados/próximos).
- 2.5 **Testes**: [x] `atendimento-modos.test.ts` (ordem dos modos + `modeFilters`); [x] `areaLabel` override em `metadataLine`; [x] baseline e2e atualizado (modos + "Calendário"). _Pendente_: teste de integração da card (render com trpc mockado) afirmando 1 só badge forte + metadata em texto.

> **Fase 2 fecha aqui.** Próximo: Fase 3 — Workspace do atendimento (`atendimento-detail-sheet.tsx`).

### Fase 3 — Workspace do atendimento
- 3.1 `AtendimentoWorkspaceShell` + `AtendimentoSectionPanel`: 5 áreas-mãe (Resumo · Motivo e pedido · Próximos passos · Registros · Contexto jurídico).
- 3.2 Protagonismo ao motivo/pedido; `NextStepsPanel` (atualizar contexto/dossiê/agendar retorno/gerar demanda).
- 3.3 `CaseContextPanel`: contexto OMBUDS como inteligência assistida premium (refinar `dossie-atendimento-block.tsx`); situação processual/processos/vínculos/autos.
- 3.4 `TimelineItemRefined`: registros em cards leves; ações secundárias em overflow.
- 3.5 **Testes**: abrir workspace; seções renderizam; próximos passos disparam fluxos; timeline render; vínculo com demanda perceptível.

### Fase 4 — Agendar retorno (`ScheduleReturnModalRefined`)
- 4.1 Modular em 4 blocos (Agendamento · Contexto · Registro complementar · Desfecho).
- 4.2 `DateTimeFieldRefined`; `ProcessSelector` com relevância visual maior.
- 4.3 `OutcomeChoiceCardGroup`: desfecho em cards de escolha (não radios); remover redundância Cancelar/Fechar.
- 4.4 **Testes**: blocos presentes; seleção de desfecho; processo vinculado; mobile full-screen/CTA fixo.

### Fase 5 — Gerar demanda (`GenerateDemandPanel`)
- 5.1 Promover de popover a superfície nobre (painel/sheet) em 5 blocos (Origem · Definição jurídica · Regime de urgência · Conteúdo inicial · Confirmação) — refatorar `gerar-demanda-popover.tsx`.
- 5.2 `ProceduralActSelector` premium (busca + agrupamento por atribuição via `getAtosPorAtribuicao`); controles de prazo melhores.
- 5.3 **Revisar renderização do texto importado** (sanitizar/limpar tags HTML cruas do registro); vínculo da timeline como decisão de continuidade.
- 5.4 **Testes**: blocos/etapas; seleção de ato; texto importado limpo; cria demanda + vínculo; CTA final inequívoco.

### Fase 6 — Mobile
- 6.1 `AtendimentoMobileCard` (1 ação dominante; metadados secundários discretos) + `AtendimentoStickyFilters` (KPIs grid 2x2/carrossel; aba "A registrar" acessível).
- 6.2 Workspace mobile: header sticky · seções navegáveis · `AtendimentoContextSheet` (contexto OMBUDS em sheet/accordion) · `AtendimentoActionSheet` (ações rápidas).
- 6.3 Agendar retorno / Gerar demanda full-screen com CTA ancorado no rodapé.
- 6.4 **Testes**: breakpoints críticos (full-screen sheet/modal; alvo de toque; filtros recolhidos).

### Fase 7 — QA final + estados especiais
- 7.1 Skeletons coerentes por área. 7.2 Empty states (lista/registros/autos/contexto). 7.3 Erro + sucesso contextual. 7.4 A11y final (badges/filtros/campos/CTAs). 7.5 QA visual desktop/mobile; densidade final; consistência lista↔workspace↔fluxos.

## Ordem recomendada
0 → 1 → 2 → 3 → 4 → 5 → 6 → 7, mergeando cada fase completa+testada na main. Fase 1 (semântica de badges/cores) destrava o ganho visual mais barato; Fases 3 e 5 (workspace e gerar demanda) são as de maior valor.
