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
import { PlaudWebhookPayload, saveAsPendingReview } from "@/lib/services/plaud-api";
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
 * Busca um valor em um objeto por múltiplas chaves possíveis (case-insensitive).
 * Também busca em objetos aninhados (1 nível de profundidade).
 */
function findValue(
  raw: Record<string, unknown>,
  keys: string[]
): unknown | undefined {
  // Primeiro: busca direta nas chaves (case-insensitive)
  const rawLower: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    rawLower[k.toLowerCase().replace(/[\s_-]/g, "")] = v;
  }

  for (const key of keys) {
    const normalizedKey = key.toLowerCase().replace(/[\s_-]/g, "");
    if (rawLower[normalizedKey] !== undefined && rawLower[normalizedKey] !== null && rawLower[normalizedKey] !== "") {
      return rawLower[normalizedKey];
    }
  }

  // Segundo: busca em objetos aninhados (data, recording, result, etc.)
  for (const val of Object.values(raw)) {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const nested = val as Record<string, unknown>;
      const nestedLower: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(nested)) {
        nestedLower[k.toLowerCase().replace(/[\s_-]/g, "")] = v;
      }
      for (const key of keys) {
        const normalizedKey = key.toLowerCase().replace(/[\s_-]/g, "");
        if (nestedLower[normalizedKey] !== undefined && nestedLower[normalizedKey] !== null && nestedLower[normalizedKey] !== "") {
          return nestedLower[normalizedKey];
        }
      }
    }
  }

  return undefined;
}

/**
 * Fallback heurístico: quando nenhuma chave é reconhecida, classifica
 * os valores string por conteúdo e comprimento.
 * - ISO timestamp → created_at
 * - Texto com markdown (## headers) → summary
 * - Texto mais longo (>200 chars) → transcript
 * - Texto curto → title
 */
function classifyByContent(raw: Record<string, unknown>): {
  title?: string;
  transcription?: string;
  summary?: string;
  timestamp?: string;
} {
  const strings: Array<{ key: string; value: string; len: number }> = [];

  // Coleta todos os valores string (flat + 1 nível de profundidade)
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.length > 0) {
      strings.push({ key: k, value: v, len: v.length });
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const [nk, nv] of Object.entries(v as Record<string, unknown>)) {
        if (typeof nv === "string" && nv.length > 0) {
          strings.push({ key: `${k}.${nk}`, value: nv, len: nv.length });
        }
      }
    }
  }

  let title: string | undefined;
  let transcription: string | undefined;
  let summary: string | undefined;
  let timestamp: string | undefined;

  // Primeiro: identifica timestamps ISO (padrão 2026-02-26T18:03:35Z)
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  for (const s of strings) {
    if (isoRegex.test(s.value.trim()) && s.len < 40) {
      timestamp = s.value;
    }
  }

  // Filtra strings que não são timestamps
  const contentStrings = strings.filter(
    (s) => !isoRegex.test(s.value.trim()) || s.len >= 40
  );

  // Segundo: identifica summary (contém ## markdown headers)
  for (const s of contentStrings) {
    if (s.value.includes("##") && s.len > 100) {
      summary = s.value;
    }
  }

  // Terceiro: entre os restantes, o mais longo é transcript
  const remaining = contentStrings.filter((s) => s.value !== summary);
  remaining.sort((a, b) => b.len - a.len);

  if (remaining.length >= 2) {
    transcription = remaining[0].value;
    title = remaining[1].value;
  } else if (remaining.length === 1) {
    // Se só tem 1, decidir pelo comprimento
    if (remaining[0].len > 200) {
      transcription = remaining[0].value;
    } else {
      title = remaining[0].value;
    }
  }

  return { title, transcription, summary, timestamp };
}

/**
 * Normaliza payload do Zapier para o formato OMBUDS.
 *
 * Estratégia em 2 fases:
 * 1. Busca por chaves conhecidas (title, transcript, summary, etc.)
 * 2. Se nada for encontrado, classifica os valores por conteúdo/comprimento
 *
 * Isso garante compatibilidade com:
 * - Formato OMBUDS padrão: { event, recording_id, data: { transcription, ... } }
 * - Formato Zapier com chaves nomeadas: { title, transcript, summary, ... }
 * - Formato Zapier com chaves auto-geradas: { "": "...", "_1": "...", "_2": "..." }
 */
function normalizePayload(raw: Record<string, unknown>): PlaudWebhookPayload {
  // Fase 1: Busca por chaves conhecidas
  const title = findValue(raw, [
    "title", "Title", "name", "Name", "file_name", "fileName",
    "recording_title", "recordingTitle", "subject",
  ]) as string | undefined;

  const transcription = findValue(raw, [
    "transcription", "Transcription", "transcript", "Transcript",
    "text", "Text", "full_transcript", "fullTranscript",
    "transcript_text", "transcriptText", "content", "Content",
  ]) as string | undefined;

  const summary = findValue(raw, [
    "summary", "Summary", "ai_summary", "aiSummary",
    "note", "Note", "notes", "Notes",
    "summary_text", "summaryText", "ai_summary_text",
  ]) as string | undefined;

  const recordingId = findValue(raw, [
    "recording_id", "recordingId", "id", "Id", "ID",
    "record_id", "recordId",
  ]) as string | undefined;

  const deviceId = findValue(raw, [
    "device_id", "deviceId", "device", "Device",
  ]) as string | undefined;

  const timestamp = findValue(raw, [
    "timestamp", "Timestamp", "created_at", "createdAt",
    "date", "Date", "recorded_at", "recordedAt",
  ]) as string | undefined;

  const duration = findValue(raw, [
    "duration", "Duration", "length", "Length",
  ]) as number | undefined;

  const fileUrl = findValue(raw, [
    "file_url", "fileUrl", "audio_url", "audioUrl",
    "url", "Url", "download_url", "downloadUrl",
    "media_url", "mediaUrl",
  ]) as string | undefined;

  const fileSize = findValue(raw, [
    "file_size", "fileSize", "size", "Size",
  ]) as number | undefined;

  const language = findValue(raw, [
    "language", "Language", "lang", "locale",
  ]) as string | undefined;

  // Fase 2: Se não encontrou título, transcrição ou resumo por chave,
  // tenta classificar os valores pelo conteúdo (heurística)
  const hasContent = title || transcription || summary;
  let heuristic: ReturnType<typeof classifyByContent> = {};

  if (!hasContent) {
    heuristic = classifyByContent(raw);
    console.log("[Plaud Webhook] Usando fallback heurístico:", {
      hasTitle: !!heuristic.title,
      hasTranscription: !!heuristic.transcription,
      hasSummary: !!heuristic.summary,
      hasTimestamp: !!heuristic.timestamp,
    });
  }

  return {
    event: "transcription.completed",
    recording_id: String(recordingId || `zapier_${Date.now()}`),
    device_id: String(deviceId || "zapier"),
    timestamp: String(timestamp || heuristic.timestamp || new Date().toISOString()),
    data: {
      title: title || heuristic.title,
      duration: Number(duration || 0) || undefined,
      file_url: fileUrl,
      file_size: Number(fileSize || 0) || undefined,
      transcription: transcription || heuristic.transcription,
      summary: summary || heuristic.summary,
      language: language || "pt-BR",
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
    payload.device_id = config.deviceId || payload.device_id || "unknown";

    // Salvar como pendente de aprovação (NÃO processa automaticamente)
    // Passa rawJson para armazenar o payload original do Zapier para diagnóstico
    const result = await saveAsPendingReview(payload, config.id, config.createdById, rawJson);

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
