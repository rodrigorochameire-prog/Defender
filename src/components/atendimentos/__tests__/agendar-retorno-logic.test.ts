import { describe, it, expect } from "vitest";
import { DESFECHO_OPTIONS, desfechoRequiresAto } from "../agendar-retorno-logic";

describe("DESFECHO_OPTIONS — desfechos do atendimento", () => {
  it("ordem fixa: nenhuma · demanda · orientacao", () => {
    expect(DESFECHO_OPTIONS.map((o) => o.value)).toEqual(["nenhuma", "demanda", "orientacao"]);
  });

  it("rótulos e dicas batem com a spec", () => {
    const byValue = Object.fromEntries(DESFECHO_OPTIONS.map((o) => [o.value, o]));
    expect(byValue.nenhuma.label).toBe("Só atendimento");
    expect(byValue.demanda.label).toBe("Gerar demanda");
    expect(byValue.orientacao.label).toBe("Atendimento e orientação");
    expect(byValue.demanda.hint).toBe("há providência a fazer");
  });

  it("só 'demanda' exige ato a praticar", () => {
    const exigem = DESFECHO_OPTIONS.filter((o) => o.requiresAto).map((o) => o.value);
    expect(exigem).toEqual(["demanda"]);
  });
});

describe("desfechoRequiresAto", () => {
  it("true só para demanda", () => {
    expect(desfechoRequiresAto("demanda")).toBe(true);
    expect(desfechoRequiresAto("nenhuma")).toBe(false);
    expect(desfechoRequiresAto("orientacao")).toBe(false);
  });
});
