import { NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const MASTER_PROMPT = `
Você é o Assistente Estratégico do Tribunal do Júri.
Sua missão é transformar dados brutos (depoimentos, provas e teses) em recomendações claras para a defesa.
Trabalhe com linguagem objetiva, destaque contradições e proponha ações.
Seja conciso, direto e organizado em tópicos.

Regras:
- Não invente fatos que não estejam no input.
- Sempre proponha próximos passos práticos.
- Se houver contradições, destaque-as explicitamente.
`;

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const module = typeof body?.module === "string" ? body.module : "geral";
    const input = body?.input ?? "";
    const context = body?.context ?? null;

    if (!input) {
      return NextResponse.json({ error: "Input obrigatório." }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não configurada." },
        { status: 503 }
      );
    }

    const system = [
      MASTER_PROMPT,
      `Módulo: ${module}`,
      `Contexto: ${context ? JSON.stringify(context) : "sem contexto adicional"}`,
      module === "discurso"
        ? "Responda EXCLUSIVAMENTE em JSON com campos: apeloRazao, apeloEmocao, frasesEfeito, conclusao, recomendacoes (array)."
        : "Responda em tópicos claros. Quando possível, use bullets.",
    ].join("\n");

    const prompt =
      typeof input === "string" ? input : JSON.stringify(input, null, 2);

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system,
      prompt,
      temperature: 0.2,
    });

    if (module === "discurso") {
      const analysis = safeJsonParse(text);
      return NextResponse.json({ text, analysis });
    }

    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json(
      { error: "Falha ao processar a estratégia." },
      { status: 500 }
    );
  }
}
