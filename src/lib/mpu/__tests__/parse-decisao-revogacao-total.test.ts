import { describe, it, expect } from "vitest";
import { parseDecisaoMPU } from "../parse-decisao";

// Sentença real (Antonio Danilo, proc. 8011975-42.2023.8.05.0039) — revogação
// total das MPU por desistência da ofendida, homologada (art. 485, VIII, CPC).
const SENTENCA = `S E N T E N Ç A
Vistos, etc.
Conforme decisão proferida, foram concedidas as medidas protetivas pleiteadas pela vítima.
Certificado pelo cartório que a ofendida informou que não tem interesse na manutenção das medidas protetivas de urgência, indicando em formulário a nota 10 para a sua percepção atual de segurança.
No presente caso, todavia, observo que, apesar da concessão das medidas protetivas, a vítima, em declaração posterior, informou que não tem mais interesse na manutenção das medidas protetivas de urgência.
Considerando a desistência da vítima, e com fulcro no art. 485, VIII, do CPC, HOMOLOGO o referido ato, REVOGANDO as medidas protetivas de urgência, determinando o arquivamento do mesmo, com a devida baixa.`;

describe("parseDecisaoMPU — revogação total", () => {
  const r = parseDecisaoMPU(SENTENCA);

  it("detecta revogação total das MPU", () => {
    expect(r.revogacaoTotal).toBe(true);
    expect(r.medidas).toHaveLength(0); // não concede nada
  });

  it("classifica o motivo como desistência da ofendida", () => {
    expect(r.motivoRevogacao).toMatch(/desist|interesse/i);
  });

  it("captura o trecho verbatim que fundamenta a revogação", () => {
    // Prefere a frase do fundamento (desistência) ou o dispositivo (REVOGANDO).
    expect(r.motivoRevogacaoLiteral).toMatch(/interesse na manuten|REVOGANDO as medidas protetivas/i);
  });

  it("uma concessão pura não dispara revogação total", () => {
    const c = parseDecisaoMPU(
      "DEFIRO as medidas protetivas: a) afastamento do lar; b) proibição de aproximação de 200 metros.",
    );
    expect(c.revogacaoTotal).toBe(false);
    expect(c.motivoRevogacao).toBeNull();
  });
});
