import { describe, it, expect } from "vitest";
import { formatWhatsAppTime, mediaSnippetLabel } from "../conversation-format";

describe("formatWhatsAppTime", () => {
  const now = new Date("2026-06-24T15:00:00");

  it("mostra a hora quando a mensagem é de hoje", () => {
    const today = new Date("2026-06-24T09:30:00");
    expect(formatWhatsAppTime(today, now)).toMatch(/09:30/);
  });

  it('mostra "Ontem" para o dia anterior', () => {
    const yesterday = new Date("2026-06-23T22:00:00");
    expect(formatWhatsAppTime(yesterday, now)).toBe("Ontem");
  });

  it("mostra o dia da semana dentro da mesma semana", () => {
    const threeDaysAgo = new Date("2026-06-21T10:00:00");
    const out = formatWhatsAppTime(threeDaysAgo, now);
    // dia da semana curto, sem ponto final
    expect(out).not.toContain(".");
    expect(out).toMatch(/\p{L}/u);
    expect(out).not.toBe("Ontem");
  });

  it("mostra data compacta para mensagens com mais de uma semana", () => {
    const old = new Date("2026-05-01T10:00:00");
    expect(formatWhatsAppTime(old, now)).toMatch(/\d{2}\/\d{2}\/\d{2}/);
  });
});

describe("mediaSnippetLabel", () => {
  it("rotula tipos de mídia com acentuação correta", () => {
    expect(mediaSnippetLabel("image")).toBe("Foto");
    expect(mediaSnippetLabel("audio")).toBe("Áudio");
    expect(mediaSnippetLabel("video")).toBe("Vídeo");
    expect(mediaSnippetLabel("document")).toBe("Documento");
    expect(mediaSnippetLabel("location")).toBe("Localização");
    expect(mediaSnippetLabel("sticker")).toBe("Figurinha");
  });

  it('cai para "Mensagem" em tipo desconhecido', () => {
    expect(mediaSnippetLabel("text")).toBe("Mensagem");
    expect(mediaSnippetLabel("qualquer")).toBe("Mensagem");
  });
});
