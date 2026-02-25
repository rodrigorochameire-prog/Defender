# Tasks: Solar Hub — Painel de Controle

## Milestone: Solar Hub V1 (~25h)

---

### Fase 0: Setup & Infraestrutura (2h)

| ID | Tarefa | Estimativa | Deps | Status |
|----|--------|------------|------|--------|
| T-01 | Criar diretório `src/components/solar/` com barrel export | 10min | - | ✅ |
| T-02 | Criar schema `solar_operation_log` em `schema.ts` | 30min | - | ⏸️ Decidido usar stats calculados |
| T-03 | Gerar migration e aplicar (`db:generate` + `db:push`) | 15min | T-02 | ⏸️ |
| T-04 | Criar endpoint `solar.operationLog` no router | 30min | T-03 | ⏸️ Substituído por solar.stats |
| T-05 | Criar endpoint `solar.stats` no router | 20min | T-03 | ✅ |
| T-06 | Criar query `processos.listForSolar` otimizada | 20min | - | ✅ |
| T-07 | Criar query `assistidos.listForSolar` otimizada | 20min | - | ✅ |

**Notas T-02**: Tabela simples, aditiva, sem impacto em schema existente. Pode ser pulada se preferir log em memória.

**Notas T-06/T-07**: Queries otimizadas com JOIN em assistidos/processos para trazer status Solar inline. Evita N+1 queries no frontend.

---

### Fase 1: StatusBar + Tabs Structure (3h)

| ID | Tarefa | Estimativa | Deps | Status |
|----|--------|------------|------|--------|
| T-08 | Criar componente `SolarStatusBar` | 1h | - | ✅ |
| T-09 | Refatorar `page.tsx`: adicionar `<Tabs>` wrapper | 1h | T-08 | ✅ |
| T-10 | Mover conteúdo existente para `<TabsContent value="caixa">` | 30min | T-09 | ✅ |
| T-11 | Criar tab stubs vazios: Batch, Fases, Logs | 30min | T-09 | ✅ |

**Notas T-08**: Componente `SolarStatusBar`:
```tsx
// Props: { solarStatus, onRefresh, isRefreshing }
// Renderiza: 3 status dots (Solar/SIGAD/Engine), session age, botões Re-auth/Refresh
// Query: trpc.solar.status.useQuery(undefined, { staleTime: 30_000 })
// Estilo: bg-white dark:bg-zinc-900 border-b, flex items-center justify-between
```

**Notas T-09**: Usar `<Tabs defaultValue="caixa">` com `<TabsList>` estilizado como pills:
```tsx
<Tabs defaultValue="caixa">
  <TabsList>
    <TabsTrigger value="caixa">Caixa de Entrada</TabsTrigger>
    <TabsTrigger value="batch">Operações Batch</TabsTrigger>
    <TabsTrigger value="fases">Fases → Solar</TabsTrigger>
    <TabsTrigger value="logs">Logs & Stats</TabsTrigger>
  </TabsList>
  <TabsContent value="caixa">{/* conteúdo existente */}</TabsContent>
  <TabsContent value="batch">{/* stub */}</TabsContent>
  <TabsContent value="fases">{/* stub */}</TabsContent>
  <TabsContent value="logs">{/* stub */}</TabsContent>
</Tabs>
```

**Notas T-10**: Mover KPIGrid + Card (tabela unificada) + Card (solar indisponível) para dentro do `TabsContent value="caixa"`. Header com saudação e status Solar migra para SolarStatusBar.

---

### Fase 2: Evolução da Caixa de Entrada (2h)

| ID | Tarefa | Estimativa | Deps | Status |
|----|--------|------------|------|--------|
| T-12 | Adicionar sub-filtros: Todos / Pendentes / Urgentes / Vencidas | 45min | T-10 | ✅ |
| T-13 | Adicionar filtro por fonte (VVD / Solar) | 30min | T-12 | ✅ |
| T-14 | Adicionar ação "Criar demanda" (redirect com query params) | 30min | T-10 | ✅ |
| T-15 | Polish: loading skeletons, empty states refinados | 15min | T-12 | ✅ |

