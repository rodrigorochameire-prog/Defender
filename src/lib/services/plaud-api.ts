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
  notifications,
} from "@/lib/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { uploadFileBuffer } from "./google-drive";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { enrichmentClient } from "@/lib/services/enrichment-client";

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
 * Salva gravação como pendente de aprovação (NÃO processa automaticamente).
 * O usuário deverá revisar e aprovar antes de vincular a atendimentos.
 */
export async function saveAsPendingReview(
  payload: PlaudWebhookPayload,
  configId: number,
  createdById: number | null,
  rawIncoming?: Record<string, unknown>
): Promise<{ success: boolean; recordingId?: number; error?: string }> {
  try {
    const title = payload.data.title || "Gravação sem título";

    // Verifica se já existe um registro para esta gravação
    const [existingRecording] = await db
      .select()
      .from(plaudRecordings)
      .where(eq(plaudRecordings.plaudRecordingId, payload.recording_id))
      .limit(1);

    let recording;

    if (existingRecording) {
      // Atualiza registro existente
      const [updated] = await db
        .update(plaudRecordings)
        .set({
          configId,
          plaudDeviceId: payload.device_id,
          title: title,
          duration: payload.data.duration,
          recordedAt: new Date(payload.timestamp),
          status: "pending_review",
          transcription: payload.data.transcription,
          summary: payload.data.summary,
          speakers: payload.data.speakers,
          rawPayload: {
            ...payload,
            _rawIncoming: rawIncoming || null,
          } as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(plaudRecordings.id, existingRecording.id))
        .returning();

      recording = updated;
    } else {
      // Cria novo registro
      const [created] = await db
        .insert(plaudRecordings)
        .values({
          configId,
          plaudRecordingId: payload.recording_id,
          plaudDeviceId: payload.device_id,
          title: title,
          duration: payload.data.duration,
          recordedAt: new Date(payload.timestamp),
          status: "pending_review",
          transcription: payload.data.transcription,
          summary: payload.data.summary,
          speakers: payload.data.speakers,
          rawPayload: {
            ...payload,
            _rawIncoming: rawIncoming || null,
          } as unknown as Record<string, unknown>,
        })
        .returning();

      recording = created;
    }

    // Cria notificação para o usuário que configurou o Plaud
    if (createdById) {
      await db.insert(notifications).values({
        userId: createdById,
        type: "info",
        title: "Nova gravação Plaud",
        message: `"${title}" — Aguardando sua aprovação`,
        actionUrl: "/admin/integracoes?tab=gravacoes",
        isRead: false,
      });
    }

    return { success: true, recordingId: recording.id };
  } catch (error) {
    console.error("[Plaud] Erro ao salvar como pendente:", error);
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

  // Auto-link: buscar atendimento mais recente com awaiting_plaud
  try {
    const [awaiting] = await db
      .select()
      .from(atendimentos)
      .where(
        and(
          eq(atendimentos.transcricaoStatus, "awaiting_plaud"),
          config.workspaceId
            ? eq(atendimentos.workspaceId, config.workspaceId)
            : undefined
        )
      )
      .orderBy(desc(atendimentos.createdAt))
      .limit(1);

    if (awaiting) {
      console.log(
        `[Plaud] Auto-linking recording ${created.id} to awaiting atendimento ${awaiting.id}`
      );

      await db
        .update(plaudRecordings)
        .set({
          atendimentoId: awaiting.id,
          assistidoId: awaiting.assistidoId,
          updatedAt: new Date(),
        })
        .where(eq(plaudRecordings.id, created.id));

      await db
        .update(atendimentos)
        .set({
          plaudRecordingId: payload.recording_id,
          plaudDeviceId: payload.device_id,
          transcricaoStatus: "processing",
          duracao: payload.data.duration,
          updatedAt: new Date(),
        })
        .where(eq(atendimentos.id, awaiting.id));
    }
  } catch (error) {
    console.error("[Plaud] Erro no auto-link:", error);
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

  // Auto-link: se não tem atendimento vinculado, buscar "awaiting_plaud"
  if (!existingRecording.atendimentoId) {
    try {
      const [awaiting] = await db
        .select()
        .from(atendimentos)
        .where(
          and(
            eq(atendimentos.transcricaoStatus, "awaiting_plaud"),
            config.workspaceId
              ? eq(atendimentos.workspaceId, config.workspaceId)
              : undefined
          )
        )
        .orderBy(desc(atendimentos.createdAt))
        .limit(1);

      if (awaiting) {
        console.log(
          `[Plaud] Auto-linking transcription recording ${existingRecording.id} to awaiting atendimento ${awaiting.id}`
        );

        await db
          .update(plaudRecordings)
          .set({
            atendimentoId: awaiting.id,
            assistidoId: awaiting.assistidoId,
            updatedAt: new Date(),
          })
          .where(eq(plaudRecordings.id, existingRecording.id));

        // Atualizar referência local
        existingRecording = {
          ...existingRecording,
          atendimentoId: awaiting.id,
          assistidoId: awaiting.assistidoId,
        };

        await db
          .update(atendimentos)
          .set({
            plaudRecordingId: payload.recording_id,
            plaudDeviceId: payload.device_id,
            transcricaoStatus: "processing",
            duracao: payload.data.duration,
            updatedAt: new Date(),
          })
          .where(eq(atendimentos.id, awaiting.id));
      }
    } catch (error) {
      console.error("[Plaud] Erro no auto-link (transcription):", error);
    }
  }

  // Se tiver atendimento vinculado, atualiza transcrição
  if (existingRecording.atendimentoId) {
    await updateAtendimentoTranscription(
      existingRecording.atendimentoId,
      payload.data.transcription || "",
      payload.data.speakers
    );
  }

  // Upload automático para Drive (preferir pasta do assistido)
  if (config.autoUploadToDrive && payload.data.file_url) {
    try {
      let targetFolderId = config.driveFolderId;

      // Se tem assistido vinculado, usar a pasta dele no Drive
      if (existingRecording.assistidoId) {
        const [assistido] = await db
          .select({ driveFolderId: assistidos.driveFolderId })
          .from(assistidos)
          .where(eq(assistidos.id, existingRecording.assistidoId))
          .limit(1);

        if (assistido?.driveFolderId) {
          targetFolderId = assistido.driveFolderId;
          console.log(`[Plaud] Upload para pasta do assistido: ${targetFolderId}`);
        }
      }

      if (targetFolderId) {
        await uploadRecordingToDrive(existingRecording.id, targetFolderId);
      }
    } catch (error) {
      console.error("[Plaud] Erro ao fazer upload para Drive:", error);
    }
  }

  // Enrichment Engine: enriquecer transcrição (async, non-blocking)
  if (payload.data.transcription && existingRecording.atendimentoId) {
    // Buscar atendimento para obter assistidoId e processoId
    const [atendimento] = await db
      .select({ assistidoId: atendimentos.assistidoId, processoId: atendimentos.processoId, casoId: atendimentos.casoId })
      .from(atendimentos)
      .where(eq(atendimentos.id, existingRecording.atendimentoId))
      .limit(1);

    if (atendimento) {
      enrichmentClient.enrichAsync(
        () => enrichmentClient.enrichTranscript({
          transcript: payload.data.transcription!,
          assistidoId: atendimento.assistidoId,
          processoId: atendimento.processoId,
          casoId: atendimento.casoId,
        }),
        `Transcript enrichment for atendimento ${existingRecording.atendimentoId}`,
      ).catch(() => {}); // fire-and-forget
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
// PIPELINE PÓS-APROVAÇÃO
// ==========================================

/**
 * Executa o pipeline completo pós-aprovação:
 * 1. Garante pasta no Drive do assistido
 * 2. Upload do áudio ao Drive (pasta do assistido)
 * 3. Upload da transcrição .md ao Drive com enrichment_data preenchido
 * 4. Análise Sonnet via enrichment engine (fire-and-forget)
 */
export async function processApprovedRecording(
  recordingId: number,
  assistidoId: number,
  atendimentoId: number | null,
  processoId: number | null
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Buscar dados do assistido para garantir pasta no Drive
    const [assistido] = await db
      .select({
        id: assistidos.id,
        nome: assistidos.nome,
        atribuicao: assistidos.atribuicaoPrimaria,
        driveFolderId: assistidos.driveFolderId,
      })
      .from(assistidos)
      .where(eq(assistidos.id, assistidoId))
      .limit(1);

    if (!assistido) {
      console.error(`[Plaud] Assistido ${assistidoId} não encontrado`);
      return { success: false, error: "Assistido não encontrado" };
    }

    // 2. Garantir pasta no Drive (se não existir)
    let driveFolderId = assistido.driveFolderId;
    if (!driveFolderId && assistido.atribuicao) {
      try {
        const {
          createOrFindAssistidoFolder,
          mapAtribuicaoToFolderKey,
          isGoogleDriveConfigured,
        } = await import("@/lib/services/google-drive");

        if (isGoogleDriveConfigured()) {
          const folderKey = mapAtribuicaoToFolderKey(assistido.atribuicao);
          if (folderKey) {
            const folder = await createOrFindAssistidoFolder(folderKey, assistido.nome);
            if (folder) {
              driveFolderId = folder.id;
              await db
                .update(assistidos)
                .set({ driveFolderId: folder.id, updatedAt: new Date() })
                .where(eq(assistidos.id, assistidoId));
              console.log(`[Plaud] Pasta Drive criada para assistido ${assistidoId}: ${folder.id}`);
            }
          }
        }
      } catch (error) {
        console.error(`[Plaud] Erro ao criar pasta Drive para assistido ${assistidoId}:`, error);
      }
    }

    // 3. Buscar gravação para dados completos
    const [recording] = await db
      .select()
      .from(plaudRecordings)
      .where(eq(plaudRecordings.id, recordingId))
      .limit(1);

    if (!recording) {
      return { success: false, error: "Gravação não encontrada" };
    }

    // 4. Upload do áudio ao Drive (se tiver pasta)
    if (driveFolderId) {
      try {
        await uploadRecordingToDrive(recordingId, driveFolderId);
        console.log(`[Plaud] Upload ao Drive concluído para recording ${recordingId}`);
      } catch (error) {
        console.error(`[Plaud] Erro no upload ao Drive:`, error);
        // Não falha todo o pipeline por causa do upload
      }

      // 4b. Upload da transcrição ao Drive (se houver)
      if (recording.transcription) {
        try {
          const { uploadFileBuffer } = await import("@/lib/services/google-drive");
          const titulo = recording.title || recording.plaudRecordingId || "gravacao";
          const dataStr = new Date().toISOString().slice(0, 10);
          const transcFileName = `transcricao_${titulo}_${dataStr}.md`;
          const transcContent = `# Transcrição: ${titulo}\n\n**Data:** ${dataStr}\n**Assistido ID:** ${assistidoId}\n${processoId ? `**Processo ID:** ${processoId}\n` : ""}\n---\n\n${recording.transcription}`;
          const transcBuffer = Buffer.from(transcContent, "utf-8");

          const driveResult = await uploadFileBuffer(
            transcBuffer,
            transcFileName,
            "text/markdown",
            driveFolderId,
            `Transcrição Plaud: ${titulo}`,
            { preventDuplicates: true },
          );

          if (driveResult) {
            // Registra no driveFiles com enrichment_data preenchido
            const [driveFile] = await db.insert(driveFiles).values({
              driveFileId: driveResult.id,
              driveFolderId: driveFolderId,
              name: driveResult.name || transcFileName,
              mimeType: "text/markdown",
              fileSize: transcBuffer.length,
              webViewLink: driveResult.webViewLink,
              webContentLink: driveResult.webContentLink,
              syncStatus: "synced",
              lastSyncAt: new Date(),
              assistidoId: assistidoId,
              processoId: processoId,
              enrichmentStatus: "completed",
              documentType: "transcricao_plaud",
              enrichmentData: {
                sub_type: "transcricao_plaud",
                transcript: recording.transcription,
                transcript_plain: recording.transcription,
                speakers: recording.speakers || [],
                summary: recording.summary,
                confidence: 1.0,
                interlocutor: (recording.rawPayload as any)?.interlocutor || null,
                tipo_gravacao: (recording.rawPayload as any)?.tipoGravacao || null,
                plaud_recording_id: recording.id,
                atendimento_id: atendimentoId,
              },
            }).onConflictDoNothing().returning();
            console.log(`[Plaud] Transcrição uploaded ao Drive: ${transcFileName}`);

            // Fire-and-forget: analise Sonnet via enrichment engine
            if (driveFile && recording.transcription && recording.transcription.length > 100) {
              enrichmentClient.analyzeAsync({
                transcript: recording.transcription,
                fileName: transcFileName,
                speakers: Array.isArray(recording.speakers)
                  ? (recording.speakers as any[]).map((s: any) => s.name || s.id || String(s))
                  : undefined,
                assistidoNome: assistido.nome,
                dbRecordId: driveFile.id,
                driveFileId: driveResult.id,
              }).catch((err) => {
                console.error(`[Plaud] Analise Sonnet fire-and-forget falhou:`, err);
              });
            }
          }
        } catch (error) {
          console.error(`[Plaud] Erro ao subir transcrição ao Drive:`, error);
        }
      }
    }

    // Analise IA agora e feita via enrichmentClient.analyzeAsync() no passo 4b acima.
    // extractKeyPointsWithAI (Gemini) e enrichmentClient.enrichTranscript foram removidos.

    return { success: true };
  } catch (error) {
    console.error(`[Plaud] Erro no pipeline pós-aprovação:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// ==========================================
// INTEGRAÇÃO COM DRIVE
// ==========================================

/**
 * Faz upload da gravação para o Google Drive.
 * Baixa o áudio da URL do Plaud, faz upload ao Drive, e registra no DB.
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

  const fileName = `plaud_${recording.title || recording.plaudRecordingId}.m4a`;

  // Extrair URL do áudio do payload raw
  const rawPayload = recording.rawPayload as Record<string, unknown> | null;
  const audioUrl = (rawPayload?.data as Record<string, unknown>)?.file_url as string | undefined;

  if (audioUrl) {
    // Download real do arquivo de áudio
    console.log(`[Plaud] Downloading audio from: ${audioUrl.slice(0, 80)}...`);
    const audioResponse = await fetch(audioUrl, { signal: AbortSignal.timeout(60_000) });

    if (!audioResponse.ok) {
      throw new Error(`Falha ao baixar áudio do Plaud: ${audioResponse.status}`);
    }

    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    const mimeType = audioResponse.headers.get("content-type") || "audio/m4a";

    // Upload real ao Google Drive
    const driveResult = await uploadFileBuffer(
      audioBuffer,
      fileName,
      mimeType,
      folderId,
      `Gravação Plaud: ${recording.title || recording.plaudRecordingId}`,
      { preventDuplicates: true },
    );

    if (!driveResult) {
      throw new Error("Falha ao fazer upload do áudio ao Drive");
    }

    // Registra no driveFiles do OMBUDS (para indexação/enriquecimento)
    const [driveFile] = await db
      .insert(driveFiles)
      .values({
        driveFileId: driveResult.id,
        driveFolderId: folderId,
        name: driveResult.name || fileName,
        mimeType: driveResult.mimeType || mimeType,
        fileSize: recording.fileSize,
        webViewLink: driveResult.webViewLink,
        webContentLink: driveResult.webContentLink,
        syncStatus: "synced",
        lastSyncAt: new Date(),
        assistidoId: recording.assistidoId,
      })
      .returning();

    // Atualiza a gravação com IDs reais do Drive
    await db
      .update(plaudRecordings)
      .set({
        driveFileId: driveFile.driveFileId,
        driveFileUrl: driveResult.webViewLink,
        updatedAt: new Date(),
      })
      .where(eq(plaudRecordings.id, recordingId));

    // Atualiza o atendimento se vinculado
    if (recording.atendimentoId) {
      await db
        .update(atendimentos)
        .set({
          audioDriveFileId: driveFile.driveFileId,
          audioUrl: driveResult.webViewLink,
          updatedAt: new Date(),
        })
        .where(eq(atendimentos.id, recording.atendimentoId));
    }

    return {
      driveFileId: driveFile.driveFileId,
      driveFileUrl: driveResult.webViewLink || "",
    };
  }

  // Sem URL de áudio — skip upload silenciosamente
  console.log(`[Plaud] Sem audio URL para recording ${recordingId} — upload ao Drive ignorado`);
  return {
    driveFileId: "",
    driveFileUrl: "",
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Analise a seguinte transcrição de um atendimento da Defensoria Pública (defesa criminal) e extraia os pontos-chave.

TRANSCRIÇÃO:
${transcription.substring(0, 15000)} ${transcription.length > 15000 ? "..." : ""}

Retorne um JSON com a seguinte estrutura:
{
  "compromissos": ["compromissos assumidos pelo defensor ou pelo assistido"],
  "informacoesRelevantes": ["fatos, datas, nomes, endereços ou detalhes processuais mencionados"],
  "duvidasPendentes": ["dúvidas ou pontos que ficaram em aberto"],
  "providenciasNecessarias": ["diligências, petições, documentos a juntar ou ações concretas"]
}

Seja conciso, objetivo e em português. Se a transcrição for muito curta ou não tiver conteúdo substantivo, retorne arrays vazios. Retorne APENAS o JSON, sem explicações.`;

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
