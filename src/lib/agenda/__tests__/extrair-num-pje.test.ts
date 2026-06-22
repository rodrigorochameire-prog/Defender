import { describe, it, expect } from "vitest";
import { extrairNumPje } from "../extrair-num-pje";

describe("extrairNumPje", () => {
  it("extrai o Num de uma citação padrão '(Num. X - Pág. Y)'", () => {
    expect(extrairNumPje("Declarou que viu (Num. 541609712 - Pág. 1).")).toBe("541609712");
  });

  it("extrai com vírgula e sem ' - Pág.'", () => {
    expect(extrairNumPje("Intimada por mandado (Num. 555730063, 24/04).")).toBe("555730063");
  });

  it("aceita 'Num.' sem espaço antes do número", () => {
    expect(extrairNumPje("conforme Num.123 do IP")).toBe("123");
  });

  it("aceita 'Id' como variante (Id 555729764)", () => {
    expect(extrairNumPje("confirmou ciência (Id 555729764)")).toBe("555729764");
  });

  it("retorna o PRIMEIRO Num quando há vários", () => {
    expect(extrairNumPje("(Num. 111 - Pág. 2) e depois (Num. 222 - Pág. 5)")).toBe("111");
  });

  it("retorna null quando não há citação", () => {
    expect(extrairNumPje("Ouvido apenas na fase policial, sem id.")).toBeNull();
    expect(extrairNumPje("")).toBeNull();
    expect(extrairNumPje(null as any)).toBeNull();
  });

  it("ignora números soltos que não sejam Num/Id", () => {
    expect(extrairNumPje("CPF 049.981.435-57, sem id de peça")).toBeNull();
  });
});
