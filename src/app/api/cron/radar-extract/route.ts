import { NextRequest, NextResponse } from "next/server";

/**
 * Cron job de extração contínua do Radar Criminal.
 * Roda a cada 4 horas para processar o backlog de notícias pendentes.
 * Não faz scraping — apenas extração + geocodificação + matching.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const engineUrl = process.env.ENRICHMENT_ENGINE_URL;
  const apiKey = process.env.ENRICHMENT_API_KEY;

  if (!engineUrl || !apiKey) {
    return NextResponse.json({ error: "Enrichment Engine not configured" }, { status: 500 });
  }

  const headers = { "Content-Type": "application/json", "X-API-Key": apiKey };
  const results: Record<string, unknown> = {};

  async function callStep(step: string, path: string, timeoutMs: number, body?: object) {
    try {
      const response = await fetch(`${engineUrl}${path}`, {
        method: "POST",
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
      results[step] = response.ok ? await response.json() : { status: "error", code: response.status };
    } catch (error) {
      results[step] = { status: "error", detail: String(error) };
    }
  }

  // Apenas as etapas de processamento (sem scrape)
  await callStep("extract", "/api/radar/extract", 45_000, { limit: 30 });
  await callStep("geocode", "/api/radar/geocode", 8_000, { limit: 30 });
  await callStep("match", "/api/radar/match", 5_000, { limit: 50 });

  return NextResponse.json({ success: true, timestamp: new Date().toISOString(), ...results });
}
