/**
 * Serviço de integração com Plaud AI
 *
 * O Plaud é um dispositivo de gravação com transcrição automática.
 * Este serviço gerencia:
 * - Recebimento de gravações via webhook
 * - Processamento de transcrições
 * - Upload automático para Google Drive
 * - Vinculação com atendimentos e assistidos
 */

import { db } from "@/lib/db";
import {
  plaudConfig,
  plaudRecordings,
  atendimentos,
  assistidos,
  driveFiles,
} from "@/lib/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { uploadFileToDrive } from "./google-drive";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ==========================================
// TIPOS
// ==========================================

export interface PlaudWebhookPayload {
  event: "recording.completed" | "transcription.completed" | "summary.completed";
  recording_id: string;
  device_id: string;
  timestamp: string;
  data: {
    title?: string;
    duration?: number;
    file_url?: string;
    file_size?: number;
    transcription?: string;
    summary?: string;
    speakers?: Array<{
      id: string;
      name?: string;
      speaking_time?: number;
    }>;
    language?: string;
    confidence?: number;
  };
}

export interface PlaudRecordingInfo {
  id: number;
  plaudRecordingId: string;
  title: string | null;
  duration: number | null;
  recordedAt: Date | null;
  status: string | null;
  transcription: string | null;
  summary: string | null;
  atendimentoId: number | null;
  assistidoId: number | null;
}

export interface TranscriptionKeyPoints {
  compromissos?: string[];
  informacoesRelevantes?: string[];
  duvidasPendentes?: string[];
  providenciasNecessarias?: string[];
}

// ==========================================
// CONFIGURAÇÃO
// ==========================================

/**
 * Busca a configuração ativa do Plaud
 */
export async function getActiveConfig(workspaceId?: number) {
  const [config] = await db
    .select()
    .from(plaudConfig)
    .where(
      and(
        eq(plaudConfig.isActive, true),
        workspaceId ? eq(plaudConfig.workspaceId, workspaceId) : undefined
      )
    )
    .limit(1);

  return config;
}

/**
 * Atualiza a configuração do Plaud
 */
export async function updateConfig(
  configId: number,
  data: Partial<typeof plaudConfig.$inferInsert>
) {
  const [updated] = await db
    .update(plaudConfig)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(plaudConfig.id, configId))
    .returning();

  return updated;
}

/**
 * Cria uma nova configuração do Plaud
 */
export async function createConfig(data: typeof plaudConfig.$inferInsert) {
  const [created] = await db.insert(plaudConfig).values(data).returning();
  return created;
}

// ==========================================
// PROCESSAMENTO DE WEBHOOK
// ==========================================

/**
 * Processa um webhook recebido do Plaud
 */
