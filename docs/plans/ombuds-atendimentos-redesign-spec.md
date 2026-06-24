# OMBUDS — Reformulação UI/UX do módulo Atendimentos (SPEC)

> Fonte de verdade do redesign do módulo `admin/atendimentos`. Execução spec-driven, TDD, fatiada em fases, com validação incremental. Quando houver conflito entre o visual atual e esta proposta, **prevalece esta proposta** — desde que regra de negócio e fluxos críticos sejam preservados. Irmã da spec `ombuds-demandas-redesign-spec.md`: reaproveita a linguagem visual premium já estabelecida em `components/demandas-premium/`.

## Objetivo
Tornar Atendimentos mais **clean, refinado, premium, sóbrio e operacional**, preservando densidade funcional. O problema não é funcional — é de **arquitetura perceptiva, curadoria visual, hierarquia semântica e excesso de sinalização simultânea**.

## Leitura correta do módulo
Atendimentos **não é uma agenda**. É um sistema integrado de continuidade do caso: (1) agenda de atendimentos · (2) fila operacional de registro/fechamento · (3) histórico cronológico · (4) workspace de triagem e continuidade jurídica · (5) origem de geração de demanda. O redesign deve reforçar que **cada item pode evoluir** para registro · orientação · retorno · demanda · vínculo processual.

## Problema-mãe
Mistura de muitas semânticas com o **mesmo peso visual**. No card da lista convivem status operacional, área (VVD/Exec./Júri), tipo (Inicial/Retorno), readiness (contexto preparado) e CTA (Gerar demanda) — todos como badge/cor. O usuário vê um mosaico de etiquetas concorrentes em vez de uma unidade de trabalho.

## Princípios de redesign
1. **Status primeiro, taxonomia depois** — status orienta a ação; área e tipo não competem com status nem com o CTA.
2. **Cor para exceção, ação e pendência** — cor forte só para pendência real, ação principal e estado crítico. Nunca para taxonomia interna.
3. **Um fluxo dominante por superfície** — cada tela responde "qual é o próximo passo aqui?".
4. **Menos badges, mais tipografia** — área/tipo/metadados migram para tipografia secundária.
5. **Continuidade do caso como eixo** — a ponte atendimento → demanda é protagonista.

## Sistema semântico de badges e cores (regra principal)
Em cards/list rows: **1 badge forte por item + 1 badge sutil opcional + o resto em texto secundário.**

| Camada | Conteúdo | Tratamento |
|--------|----------|-----------|
| **Badge forte** | status operacional principal (A registrar · Realizado · Cancelado · Agendado) | cor semântica perceptível |
| **Badge sutil (opcional)** | readiness / qualidade de preparação (ex.: Contexto preparado) | tonalidade contida |
| **Texto secundário** | área + tipo + identificadores | tipografia, sem badge |

**Nunca como badge forte:** VVD · Exec. · Júri · Inicial · Retorno. Migrar para metadado textual: `Violência Doméstica · Inicial`, `Tribunal do Júri · Retorno`, `Execução Penal · Inicial`.

**Direção cromática:** destaque perceptível em → A registrar/pendência ativa, Cancelado/falha, ação principal. Tonalidade contida em → Realizado, Contexto preparado, Agendado regular. Evitar cromatizar área, tipo e identificadores curtos.

## Arquitetura de informação — 4 modos
`Visão geral` · `A registrar` · `Agenda` · `Histórico`. Hoje tudo se mistura numa linha de filtros+KPIs; o redesign transforma isso em segmentação operacional explícita.

## Superfícies

### A. Visão lista (fila inteligente de continuidade)
- **Header**: título + subtítulo contextual + CTA `Novo atendimento` + KPIs em mini-cards.
- **Barra principal**: busca · segmentação por status/modo · alternância Lista/Cards/Agenda · filtros avançados · insights em camada secundária.
- **KPIs operacionais (não só contadores)**: A registrar · Hoje · Próximos 7 dias · Realizados no mês.
- **Anatomia do item**: L1 hora + status (tipo em linha secundária) · L2 assistido · L3 área · tipo (texto) · L4 CNJ/SOLAR · L5 readiness · L6 ação principal + overflow.
- **Regras**: 1 ação dominante por item. `Gerar demanda` só é principal quando for o próximo passo natural; `Registrar/Marcar realizado` domina quando há pendência operacional.
- **Mobile**: filtros sticky · KPIs em grid 2x2 ou carrossel curto · card com 1 ação dominante · aba "A registrar" muito acessível.

