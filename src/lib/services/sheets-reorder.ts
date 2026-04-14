/**
 * Lógica compartilhada de reordenação de planilha.
 *
 * Usado por:
 * - POST /api/sheets/reorder (trigger manual)
 * - Inngest `sheets-reorder-debounced` (trigger automático com debounce)
 *
 * Sort key: [rank por grupo do kanban ASC, ordemManual ASC NULLS LAST,
 *            createdAt DESC, prazo ASC NULLS LAST].
 *
 * Se `sheetNameFilter` for passado, reordena só aquela aba. Caso contrário,
 * reordena todas as abas que tiverem demandas.
 */

import { db } from "@/lib/db";
import { demandas, processos, assistidos, users } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import {
  reorderSheet,
  getSheetName,
  type DemandaParaSync,
} from "@/lib/services/google-sheets";

/**
 * Rank posicional que reflete a ordem visual do kanban
 * (`STATUS_OPTIONS_BY_COLUMN` em `src/config/demanda-status.ts`).
 * Duplicado aqui para manter a route/helper pure-data (evita importar React).
 */
const STATUS_RANK: Record<string, number> = {
  // === TRIAGEM ===
  urgente: 10,
  triagem: 11,
  fila: 11, // alias legado
  // === EM ANDAMENTO — Preparação ===
  elaborar: 20,
  elaborando: 21,
  analisar: 22,
  relatorio: 23,
  relatório: 23,
  revisar: 25,
  revisando: 26,
  // === EM ANDAMENTO — Diligências ===
  atender: 30,
  documentos: 31,
  testemunhas: 32,
  investigar: 33,
  buscar: 34,
  diligenciar: 35,
  oficiar: 36,
  // === EM ANDAMENTO — Saída ===
  protocolar: 40,
  // === EM ANDAMENTO — Acompanhar ===
  monitorar: 50,
  emilly: 51,
  amanda: 52,
  taissa: 53,
  "estagio_-_taissa": 53,
  // === CONCLUÍDA ===
  protocolado: 70,
  sigad: 71,
  ciencia: 72,
  ciência: 72,
  resolvido: 73,
  constituiu_advogado: 74,
  sem_atuacao: 75,
  // === ARQUIVADO ===
  arquivado: 90,
};

const DB_STATUS_FALLBACK_RANK: Record<string, number> = {
  URGENTE: 10,
  "5_TRIAGEM": 11,
  "2_ATENDER": 30,
  "4_MONITORAR": 50,
  "7_PROTOCOLADO": 70,
  "7_CIENCIA": 72,
  "7_SEM_ATUACAO": 75,
  CONCLUIDO: 73,
  ARQUIVADO: 90,
};

function normalizeSubstatus(substatus: string | null | undefined): string | null {
  if (!substatus) return null;
  const withoutPrefix = substatus.replace(/^\d+\s*-\s*/, "");
  return withoutPrefix
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

function computeRank(status: string | null, substatus: string | null): number {
  const normalized = normalizeSubstatus(substatus);
  if (normalized && STATUS_RANK[normalized] !== undefined) {
    return STATUS_RANK[normalized];
  }
  if (status && DB_STATUS_FALLBACK_RANK[status] !== undefined) {
    return DB_STATUS_FALLBACK_RANK[status];
  }
  return 99;
}

export interface ReorderResult {
  totalWritten: number;
  sheets: Array<{ sheet: string; written: number; error?: string }>;
}

export async function reorderAllSheets(
  sheetNameFilter?: string,
): Promise<ReorderResult> {
  const rows = await db
    .select({
      id: demandas.id,
      status: demandas.status,
      substatus: demandas.substatus,
      reuPreso: demandas.reuPreso,
      dataEntrada: demandas.dataEntrada,
      ato: demandas.ato,
      prazo: demandas.prazo,
      providencias: demandas.providencias,
      ordemManual: demandas.ordemManual,
      createdAt: demandas.createdAt,
      importBatchId: demandas.importBatchId,
      ordemOriginal: demandas.ordemOriginal,
      assistidoNome: assistidos.nome,
      numeroAutos: processos.numeroAutos,
      atribuicao: processos.atribuicao,
      delegadoNome: users.name,
    })
    .from(demandas)
    .leftJoin(assistidos, eq(demandas.assistidoId, assistidos.id))
    .leftJoin(processos, eq(demandas.processoId, processos.id))
    .leftJoin(users, eq(demandas.delegadoParaId, users.id))
    .where(isNull(demandas.deletedAt));

  type Enriched = DemandaParaSync & {
    ordemManual: number | null;
    createdAt: Date;
    prazo: string | null;
    rank: number;
    importBatchId: string | null;
    ordemOriginal: number | null;
  };
  const bySheet = new Map<string, Enriched[]>();

  for (const r of rows) {
    const atribuicao = r.atribuicao ?? "SUBSTITUICAO";
    const sheetName = getSheetName(atribuicao);

    if (sheetNameFilter && sheetName !== sheetNameFilter) continue;

    const sync: DemandaParaSync = {
      id: r.id,
      status: r.status,
      substatus: r.substatus ?? null,
      reuPreso: r.reuPreso,
      dataEntrada: r.dataEntrada,
      ato: r.ato,
      prazo: r.prazo,
      providencias: r.providencias,
      assistidoNome: r.assistidoNome ?? "",
      numeroAutos: r.numeroAutos ?? "",
      atribuicao,
      delegadoNome: r.delegadoNome ?? null,
    };

    const enriched: Enriched = {
      ...sync,
      ordemManual: r.ordemManual,
      createdAt: r.createdAt,
      prazo: r.prazo,
      rank: computeRank(r.status, r.substatus),
      importBatchId: r.importBatchId,
      ordemOriginal: r.ordemOriginal,
    };

    if (!bySheet.has(sheetName)) bySheet.set(sheetName, []);
    bySheet.get(sheetName)!.push(enriched);
  }

  const cmp = (a: Enriched, b: Enriched): number => {
    if (a.rank !== b.rank) return a.rank - b.rank;

    // Espelha exatamente o sort da coluna do Kanban (kanban-premium.tsx:799):
    // ordemOriginal ASC (NULLS LAST) → createdAt DESC → prazo ASC.
    // `ordemManual` é legado e não é mais considerado pelas views.
    const oa = a.ordemOriginal ?? 9999;
    const ob = b.ordemOriginal ?? 9999;
    if (oa !== ob) return oa - ob;

    const ac = a.createdAt.getTime();
    const bc = b.createdAt.getTime();
    if (ac !== bc) return bc - ac;

    const ap = a.prazo;
    const bp = b.prazo;
    if (ap === bp) return 0;
    if (ap === null) return 1;
    if (bp === null) return -1;
    return ap.localeCompare(bp);
  };

  const results: Array<{ sheet: string; written: number; error?: string }> = [];
  let totalWritten = 0;
  for (const [sheetName, sortedDemandas] of bySheet.entries()) {
    sortedDemandas.sort(cmp);
    try {
      const { written } = await reorderSheet(sheetName, sortedDemandas);
      results.push({ sheet: sheetName, written });
      totalWritten += written;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ sheet: sheetName, written: 0, error: msg });
    }
  }

  return { totalWritten, sheets: results };
}
