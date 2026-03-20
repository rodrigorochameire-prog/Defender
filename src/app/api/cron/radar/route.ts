import { NextRequest, NextResponse } from "next/server";

/**
 * Cron job para o Radar Criminal.
 * Chama cada etapa do pipeline SEQUENCIALMENTE com timeout individual:
 *   1. Scrape (20s) — coleta notícias
 *   2. Extract (25s) — extrai dados via Gemini (batch de 10)
 *   3. Geocode (5s) — geocodifica bairros
 *   4. Match (5s) — matching com assistidos
 *
 * Configurado no vercel.json para rodar 2x/dia (6h e 18h BRT).
 * Protegido por CRON_SECRET para evitar chamadas externas.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const engineUrl = process.env.ENRICHMENT_ENGINE_URL;
  const apiKey = process.env.ENRICHMENT_API_KEY;

  if (!engineUrl || !apiKey) {
    return NextResponse.json(
      { error: "Enrichment Engine not configured" },
      { status: 500 }
    );
  }

  const headers = {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
  };

  const results: Record<string, unknown> = {};

  // Helper: call an engine endpoint with individual timeout
  async function callStep(
    step: string,
    path: string,
    timeoutMs: number,
    body?: object
  ) {
    try {
      const response = await fetch(`${engineUrl}${path}`, {
        method: "POST",
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        results[step] = { status: "error", code: response.status, detail: text };
        return;
      }

      results[step] = await response.json();
    } catch (error) {
      console.error(`[CRON] ${step} failed:`, error);
      results[step] = { status: "error", detail: String(error) };
    }
  }

  // Run steps sequentially with individual timeouts
  // Total budget: ~55s (Vercel max 60s)
  await callStep("scrape", "/api/radar/scrape", 20_000);

  // 1b. Instagram scrape (perfis oficiais — não bloqueia o pipeline se falhar)
  try {
    await fetch(`${engineUrl}/api/radar/scrape-instagram`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(30_000),
    }).then(async (r) => {
      results["scrape_instagram"] = r.ok ? await r.json() : { status: "error", code: r.status };
    });
  } catch {
    console.warn("[Radar Cron] Instagram scrape falhou — continuando pipeline");
    results["scrape_instagram"] = { status: "skipped" };
  }
  await callStep("extract", "/api/radar/extract", 45_000, { limit: 30 });
  await callStep("geocode", "/api/radar/geocode", 8_000, { limit: 30 });
  await callStep("match", "/api/radar/match", 5_000, { limit: 50 });

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    ...results,
  });
}
