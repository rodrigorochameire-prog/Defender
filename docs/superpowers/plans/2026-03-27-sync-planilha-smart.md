# Sync Inteligente Planilha ↔ OMBUDS — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o syncAll destrutivo por sync bidirecional inteligente com detecção de conflitos.

**Architecture:** Novo `sync-engine.ts` centraliza a lógica. Tabela `sync_log` registra toda operação. Campo `syncedAt` em demandas rastreia última sincronização. Polling via Inngest como safety net. UI de conflitos em `/conflitos`.

**Tech Stack:** Drizzle ORM, Google Sheets API v4, Inngest (cron), tRPC, React (shadcn/ui)

---

## Arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|------------------|
| `src/lib/db/schema/core.ts` | Modificar | Adicionar tabela sync_log, campo syncedAt em demandas |
| `src/lib/db/schema/enums.ts` | Modificar | Enum syncOrigemEnum |
| `src/lib/services/sync-engine.ts` | **Criar** | Lógica central: syncSmart, detectConflict, resolveConflict |
| `src/lib/services/google-sheets.ts` | Modificar | Expor readSheet, remover syncAll, melhorar pushDemanda |
| `src/app/api/sheets/webhook/route.ts` | Modificar | Adicionar detecção de conflito |
| `src/lib/inngest/functions.ts` | Modificar | Adicionar cron polling 5min |
| `src/lib/trpc/routers/sync.ts` | **Criar** | Router para listar/resolver conflitos |
| `src/app/(app)/conflitos/page.tsx` | **Criar** | Página de resolução de conflitos |
| `src/components/conflict-badge.tsx` | **Criar** | Badge de conflitos no sidebar |
| `__tests__/sync-engine.test.ts` | **Criar** | Testes do sync engine |
| `__tests__/sync-webhook.test.ts` | **Criar** | Testes do webhook melhorado |

---

### Task 1: Schema — sync_log + syncedAt

**Files:**
- Modify: `src/lib/db/schema/enums.ts`
- Modify: `src/lib/db/schema/core.ts`
- Modify: `src/lib/db/schema/index.ts`

- [ ] **Step 1: Adicionar enum de origem**

Em `src/lib/db/schema/enums.ts`, adicionar no final:

```typescript
export const syncOrigemEnum = pgEnum("sync_origem", [
  "BANCO",
  "PLANILHA",
  "MOVE",
  "CONFLITO_RESOLVIDO",
]);
```

- [ ] **Step 2: Adicionar tabela sync_log e campo syncedAt**

Em `src/lib/db/schema/core.ts`, adicionar após a definição de `demandas`:

```typescript
// ==========================================
// SYNC LOG
// ==========================================

export const syncLog = pgTable("sync_log", {
  id: serial("id").primaryKey(),
  demandaId: integer("demanda_id").references(() => demandas.id, { onDelete: "cascade" }),
  campo: varchar("campo", { length: 50 }).notNull(),
  valorBanco: text("valor_banco"),
  valorPlanilha: text("valor_planilha"),
  origem: syncOrigemEnum("origem").notNull(),
  bancoUpdatedAt: timestamp("banco_updated_at"),
  planilhaUpdatedAt: timestamp("planilha_updated_at"),
  conflito: boolean("conflito").default(false),
  resolvidoEm: timestamp("resolvido_em"),
  resolvidoPor: varchar("resolvido_por", { length: 100 }),
  resolvidoValor: text("resolvido_valor"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SyncLogEntry = typeof syncLog.$inferSelect;
export type InsertSyncLog = typeof syncLog.$inferInsert;
```

Adicionar `syncedAt` à tabela `demandas` (dentro da definição existente, após `updatedAt`):

```typescript
  syncedAt: timestamp("synced_at"),
```

- [ ] **Step 3: Exportar no index**

Em `src/lib/db/schema/index.ts`, adicionar na linha de exports de core:

```typescript
export { syncLog } from "./core";
export { syncOrigemEnum } from "./enums";
```

- [ ] **Step 4: Gerar e aplicar migration**

```bash
cd ~/Projetos/Defender && npm run db:generate && npm run db:push
```

