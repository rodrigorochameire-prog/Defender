# TDD - Solar Hub: Painel de Controle da Integração Solar/SIGAD/PJe

> **Abordagem Híbrida**: Hub leve para monitoramento + inbox + batch. Ações contextuais permanecem nas páginas de assistido/processo.

| Campo | Valor |
|-------|-------|
| Tech Lead | @rodrigo.meire |
| Time | Rodrigo Meire |
| Status | Aprovado (Híbrido) |
| Criado | 2026-02-24 |
| Atualizado | 2026-02-24 |

---

## Contexto

O OMBUDS possui uma integração robusta com o Sistema Solar da Defensoria Pública da Bahia (DPEBA), o SIGAD (Sistema Integrado de Gestão de Atendimento) e o PJe (Processo Judicial Eletrônico). Essa integração permite sincronizar processos, exportar assistidos, importar intimações e escrever fases processuais de volta ao Solar.

Atualmente, essas funcionalidades estão **dispersas por múltiplas páginas** do sistema: botões de export SIGAD em `/admin/assistidos/[id]`, sync de processos em contextos individuais, import PJe dentro de Demandas Premium, e avisos pendentes numa página básica chamada "Intimações". Não há visão unificada do estado da integração, nem ferramentas de batch operation acessíveis via UI.

A página `/admin/intimacoes` foi renomeada para **"Solar"** e será transformada num **painel de controle leve** — não uma segunda interface para dados que já têm casa. O princípio é: **torre de controle do aeroporto, não um segundo aeroporto.**

A página já possui uma caixa de entrada funcional (VVD + Solar avisos + KPIs). O trabalho é **evoluir** o que existe com Tabs, StatusBar expandida, operações batch, e logs/config. Ações contextuais (export individual de assistido, sync individual de processo) permanecem nas suas páginas de origem.

**Domínio**: Integração / Solar / SIGAD / PJe

**Stakeholders**: Defensores (usuários primários), Gestores (visão agregada)

**Princípio Arquitetural**: O hub Solar abriga funcionalidades **sem contexto pai** — monitoramento, inbox, batch operations, logs. Ações que pertencem a um assistido/processo específico ficam em suas respectivas páginas.

---

## Definição do Problema

### Problemas que Estamos Resolvendo

- **Problema 1**: Funcionalidades Solar espalhadas por múltiplas páginas
  - Impacto: Defensor precisa navegar entre 3-4 páginas para gerenciar integração. Export SIGAD em `/assistidos/[id]`, sync em contextos individuais, import PJe em Demandas.

- **Problema 2**: Nenhuma visão agregada do estado da integração
  - Impacto: Impossível saber quantos processos estão desatualizados, quantos assistidos faltam exportar ao Solar, ou se a conexão caiu.

- **Problema 3**: Operações batch sem interface
  - Impacto: Endpoints `syncBatch`, `exportarBatch`, `sincronizarComSolar` existem no tRPC mas não têm UI. Defensor precisa exportar assistidos um a um.

- **Problema 4**: Import PJe desconectado do Solar
  - Impacto: Importações via PJe parser não cruzam com avisos Solar existentes, gerando possíveis duplicatas e falta de contexto.

### Por Que Agora?

- Backend pronto: 11 endpoints tRPC + Enrichment Engine funcionais
- Página já renomeada para "Solar" (sidebar + breadcrumbs)
- Volume crescente de demandas exige ferramentas batch
- Solicitação direta do usuário para centralizar controle Solar

### Impacto de NÃO Resolver

- **Defensores**: Continuam perdendo tempo navegando entre páginas para operações rotineiras
- **Assistidos**: Dados desatualizados no Solar, fases não sincronizadas
- **Sistema**: Endpoints tRPC subutilizados, investimento em backend sem retorno na experiência do usuário

---

## Escopo

### Dentro do Escopo (V1)

