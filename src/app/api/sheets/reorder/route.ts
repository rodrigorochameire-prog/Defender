/**
 * POST /api/sheets/reorder
 *
 * Reescreve todas as abas da planilha reordenando as linhas por:
 * 1. Grupo de status (prefixo numérico do label: 1 → 7)
 * 2. ordemManual do OMBUDS (ASC NULLS LAST)
 * 3. createdAt DESC (mais recente primeiro)
 * 4. prazo ASC NULLS LAST
 *
 * Operação idempotente mas pesada — dispara sob demanda, não a cada update.
 *
 * Autenticação: Bearer token (SHEETS_WEBHOOK_SECRET)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { demandas, processos, assistidos, users } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import {
  reorderSheet,
  getSheetName,
  type DemandaParaSync,
} from "@/lib/services/google-sheets";

function getWebhookSecret(): string {
  return process.env.SHEETS_WEBHOOK_SECRET ?? "";
}

/**
 * Rank posicional exato que reflete a ordem visual do kanban de
 * src/config/demanda-status.ts (STATUS_OPTIONS_BY_COLUMN).
 *
 * Duplicado aqui para manter a route pure-data (evita importar React).
 * Se a ordem no kanban mudar, atualizar os dois lugares.
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
  monitorar: 31,
  documentos: 32,
  testemunhas: 33,
  investigar: 34,
  buscar: 35,
  diligenciar: 36,
  oficiar: 37,
  // === EM ANDAMENTO — Saída ===
  protocolar: 40,
  // === EM ANDAMENTO — Delegações ===
  emilly: 50,
  amanda: 51,
  taissa: 52,
  "estagio_-_taissa": 52,
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

/** Mapeia status DB enum → rank quando o substatus não ajuda */
const DB_STATUS_FALLBACK_RANK: Record<string, number> = {
  URGENTE: 10,
  "5_TRIAGEM": 11,
  "2_ATENDER": 30,       // default diligencias/atender
  "4_MONITORAR": 31,     // diligencias/monitorar
  "7_PROTOCOLADO": 70,
  "7_CIENCIA": 72,
  "7_SEM_ATUACAO": 75,
  CONCLUIDO: 73,
  ARQUIVADO: 90,
};

/**
 * Normaliza substatus (remove prefixo numérico "2 - ", lowercase, sem acentos).
 * Ex: "2 - Elaborar" → "elaborar"
 */
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization") ?? "";
  const secret = getWebhookSecret();

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Busca todas as demandas ativas com dados de join
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

  // Agrupa por sheetName (= atribuição mapeada) e já carrega metadados de sort
  type Enriched = DemandaParaSync & {
    ordemManual: number | null;
    createdAt: Date;
    prazo: string | null;
    rank: number;
  };
  const bySheet = new Map<string, Enriched[]>();

  for (const r of rows) {
    const atribuicao = r.atribuicao ?? "SUBSTITUICAO";
    const sheetName = getSheetName(atribuicao);

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
    };

    if (!bySheet.has(sheetName)) bySheet.set(sheetName, []);
    bySheet.get(sheetName)!.push(enriched);
  }

  // Sort key: [rank ASC, ordemManual ASC NULLS LAST, createdAt DESC, prazo ASC NULLS LAST]
  const cmp = (a: Enriched, b: Enriched): number => {
    if (a.rank !== b.rank) return a.rank - b.rank;

    const ao = a.ordemManual;
    const bo = b.ordemManual;
    if (ao !== bo) {
      if (ao === null) return 1;
      if (bo === null) return -1;
      return ao - bo;
    }

    const ac = a.createdAt.getTime();
    const bc = b.createdAt.getTime();
    if (ac !== bc) return bc - ac; // DESC

    const ap = a.prazo;
    const bp = b.prazo;
    if (ap === bp) return 0;
    if (ap === null) return 1;
    if (bp === null) return -1;
    return ap.localeCompare(bp);
  };

  // Reordena cada aba sequencialmente (evita thundering herd na Sheets API)
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

  return NextResponse.json({
    totalWritten,
    sheets: results,
    message: `Reordenação completa: ${totalWritten} linhas em ${results.length} abas`,
  });
}
