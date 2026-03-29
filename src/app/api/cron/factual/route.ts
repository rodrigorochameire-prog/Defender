import { NextRequest, NextResponse } from "next/server";
import { runFactualPipeline } from "@/lib/factual/scraper";

export const maxDuration = 120; // 2 minutes for CSE + summarization

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runFactualPipeline();
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("[factual cron] Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
