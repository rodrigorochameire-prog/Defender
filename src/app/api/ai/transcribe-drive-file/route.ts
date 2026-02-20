import { NextResponse } from "next/server";
import {
  downloadFileContent,
  getFileInfo,
} from "@/lib/services/google-drive";

const ALLOWED_MIME_PREFIXES = ["audio/", "video/mp4", "video/webm", "video/quicktime"];

function isSupportedMediaType(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;
  return ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_SPEECH_API_KEY;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  if (!apiKey || !projectId) {
    return NextResponse.json(
      { error: "Google Speech API não configurada." },
      { status: 503 }
    );
  }

  const body = await request.json();
  const driveFileId =
    typeof body?.driveFileId === "string" ? body.driveFileId.trim() : "";

  if (!driveFileId) {
    return NextResponse.json(
      { error: "driveFileId obrigatório." },
      { status: 400 }
    );
  }

  // 1. Obter metadados do arquivo
  const fileInfo = await getFileInfo(driveFileId);
  if (!fileInfo) {
    return NextResponse.json(
      { error: "Arquivo não encontrado no Drive." },
      { status: 404 }
    );
  }

  const mimeType = fileInfo.mimeType ?? null;
  if (!isSupportedMediaType(mimeType)) {
    return NextResponse.json(
      {
        error: `Tipo de arquivo não suportado para transcrição: ${mimeType}`,
      },
      { status: 422 }
    );
  }

  // 2. Baixar conteúdo
  const arrayBuffer = await downloadFileContent(driveFileId);
  if (!arrayBuffer) {
    return NextResponse.json(
      { error: "Não foi possível baixar o arquivo do Drive." },
      { status: 502 }
    );
  }

  // 3. Guard 25MB
  const MAX_BYTES = 25 * 1024 * 1024;
  if (arrayBuffer.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: "Arquivo excede o limite de 25MB para transcrição." },
      { status: 413 }
    );
  }

  // 4. Converter para base64
  const base64Audio = Buffer.from(arrayBuffer).toString("base64");

  // 5. Chamar Google Speech-to-Text v2
  const url = `https://speech.googleapis.com/v2/projects/${projectId}/locations/global/recognizers/-:recognize?key=${apiKey}`;
  const speechBody = {
    config: {
      languageCodes: ["pt-BR"],
      model: "long",
      features: { enableAutomaticPunctuation: true },
    },
    content: base64Audio,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(speechBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[transcribe-drive-file] Google Speech error:", errorText);
    return NextResponse.json(
      { error: "Falha na transcrição do arquivo." },
      { status: 502 }
    );
  }

  const data = await response.json();
  const results = data.results ?? [];
  const transcript = results
    .map(
      (r: { alternatives?: { transcript?: string }[] }) =>
        r.alternatives?.[0]?.transcript ?? ""
    )
    .join(" ")
    .trim();

  const confidence = results[0]?.alternatives?.[0]?.confidence ?? null;

  return NextResponse.json({ transcript, confidence });
}
