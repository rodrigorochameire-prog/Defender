import { createHash } from "node:crypto";
import type { ImportRow } from "@/lib/services/pje-import";
import { verificarDuplicatas } from "@/lib/pje-parser";
import type { PjeImportStaging } from "@/lib/db/schema/pje-import";

export function normalizeConteudo(s: string): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function computeContentHash(
  processoNumero: string,
  pjeDocumentoId: string | null,
  conteudo: string,
): string {
  const payload = `${processoNumero ?? ""}|${pjeDocumentoId ?? ""}|${normalizeConteudo(conteudo)}`;
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function stagingRowToImportRow(row: PjeImportStaging): ImportRow {
  const rev = (row.revisao ?? {}) as Record<string, unknown>;
  const pick = <T>(k: string, fallback: T): T =>
    (rev[k] as T | undefined) ?? fallback;
  return {
    assistido: pick("assistidoNome", row.assistidoNome ?? ""),
    processoNumero: pick("processoNumero", row.processoNumero ?? undefined),
    ato: pick("ato", row.ato ?? ""),
    prazo: pick("prazo", row.prazo ?? undefined),
    dataExpedicaoCompleta: row.dataExpedicao
      ? row.dataExpedicao.toISOString()
      : undefined,
    atribuicao: pick("atribuicao", row.atribuicao ?? undefined),
    tipoDocumento: row.tipoDocumento ?? undefined,
    idDocumentoPje: row.pjeDocumentoId ?? undefined,
    assistidoMatchId: pick<number | undefined>("assistidoMatchId", undefined),
  };
}

export type LedgerUpsert = {
  pjeDocumentoId: string | null;
  contentHash: string;
  processoNumero: string | null;
  atribuicao: string | null;
  decisao: "imported" | "skipped" | "duplicate";
  jobId: number;
};

export function buildLedgerUpserts(
  rows: PjeImportStaging[],
  selectedIds: Set<number>,
  jobId: number,
): LedgerUpsert[] {
  return rows.map((r) => {
    let decisao: LedgerUpsert["decisao"];
    if (selectedIds.has(r.id)) decisao = "imported";
    else if (r.decisao === "duplicada" || r.decisao === "ja_importada")
      decisao = "duplicate";
    else decisao = "skipped"; // nova/incerta que o usuário não selecionou
    return {
      pjeDocumentoId: r.pjeDocumentoId ?? null,
      contentHash: r.contentHash,
      processoNumero: r.processoNumero ?? null,
      atribuicao: (r.atribuicao as string | null) ?? null,
      decisao,
      jobId,
    };
  });
}

// Layer-B: rebaixa linhas 'nova' para 'incerta' quando verificarDuplicatas
// acha candidata viva. Mutação retornada como novo array (sem efeitos colaterais).
//
// REAL IntimacaoPJeSimples fields (from src/lib/pje-parser.ts):
//   assistido: string         ← NOT nomeAssistido (brief assumption was wrong)
//   dataExpedicao: string     ← non-optional string
//   numeroProcesso: string    ← non-optional string
//   idDocumento?: string      ← optional
//
// _stagingId is an extra field we inject at runtime so we can map results back.
// verificarDuplicatas does not strip unknown fields (it passes items through
// as-is into .novas/.duplicadas), so _stagingId survives the round-trip.
export function enrichStagingWithLiveDedup(
  rows: PjeImportStaging[],
  demandasExistentes: unknown[],
): PjeImportStaging[] {
  const novas = rows.filter((r) => r.decisao === "nova");
  if (novas.length === 0) return rows;

  type WithStagingId = {
    assistido: string;
    dataExpedicao: string;
    numeroProcesso: string;
    idDocumento?: string;
    _stagingId: number;
  };

  const intimacoes = novas.map((r): WithStagingId => ({
    assistido: r.assistidoNome ?? "",              // real field name
    dataExpedicao: r.dataExpedicao
      ? r.dataExpedicao.toISOString()
      : "",                                         // must be string, default ""
    numeroProcesso: r.processoNumero ?? "",         // must be string, default ""
    idDocumento: r.pjeDocumentoId ?? undefined,
    _stagingId: r.id,
  }));

  const res = verificarDuplicatas(
    intimacoes as unknown as Parameters<typeof verificarDuplicatas>[0],
    demandasExistentes as never[],
  );

  // _stagingId survives because verificarDuplicatas pushes items as-is into
  // .novas / .duplicadas without cloning. Cast via unknown to read it back.
  const dupStagingIds = new Set(
    (res.duplicadas as unknown as Array<{ _stagingId?: number }>)
      .map((d) => d._stagingId)
      .filter((x): x is number => typeof x === "number"),
  );

  return rows.map((r) =>
    dupStagingIds.has(r.id) && r.decisao === "nova"
      ? { ...r, decisao: "incerta" as const }
      : r,
  );
}