**Notas T-12**: Usar estado local `filterUrgencia: "todos" | "pendentes" | "urgentes" | "vencidas"` com pills toggle. Filtrar `todosItens` antes de renderizar.

**Notas T-14**: Botão "Criar demanda" em cada row: navega para `/admin/demandas?action=new&processo={numero}&ato={descricao}&prazo={prazo}&fonte=solar`. A página de demandas precisa suportar esses query params (ou ignorar se não suportar ainda — futuro).

---

### Fase 3: Tab Batch — Sync Processos (5h)

| ID | Tarefa | Estimativa | Deps | Status |
|----|--------|------------|------|--------|
| T-16 | Criar componente `SolarBatchOperations` com sub-tabs (Sync/Export) | 30min | T-11 | ✅ |
| T-17 | Sub-tab "Sync Processos": tabela de processos com status Solar | 1.5h | T-06, T-16 | ✅ |
| T-18 | Adicionar seleção múltipla (checkbox) + ação batch sync | 1h | T-17 | ✅ |
| T-19 | Criar componente `BatchProgressBar` reutilizável | 30min | - | ✅ |
| T-20 | Integrar progress bar + toast de resultado no batch sync | 30min | T-18, T-19 | ✅ |
| T-21 | Adicionar busca por nome do defensor (`syncPorNome`) | 1h | T-16 | ✅ |

**Notas T-17**: Tabela com colunas: `[☐] Processo | Assistido | Status Solar | Última Sync | Ações`. Status Solar calculado:
- `solarExportadoEm` <= 24h → ✅ "Sincronizado"
- `solarExportadoEm` > 24h → ⚠️ "Desatualizado (Xd)"
- `solarExportadoEm` === null → ❌ "Não cadastrado"

**Notas T-18**: Padrão checkbox:
```tsx
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
// Toggle individual: set.has(id) ? delete : add
// Select all: new Set(filteredProcessos.map(p => p.id))
// Batch: trpc.solar.syncBatch.useMutation({ processoIds: [...selectedIds] })
```

**Notas T-19**: `BatchProgressBar`:
```tsx
interface BatchProgressBarProps {
  total: number;
  completed: number;
  failed: number;
  label?: string; // "Sincronizando processos..."
  isActive: boolean;
}
// Usa <Progress value={(completed/total) * 100} />
// Mostra: "3/10 concluídos, 1 falha"
```

**Notas T-21**: Input + botão busca:
```tsx
const [nomeBusca, setNomeBusca] = useState("");
const syncPorNome = trpc.solar.syncPorNome.useMutation();
// Resultado: lista de processos encontrados no Solar
// Cada item com checkbox → "Importar Selecionados"
```

---

### Fase 4: Tab Batch — Export SIGAD (4h)

| ID | Tarefa | Estimativa | Deps | Status |
|----|--------|------------|------|--------|
| T-22 | Sub-tab "Export SIGAD": tabela de assistidos com status | 1.5h | T-07, T-16 | ✅ |
| T-23 | Filtros: Todos / Exportáveis / Sem CPF / Já exportados | 30min | T-22 | ✅ |
| T-24 | Seleção múltipla + ação batch export via SIGAD | 1h | T-22 | ✅ |
| T-25 | Integrar progress bar + resultado detalhado por assistido | 30min | T-24, T-19 | ✅ |
| T-26 | Exibir campos enriquecidos como badges após export | 30min | T-25 | ✅ |

**Notas T-22**: Tabela com colunas: `[☐] Nome | CPF | SIGAD ID | Status | Exportado em | Ações`. Status:
- 🟢 `solarExportadoEm != null` → "Exportado"
- 🟡 `sigadId != null` → "No SIGAD"
- 🔴 `cpf == null` → "Sem CPF" (checkbox disabled)
- ⚪ default → "Não verificado"

**Notas T-24**: CPF mascarado na UI: `cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "XXX.XXX.XXX-$4")` — mostra só os 2 últimos dígitos.

**Notas T-26**: Após export, mostrar badges como: `[nomeMae] [dataNascimento] [naturalidade] [telefone]` em verde para campos preenchidos.

---

### Fase 5: Tab Fases → Solar (3h)

