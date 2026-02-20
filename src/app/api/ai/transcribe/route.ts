// src/app/api/ai/transcribe/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // 1. Verificar env vars
  const apiKey = process.env.GOOGLE_SPEECH_API_KEY;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  if (!apiKey || !projectId) {
    return NextResponse.json(
      { error: "Google Speech API não configurada." },
      { status: 503 }
    );
  }

  // 2. Ler FormData
  const formData = await request.formData();
  const audio = formData.get("audio") as Blob | null;
  const mimeType = (formData.get("mimeType") as string) ?? "audio/webm";

  if (!audio) {
    return NextResponse.json({ error: "Áudio obrigatório." }, { status: 400 });
  }

  // 3. Guard 25MB
  const MAX_BYTES = 25 * 1024 * 1024;
  if (audio.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Áudio excede o limite de 25MB." },
      { status: 413 }
    );
  }

  // 4. Converter para base64
  const arrayBuffer = await audio.arrayBuffer();
  const base64Audio = Buffer.from(arrayBuffer).toString("base64");

  // 5. Chamar Google Speech-to-Text v2
  const url = `https://speech.googleapis.com/v2/projects/${projectId}/locations/global/recognizers/-:recognize?key=${apiKey}`;
  const body = {
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
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[transcribe] Google Speech error:", errorText);
    return NextResponse.json(
      { error: "Falha na transcrição de áudio." },
      { status: 502 }
    );
  }

  const data = await response.json();
  // Google Speech v2 response structure
  const results = data.results ?? [];
  const transcript = results
    .map((r: { alternatives?: { transcript?: string }[] }) =>
      r.alternatives?.[0]?.transcript ?? ""
    )
    .join(" ")
    .trim();

  const confidence =
    results[0]?.alternatives?.[0]?.confidence ?? null;

  return NextResponse.json({ transcript, confidence });
}
