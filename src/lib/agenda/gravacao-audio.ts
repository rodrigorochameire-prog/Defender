/**
 * Utilitários puros da gravação de audiência (compartilhados entre o componente
 * `gravar-audiencia.tsx` e a rota `POST /api/audiencias/[id]/audio`).
 */

export type FonteAudio = "microfone" | "sistema";

/** Segundos → "M:SS" (ex.: 75 → "1:15"). Negativos/NaN viram "0:00". */
export function formatDuracao(seg: number): string {
  const s = Number.isFinite(seg) && seg > 0 ? Math.floor(seg) : 0;
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** Extensão de arquivo a partir do mime do MediaRecorder/upload. */
export function extFromMime(mime: string | null | undefined): "webm" | "m4a" | "ogg" | "audio" {
  const m = (mime ?? "").toLowerCase();
  if (m.includes("webm")) return "webm";
  if (m.includes("mp4") || m.includes("m4a")) return "m4a";
  if (m.includes("ogg")) return "ogg";
  return "audio";
}

/** Rótulo humano da fonte de áudio (microfone da sala vs videoconferência). */
export function fonteLabel(fonte: string | null | undefined): string {
  return fonte === "sistema" ? "videoconferência" : "microfone";
}
