import { describe, it, expect } from "vitest";
import { mapearPapel } from "@/lib/promocao/de-para-papeis";

describe("mapearPapel", () => {
  it("mapeia papéis de acusação/defesa para lado correto", () => {
    expect(mapearPapel("testemunha_acusacao")).toEqual({ papel: "testemunha", lado: "acusacao", subpapel: null });
    expect(mapearPapel("testemunha_defesa")).toEqual({ papel: "testemunha", lado: "defesa", subpapel: null });
  });
  it("mapeia agentes públicos", () => {
    expect(mapearPapel("policial_condutor").papel).toBe("policial");
    expect(mapearPapel("perito").papel).toBe("perito");
  });
  it("defendido vira papel reu/assistido", () => {
    expect(mapearPapel("defendido").papel).toBe("reu");
  });
  it("desconhecido cai em 'outro' sem quebrar", () => {
    expect(mapearPapel("inexistente_xyz")).toEqual({ papel: "outro", lado: null, subpapel: null });
  });
});
