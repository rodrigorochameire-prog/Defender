import type { SeeuImportStaging } from "@/lib/db/schema/seeu-import";
import type { ImportRow } from "@/lib/services/pje-import";
import { parseSEEUIntimacoes, type IntimacaoSEEU } from "@/lib/pje-parser";
import { intimacaoToImportRow } from "@/lib/services/pje-intimacoes-import";

/**
 * Reparseia o `conteudo` cru de uma linha SEEU FORÇANDO o parser SEEU (a origem é
 * sabidamente SEEU — não dependemos de `isSEEU`, que erra em blocos isolados). O
 * `tab` da linha define o tipoManifestacao (aba Ciência → 'ciencia'; senão
 * 'manifestacao'), garantindo o `ato` correto mesmo sem o cabeçalho da aba no bloco.
 * Retorna a 1ª intimação, ou null se não parseável.
 */
export function parseSeeuRow(row: SeeuImportStaging): IntimacaoSEEU | null {
  if (!row.conteudo) return null;
  const override = row.tab === "ciencia" ? "ciencia" : "manifestacao";
  try {
    const r = parseSEEUIntimacoes(row.conteudo, override);
    return (r.intimacoes[0] as IntimacaoSEEU) ?? null;
  } catch {
    return null;
  }
}

/**
 * Converte uma linha de staging SEEU → ImportRow. Fonte única de parsing: o parser
 * SEEU forçado (parseSeeuRow) → `intimacaoToImportRow(..., "SEEU")` (que roteia por
 * `intimacaoSEEUToDemanda`). Fallback para as colunas best-effort se não parseável.
 * Edições do usuário (`revisao`) têm precedência sobre o parse e o fallback.
 */
export function seeuStagingRowToImportRow(row: SeeuImportStaging): ImportRow {
  const rev = (row.revisao ?? {}) as Record<string, unknown>;
  const pick = <T>(k: string, fallback: T): T =>
    (rev[k] as T | undefined) ?? fallback;
  const atrib = (row.atribuicao as string | null) ?? "";

  const int = parseSeeuRow(row);
  const base: ImportRow = int
    ? intimacaoToImportRow(int, atrib, String(row.jobId), "SEEU")
    : {
        assistido: row.assistidoNome ?? "",
        processoNumero: row.processoNumero ?? undefined,
        ato: row.ato ?? "",
        prazo: row.prazo ?? undefined,
        atribuicao: atrib || undefined,
        importBatchId: String(row.jobId),
      };

  return {
    ...base,
    assistido: pick("assistidoNome", base.assistido),
    processoNumero: pick("processoNumero", base.processoNumero),
    ato: pick("ato", row.ato ?? base.ato),
    prazo: pick("prazo", base.prazo),
    atribuicao: pick("atribuicao", base.atribuicao),
    assistidoMatchId: pick<number | undefined>("assistidoMatchId", undefined),
    // SEEU: tudo em triagem (decisão do usuário); o ato distingue Ciência.
    status: base.status === "ciencia" ? "triagem" : base.status,
  };
}

export type SeeuLedgerUpsert = {
  processoNumero: string | null;
  seq: number | null;
  contentHash: string;
  atribuicao: string | null;
  ato: string | null;
  decisao: "imported" | "skipped" | "duplicate";
  jobId: number;
};

/**
 * Mesma semântica de buildLedgerUpserts do PJe, porém com a chave forte do SEEU
 * (processo+seq) em vez de pjeDocumentoId. imported = selecionado; duplicate =
 * já vista (duplicada/ja_importada) não selecionada; skipped = nova não selecionada.
 */
export function buildSeeuLedgerUpserts(
  rows: SeeuImportStaging[],
  selectedIds: Set<number>,
  jobId: number,
): SeeuLedgerUpsert[] {
  return rows.map((r) => {
    let decisao: SeeuLedgerUpsert["decisao"];
    if (selectedIds.has(r.id)) decisao = "imported";
    else if (r.decisao === "duplicada" || r.decisao === "ja_importada")
      decisao = "duplicate";
    else decisao = "skipped";
    return {
      processoNumero: r.processoNumero ?? null,
      seq: r.seq ?? null,
      contentHash: r.contentHash,
      atribuicao: (r.atribuicao as string | null) ?? null,
      ato: r.ato ?? null,
      decisao,
      jobId,
    };
  });
}
