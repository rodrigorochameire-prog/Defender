import { describe, it, expect } from "vitest";
import { nomeVaraExibicao } from "../nome-vara";

describe("nomeVaraExibicao", () => {
  it("nome antigo de VD de Camaçari vira Justiça pela Paz em Casa", () => {
    expect(
      nomeVaraExibicao("Vara de Violência Doméstica Fam Contra a Mulher de Camaçari")
    ).toBe("Vara da Justiça pela Paz em Casa de Camaçari");
    expect(
      nomeVaraExibicao("VARA DE VIOLÊNCIA DOMÉSTICA FAM CONTRA A MULHER DE CAMAÇARI")
    ).toBe("Vara da Justiça pela Paz em Casa de Camaçari");
  });

  it("nome novo verboso com cauda de lixo é limpo para o canônico", () => {
    expect(
      nomeVaraExibicao(
        "VARA DA JUSTIÇA PELA PAZ EM CASA DA COMARCA DE CAMAÇARI - BAHIA Autos nº 8002424-52.2025.8.05.0039 E"
      )
    ).toBe("Vara da Justiça pela Paz em Casa de Camaçari");
  });

  it("distingue Salvador de Camaçari", () => {
    expect(
      nomeVaraExibicao(
        "VARA DE VIOLÊNCIA DOMÉSTICA E FAMILIAR CONTRA A MULHER DA COMARCA DE SALVADOR - BAHIA Autos n. 80701"
      )
    ).toBe("Vara da Justiça pela Paz em Casa de Salvador");
  });

  it("VD sem comarca explícita cai no nome sem sufixo", () => {
    expect(nomeVaraExibicao("Vara de Violência Doméstica")).toBe(
      "Vara da Justiça pela Paz em Casa"
    );
  });

  it("vara não-VD: remove cauda e aplica Title Case", () => {
    expect(
      nomeVaraExibicao("2ª VARA CRIMINAL DA COMARCA DE CAMAÇARI - BAHIA Autos nº 123")
    ).toBe("2ª Vara Criminal da Comarca de Camaçari");
  });

  it("entrada vazia/nula retorna null", () => {
    expect(nomeVaraExibicao(null)).toBeNull();
    expect(nomeVaraExibicao("")).toBeNull();
    expect(nomeVaraExibicao(undefined)).toBeNull();
  });
});