1. **Painel de Saúde** - Status em tempo real de Solar/SIGAD/Engine
2. **Caixa de Entrada** - Avisos unificados (Solar + VVD) com ações rápidas
3. **Central de Sync de Processos** - Dashboard OMBUDS <-> Solar com batch operations
4. **Central de Export SIGAD** - Gestão batch de exports SIGAD -> Solar
5. **Sync Anotações <-> Fases** - Escrita bidirecional com dry-run
6. **Configurações & Logs** - Monitoramento e histórico de operações

### Fora do Escopo (V1)

- Automação de sync (cron jobs, schedulers)
- Notificações push/email de avisos vencidos
- Integração com WhatsApp para notificar assistidos
- Portal público do assistido com status Solar
- Cache local de dados do Solar (offline mode)

### Considerações Futuras (V2+)

- Auto-sync agendado a cada X horas
- Notificações de prazo via WhatsApp
- Relatório exportável de operações Solar/SIGAD
- Mapa de calor de demandas por vara/comarca
- AI-powered: sugestão automática de ação para cada aviso

---

## Solução Técnica

### Visão Geral da Arquitetura

A página Solar Hub será um SPA com **6 tabs** (Radix UI Tabs), cada uma representando um módulo. Um header fixo mostra o status de conexão. Cada tab é um componente independente em `src/components/solar/`, consumindo endpoints tRPC existentes.

**Componentes Principais**:

- `SolarHub` (page.tsx) - Orquestrador principal com tabs
- `SolarStatusBar` - Header com indicadores de saúde
- `SolarCaixaEntrada` - Tab 1: Avisos unificados
- `SolarSyncProcessos` - Tab 2: Central de sync
- `SolarExportSigad` - Tab 3: Central de export
- `SolarSyncFases` - Tab 4: Anotações <-> Fases
- `SolarConfig` - Tab 5: Configurações e logs

**Diagrama de Arquitetura**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Solar Hub (page.tsx)                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    SolarStatusBar                            │  │
│  │  🟢 Solar (23min)  🟢 SIGAD  🟢 Engine  [Re-auth] [Refresh]│  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────┬──────────┬──────────┬──────────┬──────────┐          │
│  │ Caixa   │ Sync     │ Export   │ Fases    │ Config   │  ← Tabs  │
│  │ Entrada │ Processos│ SIGAD    │ ↔ Solar  │ & Logs   │          │
│  └─────────┴──────────┴──────────┴──────────┴──────────┘          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Tab Content Area                          │  │
│  │                                                              │  │
│  │  KPIGrid (4 cards contextuais)                              │  │
│  │  ────────────────────────────────                           │  │
│  │  Filtros + Ações em Batch                                   │  │
│  │  ────────────────────────────────                           │  │
│  │  Tabela Principal (dados + ações inline)                    │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
   tRPC Queries         tRPC Mutations      Enrichment Engine
   solar.status         solar.syncProcesso  localhost:8080
   solar.avisos         solar.syncBatch     (Playwright + Solar)
   solar.buscarNoSigad  solar.exportarViaSigad
                        solar.exportarBatch
                        solar.sincronizarComSolar
```

### Fluxo de Dados por Módulo

#### Módulo 1: SolarStatusBar

```
1. Mount → trpc.solar.status.useQuery() (staleTime: 30s)
2. Resultado → renderizar indicadores (🟢/🔴)
3. Botão "Re-auth" → invalidar cache + refetch
4. Session age > 30min → badge warning amarelo
5. Solar offline → banner de aviso com retry
```

#### Módulo 2: CaixaEntrada

```
1. Mount → trpc.solar.avisos.useQuery() + trpc.vvd.listIntimacoes.useQuery()
2. Mesclar itens VVD + Solar → ordenar por urgência
3. Filtros: tabs [Todos|Pendentes|Urgentes|Vencidas] + filtro por vara/tipo
4. Ações inline:
   - "Dar ciência" → trpc.vvd.darCiencia.useMutation()
   - "Criar demanda" → redirect /admin/demandas?prefill={processo,ato,prazo}
   - "Abrir no Solar" → window.open(solar_url)
