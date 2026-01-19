import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { demandas, processos, assistidos, calendarEvents, movimentacoes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Webhook endpoint para integrações com n8n
 * 
 * Este endpoint recebe dados de automações n8n para:
 * - Criar prazos/demandas a partir de planilhas Google Sheets
 * - Sincronizar eventos do Google Calendar
 * - Receber notificações de movimentações do TJ
 * - Atualizar status de processos
 * 
 * Configuração no n8n:
 * 1. Use o nó "HTTP Request" com método POST
 * 2. URL: https://seu-dominio.com/api/webhooks/n8n
 * 3. Headers: 
 *    - Content-Type: application/json
 *    - x-webhook-secret: SEU_SECRET
 * 4. Body: JSON com { action: "...", data: {...} }
 */

// Verificar token de autenticação
function verifyWebhookSecret(request: NextRequest): boolean {
  const secret = request.headers.get("x-webhook-secret");
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET;
  
  if (!expectedSecret) {
    console.warn("N8N_WEBHOOK_SECRET não configurado");
    return true; // Em desenvolvimento, aceita qualquer request
  }
  
  return secret === expectedSecret;
}

// Tipos de ações suportadas
type WebhookAction = 
  | "create_demanda"
  | "update_demanda_status"
  | "create_movimentacao"
  | "sync_calendar_event"
  | "create_assistido"
  | "update_processo";

interface WebhookPayload {
  action: WebhookAction;
  data: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    if (!verifyWebhookSecret(request)) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid webhook secret" },
        { status: 401 }
      );
    }

    const payload: WebhookPayload = await request.json();
    
    if (!payload.action || !payload.data) {
      return NextResponse.json(
        { error: "Bad Request", message: "Missing action or data" },
        { status: 400 }
      );
    }

    let result: Record<string, unknown> = {};

    switch (payload.action) {
      case "create_demanda":
        result = await handleCreateDemanda(payload.data);
        break;
        
      case "update_demanda_status":
        result = await handleUpdateDemandaStatus(payload.data);
        break;
        
      case "create_movimentacao":
        result = await handleCreateMovimentacao(payload.data);
        break;
        
      case "sync_calendar_event":
        result = await handleSyncCalendarEvent(payload.data);
        break;
        
      case "create_assistido":
        result = await handleCreateAssistido(payload.data);
        break;
        
      case "update_processo":
        result = await handleUpdateProcesso(payload.data);
        break;
        
      default:
        return NextResponse.json(
          { error: "Bad Request", message: `Unknown action: ${payload.action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action: payload.action,
      result,
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: (error as Error).message },
      { status: 500 }
    );
  }
}

// Handlers para cada ação

async function handleCreateDemanda(data: Record<string, unknown>) {
  const {
    processoId,
    assistidoId,
    ato,
    tipoAto,
    prazo,
    dataEntrada,
    status,
    prioridade,
    providencias,
    defensorId,
    reuPreso,
  } = data;

  if (!processoId || !assistidoId || !ato) {
    throw new Error("Missing required fields: processoId, assistidoId, ato");
  }

  const [demanda] = await db.insert(demandas).values({
    processoId: Number(processoId),
    assistidoId: Number(assistidoId),
    ato: String(ato),
    tipoAto: tipoAto ? String(tipoAto) : null,
    prazo: prazo ? String(prazo) : null,
    dataEntrada: dataEntrada ? String(dataEntrada) : null,
    status: (status as "5_FILA" | "2_ATENDER" | "4_MONITORAR" | "7_PROTOCOLADO") || "5_FILA",
    prioridade: (prioridade as "NORMAL" | "ALTA" | "URGENTE" | "REU_PRESO") || "NORMAL",
    providencias: providencias ? String(providencias) : null,
    defensorId: defensorId ? Number(defensorId) : null,
    reuPreso: Boolean(reuPreso),
  }).returning();

  return { demandaId: demanda.id };
}

async function handleUpdateDemandaStatus(data: Record<string, unknown>) {
  const { demandaId, status, dataConclusao } = data;

  if (!demandaId || !status) {
    throw new Error("Missing required fields: demandaId, status");
  }

  const updateData: Record<string, unknown> = {
    status: status as string,
    updatedAt: new Date(),
  };

  if (status === "7_PROTOCOLADO" || status === "CONCLUIDO") {
    updateData.dataConclusao = dataConclusao ? new Date(String(dataConclusao)) : new Date();
  }

  await db.update(demandas)
    .set(updateData)
    .where(eq(demandas.id, Number(demandaId)));

  return { updated: true };
}

async function handleCreateMovimentacao(data: Record<string, unknown>) {
  const { processoId, descricao, tipo, dataMovimentacao, origem } = data;

  if (!processoId || !descricao) {
    throw new Error("Missing required fields: processoId, descricao");
  }

  const [movimentacao] = await db.insert(movimentacoes).values({
    processoId: Number(processoId),
    descricao: String(descricao),
    tipo: tipo ? String(tipo) : null,
    dataMovimentacao: dataMovimentacao ? new Date(String(dataMovimentacao)) : new Date(),
    origem: (origem as "manual" | "push_tj" | "importacao") || "importacao",
  }).returning();

  return { movimentacaoId: movimentacao.id };
}

async function handleSyncCalendarEvent(data: Record<string, unknown>) {
  const {
    googleEventId,
    title,
    description,
    eventDate,
    endDate,
    eventType,
    processoId,
    assistidoId,
    location,
  } = data;

  if (!title || !eventDate || !eventType) {
    throw new Error("Missing required fields: title, eventDate, eventType");
  }

  // Verificar se já existe evento com esse googleEventId
  // Por enquanto, sempre cria um novo
  const [event] = await db.insert(calendarEvents).values({
    title: String(title),
    description: description ? String(description) : null,
    eventDate: new Date(String(eventDate)),
    endDate: endDate ? new Date(String(endDate)) : null,
    eventType: String(eventType),
    processoId: processoId ? Number(processoId) : null,
    assistidoId: assistidoId ? Number(assistidoId) : null,
    location: location ? String(location) : null,
    notes: googleEventId ? `Google Event ID: ${googleEventId}` : null,
    createdById: 1, // TODO: usar um usuário de sistema
  }).returning();

  return { eventId: event.id };
}

async function handleCreateAssistido(data: Record<string, unknown>) {
  const {
    nome,
    cpf,
    nomeMae,
    statusPrisional,
    localPrisao,
    telefone,
    telefoneContato,
    nomeContato,
    endereco,
    defensorId,
  } = data;

  if (!nome) {
    throw new Error("Missing required field: nome");
  }

  const [assistido] = await db.insert(assistidos).values({
    nome: String(nome),
    cpf: cpf ? String(cpf) : null,
    nomeMae: nomeMae ? String(nomeMae) : null,
    statusPrisional: (statusPrisional as "SOLTO" | "CADEIA_PUBLICA" | "PENITENCIARIA") || "SOLTO",
    localPrisao: localPrisao ? String(localPrisao) : null,
    telefone: telefone ? String(telefone) : null,
    telefoneContato: telefoneContato ? String(telefoneContato) : null,
    nomeContato: nomeContato ? String(nomeContato) : null,
    endereco: endereco ? String(endereco) : null,
    defensorId: defensorId ? Number(defensorId) : null,
  }).returning();

  return { assistidoId: assistido.id };
}

async function handleUpdateProcesso(data: Record<string, unknown>) {
  const { processoId, situacao, fase, linkDrive, driveFolderId } = data;

  if (!processoId) {
    throw new Error("Missing required field: processoId");
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (situacao) updateData.situacao = String(situacao);
  if (fase) updateData.fase = String(fase);
  if (linkDrive) updateData.linkDrive = String(linkDrive);
  if (driveFolderId) updateData.driveFolderId = String(driveFolderId);

  await db.update(processos)
    .set(updateData)
    .where(eq(processos.id, Number(processoId)));

  return { updated: true };
}

// GET para verificar se o webhook está funcionando
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "DefesaHub n8n Webhook Endpoint",
    version: "1.0",
    actions: [
      "create_demanda",
      "update_demanda_status",
      "create_movimentacao",
      "sync_calendar_event",
      "create_assistido",
      "update_processo",
    ],
    documentation: "https://docs.defesahub.com/webhooks",
  });
}
