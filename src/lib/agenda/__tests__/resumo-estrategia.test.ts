import { describe, it, expect } from "vitest";
import { resumoEstrategia } from "../resumo-estrategia";

describe("resumoEstrategia", () => {
  it("marca extraído quando há texto/itens; pendente quando ausente", () => {
    const r = resumoEstrategia({
      imputacao: "Art. 121 c/c art. 14, II",
      denuncia: "",
      teses: [{ t: "legítima defesa" }, { t: "desclassificação" }],
      contradicoes: [],
    });
    const by = Object.fromEntries(r.itens.map((i) => [i.key, i]));
    expect(by.imputacao.status).toBe("extraido");
    expect(by.denuncia.status).toBe("pendente");
    expect(by.teses.status).toBe("extraido");
    expect(by.teses.count).toBe(2);
    expect(by.contradicoes.status).toBe("pendente");
    expect(by.contradicoes.count).toBeUndefined();
  });

  it("sempre retorna os 4 elementos estratégicos, na ordem", () => {
    const r = resumoEstrategia({});
    expect(r.itens.map((i) => i.key)).toEqual(["imputacao", "denuncia", "teses", "contradicoes"]);
    expect(r.total).toBe(4);
  });

  it("conta os extraídos", () => {
    const r = resumoEstrategia({ imputacao: "x", teses: [1], contradicoes: [1, 2, 3] });
    expect(r.extraidos).toBe(3); // imputacao, teses, contradicoes
  });

  it("texto só de espaços é pendente; entrada vazia = tudo pendente", () => {
    expect(resumoEstrategia({ imputacao: "   " }).itens[0].status).toBe("pendente");
    expect(resumoEstrategia({}).extraidos).toBe(0);
  });
});
