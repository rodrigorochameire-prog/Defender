import { describe, it, expect } from "vitest";
import { classificarMatchNome } from "../assistido-match";

describe("classificarMatchNome", () => {
  it("NÃO casa pessoas diferentes com mesmo sobrenome (caso Alexsandro × Gilmar)", () => {
    const r = classificarMatchNome(
      "Alexsandro Santos da Silva Junior",
      "Gilmar Santos da Silva Junior"
    );
    expect(r.tipo).toBe("new");
  });

  it("NÃO casa Joao × Jose com mesmo sobrenome (antes dava 'exact')", () => {
    expect(classificarMatchNome("Joao Santos Silva", "Jose Santos Silva").tipo).toBe("new");
  });

  it("casa exato o mesmo nome", () => {
    expect(classificarMatchNome("Maria Eliana Santos", "Maria Eliana Santos").tipo).toBe("exact");
  });

  it("casa o mesmo nome com diferença de acento/caixa", () => {
    expect(classificarMatchNome("JOÃO DA SILVA", "Joao da Silva").tipo).toBe("exact");
  });

  it("casa variação de conectivo (de/da) como exact/similar", () => {
    const r = classificarMatchNome("Joao Santos da Silva", "Joao Santos Silva");
    expect(r.tipo === "exact" || r.tipo === "similar").toBe(true);
  });

  it("tolera typo leve no primeiro nome", () => {
    const r = classificarMatchNome("Alexsandro Santos da Silva", "Alexandro Santos da Silva");
    expect(r.tipo === "exact" || r.tipo === "similar").toBe(true);
  });

  it("trata inversão de sobrenome como similar (mesmo primeiro nome)", () => {
    const r = classificarMatchNome("Joao Silva Santos", "Joao Santos Silva");
    expect(r.tipo === "exact" || r.tipo === "similar").toBe(true);
  });

  it("primeiro nome igual mas sobrenome totalmente diferente → new", () => {
    expect(classificarMatchNome("Joao Pereira Lima", "Joao Costa Andrade").tipo).toBe("new");
  });
});
