// src/app/api/audiencias/[id]/audio/route.ts
// Upload de áudio GRAVADO no navegador (microfone ou áudio do sistema) para uma
// audiência: resolve a pasta do assistido no Drive, sobe o áudio, grava os
// campos de áudio na audiência e enfileira a transcrição via daemon
// (claude_code_tasks, skill=transcrever-audiencia → whisper-cli local).
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { audiencias } from "@/lib/db/schema/agenda";
import { processos } from "@/lib/db/schema/core";
import { driveFiles } from "@/lib/db/schema/drive";
import { claudeCodeTasks } from "@/lib/db/schema/casos";
import { verifySessionToken } from "@/lib/auth/session";
import { ensureAssistidoDriveFolder } from "@/lib/services/assistido-drive-folder";
import { uploadFileBuffer } from "@/lib/services/google-drive";
import { extFromMime } from "@/lib/agenda/gravacao-audio";

const MAX_BYTES = 200 * 1024 * 1024; // 200 MB — audiências longas (instrução)
const ACCEPTED = /^(audio|video)\//; // getDisplayMedia pode entregar video/webm com faixa de áudio

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

  const audienciaId = Number((await params).id);
  if (!Number.isInteger(audienciaId) || audienciaId <= 0) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const duracao = Number(form.get("duracao") ?? 0) || null;
  const fonte = String(form.get("fonte") ?? "microfone").slice(0, 16);
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "arquivo ausente" }, { status: 400 });
  }
  if (!ACCEPTED.test(file.type)) {
    return NextResponse.json({ error: `tipo não suportado: ${file.type}` }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "áudio acima de 200MB" }, { status: 413 });
  }

  const audiencia = await db.query.audiencias.findFirst({ where: eq(audiencias.id, audienciaId) });
  if (!audiencia) return NextResponse.json({ error: "audiência não encontrada" }, { status: 404 });

  // assistidoId da audiência é opcional; cai para o assistido do processo.
  let assistidoId = audiencia.assistidoId ?? null;
  if (!assistidoId) {
    const proc = await db.query.processos.findFirst({
      where: eq(processos.id, audiencia.processoId),
      columns: { assistidoId: true },
    });
    assistidoId = proc?.assistidoId ?? null;
  }
  if (!assistidoId) {
    return NextResponse.json({ error: "audiência sem assistido resolvível" }, { status: 400 });
  }

  // 1. Pasta do assistido no Drive (cria se faltar).
  const pasta = await ensureAssistidoDriveFolder(assistidoId);
  if (!pasta) {
    return NextResponse.json(
      { error: "não foi possível resolver a pasta do assistido no Drive" },
      { status: 502 },
    );
  }

  // 2. Upload do áudio.
  const ext = extFromMime(file.type);
  const dataStr = new Date().toISOString().slice(0, 10);
  const fileName = `audiencia_${audienciaId}_${dataStr}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const up = await uploadFileBuffer(
    buffer,
    fileName,
    file.type,
    pasta.folderId,
    `Gravação da audiência #${audienciaId} (${pasta.nome}) · fonte: ${fonte}`,
  );
  if (!up) {
    return NextResponse.json({ error: "falha no upload ao Drive" }, { status: 502 });
  }

  // 3. Grava os campos de áudio na audiência.
  await db
    .update(audiencias)
    .set({
      audioUrl: up.webViewLink ?? null,
      audioDriveFileId: up.id,
      audioMimeType: file.type.slice(0, 50),
      audioFileSize: buffer.length,
      audioDuracao: duracao,
      audioFonte: fonte,
      transcricaoStatus: "pending",
      updatedAt: new Date(),
    })
    .where(eq(audiencias.id, audienciaId));

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
      assistidoId,
      processoId: audiencia.processoId,
      documentType: "audio_audiencia",
      enrichmentStatus: "pending",
    });
  } catch (e) {
    console.error("[audiencia/audio] driveFiles insert falhou (não-fatal):", e);
  }

  // 5. Enfileira a transcrição via daemon do Claude Code.
  let taskId: number | null = null;
  try {
    const prompt = [
      `Transcreva a gravação da audiência #${audienciaId} da Defensoria.`,
      `Arquivo no Google Drive: id=${up.id} (pasta do assistido ${pasta.nome}).`,
      `Assistido ID: ${assistidoId} · Processo ID: ${audiencia.processoId} · Fonte do áudio: ${fonte}.`,
      `Baixe o áudio, transcreva em pt-BR e grave o texto em audiencias.transcricao e um resumo em audiencias.transcricao_resumo da audiência ${audienciaId}; ao final marque transcricao_status='completed'.`,
    ].join("\n");
    const [task] = await db
      .insert(claudeCodeTasks)
      .values({
        assistidoId,
        processoId: audiencia.processoId,
        skill: "transcrever-audiencia",
        prompt,
        status: "pending",
        createdBy: userId,
      })
      .returning({ id: claudeCodeTasks.id });
    taskId = task?.id ?? null;
  } catch (e) {
    console.error("[audiencia/audio] enqueue transcrição falhou (não-fatal):", e);
  }

  return NextResponse.json({
    ok: true,
    audioDriveFileId: up.id,
    audioUrl: up.webViewLink ?? null,
    fileName,
    transcricaoTaskId: taskId,
  });
}
