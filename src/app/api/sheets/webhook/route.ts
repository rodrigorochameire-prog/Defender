/**
 * POST /api/sheets/webhook
 *
 * Recebe notificações do Apps Script instalado na planilha Google Sheets.
 * Quando o usuário edita uma célula, o Apps Script chama este endpoint
 * com o ID da demanda e o campo/valor alterado.
 *
 * Autenticação: Bearer token (SHEETS_WEBHOOK_SECRET)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { demandas, processos, assistidos } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { registerConflict, logSyncAction, classifySync } from "@/lib/services/sync-engine";

// Mapeamento: nome do campo no Apps Script → campo no banco
const CAMPO_MAP: Record<string, string> = {
  status: "status",
  reuPreso: "reuPreso",
  dataEntrada: "dataEntrada",
  assistido: "assistidoNome", // tratamento especial
  autos: "numeroAutos",       // tratamento especial
  ato: "ato",
  prazo: "prazo",
  providencias: "providencias",
  delegadoPara: "delegadoPara", // tratamento especial
};

// Mapeamento completo: label da planilha (uppercase) → status DB + substatus
const SHEETS_LABEL_TO_STATUS: Record<string, { status: string; substatus: string | null }> = {
  "1 - URGENTE":            { status: "URGENTE",       substatus: null },
  "2 - RELATÓRIO":          { status: "2_ATENDER",     substatus: "2 - Relatório" },
  "2 - ANALISAR":           { status: "2_ATENDER",     substatus: "2 - Analisar" },
  "2 - ATENDER":            { status: "2_ATENDER",     substatus: "2 - Atender" },
  "2 - BUSCAR":             { status: "2_ATENDER",     substatus: "2 - Buscar" },
  "2 - DILIGENCIAR":        { status: "2_ATENDER",     substatus: "2 - Diligenciar" },
  "2 - INVESTIGAR":         { status: "2_ATENDER",     substatus: "2 - Investigar" },
  "2 - ELABORAR":           { status: "2_ATENDER",     substatus: "2 - Elaborar" },
  "2 - ELABORANDO":         { status: "2_ATENDER",     substatus: "2 - Elaborando" },
  "2 - REVISAR":            { status: "2_ATENDER",     substatus: "2 - Revisar" },
  "2 - REVISANDO":          { status: "2_ATENDER",     substatus: "2 - Revisando" },
  "3 - PROTOCOLAR":         { status: "2_ATENDER",     substatus: "3 - Protocolar" },
  "4 - AMANDA":             { status: "4_MONITORAR",   substatus: "4 - Amanda" },
  "4 - ESTÁGIO - TAISSA":   { status: "4_MONITORAR",   substatus: "4 - Estágio - Taissa" },
  "4 - EMILLY":             { status: "4_MONITORAR",   substatus: "4 - Emilly" },
  "4 - MONITORAR":          { status: "4_MONITORAR",   substatus: "4 - Monitorar" },
  "5 - TRIAGEM":             { status: "5_TRIAGEM",      substatus: "triagem" },
  "6 - DOCUMENTOS":         { status: "2_ATENDER",     substatus: "6 - Documentos" },
  "6 - TESTEMUNHAS":        { status: "2_ATENDER",     substatus: "6 - Testemunhas" },
  "7 - PROTOCOLADO":        { status: "7_PROTOCOLADO", substatus: null },
  "7 - SIGAD":              { status: "7_PROTOCOLADO", substatus: "7 - Sigad" },
  "7 - CIÊNCIA":            { status: "7_CIENCIA",     substatus: null },
  "7 - RESOLVIDO":          { status: "CONCLUIDO",     substatus: "7 - Resolvido" },
  "7 - CONSTITUIU ADVOGADO":{ status: "CONCLUIDO",     substatus: "7 - Constituiu advogado" },
  "7 - SEM ATUAÇÃO":        { status: "7_SEM_ATUACAO", substatus: null },
  "7 - PETICIONAMENTO INTERMEDIÁRIO": { status: "7_PROTOCOLADO", substatus: "7 - Peticionamento intermediário" },
};

function getWebhookSecret(): string {
  return process.env.SHEETS_WEBHOOK_SECRET ?? "";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Autenticação
  const authHeader = req.headers.get("authorization") ?? "";
  const secret = getWebhookSecret();

  if (!secret) {
    console.error("[Sheets Webhook] SHEETS_WEBHOOK_SECRET não configurado");
    return NextResponse.json({ error: "Servidor não configurado" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // 2. Parse do body
  let body: { id?: unknown; campo?: unknown; valor?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { id, campo, valor } = body;

  if (!id || !campo || typeof campo !== "string") {
    return NextResponse.json({ error: "Campos obrigatórios: id, campo, valor" }, { status: 400 });
  }

  const demandaId = Number(id);
  if (isNaN(demandaId) || demandaId <= 0) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const campoDb = CAMPO_MAP[campo];
  if (!campoDb) {
    // Campo não mapeado — ignora silenciosamente
    return NextResponse.json({ ok: true, info: "Campo não sincronizado" });
  }

  const valorStr = valor != null ? String(valor).trim() : "";

  // 3. Busca a demanda
  const [demanda] = await db
    .select({
      id: demandas.id,
      processoId: demandas.processoId,
      assistidoId: demandas.assistidoId,
    })
    .from(demandas)
    .where(and(eq(demandas.id, demandaId), isNull(demandas.deletedAt)))
    .limit(1);

  if (!demanda) {
    return NextResponse.json({ error: "Demanda não encontrada" }, { status: 404 });
  }

  // --- DETECÇÃO DE CONFLITO ---
  const direction = classifySync(campoDb);
  if (direction === "BANCO_TO_SHEET") {
    // Campo unidirecional — planilha não deveria editar este campo
    return NextResponse.json({ ok: true, skipped: "banco_to_sheet_only" });
  }

  // Verificar se banco mudou desde último sync
  const currentDemanda = await db.query.demandas.findFirst({
    where: eq(demandas.id, demandaId),
    columns: { status: true, substatus: true, providencias: true, updatedAt: true, syncedAt: true },
  });

  if (currentDemanda) {
    const syncedAt = currentDemanda.syncedAt ?? new Date(0);
    const bancoMudou = currentDemanda.updatedAt > syncedAt;

    if (bancoMudou) {
      // Banco mudou desde último sync — verificar se é conflito real
      // (valores diferentes = conflito, valores iguais = ok)
      const valorAtualBanco = String((currentDemanda as any)[campoDb] ?? "");
      const valorNovoPlanilha = String(valor);

      if (valorAtualBanco !== valorNovoPlanilha) {
        await registerConflict(
          demandaId, campoDb,
          valorAtualBanco, valorNovoPlanilha,
          currentDemanda.updatedAt, new Date(),
        );
        return NextResponse.json({ ok: true, conflict: true, field: campoDb });
      }
    }
  }
  // --- FIM DETECÇÃO DE CONFLITO ---

  // 4. Aplica a mudança com skipSheetSync (evita loop)
  try {
    switch (campoDb) {
      case "status": {
        const resultado = normalizarStatus(valorStr);
        if (!resultado) {
          return NextResponse.json({
            error: `Status inválido: "${valorStr}"`,
            validos: Object.keys(SHEETS_LABEL_TO_STATUS),
          }, { status: 400 });
        }
        await db
          .update(demandas)
          .set({ status: resultado.status as never, substatus: resultado.substatus, updatedAt: new Date() })
          .where(eq(demandas.id, demandaId));
        break;
      }

      case "reuPreso": {
        // Aceita: "true", "false", data de prisão (não vazio = preso)
        const preso = valorStr !== "" && valorStr !== "false" && valorStr !== "0";
        await db
          .update(demandas)
          .set({ reuPreso: preso, updatedAt: new Date() })
          .where(eq(demandas.id, demandaId));
        break;
      }

      case "dataEntrada": {
        const data = parseDateValue(valorStr);
        await db
          .update(demandas)
          .set({ dataEntrada: data, updatedAt: new Date() })
          .where(eq(demandas.id, demandaId));
        break;
      }

      case "prazo": {
        const data = parseDateValue(valorStr);
        await db
          .update(demandas)
          .set({ prazo: data, updatedAt: new Date() })
          .where(eq(demandas.id, demandaId));
        break;
      }

      case "ato": {
        await db
          .update(demandas)
          .set({ ato: valorStr || undefined, updatedAt: new Date() })
          .where(eq(demandas.id, demandaId));
        break;
      }

      case "providencias": {
        await db
          .update(demandas)
          .set({ providencias: valorStr || undefined, updatedAt: new Date() })
          .where(eq(demandas.id, demandaId));
        break;
      }

      case "assistidoNome": {
        if (valorStr && demanda.assistidoId) {
          await db
            .update(assistidos)
            .set({ nome: valorStr })
            .where(eq(assistidos.id, demanda.assistidoId));
        }
        break;
      }

      case "numeroAutos": {
        if (valorStr && demanda.processoId) {
          await db
            .update(processos)
            .set({ numeroAutos: valorStr })
            .where(eq(processos.id, demanda.processoId));
        }
        break;
      }

      case "delegadoPara": {
        // Ignora por enquanto — delegação requer lógica de busca de usuário
        return NextResponse.json({ ok: true, info: "Delegação via planilha não suportada ainda" });
      }
    }

    // Atualizar syncedAt após sync bem-sucedido
    await db.update(demandas)
      .set({ syncedAt: new Date() })
      .where(eq(demandas.id, demandaId));

    // Registrar log
    await logSyncAction(demandaId, campoDb, null, String(valor), "PLANILHA");

    console.log(`[Sheets Webhook] Demanda ${demandaId} — campo "${campo}" atualizado: "${valorStr}"`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[Sheets Webhook] Erro ao atualizar demanda ${demandaId}:`, err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ==========================================
// HELPERS
// ==========================================

/**
 * Converte label da planilha para { status, substatus } do banco.
 * Ex: "2 - Elaborar" → { status: "2_ATENDER", substatus: "2 - Elaborar" }
 */
function normalizarStatus(valor: string): { status: string; substatus: string | null } | null {
  const upper = valor.toUpperCase().trim();
  return SHEETS_LABEL_TO_STATUS[upper] ?? null;
}

/**
 * Converte string de data para formato YYYY-MM-DD.
 * Aceita: DD/MM/YY, DD/MM/YYYY, YYYY-MM-DD
 */
function parseDateValue(valor: string): string | null {
  if (!valor) return null;

  // Já no formato ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;

  // DD/MM/YY ou DD/MM/YYYY
  const match = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    const [, d, m, y] = match;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}
