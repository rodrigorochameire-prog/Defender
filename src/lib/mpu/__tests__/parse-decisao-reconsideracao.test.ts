import { describe, it, expect } from "vitest";
import { parseDecisaoMPU } from "../parse-decisao";

// Caso real Roberto de Jesus Mateus (proc. 8010592-24.2026.8.05.0039):
// deferimento original (registro 463) + reconsideração parcial (registro 464).

const DECISAO_ORIGINAL = `Ante o exposto, DEFIRO o pedido para conceder as seguintes medidas protetivas de urgência em desfavor de Roberto de Jesus Mateus:

I. Proibição de se aproximar da vítima, de seus familiares e testemunhas, mantendo distância mínima de 200 (duzentos) metros, podendo tal perímetro ser ampliado conforme necessário;

II. Proibição de contato com a vítima, seus familiares e testemunhas por qualquer meio, incluindo telefone, redes sociais, correio eletrônico, mensagens de texto ou qualquer outra forma de comunicação;

III. Proibição de frequentar os mesmos espaços de convivência da vítima, particularmente seu local de trabalho;`;

const DECISAO_RECONSIDERACAO = `Ante o exposto, com fundamento nos artigos 19, 22 e 23 da Lei nº 11.340/06, RECONSIDERO PARCIALMENTE a decisão de ID 554845932 para, acolhendo o pedido formulado no ID 554845659 (fl. 3), determinar:

a) o AFASTAMENTO IMEDIATO do agressor ROBERTO DE JESUS MATEUS do imóvel localizado na Tv Radial C, sn, Parque Satélite, Camaçari/BA, ou qualquer outro local de convivência com a vítima, ficando-lhe facultada apenas a retirada de pertences de uso pessoal e documentos;

b) a RECONDUÇÃO DA VÍTIMA D.S.P. AO LAR, assegurando-lhe o direito de retornar ao domicílio comum, caso ainda seja do seu interesse, ou de retirar todos os seus pertences pessoais e de seus dependentes com segurança.`;

describe("parseDecisaoMPU — deferimento com incisos 'I.' (ponto, sem travessão)", () => {
  const r = parseDecisaoMPU(DECISAO_ORIGINAL);

  it("identifica as 3 medidas", () => {
    expect(r.medidas.map((m) => m.codigo).sort()).toEqual(
      ["PROIBICAO_APROXIMACAO", "PROIBICAO_CONTATO", "PROIBICAO_FREQUENTAR"].sort(),
    );
  });

  it("extrai distância de 200m", () => {
    const aprox = r.medidas.find((m) => m.codigo === "PROIBICAO_APROXIMACAO");
    expect(aprox?.distanciaMetros).toBe(200);
  });
});

describe("parseDecisaoMPU — reconsideração parcial ('para ... determinar:')", () => {
  const r = parseDecisaoMPU(DECISAO_RECONSIDERACAO);

  it("detecta afastamento do imóvel (variação de 'do lar') e recondução da vítima (art. 23, II)", () => {
    expect(r.medidas.map((m) => m.codigo).sort()).toEqual(
      ["AFASTAMENTO_LAR", "RECONDUCAO_VITIMA"].sort(),
    );
  });

  it("nada revogado nesta decisão", () => {
    expect(r.medidasRevogadas).toEqual([]);
  });

  it("fundamentos incluem art. 23", () => {
    expect(r.fundamentos).toEqual(
      expect.arrayContaining(["art. 19", "art. 22", "art. 23"]),
    );
  });
});

describe("parseDecisaoMPU — revogação parcial", () => {
  it("clausula revogada vai para medidasRevogadas, mantida segue deferida", () => {
    const r = parseDecisaoMPU(
      "REVOGO a proibição de contato com a ofendida. Mantenho o afastamento do lar anteriormente deferido.",
    );
    expect(r.medidasRevogadas).toEqual(["PROIBICAO_CONTATO"]);
    expect(r.medidas.map((m) => m.codigo)).toEqual(["AFASTAMENTO_LAR"]);
  });

  it("revogação nunca vira concessão (falso-negativo seguro)", () => {
    const r = parseDecisaoMPU("Revogo a medida de proibição de aproximação da vítima.");
    expect(r.medidas).toEqual([]);
    expect(r.medidasRevogadas).toEqual(["PROIBICAO_APROXIMACAO"]);
  });
});
