import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { driveDocumentSections } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { mapClassifiedSections } from "@/lib/services/pdf-classifier";

export const runtime = "nodejs";

/**
 * Ingestão de seções classificadas pelo daemon Claude Max.
 *
 * Fluxo #4: a classificação de atos roda no Mac (daemon `claude -p`, assinatura
 * Max, sem API metered). Ao concluir uma task `classify-document`, o daemon faz
 * POST aqui com as seções de UM chunk. Salvamos de forma idempotente por intervalo
 * de páginas (o daemon chunка sem overlap → sem dedup cross-chunk necessária).
 *
 * DORMENTE: nada chama este endpoint até o daemon ser ligado a ele. O caminho
 * atual da inngest segue intocado.
 *
 * Auth: header `x-ingest-secret` === env `CLASSIFICATION_INGEST_SECRET`.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.CLASSIFICATION_INGEST_SECRET;
  const secret = req.headers.get("x-ingest-secret");
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    fileId?: number;
    startPage?: number;
    endPage?: number;
    sections?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { fileId, startPage, endPage, sections } = body || {};
  if (typeof fileId !== "number" || !Array.isArray(sections)) {
    return NextResponse.json(
      { error: "fileId (number) e sections (array) são obrigatórios" },
      { status: 400 },
    );
  }

  const sp = typeof startPage === "number" ? startPage : 1;
  const ep = typeof endPage === "number" ? endPage : sp;
  const mapped = mapClassifiedSections(sections, sp, ep);

  if (mapped.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, note: "nenhuma seção" });
  }

  // Idempotência: remove seções já ingeridas cujo início caia neste intervalo de
  // páginas (re-processamento do mesmo chunk não duplica).
  if (typeof startPage === "number" && typeof endPage === "number") {
    await db
      .delete(driveDocumentSections)
      .where(
        and(
          eq(driveDocumentSections.driveFileId, fileId),
          gte(driveDocumentSections.paginaInicio, sp),
          lte(driveDocumentSections.paginaInicio, ep),
        ),
      );
  }

  const values = mapped.map((s) => ({
    driveFileId: fileId,
    tipo: s.tipo,
    titulo: s.titulo,
    paginaInicio: s.paginaInicio,
    paginaFim: s.paginaFim,
    resumo: s.resumo,
    confianca: s.confianca,
    metadata: s.metadata,
    // Mantém o comportamento de auto-aprovação por confiança (≥90%).
    reviewStatus: s.confianca >= 90 ? "approved" : "pending",
  }));

  const inserted = await db
    .insert(driveDocumentSections)
    .values(values)
    .returning({ id: driveDocumentSections.id });

  return NextResponse.json({ ok: true, inserted: inserted.length });
}
