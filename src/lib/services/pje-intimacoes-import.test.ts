import { describe, it, expect } from "vitest";
import {
  normalizeConteudo,
  computeContentHash,
  buildLedgerUpserts,
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