5. Import PJe → abre PJeImportModal (reusar de demandas-premium)
```

#### Módulo 3: SyncProcessos

```
1. Mount → trpc.processos.list() (processos OMBUDS com numeroAutos)
2. Para cada processo: verificar solarExportadoEm (≤24h = ✅, >24h = ⚠️, null = ❌)
3. Ações:
   - [Sync] → trpc.solar.syncProcesso.useMutation()
   - [Sync Todos] → trpc.solar.syncBatch.useMutation({ processoIds: selected })
   - [Cadastrar] → trpc.solar.cadastrarNoSolar.useMutation()
4. Busca por nome: input → trpc.solar.syncPorNome.useMutation({ nome })
   → Resultados → "Importar selecionados"
5. Progress bar para operações batch
```

#### Módulo 4: ExportSigad

```
1. Mount → trpc.assistidos.list() (assistidos com CPF)
2. Status por assistido:
   - 🟢 solarExportadoEm != null → "Exportado"
   - 🟡 sigadId != null mas solarExportadoEm == null → "SIGAD encontrado"
   - 🔴 cpf == null → "Sem CPF"
   - ⚪ default → "Não verificado"
3. Ações:
   - [Verificar] → trpc.solar.buscarNoSigad.useQuery()
   - [Exportar] → trpc.solar.exportarViaSigad.useMutation()
   - [Exportar Selecionados] → trpc.solar.exportarBatch.useMutation()
4. Resultado mostra campos enriquecidos (nomeMae, dataNascimento, etc.)
5. Preview de observações SIGAD importadas
```

#### Módulo 5: SyncFases

```
1. Mount → query anotações com solarSyncedAt IS NULL (agrupadas por assistido)
2. Preview: lista de anotações pendentes com conteúdo truncado
3. Ações:
   - [Simular] → trpc.solar.sincronizarComSolar({ dryRun: true })
   - [Sync] → trpc.solar.sincronizarComSolar({ dryRun: false })
   - [Anotação Rápida] → trpc.solar.criarAnotacao()
