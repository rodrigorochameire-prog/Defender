import { describe, it, expect } from "vitest";
import {
  demandaEventos, atendimentoDemandas,
  DEMANDA_EVENTO_TIPOS, DILIGENCIA_SUBTIPOS, DILIGENCIA_STATUS,
} from "@/lib/db/schema/demanda-eventos";

describe("demanda_eventos schema", () => {
  it("expõe os 3 tipos", () => {
    expect(DEMANDA_EVENTO_TIPOS).toEqual(["atendimento","diligencia","observacao"]);
  });
  it("expõe 6 subtipos de diligência", () => {
    expect(DILIGENCIA_SUBTIPOS).toHaveLength(6);
  });
  it("expõe 3 status de diligência", () => {
    expect(DILIGENCIA_STATUS).toEqual(["pendente","feita","cancelada"]);
  });
  it("table demandaEventos tem coluna demandaId", () => {
    expect(demandaEventos.demandaId).toBeDefined();
  });
  it("atendimentoDemandas tem PK composta (ambos definidos)", () => {
    expect(atendimentoDemandas.atendimentoId).toBeDefined();
    expect(atendimentoDemandas.demandaId).toBeDefined();
  });
});
