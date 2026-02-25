# Design: Solar Hub — Painel de Controle

## Decisões de Arquitetura

### ADR-01: Abordagem Híbrida (Hub leve + Ações contextuais)
**Status:** Aceita
**Contexto:** Debate entre centralizar tudo no hub vs. diluir por todo OMBUDS.
**Decisão:** Hub Solar abriga funcionalidades sem contexto pai (monitoramento, inbox, batch, logs). Ações que pertencem a um assistido/processo específico ficam em suas páginas de origem.
**Consequências:** Menos duplicação de UI, menos esforço (~25h vs 48h), mas requer que o defensor saiba onde cada ação está.

### ADR-02: Evolução incremental da página existente
**Status:** Aceita
**Contexto:** A página já tem caixa de entrada funcional com VVD + Solar + KPIs.
**Decisão:** Refatorar page.tsx existente adicionando Tabs (Radix UI) ao redor do conteúdo atual, em vez de reescrever do zero.
**Consequências:** Menor risco, transição suave, código existente preservado na Tab "Caixa de Entrada".

### ADR-03: Tabela solar_operation_log opcional
**Status:** Proposta
**Contexto:** Logs de operações podem ficar em memória (state) ou persistir no banco.
**Decisão:** Implementar tabela inicialmente. Se complexidade for alta, simplificar para log em memória na sessão.
**Consequências:** Persistência entre sessões, mas requer migration e novo endpoint.

---

## Modelo de Dados

### Nova Tabela (opcional)

```typescript
// src/lib/db/schema.ts
export const solarOperationLog = pgTable("solar_operation_log", {
  id: serial("id").primaryKey(),
  tipo: varchar("tipo", { length: 30 }).notNull(),
  // "sync_processo" | "sync_batch" | "export_sigad" | "export_batch" | "sync_fase" | "dar_ciencia" | "cadastrar"
  targetType: varchar("target_type", { length: 20 }),
  // "processo" | "assistido" | "anotacao"
  targetId: integer("target_id"),
  targetLabel: varchar("target_label", { length: 200 }),
  success: boolean("success").notNull(),
  details: jsonb("details"),
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Tabelas Existentes (sem alteração)
- `assistidos`: sigadId, sigadExportadoEm, solarExportadoEm
- `anotacoes`: solarSyncedAt, solarFaseId, conteudoHash
- `processos`: numeroAutos, driveFolderId

---

## Componentes

### Layout da Página

```
┌─────────────────────────────────────────────────────────┐
│ SolarStatusBar (expandido do header atual)               │
│ 🟢 Solar (23min)  🟢 SIGAD  🟢 Engine  [Re-auth] [↻]  │
├─────────────────────────────────────────────────────────┤
│ Tabs: [Caixa de Entrada] [Batch] [Fases] [Logs]        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  KPIGrid (4 cards contextuais por tab)                  │
│  ─────────────────────────────                          │
│  Conteúdo da tab ativa                                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Novos Componentes

| Componente | Responsabilidade | Props Principais |
|------------|------------------|------------------|
| `SolarStatusBar` | Indicadores 🟢/🔴 de Solar/SIGAD/Engine + ações | `solarStatus`, `onReauth`, `onRefresh` |
| `SolarBatchOperations` | Tab de sync processos + export SIGAD batch | `processos[]`, `assistidos[]` |
| `SolarSyncFases` | Tab de anotações pendentes + anotação rápida | `anotacoesPendentes[]` |
| `SolarLogs` | Tab de logs de operações + estatísticas | `operations[]`, `stats` |
| `BatchProgressBar` | Progress bar para operações batch com feedback | `total`, `completed`, `failed`, `label` |

### Componentes Modificados

| Componente | Mudanças |
|------------|----------|
| `page.tsx` (intimacoes) | Envolver em `<Tabs>`, extrair caixa de entrada para tab, adicionar StatusBar expandido |

### Componentes Reutilizados (sem modificação)

| Componente | Usado em |
|------------|----------|
| `KPICardPremium` + `KPIGrid` | Todas as tabs (KPIs contextuais) |
| `Badge` (shadcn) | Status indicators, tipos |
| `Table/*` (shadcn) | Tabelas de processos, assistidos, logs |
| `Progress` (shadcn) | Batch operations |
| `Tabs/*` (shadcn) | Navegação entre módulos |
| `Button` (shadcn) | Ações |
| `Card` (shadcn) | Containers |

---

## API / Backend

### Endpoints Existentes (consumidos pelo hub)

| Procedure | Tipo | Tab | Uso no Hub |
|-----------|------|-----|------------|
| `solar.status` | query | StatusBar | Indicadores de saúde |
| `solar.avisos` | query | Caixa | Avisos Solar pendentes |
| `solar.syncBatch` | mutation | Batch | Sync múltiplos processos |
| `solar.syncPorNome` | mutation | Batch | Busca por nome defensor |
| `solar.cadastrarNoSolar` | mutation | Batch | Cadastrar processo no Solar |
| `solar.exportarBatch` | mutation | Batch | Export múltiplos assistidos |
| `solar.sincronizarComSolar` | mutation | Fases | Sync anotações → fases |
| `solar.criarAnotacao` | mutation | Fases | Nota rápida no Solar |
| `vvd.listIntimacoes` | query | Caixa | Intimações VVD |
| `vvd.darCiencia` | mutation | Caixa | Dar ciência inline |

### Novos Endpoints (mínimo necessário)

