import { describe, it, expect } from "vitest";
import {
  normalizeConteudo,
  computeContentHash,
  buildLedgerUpserts,
  enrichStagingWithLiveDedup,
  stagingRowToImportRow,
} from "./pje-intimacoes-import";
import type { PjeImportStaging } from "@/lib/db/schema/pje-import";

function mkRow(over: Partial<PjeImportStaging>): PjeImportStaging {
  return {
    id: 1, jobId: 10, atribuicao: "VVD_CAMACARI", processoNumero: "0001",
    assistidoNome: "Fulano", ato: "Intimação", tipoDocumento: null,
    dataExpedicao: null, dataIntimacao: null, prazo: null, conteudo: "x",
    pjeDocumentoId: "DOC1", contentHash: "h", decisao: "nova",
    matchedDemandaId: null, matchedLedgerId: null, selected: false,
    revisao: null, createdAt: new Date(),
    ...over,
  } as PjeImportStaging;
}

describe("normalizeConteudo", () => {
  it("lowercases, trims and collapses whitespace", () => {
    expect(normalizeConteudo("  Olá   MUNDO\n\t teste ")).toBe("olá mundo teste");
  });
});

describe("computeContentHash", () => {
  it("is deterministic and 64 hex chars", () => {
    const a = computeContentHash("0001", "DOC1", "Conteúdo  X");
    const b = computeContentHash("0001", "DOC1", "conteúdo x");
    expect(a).toBe(b); // normalization makes them equal
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
  it("treats null pjeDocumentoId as empty component", () => {
    const a = computeContentHash("0001", null, "x");
    const b = computeContentHash("0001", "", "x");
    expect(a).toBe(b);
  });
});

describe("buildLedgerUpserts", () => {
  it("selected -> imported; unselected nova -> skipped; dup -> duplicate", () => {
    const rows = [
      mkRow({ id: 1, decisao: "nova", contentHash: "h1" }),
      mkRow({ id: 2, decisao: "nova", contentHash: "h2" }),
      mkRow({ id: 3, decisao: "duplicada", contentHash: "h3" }),
      mkRow({ id: 4, decisao: "ja_importada", contentHash: "h4" }),
    ];
    const out = buildLedgerUpserts(rows, new Set([1]), 10);
    const by = (h: string) => out.find((u) => u.contentHash === h)!;
    expect(by("h1").decisao).toBe("imported");   // selected
    expect(by("h2").decisao).toBe("skipped");     // nova but unchecked
    expect(by("h3").decisao).toBe("duplicate");   // dup
    expect(by("h4").decisao).toBe("duplicate");   // already imported -> duplicate sighting
    expect(out.every((u) => u.jobId === 10)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// enrichStagingWithLiveDedup — Layer-B dedup core
//
// Fixture: demanda with pjeData.idDocumento = "DOCID_MATCH".
// verificarDuplicatas checks intimacao.idDocumento === demanda.pjeData.idDocumento
// (the shortest, most reliable matching path — no dates/names needed).
// enrichStagingWithLiveDedup maps staging.pjeDocumentoId → idDocumento in the
// IntimacaoPJeSimples object, and injects _stagingId so results map back.
// ---------------------------------------------------------------------------
describe("enrichStagingWithLiveDedup", () => {
  const matchingDemanda = { pjeData: { idDocumento: "DOCID_MATCH" } };

  it("(a) no nova rows → returns same array reference (early exit)", () => {
    const rows = [
      mkRow({ id: 1, decisao: "duplicada" }),
      mkRow({ id: 2, decisao: "ja_importada" }),
    ];
    const result = enrichStagingWithLiveDedup(rows, [matchingDemanda]);
    // early-return path returns the original rows reference unchanged
    expect(result).toBe(rows);
  });

  it("(b) nova row matching a demanda via idDocumento → decisao becomes incerta", () => {
    const row = mkRow({ id: 5, decisao: "nova", pjeDocumentoId: "DOCID_MATCH" });
    const result = enrichStagingWithLiveDedup([row], [matchingDemanda]);
    expect(result[0].decisao).toBe("incerta");
  });

  it("(c) nova row not matching any demanda → stays nova", () => {
    const row = mkRow({ id: 6, decisao: "nova", pjeDocumentoId: "DOCID_NO_MATCH" });
    const result = enrichStagingWithLiveDedup([row], [matchingDemanda]);
    expect(result[0].decisao).toBe("nova");
  });

  it("(d) non-nova (duplicada) row is never downgraded even when a nova row is matched", () => {
    const matchRow = mkRow({ id: 7, decisao: "nova",      pjeDocumentoId: "DOCID_MATCH" });
    const dupRow   = mkRow({ id: 8, decisao: "duplicada", pjeDocumentoId: "DOCID_MATCH" });
    const result = enrichStagingWithLiveDedup([matchRow, dupRow], [matchingDemanda]);
    // the nova row was matched → incerta
    expect(result.find((r) => r.id === 7)!.decisao).toBe("incerta");
    // the duplicada row is untouched
    expect(result.find((r) => r.id === 8)!.decisao).toBe("duplicada");
  });

  it("_stagingId passthrough: correct row flipped when multiple nova rows exist", () => {
    const matchRow   = mkRow({ id: 10, decisao: "nova", pjeDocumentoId: "DOCID_MATCH" });
    const noMatchRow = mkRow({ id: 11, decisao: "nova", pjeDocumentoId: "DOCID_OTHER" });
    const result = enrichStagingWithLiveDedup([matchRow, noMatchRow], [matchingDemanda]);
    expect(result.find((r) => r.id === 10)!.decisao).toBe("incerta"); // matched → flipped
    expect(result.find((r) => r.id === 11)!.decisao).toBe("nova");    // no match → untouched
  });
});

// ---------------------------------------------------------------------------
// stagingRowToImportRow
// ---------------------------------------------------------------------------
describe("stagingRowToImportRow", () => {
  it("base mapping: all staging fields map to the correct ImportRow fields", () => {
    const expedicao = new Date("2025-03-15T10:00:00.000Z");
    const row = mkRow({
      assistidoNome: "João da Silva",
      processoNumero: "0001234-56.2024.8.05.0001",
      ato: "Intimação de Audiência",
      prazo: "2025-03-30",
      dataExpedicao: expedicao,
      atribuicao: "VVD_CAMACARI",
      tipoDocumento: "INTIM",
      pjeDocumentoId: "DOC999",
      revisao: null,
    });
    const out = stagingRowToImportRow(row);
    expect(out.assistido).toBe("João da Silva");                          // assistido ← assistidoNome
    expect(out.processoNumero).toBe("0001234-56.2024.8.05.0001");
    expect(out.ato).toBe("Intimação de Audiência");
    expect(out.prazo).toBe("2025-03-30");
    expect(out.dataExpedicaoCompleta).toBe(expedicao.toISOString());      // toISOString passthrough
    expect(out.atribuicao).toBe("VVD_CAMACARI");
    expect(out.tipoDocumento).toBe("INTIM");
    expect(out.idDocumentoPje).toBe("DOC999");                            // idDocumentoPje ← pjeDocumentoId
  });

  it("revisao override: revisao['assistidoNome'] wins over row.assistidoNome", () => {
    // Override key for the assistido output field is "assistidoNome" (pick("assistidoNome", ...))
    const row = mkRow({
      assistidoNome: "Nome Original",
      revisao: { assistidoNome: "Nome Corrigido via Revisão" },
    });
    const out = stagingRowToImportRow(row);
    expect(out.assistido).toBe("Nome Corrigido via Revisão");
  });

  it("dataExpedicaoCompleta, tipoDocumento, idDocumentoPje are NOT overridable via revisao", () => {
    // These three fields bypass pick() — they read directly from the staging row
    const expedicao = new Date("2025-01-01T00:00:00.000Z");
    const row = mkRow({
      dataExpedicao: expedicao,
      tipoDocumento: "INTIM",
      pjeDocumentoId: "DOC123",
      revisao: {
        dataExpedicaoCompleta: "SHOULD_BE_IGNORED",
        tipoDocumento: "SHOULD_BE_IGNORED",
        idDocumentoPje: "SHOULD_BE_IGNORED",
      },
    });
    const out = stagingRowToImportRow(row);
    expect(out.dataExpedicaoCompleta).toBe(expedicao.toISOString());
    expect(out.tipoDocumento).toBe("INTIM");
    expect(out.idDocumentoPje).toBe("DOC123");
  });
});
