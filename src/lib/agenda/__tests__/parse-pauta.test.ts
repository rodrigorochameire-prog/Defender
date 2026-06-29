import { describe, it, expect } from "vitest";
import { toTitleCase, mapearAtribuicao, extrairAssistidos, mapearSituacao, linhaParaEvento, formatDataHora } from "../parse-pauta";

describe("toTitleCase", () => {
  it("mantém conectivo em minúsculo no meio do nome", () => {
    expect(toTitleCase("JOAO DA SILVA")).toBe("João da Silva");
  });
  it("capitaliza a primeira palavra mesmo sendo conectivo", () => {
    expect(toTitleCase("DA SILVA")).toBe("Da Silva");
  });
  it("recupera acento via NAME_ACCENTS", () => {
    expect(toTitleCase("JOAO")).toBe("João");
  });
});

describe("extrairAssistidos", () => {
  it("pega o réu (polo após X), ignora o requerente em segredo", () => {
    const r = extrairAssistidos("Em segredo de justiça - CPF: 783.125.405-63 (REQUERENTE) X MARCELO AUGUSTO BARROS SA BARRETO - CPF: 514.967.805-82 (REQUERIDO)");
    expect(r.map(a => a.nome)).toEqual(["Marcelo Augusto Barros Sa Barreto"]);
    expect(r[0].cpf).toBe("514.967.805-82");
  });
  it("extrai múltiplos réus ligados por 'e', sem o 'e' no nome", () => {
    const r = extrairAssistidos("DEAM CAMAÇARI (REQUERENTE) X ALMIR OLIVEIRA - CPF: 700.800.205-00 (REQUERIDO) e HIDELBRANDO DIAS DOS SANTOS - CPF: 348.079.185-91 (REQUERIDO)");
    expect(r.map(a => a.nome)).toEqual(["Almir Oliveira", "Hidelbrando Dias dos Santos"]);
  });
  it("captura AUTORIDADE no polo passivo e ignora MP no polo ativo", () => {
    const r = extrairAssistidos("Ministério Público do Estado da Bahia - CNPJ: 04.142.491/0001-66 (AUTORIDADE) X ROSIANE MACHADO DE OLIVEIRA - CPF: 071.163.585-44 (AUTORIDADE)");
    expect(r.map(a => a.nome)).toEqual(["Rosiane Machado de Oliveira"]);
  });
  it("filtra não-pessoas (DEAM, VARA, segredo)", () => {
    const r = extrairAssistidos("X DEAM CAMAÇARI (REQUERIDO)");
    expect(r).toEqual([]);
  });
});

describe("mapearAtribuicao", () => {
  it("Vara do Júri e Execuções Penais → Tribunal do Júri (não EP)", () => {
    expect(mapearAtribuicao("VARA DO JÚRI E EXECUÇÕES PENAIS DE CAMAÇARI", "AÇÃO PENAL", "")).toBe("Tribunal do Júri");
  });
  it("VVD por órgão julgador", () => {
    expect(mapearAtribuicao("VARA DE VIOLÊNCIA DOMÉSTICA FAM CONTRA A MULHER DE CAMAÇARI", "MEDIDAS PROTETIVAS", "")).toBe("Violência Doméstica");
  });
  it("EP explícita quando não é vara de júri com execução", () => {
    expect(mapearAtribuicao("VARA DE EXECUÇÃO PENAL DE X", "EXECUÇÃO PENAL", "")).toBe("Execução Penal");
  });
  it("default Criminal Geral quando nada casa", () => {
    expect(mapearAtribuicao("VARA CRIMINAL DE X", "AÇÃO PENAL", "")).toBe("Criminal Geral");
  });
});

describe("mapearSituacao", () => {
  it("redesignada não cai em designada", () => {
    expect(mapearSituacao("redesignada")).toBe("remarcado");
    expect(mapearSituacao("designada")).toBe("confirmado");
    expect(mapearSituacao("cancelada")).toBe("cancelado");
  });
  it("não-realizada não cai em realizada (ordem importa)", () => {
    expect(mapearSituacao("não-realizada")).toBe("cancelado");
  });
  it("realizada → concluido", () => {
    expect(mapearSituacao("realizada")).toBe("concluido");
  });
});

describe("linhaParaEvento", () => {
  it("monta evento a partir de colunas estruturadas", () => {
    const ev = linhaParaEvento({
      dataHora: "30/06/26 09:00",
      processo: "8009660-70.2025.8.05.0039",
      orgao: "VARA DE VIOLÊNCIA DOMÉSTICA FAM CONTRA A MULHER DE CAMAÇARI",
      partes: "Ministério Público do Estado da Bahia - CNPJ: 04.142.491/0001-66 (AUTOR) X JEAN MAYKON SIMOES DA SILVA - CPF: 052.153.735-58 (REU)",
      classe: "AÇÃO PENAL - PROCEDIMENTO ORDINÁRIO (283)",
      tipo: "AUDIÊNCIA DE INSTRUÇÃO E JULGAMENTO",
      sala: "Sala 1",
      situacao: "designada",
    });
    expect(ev.data).toBe("2026-06-30");
    expect(ev.horarioInicio).toBe("09:00");
    expect(ev.processo).toBe("8009660-70.2025.8.05.0039");
    expect(ev.assistido).toBe("Jean Maykon Simoes da Silva");
    expect(ev.atribuicao).toBe("Violência Doméstica");
    expect(ev.status).toBe("confirmado");
    expect(ev.situacaoAudiencia).toBe("designada");
  });
});

describe("formatDataHora", () => {
  it("round-trip: naive BRT armazenado como UTC recupera a hora original (09:00)", () => {
    // O worker grava "2026-06-30T09:00:00" (naive BRT); o driver constrói o Date
    // como se fosse UTC. formatDataHora usa getUTC* → deve recuperar 09:00.
    const d = new Date("2026-06-30T09:00:00Z");
    expect(formatDataHora(d)).toBe("30/06/26 09:00");
  });
  it("retorna '' para null", () => {
    expect(formatDataHora(null)).toBe("");
  });
  it("retorna '' para Date inválido", () => {
    expect(formatDataHora(new Date("invalid"))).toBe("");
  });
});