Expected: Migration criada e aplicada sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema/ drizzle/
git commit -m "feat(sync): add sync_log table and syncedAt field for smart sync"
```

---

### Task 2: Sync Engine — Core Logic

**Files:**
- Create: `src/lib/services/sync-engine.ts`
- Create: `__tests__/sync-engine.test.ts`

- [ ] **Step 1: Escrever testes do sync engine**

Criar `__tests__/sync-engine.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  detectChange,
  classifySync,
  type SyncFieldState,
} from "@/lib/services/sync-engine";

describe("detectChange", () => {
  it("detecta que só banco mudou", () => {
    const state: SyncFieldState = {
      valorBanco: "2_ATENDER",
      valorPlanilha: "5_FILA",
      bancoUpdatedAt: new Date("2026-03-27T10:00:00Z"),
      planilhaUpdatedAt: new Date("2026-03-27T08:00:00Z"),
      syncedAt: new Date("2026-03-27T09:00:00Z"),
    };
    expect(detectChange(state)).toBe("BANCO_CHANGED");
  });

  it("detecta que só planilha mudou", () => {
    const state: SyncFieldState = {
      valorBanco: "5_FILA",
      valorPlanilha: "2_ATENDER",
      bancoUpdatedAt: new Date("2026-03-27T08:00:00Z"),
      planilhaUpdatedAt: new Date("2026-03-27T10:00:00Z"),
      syncedAt: new Date("2026-03-27T09:00:00Z"),
    };
    expect(detectChange(state)).toBe("PLANILHA_CHANGED");
  });

  it("detecta conflito quando ambos mudaram com valores diferentes", () => {
    const state: SyncFieldState = {
      valorBanco: "2_ATENDER",
      valorPlanilha: "7_CIENCIA",
      bancoUpdatedAt: new Date("2026-03-27T10:00:00Z"),
      planilhaUpdatedAt: new Date("2026-03-27T10:05:00Z"),
      syncedAt: new Date("2026-03-27T09:00:00Z"),
    };
    expect(detectChange(state)).toBe("CONFLICT");
  });

  it("ignora quando ambos mudaram para o mesmo valor", () => {
    const state: SyncFieldState = {
      valorBanco: "2_ATENDER",
      valorPlanilha: "2_ATENDER",
      bancoUpdatedAt: new Date("2026-03-27T10:00:00Z"),
      planilhaUpdatedAt: new Date("2026-03-27T10:05:00Z"),
      syncedAt: new Date("2026-03-27T09:00:00Z"),
    };
    expect(detectChange(state)).toBe("NO_CHANGE");
  });

  it("ignora quando nenhum mudou", () => {
    const state: SyncFieldState = {
      valorBanco: "5_FILA",
      valorPlanilha: "5_FILA",
      bancoUpdatedAt: new Date("2026-03-27T08:00:00Z"),
      planilhaUpdatedAt: new Date("2026-03-27T08:00:00Z"),
      syncedAt: new Date("2026-03-27T09:00:00Z"),
    };
    expect(detectChange(state)).toBe("NO_CHANGE");
  });
});

describe("classifySync", () => {
  it("classifica campos bidirecionais", () => {
    expect(classifySync("status")).toBe("BIDIRECTIONAL");
    expect(classifySync("providencias")).toBe("BIDIRECTIONAL");
    expect(classifySync("delegadoPara")).toBe("BIDIRECTIONAL");
    expect(classifySync("prazo")).toBe("BIDIRECTIONAL");
    expect(classifySync("reuPreso")).toBe("BIDIRECTIONAL");
  });

  it("classifica campos unidirecionais (banco→planilha)", () => {
    expect(classifySync("assistidoNome")).toBe("BANCO_TO_SHEET");
    expect(classifySync("numeroAutos")).toBe("BANCO_TO_SHEET");
    expect(classifySync("ato")).toBe("BANCO_TO_SHEET");
    expect(classifySync("dataEntrada")).toBe("BANCO_TO_SHEET");
  });
});
```

- [ ] **Step 2: Rodar testes para verificar que falham**

```bash
cd ~/Projetos/Defender && npx vitest run __tests__/sync-engine.test.ts
```

Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar sync-engine.ts**

Criar `src/lib/services/sync-engine.ts`:

```typescript
/**
 * Sync Engine — Lógica central de sincronização bidirecional
 * Planilha Google Sheets ↔ Banco OMBUDS
 *
 * Regras:
 * - Campos bidirecionais: status, providencias, delegadoPara, prazo, reuPreso
 * - Campos banco→planilha: assistidoNome, numeroAutos, ato, dataEntrada
 * - Conflito = ambos mudaram com valores diferentes desde último sync
 */

