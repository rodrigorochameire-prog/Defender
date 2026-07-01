import { describe, it, expect } from "vitest";
import { buildSeeuJobMeta } from "@/lib/trpc/routers/seeuIntimacoes";

describe("buildSeeuJobMeta", () => {
  it("normaliza abas e atribuição com defaults", () => {
    expect(buildSeeuJobMeta({ atribuicoes: ["EXECUCAO_PENAL"] })).toEqual({
      atribuicoes: ["EXECUCAO_PENAL"],
      abas: ["manifestacao", "ciencia", "razoes"],
      limit: 300,
    });
  });

  it("respeita abas explícitas", () => {
    expect(
      buildSeeuJobMeta({ atribuicoes: ["EXECUCAO_PENAL"], abas: ["ciencia"], limit: 50 }).abas,
    ).toEqual(["ciencia"]);
  });
});
