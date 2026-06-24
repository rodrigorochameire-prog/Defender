import { describe, it, expect } from "vitest";
import { audioBarHeights, AUDIO_BAR_MIN, AUDIO_BAR_MAX } from "../audio-waveform";

describe("audioBarHeights", () => {
  it("retorna a quantidade pedida de barras", () => {
    expect(audioBarHeights(28)).toHaveLength(28);
    expect(audioBarHeights(0)).toHaveLength(0);
  });

  it("mantém todas as alturas dentro do intervalo", () => {
    for (const h of audioBarHeights(50)) {
      expect(h).toBeGreaterThanOrEqual(AUDIO_BAR_MIN);
      expect(h).toBeLessThanOrEqual(AUDIO_BAR_MAX);
    }
  });

  it("é determinístico (mesma entrada → mesma saída)", () => {
    expect(audioBarHeights(28)).toEqual(audioBarHeights(28));
  });

  it("varia barra a barra (não é uma linha plana)", () => {
    const heights = audioBarHeights(28);
    expect(new Set(heights).size).toBeGreaterThan(1);
  });
});
