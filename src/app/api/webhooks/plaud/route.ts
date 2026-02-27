/**
 * Webhook para receber eventos do Plaud (via Zapier ou direto)
 *
 * Aceita dois formatos de payload:
 *
 * 1. Formato OMBUDS (padrão):
 *    { event, recording_id, device_id, timestamp, data: { transcription, summary, ... } }
 *
 * 2. Formato Zapier (Plaud trigger "Transcript & Summary Ready"):
 *    { id, transcript, summary, audio_url, title, duration, ... }
 *    (campos flat, sem wrapper "data")
 */

import { NextRequest, NextResponse } from "next/server";
import { processWebhook, PlaudWebhookPayload, saveAsPendingReview } from "@/lib/services/plaud-api";
import { db } from "@/lib/db";
import { plaudConfig } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// Verifica a assinatura do webhook (se configurado)
function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Normaliza payload do Zapier para o formato OMBUDS.
 * O trigger "Transcript & Summary Ready" do Plaud no Zapier envia campos flat.
 */
function normalizePayload(raw: Record<string, unknown>): PlaudWebhookPayload {
  // Se já tem o campo "event", é formato OMBUDS — retornar como está
  if (raw.event && raw.data) {
    return raw as unknown as PlaudWebhookPayload;
  }

  // Formato Zapier: campos flat — normalizar para formato OMBUDS
  return {
    event: "transcription.completed",
    recording_id:
      String(raw.recording_id || raw.id || raw.record_id || `zapier_${Date.now()}`),
    device_id:
      String(raw.device_id || raw.deviceId || raw.device || "zapier"),
    timestamp: String(raw.timestamp || raw.created_at || new Date().toISOString()),
    data: {
      title: (raw.title || raw.name || raw.file_name) as string | undefined,
      duration: Number(raw.duration || raw.length || 0) || undefined,
      file_url: (raw.file_url || raw.audio_url || raw.url || raw.download_url) as
        | string
        | undefined,
      file_size: Number(raw.file_size || raw.size || 0) || undefined,
      transcription: (raw.transcription || raw.transcript || raw.text) as
        | string
        | undefined,
      summary: (raw.summary || raw.ai_summary || raw.note) as string | undefined,
      speakers: raw.speakers as
        | Array<{ id: string; name?: string; speaking_time?: number }>
        | undefined,
      language: (raw.language || "pt-BR") as string | undefined,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    // Obtém o payload
    const rawPayload = await request.text();
    let rawJson: Record<string, unknown>;

    try {
      rawJson = JSON.parse(rawPayload);
    } catch (e) {
      console.error("[Plaud Webhook] Payload inválido:", rawPayload.slice(0, 500));
      return NextResponse.json(
        { error: "Payload inválido" },
        { status: 400 }
      );
    }

    // Normaliza para formato OMBUDS (suporta Zapier flat e formato padrão)
    const payload = normalizePayload(rawJson);

    console.log(`[Plaud Webhook] Evento recebido: ${payload.event}`, {
      recording_id: payload.recording_id,
      device_id: payload.device_id,
      has_transcription: !!payload.data.transcription,
      has_summary: !!payload.data.summary,
      has_file_url: !!payload.data.file_url,
    });

    // Busca configuração: primeiro por device_id, depois fallback para config ativa
    let [config] = await db
      .select()
      .from(plaudConfig)
      .where(eq(plaudConfig.deviceId, payload.device_id))
      .limit(1);

    if (!config) {
      // Fallback: usar config ativa (útil quando vindo do Zapier sem device_id real)
      [config] = await db
        .select()
        .from(plaudConfig)
        .where(eq(plaudConfig.isActive, true))
        .limit(1);

      if (config) {
        console.log(
          `[Plaud Webhook] Device "${payload.device_id}" não encontrado, usando config ativa: ${config.deviceName}`
        );
      }
    }

    if (!config) {
      console.warn(
        `[Plaud Webhook] Nenhuma configuração Plaud encontrada. Configure em /admin/integracoes`
      );
      return NextResponse.json({ status: "device_not_configured" });
    }

    // Verifica assinatura se configurada
    const signature = request.headers.get("x-plaud-signature");
    if (config.webhookSecret && signature) {
      if (!verifySignature(rawPayload, signature, config.webhookSecret)) {
        console.error("[Plaud Webhook] Assinatura inválida");
        return NextResponse.json(
          { error: "Assinatura inválida" },
          { status: 401 }
        );
      }
    }

    // Garante que o device_id do payload corresponde ao config encontrado
    // (necessário quando Zapier envia sem device_id e usamos fallback)
    payload.device_id = config.deviceId;

    // Salvar como pendente de aprovação (NÃO processa automaticamente)
    const result = await saveAsPendingReview(payload, config.id, config.createdById);

    if (!result.success) {
      console.error(`[Plaud Webhook] Erro ao processar: ${result.error}`);
      return NextResponse.json(
        { status: "error", error: result.error },
        { status: 500 }
      );
    }

    console.log(
      `[Plaud Webhook] Salvo como pendente de aprovação: recording=${result.recordingId}`
    );

    return NextResponse.json({
      status: "pending_review",
      recordingId: result.recordingId,
    });
  } catch (error) {
    console.error("[Plaud Webhook] Erro:", error);
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

// Endpoint de verificação (GET)
export async function GET(request: NextRequest) {
  // Plaud pode enviar um challenge para verificar o endpoint
  const challenge = request.nextUrl.searchParams.get("challenge");

  if (challenge) {
    return new NextResponse(challenge, {
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({
    status: "ok",
    service: "Plaud Webhook",
    timestamp: new Date().toISOString(),
  });
}