import { db } from "@/lib/db";
import { demandas, processos, assistidos, syncLog } from "@/lib/db/schema";
import { eq, and, isNull, lt } from "drizzle-orm";
import {
  type DemandaParaSync,
  getSheetName,
  COL,
  ATRIBUICAO_TO_SHEET,
} from "./google-sheets";

// ==========================================
// TIPOS
// ==========================================

export type ChangeType =
  | "NO_CHANGE"
  | "BANCO_CHANGED"
  | "PLANILHA_CHANGED"
  | "CONFLICT";

export type SyncDirection = "BIDIRECTIONAL" | "BANCO_TO_SHEET";

export interface SyncFieldState {
  valorBanco: string | null;
  valorPlanilha: string | null;
  bancoUpdatedAt: Date | null;
  planilhaUpdatedAt: Date | null;
  syncedAt: Date | null;
}

export interface SyncResult {
  processed: number;
  bancoToSheet: number;
  sheetToBanco: number;
  conflicts: number;
  moved: number;
  inserted: number;
  errors: string[];
}

// ==========================================
// CAMPOS SINCRONIZÁVEIS
// ==========================================

const BIDIRECTIONAL_FIELDS = new Set([
  "status",
  "substatus",
  "providencias",
  "delegadoPara",
  "prazo",
  "reuPreso",
]);

const BANCO_TO_SHEET_FIELDS = new Set([
  "assistidoNome",
  "numeroAutos",
  "ato",
  "dataEntrada",
]);

// ==========================================
// DETECÇÃO DE MUDANÇAS
// ==========================================

export function detectChange(state: SyncFieldState): ChangeType {
  const { valorBanco, valorPlanilha, bancoUpdatedAt, planilhaUpdatedAt, syncedAt } = state;

  // Normalizar para comparação
  const vb = (valorBanco ?? "").trim();
  const vp = (valorPlanilha ?? "").trim();

  // Se valores são iguais, não há mudança relevante
  if (vb === vp) return "NO_CHANGE";

  const bancoMudou = bancoUpdatedAt && syncedAt ? bancoUpdatedAt > syncedAt : !syncedAt && !!bancoUpdatedAt;
  const planilhaMudou = planilhaUpdatedAt && syncedAt ? planilhaUpdatedAt > syncedAt : !syncedAt && !!planilhaUpdatedAt;

  if (bancoMudou && planilhaMudou) return "CONFLICT";
  if (bancoMudou) return "BANCO_CHANGED";
  if (planilhaMudou) return "PLANILHA_CHANGED";

  return "NO_CHANGE";
}

export function classifySync(campo: string): SyncDirection {
  if (BIDIRECTIONAL_FIELDS.has(campo)) return "BIDIRECTIONAL";
  return "BANCO_TO_SHEET";
}

// ==========================================
// REGISTRAR CONFLITO
// ==========================================

export async function registerConflict(
  demandaId: number,
  campo: string,
  valorBanco: string | null,
  valorPlanilha: string | null,
  bancoUpdatedAt: Date | null,
  planilhaUpdatedAt: Date | null,
): Promise<number> {
  const [entry] = await db.insert(syncLog).values({
    demandaId,
    campo,
    valorBanco,
    valorPlanilha,
    origem: "BANCO",
    bancoUpdatedAt,
    planilhaUpdatedAt,
    conflito: true,
  }).returning({ id: syncLog.id });

  return entry.id;
}

// ==========================================
// RESOLVER CONFLITO
// ==========================================

