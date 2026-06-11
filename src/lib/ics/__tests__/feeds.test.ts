import { describe, it, expect } from "vitest";
import { FEEDS_ICS, feedPorSlug } from "../feeds";
import { atribuicaoEnum } from "@/lib/db/schema/enums";

describe("catálogo de feeds ICS", () => {
  it("slugs únicos", () => {
    const slugs = FEEDS_ICS.map((f) => f.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("tem os 9 feeds aprovados", () => {
    expect(FEEDS_ICS.map((f) => f.slug).sort()).toEqual(
      [
        "juri-audiencias",
        "juri-plenario",
        "grupo-juri",
        "vvd",
        "ep",
        "substituicao-automatica",
        "substituicao-cumulativa",
        "atendimentos",
        "prazos",
      ].sort(),
    );
  });

  it("nenhuma atribuição aparece em mais de um feed de audiências", () => {
    const vistas = new Set<string>();
    for (const f of FEEDS_ICS.filter((f) => f.fonte === "audiencias")) {
      for (const a of f.atribuicoes ?? []) {
        expect(vistas.has(a)).toBe(false);
        vistas.add(a);
      }
    }
  });

  it("toda atribuição do catálogo existe no enum do banco (evita 500 no feed)", () => {
    const validas = new Set<string>(atribuicaoEnum.enumValues);
    for (const f of FEEDS_ICS) {
      for (const a of f.atribuicoes ?? []) {
        expect(validas.has(a), `${f.slug}: atribuição inválida ${a}`).toBe(true);
      }
    }
  });

  it("feedPorSlug resolve e rejeita desconhecido", () => {
    expect(feedPorSlug("vvd")?.nome).toBe("Vara da Justiça pela Paz em Casa");
    expect(feedPorSlug("nao-existe")).toBeNull();
  });
});
