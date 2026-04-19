import { describe, it, expect } from "vitest";
import { isPlaceholderLugar } from "@/lib/lugares/placeholders";

describe("isPlaceholderLugar", () => {
  it.each([
    [""],
    ["   "],
    ["-"],
    ["?"],
    ["..."],
    ["n/c"],
    ["na"],
    ["não informado"],
    ["Nao Informado"],
    ["sem endereço"],
    ["sem endereco"],
    ["a confirmar"],
    ["a extrair"],
    ["A EXTRAIR pelo oficial"],
    ["desconhecido"],
    ["não consta"],
    ["NAO CONSTA"],
    ["ab"],
  ])("placeholder: %s", (s) => {
    expect(isPlaceholderLugar(s)).toBe(true);
  });

  it.each([
    ["Rua das Palmeiras, 123"],
    ["Av. Principal 100"],
    ["Centro"],
  ])("válido: %s", (s) => {
    expect(isPlaceholderLugar(s)).toBe(false);
  });
});
