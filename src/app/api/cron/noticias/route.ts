import { NextRequest, NextResponse } from "next/server";
import { scrapeAllFontes } from "@/lib/noticias/scraper";
import { db } from "@/lib/db";
import { noticiasJuridicas, noticiasProcessos, evolutionConfig } from "@/lib/db/schema";
import { eq, gte, and, inArray } from "drizzle-orm";
import { sendText } from "@/lib/services/evolution-api";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Cron job para scraping de notícias jurídicas.
 * Roda 1x/dia às 7h BRT (10h UTC).
 * Protegido por CRON_SECRET.
 *
 * Rotas:
 *   GET /api/cron/noticias          → scraping + enrichment diário
 *   GET /api/cron/noticias?action=digest → digest semanal WhatsApp
 */

// =============================================================================
// DIGEST SEMANAL
// =============================================================================

async function gerarEEnviarDigest(): Promise<{
  success: boolean;
  noticiasFound: number;
  instancesEnviadas: number;
  error?: string;
}> {
  // 1. Busca notícias aprovadas dos últimos 7 dias (máximo 20)
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

  const noticias = await db
    .select()
    .from(noticiasJuridicas)
    .where(
      and(
        eq(noticiasJuridicas.status, "aprovada"),
        gte(noticiasJuridicas.aprovadoEm, seteDiasAtras)
      )
    )
    .limit(20);

  if (noticias.length === 0) {
    return { success: true, noticiasFound: 0, instancesEnviadas: 0 };
  }

  // 2. Busca vínculos com processos
  const noticiaIds = noticias.map((n) => n.id);
  const vinculos = await db
    .select()
    .from(noticiasProcessos)
    .where(inArray(noticiasProcessos.noticiaId, noticiaIds));

  const noticiaIdsComProcesso = new Set(vinculos.map((v) => v.noticiaId));
  const noticiasComProcesso = noticias.filter((n) => noticiaIdsComProcesso.has(n.id));
  const noticiasSemProcesso = noticias.filter((n) => !noticiaIdsComProcesso.has(n.id));

  // 3. Chama Claude Haiku para formatar mensagem WhatsApp
  const client = new Anthropic();

  const dataInicio = seteDiasAtras.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const dataFim = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const periodo = `${dataInicio} a ${dataFim}`;

  const noticiasComProcessoTexto = noticiasComProcesso
    .slice(0, 5)
    .map((n) => `- ${n.titulo}`)
    .join("\n");

  const noticiasSemProcessoTexto = noticiasSemProcesso
    .slice(0, 5)
    .map((n) => `- ${n.titulo}`)
    .join("\n");

  const prompt = `Você é um assistente jurídico. Formate uma mensagem de digest semanal para WhatsApp usando APENAS markdown do WhatsApp (*negrito*, bullet •).

Período: ${periodo}

Notícias que afetam processos vinculados:
${noticiasComProcessoTexto || "Nenhuma esta semana."}

Destaques gerais da semana:
${noticiasSemProcessoTexto || "Nenhum destaque adicional."}

Use EXATAMENTE este formato (substitua os colchetes pelo conteúdo real):
📰 *Panorama Jurídico — [período]*

⚠️ *Afeta seus processos:*
• [notícias vinculadas a processos, uma por linha com •]

📋 *Destaques da semana:*
• [top 5 notícias gerais, uma por linha com •]

🔗 Ver todas: ombuds.vercel.app/admin/noticias

Seja conciso. Títulos podem ser encurtados se necessário. Não adicione texto extra fora do formato acima.`;

  const aiResponse = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const mensagem =
    aiResponse.content[0].type === "text"
      ? aiResponse.content[0].text.trim()
      : "";

  if (!mensagem) {
    return { success: false, noticiasFound: noticias.length, instancesEnviadas: 0, error: "Claude não retornou mensagem" };
  }

  // 4. Busca configs Evolution ativas com phoneNumber
  const configs = await db
    .select()
    .from(evolutionConfig)
    .where(eq(evolutionConfig.isActive, true));

  const configsComPhone = configs.filter((c) => c.phoneNumber && c.phoneNumber.trim() !== "");

  if (configsComPhone.length === 0) {
    return { success: true, noticiasFound: noticias.length, instancesEnviadas: 0 };
  }

  // 5. Envia via sendText para cada instância ativa com phoneNumber
  let instancesEnviadas = 0;
  for (const config of configsComPhone) {
    try {
      await sendText(config.phoneNumber!, mensagem, {
        instanceName: config.instanceName,
        apiKey: config.apiKey,
      });
      instancesEnviadas++;
    } catch {
      // Non-fatal — continua para as próximas instâncias
    }
  }

  return { success: true, noticiasFound: noticias.length, instancesEnviadas };
}

// =============================================================================
// HANDLER PRINCIPAL
// =============================================================================

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Roteamento por action
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "digest") {
    try {
      const result = await gerarEEnviarDigest();
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }, { status: 500 });
    }
  }

  // Ação padrão: scraping diário + enrichment
  try {
    const results = await scrapeAllFontes();
    const totalNovos = results.reduce((s, r) => s + r.novos, 0);
    const totalErros = results.reduce((s, r) => s + r.erros, 0);

    let enriquecimento: { processadas: number; erros: number } | null = null;
    try {
      const { enriquecerPendentes } = await import("@/lib/noticias/enricher");
      enriquecimento = await enriquecerPendentes(5);
    } catch {
      // Non-fatal — scraping succeeded even if enrichment fails
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalNovos,
      totalErros,
      fontes: results,
      enriquecimento,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
