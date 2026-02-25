# Feature: Solar Hub — Painel de Controle da Integração

## Contexto

A página Solar (`/admin/intimacoes`) já possui uma caixa de entrada funcional que mescla avisos VVD e Solar com KPIs e ações de "Dar ciência". O objetivo é evoluí-la para um **painel de controle completo** com abas para monitoramento, operações batch, sync de fases e logs — sem duplicar funcionalidades que já existem nas páginas de assistido e processo.

**Princípio**: Hub = funcionalidades sem contexto pai (monitoramento, inbox, batch, logs). Ações contextuais (export individual, sync individual) ficam em suas páginas de origem.

---

## User Stories

### US-01: Monitorar saúde da integração
**Como** defensor
**Quero** ver de relance se Solar, SIGAD e Engine estão online
**Para** saber se posso executar operações de sync antes de começar

#### Critérios de Aceitação
- [ ] CA-01: Indicadores visuais (🟢/🔴/🟡) para Solar, SIGAD e Enrichment Engine
- [ ] CA-02: Tempo da sessão Solar visível ("sessão: 23min")
- [ ] CA-03: Botão "Re-autenticar" visível quando sessão expirada (>30min)
- [ ] CA-04: Botão "Atualizar" faz refetch de todos os dados
- [ ] CA-05: Status atualiza automaticamente a cada 30s (staleTime)

### US-02: Gerenciar caixa de entrada unificada (evolução)
**Como** defensor
**Quero** filtrar avisos por tipo, urgência e fonte
**Para** priorizar as pendências mais críticas do dia

#### Critérios de Aceitação
- [ ] CA-06: Sub-filtros funcionais: Todos | Pendentes | Urgentes | Vencidas
- [ ] CA-07: Filtro por fonte (VVD / Solar / Todos)
- [ ] CA-08: Ação "Criar demanda" redireciona com dados pre-preenchidos
- [ ] CA-09: Ação "Abrir no Solar" abre link externo
- [ ] CA-10: Ação "Dar ciência" funciona inline (já existente, manter)
- [ ] CA-11: Empty state claro quando não há pendências
- [ ] CA-12: Loading state com skeleton/spinner

### US-03: Executar operações batch de sync
**Como** defensor
**Quero** sincronizar múltiplos processos com o Solar de uma vez
**Para** não precisar abrir cada processo individualmente

#### Critérios de Aceitação
- [ ] CA-13: Lista de processos OMBUDS com status Solar (✅/⚠️/❌)
- [ ] CA-14: Checkbox para seleção múltipla
- [ ] CA-15: Botão "Sync Selecionados (N)" executa batch
- [ ] CA-16: Botão "Sync Desatualizados" sincroniza todos com >24h
- [ ] CA-17: Progress bar durante operação batch
- [ ] CA-18: Toast com resumo ao concluir ("12 OK, 2 falhas")
- [ ] CA-19: Campo de busca por nome do defensor no Solar
- [ ] CA-20: Resultados da busca com opção "Importar selecionados"

### US-04: Executar operações batch de export SIGAD
**Como** defensor
**Quero** exportar múltiplos assistidos ao Solar via SIGAD de uma vez
**Para** manter o Solar atualizado sem processar um a um

#### Critérios de Aceitação
- [ ] CA-21: Lista de assistidos com status Solar/SIGAD (🟢/🟡/🔴/⚪)
- [ ] CA-22: Filtros: "Todos" | "Exportáveis" | "Sem CPF" | "Já exportados"
- [ ] CA-23: Checkbox + "Exportar Selecionados (N)"
- [ ] CA-24: Progress bar com indicação de delay (2s entre cada)
- [ ] CA-25: Resultado mostra campos enriquecidos por assistido
- [ ] CA-26: Assistidos sem CPF marcados como não-exportáveis (badge + disabled)

### US-05: Sincronizar anotações como fases no Solar
**Como** defensor
**Quero** enviar anotações pendentes do OMBUDS como fases processuais no Solar
**Para** manter o Solar atualizado com minhas atividades

#### Critérios de Aceitação
- [ ] CA-27: Lista de anotações pendentes (solarSyncedAt IS NULL) agrupadas por assistido
- [ ] CA-28: Botão "Simular" executa dry-run e mostra preview em modal
- [ ] CA-29: Botão "Sync" executa sync real após confirmação
- [ ] CA-30: Campo "Anotação Rápida" permite enviar nota direta ao Solar
- [ ] CA-31: Histórico de fases já sincronizadas (últimas 20)

### US-06: Visualizar logs e estatísticas
**Como** defensor
**Quero** ver histórico de operações e estatísticas da integração
**Para** ter visibilidade de o que foi feito e identificar problemas

#### Critérios de Aceitação
- [ ] CA-32: Últimas 50 operações com tipo, alvo, sucesso/falha, timestamp
- [ ] CA-33: KPIs agregados: processos sincronizados, assistidos exportados, fases criadas
- [ ] CA-34: Status detalhado de cada sistema (Solar auth, SIGAD, Engine health)

---

## Requisitos Não-Funcionais

- **Performance**: Página carrega em <2s. Operações batch mostram progress em tempo real.
- **Segurança**: Todos endpoints usam `protectedProcedure`. CPF mascarado na UI.
- **Acessibilidade**: WCAG AA — contraste 4.5:1, focus states, keyboard navigation nas tabs.
- **Responsividade**: Mobile-friendly. Tabs empilhadas em mobile, tabelas scrolláveis.

---

## Fora do Escopo

- Automação de sync por cron/scheduler
- Notificações push/email de avisos vencidos
- Cache offline de dados do Solar
- Portal público do assistido
- Relatório exportável em PDF/CSV

---

## Dependências

- ✅ tRPC router `solar.*` com 11 endpoints (já existe)
- ✅ Enrichment Engine com endpoints Solar/SIGAD (já existe)
- ✅ Página Solar com caixa de entrada funcional (já existe)
- ✅ Componentes shadcn: Tabs, Badge, Progress (já existem)
- ✅ KPICardPremium com 6 gradients (já existe)
- ⬜ Tabela `solar_operation_log` para logs (a criar, opcional)

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Sessão Solar expira durante batch | Alta | Alto | StatusBar mostra session age, verificação pré-batch |
| Engine offline | Média | Alto | Health check no StatusBar, fallback gracioso |
| Batch lento (20 items × 2s) | Alta | Médio | Progress bar, feedback visual contínuo |
| SIGAD sem CPF para muitos assistidos | Alta | Médio | Badge "Sem CPF", filtro "Exportáveis" |
| Dados duplicados PJe + Solar | Média | Médio | Auto-match por nº processo |
