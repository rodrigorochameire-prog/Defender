/**
 * Helpers para sincronização bidirecional entre a coluna "Providências" da
 * planilha do Google Sheets e a tabela `registros` do banco.
 *
 * Estratégia:
 * - Resumo automático condensa os registros da demanda no topo da célula,
 *   agrupados por tipo (read-only para o usuário, sobrescrito a cada sync).
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

/** Ordem canônica de exibição dos tipos no resumo (mais acionáveis primeiro). */
const TIPO_ORDER = [
  "providencia",
  "delegacao",
  "diligencia",
  "ciencia",
  "atendimento",
  "elaboracao",
  "peticao",
  "pesquisa",
  "busca",
  "investigacao",
  "transferencia",
  "anotacao",
] as const;

/** Prefixo visual + label por tipo — cobre os 12 tipos canônicos de registro. */
const TIPO_VISUAL: Record<string, { emoji: string; label: string }> = {
  providencia:   { emoji: "📌", label: "Providências" },
  delegacao:     { emoji: "🤝", label: "Delegações" },
  diligencia:    { emoji: "📋", label: "Diligências" },
  ciencia:       { emoji: "📨", label: "Ciências" },
  atendimento:   { emoji: "👥", label: "Atendimentos" },
  elaboracao:    { emoji: "✍️", label: "Elaborações" },
  peticao:       { emoji: "📄", label: "Petições" },
  pesquisa:      { emoji: "🔍", label: "Pesquisas" },
  busca:         { emoji: "🔎", label: "Buscas" },
  investigacao:  { emoji: "🕵️", label: "Investigações" },
  transferencia: { emoji: "🔁", label: "Transferências" },
  anotacao:      { emoji: "📝", label: "Anotações" },
};

const MAX_LINE_CHARS = 80;
/** Quantos registros buscar no banco (janela do resumo). */
const MAX_REGISTROS = 40;
/** Máximo de itens exibidos por tipo (os mais recentes). */
const MAX_POR_TIPO = 3;
/** Máximo de linhas de item no resumo (sem contar headers de tipo). */
const MAX_TOTAL_ITENS = 15;

function truncate(s: string, max: number): string {
  const trimmed = s.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? trimmed.slice(0, max - 1) + "…" : trimmed;
}

/**
 * Build the "Providências" cell content for a demanda — auto-summary grouped
 * by tipo de registro, marker line, and an empty space for user input.
 *
 * Formato:
 *   📋 Registros (automático):
 *   📌 Providências
 *     • 02/06 — Conteúdo truncado…
 *     • 28/05 — …  (+2 anteriores)
 *   🤝 Delegações
 *     • 27/05 — Delegada a Emilly…
 */
export async function buildProvidenciasCell(demandaId: number): Promise<string> {
  const rows = await db
    .select({
      tipo: registrosTable.tipo,
      titulo: registrosTable.titulo,
      conteudo: registrosTable.conteudo,
      dataRegistro: registrosTable.dataRegistro,
    })
    .from(registrosTable)
    .where(eq(registrosTable.demandaId, demandaId))
    .orderBy(desc(registrosTable.dataRegistro))
    .limit(MAX_REGISTROS);

  let summary: string;
  if (rows.length === 0) {
    summary = "📋 Registros (automático):\n(sem registros)";
  } else {
    // Agrupa por tipo, preservando ordem desc por data dentro de cada grupo
    const porTipo = new Map<string, typeof rows>();
    for (const r of rows) {
      const grupo = porTipo.get(r.tipo) ?? [];
      grupo.push(r);
      porTipo.set(r.tipo, grupo);
    }

    // Tipos na ordem canônica; desconhecidos ao final
    const tiposOrdenados = [
      ...TIPO_ORDER.filter((t) => porTipo.has(t)),
      ...[...porTipo.keys()].filter((t) => !(TIPO_ORDER as readonly string[]).includes(t)),
    ];

    const sections: string[] = [];
    let itensRestantes = MAX_TOTAL_ITENS;

    for (const tipo of tiposOrdenados) {
      if (itensRestantes <= 0) break;
      const grupo = porTipo.get(tipo)!;
      const visual = TIPO_VISUAL[tipo] ?? { emoji: "•", label: tipo };
      const visiveis = grupo.slice(0, Math.min(MAX_POR_TIPO, itensRestantes));
      itensRestantes -= visiveis.length;

      const linhas = visiveis.map((r) => {
        const date = format(r.dataRegistro, "dd/MM");
        const texto = truncate(r.titulo || r.conteudo || "", MAX_LINE_CHARS);
        return `  • ${date} — ${texto}`;
      });
      const ocultos = grupo.length - visiveis.length;
      if (ocultos > 0) {
        linhas[linhas.length - 1] += `  (+${ocultos} anteriores)`;
      }
      sections.push(`${visual.emoji} ${visual.label}\n${linhas.join("\n")}`);
    }

    summary = "📋 Registros (automático):\n" + sections.join("\n");
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