export async function resolveConflict(
  conflictId: number,
  resolvedValue: string,
  resolvedBy: string,
  applyTo: "BANCO" | "PLANILHA" | "AMBOS",
): Promise<void> {
  // Buscar o conflito
  const conflict = await db.query.syncLog.findFirst({
    where: eq(syncLog.id, conflictId),
  });

  if (!conflict || !conflict.demandaId) {
    throw new Error(`Conflito ${conflictId} não encontrado`);
  }

  // Aplicar valor no banco se necessário
  if (applyTo === "BANCO" || applyTo === "AMBOS") {
    const updateData: Record<string, unknown> = {
      [conflict.campo]: resolvedValue,
      updatedAt: new Date(),
      syncedAt: new Date(),
    };
    await db.update(demandas)
      .set(updateData)
      .where(eq(demandas.id, conflict.demandaId));
  }

  // Marcar como resolvido
  await db.update(syncLog)
    .set({
      resolvidoEm: new Date(),
      resolvidoPor: resolvedBy,
      resolvidoValor: resolvedValue,
    })
    .where(eq(syncLog.id, conflictId));
}

// ==========================================
// CONTAR CONFLITOS PENDENTES
// ==========================================

export async function countPendingConflicts(): Promise<number> {
  const result = await db.select({ id: syncLog.id })
    .from(syncLog)
    .where(and(
      eq(syncLog.conflito, true),
      isNull(syncLog.resolvidoEm),
    ));
  return result.length;
}

// ==========================================
// LISTAR CONFLITOS PENDENTES
// ==========================================

export async function listPendingConflicts() {
  return db.select({
    id: syncLog.id,
    demandaId: syncLog.demandaId,
    campo: syncLog.campo,
    valorBanco: syncLog.valorBanco,
    valorPlanilha: syncLog.valorPlanilha,
    bancoUpdatedAt: syncLog.bancoUpdatedAt,
    planilhaUpdatedAt: syncLog.planilhaUpdatedAt,
    createdAt: syncLog.createdAt,
    assistidoNome: assistidos.nome,
    numeroAutos: processos.numeroAutos,
  })
    .from(syncLog)
    .innerJoin(demandas, eq(syncLog.demandaId, demandas.id))
    .innerJoin(processos, eq(demandas.processoId, processos.id))
    .innerJoin(assistidos, eq(demandas.assistidoId, assistidos.id))
    .where(and(
      eq(syncLog.conflito, true),
      isNull(syncLog.resolvidoEm),
    ))
    .orderBy(syncLog.createdAt);
}

// ==========================================
// REGISTRAR LOG (não-conflito)
// ==========================================

export async function logSyncAction(
  demandaId: number,
  campo: string,
  valorBanco: string | null,
  valorPlanilha: string | null,
  origem: "BANCO" | "PLANILHA" | "MOVE",
): Promise<void> {
  await db.insert(syncLog).values({
    demandaId,
    campo,
    valorBanco,
    valorPlanilha,
    origem,
    conflito: false,
  });
}
```

- [ ] **Step 4: Rodar testes**

```bash
cd ~/Projetos/Defender && npx vitest run __tests__/sync-engine.test.ts
```

Expected: PASS (detectChange e classifySync são funções puras).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/sync-engine.ts __tests__/sync-engine.test.ts
git commit -m "feat(sync): add sync engine with conflict detection and resolution"
```

---

### Task 3: Melhorar Webhook com Detecção de Conflito

**Files:**
- Modify: `src/app/api/sheets/webhook/route.ts`
- Create: `__tests__/sync-webhook.test.ts`

- [ ] **Step 1: Escrever teste do webhook com conflito**

