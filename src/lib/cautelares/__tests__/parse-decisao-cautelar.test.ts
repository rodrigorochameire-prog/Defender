import { describe, it, expect } from "vitest";
import { parseDecisaoCautelar } from "../parse-decisao-cautelar";
import { CAUTELAR } from "../cautelares-taxonomia";

const codigos = (t: string) => parseDecisaoCautelar(t).cautelares.map((c) => c.codigo);

describe("parseDecisaoCautelar — prisão", () => {
  it("detecta prisão preventiva decretada", () => {
    const r = parseDecisaoCautelar(
      "Ante o exposto, DECRETO a PRISÃO PREVENTIVA do investigado, com fundamento nos artigos 312 e 313 do CPP.",
    );
    expect(r.temCautelar).toBe(true);
    expect(r.cautelares.map((c) => c.codigo)).toContain(CAUTELAR.PRISAO_PREVENTIVA);
    expect(r.cautelares.find((c) => c.codigo === CAUTELAR.PRISAO_PREVENTIVA)?.especie).toBe("prisao");
    expect(r.fundamentos).toContain("art. 312 CPP");
  });

  it("detecta conversão de flagrante em preventiva", () => {
    expect(codigos("CONVERTO a prisão em flagrante em PRISÃO PREVENTIVA.")).toContain(
      CAUTELAR.PRISAO_PREVENTIVA,
    );
  });

  it("detecta prisão domiciliar antes de confundir com recolhimento noturno", () => {
    expect(codigos("Substituo a preventiva por PRISÃO DOMICILIAR.")).toContain(
      CAUTELAR.PRISAO_DOMICILIAR,
    );
  });
});

describe("parseDecisaoCautelar — diversas da prisão (art. 319)", () => {
  it("detecta cautelares diversas em lista de incisos", () => {
    const decisao = `Concedo liberdade provisória mediante a aplicação das seguintes medidas cautelares diversas da prisão, na forma do art. 319 do CPP:
I - comparecimento periódico mensal em juízo para informar e justificar atividades;
II - proibição de acesso ou frequência a determinados lugares (bares e casas noturnas);
III - proibição de manter contato com a vítima e testemunhas;
IV - proibição de ausentar-se da comarca sem autorização;
IX - monitoração eletrônica.`;
    const cs = codigos(decisao);
    expect(cs).toContain(CAUTELAR.COMPARECIMENTO_PERIODICO);
    expect(cs).toContain(CAUTELAR.PROIBICAO_ACESSO_LUGARES);
    expect(cs).toContain(CAUTELAR.PROIBICAO_CONTATO);
    expect(cs).toContain(CAUTELAR.PROIBICAO_AUSENTAR_COMARCA);
    expect(cs).toContain(CAUTELAR.MONITORACAO_ELETRONICA);
  });

  it("enriquece comparecimento com periodicidade", () => {
    const r = parseDecisaoCautelar("Determino o comparecimento periódico mensal em juízo.");
    const c = r.cautelares.find((x) => x.codigo === CAUTELAR.COMPARECIMENTO_PERIODICO);
    expect(c?.periodicidade).toBe("mensal");
  });

  it("enriquece fiança com valor", () => {
    const r = parseDecisaoCautelar("Arbitro FIANÇA no valor de R$ 2.500,00 para a liberdade.");
    const c = r.cautelares.find((x) => x.codigo === CAUTELAR.FIANCA);
    expect(c?.valorFianca).toBe("R$ 2.500,00");
  });

  it("detecta recolhimento noturno", () => {
    expect(codigos("Imponho recolhimento domiciliar no período noturno e nos dias de folga.")).toContain(
      CAUTELAR.RECOLHIMENTO_NOTURNO,
    );
  });
});

describe("parseDecisaoCautelar — polaridade", () => {
  it("NÃO captura cautelar indeferida (falso-negativo seguro)", () => {
    const r = parseDecisaoCautelar(
      "INDEFIRO o pedido de prisão preventiva, por ausência dos requisitos do art. 312.",
    );
    expect(r.cautelares.map((c) => c.codigo)).not.toContain(CAUTELAR.PRISAO_PREVENTIVA);
  });

  it("separa defere de indefere na mesma decisão", () => {
    const r = parseDecisaoCautelar(
      "DEFIRO a monitoração eletrônica. INDEFIRO a prisão preventiva.",
    );
    const cs = r.cautelares.map((c) => c.codigo);
    expect(cs).toContain(CAUTELAR.MONITORACAO_ELETRONICA);
    expect(cs).not.toContain(CAUTELAR.PRISAO_PREVENTIVA);
  });

  it("expõe cautelar revogada/relaxada em `revogadas`, não em `cautelares`", () => {
    const r = parseDecisaoCautelar(
      "REVOGO a monitoração eletrônica anteriormente imposta, expedindo-se o competente alvará.",
    );
    expect(r.revogadas).toContain(CAUTELAR.MONITORACAO_ELETRONICA);
    expect(r.cautelares.map((c) => c.codigo)).not.toContain(CAUTELAR.MONITORACAO_ELETRONICA);
  });

  it("texto vazio retorna estrutura neutra", () => {
    const r = parseDecisaoCautelar("");
    expect(r.temCautelar).toBe(false);
    expect(r.cautelares).toHaveLength(0);
  });
});
