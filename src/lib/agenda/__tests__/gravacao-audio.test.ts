import { describe, it, expect } from "vitest";
import { formatDuracao, extFromMime, fonteLabel } from "../gravacao-audio";

describe("formatDuracao", () => {
  it("formata segundos em M:SS", () => {
    expect(formatDuracao(0)).toBe("0:00");
    expect(formatDuracao(9)).toBe("0:09");
    expect(formatDuracao(75)).toBe("1:15");
    expect(formatDuracao(600)).toBe("10:00");
    expect(formatDuracao(3661)).toBe("61:01");
  });
  it("trunca frações e protege contra negativos/NaN", () => {
    expect(formatDuracao(75.9)).toBe("1:15");
    expect(formatDuracao(-5)).toBe("0:00");
    expect(formatDuracao(NaN)).toBe("0:00");
  });
});

describe("extFromMime", () => {
  it("mapeia os mimes comuns do MediaRecorder", () => {
    expect(extFromMime("audio/webm;codecs=opus")).toBe("webm");
    expect(extFromMime("video/webm")).toBe("webm"); // getDisplayMedia
    expect(extFromMime("audio/mp4")).toBe("m4a");
    expect(extFromMime("audio/x-m4a")).toBe("m4a");
    expect(extFromMime("audio/ogg")).toBe("ogg");
  });
  it("cai para 'audio' em mime desconhecido/ausente", () => {
    expect(extFromMime("audio/wav")).toBe("audio");
    expect(extFromMime(null)).toBe("audio");
    expect(extFromMime(undefined)).toBe("audio");
  });
});

describe("fonteLabel", () => {
  it("rotula sistema como videoconferência e o resto como microfone", () => {
    expect(fonteLabel("sistema")).toBe("videoconferência");
    expect(fonteLabel("microfone")).toBe("microfone");
    expect(fonteLabel(null)).toBe("microfone");
  });
});