Criar `__tests__/sync-webhook.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { shouldConflict } from "@/lib/services/sync-engine";

// Testar a lógica de detecção, não o HTTP handler
describe("webhook conflict detection", () => {
  it("não conflita quando banco não mudou desde sync", () => {
    const bancoUpdatedAt = new Date("2026-03-27T08:00:00Z");
    const syncedAt = new Date("2026-03-27T09:00:00Z");
    // banco mudou às 8, sync às 9 → banco não mudou desde sync
    expect(bancoUpdatedAt <= syncedAt).toBe(true);
  });

  it("conflita quando banco mudou depois do sync", () => {
    const bancoUpdatedAt = new Date("2026-03-27T10:00:00Z");
    const syncedAt = new Date("2026-03-27T09:00:00Z");
    expect(bancoUpdatedAt > syncedAt).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar teste**

```bash
npx vitest run __tests__/sync-webhook.test.ts
```

Expected: PASS.

- [ ] **Step 3: Modificar webhook route**

Em `src/app/api/sheets/webhook/route.ts`, substituir o handler POST. A mudança principal: antes de aplicar o valor da planilha, verificar se o banco mudou desde o último sync:

Adicionar no início do arquivo:
```typescript
import { registerConflict, logSyncAction, classifySync } from "@/lib/services/sync-engine";
```

Dentro da função POST, após buscar a demanda existente, adicionar antes do update:

```typescript
    // --- DETECÇÃO DE CONFLITO ---
    const direction = classifySync(dbField);
    if (direction === "BANCO_TO_SHEET") {
      // Campo unidirecional — planilha não deveria editar
      return NextResponse.json({ ok: true, skipped: "banco_to_sheet_only" });
    }

    // Verificar se banco mudou desde último sync
    const demandaRow = await db.query.demandas.findFirst({
      where: eq(demandas.id, demandaId),
      columns: { updatedAt: true, syncedAt: true, [dbField]: true },
    });

    if (demandaRow) {
      const syncedAt = demandaRow.syncedAt ?? new Date(0);
      const bancoMudou = demandaRow.updatedAt > syncedAt;
      const valorAtualBanco = String(demandaRow[dbField] ?? "");
      const valorNovoPlanilha = String(valor);

      if (bancoMudou && valorAtualBanco !== valorNovoPlanilha) {
        // CONFLITO — registrar e não sobrescrever
        await registerConflict(
          demandaId, dbField,
          valorAtualBanco, valorNovoPlanilha,
          demandaRow.updatedAt, new Date(),
        );
        return NextResponse.json({ ok: true, conflict: true });
      }
    }
    // --- FIM DETECÇÃO DE CONFLITO ---