4. Log: fases já criadas com solarFaseId + data
```

#### Módulo 6: SolarConfig

```
1. Status detalhado: Solar (auth, session, selectors), SIGAD, Engine
2. Log de operações recentes (últimas 50 ações)
3. Estatísticas: processos sincronizados, assistidos exportados, fases criadas
4. Configurações: URL do engine (hoje hardcoded)
```

### APIs & Endpoints (tRPC) — Já Existentes

| Procedure | Tipo | Usado por | Status |
|-----------|------|-----------|--------|
| `solar.status` | query | StatusBar | ✅ Existe |
| `solar.avisos` | query | CaixaEntrada | ✅ Existe |
| `solar.syncProcesso` | mutation | SyncProcessos | ✅ Existe |
| `solar.syncBatch` | mutation | SyncProcessos | ✅ Existe |
| `solar.syncPorNome` | mutation | SyncProcessos | ✅ Existe |
| `solar.cadastrarNoSolar` | mutation | SyncProcessos | ✅ Existe |
| `solar.exportarViaSigad` | mutation | ExportSigad | ✅ Existe |
| `solar.exportarBatch` | mutation | ExportSigad | ✅ Existe |
| `solar.buscarNoSigad` | query | ExportSigad | ✅ Existe |
| `solar.sincronizarComSolar` | mutation | SyncFases | ✅ Existe |
| `solar.criarAnotacao` | mutation | SyncFases | ✅ Existe |
| `vvd.listIntimacoes` | query | CaixaEntrada | ✅ Existe |
| `vvd.darCiencia` | mutation | CaixaEntrada | ✅ Existe |

### Novos Endpoints Necessários (poucos)

| Procedure | Tipo | Módulo | Descrição |
|-----------|------|--------|-----------|
| `solar.operationLog` | query | Config | Listar últimas N operações Solar (novo) |
| `solar.stats` | query | Config | Estatísticas agregadas (novo) |
| `assistidos.listForSolar` | query | ExportSigad | Lista assistidos com status Solar/SIGAD (otimizado) |
| `processos.listForSolar` | query | SyncProcessos | Lista processos com status Solar (otimizado) |

### Mudanças no Banco de Dados

**Nova Tabela** (opcional, para log de operações):

```typescript
export const solarOperationLog = pgTable("solar_operation_log", {
  id: serial("id").primaryKey(),
  tipo: varchar("tipo", { length: 30 }).notNull(),
  // "sync_processo" | "export_sigad" | "sync_fase" | "dar_ciencia" | "cadastrar"
  targetType: varchar("target_type", { length: 20 }),
  // "processo" | "assistido" | "anotacao"
  targetId: integer("target_id"),
  targetLabel: varchar("target_label", { length: 200 }),
  // Ex: "0012345-67.2025.8.05.0039" ou "João Silva"
  success: boolean("success").notNull(),
  details: jsonb("details"),
  // Resultado da operação (campos enriquecidos, erros, etc.)
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Alterações em Tabelas Existentes**: Nenhuma (schema existente já tem todos os campos necessários).

**Estratégia de Migração**:
- Tabela `solar_operation_log` é aditiva (sem impacto em dados existentes)
- Gerar migration: `npm run db:generate`
- Aplicar: `npm run db:push`
- Sem migration de rollback necessária (tabela nova, pode simplesmente dropar)

---

## Design de UI por Módulo

### Layout Geral

```
┌─────────────────────────────────────────────────────┐
│ ☀ Solar Hub                          [Re-auth] [↻]  │
│ 🟢 Solar (23min)  🟢 SIGAD  🟢 Engine              │
├─────────────────────────────────────────────────────┤
│ [Caixa] [Sync Processos] [Export SIGAD] [Fases] [⚙]│
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐               │
│  │ KPI1 │ │ KPI2 │ │ KPI3 │ │ KPI4 │               │
│  └──────┘ └──────┘ └──────┘ └──────┘               │
│                                                      │
│  [Filtros]                    [Ações Batch]          │
│  ─────────────────────────────────────────          │
│  │ # │ Dado 1    │ Dado 2    │ Status │ Ações │     │
│  │ 1 │ ...       │ ...       │ ✅     │ [...] │     │
│  │ 2 │ ...       │ ...       │ ⚠️     │ [...] │     │
│  │ 3 │ ...       │ ...       │ ❌     │ [...] │     │
│  ─────────────────────────────────────────          │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Padrão Visual (Defender)

- **Background**: `bg-zinc-100 dark:bg-[#0f0f11]`
- **Cards**: `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm`
- **KPIs**: `KPICardPremium` com gradients contextuais (emerald=ok, rose=erro, amber=warning, zinc=neutro)
- **Tabs**: `TabsList` com estilo custom pill rounded
- **Status dots**: `w-2 h-2 rounded-full bg-emerald-500/bg-red-500/bg-amber-500`
- **Hover**: `hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors`
- **Tipografia**: `text-zinc-900 dark:text-zinc-50` para títulos, `text-zinc-500 dark:text-zinc-400` para secondary
- **Monospace**: `font-mono text-xs` para números de processo e IDs
- **Actions**: `Button variant="outline" size="sm"` com cores semânticas (emerald=positivo, rose=destrutivo)

### Módulo 2 — Caixa de Entrada (Detalhamento)

**KPIs**:
| Card | Valor | Gradient | Condição Alert |
|------|-------|----------|----------------|
| Total Pendente | `todosItens.length` | zinc | - |
| Vencidas | `count(vencida)` | rose se > 0 | animate-pulse |
| Urgentes (<=2d) | `count(urgente)` | rose se > 0 | - |
| Avisos Solar | `itensSolar.length` | zinc | - |

**Tabela**:
| Coluna | Largura | Dados | Editable |
|--------|---------|-------|----------|
| Urgência | 100px | Badge colorido (Vencido/Urgente/Atenção/OK) | Não |
| Fonte | 70px | Badge "VVD" (purple) ou "Solar" (indigo) | Não |
| Descrição | flex | Ato + tipo badge | Não |
| Processo | 180px | `code` monospace, hidden md | Não |
| Parte | 140px | Nome truncado, hidden lg | Não |
| Prazo | 110px | Data formatada + ícone calendar, hidden md | Não |
| Ações | 180px | [Ciência] [Criar Demanda] [Abrir Solar] | - |

**Ação "Criar Demanda"**: Redireciona para `/admin/demandas` com query params pre-preenchidos:
```
/admin/demandas?action=new&processo={numero}&ato={descricao}&prazo={prazo}&fonte=solar
```

**Import PJe integrado**: Botão no header que abre `PJeImportModal` (reutilizado de demandas-premium).

### Módulo 3 — Sync Processos (Detalhamento)

**KPIs**:
| Card | Valor | Gradient |
|------|-------|----------|
| Total OMBUDS | count(processos) | zinc |
| Sincronizados | count(solarSync <= 24h) | emerald |
| Desatualizados | count(solarSync > 24h) | amber |
| Não Cadastrados | count(solarSync == null) | rose |

**Tabela**:
| Coluna | Dados |
|--------|-------|
| Processo | `numeroAutos` monospace |
| Assistido | `nome` do assistido vinculado |
| Status Solar | ✅ Sync / ⚠️ Desatualizado (Xd atrás) / ❌ Não cadastrado |
| Última Sync | `solarExportadoEm` formatado |
| Docs Drive | count de documentos no Drive |
| Ações | [Sync] [Cadastrar] [Ver no Solar] |

**Busca por Nome**:
```
┌──────────────────────────────────────────────────────┐
│ 🔍 Buscar processos no Solar por nome do defensor    │
│ ┌────────────────────────────────┐ [Buscar]          │
│ │ rodrigo rocha meire            │                    │
│ └────────────────────────────────┘                    │
│                                                        │
│ Resultados: 47 processos encontrados                  │
│ ☐ 0012345-67.2025 · 1ª V Crim Camaçari · Roubo      │
│ ☐ 0098765-43.2024 · 2ª V Crim Camaçari · Tráfico    │
│ ☐ ...                                                 │
│                               [Importar Selecionados] │
└──────────────────────────────────────────────────────┘
```

**Batch Sync**:
- Checkbox em cada row
- Header: "[Sync Selecionados (N)]" ou "[Sync Todos Desatualizados]"
- Progress: `<Progress value={completed/total * 100} />` durante operação
- Resultado: toast com summary "12 sync OK, 2 falhas"

### Módulo 4 — Export SIGAD (Detalhamento)

**KPIs**:
| Card | Valor | Gradient |
|------|-------|----------|
| Total Assistidos | count(assistidos) | zinc |
| Exportados Solar | count(solarExportadoEm != null) | emerald |
| SIGAD Encontrado | count(sigadId != null) | amber |
| Sem CPF | count(cpf == null) | rose |

**Tabela**:
| Coluna | Dados |
|--------|-------|
| Nome | nome do assistido |
| CPF | mascarado (XXX.XXX.XXX-XX) |
| SIGAD ID | sigadId ou "—" |
| Status | 🟢 Exportado / 🟡 No SIGAD / 🔴 Sem CPF / ⚪ Não verificado |
| Exportado em | solarExportadoEm formatado |
| Campos Enriquecidos | badges (nomeMae, dataNasc, etc.) |
| Ações | [Verificar] [Exportar] |

**Batch Export**:
- Checkbox + "[Exportar Selecionados (N)]"
- Progress bar com delay visual (2s entre cada, conforme backend)
- Resultado detalhado: "8 exportados, 2 já existiam, 1 sem CPF"

### Módulo 5 — Sync Fases (Detalhamento)

**Layout em 2 colunas (md+)**:

```
┌────────────────────────────┐ ┌──────────────────────┐
│ Anotações Pendentes (15)   │ │ Anotação Rápida      │
│                             │ │                      │
│ ▸ João Silva (3 anotações) │ │ Atendimento ID:      │
│   □ [SIGAD] Obs 1...       │ │ [________________]   │
│   □ [SIGAD] Obs 2...       │ │                      │
│   □ Nota manual...         │ │ Texto:               │
│                             │ │ [________________]   │
│ ▸ Maria Santos (2 anot.)   │ │ [________________]   │
│   □ Nota...                │ │                      │
│   □ Atendimento...         │ │ [Simular] [Enviar]   │
│                             │ │                      │
│ [Simular Sync] [Sync Todos]│ │                      │
└────────────────────────────┘ └──────────────────────┘

┌──────────────────────────────────────────────────────┐
│ Fases Já Sincronizadas (32)                          │
│ ─────────────────────────────────────                │
│ 2026-02-24 │ João Silva │ Fase #A3F2 │ ✅ Criada    │
│ 2026-02-23 │ Maria S.   │ Fase #B1C4 │ ✅ Criada    │
│ ...                                                   │
└──────────────────────────────────────────────────────┘
```

**Dry-run mode**: Botão "Simular" mostra o que seria criado sem salvar. Resultado em modal com preview formatado.

---

## Riscos

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Sessão Solar expira durante batch | Alto | Alta | StatusBar mostra session age, botão re-auth, verificação pré-batch |
| Enrichment Engine offline | Alto | Média | Health check no StatusBar, fallback gracioso, mensagem clara |
| Operação batch lenta (20+ items, 2s cada) | Médio | Alta | Progress bar, background processing, toast de conclusão |
| SIGAD sem CPF para muitos assistidos | Médio | Alta | Badge "Sem CPF" visível, filtro "Exportáveis" no módulo 4 |
| Dados duplicados ao importar PJe + Solar | Médio | Média | Auto-match por nº processo, highlight de possíveis duplicatas |
| Rate limiting do Solar/SIGAD | Alto | Média | Respeitar delays existentes (3s read, 5s write), queue visual |
| Componentes pesados com muitos dados | Médio | Média | Paginação, virtualização (react-window se >200 rows), staleTime |

---

## Plano de Implementação

| Fase | Tarefa | Descrição | Estimativa | Deps |
|------|--------|-----------|------------|------|
| **Fase 0 - Setup** | Estrutura | Criar `/src/components/solar/`, organizar componentes | 1h | - |
| | Schema (opcional) | Tabela `solar_operation_log` + migration | 1h | - |
| | Endpoints novos | `solar.operationLog`, `solar.stats`, queries otimizadas | 2h | Schema |
| **Fase 1 - StatusBar** | `SolarStatusBar` | Indicadores de saúde Solar/SIGAD/Engine | 2h | Setup |
| | Page refactor | Refatorar `page.tsx` com Tabs + StatusBar | 2h | StatusBar |
| **Fase 2 - Caixa de Entrada** | `SolarCaixaEntrada` | Migrar/melhorar tabela existente | 4h | Page |
| | Filtros + KPIs | Sub-tabs, filtros por vara/tipo, KPI cards | 2h | Caixa |
| | Ações inline | Dar ciência, criar demanda, abrir Solar | 2h | Caixa |
| | Import PJe | Integrar PJeImportModal no contexto Solar | 1h | Caixa |
| **Fase 3 - Sync Processos** | `SolarSyncProcessos` | Tabela de processos com status Solar | 4h | Page |
| | Batch sync | Checkbox, progress bar, batch mutation | 3h | SyncProc |
| | Busca por nome | Input + resultados + importar selecionados | 3h | SyncProc |
| **Fase 4 - Export SIGAD** | `SolarExportSigad` | Tabela de assistidos com status SIGAD/Solar | 4h | Page |
| | Batch export | Checkbox, progress bar com delay visual | 2h | Export |
| | Enriquecimento | Preview de campos preenchidos, observações SIGAD | 2h | Export |
| **Fase 5 - Sync Fases** | `SolarSyncFases` | Lista anotações pendentes agrupadas | 3h | Page |
| | Dry-run | Modal de preview simulação | 1h | SyncFases |
| | Anotação rápida | Form para nota direta ao Solar | 2h | SyncFases |
| **Fase 6 - Config** | `SolarConfig` | Status detalhado + log de operações | 2h | Schema |
| | Estatísticas | KPIs agregados de uso | 1h | Stats endpoint |
| **Fase 7 - Polish** | Responsivo | Garantir mobile-friendly em todos os módulos | 2h | Todos |
| | Loading states | Skeletons, empty states, error states | 1h | Todos |
| | Testes visuais | Verificar no browser todos os fluxos | 2h | Todos |

**Estimativa Total**: ~48h (~6 dias de trabalho)

### Sequência de Implementação Recomendada

```
Fase 0 (Setup)          ████ 4h
Fase 1 (StatusBar)      ████ 4h
Fase 2 (Caixa Entrada)  █████████ 9h    ← Prioridade máxima (core)
Fase 3 (Sync Processos) ██████████ 10h  ← Mais impactante
Fase 4 (Export SIGAD)   ████████ 8h
Fase 5 (Sync Fases)     ██████ 6h
Fase 6 (Config)         ███ 3h
Fase 7 (Polish)         █████ 5h        ← Não pular!
```

**Milestones de entrega incremental:**
1. **M1 (Setup + StatusBar + Caixa)**: ~17h - Página funcional com avisos
2. **M2 (+ Sync Processos)**: ~27h - Central de sync operacional
3. **M3 (+ Export + Fases)**: ~41h - Todos os módulos
4. **M4 (+ Config + Polish)**: ~48h - V1 completa

---

## Estrutura de Arquivos

```
src/
├── app/(dashboard)/admin/intimacoes/
│   └── page.tsx                    ← Refatorar: SolarHub com Tabs
│
├── components/solar/               ← NOVO diretório
│   ├── solar-status-bar.tsx        ← Módulo 1: Health indicators
│   ├── solar-caixa-entrada.tsx     ← Módulo 2: Avisos unificados
│   ├── solar-sync-processos.tsx    ← Módulo 3: Central sync
│   ├── solar-export-sigad.tsx      ← Módulo 4: Export SIGAD
│   ├── solar-sync-fases.tsx        ← Módulo 5: Anotações ↔ Fases
│   ├── solar-config.tsx            ← Módulo 6: Config & logs
│   └── solar-shared.tsx            ← Componentes compartilhados
│       (StatusBadge, ProgressBatch, OperationResult, etc.)
│
├── lib/trpc/routers/
│   └── solar.ts                    ← Adicionar: operationLog, stats
│
└── lib/db/schema.ts                ← Adicionar: solar_operation_log (opcional)
```

---

## Considerações de Segurança

### Autenticação & Autorização

- **Autenticação**: NextAuth com sessões (Supabase Auth)
- **Autorização**: Todos os endpoints usam `protectedProcedure` (já implementado)
- **Solar credentials**: Armazenadas no Enrichment Engine (não no frontend)
- **SIGAD credentials**: Idem, gerenciadas pelo Enrichment Engine

### Proteção de Dados

**Dados Sensíveis (PII)**:
- CPF exibido mascarado na UI (`XXX.XXX.XXX-XX`)
- Nomes de assistidos visíveis apenas para defensores autenticados
- Números de processo são informação pública (CNJ), sem mascaramento necessário
- Observações SIGAD podem conter dados sensíveis — não logar em plaintext

**Criptografia**:
- Em repouso: PostgreSQL encryption (Supabase managed)
- Em trânsito: TLS 1.3 (Vercel + Supabase)
- Enrichment Engine: comunicação via localhost/Cloudflare Tunnel (HTTPS)

### Boas Práticas

- ✅ Validação de input com Zod (já implementado em todos os endpoints)
- ✅ Prevenção de SQL injection (Drizzle ORM)
- ✅ Rate limiting implícito (Enrichment Engine delays 3-5s entre requests)
- ✅ Idempotência: hash SHA-256 para dedup de observações SIGAD
- ✅ Dry-run mode para operações de escrita ao Solar

---

## Estratégia de Testes

| Tipo | Escopo | Abordagem |
|------|--------|-----------|
| Visual/Manual | Todos os módulos | `/browser-test` — verificar no browser cada tab |
| Smoke Test | Page load | Verificar que página carrega sem erros (build + HMR) |
| Integration | tRPC endpoints novos | Testar `solar.operationLog` e `solar.stats` |
| E2E | Fluxo Caixa Entrada | Listar avisos → dar ciência → verificar atualização |

### Cenários Prioritários

1. **Página carrega**: Solar online → todos KPIs visíveis, tabs funcionais
2. **Solar offline**: Indicador vermelho, mensagem clara, retry funciona
3. **Batch sync**: Selecionar 5 processos → sync → progress bar → resultado
4. **Export SIGAD**: Selecionar assistido com CPF → exportar → campos enriquecidos
5. **Sync fases dry-run**: Simular → modal preview → confirmar → sync real
6. **Mobile**: Tabs responsivas, tabelas scrolláveis horizontalmente

---

## Monitoramento

### Métricas (via solar_operation_log)

| Métrica | Tipo | Utilidade |
|---------|------|-----------|
| `solar.sync.success_rate` | Percentual | Taxa de sucesso de syncs |
| `solar.export.count` | Contador | Assistidos exportados por dia |
| `solar.fases.created` | Contador | Fases criadas por dia |
| `solar.session.age` | Gauge | Tempo desde último login Solar |
| `solar.engine.uptime` | Boolean | Enrichment Engine acessível |

### Logs Estruturados (via tabela)

```json
{
  "tipo": "sync_processo",
  "targetType": "processo",
  "targetId": 123,
  "targetLabel": "0012345-67.2025.8.05.0039",
  "success": true,
  "details": {
    "movimentacoes": 5,
    "pdfs_downloaded": 2,
    "pdfs_uploaded_drive": 2,
    "anotacoes_criadas": 3
  },
  "createdAt": "2026-02-24T14:30:00Z"
}
```

---

## Plano de Rollback

### Triggers de Rollback

| Trigger | Ação |
|---------|------|
| Página não carrega após deploy | Reverter deploy via Vercel |
| Solar status quebrado | Manter página antiga como fallback |
| Tabela operation_log causa erro | Drop tabela, endpoints retornam vazio |

### Passos de Rollback

1. **Frontend**: Reverter deploy via Vercel dashboard (1 clique)
2. **Schema**: `DROP TABLE IF EXISTS solar_operation_log;` — tabela nova, sem impacto
3. **Endpoints novos**: Retornam array vazio se tabela não existe (graceful degradation)
4. **Componentes**: Mantidos em diretório separado (`/solar/`), fácil de isolar

**Risco de rollback**: Baixo — toda a implementação é aditiva. Não modifica dados existentes, não altera endpoints existentes, não muda schema de tabelas em uso.

---

## Glossário

| Termo | Definição |
|-------|-----------|
| **Solar** | Sistema de gestão da Defensoria Pública da Bahia (AngularJS SPA) |
| **SIGAD** | Sistema Integrado de Gestão de Atendimento (CakePHP, modo leitura) |
| **PJe** | Processo Judicial Eletrônico (sistema judiciário, scraping via copy-paste) |
| **VVD** | Vara de Violência Doméstica (subsistema de intimações) |
| **Enrichment Engine** | Serviço Python/FastAPI local com Playwright para scraping |
| **Fase Processual** | Registro de atividade no Solar (audiência, petição, decisão) |
| **Atendimento** | Registro de caso no Solar vinculado a assistido + processo |
| **Aviso** | Notificação pendente no Solar (intimação, citação, vista) |
| **Dry-run** | Modo de simulação que mostra resultado sem persistir dados |

---

## Checklist de Validação

### Seções Obrigatórias

- [x] Cabeçalho com Tech Lead e Time
- [x] Contexto com 2+ parágrafos
- [x] 4 problemas identificados com impacto
- [x] Escopo claro (dentro/fora) com 6 itens dentro, 5 fora
- [x] Diagrama de arquitetura (ASCII)
- [x] 7 riscos com mitigação
- [x] Plano de implementação com 7 fases + milestones

### Seções Críticas (OMBUDS)

- [x] Segurança: autenticação definida (protectedProcedure)
- [x] Segurança: proteção de PII documentada (CPF mascarado)
- [x] Testes: 4 tipos definidos (visual, smoke, integration, E2E)
- [x] Monitoramento: métricas via solar_operation_log
- [x] Rollback: triggers e passos documentados (risco baixo)