| ID | Tarefa | Estimativa | Deps | Status |
|----|--------|------------|------|--------|
| T-27 | Criar componente `SolarSyncFases` | 1h | T-11 | ✅ |
| T-28 | Lista de anotações pendentes agrupadas por assistido | 1h | T-27 | ✅ |
| T-29 | Botões "Simular" (dry-run) e "Sync" com modal de preview | 30min | T-28 | ✅ |
| T-30 | Campo "Anotação Rápida" para nota direta ao Solar | 30min | T-27 | ✅ |

**Notas T-27**: Layout em 2 colunas (md+): Esquerda = anotações pendentes, Direita = anotação rápida. Abaixo = histórico de fases sincronizadas.

**Notas T-28**: Query: `trpc.anotacoes.listPendentes` (novo, ou filtrar client-side). Agrupar por `assistidoId`:
```tsx
// { assistidoNome: "João", anotacoes: [{ id, conteudo, createdAt }] }
// Collapsible por assistido: ▸ João Silva (3 anotações)
```

**Notas T-29**: Dry-run: `trpc.solar.sincronizarComSolar.useMutation({ dryRun: true })`. Mostra resultado em modal antes de confirmar sync real.

**Notas T-30**: Form com: atendimentoId (input), texto (textarea), qualificacaoId (select, default 302). Chama `trpc.solar.criarAnotacao`.

---

### Fase 6: Tab Logs & Stats (2h)

| ID | Tarefa | Estimativa | Deps | Status |
|----|--------|------------|------|--------|
| T-31 | Criar componente `SolarLogs` | 1h | T-05 | ✅ |
| T-32 | KPIs agregados: sync, exports, fases criadas | 30min | T-31 | ✅ |
| T-33 | Tabela de últimas operações (50) com tipo/alvo/status/data | 30min | T-31 | ⏸️ Adiado para quando operation_log existir |

**Notas T-31**: Se tabela `solar_operation_log` não existir, esta tab mostra apenas KPIs calculados via queries COUNT nas tabelas existentes (processos com solarExportadoEm, assistidos com solarExportadoEm, anotacoes com solarSyncedAt).

---

### Fase 7: Polish & Responsivo (2h)

| ID | Tarefa | Estimativa | Deps | Status |
|----|--------|------------|------|--------|
| T-34 | Responsivo: tabs empilhadas em mobile, tabelas scrolláveis | 45min | T-10 | ✅ |
| T-35 | Loading states: skeletons para cada tab | 30min | Todas | ✅ |
| T-36 | Empty states: mensagens claras quando não há dados | 15min | Todas | ✅ |
| T-37 | Build final + teste visual no browser (todas as tabs) | 30min | Todas | ✅ |

---

## Resumo de Estimativas

| Fase | Tasks | Estimativa |
|------|-------|------------|
| 0 - Setup | T-01 a T-07 | 2h |
| 1 - StatusBar + Tabs | T-08 a T-11 | 3h |
| 2 - Caixa de Entrada | T-12 a T-15 | 2h |
| 3 - Batch Sync | T-16 a T-21 | 5h |
| 4 - Batch Export | T-22 a T-26 | 4h |
| 5 - Sync Fases | T-27 a T-30 | 3h |
| 6 - Logs & Stats | T-31 a T-33 | 2h |
| 7 - Polish | T-34 a T-37 | 2h |
| **Total** | **37 tasks** | **~23h** |

---

## Milestones de Entrega

| Milestone | Tasks | Entrega | Valor |
|-----------|-------|---------|-------|
| **M1** | T-01 a T-15 | Página com tabs + StatusBar + Caixa melhorada | ⭐⭐⭐ Funcional |
| **M2** | T-16 a T-26 | + Operações Batch (sync + export) | ⭐⭐⭐⭐ Impactante |
| **M3** | T-27 a T-33 | + Fases + Logs | ⭐⭐⭐⭐⭐ Completo |
| **M4** | T-34 a T-37 | + Polish + Responsivo | ✅ V1 Final |

---

## Legendas

- ⬜ Pendente
- 🔄 Em progresso
- ✅ Completo
- ❌ Bloqueado
- ⏸️ Pausado
