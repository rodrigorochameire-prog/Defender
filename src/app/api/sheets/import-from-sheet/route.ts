/**
 * POST /api/sheets/import-from-sheet
 *
 * Importa status, ato, e providências da planilha → banco.
 * A planilha é a fonte de verdade.
 *
 * Modos:
 *   ?sheet=Júri&mode=preview  — mostra o que seria alterado (default)
 *   ?sheet=Júri&mode=apply    — aplica as alterações
 *
 * Autenticação: Bearer token (SHEETS_WEBHOOK_SECRET)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { demandas, registros as registrosTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { readSheet, statusParaLabel } from "@/lib/services/google-sheets";
import { parseProvidenciasCell } from "@/lib/services/registros-summary";

const COL = { ID: 0, STATUS: 1, PRESO: 2, DATA: 3, ASSISTIDO: 4, AUTOS: 5, ATO: 6, PRAZO: 7, PROVIDENCIAS: 8 };

// Mapa: label da planilha → {status, substatus} no banco
const LABEL_TO_DB: Record<string, { status: string; substatus: string | null }> = {
  "1 - Urgente":            { status: "URGENTE", substatus: null },
  "2 - Analisar":           { status: "2_ATENDER", substatus: "2 - Analisar" },
  "2 - Atender":            { status: "2_ATENDER", substatus: "2 - Atender" },
  "2 - Buscar":             { status: "2_ATENDER", substatus: "2 - Buscar" },
  "2 - Diligenciar":        { status: "2_ATENDER", substatus: "2 - Diligenciar" },
  "2 - Investigar":         { status: "2_ATENDER", substatus: "2 - Investigar" },
  "2 - Relatório":          { status: "2_ATENDER", substatus: "2 - Relatório" },
  "2 - Elaborar":           { status: "2_ATENDER", substatus: "2 - Elaborar" },
  "2 - Elaborando":         { status: "2_ATENDER", substatus: "2 - Elaborando" },
  "2 - Revisar":            { status: "2_ATENDER", substatus: "2 - Revisar" },
  "2 - Revisando":          { status: "2_ATENDER", substatus: "2 - Revisando" },
  "3 - Protocolar":         { status: "2_ATENDER", substatus: "3 - Protocolar" },
  "4 - Amanda":             { status: "4_MONITORAR", substatus: "4 - Amanda" },
  "4 - Estágio - Taissa":   { status: "4_MONITORAR", substatus: "4 - Estágio - Taissa" },
  "4 - Emilly":             { status: "4_MONITORAR", substatus: "4 - Emilly" },
  "4 - Monitorar":          { status: "4_MONITORAR", substatus: "4 - Monitorar" },
  "5 - Triagem":             { status: "5_TRIAGEM", substatus: null },
  "6 - Documentos":         { status: "2_ATENDER", substatus: "6 - Documentos" },
  "6 - Testemunhas":        { status: "2_ATENDER", substatus: "6 - Testemunhas" },
  "7 - Protocolado":        { status: "7_PROTOCOLADO", substatus: null },
  "7 - Sigad":              { status: "7_PROTOCOLADO", substatus: "7 - Sigad" },
  "7 - Ciência":            { status: "7_CIENCIA", substatus: null },
  "7 - Resolvido":          { status: "CONCLUIDO", substatus: "7 - Resolvido" },
  "7 - Constituiu advogado":{ status: "CONCLUIDO", substatus: "7 - Constituiu advogado" },
  "7 - Sem atuação":        { status: "7_SEM_ATUACAO", substatus: null },
  "7 - Peticionamento intermediário": { status: "7_PROTOCOLADO", substatus: "7 - Peticionamento intermediário" },
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.SHEETS_WEBHOOK_SECRET ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const sheetName = req.nextUrl.searchParams.get("sheet") || "Júri";
  const mode = req.nextUrl.searchParams.get("mode") || "preview";

  try {
    const rows = await readSheet(sheetName);
    const changes: Array<{
      demandaId: number;
      row: number;
      assistido: string;
      field: string;
      from: string;
      to: string;
    }> = [];

    let applied = 0;
    let skipped = 0;

    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(c => !c?.trim())) continue;

      const idStr = String(row[COL.ID] ?? "").trim();
      if (!idStr || isNaN(Number(idStr))) { skipped++; continue; }

      const demandaId = Number(idStr);
      const sheetStatus = String(row[COL.STATUS] ?? "").trim();
      const sheetAto = String(row[COL.ATO] ?? "").trim();
      const sheetAssistido = String(row[COL.ASSISTIDO] ?? "").trim();
      // Não dar trim aqui — o conteúdo abaixo do marker pode ter quebras
      // significativas. parseProvidenciasCell faz o trim.
      const sheetProvidenciasRaw = row[COL.PROVIDENCIAS] != null
        ? String(row[COL.PROVIDENCIAS])
        : "";

      // Buscar demanda atual no banco
      const [current] = await db
        .select({
          status: demandas.status,
          substatus: demandas.substatus,
          ato: demandas.ato,
          assistidoId: demandas.assistidoId,
          processoId: demandas.processoId,
        })
        .from(demandas)
        .where(eq(demandas.id, demandaId))
        .limit(1);

      if (!current) { skipped++; continue; }

      const updates: Record<string, unknown> = {};

      // Status: planilha → banco
      if (sheetStatus) {
        const mapped = LABEL_TO_DB[sheetStatus];
        if (mapped) {
          const currentLabel = statusParaLabel(String(current.status), current.substatus);
          if (currentLabel !== sheetStatus) {
            changes.push({ demandaId, row: i + 1, assistido: sheetAssistido, field: "status", from: currentLabel, to: sheetStatus });
            updates.status = mapped.status;
            updates.substatus = mapped.substatus;
          }
        }
      }

      // Ato: planilha → banco
      if (sheetAto && sheetAto !== String(current.ato ?? "")) {
        changes.push({ demandaId, row: i + 1, assistido: sheetAssistido, field: "ato", from: String(current.ato ?? ""), to: sheetAto });
        updates.ato = sheetAto;
      }

      // Providências: 2-way sync. Extrai apenas o que está abaixo do marker
      // (texto livre que o usuário escreveu) e cria um registro tipo='anotacao'.
      // O resumo automático no topo é ignorado.
      const { userNote } = parseProvidenciasCell(sheetProvidenciasRaw);
      if (userNote && current.assistidoId) {
        changes.push({
          demandaId,
          row: i + 1,
          assistido: sheetAssistido,
          field: "providencias",
          from: "(novo registro)",
          to: userNote.length > 80 ? userNote.slice(0, 79) + "…" : userNote,
        });
        if (mode === "apply") {
          await db.insert(registrosTable).values({
            tipo: "anotacao",
            assistidoId: current.assistidoId,
            processoId: current.processoId ?? null,
            demandaId: demandaId,
            conteudo: userNote,
            dataRegistro: new Date(),
            autorId: null,
            status: "realizado",
            interlocutor: "outro",
          });
        }
      }

      // Aplicar se modo = apply
      if (mode === "apply" && Object.keys(updates).length > 0) {
        await db.update(demandas)
          .set({ ...updates, updatedAt: new Date() } as any)
          .where(eq(demandas.id, demandaId));
        applied++;
      }
    }

    return NextResponse.json({
      sheet: sheetName,
      mode,
      totalRows: rows.length - 3,
      skipped,
      changes: changes.length,
      applied: mode === "apply" ? applied : "preview — use mode=apply para aplicar",
      details: changes,
    });
  } catch (err) {
    console.error("[Import from sheet]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
