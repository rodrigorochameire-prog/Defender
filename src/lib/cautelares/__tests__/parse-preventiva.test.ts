import { describe, it, expect } from "vitest";
import { parsePreventiva } from "../parse-preventiva";

const DECRETO = `Trata-se de representação pela prisão preventiva. A materialidade do delito está comprovada pelo auto de prisão em flagrante e pelo laudo pericial de fls. 30. Há indícios suficientes de autoria, pois o investigado foi reconhecido pela vítima. DECRETO a PRISÃO PREVENTIVA para garantia da ordem pública, uma vez que o acusado é reincidente e voltou a delinquir poucos dias após ser solto, demonstrando concreta periculosidade. A medida também se justifica para assegurar a aplicação da lei penal, pois o acusado encontra-se em local incerto e não sabido, com risco concreto de fuga. Fundamento a decisão nos artigos 312 e 313 do CPP.`;

describe("parsePreventiva", () => {
  const r = parsePreventiva(DECRETO);

  it("reconhece que é decreto de preventiva", () => {
    expect(r.ehPreventiva).toBe(true);
  });

  it("detecta os requisitos invocados (ordem pública + aplicação da lei penal)", () => {
    const tipos = r.requisitos.map((x) => x.tipo);
    expect(tipos).toContain("ordem_publica");
    expect(tipos).toContain("aplicacao_lei_penal");
  });

  it("NÃO inventa requisito não invocado (ordem econômica)", () => {
    expect(r.requisitos.map((x) => x.tipo)).not.toContain("ordem_economica");
  });

  it("transcreve a fundamentação fática (palavras do juiz) por requisito", () => {
    const op = r.requisitos.find((x) => x.tipo === "ordem_publica");
    expect(op?.presente).toBe(true);
    expect(op?.fundamentacao).toMatch(/reincidente|periculosidade|delinquir/i);
    const alp = r.requisitos.find((x) => x.tipo === "aplicacao_lei_penal");
    expect(alp?.fundamentacao).toMatch(/local incerto|fuga/i);
  });

  it("captura os pressupostos (materialidade + indícios de autoria)", () => {
    expect(r.pressupostos.materialidade).toMatch(/materialidade|laudo|flagrante/i);
    expect(r.pressupostos.indiciosAutoria).toMatch(/indicios|reconhecido/i);
  });

  it("não captura requisito sob negação (ausência de ordem pública)", () => {
    const r2 = parsePreventiva(
      "DECRETO a prisão preventiva por conveniência da instrução criminal. Não vislumbro risco à ordem pública.",
    );
    const tipos = r2.requisitos.map((x) => x.tipo);
    expect(tipos).toContain("instrucao_criminal");
    expect(tipos).not.toContain("ordem_publica");
  });

  it("texto vazio retorna estrutura neutra", () => {
    const r3 = parsePreventiva("");
    expect(r3.ehPreventiva).toBe(false);
    expect(r3.requisitos).toHaveLength(0);
  });
});
