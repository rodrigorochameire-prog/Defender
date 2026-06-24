"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Mic, MonitorSpeaker, Square, Pause, Play, Trash2, UploadCloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDuracao, extFromMime, type FonteAudio } from "@/lib/agenda/gravacao-audio";

type Fonte = FonteAudio;
type Estado = "idle" | "gravando" | "pausado" | "gravado";

interface AudioGravado {
  blob: Blob;
  duracaoSeg: number;
}

/**
 * Gravador de áudio da audiência. A fonte é escolhida na hora:
 * - "microfone": getUserMedia (áudio da sala / caixa de som).
 * - "sistema": getDisplayMedia com áudio (captura a aba/tela da videoconferência
 *   Lifesize/PJe — pega a voz de todos os participantes).
 * Sem transcrição inline (audiência é longa): faz upload ao Drive e o daemon
 * transcreve via whisper-cli, gravando de volta em `audiencias.transcricao`.
 */
export function GravarAudiencia({
  audienciaId,
  onUploaded,
}: {
  audienciaId: number;
  onUploaded?: () => void;
}) {
  const [estado, setEstado] = useState<Estado>("idle");
  const [fonte, setFonte] = useState<Fonte>("microfone");
  const [seg, setSeg] = useState(0);
  const [audio, setAudio] = useState<AudioGravado | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const segRef = useRef(0);

  const pararTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };
  const limparStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  const tick = () => {
    timerRef.current = setInterval(() => {
      segRef.current += 1;
      setSeg(segRef.current);
    }, 1000);
  };

  useEffect(
    () => () => {
      pararTimer();
      limparStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const iniciar = useCallback(async () => {
    try {
      let stream: MediaStream;
      if (fonte === "sistema") {
        // Exige áudio da aba/tela. O usuário escolhe a janela na hora.
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        if (stream.getAudioTracks().length === 0) {
          stream.getTracks().forEach((t) => t.stop());
          toast.error('Nenhum áudio capturado. Ao compartilhar, marque "Compartilhar áudio da aba".');
          return;
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      streamRef.current = stream;

      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        setAudio({ blob, duracaoSeg: segRef.current });
        setPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
        setEstado("gravado");
        limparStream();
      };
      // Se o usuário parar o compartilhamento de tela pelo banner do navegador.
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
        pararTimer();
      });
      rec.start();
      recorderRef.current = rec;
      segRef.current = 0;
      setSeg(0);
      setEstado("gravando");
      pararTimer();
      tick();
    } catch (err) {
      if ((err as DOMException)?.name === "NotAllowedError") {
        toast.error(fonte === "sistema" ? "Compartilhamento de tela cancelado." : "Permissão de microfone negada.");
      } else {
        toast.error("Não foi possível iniciar a gravação.");
      }
    }
  }, [fonte]);

  const pausar = () => {
    recorderRef.current?.pause();
    pararTimer();
    setEstado("pausado");
  };
  const continuar = () => {
    recorderRef.current?.resume();
    tick();
    setEstado("gravando");
  };
  const parar = () => {
    pararTimer();
    recorderRef.current?.stop();
  };
  const descartar = () => {
    setAudio(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    segRef.current = 0;
    setSeg(0);
    setEstado("idle");
  };

  const enviar = async () => {
    if (!audio) return;
    setEnviando(true);
    try {
      const ext = extFromMime(audio.blob.type);
      const fd = new FormData();
      fd.append("file", audio.blob, `gravacao.${ext}`);
      fd.append("duracao", String(audio.duracaoSeg));
      fd.append("fonte", fonte);
      const res = await fetch(`/api/audiencias/${audienciaId}/audio`, { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error ?? `Falha ao enviar o áudio (${res.status}).`);
        return;
      }
      toast.success(
        j.transcricaoTaskId
          ? "Gravação salva no Drive. Transcrição enfileirada no daemon."
          : "Gravação salva no Drive.",
      );
      descartar();
      onUploaded?.();
    } finally {
      setEnviando(false);
    }
  };

  const ativo = estado === "gravando" || estado === "pausado";

  return (
    <div className="rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 p-3 space-y-2">
      {/* Seletor de fonte — só antes de iniciar */}
      {estado === "idle" && (
        <div className="inline-flex rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 p-0.5 text-[11px]">
          {(["microfone", "sistema"] as Fonte[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFonte(f)}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors cursor-pointer",
                fonte === f
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200",
              )}
            >
              {f === "microfone" ? <Mic className="h-3 w-3" /> : <MonitorSpeaker className="h-3 w-3" />}
              {f === "microfone" ? "Microfone" : "Áudio da videoconf."}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        {ativo && (
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              estado === "gravando" ? "bg-rose-500 animate-pulse" : "bg-amber-500",
            )}
          />
        )}
        <span className="text-xs font-mono text-neutral-600 dark:text-neutral-300 tabular-nums">{formatDuracao(seg)}</span>
        <span className="text-[11px] text-neutral-400">
          {estado === "idle" && (fonte === "sistema" ? "Capturar áudio da videoconferência" : "Gravar pelo microfone")}
          {estado === "gravando" && "Gravando…"}
          {estado === "pausado" && "Pausado"}
          {estado === "gravado" && "Gravação pronta"}
        </span>
      </div>

      {previewUrl && estado === "gravado" && <audio controls src={previewUrl} className="w-full h-8" />}

      <div className="flex flex-wrap items-center gap-1.5">
        {estado === "idle" && (
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={iniciar}>
            <Mic className="h-3.5 w-3.5 text-rose-500" /> Gravar
          </Button>
        )}
        {estado === "gravando" && (
          <>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={pausar}>
              <Pause className="h-3.5 w-3.5" /> Pausar
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={parar}>
              <Square className="h-3.5 w-3.5 text-rose-500" /> Parar
            </Button>
          </>
        )}
        {estado === "pausado" && (
          <>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={continuar}>
              <Play className="h-3.5 w-3.5" /> Continuar
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={parar}>
              <Square className="h-3.5 w-3.5 text-rose-500" /> Parar
            </Button>
          </>
        )}
        {estado === "gravado" && (
          <>
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-neutral-500" onClick={descartar}>
              <Trash2 className="h-3.5 w-3.5" /> Descartar
            </Button>
            <Button size="sm" className="gap-1.5 text-xs" disabled={enviando} onClick={enviar}>
              {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              {enviando ? "Enviando…" : "Salvar e transcrever"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
