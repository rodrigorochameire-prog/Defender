import { describe, it, expect } from "vitest";
import { tipoToCluster, isMarco } from "@/lib/vida-funcional/tipo-cluster";

describe("tipoToCluster", () => {
  it("mapeia tipos de progressão", () => {
    expect(tipoToCluster("POSSE")).toBe("progressao");
    expect(tipoToCluster("PROMOCAO")).toBe("progressao");
    expect(tipoToCluster("ACUMULO")).toBe("progressao");
  });
  it("mapeia ausências", () => {
    expect(tipoToCluster("FERIAS")).toBe("ausencias");
    expect(tipoToCluster("CONVOCACAO")).toBe("ausencias");
  });
  it("mapeia contraprestação", () => {
    expect(tipoToCluster("FOLGA")).toBe("contraprestacao");
    expect(tipoToCluster("REEMBOLSO")).toBe("contraprestacao");
  });
  it("mapeia administrativo", () => {
    expect(tipoToCluster("SOLICITACAO_ADM")).toBe("administrativo");
  });
});

describe("isMarco", () => {
  it("marcos da trajetória são verdadeiros", () => {
    expect(isMarco("POSSE")).toBe(true);
    expect(isMarco("PROMOCAO")).toBe(true);
    expect(isMarco("CONVOCACAO")).toBe(true);
  });
  it("operacionais não são marcos", () => {
    expect(isMarco("FOLGA")).toBe(false);
    expect(isMarco("REEMBOLSO")).toBe(false);
    expect(isMarco("SOLICITACAO_ADM")).toBe(false);
  });
});
