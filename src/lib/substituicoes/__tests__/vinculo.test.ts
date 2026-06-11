import { describe, it, expect } from "vitest";
import { pertenceASubstituicao, pendenciasDaSubstituicao } from "../vinculo";

const SUB = {
  dataInicio: "2026-06-16",
  dataFim: "2026-07-05",
  escopoAtribuicoes: ["JURI_CAMACARI", "EXECUCAO_PENAL"],
};

describe("pertenceASubstituicao — chegou no período+escopo e não é titularidade prévia", () => {
  it("item novo, no escopo, de processo que chegou durante o período → vincula", () => {
    expect(
      pertenceASubstituicao(SUB, {
        itemCriadoEm: new Date("2026-06-20T10:00:00Z"),
        atribuicao: "JURI_CAMACARI",
        processoCriadoEm: new Date("2026-06-18T09:00:00Z"),
      }),
    ).toBe(true);
  });

  it("processo pré-existente (titularidade) → NÃO vincula, mesmo no período+escopo", () => {
    expect(
      pertenceASubstituicao(SUB, {
        itemCriadoEm: new Date("2026-06-20T10:00:00Z"),
        atribuicao: "JURI_CAMACARI",
        processoCriadoEm: new Date("2026-03-01T09:00:00Z"),
      }),
    ).toBe(false);
  });

  it("fora do escopo → NÃO vincula", () => {
    expect(
      pertenceASubstituicao(SUB, {
        itemCriadoEm: new Date("2026-06-20T10:00:00Z"),
        atribuicao: "VVD_CAMACARI",
        processoCriadoEm: new Date("2026-06-18T09:00:00Z"),
      }),
    ).toBe(false);
  });

  it("item fora do período → NÃO vincula", () => {
    expect(
      pertenceASubstituicao(SUB, {
        itemCriadoEm: new Date("2026-07-10T10:00:00Z"),
        atribuicao: "JURI_CAMACARI",
        processoCriadoEm: new Date("2026-06-18T09:00:00Z"),
      }),
    ).toBe(false);
  });

  it("período sem dataFim (em aberto) aceita item de hoje", () => {
    expect(
      pertenceASubstituicao(
        { ...SUB, dataFim: null },
        {
          itemCriadoEm: new Date("2026-08-01T10:00:00Z"),
          atribuicao: "EXECUCAO_PENAL",
          processoCriadoEm: new Date("2026-07-20T09:00:00Z"),
        },
      ),
    ).toBe(true);
  });
});

describe("pendenciasDaSubstituicao — esteira de status", () => {
  it("concluída sem ofício → pendente de oficiar", () => {
    const p = pendenciasDaSubstituicao({
      status: "concluida",
      oficioNumero: null,
      relatorioPath: null,
      seiProtocolo: null,
    });
    expect(p).toContain("Gerar ofício (sem número)");
    expect(p).toContain("Gerar relatório (sem arquivo)");
  });

  it("oficiada sem protocolo SEI → pendência de SEI", () => {
    const p = pendenciasDaSubstituicao({
      status: "oficiada",
      oficioNumero: "16/2026",
      relatorioPath: "/drive/rel.pdf",
      seiProtocolo: null,
    });
    expect(p).toEqual(["Protocolar no SEI"]);
  });

  it("paga e completa → sem pendências", () => {
    const p = pendenciasDaSubstituicao({
      status: "paga",
      oficioNumero: "16/2026",
      relatorioPath: "/drive/rel.pdf",
      seiProtocolo: "SEI-123",
    });
    expect(p).toEqual([]);
  });

  it("em andamento → nenhuma cobrança ainda", () => {
    const p = pendenciasDaSubstituicao({
      status: "em_andamento",
      oficioNumero: null,
      relatorioPath: null,
      seiProtocolo: null,
    });
    expect(p).toEqual([]);
  });
});
