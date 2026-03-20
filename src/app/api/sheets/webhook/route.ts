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

// Status válidos do banco
const STATUS_VALIDOS = new Set([
  "2_ATENDER",
  "4_MONITORAR",
  "5_FILA",
  "7_PROTOCOLADO",
  "7_CIENCIA",
  "7_SEM_ATUACAO",
  "URGENTE",
  "CONCLUIDO",
  "ARQUIVADO",
]);

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

  // 4. Aplica a mudança com skipSheetSync (evita loop)
  try {
    switch (campoDb) {
      case "status": {
        // Normaliza o valor (planilha pode ter "2 - Elaborar" → "2_ATENDER")
        const statusNormalizado = normalizarStatus(valorStr);
        if (!STATUS_VALIDOS.has(statusNormalizado)) {
          return NextResponse.json({
            error: `Status inválido: "${valorStr}"`,
            validos: [...STATUS_VALIDOS],
          }, { status: 400 });
        }
        await db
          .update(demandas)
          .set({ status: statusNormalizado as never, updatedAt: new Date() })
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
 * Normaliza status da planilha para o enum do banco.
 * Ex: "5 - Fila" → "5_FILA", "URGENTE" → "URGENTE"
 */
function normalizarStatus(valor: string): string {
  const upper = valor.toUpperCase().trim();

  // Já no formato correto
  if (STATUS_VALIDOS.has(upper)) return upper;

  // Tenta mapear formatos legíveis
  const mapeamento: Record<string, string> = {
    "2 - ATENDER": "2_ATENDER",
    "2_ATENDER": "2_ATENDER",
    "ATENDER": "2_ATENDER",
    "4 - MONITORAR": "4_MONITORAR",
    "4_MONITORAR": "4_MONITORAR",
    "MONITORAR": "4_MONITORAR",
    "5 - FILA": "5_FILA",
    "5_FILA": "5_FILA",
    "FILA": "5_FILA",
    "7 - PROTOCOLADO": "7_PROTOCOLADO",
    "7_PROTOCOLADO": "7_PROTOCOLADO",
    "PROTOCOLADO": "7_PROTOCOLADO",
    "7 - CIENCIA": "7_CIENCIA",
    "7_CIENCIA": "7_CIENCIA",
    "CIENCIA": "7_CIENCIA",
    "7 - SEM ATUACAO": "7_SEM_ATUACAO",
    "7_SEM_ATUACAO": "7_SEM_ATUACAO",
    "SEM ATUACAO": "7_SEM_ATUACAO",
    "URGENTE": "URGENTE",
    "CONCLUIDO": "CONCLUIDO",
    "ARQUIVADO": "ARQUIVADO",
  };

  return mapeamento[upper] ?? upper;
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
