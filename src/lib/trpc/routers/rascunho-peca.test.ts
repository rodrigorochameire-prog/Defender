import { describe, it, expect } from "vitest";
import { PECA_SUGERIDA_TO_REFERENCE, refParaAtribuicao, isElegivelRascunho, buildRascunhoTaskMeta } from "./rascunho-peca";

describe("refParaAtribuicao", () => {
  it("memoriais VVD → vvd_alegacoes_finais", () => expect(refParaAtribuicao("memoriais","VVD_CAMACARI")).toBe("vvd_alegacoes_finais"));
  it("memoriais Júri → alegacoes_finais_juri", () => expect(refParaAtribuicao("memoriais","JURI_CAMACARI")).toBe("alegacoes_finais_juri"));
  it("resposta_acusacao Júri → null (sem RA no júri)", () => expect(refParaAtribuicao("resposta_acusacao","JURI_CAMACARI")).toBeNull());
  it("peça desconhecida → null", () => expect(refParaAtribuicao("xpto","VVD_CAMACARI")).toBeNull());
});
describe("isElegivelRascunho", () => {
  it("concluida + memoriais + VVD → ok", () => expect(isElegivelRascunho({statusAnalise:"concluida",pecaSugerida:"memoriais",atribuicao:"VVD_CAMACARI"})).toEqual({ok:true}));
  it("análise não concluída → rejeita", () => expect(isElegivelRascunho({statusAnalise:"analisando",pecaSugerida:"memoriais",atribuicao:"VVD_CAMACARI"}).ok).toBe(false));
  it("EP → rejeita (fora do MVP)", () => expect(isElegivelRascunho({statusAnalise:"concluida",pecaSugerida:"manifestacao_ep",atribuicao:"EXECUCAO_PENAL"}).ok).toBe(false));
  it("peça não mapeável p/ atribuição → rejeita", () => expect(isElegivelRascunho({statusAnalise:"concluida",pecaSugerida:"resposta_acusacao",atribuicao:"JURI_CAMACARI"}).ok).toBe(false));
});
describe("buildRascunhoTaskMeta", () => {
  it("serializa com linhasMestras", () => expect(JSON.parse(buildRascunhoTaskMeta({demandaId:1,pecaSugerida:"memoriais",atribuicao:"VVD_CAMACARI",linhasMestras:"foco na atipicidade"}))).toEqual({demandaId:1,pecaSugerida:"memoriais",atribuicao:"VVD_CAMACARI",linhasMestras:"foco na atipicidade",fonte:"fase2c2b"}));
});
