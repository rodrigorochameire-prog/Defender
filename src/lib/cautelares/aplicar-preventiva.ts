import { and, eq, inArray } from "drizzle-orm";
import { prisaoPreventiva } from "@/lib/db/schema/cautelares";
import { db } from "@/lib/db";
import { parsePreventiva } from "./parse-preventiva";

export interface PreventivaCriada {
  id: number;
  requisitos: string[];
}

/**
 * Persiste a camada rica do decreto de preventiva (requisitos do art. 312 +
 * fundamentação fática verbatim + pressupostos) a partir do texto da decisão.
 * Uma linha "ativa" por processo, origem=parser (idempotente; nunca sobrescreve
 * linhas origem=manual). Retorna null quando o texto não é decreto de preventiva.
 */
export async function aplicarPreventiva(
  tx: typeof db,
  params: {
    processoId: number;
    conteudo: string;
    dataDecisaoISO: string | null;
    cautelarId?: number | null;
    origem?: string;
  },
): Promise<PreventivaCriada | null> {
  const parsed = parsePreventiva(params.conteudo);
  if (!parsed.ehPreventiva && parsed.requisitos.length === 0) return null;

  const origem = params.origem ?? "parser";

  // Já existe uma preventiva origem=parser/claude para o processo? Atualiza no
  // lugar (idempotente). Manual nunca é tocada automaticamente.
  const existentes = await tx
    .select({ id: prisaoPreventiva.id, origem: prisaoPreventiva.origem })
    .from(prisaoPreventiva)
    .where(eq(prisaoPreventiva.processoId, params.processoId));

  const editavel = existentes.find((e) => e.origem === "parser" || e.origem === origem);

  const payload = {
    requisitos: parsed.requisitos,
    pressupostos: parsed.pressupostos,
    contemporaneidade: parsed.contemporaneidade,
    dataDecreto: params.dataDecisaoISO,
    cautelarId: params.cautelarId ?? null,
    status: "ativa" as const,
    updatedAt: new Date(),
  };

  if (editavel) {
    await tx.update(prisaoPreventiva).set(payload).where(eq(prisaoPreventiva.id, editavel.id));
    return { id: editavel.id, requisitos: parsed.requisitos.map((r) => r.tipo) };
  }

  const [row] = await tx
    .insert(prisaoPreventiva)
    .values({ processoId: params.processoId, origem, ...payload })
    .returning({ id: prisaoPreventiva.id });
  return { id: row.id, requisitos: parsed.requisitos.map((r) => r.tipo) };
}

/** Marca como revogada(s) a(s) preventiva(s) ativa(s) do processo (origem=parser). */
export async function revogarPreventiva(
  tx: typeof db,
  processoId: number,
): Promise<number[]> {
  const ativas = await tx
    .select({ id: prisaoPreventiva.id, origem: prisaoPreventiva.origem, status: prisaoPreventiva.status })
    .from(prisaoPreventiva)
    .where(and(eq(prisaoPreventiva.processoId, processoId), eq(prisaoPreventiva.status, "ativa")));
  const ids = ativas.filter((a) => a.origem === "parser").map((a) => a.id);
  if (ids.length) {
    await tx
      .update(prisaoPreventiva)
      .set({ status: "revogada", situacao: "solto", updatedAt: new Date() })
      .where(inArray(prisaoPreventiva.id, ids));
  }
  return ids;
}