### B. Workspace do atendimento (5 áreas-mãe)
1. **Resumo** — tipo, data, hora, status, assistido, CPF, área, SOLAR, unidade, vínculos úteis.
2. **Motivo e pedido** — descrição principal do caso (protagonismo ao texto relatado).
3. **Próximos passos** — atualizar contexto · dossiê dos autos · agendar retorno · gerar demanda.
4. **Registros** — timeline + anotações + busca/filtro · ações secundárias em menus contextuais.
5. **Contexto jurídico** — contexto OMBUDS (painel premium de inteligência assistida) · situação processual · processos · vínculos · documentos/autos · recepção/SOLAR.
- **Regras**: protagonismo ao motivo; "Contexto OMBUDS" como inteligência assistida premium; ações textuais rebaixadas a grupos; vínculo com demanda mais perceptível.
- **Mobile**: header sticky · seções navegáveis · timeline em cards · painel de ações rápidas · contexto OMBUDS em accordion/sheet.

### C. Agendar retorno (modal/sheet, 4 blocos)
1. **Agendamento** — assistido · data · hora · tipo · área.
2. **Contexto** — pedido · assunto · local · SOLAR · processo vinculado · processos citados.
3. **Registro complementar** — anotações da recepção · registrar como realizado · áudio.
4. **Desfecho** — só atendimento · gerar demanda · atendimento e orientação.
- **Regras**: desfecho em **cards de escolha** (não radios crus); data/hora com controles refinados; processo vinculado com maior relevância; remover redundância `Cancelar`+`Fechar`.
- **Mobile**: full-screen/sheet alto · CTA fixo no rodapé · blocos separados por função.

### D. Gerar demanda a partir do atendimento (superfície nobre, 5 blocos)
1. **Origem** — assistido · atendimento · processo.
2. **Definição jurídica** — atribuição · ato a praticar.
3. **Regime de urgência** — prazo · réu preso · urgente.
4. **Conteúdo inicial** — texto importado do atendimento · vínculo da timeline.
5. **Confirmação** — resumo da demanda · CTA final.
- **Regras**: `Ato a praticar` como **seletor premium** (busca + agrupamento); controles de prazo melhores; vínculo da timeline como decisão de continuidade; **revisar renderização do texto importado** (evitar tags HTML cruas).
- **Mobile**: tela cheia/sheet expandido · resumo fixo do assistido/processo · CTA ancorado no rodapé.

### E. Sistema de ações
Hoje competem: Gerar demanda · Registrar/abrir · Marcar realizado · Registrar realização · Atualizar contexto · Agendar retorno. **Regra:** 1 ação principal dominante por superfície; secundárias vão para overflow / barra contextual / agrupamento "Próximos passos".

## Inventário de componentes a criar/refatorar
- **Shell/layout**: `AtendimentoModuleHeader` · `AtendimentoFiltersBar` · `AtendimentoKPICard` · `AtendimentoSegmentedControl` · `AtendimentoListRow` · `AtendimentoCard` · `AtendimentoWorkspaceShell` · `AtendimentoSectionPanel` · `NextStepsPanel`.
- **Semântica/estados**: `StatusBadge` · `ReadinessBadge` · `MetadataLine` · `PriorityIndicator` · `CaseContextPanel` · `TimelineItemRefined`.
- **Fluxos**: `ScheduleReturnModalRefined` · `GenerateDemandPanel` · `ProcessSelector` · `ProceduralActSelector` · `DateTimeFieldRefined` · `OutcomeChoiceCardGroup`.
- **Mobile**: `AtendimentoStickyFilters` · `AtendimentoActionSheet` · `AtendimentoMobileCard` · `AtendimentoContextSheet`.

## TDD
Testar **contrato/comportamento/fluxo/acessibilidade/responsividade**, não estética. Cobrir: render da lista · filtros por status · troca Lista/Cards/Agenda · item "A registrar" · abrir workspace · agendar retorno · gerar demanda · vínculo da timeline · mobile dos componentes-chave · a11y de badges/filtros/campos/CTAs. Escrever/ajustar testes **antes** das refatorações críticas.

## Definition of Done
Lista mais limpa e hierárquica, menos poluída · "A registrar"/pendências priorizadas · área e tipo como metadado tipográfico consistente · workspace em blocos claros de compreensão e continuidade · contexto OMBUDS valorizado · agendar retorno mais leve · gerar demanda promovido a superfície nobre · mobile tão refinado quanto desktop · fluxos críticos protegidos por testes e QA.

---
*(Spec fornecida pelo usuário; salva como fonte de verdade para execução por Claude Code. Versão integral original no histórico da conversa.)*
