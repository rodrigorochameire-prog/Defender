import { describe, it, expect } from "vitest";
import { isPrazoUrgente, PRAZO_URGENTE_DIAS } from "../processo-context";

describe("isPrazoUrgente", () => {
  it("é urgente abaixo do limite", () => {
    expect(isPrazoUrgente(0)).toBe(true);
    expect(isPrazoUrgente(PRAZO_URGENTE_DIAS - 1)).toBe(true);
  });

  it("não é urgente no limite ou acima", () => {
    expect(isPrazoUrgente(PRAZO_URGENTE_DIAS)).toBe(false);
    expect(isPrazoUrgente(30)).toBe(false);
  });

  it("trata ausência de prazo como não urgente", () => {
    expect(isPrazoUrgente(null)).toBe(false);
    expect(isPrazoUrgente(undefined)).toBe(false);
  });
});