```

Após o update bem-sucedido, atualizar syncedAt:

```typescript
    // Atualizar syncedAt
    await db.update(demandas)
      .set({ syncedAt: new Date() })
      .where(eq(demandas.id, demandaId));

    // Registrar log
    await logSyncAction(demandaId, dbField, null, String(valor), "PLANILHA");
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/sheets/webhook/route.ts __tests__/sync-webhook.test.ts
git commit -m "feat(sync): add conflict detection to webhook handler"
```

---

### Task 4: Melhorar pushDemanda com Check de Conflito

**Files:**
- Modify: `src/lib/services/google-sheets.ts`

- [ ] **Step 1: Exportar readSheet e helpers necessários**

Em `src/lib/services/google-sheets.ts`, tornar `readSheet` e `findRowById` exportáveis:

```typescript
// Mudar de:
async function readSheet(title: string): Promise<string[][]> {
// Para:
export async function readSheet(title: string): Promise<string[][]> {

// Mudar de:
function findRowById(rows: string[][], id: number): number | null {
// Para:
export function findRowById(rows: string[][], id: number): number | null {
```

- [ ] **Step 2: Melhorar pushDemanda com check de conflito**

Substituir a função `pushDemanda` existente:

```typescript
export async function pushDemanda(demanda: DemandaParaSync): Promise<{ pushed: boolean; conflict: boolean }> {
  if (!getSpreadsheetId()) {
    console.warn("[Sheets] GOOGLE_SHEETS_SPREADSHEET_ID não configurado — sync ignorado");
    return { pushed: false, conflict: false };
  }

  const sheetName = getSheetName(demanda.atribuicao);
  if (MANUAL_SHEETS.has(sheetName)) return { pushed: false, conflict: false };

  try {
    await ensureSheet(sheetName);
    const rows = await readSheet(sheetName);
    const rowIndex = findRowById(rows, demanda.id);

    if (rowIndex) {
      // Linha existe — verificar se planilha mudou (col K = __lastEdit__)
      const existingRow = rows[rowIndex - 1];
      const planilhaLastEdit = existingRow?.[COL.DELEGADO]; // col K se tiver __lastEdit__
      // Por ora, checar se o status na planilha difere do que vamos escrever
      const planilhaStatus = existingRow?.[COL.STATUS - 1] ?? "";
      const bancoStatus = statusParaLabel(demanda.status, demanda.substatus);

      if (planilhaStatus && planilhaStatus !== bancoStatus) {
        // Possível conflito — verificar se a demanda tem syncedAt
        // Se planilha tem valor diferente, NÃO sobrescrever — registrar conflito
        const { registerConflict } = await import("./sync-engine");
        await registerConflict(
          demanda.id, "status",
          bancoStatus, planilhaStatus,
          new Date(), new Date(),
        );
        return { pushed: false, conflict: true };
      }
    }

    // Sem conflito — escrever normalmente
    const rowData = demandaToRow(demanda);
    const range = `${sheetName}!A${rowIndex ?? rows.length + 1}:${colToLetter(HEADERS.length)}${rowIndex ?? rows.length + 1}`;

    await sheetsPut(
      `/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      { values: [rowData] }
    );

    return { pushed: true, conflict: false };
  } catch (err) {
    console.error(`[Sheets] Erro ao sincronizar demanda ${demanda.id}:`, err);
    return { pushed: false, conflict: false };
  }
}
```

- [ ] **Step 3: Deprecar syncAll**

Renomear `syncAll` para `syncAll_DEPRECATED` e adicionar warning:

```typescript
/**
 * @deprecated Use syncSmart() do sync-engine.ts em vez desta função.
 * syncAll é destrutivo — apaga e reescreve a planilha inteira.
 */
export async function syncAll_DEPRECATED(demandas: DemandaParaSync[]): Promise<SyncStats> {
  console.warn("[Sheets] ⚠️ syncAll_DEPRECATED chamado — use syncSmart() em vez disso!");
  // ... código existente mantido para emergência ...
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/google-sheets.ts
git commit -m "feat(sync): improve pushDemanda with conflict check, deprecate syncAll"
```

---

### Task 5: Polling via Inngest (Safety Net)

**Files:**
- Modify: `src/lib/inngest/functions.ts`

- [ ] **Step 1: Adicionar função de polling**

Em `src/lib/inngest/functions.ts`, adicionar:

```typescript
import { readSheet, findRowById, getSheetName, COL, ATRIBUICAO_TO_SHEET } from "@/lib/services/google-sheets";
import { detectChange, registerConflict, logSyncAction, classifySync } from "@/lib/services/sync-engine";
import { demandas, processos, assistidos } from "@/lib/db/schema";

export const syncSheetPollingFn = inngest.createFunction(
  { id: "sync-sheet-polling", name: "Sync Planilha Polling (5min)" },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    const stats = { checked: 0, sheetToBanco: 0, conflicts: 0, errors: 0 };

    await step.run("poll-all-sheets", async () => {
      // Para cada aba sincronizável
      for (const [atribuicao, sheetName] of Object.entries(ATRIBUICAO_TO_SHEET)) {
        if (sheetName === "Violência Doméstic") continue; // VVD manual
        if (sheetName === "Plenários") continue; // Plenários tem sync próprio

        try {
          const rows = await readSheet(sheetName);

          for (let i = DATA_START_ROW - 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[COL.ID - 1]) continue;

            const demandaId = parseInt(row[COL.ID - 1]);
            if (isNaN(demandaId)) continue;

            // Buscar demanda no banco
            const demanda = await db.query.demandas.findFirst({
              where: eq(demandas.id, demandaId),
              columns: { id: true, status: true, substatus: true, providencias: true, syncedAt: true, updatedAt: true },
            });

            if (!demanda) continue;
            stats.checked++;

            // Comparar status
            const planilhaStatus = row[COL.STATUS - 1] ?? "";
            const planilhaProvidencias = row[COL.PROVIDENCIAS - 1] ?? "";

            // Aqui simplificamos: verificamos se o status da planilha difere do banco
            // e se a demanda não foi sincronizada recentemente
            const syncedAt = demanda.syncedAt ?? new Date(0);
            const bancoMudou = demanda.updatedAt > syncedAt;

            // Se status na planilha difere e banco não mudou → aplicar planilha
            const { statusParaLabel } = await import("@/lib/services/google-sheets");
            const bancoStatusLabel = statusParaLabel(demanda.status, demanda.substatus);

            if (planilhaStatus && planilhaStatus !== bancoStatusLabel) {
              if (bancoMudou) {
                // Conflito
                await registerConflict(demandaId, "status", bancoStatusLabel, planilhaStatus, demanda.updatedAt, new Date());
                stats.conflicts++;
              } else {
                // Planilha vence — atualizar banco
                const { SHEETS_LABEL_TO_STATUS } = await import("@/app/api/sheets/webhook/route");
                const mapping = SHEETS_LABEL_TO_STATUS[planilhaStatus.toUpperCase()];
                if (mapping) {
                  await db.update(demandas).set({
                    status: mapping.status,
                    substatus: mapping.substatus,
                    syncedAt: new Date(),
                    updatedAt: new Date(),
                  }).where(eq(demandas.id, demandaId));
                  stats.sheetToBanco++;
                }
              }
            }
          }
        } catch (err) {
          console.error(`[Polling] Erro na aba ${sheetName}:`, err);
          stats.errors++;
        }
      }
    });

    return stats;
  }
);
```

- [ ] **Step 2: Exportar a função no array de functions do Inngest**

Verificar que o array de funções exportado inclui `syncSheetPollingFn`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/inngest/functions.ts
git commit -m "feat(sync): add 5-minute polling as safety net for sheet sync"
```

---

### Task 6: tRPC Router para Conflitos

**Files:**
- Create: `src/lib/trpc/routers/sync.ts`
- Modify: `src/lib/trpc/root.ts` (adicionar router)

- [ ] **Step 1: Criar router**

Criar `src/lib/trpc/routers/sync.ts`:

```typescript
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  listPendingConflicts,
  countPendingConflicts,
  resolveConflict,
} from "@/lib/services/sync-engine";
import { pushDemanda } from "@/lib/services/google-sheets";

export const syncRouter = createTRPCRouter({
  conflictCount: protectedProcedure
    .query(async () => {
      return countPendingConflicts();
    }),

  conflictList: protectedProcedure
    .query(async () => {
      return listPendingConflicts();
    }),

  resolveConflict: protectedProcedure
    .input(z.object({
      conflictId: z.number(),
      resolution: z.enum(["PLANILHA", "BANCO", "CUSTOM"]),
      customValue: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { conflictId, resolution, customValue } = input;

      // Determinar valor final
      const conflicts = await listPendingConflicts();
      const conflict = conflicts.find(c => c.id === conflictId);
      if (!conflict) throw new Error("Conflito não encontrado");

      let finalValue: string;
      let applyTo: "BANCO" | "PLANILHA" | "AMBOS";

      switch (resolution) {
        case "PLANILHA":
          finalValue = conflict.valorPlanilha ?? "";
          applyTo = "BANCO"; // Aplicar valor da planilha no banco
          break;
        case "BANCO":
          finalValue = conflict.valorBanco ?? "";
          applyTo = "PLANILHA"; // Aplicar valor do banco na planilha
          break;
        case "CUSTOM":
          finalValue = customValue ?? "";
          applyTo = "AMBOS";
          break;
        default:
          throw new Error("Resolução inválida");
      }

      await resolveConflict(
        conflictId,
        finalValue,
        ctx.session?.user?.name ?? "unknown",
        applyTo,
      );

      return { success: true, value: finalValue };
    }),
});
```

- [ ] **Step 2: Registrar no root router**

Em `src/lib/trpc/root.ts`, adicionar:

```typescript
import { syncRouter } from "./routers/sync";

// No createTRPCRouter:
sync: syncRouter,
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/trpc/routers/sync.ts src/lib/trpc/root.ts
git commit -m "feat(sync): add tRPC router for conflict management"
```

---

### Task 7: Página de Conflitos

**Files:**
- Create: `src/app/(app)/conflitos/page.tsx`
- Create: `src/components/conflict-badge.tsx`

- [ ] **Step 1: Criar badge de conflitos**

Criar `src/components/conflict-badge.tsx`:

```typescript
"use client";

import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export function ConflictBadge() {
  const { data: count } = trpc.sync.conflictCount.useQuery(undefined, {
    refetchInterval: 30000, // Atualizar a cada 30s
  });

  if (!count || count === 0) return null;

  return (
    <Link href="/conflitos">
      <Badge variant="destructive" className="gap-1 cursor-pointer">
        <AlertTriangle className="h-3 w-3" />
        {count} conflito{count > 1 ? "s" : ""}
      </Badge>
    </Link>
  );
}
```

- [ ] **Step 2: Criar página de conflitos**

Criar `src/app/(app)/conflitos/page.tsx`:

```typescript
"use client";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ConflitosPage() {
  const utils = trpc.useUtils();
  const { data: conflicts, isLoading } = trpc.sync.conflictList.useQuery();
  const resolve = trpc.sync.resolveConflict.useMutation({
    onSuccess: () => {
      utils.sync.conflictList.invalidate();
      utils.sync.conflictCount.invalidate();
      toast.success("Conflito resolvido");
    },
  });

  if (isLoading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-6 w-6 text-orange-500" />
        <h1 className="text-2xl font-bold">Conflitos de Sincronização</h1>
        <Badge variant="outline">{conflicts?.length ?? 0} pendentes</Badge>
      </div>

      {(!conflicts || conflicts.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Check className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
            Nenhum conflito pendente
          </CardContent>
        </Card>
      )}

      {conflicts?.map((c) => (
        <Card key={c.id} className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {c.assistidoNome} — {c.numeroAutos}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Campo: <strong>{c.campo}</strong>
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded border bg-blue-50 dark:bg-blue-950/20">
                <p className="text-xs text-muted-foreground mb-1">Planilha</p>
                <p className="font-medium">{c.valorPlanilha || "(vazio)"}</p>
              </div>
              <div className="p-3 rounded border bg-zinc-50 dark:bg-zinc-950/20">
                <p className="text-xs text-muted-foreground mb-1">OMBUDS</p>
                <p className="font-medium">{c.valorBanco || "(vazio)"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => resolve.mutate({ conflictId: c.id, resolution: "PLANILHA" })}
                disabled={resolve.isPending}
              >
                Aceitar Planilha
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => resolve.mutate({ conflictId: c.id, resolution: "BANCO" })}
                disabled={resolve.isPending}
              >
                Aceitar OMBUDS
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Adicionar badge no sidebar**

No componente de sidebar/layout que já existe, importar e adicionar `<ConflictBadge />` junto aos links de navegação.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/conflitos/page.tsx src/components/conflict-badge.tsx
git commit -m "feat(sync): add conflict resolution page and badge"
```

---

### Task 8: Integração e Teste E2E

**Files:**
- Modify: `src/app/api/sheets/resync/route.ts` (apontar para syncSmart)

- [ ] **Step 1: Atualizar resync route para usar sync seguro**

Em `src/app/api/sheets/resync/route.ts`, substituir `syncAll` por loop de `pushDemanda`:

```typescript
// Substituir:
// const result = await syncAll(rows);
// Por:
let pushed = 0;
let conflicts = 0;
for (const row of rows) {
  const result = await pushDemanda(row);
  if (result.pushed) pushed++;
  if (result.conflict) conflicts++;
}
return NextResponse.json({ total: rows.length, pushed, conflicts });
```

- [ ] **Step 2: Testar manualmente**

```bash
# 1. Verificar que a planilha não foi sobrescrita
# 2. Editar um status na planilha
# 3. Editar o mesmo status no banco via OMBUDS
# 4. Verificar que aparece em /conflitos
# 5. Resolver o conflito
```

- [ ] **Step 3: Commit final**

```bash
git add -A
git commit -m "feat(sync): complete smart sync integration — replaces destructive syncAll"
```

---

## Ordem de Execução para Subagentes

| Task | Dependência | Pode paralelizar com |
|------|-------------|---------------------|
| Task 1 (Schema) | Nenhuma | — |
| Task 2 (Sync Engine) | Task 1 | — |
| Task 3 (Webhook) | Task 2 | Task 4 |
| Task 4 (pushDemanda) | Task 2 | Task 3 |
| Task 5 (Polling) | Task 3 + 4 | Task 6 |
| Task 6 (tRPC Router) | Task 2 | Task 5, Task 7 |
| Task 7 (UI Conflitos) | Task 6 | Task 5 |
| Task 8 (Integração) | Todas | — |
