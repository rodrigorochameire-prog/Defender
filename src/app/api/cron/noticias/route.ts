import { NextRequest, NextResponse } from "next/server";
import { scrapeAllFontes } from "@/lib/noticias/scraper";

/**
 * Cron job para scraping de notícias jurídicas.
 * Roda 1x/dia às 7h BRT (10h UTC).
 * Protegido por CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
