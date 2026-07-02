import { db } from "@/lib/db";
import { driveDocumentSections, driveFiles, assistidos, processos } from "@/lib/db/schema";
import { and, eq, ne, desc, inArray } from "drizzle-orm";

const SECTION_CAP = 2000;
const MAX_SECTIONS = 30;
const MAX_DOSSIE_CHARS = 18000;

export interface DossieSection {
  tipo?: string | null;
  titulo?: string | null;
  resumo?: string | null;
  textoExtraido?: string | null;
}

/** Markdown compacto (só resumos, capado) com o contexto do assistido. Puro. */
export function buildDossieMarkdown(sections: DossieSection[], priorAnalyses: string[]): string {
  const parts: string[] = [];

  const drive = (sections ?? [])
    .slice(0, MAX_SECTIONS)
    .map((s) => {
      const titulo = s.titulo || s.tipo || "documento";
      let txt = (s.resumo ?? "").trim();
      if (!txt) txt = (s.textoExtraido ?? "").trim().slice(0, SECTION_CAP);
      return txt ? `- **${titulo}**: ${txt.slice(0, SECTION_CAP)}` : "";
    })
    .filter(Boolean);
  if (drive.length) parts.push("### Documentos no Drive (resumos)\n" + drive.join("\n"));

  const an = (priorAnalyses ?? [])
    .map((a) => (a ?? "").trim())
    .filter(Boolean)
    .map((a) => `- ${a.slice(0, SECTION_CAP)}`);
  if (an.length) parts.push("### Análises anteriores\n" + an.join("\n"));

  if (!parts.length) return "";
  let body = "## Dossiê do assistido (contexto além dos autos)\n\n" + parts.join("\n\n");
  if (body.length > MAX_DOSSIE_CHARS) body = body.slice(0, MAX_DOSSIE_CHARS) + "\n\n[…dossiê truncado]";
  return body;
}

/** Busca Drive sections + analysisData e formata. NUNCA lança → "" em erro. */
export async function fetchDossieMarkdown(assistidoId: number, processoIds: number[]): Promise<string> {
  try {
    const sections = await db
      .select({
        tipo: driveDocumentSections.tipo,
        titulo: driveDocumentSections.titulo,
        resumo: driveDocumentSections.resumo,
        textoExtraido: driveDocumentSections.textoExtraido,
      })
      .from(driveDocumentSections)
      .innerJoin(driveFiles, eq(driveDocumentSections.driveFileId, driveFiles.id))
      .where(and(eq(driveFiles.assistidoId, assistidoId), ne(driveDocumentSections.reviewStatus, "rejected")))
      .orderBy(desc(driveDocumentSections.updatedAt))
      .limit(MAX_SECTIONS);

    const prior: string[] = [];
    const [aRow] = await db
      .select({ analysisData: assistidos.analysisData })
      .from(assistidos)
      .where(eq(assistidos.id, assistidoId))
      .limit(1);
    const aResumo = (aRow?.analysisData as any)?.resumo;
    if (aResumo) prior.push(String(aResumo));

    if (processoIds.length) {
      const pRows = await db
        .select({ analysisData: processos.analysisData })
        .from(processos)
        .where(inArray(processos.id, processoIds));
      for (const p of pRows) {
        const r = (p.analysisData as any)?.resumo;
        if (r) prior.push(String(r));
      }
    }

    return buildDossieMarkdown(sections, prior);
  } catch {
    return "";
  }
}