| Procedure | Tipo | Input | Output | Descrição |
|-----------|------|-------|--------|-----------|
| `solar.operationLog` | query | `{ limit?: number }` | `Operation[]` | Últimas N operações (se tabela existir) |
| `solar.stats` | query | - | `{ syncCount, exportCount, fasesCount }` | Contadores agregados |
| `processos.listForSolar` | query | `{ limit?: number }` | `ProcessoComStatus[]` | Processos com status Solar (join otimizado) |
| `assistidos.listForSolar` | query | `{ filter?: string }` | `AssistidoComStatus[]` | Assistidos com status SIGAD/Solar |

### Tipos dos Novos Endpoints

```typescript
// processos.listForSolar output
interface ProcessoComStatusSolar {
  id: number;
  numeroAutos: string;
  assistidoNome: string;
  solarSyncStatus: "synced" | "stale" | "not_registered";
  lastSyncAt: string | null;
  driveDocsCount: number;
}

// assistidos.listForSolar output
interface AssistidoComStatusSolar {
  id: number;
  nome: string;
  cpf: string | null; // mascarado: XXX.XXX.XXX-XX
  sigadId: string | null;
  solarStatus: "exported" | "sigad_only" | "no_cpf" | "unchecked";
  solarExportadoEm: string | null;
  camposEnriquecidos: string[];
}

// solar.operationLog output
interface SolarOperation {
  id: number;
  tipo: string;
  targetType: string | null;
  targetId: number | null;
  targetLabel: string | null;
  success: boolean;
  details: Record<string, unknown> | null;
  createdAt: string;
}
```

---

## UI/UX

### Padrão Visual (Defender)

| Elemento | Estilo |
|----------|--------|
| Background | `bg-zinc-100 dark:bg-[#0f0f11]` |
| Cards | `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm` |
| StatusBar | Background branco com borda inferior, dots coloridos, tipografia `text-xs` |
| Tabs | `TabsList` com pills, indicador emerald para tab ativa |
| Status dots | `w-2 h-2 rounded-full` (emerald-500 / red-500 / amber-500) |
| Monospace | `font-mono text-xs` para nº processo, IDs |
| Actions | `Button variant="outline" size="sm"` |
| Hover row | `hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors` |

### Fluxo de Usuário — Tab "Batch"

```
1. Defensor abre página Solar → vê StatusBar (tudo 🟢)
2. Clica na tab "Operações Batch"
3. Vê tabela de processos com status Solar
4. Marca 5 processos desatualizados (⚠️)
5. Clica "Sync Selecionados (5)"
6. Progress bar: 1/5... 2/5... 3/5... 4/5... 5/5
7. Toast: "5 processos sincronizados com sucesso"
8. Tabela atualiza: todos ✅
```

### Fluxo de Usuário — Tab "Fases"

```
1. Defensor clica tab "Fases → Solar"
2. Vê 15 anotações pendentes agrupadas por assistido:
   ▸ João Silva (3 anotações)
   ▸ Maria Santos (2 anotações)
3. Clica "Simular Sync"
4. Modal mostra preview: "Serão criadas 5 fases processuais"
5. Clica "Confirmar Sync"
6. Progress: 5 fases criadas
7. Lista atualiza: anotações movidas para "Já sincronizadas"
```

### Wireframe — StatusBar Expandido

```
┌──────────────────────────────────────────────────────────┐
│ ☀ Solar                                                   │
│                                                           │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐            │
│ │ 🟢 Solar   │ │ 🟢 SIGAD   │ │ 🟢 Engine  │            │
│ │ sessão:23m │ │ online     │ │ online     │            │
│ └────────────┘ └────────────┘ └────────────┘            │
│                                                           │
│ Última atualização: há 2 min        [Re-auth] [Atualizar]│
└──────────────────────────────────────────────────────────┘
```

### Wireframe — Tab "Operações Batch"

```
┌──────────────────────────────────────────────────────────┐
│  [Sync Processos]  [Export SIGAD]  ← Sub-tabs            │
│                                                           │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│  │  47  │ │  32  │ │  10  │ │   5  │   KPIs             │
│  │Total │ │ Sync │ │Desat.│ │S/Cad │                    │
│  └──────┘ └──────┘ └──────┘ └──────┘                    │
│                                                           │
│  🔍 Buscar no Solar por nome: [__________________][🔍]  │
│                                                           │
│  ☐ Selecionar todos    [Sync Desatualizados (10)]        │
│  ────────────────────────────────────────────             │
│  ☐ │ 0012345-67.2025 │ João Silva  │ ✅ Sync │ [Sync]   │
│  ☐ │ 0098765-43.2024 │ Maria S.    │ ⚠️ 3d   │ [Sync]   │
│  ☐ │ 0054321-89.2025 │ Pedro O.    │ ❌ N/A  │ [Cad.]   │
│  ────────────────────────────────────────────             │
└──────────────────────────────────────────────────────────┘
```

---

## Testes

### Visuais/Manuais (via `/browser-test`)
- [ ] Página carrega sem erros com todas as tabs
- [ ] StatusBar mostra indicadores corretos
- [ ] Tab "Caixa" mantém funcionalidade existente
- [ ] Tab "Batch" carrega lista de processos
- [ ] Tab "Batch" - seleção múltipla funciona
- [ ] Tab "Fases" carrega anotações pendentes
- [ ] Tab "Logs" mostra operações recentes
- [ ] Mobile: tabs empilhadas, tabelas scrolláveis

### Smoke Test (build)
- [ ] `npm run build` passa sem erros
- [ ] Todos os imports resolvidos
- [ ] TypeScript sem warnings

### Integration
- [ ] Endpoints novos retornam dados corretos
- [ ] Batch sync processa N items com progress
- [ ] Dry-run de sync fases não persiste dados
