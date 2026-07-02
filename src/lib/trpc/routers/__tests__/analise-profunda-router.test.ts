import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const ROUTERS = join(process.cwd(), "src/lib/trpc/routers");
const read = (rel: string) => readFileSync(join(ROUTERS, rel), "utf8");

describe("analiseProfunda router — contract", () => {
  const src = read("analise-profunda.ts");

  it("expõe criar e status", () => {
    expect(src).toMatch(/criar:\s*protectedProcedure/);
    expect(src).toMatch(/status:\s*protectedProcedure/);
  });
  it("valida elegibilidade via isElegivel2c", () => {
    expect(src).toContain("isElegivel2c");
  });
  it("dedup por estado em andamento (baixando_autos/analisando)", () => {
    expect(src).toContain("baixando_autos");
    expect(src).toContain("analisando");
    expect(src).toMatch(/existing:\s*true/);
  });
  it("enfileira task lane browser skill analise-profunda-demanda", () => {
    expect(src).toContain('lane: "browser"');
    expect(src).toContain('"analise-profunda-demanda"');
    expect(src).toContain("buildBrowserTaskMeta");
  });
  it("grava estado baixando_autos + task_id ao criar", () => {
    expect(src).toContain('"baixando_autos"');
    expect(src).toContain("analiseProfundaTaskId");
  });
  it("status deriva concluida quando a task ai completa", () => {
    expect(src).toContain('"concluida"');
    expect(src).toMatch(/completed/);
  });
  it("status deriva erro tanto para failed quanto para needs_review", () => {
    expect(src).toContain("needs_review");
    expect(src).toMatch(/"failed"[\s\S]*?needs_review/);
  });
  it("está registrado no appRouter", () => {
    const index = read("index.ts");
    expect(index).toContain("analiseProfundaRouter");
    expect(index).toMatch(/analiseProfunda:\s*analiseProfundaRouter/);
  });
});
