import { describe, it, expect } from "vitest";
import { parseDecisaoMPU } from "../parse-decisao";

const DECISAO_CACIA = `Pelo exposto, com fundamento nos artigos 19, 20 e 22 da Lei nº 11.340/2006, DEFIRO o pedido de Medidas Protetivas de Urgência em favor de CACIA SANTOS DE CARVALHO e, por consequência, determino que ADALBERTO MACHADO DE LIMA cumpra, imediatamente, as seguintes obrigações:

a) AFASTAMENTO DO LAR, domicílio ou local de convivência com a ofendida, devendo retirar do imóvel apenas seus bens de uso estritamente pessoal, sob acompanhamento policial, se necessário;

b) PROIBIÇÃO DE APROXIMAÇÃO da ofendida, de seus familiares e das testemunhas, fixando o limite mínimo de 300 (trezentos) metros de distância entre estes e o agressor;

c) PROIBIÇÃO DE CONTATO com a ofendida, seus familiares e testemunhas, por qualquer meio de comunicação, seja por telefone, e-mail, redes sociais, aplicativos de mensagens ou por interposta pessoa;

d) PROIBIÇÃO DE FREQUENTAR o local de residência e o local de trabalho da vítima, a fim de preservar a integridade física e psicológica da ofendida.`;

describe("parseDecisaoMPU — decisão Cacia (4 medidas)", () => {
  const r = parseDecisaoMPU(DECISAO_CACIA);

  it("extrai partes e fundamentos", () => {
    expect(r.ofendida).toBe("CACIA SANTOS DE CARVALHO");
    expect(r.agressor).toBe("ADALBERTO MACHADO DE LIMA");
    expect(r.fundamentos).toEqual(
      expect.arrayContaining(["art. 19", "art. 20", "art. 22"]),
    );
    expect(r.prazoDias).toBeNull();
  });

  it("identifica as 4 medidas pelos códigos", () => {
    expect(r.medidas.map((m) => m.codigo).sort()).toEqual(
      [
        "AFASTAMENTO_LAR",
        "PROIBICAO_APROXIMACAO",
        "PROIBICAO_CONTATO",
        "PROIBICAO_FREQUENTAR",
      ].sort(),
    );
  });

  it("extrai distância de 300m na aproximação", () => {
    const aprox = r.medidas.find((m) => m.codigo === "PROIBICAO_APROXIMACAO");
    expect(aprox?.distanciaMetros).toBe(300);
    expect(aprox?.protegidos).toEqual(
      expect.arrayContaining(["ofendida", "familiares", "testemunhas"]),
    );
  });

  it("extrai meios de contato vedados", () => {
    const contato = r.medidas.find((m) => m.codigo === "PROIBICAO_CONTATO");
    expect(contato?.meios).toEqual(
      expect.arrayContaining([
        "telefone",
        "email",
        "redes_sociais",
        "mensagens",
        "interposta_pessoa",
      ]),
    );
  });

  it("extrai lugares vedados", () => {
    const freq = r.medidas.find((m) => m.codigo === "PROIBICAO_FREQUENTAR");
    expect(freq?.lugares).toEqual(
      expect.arrayContaining(["residencia_vitima", "trabalho_vitima"]),
    );
  });
});

describe("parseDecisaoMPU — variações", () => {
  it("incisos romanos (I - II -)", () => {
    const t = `DEFIRO as medidas: I - afastamento do lar; II - proibição de aproximação, distância de 200 metros da ofendida.`;
    const r = parseDecisaoMPU(t);
    expect(r.medidas.map((m) => m.codigo).sort()).toEqual(
      ["AFASTAMENTO_LAR", "PROIBICAO_APROXIMACAO"].sort(),
    );
    expect(r.medidas.find((m) => m.codigo === "PROIBICAO_APROXIMACAO")?.distanciaMetros).toBe(200);
  });

  it("texto corrido (sem enumeração)", () => {
    const t = `Defiro a proibição de contato com a vítima por telefone e a proibição de frequentar o seu local de trabalho.`;
    const r = parseDecisaoMPU(t);
    expect(r.medidas.map((m) => m.codigo).sort()).toEqual(
      ["PROIBICAO_CONTATO", "PROIBICAO_FREQUENTAR"].sort(),
    );
  });

  it("captura prazo em dias", () => {
    const t = `Defiro o afastamento do lar pelo prazo de 90 (noventa) dias.`;
    expect(parseDecisaoMPU(t).prazoDias).toBe(90);
  });

  it("tornozeleira + suspensão de porte", () => {
    const t = `Determino a monitoração eletrônica (tornozeleira) e a suspensão do porte de arma de fogo do requerido.`;
    const r = parseDecisaoMPU(t);
    expect(r.medidas.map((m) => m.codigo).sort()).toEqual(
      ["MONITORACAO_ELETRONICA", "SUSPENSAO_PORTE_ARMA"].sort(),
    );
  });

  it("não inventa medidas em texto sem nenhuma", () => {
    const t = `Indefiro o pedido por ausência de elementos. Arquive-se.`;
    expect(parseDecisaoMPU(t).medidas).toEqual([]);
  });
});
