import { describe, it, expect } from "vitest";
import {
  tipoEfetivo,
  rankPrincipalidade,
  sequencialCNJ,
  agruparProcessos,
  atribuicaoCasoDoProcesso,
  validarCasos,
  type ProcessoSeed,
  type CasoComProcessos,
} from "../agrupamento";

/** Helper: semente de processo com defaults sensatos. */
function proc(p: Partial<ProcessoSeed> & { id: number }): ProcessoSeed {
  return {
    numeroAutos: null,
    tipoProcesso: "AP",
    classeProcessual: null,
    processoOrigemId: null,
    comarca: "Camaçari",
    parteContraria: null,
    area: "CRIMINAL",
    atribuicao: "SUBSTITUICAO",
    isJuri: false,
    casoId: null,
    ...p,
  };
}

describe("tipoEfetivo", () => {
  it("respeita sigla explícita não-default", () => {
    expect(tipoEfetivo({ tipoProcesso: "HC", classeProcessual: null })).toBe("HC");
    expect(tipoEfetivo({ tipoProcesso: "IP", classeProcessual: null })).toBe("IP");
  });

  it("infere pela classe quando tipo é o default AP", () => {
    expect(tipoEfetivo({ tipoProcesso: "AP", classeProcessual: "Inquérito Policial" })).toBe("IP");
    expect(tipoEfetivo({ tipoProcesso: "AP", classeProcessual: "Auto de Prisão em Flagrante" })).toBe("APF");
    expect(tipoEfetivo({ tipoProcesso: "AP", classeProcessual: "Habeas Corpus Criminal" })).toBe("HC");
    expect(tipoEfetivo({ tipoProcesso: "AP", classeProcessual: "Medida Protetiva (Lei Maria da Penha)" })).toBe("MPU");
    expect(tipoEfetivo({ tipoProcesso: "AP", classeProcessual: "Execução da Pena Privativa" })).toBe("EP");
  });

  it("mantém AP quando nada indica o contrário", () => {
    expect(tipoEfetivo({ tipoProcesso: "AP", classeProcessual: "Ação Penal - Procedimento Comum" })).toBe("AP");
    expect(tipoEfetivo({ tipoProcesso: null, classeProcessual: null })).toBe("AP");
  });
});

describe("rankPrincipalidade", () => {
  it("ação penal supera satélites", () => {
    expect(rankPrincipalidade("AP")).toBeGreaterThan(rankPrincipalidade("IP"));
    expect(rankPrincipalidade("AP")).toBeGreaterThan(rankPrincipalidade("APF"));
    expect(rankPrincipalidade("AP")).toBeGreaterThan(rankPrincipalidade("HC"));
    expect(rankPrincipalidade("MPU")).toBeGreaterThan(rankPrincipalidade("IP"));
  });
});

describe("sequencialCNJ", () => {
  it("extrai os 7 primeiros dígitos", () => {
    expect(sequencialCNJ("8003969-75.2024.8.05.0080")).toBe("8003969");
    expect(sequencialCNJ("0000055-00.2023.8.05.0080")).toBe("0000055");
    expect(sequencialCNJ(null)).toBeNull();
    expect(sequencialCNJ("123")).toBeNull();
  });
});

