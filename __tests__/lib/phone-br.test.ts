import { describe, it, expect } from "vitest";
import { normalizeBrPhone } from "@/lib/utils/phone-br";

describe("normalizeBrPhone", () => {
  it("celular com DDI e 9º dígito → canônico", () => {
    expect(normalizeBrPhone("+55 (71) 99999-8888")).toBe("5571999998888");
    expect(normalizeBrPhone("5571999998888")).toBe("5571999998888");
  });
  it("celular SEM DDI → adiciona 55", () => {
    expect(normalizeBrPhone("71999998888")).toBe("5571999998888");
  });
  it("celular legado SEM 9º dígito → insere o 9", () => {
    expect(normalizeBrPhone("7188887777")).toBe("5571988887777");
    expect(normalizeBrPhone("557188887777")).toBe("5571988887777");
  });
  it("fixo (8 dígitos, inicia 2-5) → mantém sem inserir 9", () => {
    expect(normalizeBrPhone("7132045678")).toBe("557132045678");
    expect(normalizeBrPhone("557132045678")).toBe("557132045678");
  });
  it("lixo / curto demais → null (falha segura)", () => {
    expect(normalizeBrPhone("123")).toBeNull();
    expect(normalizeBrPhone("")).toBeNull();
    expect(normalizeBrPhone("abc")).toBeNull();
    expect(normalizeBrPhone(null)).toBeNull();
  });
  it("ignora sufixo @s.whatsapp.net e não-dígitos", () => {
    expect(normalizeBrPhone("5571999998888@s.whatsapp.net")).toBe("5571999998888");
  });
});
