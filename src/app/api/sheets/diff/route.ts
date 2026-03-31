/**
 * GET /api/sheets/diff
 *
 * Compara planilha vs banco para uma aba específica.
 * Retorna divergências detalhadas campo a campo.
 *
 * Query params:
 *   ?sheet=Júri (default: Júri)
 *
 * Autenticação: Bearer token (SHEETS_WEBHOOK_SECRET)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { demandas, processos, assistidos } from "@/lib/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { readSheet, statusParaLabel, getSheetName } from "@/lib/services/google-sheets";

// Layout padrão: A=__id__, B=Status, C=Prisão, D=Data, E=Assistido, F=Autos, G=Ato, H=Prazo, I=Providências, J=Delegado
const COL = { ID: 0, STATUS: 1, PRESO: 2, DATA: 3, ASSISTIDO: 4, AUTOS: 5, ATO: 6, PRAZO: 7, PROVIDENCIAS: 8, DELEGADO: 9 };

interface DiffItem {
  demandaId: number | null;
  sheetRow: number;
  assistido: string;
  autos: string;
  divergencias: Array<{
    campo: string;
    planilha: string;
    banco: string;
  }>;
}

interface OrphanSheet {
  sheetRow: number;
  status: string;
  assistido: string;
  autos: string;
  ato: string;
}

interface OrphanDb {
  demandaId: number;
  status: string;
  assistido: string;
  autos: string;
  ato: string;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.SHEETS_WEBHOOK_SECRET ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const sheetName = req.nextUrl.searchParams.get("sheet") || "Júri";

  try {
    // 1. Ler planilha
    const rows = await readSheet(sheetName);

    // Mapear linhas da planilha por ID
    const sheetById = new Map<number, { row: number; data: string[] }>();
    const sheetOrphans: OrphanSheet[] = [];
    const sheetStats = { total: 0, withId: 0, withoutId: 0, byStatus: {} as Record<string, number> };

    for (let i = 3; i < rows.length; i++) { // Pula título(0), separador(1), header(2)
      const row = rows[i];
      if (!row || row.every(c => !c?.trim())) continue; // linha vazia

      sheetStats.total++;
      const idStr = String(row[COL.ID] ?? "").trim();
      const status = String(row[COL.STATUS] ?? "").trim();
      const assistido = String(row[COL.ASSISTIDO] ?? "").trim();
      const autos = String(row[COL.AUTOS] ?? "").trim();
      const ato = String(row[COL.ATO] ?? "").trim();

      // Contar por status
      sheetStats.byStatus[status] = (sheetStats.byStatus[status] || 0) + 1;

      if (idStr && !isNaN(Number(idStr))) {
        sheetStats.withId++;
        sheetById.set(Number(idStr), { row: i + 1, data: row });
      } else {
        sheetStats.withoutId++;
        sheetOrphans.push({ sheetRow: i + 1, status, assistido, autos, ato });
      }
    }

    // 2. Buscar demandas do banco para esta atribuição
    const atribuicaoMap: Record<string, string[]> = {
      "Júri": ["JURI_CAMACARI", "GRUPO_JURI"],
      "EP": ["EXECUCAO_PENAL"],
      "Substituição criminal": ["SUBSTITUICAO"],
      "Violência Doméstic": ["VVD_CAMACARI"],
      "Curadoria": ["SUBSTITUICAO_CIVEL"],
    };
    const atribuicoes = atribuicaoMap[sheetName] || [sheetName];

    const dbRows = await db
      .select({
        demandaId: demandas.id,
        status: demandas.status,
        substatus: demandas.substatus,
        ato: demandas.ato,
        dataEntrada: demandas.dataEntrada,
        prazo: demandas.prazo,
        reuPreso: demandas.reuPreso,
        providencias: demandas.providencias,
        assistidoNome: assistidos.nome,
        numeroAutos: processos.numeroAutos,
        atribuicao: processos.atribuicao,
      })
      .from(demandas)
      .innerJoin(processos, eq(demandas.processoId, processos.id))
      .innerJoin(assistidos, eq(demandas.assistidoId, assistidos.id))
      .where(
        and(
          isNull(demandas.deletedAt),
          inArray(processos.atribuicao, atribuicoes as any),
        )
      );

    // Stats do banco
    const dbStats = { total: dbRows.length, byStatus: {} as Record<string, number> };
    for (const r of dbRows) {
      const s = String(r.status);
      dbStats.byStatus[s] = (dbStats.byStatus[s] || 0) + 1;
    }

    // 3. Comparar campo a campo
    const divergencias: DiffItem[] = [];
    const dbById = new Map(dbRows.map(r => [r.demandaId, r]));
    const matchedDbIds = new Set<number>();

    for (const [id, sheet] of sheetById) {
      const db = dbById.get(id);
      if (!db) {
        // ID na planilha mas não no banco
        divergencias.push({
          demandaId: id,
          sheetRow: sheet.row,
          assistido: String(sheet.data[COL.ASSISTIDO] ?? ""),
          autos: String(sheet.data[COL.AUTOS] ?? ""),
          divergencias: [{ campo: "existência", planilha: "existe", banco: "NÃO ENCONTRADA" }],
        });
        continue;
      }

      matchedDbIds.add(id);
      const diffs: DiffItem["divergencias"] = [];

      // Status
      const sheetStatus = String(sheet.data[COL.STATUS] ?? "").trim();
      const dbStatusLabel = statusParaLabel(String(db.status), db.substatus);
      if (sheetStatus && dbStatusLabel && sheetStatus !== dbStatusLabel) {
        diffs.push({ campo: "status", planilha: sheetStatus, banco: dbStatusLabel });
      }

      // Ato
      const sheetAto = String(sheet.data[COL.ATO] ?? "").trim();
      const dbAto = String(db.ato ?? "").trim();
      if (sheetAto && dbAto && sheetAto !== dbAto) {
        diffs.push({ campo: "ato", planilha: sheetAto, banco: dbAto });
      }

      // Assistido
      const sheetAssistido = String(sheet.data[COL.ASSISTIDO] ?? "").trim();
      const dbAssistido = String(db.assistidoNome ?? "").trim();
      if (sheetAssistido && dbAssistido && sheetAssistido.toLowerCase() !== dbAssistido.toLowerCase()) {
        diffs.push({ campo: "assistido", planilha: sheetAssistido, banco: dbAssistido });
      }

      // Autos
      const sheetAutos = String(sheet.data[COL.AUTOS] ?? "").trim();
      const dbAutos = String(db.numeroAutos ?? "").trim();
      if (sheetAutos && dbAutos && sheetAutos !== dbAutos) {
        diffs.push({ campo: "autos", planilha: sheetAutos, banco: dbAutos });
      }

      // Providências
      const sheetProv = String(sheet.data[COL.PROVIDENCIAS] ?? "").trim();
      const dbProv = String(db.providencias ?? "").trim();
      if (sheetProv !== dbProv) {
        diffs.push({ campo: "providencias", planilha: sheetProv || "(vazio)", banco: dbProv || "(vazio)" });
      }

      if (diffs.length > 0) {
        divergencias.push({
          demandaId: id,
          sheetRow: sheet.row,
          assistido: sheetAssistido || dbAssistido,
          autos: sheetAutos || dbAutos,
          divergencias: diffs,
        });
      }
    }

    // 4. Demandas no banco sem correspondente na planilha
    const dbOrphans: OrphanDb[] = [];
    for (const r of dbRows) {
      if (!matchedDbIds.has(r.demandaId) && !sheetById.has(r.demandaId)) {
        dbOrphans.push({
          demandaId: r.demandaId,
          status: String(r.status),
          assistido: String(r.assistidoNome ?? ""),
          autos: String(r.numeroAutos ?? ""),
          ato: String(r.ato ?? ""),
        });
      }
    }

    return NextResponse.json({
      sheet: sheetName,
      resumo: {
        planilha: sheetStats,
        banco: dbStats,
        divergencias: divergencias.length,
        orfasPlanilha: sheetOrphans.length,
        orfasBanco: dbOrphans.length,
      },
      divergencias,
      orfasPlanilha: sheetOrphans,
      orfasBanco: dbOrphans,
    });
  } catch (err) {
    console.error("[Sheets Diff]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
