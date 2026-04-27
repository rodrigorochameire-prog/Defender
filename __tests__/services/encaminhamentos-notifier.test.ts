import { describe, it, expect } from "vitest";
import { buildWhatsappMessage, buildInappPayload, type NotifierContext } from "@/lib/services/encaminhamentos-notifier";

describe("buildWhatsappMessage", () => {
  it("formats transferir message with remetente and titulo", () => {
    const ctx: NotifierContext = {
      remetente: { id: 1, name: "Rodrigo Rocha Meire", phone: "+5571999999999" },
      destinatario: { id: 4, name: "Juliane Andrade", phone: "+5571888888888" },
      tipo: "transferir",
      titulo: "Maria Eliana — RA antes das férias",
      mensagem: "Vou entrar de férias dia 20/04, pode assumir?",
      url: "https://ombuds.vercel.app/cowork/enc/42",
    };
    const msg = buildWhatsappMessage(ctx);
    expect(msg).toContain("Rodrigo Rocha Meire");
    expect(msg).toContain("Maria Eliana — RA antes das férias");
    expect(msg).toContain("https://ombuds.vercel.app/cowork/enc/42");
  });

  it("uses message preview as title when titulo is missing and truncates", () => {
    const longMsg = "Mãe do Francisco ligou agora pouco, pediu atualização sobre a audiência marcada pra 17/04. Telefone de contato anotado no assistido. Ligar de volta até amanhã, por favor.";
    const ctx: NotifierContext = {
      remetente: { id: 1, name: "Rodrigo", phone: null },
      destinatario: { id: 4, name: "Juliane", phone: "+5571888888888" },
      tipo: "anotar",
      titulo: null,
      mensagem: longMsg,
      url: "https://ombuds.vercel.app/cowork/enc/42",
    };
    const msg = buildWhatsappMessage(ctx);
    expect(msg).toContain("Mãe do Francisco ligou");
    expect(msg.length).toBeLessThan(400);
  });

  it("uses verb appropriate to each tipo", () => {
    const base: Omit<NotifierContext, "tipo"> = {
      remetente: { id: 1, name: "R", phone: null },
      destinatario: { id: 2, name: "J", phone: "+55" },
      titulo: "caso X",
      mensagem: "teste",
      url: "https://x/1",
    };
    expect(buildWhatsappMessage({ ...base, tipo: "transferir" })).toMatch(/transferir/i);
    expect(buildWhatsappMessage({ ...base, tipo: "parecer" })).toMatch(/parecer/i);
    expect(buildWhatsappMessage({ ...base, tipo: "encaminhar" })).toMatch(/encaminhou|ciência/i);
    expect(buildWhatsappMessage({ ...base, tipo: "anotar" })).toMatch(/anotou/i);
    expect(buildWhatsappMessage({ ...base, tipo: "acompanhar" })).toMatch(/acompanhar/i);
  });
});

describe("buildInappPayload", () => {
  it("returns { type, title, message, actionUrl } matching notifications schema", () => {
    const payload = buildInappPayload({
      remetente: { id: 1, name: "Rodrigo", phone: null },
      destinatario: { id: 4, name: "Juliane", phone: null },
      tipo: "anotar",
      titulo: "Mãe ligou",
      mensagem: "Pediu atualização",
      url: "https://ombuds.vercel.app/cowork/enc/7",
    });
    expect(payload.type).toBe("encaminhamento");
    expect(payload.title).toContain("Rodrigo");
    expect(payload.message).toBeTruthy();
    expect(payload.actionUrl).toBe("https://ombuds.vercel.app/cowork/enc/7");
  });
});
