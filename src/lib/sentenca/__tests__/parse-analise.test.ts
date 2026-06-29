import { describe, it, expect } from "vitest";
import { parseAnaliseSentenca } from "../parse-analise";

const minimal = {
  tipoDecisao: "CONDENATORIA",
  resultado: "Condenação", dispositivoResumo: "...", crimesImputados: [],
  crimesCondenados: [], crimesAbsolvidos: [], pena: null, dosimetria: null,
  tesesDefensivas: { acolhidas: [], rejeitadas: [] }, provasValoradas: [],
  fundamentosChave: [], precedentesCitados: [], juizProlator: "Fulano",
  recurso: { prazoRecursal: null, recursoCabivel: null, fundamentoRecurso: null },
  flagsAlerta: [], impactoParaDefesa: "", recomendacaoProxPasso: "", confidence: "alta",
};

describe("parseAnaliseSentenca", () => {
  it("parses direct JSON", () => {
    expect(parseAnaliseSentenca(JSON.stringify(minimal))?.resultado).toBe("Condenação");
  });
  it("parses fenced ```json blocks", () => {
    expect(parseAnaliseSentenca("prose\n```json\n" + JSON.stringify(minimal) + "\n```\n")?.juizProlator).toBe("Fulano");
  });
  it("parses brace-sliced output with leading/trailing prose", () => {
    expect(parseAnaliseSentenca("Here:\n" + JSON.stringify(minimal) + "\nDone.")?.confidence).toBe("alta");
  });
  it("returns null on garbage", () => {
    expect(parseAnaliseSentenca("no json here")).toBeNull();
  });
  it("returns null when required keys are missing", () => {
    expect(parseAnaliseSentenca(JSON.stringify({ foo: 1 }))).toBeNull();
  });
});
