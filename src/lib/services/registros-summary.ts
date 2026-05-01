/**
 * Helpers para sincronização bidirecional entre a coluna "Providências" da
 * planilha do Google Sheets e a tabela `registros` do banco.
 *
 * Estratégia:
 * - Resumo automático condensa os últimos N registros da demanda no topo
 *   da célula (read-only para o usuário, sobrescrito a cada sync).
 * - Marker estável separa o resumo da área livre, onde o usuário pode
 *   digitar uma anotação rápida.
 * - parseProvidenciasCell extrai apenas o conteúdo abaixo do marker — esse
 *   é o texto que vira um novo registro tipo='anotacao' quando re-importado.
 */

import { db } from "@/lib/db";
import { registros as registrosTable } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { format } from "date-fns";

export const PROVIDENCIAS_MARKER = "──────── Anotações (escreva abaixo) ────────";

const TIPO_SHORT: Record<string, string> = {
  atendimento: "Atend.",
  diligencia: "Dilig.",
  anotacao: "Anot.",
  providencia: "Prov.",
  delegacao: "Deleg.",
  pesquisa: "Pesq.",
  elaboracao: "Elab.",
};

const MAX_LINE_CHARS = 80;
const MAX_REGISTROS = 5;

function truncate(s: string, max: number): string {
  const trimmed = s.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? trimmed.slice(0, max - 1) + "…" : trimmed;
}

/**
 * Build the "Providências" cell content for a demanda — auto-summary section,
 * marker line, and an empty space for user input.
 */
export async function buildProvidenciasCell(demandaId: number): Promise<string> {
  const rows = await db
    .select({
      tipo: registrosTable.tipo,
      conteudo: registrosTable.conteudo,
      dataRegistro: registrosTable.dataRegistro,
    })
    .from(registrosTable)
    .where(eq(registrosTable.demandaId, demandaId))
    .orderBy(desc(registrosTable.dataRegistro))
    .limit(MAX_REGISTROS);

  let summary: string;
  if (rows.length === 0) {
    summary = "📋 Resumo (automático):\n(sem registros)";
  } else {
    const lines = rows.map((r) => {
      const date = format(r.dataRegistro, "dd/MM");
      const short = TIPO_SHORT[r.tipo] ?? r.tipo;
      const conteudo = truncate(r.conteudo ?? "", MAX_LINE_CHARS);
      return `[${date} ${short}] ${conteudo}`;
    });
    summary = "📋 Resumo (automático):\n" + lines.join("\n");
  }

  return summary + "\n\n" + PROVIDENCIAS_MARKER + "\n";
}

/**
 * Parse a Providências cell value as it came from the sheet.
 * Returns the user-written note (if any) — content below the marker, trimmed.
 * Returns null if no user content is present.
 */
export function parseProvidenciasCell(
  cellText: string | null | undefined,
): { userNote: string | null } {
  if (!cellText) return { userNote: null };
  const idx = cellText.indexOf(PROVIDENCIAS_MARKER);
  if (idx < 0) {
    // No marker — old format. Treat the whole thing as a potential user note,
    // BUT only if it's not just the empty placeholder. To be safe, return null
    // (don't capture content from cells that haven't been migrated to the new
    // format yet).
    return { userNote: null };
  }
  const below = cellText.slice(idx + PROVIDENCIAS_MARKER.length);
  const trimmed = below.trim();
  if (!trimmed) return { userNote: null };
  return { userNote: trimmed };
}
