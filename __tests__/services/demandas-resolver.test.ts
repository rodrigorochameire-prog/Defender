import { describe, it, expect } from "vitest";
import {
  decideAction,
  atosCompativeis,
  type DemandaInput,
  type AtivaSnapshot,
} from "@/lib/services/demandas-resolver";

const baseInput: DemandaInput = {
  processoId: 1,
  assistidoId: 1,
  ato: "Ciência",
  origem: "planilha_apps_script",
};

const aberta = (overrides: Partial<AtivaSnapshot> = {}): AtivaSnapshot => ({
  id: 100,
  status: "2_ATENDER",
  ato: "Ciência",
  pjeDocumentoId: null,
  providencias: null,
  enrichmentData: null,
  ...overrides,
});

describe("atosCompativeis", () => {
  it("igual é compatível", () =>
    expect(atosCompativeis("Ciência", "Ciência")).toBe(true));

  it("refinamento por substring é compatível", () =>
    expect(atosCompativeis("Ciência", "Ciência de decisão")).toBe(true));

  it("primeira palavra igual é compatível", () =>
    expect(atosCompativeis("Ciência decisão", "Ciência acórdão")).toBe(true));

  it("vazio em qualquer lado é compatível", () => {
    expect(atosCompativeis("", "Ciência")).toBe(true);
    expect(atosCompativeis("Ciência", null)).toBe(true);
  });

  it("atos distintos não são compatíveis", () =>
    expect(atosCompativeis("Ciência", "Resposta à Acusação")).toBe(false));

  it("acentos e maiúsculas são ignorados", () =>
    expect(atosCompativeis("Ciencia", "ciência")).toBe(true));

  it("Relaxamento da prisão NÃO é refinamento de Ciência", () =>
    expect(atosCompativeis("Ciência", "Relaxamento da prisão")).toBe(false));
});

describe("decideAction", () => {
  it("regra 1: PJe match → UPDATE", () => {
    const decision = decideAction(
      { ...baseInput, pjeDocumentoId: "DOC123", origem: "pje" },
      [aberta({ pjeDocumentoId: "DOC123" })],
    );
    expect(decision).toEqual({
      action: "update",
      targetId: 100,
      reason: "pje_documento_id_match",
    });
  });

  it("regra 2: PJe novo → CREATE mesmo com outras ativas no processo", () => {
    const decision = decideAction(
      { ...baseInput, pjeDocumentoId: "DOC456", origem: "pje" },
      [aberta({ pjeDocumentoId: "DOC123" })],
    );
    expect(decision.action).toBe("create");
  });

  it("regra 3: sem PJe + sem ativas → CREATE", () => {
    const decision = decideAction(baseInput, []);
    expect(decision.action).toBe("create");
    if (decision.action === "create") expect(decision.reason).toBe("sem_demanda_ativa");
  });

  it("regra 4: sem PJe + todas fechadas → CREATE", () => {
    const decision = decideAction(baseInput, [
      aberta({ status: "CONCLUIDO" }),
      aberta({ id: 101, status: "7_PROTOCOLADO" }),
      aberta({ id: 102, status: "7_CIENCIA" }),
    ]);
    expect(decision.action).toBe("create");
    if (decision.action === "create") expect(decision.reason).toBe("todas_demandas_fechadas");
  });

  it("regra 5: aberta + ato compatível → UPDATE", () => {
    const decision = decideAction(
      { ...baseInput, ato: "Ciência de decisão" },
      [aberta({ ato: "Ciência" })],
    );
    expect(decision.action).toBe("update");
    if (decision.action === "update") expect(decision.targetId).toBe(100);
  });

  it("regra 6: aberta + ato incompatível → CREATE_FLAGGED", () => {
    const decision = decideAction(
      { ...baseInput, ato: "Resposta à Acusação" },
      [aberta({ ato: "Ciência" })],
    );
    expect(decision.action).toBe("create_flagged");
  });

  it("4_MONITORAR conta como aberto (regra 6 dispara)", () => {
    const decision = decideAction(
      { ...baseInput, ato: "Resposta à Acusação" },
      [aberta({ status: "4_MONITORAR", ato: "Ciência" })],
    );
    expect(decision.action).toBe("create_flagged");
  });

  it("URGENTE conta como aberto", () => {
    const decision = decideAction(
      { ...baseInput, ato: "Ciência" },
      [aberta({ status: "URGENTE", ato: "Ciência" })],
    );
    expect(decision.action).toBe("update");
  });

  it("múltiplas abertas: pega a mais recente (id maior)", () => {
    const decision = decideAction(
      { ...baseInput, ato: "Ciência de decisão" },
      [
        aberta({ id: 50, ato: "Outro" }),
        aberta({ id: 200, ato: "Ciência" }),
        aberta({ id: 100, ato: "Algo" }),
      ],
    );
    expect(decision.action).toBe("update");
    if (decision.action === "update") expect(decision.targetId).toBe(200);
  });

  it("PJe match prevalece mesmo se ato for incompatível com aberta", () => {
    const decision = decideAction(
      { ...baseInput, pjeDocumentoId: "DOC1", ato: "Resposta", origem: "pje" },
      [
        aberta({ id: 1, pjeDocumentoId: "DOC1", ato: "Ciência" }),
        aberta({ id: 2, ato: "Outro" }),
      ],
    );
    expect(decision.action).toBe("update");
    if (decision.action === "update") expect(decision.targetId).toBe(1);
  });
});
