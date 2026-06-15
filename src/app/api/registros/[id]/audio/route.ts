// src/app/api/registros/[id]/audio/route.ts
// Upload de áudio GRAVADO no navegador para um atendimento (registro):
// resolve a pasta do assistido no Drive, sobe o áudio, grava os campos de
// áudio no registro e enfileira a transcrição via daemon (claude_code_tasks).
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { registros } from "@/lib/db/schema/agenda";
import { driveFiles } from "@/lib/db/schema/drive";
import { claudeCodeTasks } from "@/lib/db/schema/casos";
import { verifySessionToken } from "@/lib/auth/session";
import { ensureAssistidoDriveFolder } from "@/lib/services/assistido-drive-folder";
import { uploadFileBuffer } from "@/lib/services/google-drive";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const ACCEPTED = /^audio\//;

async function getUserId(): Promise<number | null> {
  const token = (await cookies()).get("defesahub_session")?.value;
  if (!token) return null;
  return (await verifySessionToken(token))?.userId ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const registroId = Number((await params).id);
  if (!Number.isInteger(registroId) || registroId <= 0) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const duracao = Number(form.get("duracao") ?? 0) || null;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "arquivo ausente" }, { status: 400 });
  }
  if (!ACCEPTED.test(file.type)) {
    return NextResponse.json({ error: `tipo não suportado: ${file.type}` }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "áudio acima de 50MB" }, { status: 413 });
  }

  const registro = await db.query.registros.findFirst({ where: eq(registros.id, registroId) });
  if (!registro) return NextResponse.json({ error: "registro não encontrado" }, { status: 404 });
  if (!registro.assistidoId) {
    return NextResponse.json({ error: "registro sem assistido vinculado" }, { status: 400 });
  }

  // 1. Pasta do assistido no Drive (cria se faltar).
  const pasta = await ensureAssistidoDriveFolder(registro.assistidoId);
  if (!pasta) {
    return NextResponse.json(
      { error: "não foi possível resolver a pasta do assistido no Drive" },
      { status: 502 },
    );
  }

  // 2. Upload do áudio.
  const ext = file.type.includes("webm") ? "webm" : file.type.includes("mp4") || file.type.includes("m4a") ? "m4a" : file.type.includes("ogg") ? "ogg" : "audio";
  const dataStr = new Date().toISOString().slice(0, 10);
  const fileName = `atendimento_${registroId}_${dataStr}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const up = await uploadFileBuffer(buffer, fileName, file.type, pasta.folderId, `Áudio do atendimento #${registroId} (${pasta.nome})`);
  if (!up) {
    return NextResponse.json({ error: "falha no upload ao Drive" }, { status: 502 });
  }

  // 3. Grava os campos de áudio no registro.
  await db
    .update(registros)
    .set({
      audioUrl: up.webViewLink ?? null,
      audioDriveFileId: up.id,
      audioMimeType: file.type.slice(0, 50),
      audioFileSize: buffer.length,
      ...(duracao ? { duracao } : {}),
      transcricaoStatus: "pending",
      updatedAt: new Date(),
    })
    .where(eq(registros.id, registroId));

  // 4. Registra o arquivo no índice de Drive (best-effort).
  try {
    await db.insert(driveFiles).values({
      driveFileId: up.id,
      driveFolderId: pasta.folderId,
      name: up.name ?? fileName,
      mimeType: file.type,
      fileSize: buffer.length,
      webViewLink: up.webViewLink ?? null,
      syncStatus: "synced",
      lastSyncAt: new Date(),
      assistidoId: registro.assistidoId,
      processoId: registro.processoId ?? null,
      documentType: "audio_atendimento",
      enrichmentStatus: "pending",
    });
  } catch (e) {
    console.error("[audio] driveFiles insert falhou (não-fatal):", e);
  }

  // 5. Enfileira a transcrição via daemon do Claude Code.
  let taskId: number | null = null;
  try {
    const prompt = [
      `Transcreva o áudio do atendimento (registro #${registroId}) da Defensoria.`,
      `Arquivo no Google Drive: id=${up.id} (pasta do assistido ${pasta.nome}).`,
      `Assistido ID: ${registro.assistidoId}${registro.processoId ? ` · Processo ID: ${registro.processoId}` : ""}.`,
      `Baixe o áudio, transcreva em pt-BR e grave o texto em registros.transcricao e um resumo em registros.transcricao_resumo do registro ${registroId}; ao final marque transcricao_status='completed'.`,
    ].join("\n");
    const [task] = await db
      .insert(claudeCodeTasks)
      .values({
        assistidoId: registro.assistidoId,
        processoId: registro.processoId ?? null,
        skill: "transcrever-atendimento",
        prompt,
        status: "pending",
        createdBy: userId,
      })
      .returning({ id: claudeCodeTasks.id });
    taskId = task?.id ?? null;
  } catch (e) {
    console.error("[audio] enqueue transcrição falhou (não-fatal):", e);
  }

  return NextResponse.json({
    ok: true,
    audioDriveFileId: up.id,
    audioUrl: up.webViewLink ?? null,
    fileName,
    transcricaoTaskId: taskId,
  });
}
