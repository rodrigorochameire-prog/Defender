import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * F2-B — Cobertura do header canônico.
 *
 * Garante que os módulos VVD, WhatsApp e Cosmovisão roteiam o título da página
 * pelo mecanismo canônico (`GlassHeaderShell`, migração concluída no Lote B3)
 * e não mais por um <h1> de página "bespoke". O canônico anterior
 * (`HeaderSlotTitle`, que portalava o título 12px na topbar) foi removido no
 * Lote F junto com o `CollapsiblePageHeader` — os três módulos já haviam
 * migrado para `GlassHeaderShell` em lotes anteriores.
 *
 * Lê os arquivos do disco — sem render — para travar a regressão estrutural.
 */

const ADMIN = join(process.cwd(), "src/app/(dashboard)/admin");

function read(rel: string): string {
  return readFileSync(join(ADMIN, rel), "utf8");
}

const TARGETS = {
  vvd: "vvd/page.tsx",
  whatsapp: "whatsapp/page.tsx",
  cosmovisao: "juri/cosmovisao/page.tsx",
} as const;

describe("F2-B — header canônico (GlassHeaderShell)", () => {
  for (const [mod, rel] of Object.entries(TARGETS)) {
    it(`${mod}: importa e usa GlassHeaderShell`, () => {
      const src = read(rel);
      expect(src).toContain("glass-header-shell");
      expect(src).toContain("<GlassHeaderShell");
    });
  }

  it("vvd: não contém mais o <h1> de título bespoke (text-xl)", () => {
    const src = read(TARGETS.vvd);
    // O título bespoke usava text-xl font-bold; o canônico vive na topbar (12px).
    expect(src).not.toMatch(/<h1[^>]*text-xl[^>]*>/);
  });

  it("whatsapp: não contém mais o <h1> topbar bespoke (text-white text-[15px])", () => {
    const src = read(TARGETS.whatsapp);
    expect(src).not.toMatch(/<h1[^>]*text-white text-\[15px\][^>]*>/);
  });

  it("cosmovisao: não contém mais o <h1> topbar bespoke (text-white text-[15px])", () => {
    const src = read(TARGETS.cosmovisao);
    expect(src).not.toMatch(/<h1[^>]*text-white text-\[15px\][^>]*>/);
  });
});
