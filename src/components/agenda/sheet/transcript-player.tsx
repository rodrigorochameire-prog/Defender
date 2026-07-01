"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Pin, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuracao } from "@/lib/agenda/gravacao-audio";
import { segmentoAtivo, type Segmento } from "@/lib/agenda/transcript-sync";
import type { Pino } from "@/lib/agenda/pino";

/**
 * Player interativo do depoimento (F4): um `<audio>` (Drive) + a transcrição
 * renderizada como segmentos clicáveis. Clicar num segmento posiciona o áudio em
 * `segment.start`; a cada `timeupdate` o segmento ativo é destacado e rolado à
 * vista (via `segmentoAtivo`). Se não houver segmentos mas houver transcrição
 * corrida, mostra o texto puro (sem sync).
 *
 * Inclui barra de controle personalizada (play/pause + barra de progresso +
 * marcadores de pinos). Cada segmento tem um botão 📌 (visível no hover) para
 * criar um pino naquele instante.
 */
export function TranscriptPlayer({
  driveFileId,
  segments,
  transcricao,
  offsetS = 0,
  pinos = [],
  onAddPino,
  onRemovePino,
}: {
  driveFileId: string;
  segments: Segmento[];
  transcricao?: string | null;
  /** Segundos a partir do início do áudio onde começa o depoimento deste depoente. */
  offsetS?: number;
  pinos?: Pino[];
  onAddPino?: (timestampS: number) => void;
  onRemovePino?: (pinoId: string) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const segRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [ativo, setAtivo] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const temSegmentos = Array.isArray(segments) && segments.length > 0;
  const src = `https://drive.google.com/uc?export=download&id=${driveFileId}`;

  // Listener unificado: play/pause/timeupdate/seeked/loadedmetadata.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime  = () => {
      setCurrentTime(el.currentTime);
      if (temSegmentos) setAtivo(segmentoAtivo(segments, el.currentTime));
    };
    const onMeta  = () => setDuration(el.duration);
    el.addEventListener("play",           onPlay);
    el.addEventListener("pause",          onPause);
    el.addEventListener("timeupdate",     onTime);
    el.addEventListener("seeked",         onTime);
    el.addEventListener("loadedmetadata", onMeta);
    // Immediately sync if metadata already loaded (preload="metadata" may fire early)
    if (el.readyState >= 1) {
      setDuration(el.duration);
      setCurrentTime(el.currentTime);
    }
    return () => {
      el.removeEventListener("play",           onPlay);
      el.removeEventListener("pause",          onPause);
      el.removeEventListener("timeupdate",     onTime);
      el.removeEventListener("seeked",         onTime);
      el.removeEventListener("loadedmetadata", onMeta);
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
      {/* Elemento de áudio oculto — sem controles nativos */}
      <audio
        ref={audioRef}
        preload="metadata"
        src={src}
        className="hidden"
      >
        Seu navegador não suporta áudio HTML5.
      </audio>

      {/* Barra de controle personalizada */}
      <div className="flex items-center gap-2 rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 px-2 py-1.5">
        {/* Botão play/pause */}
        <button
          type="button"
          onClick={() => {
            const el = audioRef.current;
            if (!el) return;
            el.paused ? void el.play().catch(() => {}) : el.pause();
          }}
          className="shrink-0 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          aria-label={playing ? "Pausar" : "Reproduzir"}
        >
          {playing
            ? <Pause className="h-3.5 w-3.5 text-emerald-600" />
            : <Play  className="h-3.5 w-3.5 text-neutral-500" />
          }
        </button>

        {/* Barra de progresso + marcadores de pinos */}
        <div
          className="relative flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full cursor-pointer"
          onClick={(e) => {
            const el = audioRef.current;
            if (!el || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            el.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
          }}
        >
          {/* Preenchimento do progresso */}
          <div
            className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
            style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
          />
          {/* Marcadores de pinos */}
          {duration > 0 && pinos.map((p) => (
            <div
              key={p.id}
              title={p.nota ?? (p.fonte === "IA" ? "Pino IA" : "Pino defensor")}
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white dark:border-neutral-900 cursor-default"
              style={{
                left: `${(p.timestampS / duration) * 100}%`,
                backgroundColor: p.fonte === "IA" ? "#f59e0b" : "#10b981",
              }}
            />
          ))}
        </div>

        {/* Exibição de tempo */}
        <span className="shrink-0 font-mono tabular-nums text-[10px] text-neutral-400">
          {formatDuracao(currentTime)}{duration ? ` / ${formatDuracao(duration)}` : ""}
        </span>
      </div>

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
                "group w-full text-left flex gap-2 rounded-md px-2 py-1 text-[11px] leading-relaxed cursor-pointer transition-colors",
                i === ativo
                  ? "bg-emerald-50 dark:bg-emerald-900/25 text-emerald-900 dark:text-emerald-200"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/40",
              )}
            >
              <span className="shrink-0 font-mono tabular-nums text-[10px] text-neutral-400 pt-0.5">
                {formatDuracao(s.start)}
              </span>
              <span className="min-w-0 flex-1">{s.text}</span>
              {onAddPino && (
                <span
                  role="button"
                  title="Fixar pino neste momento"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddPino(offsetS + s.start);
                  }}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0 p-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-opacity cursor-pointer"
                >
                  <Pin className="h-2.5 w-2.5 text-neutral-400 group-hover:text-amber-500" />
                </span>
              )}
            </button>
          ))}
        </div>
      ) : transcricao ? (
        <p className="max-h-64 overflow-y-auto rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 p-2.5 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
          {transcricao}
        </p>
      ) : null}

      {/* Lista de pinos abaixo da transcrição */}
      {pinos.length > 0 && (
        <div className="mt-2 space-y-1">
          <p className="text-[9px] font-semibold text-neutral-400 tracking-wide uppercase">Pinos</p>
          {pinos.map((p) => (
            <div key={p.id} className="flex items-center gap-1.5 text-[10px]">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: p.fonte === "IA" ? "#f59e0b" : "#10b981" }}
              />
              <span className="font-mono tabular-nums text-neutral-400">{formatDuracao(p.timestampS)}</span>
              {p.nota && <span className="text-neutral-600 dark:text-neutral-400 truncate">{p.nota}</span>}
              <span className="text-[9px] text-neutral-300 dark:text-neutral-600">({p.fonte})</span>
              {onRemovePino && (
                <button
                  type="button"
                  onClick={() => onRemovePino(p.id)}
                  className="ml-auto text-[9px] text-neutral-400 hover:text-rose-500 cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
