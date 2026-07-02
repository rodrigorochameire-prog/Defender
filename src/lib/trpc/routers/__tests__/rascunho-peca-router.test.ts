import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const ROUTERS = join(process.cwd(), "src/lib/trpc/routers");
const read = (rel: string) => readFileSync(join(ROUTERS, rel), "utf8");

describe("rascunhoPeca router — contract", () => {
  const src = read("rascunho-peca.ts");

  it("expõe criar e status", () => {
    expect(src).toMatch(/criar:\s*protectedProcedure/);
    expect(src).toMatch(/status:\s*protectedProcedure/);
  });
  it("valida elegibilidade via isElegivelRascunho", () => {
    expect(src).toContain("isElegivelRascunho");
  });
  it("lê analise_profunda_status como pré-requisito", () => {
    expect(src).toContain("analiseProfundaStatus");
  });
  it("lê peca_sugerida do registro de análise", () => {
    expect(src).toMatch(/peca_sugerida/);
  });
  it("dedup em rascunhando", () => {
    expect(src).toContain('"rascunhando"');
    expect(src).toMatch(/existing:\s*true/);
  });
  it("enfileira lane ai skill gerar-peca com meta", () => {
    expect(src).toContain('lane: "ai"');
    expect(src).toContain('"gerar-peca"');
    expect(src).toContain("buildRascunhoTaskMeta");
  });
  it("status derive-on-read → pronto quando task ai completa", () => {
    expect(src).toContain('"pronto"');
    expect(src).toMatch(/completed/);
  });
  it("está registrado no appRouter", () => {
    const index = read("index.ts");
    expect(index).toContain("rascunhoPecaRouter");
    expect(index).toMatch(/rascunhoPeca:\s*rascunhoPecaRouter/);
  });
});
