import { describe, it, expect } from "vitest";
import { candidatosDeCasePersonas } from "@/lib/promocao/adaptador-case-personas";

describe("candidatosDeCasePersonas", () => {
  it("converte row com cpf/nascimento no perfil", () => {
    const out = candidatosDeCasePersonas([
      { id: 5, nome: "Ana Lima", tipo: "testemunha_defesa", confidence: 0.8,
        perfil: { cpf: "999.888.777-66", dataNascimento: "1985-02-01" }, contatos: null },
    ] as any);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ nome: "Ana Lima", cpf: "999.888.777-66", dataNascimento: "1985-02-01", papel: "testemunha", lado: "defesa", fonteRef: "case_personas:5" });
  });
  it("lista vazia → []", () => expect(candidatosDeCasePersonas([])).toEqual([]));
  it("sem perfil não quebra", () => {
    const out = candidatosDeCasePersonas([{ id: 1, nome: "X", tipo: "outro", confidence: null, perfil: null, contatos: null }] as any);
    expect(out[0].cpf).toBeNull();
  });
});
