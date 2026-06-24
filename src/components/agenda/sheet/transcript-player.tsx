"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatDuracao } from "@/lib/agenda/gravacao-audio";
import { segmentoAtivo, type Segmento } from "@/lib/agenda/transcript-sync";

/**
 * Player interativo do depoimento (F4): um `<audio>` (Drive) + a transcrição
 * renderizada como segmentos clicáveis. Clicar num segmento posiciona o áudio em
 * `segment.start`; a cada `timeupdate` o segmento ativo é destacado e rolado à
 * vista (via `segmentoAtivo`). Se não houver segmentos mas houver transcrição
 * corrida, mostra o texto puro (sem sync).
 */
export function TranscriptPlayer({
  driveFileId,
  segments,
  transcricao,
}: {
  driveFileId: string;
  segments: Segmento[];
  transcricao?: string | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const segRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [ativo, setAtivo] = useState(-1);

  const temSegmentos = Array.isArray(segments) && segments.length > 0;
  const src = `https://drive.google.com/uc?export=download&id=${driveFileId}`;

  // Atualiza o segmento ativo conforme o tempo do áudio avança.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !temSegmentos) return;
    const onTime = () => setAtivo(segmentoAtivo(segments, el.currentTime));
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("seeked", onTime);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("seeked", onTime);
    };
  }, [segments, temSegmentos]);

  // Rola o segmento ativo à vista (sem mexer no scroll da página).
  useEffect(() => {
    if (ativo < 0) return;
    segRefs.current[ativo]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [ativo]);

  const irPara = (start: number) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(start)) return;
    el.currentTime = Math.max(0, start);
    void el.play().catch(() => {});
  };

  return (
    <div className="space-y-2">
      <audio
        ref={audioRef}
        controls
        preload="metadata"
        src={src}
        className="w-full h-8"
      >
        Seu navegador não suporta áudio HTML5.
      </audio>

      {temSegmentos ? (
        <div
          ref={listRef}
          className="max-h-64 overflow-y-auto rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 p-1.5 space-y-0.5"
        >
          {segments.map((s, i) => (
            <button
              key={`${i}-${s.start}`}
              ref={(node) => {
                segRefs.current[i] = node;
              }}
              type="button"
              onClick={() => irPara(s.start)}
              className={cn(
                "w-full text-left flex gap-2 rounded-md px-2 py-1 text-[11px] leading-relaxed cursor-pointer transition-colors",
                i === ativo
                  ? "bg-emerald-50 dark:bg-emerald-900/25 text-emerald-900 dark:text-emerald-200"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/40",
              )}
            >
              <span className="shrink-0 font-mono tabular-nums text-[10px] text-neutral-400 pt-0.5">
                {formatDuracao(s.start)}
              </span>
              <span className="min-w-0">{s.text}</span>
            </button>
          ))}
        </div>
      ) : transcricao ? (
        <p className="max-h-64 overflow-y-auto rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 p-2.5 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
          {transcricao}
        </p>
      ) : null}
    </div>
  );
}
