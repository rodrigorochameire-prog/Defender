import { createHash } from "node:crypto";
import type { ImportRow } from "@/lib/services/pje-import";
import {
  verificarDuplicatas,
  parseIntimacoesUnificado,
  intimacaoToDemanda,
  intimacaoSEEUToDemanda,
  ASSISTIDO_A_IDENTIFICAR,
  type IntimacaoPJeSimples,
  type IntimacaoSEEU,
} from "@/lib/pje-parser";
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

export type ParsedStaging = {
  int: IntimacaoPJeSimples;
  sistema: "PJe" | "SEEU";
};

/**
 * Re-parseia o `conteudo` CRU de uma staging row (texto capturado do DOM) com o
 * parser canônico — a FONTE ÚNICA de verdade para semântica (assistido com
 * taxonomia de polos + title-case, crime, tipoProcesso, vara, MPU). Usa
 * `parseIntimacoesUnificado`, que auto-detecta PJe vs SEEU pelo conteúdo, de
 * modo que blocos do SEEU (Mesa do Defensor) são roteados sozinhos. Retorna a 1ª
 * intimação + o sistema detectado, ou null se o conteúdo não for parseável.
 */
export function parseStagingRow(row: PjeImportStaging): ParsedStaging | null {
  if (!row.conteudo) return null;
  try {
    const r = parseIntimacoesUnificado(row.conteudo);
    const int = r.intimacoes[0];
    return int ? { int, sistema: r.sistema } : null;
  } catch {
    return null;
  }
}

/**
 * Mapeia uma intimação já parseada → ImportRow. Mesma conversão usada pelo
 * endpoint /api/cron/pje-import (centralizada aqui para haver UMA só). Roteia o
 * construtor de demanda pelo `sistema`: PJe → intimacaoToDemanda; SEEU (execução
 * penal) → intimacaoSEEUToDemanda (ambos retornam o mesmo formato de demanda).
 */
export function intimacaoToImportRow(
  int: IntimacaoPJeSimples,
  atribuicao: string,
  importBatchId: string,
  sistema: "PJe" | "SEEU" = "PJe",
): ImportRow {
  const demanda =
    sistema === "SEEU"
      ? intimacaoSEEUToDemanda(int as IntimacaoSEEU)
      : intimacaoToDemanda(int, atribuicao);
  return {
    assistido: demanda.assistido,
    processoNumero: demanda.processos?.[0]?.numero,
    ato: demanda.ato || "Ciência",
    prazo: demanda.prazo || undefined,
    dataEntrada: demanda.data?.split("T")[0] || undefined,
    dataExpedicaoCompleta: demanda.data || undefined,
    dataInclusao: demanda.dataInclusao || undefined,
    status: demanda.status || "analisar",
    estadoPrisional: demanda.estadoPrisional || "Solto",
    // SEEU traz providências úteis (classe - assunto); PJe segue como o cron (vazio).
    providencias: sistema === "SEEU" ? demanda.providencias || undefined : undefined,
    atribuicao: demanda.atribuicao || atribuicao,
    importBatchId,
    ordemOriginal: int.ordemOriginal,
    tipoDocumento: int.tipoDocumento,
    crime: int.crime,
    tipoProcesso: int.tipoProcesso,
    vara: int.vara,
    idDocumentoPje: int.idDocumento,
    atribuicaoDetectada: int.atribuicaoDetectada,
    assistidoNaoIdentificado:
      int.assistidoNaoIdentificado || int.assistido === ASSISTIDO_A_IDENTIFICAR,
  };
}

/**
 * Converte uma staging row → ImportRow para importação.
 *
 * Fonte única de parsing: re-parseia o `conteudo` cru (capturado do DOM) com o
 * parser canônico — daí saem assistido (title-case + taxonomia de polos), crime,
 * tipoProcesso e vara. Se o conteúdo não for parseável, cai para as colunas
 * best-effort que o worker gravou. Edições do usuário (`revisao`) têm
 * precedência sobre o parse e o fallback.
 */
export function stagingRowToImportRow(row: PjeImportStaging): ImportRow {
  const rev = (row.revisao ?? {}) as Record<string, unknown>;
  const pick = <T>(k: string, fallback: T): T =>
    (rev[k] as T | undefined) ?? fallback;

  const atrib = (row.atribuicao as string | null) ?? "";

  const parsed = parseStagingRow(row);
  const base: ImportRow = parsed
    ? intimacaoToImportRow(parsed.int, atrib, String(row.jobId), parsed.sistema)
    : {
        assistido: row.assistidoNome ?? "",
        processoNumero: row.processoNumero ?? undefined,
        ato: row.ato ?? "",
        prazo: row.prazo ?? undefined,
        dataExpedicaoCompleta: row.dataExpedicao
          ? row.dataExpedicao.toISOString()
          : undefined,
        atribuicao: atrib || undefined,
        tipoDocumento: row.tipoDocumento ?? undefined,
        idDocumentoPje: row.pjeDocumentoId ?? undefined,
        importBatchId: String(row.jobId),
      };

  // Edições do usuário (revisao) vencem o parse e o fallback.
  return {
    ...base,
    assistido: pick("assistidoNome", base.assistido),
    processoNumero: pick("processoNumero", base.processoNumero),
    ato: pick("ato", base.ato),
    prazo: pick("prazo", base.prazo),
    atribuicao: pick("atribuicao", base.atribuicao),
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
