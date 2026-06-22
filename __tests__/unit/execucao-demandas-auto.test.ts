import { describe, it, expect } from "vitest";
import { montarDemandasDeExecucao } from "@/lib/execucao/demandas-auto";
import type { PrescricaoExecutoriaResult } from "@/lib/execucao/prescricao";
import type { BeneficioFlag } from "@/lib/execucao/flags-beneficios";

const HOJE = new Date("2026-06-22T12:00:00");

const prescricaoRed: PrescricaoExecutoriaResult = {
  penaResidualDias: 700,
  prazoPrescricionalDias: 1095,
  diasDecorridos: 1050,
  diasParaPrescricao: 45,
  iminente: true,
  nivel: "red",
  motivo: "Prescrição executória em ~45 dias",
};

describe("montarDemandasDeExecucao", () => {
  it("vazio quando não há flags", () => {
    expect(
      montarDemandasDeExecucao({ situacao: "preso", prescricao: null, beneficios: [], hoje: HOJE }),
    ).toEqual([]);
  });

  it("prescrição red → demanda URGENTE com prazo na data da prescrição", () => {
    const d = montarDemandasDeExecucao({
      situacao: "preso",
      prescricao: prescricaoRed,
      beneficios: [],
      hoje: HOJE,
    });
    expect(d).toHaveLength(1);
    expect(d[0].tipoAto).toBe("exec:prescricao");
    expect(d[0].status).toBe("URGENTE");
    expect(d[0].prioridade).toBe("URGENTE");
    expect(d[0].reuPreso).toBe(true);
    // prazo = hoje + 45 dias
    expect(d[0].prazo).toBe(new Date(HOJE.getTime() + 45 * 86400000).toISOString().slice(0, 10));
  });

  it("prescrição consumada (dias negativos) → prazo hoje", () => {
    const d = montarDemandasDeExecucao({
      situacao: "preso",
      prescricao: { ...prescricaoRed, diasParaPrescricao: -30 },
      beneficios: [],
      hoje: HOJE,
    });
    expect(d[0].prazo).toBe(HOJE.toISOString().slice(0, 10));
  });

  it("cada benefício vira uma demanda com tipoAto estável", () => {
    const beneficios: BeneficioFlag[] = [
      { tipo: "risco-regressao-cadastral", nivel: "red", motivo: "Cadastro sem confirmação há 150 dias" },
      { tipo: "saida-temporaria", nivel: "emerald", motivo: "Saída temporária possível" },
      { tipo: "livramento-condicional", nivel: "emerald", motivo: "Livramento condicional possível" },
    ];
    const d = montarDemandasDeExecucao({ situacao: "semiaberto", prescricao: null, beneficios, hoje: HOJE });
    const tipos = d.map((x) => x.tipoAto);
    expect(tipos).toEqual(["exec:regressao", "exec:saida", "exec:livramento"]);
    // oportunidades entram como NORMAL, risco cadastral como ALTA
    expect(d.find((x) => x.tipoAto === "exec:saida")!.prioridade).toBe("NORMAL");
    expect(d.find((x) => x.tipoAto === "exec:regressao")!.prioridade).toBe("ALTA");
  });

  it("inclui o motivo do flag no texto do ato", () => {
    const d = montarDemandasDeExecucao({
      situacao: "preso",
      prescricao: prescricaoRed,
      beneficios: [],
      hoje: HOJE,
    });
    expect(d[0].ato).toContain("Prescrição executória");
    expect(d[0].ato).toContain(prescricaoRed.motivo);
  });
});
