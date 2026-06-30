import { describe, it, expect } from "vitest";
import { LICENCA_MOTIVOS } from "../motivos";

describe("LICENCA_MOTIVOS", () => {
  it("has the 11 official SIGA motivos", () => {
    expect(LICENCA_MOTIVOS).toHaveLength(11);
    expect(LICENCA_MOTIVOS).toContain("LUTO");
    expect(LICENCA_MOTIVOS).toContain("MATERNIDADE (OU ADOTANTE)");
    expect(LICENCA_MOTIVOS).toContain("DOENÇA DE PESSOA DA FAMÍLIA");
  });
});
