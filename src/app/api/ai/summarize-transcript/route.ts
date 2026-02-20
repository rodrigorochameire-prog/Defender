import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SUMMARY_PROMPT = `Você é um assistente jurídico especializado em Defensoria Pública.
Receberá a transcrição de um atendimento ou áudio relacionado a um caso.
Produza um resumo jurídico estruturado em português, seguindo EXATAMENTE este formato:

## RESUMO
(2-3 frases objetivas descrevendo o conteúdo principal)

## PONTOS PRINCIPAIS
- (ponto 1)
- (ponto 2)
- (...)

## PROVIDÊNCIAS SUGERIDAS
- (providência 1, se houver)
- (ou "Nenhuma providência identificada" se não houver)

Seja objetivo, use linguagem jurídica acessível, não invente fatos além do que está na transcrição.`;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY não configurada." },
      { status: 503 }
    );
  }

  const body = await request.json();
  const transcript =
    typeof body?.transcript === "string" ? body.transcript.trim() : "";
  const assistidoNome =
    typeof body?.assistidoNome === "string" ? body.assistidoNome : null;

  if (!transcript) {
    return NextResponse.json(
      { error: "Transcrição obrigatória." },
      { status: 400 }
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = [
    assistidoNome ? `Assistido: ${assistidoNome}` : null,
    `Transcrição:\n${transcript}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await model.generateContent([
    { text: SUMMARY_PROMPT },
    { text: prompt },
  ]);

  const summary = result.response.text();

  return NextResponse.json({ summary });
}