describe("agruparProcessos", () => {
  it("processo solto vira caso próprio com confiança alta", () => {
    const grupos = agruparProcessos([proc({ id: 1, numeroAutos: "8003969-75.2024.8.05.0080" })]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].principalId).toBe(1);
    expect(grupos[0].processoIds).toEqual([1]);
    expect(grupos[0].confianca).toBe("alta");
    expect(grupos[0].tituloSugerido).toContain("8003969");
  });

  it("ignora processos já vinculados por padrão", () => {
    const grupos = agruparProcessos([
      proc({ id: 1, casoId: 99 }),
      proc({ id: 2, casoId: null }),
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].principalId).toBe(2);
  });

  it("une por vínculo de origem explícito e elege a AP como principal", () => {
    // IP (id 1) deu origem à AP (id 2): processoOrigemId aponta a AP→IP.
    const ip = proc({ id: 1, tipoProcesso: "IP" });
    const ap = proc({ id: 2, tipoProcesso: "AP", processoOrigemId: 1 });
    const grupos = agruparProcessos([ip, ap]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].principalId).toBe(2); // AP é principal
    expect([...grupos[0].processoIds].sort((a, b) => a - b)).toEqual([1, 2]);
    expect(grupos[0].confianca).toBe("alta");
    expect(grupos[0].motivos).toContain("vínculo de origem explícito");
  });

  it("une VVD por vítima nominal (parte contrária discriminante + comarca)", () => {
    const mpu = proc({ id: 1, tipoProcesso: "MPU", parteContraria: "Maria das Dores", classeProcessual: "Medida Protetiva" });
    const ip = proc({ id: 2, tipoProcesso: "IP", parteContraria: "Maria das Dores" });
    const grupos = agruparProcessos([mpu, ip]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].principalId).toBe(1); // MPU supera IP
    expect(grupos[0].atribuicaoSugerida).toBe("VVD_CAMACARI");
    expect(grupos[0].confianca).toBe("media");
    expect(grupos[0].tituloSugerido).toContain("Maria das Dores");
  });

  it("NÃO une processos cuja parte contrária é genérica (Ministério Público)", () => {
    const a = proc({ id: 1, parteContraria: "Ministério Público do Estado da Bahia" });
    const b = proc({ id: 2, parteContraria: "Ministério Público do Estado da Bahia" });
    const grupos = agruparProcessos([a, b]);
    expect(grupos).toHaveLength(2); // permanecem separados
  });

  it("não une comarcas distintas mesmo com mesma parte", () => {
    const a = proc({ id: 1, parteContraria: "João Vítima", comarca: "Camaçari" });
    const b = proc({ id: 2, parteContraria: "João Vítima", comarca: "Salvador" });
    expect(agruparProcessos([a, b])).toHaveLength(2);
  });

  it("processo de júri sugere atribuição JURI", () => {
    const grupos = agruparProcessos([proc({ id: 1, isJuri: true })]);
    expect(grupos[0].atribuicaoSugerida).toBe("JURI_CAMACARI");
  });
});

describe("validarCasos", () => {
  const base = (over: Partial<CasoComProcessos>): CasoComProcessos => ({
    casoId: 1,
    processos: [proc({ id: 1 })],
    referenciaIds: [1],
    ...over,
  });

  it("caso sem principal é sinalizado com fix", () => {
    const r = validarCasos([base({ referenciaIds: [] })], []);
    expect(r.some((i) => i.tipo === "caso_sem_principal")).toBe(true);
    const inc = r.find((i) => i.tipo === "caso_sem_principal")!;
    expect(inc.fix?.principalId).toBe(1);
  });

  it("múltiplos principais sinalizados, fix elege a AP", () => {
    const r = validarCasos(
      [base({
        processos: [proc({ id: 1, tipoProcesso: "IP" }), proc({ id: 2, tipoProcesso: "AP" })],
        referenciaIds: [1, 2],
      })],
      [],
    );
    const inc = r.find((i) => i.tipo === "caso_multiplos_principais")!;
    expect(inc).toBeTruthy();
    expect(inc.fix?.principalId).toBe(2);
  });

  it("tipo impreciso (AP declarado, classe é Inquérito)", () => {
    const r = validarCasos(
      [base({ processos: [proc({ id: 5, tipoProcesso: "AP", classeProcessual: "Inquérito Policial" })], referenciaIds: [5] })],
      [],
    );
    const inc = r.find((i) => i.tipo === "tipo_impreciso")!;
    expect(inc).toBeTruthy();
    expect(inc.fix?.tipoEfetivoSugerido?.[5]).toBe("IP");
  });

  it("processos soltos sinalizados", () => {
    const r = validarCasos([], [proc({ id: 9 }), proc({ id: 10 })]);
    const inc = r.find((i) => i.tipo === "processo_solto")!;
    expect([...inc.processoIds].sort((a, b) => a - b)).toEqual([9, 10]);
  });

  it("caso saudável não gera inconsistências", () => {
    const r = validarCasos([base({ processos: [proc({ id: 1, tipoProcesso: "AP", classeProcessual: "Ação Penal" })], referenciaIds: [1] })], []);
    expect(r).toHaveLength(0);
  });
});

describe("atribuicaoCasoDoProcesso", () => {
  it("EP → EXECUCAO_PENAL", () => {
    expect(atribuicaoCasoDoProcesso(proc({ id: 1, tipoProcesso: "EP" }), "EP")).toBe("EXECUCAO_PENAL");
  });
  it("cível → SUBSTITUICAO_CIVEL", () => {
    expect(atribuicaoCasoDoProcesso(proc({ id: 1, area: "FAMILIA" }), "AP")).toBe("SUBSTITUICAO_CIVEL");
  });
  it("default criminal → SUBSTITUICAO", () => {
    expect(atribuicaoCasoDoProcesso(proc({ id: 1, area: "CRIMINAL" }), "AP")).toBe("SUBSTITUICAO");
  });
});