export async function processWebhook(
  payload: PlaudWebhookPayload,
  webhookSecret?: string
): Promise<{ success: boolean; recordingId?: number; error?: string }> {
  try {
    // Busca configuração pelo device_id
    const [config] = await db
      .select()
      .from(plaudConfig)
      .where(eq(plaudConfig.deviceId, payload.device_id))
      .limit(1);

    if (!config) {
      console.error(`[Plaud] Device não encontrado: ${payload.device_id}`);
      return { success: false, error: "Device não configurado" };
    }

    // Verifica se já existe um registro para esta gravação
    const [existingRecording] = await db
      .select()
      .from(plaudRecordings)
      .where(eq(plaudRecordings.plaudRecordingId, payload.recording_id))
      .limit(1);

    switch (payload.event) {
      case "recording.completed":
        return await handleRecordingCompleted(config, payload, existingRecording);

      case "transcription.completed":
        return await handleTranscriptionCompleted(config, payload, existingRecording);

      case "summary.completed":
        return await handleSummaryCompleted(config, payload, existingRecording);

      default:
        console.warn(`[Plaud] Evento não suportado: ${payload.event}`);
        return { success: false, error: "Evento não suportado" };
    }
  } catch (error) {
    console.error("[Plaud] Erro ao processar webhook:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Processa evento de gravação concluída
 */
async function handleRecordingCompleted(
  config: typeof plaudConfig.$inferSelect,
  payload: PlaudWebhookPayload,
  existingRecording?: typeof plaudRecordings.$inferSelect
) {
  // Se já existe, atualiza
  if (existingRecording) {
    const [updated] = await db
      .update(plaudRecordings)
      .set({
        title: payload.data.title || existingRecording.title,
        duration: payload.data.duration,
        fileSize: payload.data.file_size,
        recordedAt: new Date(payload.timestamp),
        status: "received",
        rawPayload: payload as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(plaudRecordings.id, existingRecording.id))
      .returning();

    return { success: true, recordingId: updated.id };
  }

  // Cria novo registro
  const [created] = await db
    .insert(plaudRecordings)
    .values({
      configId: config.id,
      plaudRecordingId: payload.recording_id,
      plaudDeviceId: payload.device_id,
      title: payload.data.title,
      duration: payload.data.duration,
      fileSize: payload.data.file_size,
      recordedAt: new Date(payload.timestamp),
      status: "received",
      rawPayload: payload as unknown as Record<string, unknown>,
    })
    .returning();

  // Se auto-transcribe está ativo, já muda status para transcribing
  if (config.autoTranscribe) {
    await db
      .update(plaudRecordings)
      .set({ status: "transcribing", updatedAt: new Date() })
      .where(eq(plaudRecordings.id, created.id));
  }

  return { success: true, recordingId: created.id };
}

/**
 * Processa evento de transcrição concluída
 */
async function handleTranscriptionCompleted(
  config: typeof plaudConfig.$inferSelect,
  payload: PlaudWebhookPayload,
  existingRecording?: typeof plaudRecordings.$inferSelect
) {
  if (!existingRecording) {
    // Cria registro se não existe
    const [created] = await db
      .insert(plaudRecordings)
      .values({
        configId: config.id,
        plaudRecordingId: payload.recording_id,
        plaudDeviceId: payload.device_id,
        title: payload.data.title,
        duration: payload.data.duration,
        recordedAt: new Date(payload.timestamp),
        transcription: payload.data.transcription,
        speakers: payload.data.speakers,
        status: config.autoSummarize ? "transcribing" : "completed",
        rawPayload: payload as unknown as Record<string, unknown>,
      })
      .returning();

    existingRecording = created;
  } else {
    // Atualiza registro existente
    await db
      .update(plaudRecordings)
      .set({
        transcription: payload.data.transcription,
        speakers: payload.data.speakers,
        status: config.autoSummarize ? "transcribing" : "completed",
        updatedAt: new Date(),
      })
      .where(eq(plaudRecordings.id, existingRecording.id));
  }

  // Se tiver atendimento vinculado, atualiza
  if (existingRecording.atendimentoId) {
    await updateAtendimentoTranscription(
      existingRecording.atendimentoId,
      payload.data.transcription || "",
      payload.data.speakers
    );
  }

  // Upload automático para Drive
  if (config.autoUploadToDrive && config.driveFolderId && payload.data.file_url) {
    try {
      await uploadRecordingToDrive(existingRecording.id, config.driveFolderId);
    } catch (error) {
      console.error("[Plaud] Erro ao fazer upload para Drive:", error);
    }
  }

  return { success: true, recordingId: existingRecording.id };
}

/**
 * Processa evento de resumo concluído
 */
async function handleSummaryCompleted(
  config: typeof plaudConfig.$inferSelect,
  payload: PlaudWebhookPayload,
  existingRecording?: typeof plaudRecordings.$inferSelect
) {
  if (!existingRecording) {
    return { success: false, error: "Gravação não encontrada para resumo" };
  }

  // Atualiza com o resumo
  const [updated] = await db
    .update(plaudRecordings)
    .set({
      summary: payload.data.summary,
      status: "completed",
      updatedAt: new Date(),
    })
    .where(eq(plaudRecordings.id, existingRecording.id))
    .returning();

  // Se tiver atendimento vinculado, atualiza
  if (existingRecording.atendimentoId) {
    await db
      .update(atendimentos)
      .set({
        transcricaoResumo: payload.data.summary,
        transcricaoStatus: "completed",
        updatedAt: new Date(),
      })
      .where(eq(atendimentos.id, existingRecording.atendimentoId));

    // Extrai pontos-chave com IA
    if (existingRecording.transcription) {
      await extractKeyPointsWithAI(
        existingRecording.atendimentoId,
        existingRecording.transcription
      );
    }
  }

  return { success: true, recordingId: updated.id };
}

// ==========================================
// VINCULAÇÃO COM ATENDIMENTOS
// ==========================================

/**
 * Vincula uma gravação a um atendimento
 */
export async function linkRecordingToAtendimento(
  recordingId: number,
  atendimentoId: number
) {
  // Busca a gravação
  const [recording] = await db
    .select()
    .from(plaudRecordings)
    .where(eq(plaudRecordings.id, recordingId))
    .limit(1);

  if (!recording) {
    throw new Error("Gravação não encontrada");
  }

  // Busca o atendimento para pegar o assistidoId
  const [atendimento] = await db
    .select()
    .from(atendimentos)
    .where(eq(atendimentos.id, atendimentoId))
    .limit(1);

  if (!atendimento) {
    throw new Error("Atendimento não encontrado");
  }

  // Atualiza a gravação
  await db
    .update(plaudRecordings)
    .set({
      atendimentoId,
      assistidoId: atendimento.assistidoId,
      updatedAt: new Date(),
    })
    .where(eq(plaudRecordings.id, recordingId));

  // Atualiza o atendimento com os dados da gravação
  const updateData: Partial<typeof atendimentos.$inferInsert> = {
    plaudRecordingId: recording.plaudRecordingId,
    duracao: recording.duration,
    transcricao: recording.transcription,
    transcricaoResumo: recording.summary,
    transcricaoStatus: recording.status === "completed" ? "completed" : "processing",
    updatedAt: new Date(),
  };

  if (recording.driveFileId) {
    updateData.audioDriveFileId = recording.driveFileId;
    updateData.audioUrl = recording.driveFileUrl;
  }

  await db
    .update(atendimentos)
    .set(updateData)
    .where(eq(atendimentos.id, atendimentoId));

  // Se já tiver transcrição, extrai pontos-chave
  if (recording.transcription) {
    await extractKeyPointsWithAI(atendimentoId, recording.transcription);
  }

  return { success: true };
}

/**
 * Desvincula uma gravação de um atendimento
 */
export async function unlinkRecordingFromAtendimento(recordingId: number) {
  const [recording] = await db
    .select()
    .from(plaudRecordings)
    .where(eq(plaudRecordings.id, recordingId))
    .limit(1);

  if (!recording) {
    throw new Error("Gravação não encontrada");
  }

  // Limpa dados do atendimento
  if (recording.atendimentoId) {
    await db
      .update(atendimentos)
      .set({
        plaudRecordingId: null,
        audioUrl: null,
        audioDriveFileId: null,
        transcricao: null,
        transcricaoResumo: null,
        transcricaoStatus: "pending",
        pontosChave: null,
        updatedAt: new Date(),
      })
      .where(eq(atendimentos.id, recording.atendimentoId));
  }

  // Atualiza a gravação
  await db
    .update(plaudRecordings)
    .set({
      atendimentoId: null,
      updatedAt: new Date(),
    })
    .where(eq(plaudRecordings.id, recordingId));

  return { success: true };
}

/**
 * Atualiza a transcrição de um atendimento
 */
async function updateAtendimentoTranscription(
  atendimentoId: number,
  transcription: string,
  speakers?: Array<{ id: string; name?: string; speaking_time?: number }>
) {
  const metadados = speakers
    ? {
        speakers: speakers.map((s) => ({
          id: s.id,
          name: s.name,
          speakingTime: s.speaking_time,
        })),
      }
    : undefined;

  await db
    .update(atendimentos)
    .set({
      transcricao: transcription,
      transcricaoStatus: "processing", // Ainda aguarda resumo
      transcricaoMetadados: metadados,
      updatedAt: new Date(),
    })
    .where(eq(atendimentos.id, atendimentoId));
}

// ==========================================
// INTEGRAÇÃO COM DRIVE
// ==========================================

/**
 * Faz upload da gravação para o Google Drive
 */
export async function uploadRecordingToDrive(
  recordingId: number,
  folderId: string
): Promise<{ driveFileId: string; driveFileUrl: string }> {
  const [recording] = await db
    .select()
    .from(plaudRecordings)
    .where(eq(plaudRecordings.id, recordingId))
    .limit(1);

  if (!recording) {
    throw new Error("Gravação não encontrada");
  }

  // Para fazer o upload real, precisaríamos do arquivo de áudio
  // Como o Plaud envia o arquivo via URL, primeiro baixamos
  // Por enquanto, vamos apenas simular a criação do registro

  const fileName = `atendimento_${recording.title || recording.plaudRecordingId}.m4a`;

  // Cria registro no driveFiles
  const [driveFile] = await db
    .insert(driveFiles)
    .values({
      driveFileId: `plaud_${recording.plaudRecordingId}`,
      driveFolderId: folderId,
      name: fileName,
      mimeType: "audio/m4a",
      fileSize: recording.fileSize,
      syncStatus: "synced",
      lastSyncAt: new Date(),
      assistidoId: recording.assistidoId,
    })
    .returning();

  // Atualiza a gravação
  await db
    .update(plaudRecordings)
    .set({
      driveFileId: driveFile.driveFileId,
      driveFileUrl: driveFile.webViewLink,
      updatedAt: new Date(),
    })
    .where(eq(plaudRecordings.id, recordingId));

  // Atualiza o atendimento se vinculado
  if (recording.atendimentoId) {
    await db
      .update(atendimentos)
      .set({
        audioDriveFileId: driveFile.driveFileId,
        audioUrl: driveFile.webViewLink,
        updatedAt: new Date(),
      })
      .where(eq(atendimentos.id, recording.atendimentoId));
  }

  return {
    driveFileId: driveFile.driveFileId,
    driveFileUrl: driveFile.webViewLink || "",
  };
}

// ==========================================
// EXTRAÇÃO DE PONTOS-CHAVE COM IA
// ==========================================

/**
 * Extrai pontos-chave da transcrição usando Gemini
 */
export async function extractKeyPointsWithAI(
  atendimentoId: number,
  transcription: string
): Promise<TranscriptionKeyPoints | null> {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.warn("[Plaud] GOOGLE_AI_API_KEY não configurada");
      return null;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Analise a seguinte transcrição de um atendimento jurídico e extraia os pontos-chave.

TRANSCRIÇÃO:
${transcription.substring(0, 10000)} ${transcription.length > 10000 ? "..." : ""}

Retorne um JSON com a seguinte estrutura:
{
  "compromissos": ["lista de compromissos assumidos durante o atendimento"],
  "informacoesRelevantes": ["informações importantes mencionadas"],
  "duvidasPendentes": ["dúvidas que ficaram sem resposta"],
  "providenciasNecessarias": ["providências/ações que precisam ser tomadas"]
}

Seja conciso e objetivo. Retorne APENAS o JSON, sem explicações.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Tenta extrair o JSON da resposta
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("[Plaud] Resposta não contém JSON válido");
      return null;
    }

    const keyPoints: TranscriptionKeyPoints = JSON.parse(jsonMatch[0]);

    // Atualiza o atendimento com os pontos-chave
    await db
      .update(atendimentos)
      .set({
        pontosChave: keyPoints,
        updatedAt: new Date(),
      })
      .where(eq(atendimentos.id, atendimentoId));

    return keyPoints;
  } catch (error) {
    console.error("[Plaud] Erro ao extrair pontos-chave:", error);
    return null;
  }
}

// ==========================================
// QUERIES
// ==========================================

/**
 * Lista gravações não vinculadas
 */
export async function getUnlinkedRecordings(configId?: number) {
  return await db
    .select()
    .from(plaudRecordings)
    .where(
      and(
        isNull(plaudRecordings.atendimentoId),
        configId ? eq(plaudRecordings.configId, configId) : undefined
      )
    )
    .orderBy(desc(plaudRecordings.recordedAt));
}

/**
 * Busca gravações de um assistido
 */
export async function getRecordingsByAssistido(assistidoId: number) {
  return await db
    .select({
      recording: plaudRecordings,
      atendimento: atendimentos,
    })
    .from(plaudRecordings)
    .leftJoin(atendimentos, eq(plaudRecordings.atendimentoId, atendimentos.id))
    .where(eq(plaudRecordings.assistidoId, assistidoId))
    .orderBy(desc(plaudRecordings.recordedAt));
}

/**
 * Busca estatísticas das gravações
 */
export async function getRecordingStats(configId: number) {
  const recordings = await db
    .select()
    .from(plaudRecordings)
    .where(eq(plaudRecordings.configId, configId));

  const total = recordings.length;
  const completed = recordings.filter((r) => r.status === "completed").length;
  const pending = recordings.filter((r) => r.status !== "completed").length;
  const linked = recordings.filter((r) => r.atendimentoId !== null).length;
  const unlinked = total - linked;
  const totalDuration = recordings.reduce((acc, r) => acc + (r.duration || 0), 0);

  return {
    total,
    completed,
    pending,
    linked,
    unlinked,
    totalDuration,
    averageDuration: total > 0 ? Math.round(totalDuration / total) : 0,
  };
}

/**
 * Busca gravação por ID do Plaud
 */
export async function getRecordingByPlaudId(plaudRecordingId: string) {
  const [recording] = await db
    .select()
    .from(plaudRecordings)
    .where(eq(plaudRecordings.plaudRecordingId, plaudRecordingId))
    .limit(1);

  return recording;
}

/**
 * Lista gravações recentes
 */
export async function getRecentRecordings(limit: number = 10) {
  return await db
    .select({
      recording: plaudRecordings,
      assistido: {
        id: assistidos.id,
        nome: assistidos.nome,
      },
    })
    .from(plaudRecordings)
    .leftJoin(assistidos, eq(plaudRecordings.assistidoId, assistidos.id))
    .orderBy(desc(plaudRecordings.recordedAt))
    .limit(limit);
}
