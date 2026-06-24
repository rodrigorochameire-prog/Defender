import { describe, it, expect } from "vitest";
import { resumoExecucao } from "../resumo-execucao";

describe("resumoExecucao", () => {
  it("reflete conclusão, pendências e gravações", () => {
    expect(resumoExecucao({ jaConcluida: true, pendencias: [1, 2], midias: [1] })).toEqual({
      concluida: true,
      pendencias: 2,
      gravacoes: 1,
    });
  });

  it("entrada vazia → em aberto, zeros", () => {
    expect(resumoExecucao({})).toEqual({ concluida: false, pendencias: 0, gravacoes: 0 });
  });

  it("robusto a não-arrays", () => {
    // @ts-expect-error entrada inválida
    expect(resumoExecucao({ pendencias: null, midias: undefined })).toEqual({
      concluida: false,
      pendencias: 0,
      gravacoes: 0,
    });
  });
});
