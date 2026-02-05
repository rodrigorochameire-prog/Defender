/**
 * Webhook para receber eventos do Plaud
 *
 * O Plaud envia notificações para:
 * - recording.completed: Gravação finalizada
 * - transcription.completed: Transcrição pronta
 * - summary.completed: Resumo gerado
 */

import { NextRequest, NextResponse } from "next/server";
import { processWebhook, PlaudWebhookPayload } from "@/lib/services/plaud-api";
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

export async function POST(request: NextRequest) {
  try {
    // Obtém o payload
    const rawPayload = await request.text();
    let payload: PlaudWebhookPayload;

    try {
      payload = JSON.parse(rawPayload);
    } catch (e) {
      console.error("[Plaud Webhook] Payload inválido:", rawPayload);
      return NextResponse.json(
        { error: "Payload inválido" },
        { status: 400 }
      );
    }

    console.log(`[Plaud Webhook] Evento recebido: ${payload.event}`, {
      recording_id: payload.recording_id,
      device_id: payload.device_id,
    });

    // Verifica se existe configuração para este device
    const [config] = await db
      .select()
      .from(plaudConfig)
      .where(eq(plaudConfig.deviceId, payload.device_id))
      .limit(1);

    if (!config) {
      console.warn(
        `[Plaud Webhook] Device não configurado: ${payload.device_id}`
      );
      // Retorna 200 para não causar retries
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

    // Processa o webhook
    const result = await processWebhook(payload);

    if (!result.success) {
      console.error(`[Plaud Webhook] Erro ao processar: ${result.error}`);
      return NextResponse.json(
        { status: "error", error: result.error },
        { status: 500 }
      );
    }

    console.log(
      `[Plaud Webhook] Processado com sucesso: recording=${result.recordingId}`
    );

    return NextResponse.json({
      status: "success",
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
