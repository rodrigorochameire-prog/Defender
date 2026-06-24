/**
 * Deterministic pseudo-waveform bar heights (in px) for the audio message card.
 *
 * The previous implementation used Math.random() inline, so the bars jumped on
 * every re-render. These heights are a pure function of the bar index — stable
 * across renders, varied bar-to-bar — matching the spec's "waveform consistente".
 */

export const AUDIO_BAR_MIN = 3;
export const AUDIO_BAR_MAX = 16;

export function audioBarHeights(count: number): number[] {
  return Array.from({ length: count }, (_, i) => {
    // Two incommensurate frequencies → a varied but repeatable profile.
    const wave = Math.sin(i * 1.2) * Math.cos(i * 0.7);
    const norm = (wave + 1) / 2; // [0, 1]
    return Math.round(AUDIO_BAR_MIN + norm * (AUDIO_BAR_MAX - AUDIO_BAR_MIN));
  });
}
