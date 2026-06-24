import { describe, it, expect } from "vitest";
import { tagVisual, tagLabel, tagSurface, PREDEFINED_TAGS } from "../tag-visual";

describe("tagLabel", () => {
  it("usa rótulos acentuados para tags conhecidas", () => {
    expect(tagLabel("juri")).toBe("Júri");
    expect(tagLabel("execucao")).toBe("Execução");
    expect(tagLabel("diligencia")).toBe("Diligência");
    expect(tagLabel("aguardando_documento")).toBe("Aguardando Doc");
  });

  it("humaniza tags desconhecidas (snake_case → Title Case)", () => {
    expect(tagLabel("nova_tag")).toBe("Nova Tag");
  });
});

describe("tagSurface", () => {
  it("retorna o tom de urgência (vermelho) para 'urgente'", () => {
    expect(tagSurface("urgente").dot).toBe("bg-red-500");
  });

  it("cai para neutro em tag sem cor definida", () => {
    expect(tagSurface("desconhecida").dot).toBe("bg-neutral-400");
  });
});

describe("tagVisual", () => {
  it("expõe apenas label + cor do dot (representação discreta)", () => {
    const v = tagVisual("urgente");
    expect(v).toEqual({ label: "Urgente", dotClass: "bg-red-500" });
  });
});

describe("PREDEFINED_TAGS", () => {
  it("mantém as seis tags operacionais na ordem de exibição", () => {
    expect(PREDEFINED_TAGS).toHaveLength(6);
    expect(PREDEFINED_TAGS[0]).toBe("urgente");
  });
});
