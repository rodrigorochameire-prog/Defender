import { describe, it, expect } from "vitest";
import { ausencias, ausenciaTipoEnum, ausenciaSituacaoEnum, vfTipoEventoEnum } from "@/lib/db/schema";

describe("ausencias schema", () => {
  it("exports the table and the two enums", () => {
    expect(ausencias).toBeDefined();
    expect(ausenciaTipoEnum.enumValues).toEqual(["licenca", "outra_ausencia"]);
    expect(ausenciaSituacaoEnum.enumValues).toEqual(["solicitada","deferida","gozada","indeferida","cancelada"]);
  });
  it("vf_tipo_evento now includes OUTRA_AUSENCIA", () => {
    expect(vfTipoEventoEnum.enumValues).toContain("OUTRA_AUSENCIA");
  });
});
