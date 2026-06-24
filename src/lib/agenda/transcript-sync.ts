/**
 * Util puro de sincronização mídia↔transcrição do depoimento (F4).
 *
 * Os segmentos vêm do whisper-cli (jsonb `testemunhas.depoimento_segments`):
 * `[{ start, end, text }]` em segundos. Durante a reprodução, o
 * `TranscriptPlayer` consulta `segmentoAtivo(segments, audio.currentTime)` a
 * cada `timeupdate` para destacar o segmento em foco e rolá-lo à vista.
 *
 * Robustez: tolera lista vazia, segmentos fora de ordem, gaps entre falas e
 * tempos inválidos (NaN, intervalos invertidos) — nunca lança.
 */

export interface Segmento {
  start: number;
  end: number;
  text: string;
}

/**
 * Índice do segmento que contém o tempo `t` (intervalo `[start, end)` —
 * início inclusivo, fim exclusivo, para não casar dois segmentos adjacentes ao
 * mesmo tempo). Retorna o índice na ordem ORIGINAL do array. `-1` se nenhum
 * segmento cobre `t` (gap, antes do primeiro, depois do último, vazio).
 */
export function segmentoAtivo(
  segments: readonly Segmento[] | null | undefined,
  t: number,
): number {
  if (!Array.isArray(segments) || segments.length === 0) return -1;
  if (!Number.isFinite(t)) return -1;

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const start = s?.start;
    const end = s?.end;
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (end <= start) continue; // intervalo inválido/degenerado
    if (t >= start && t < end) return i;
  }
  return -1;
}
