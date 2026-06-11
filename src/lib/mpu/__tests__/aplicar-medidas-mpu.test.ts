import { describe, it, expect } from "vitest";
import { descreverModulacao, planejarMergeMedidas, resumirParaProcessoVVD } from "../aplicar-medidas-mpu";
import { parseDecisaoMPU } from "../parse-decisao";

const DECISAO = `DEFIRO em favor de MARIA cumpra JOAO: a) afastamento do lar; b) proibição de aproximação, mínimo de 300 metros da ofendida. Pelo prazo de 180 dias.`;

describe("resumirParaProcessoVVD", () => {
  it("deriva os campos da esteira a partir do parse", () => {
    const parsed = parseDecisaoMPU(DECISAO);
    const res = resumirParaProcessoVVD(parsed, "2026-06-01");
    expect(res.mpuAtiva).toBe(true);
    expect(res.faseProcedimento).toBe("decisao_liminar");
    expect(res.motivoUltimaIntimacao).toBe("ciencia_decisao_mpu");
    expect(res.distanciaMinima).toBe(300);
    expect(res.prazoMpuDias).toBe(180);
    expect(res.dataDecisaoMPU).toBe("2026-06-01");
    expect(res.dataVencimentoMPU).toBe("2026-11-28"); // 2026-06-01 + 180 dias
  });
});

describe("planejarMergeMedidas — ajuste posterior não apaga medidas anteriores", () => {
  const existentes = [
    { id: 1, codigo: "PROIBICAO_APROXIMACAO", origem: "parser", status: "ativa" },
    { id: 2, codigo: "PROIBICAO_CONTATO", origem: "parser", status: "ativa" },
    { id: 3, codigo: "PROIBICAO_FREQUENTAR", origem: "parser", status: "ativa" },
  ];

  it("reconsideração que adiciona medidas: insere as novas e preserva as anteriores", () => {
    const parsed = parseDecisaoMPU(
      "RECONSIDERO PARCIALMENTE a decisão para determinar: a) o AFASTAMENTO IMEDIATO do agressor do imóvel de convivência com a vítima; b) a RECONDUÇÃO DA VÍTIMA AO LAR.",
    );
    const plano = planejarMergeMedidas(existentes, parsed);
    expect(plano.inserir.map((m) => m.codigo).sort()).toEqual(
      ["AFASTAMENTO_LAR", "RECONDUCAO_VITIMA"].sort(),
    );
    expect(plano.atualizar).toEqual([]);
    expect(plano.revogarIds).toEqual([]);
  });

  it("reimportação da mesma decisão: atualiza por código, não duplica", () => {
    const parsed = parseDecisaoMPU(
      "DEFIRO: a) proibição de aproximação, distância mínima de 300 metros; b) proibição de contato; c) proibição de frequentar o local de trabalho da vítima.",
    );
    const plano = planejarMergeMedidas(existentes, parsed);
    expect(plano.inserir).toEqual([]);
    expect(plano.atualizar.map((a) => a.id).sort()).toEqual([1, 2, 3]);
    const aprox = plano.atualizar.find((a) => a.id === 1);
    expect(aprox?.medida.distanciaMetros).toBe(300);
  });

  it("revogação parcial: marca a medida existente, sem tocar nas demais", () => {
    const parsed = parseDecisaoMPU("Revogo a proibição de contato com a ofendida.");
    const plano = planejarMergeMedidas(existentes, parsed);
    expect(plano.inserir).toEqual([]);
    expect(plano.atualizar).toEqual([]);
    expect(plano.revogarIds).toEqual([2]);
  });

  it("medida manual com mesmo código: não duplica nem sobrescreve (manual vence)", () => {
    const comManual = [
      { id: 9, codigo: "AFASTAMENTO_LAR", origem: "manual", status: "ativa" },
    ];
    const parsed = parseDecisaoMPU("DEFIRO o afastamento do lar do agressor.");
    const plano = planejarMergeMedidas(comManual, parsed);
    expect(plano.inserir).toEqual([]);
    expect(plano.atualizar).toEqual([]);
  });
});

describe("modulação de medida existente — observação anterior → nova", () => {
  const aproximacao200 = {
    id: 1,
    codigo: "PROIBICAO_APROXIMACAO",
    origem: "parser",
    status: "ativa",
    distanciaMetros: 200,
    parametros: { protegidos: ["ofendida"] },
    literal: "distância mínima de 200 metros",
  };

  it("descreverModulacao detecta mudança de distância e de protegidos", () => {
    const parsed = parseDecisaoMPU(
      "DEFIRO a ampliação: proibição de aproximação da ofendida e de seus familiares, distância mínima de 300 metros.",
    );
    const desc = descreverModulacao(aproximacao200, parsed.medidas[0]);
    expect(desc).toContain("200 m → 300 m");
    expect(desc).toContain("familiares");
  });

  it("reimportação idêntica não gera observação (null)", () => {
    const parsed = parseDecisaoMPU(
      "DEFIRO: proibição de aproximação da ofendida, distância mínima de 200 metros.",
    );
    expect(descreverModulacao(aproximacao200, parsed.medidas[0])).toBeNull();
  });

  it("plano de merge carrega a modulação na atualização", () => {
    const parsed = parseDecisaoMPU(
      "DEFIRO a ampliação do perímetro: proibição de aproximação da ofendida, distância mínima de 500 metros.",
    );
    const plano = planejarMergeMedidas([aproximacao200], parsed);
    expect(plano.atualizar).toHaveLength(1);
    expect(plano.atualizar[0].alteracao).toContain("200 m → 500 m");
  });

  it("atualização sem mudança material vem com alteracao null", () => {
    const parsed = parseDecisaoMPU(
      "DEFIRO: proibição de aproximação da ofendida, distância mínima de 200 metros.",
    );
    const plano = planejarMergeMedidas([aproximacao200], parsed);
    expect(plano.atualizar[0].alteracao).toBeNull();
  });
});
