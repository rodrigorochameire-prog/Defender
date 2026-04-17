import { describe, it, expect } from "vitest";
import { matchDepoenteAudio, type MediaFileCandidate } from "@/lib/agenda/match-depoente-audio";

const midias: MediaFileCandidate[] = [
  { driveFileId: "m1", name: "Oitiva João Silva.mp3", mimeType: "audio/mp3" },
  { driveFileId: "m2", name: "depoimento maria.mp3", mimeType: "audio/mp3" },
  { driveFileId: "m3", name: "video-random.mp4", mimeType: "video/mp4" },
];

describe("matchDepoenteAudio", () => {
  it("match exato pelo primeiro nome", () => {
    expect(matchDepoenteAudio("João Silva", midias)).toBe("m1");
  });

  it("match case-insensitive com acentos", () => {
    expect(matchDepoenteAudio("MARIA", midias)).toBe("m2");
  });

  it("retorna null quando não encontra", () => {
    expect(matchDepoenteAudio("Fulano de Tal", midias)).toBeNull();
  });

  it("retorna null para vídeos (só áudio)", () => {
    expect(matchDepoenteAudio("random", midias)).toBeNull();
  });

  it("retorna null para array vazio", () => {
    expect(matchDepoenteAudio("qualquer", [])).toBeNull();
  });
});

describe("matchDepoenteAudio com explicitAudioId", () => {
  it("retorna explicitAudioId quando fornecido (prioridade)", () => {
    expect(matchDepoenteAudio("Fulano", midias, "explicit-xyz")).toBe("explicit-xyz");
  });

  it("cai para heurística quando explicitAudioId é null", () => {
    expect(matchDepoenteAudio("João Silva", midias, null)).toBe("m1");
  });

  it("cai para heurística quando explicitAudioId é undefined", () => {
    expect(matchDepoenteAudio("João Silva", midias, undefined)).toBe("m1");
  });
});
