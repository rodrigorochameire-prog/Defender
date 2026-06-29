import { describe, it, expect } from "vitest";
import { resolveSentencaDedupe } from "../dedupe";

describe("resolveSentencaDedupe", () => {
  it("prefers (processoId, pjeDocumentoId) when doc id present", () => {
    expect(resolveSentencaDedupe({ processoId: 7, pjeDocumentoId: "99", tipoDecisao: "CONDENATORIA", dataSentenca: "2026-06-01", demandaOrigemId: 3 }))
      .toEqual({ by: "doc", processoId: 7, pjeDocumentoId: "99" });
  });
  it("falls back to (processoId, tipoDecisao, dataSentenca) when no doc id", () => {
    expect(resolveSentencaDedupe({ processoId: 7, pjeDocumentoId: null, tipoDecisao: "CONDENATORIA", dataSentenca: "2026-06-01", demandaOrigemId: 3 }))
      .toEqual({ by: "tipo_data", processoId: 7, tipoDecisao: "CONDENATORIA", dataSentenca: "2026-06-01" });
  });
  it("falls back to demandaOrigemId when doc id and dataSentenca both null", () => {
    expect(resolveSentencaDedupe({ processoId: 7, pjeDocumentoId: null, tipoDecisao: "CONDENATORIA", dataSentenca: null, demandaOrigemId: 3 }))
      .toEqual({ by: "demanda", demandaOrigemId: 3 });
  });
});
