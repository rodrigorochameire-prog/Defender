"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Mic, Square, Pause, Play, Trash2, UploadCloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AudioGravado {
  blob: Blob;
  duracaoSeg: number;
}

/** Faz o POST do áudio para a rota de upload do registro. */
export async function uploadAudioAtendimento(
  registroId: number,
  audio: AudioGravado,
): Promise<{ ok: boolean; transcricaoTaskId?: number | null; error?: string }> {
  const ext = audio.blob.type.includes("webm") ? "webm" : audio.blob.type.includes("mp4") ? "m4a" : "ogg";
  const fd = new FormData();
  fd.append("file", audio.blob, `gravacao.${ext}`);
  fd.append("duracao", String(audio.duracaoSeg));
  const res = await fetch(`/api/registros/${registroId}/audio`, { method: "POST", body: fd });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    return { ok: false, error: j.error ?? `erro ${res.status}` };
  }
  return await res.json();
}

function fmt(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Estado = "idle" | "gravando" | "pausado" | "gravado";

/**
 * Gravador de áudio do navegador (MediaRecorder). Em modo `registroId`, faz o
 * upload direto. Sem `registroId` (novo atendimento), entrega o blob via
 * `onRecorded` para o pai salvar junto ao criar o registro.
 */
export function AudioRecorder({
  registroId,
  onRecorded,
  onUploaded,
}: {
  registroId?: number | null;
  onRecorded?: (audio: AudioGravado | null) => void;
  onUploaded?: () => void;
}) {
  const [estado, setEstado] = useState<Estado>("idle");
  const [seg, setSeg] = useState(0);
  const [audio, setAudio] = useState<AudioGravado | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pararTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };
  const limparStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => () => {
    pararTimer();
    limparStream();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const iniciar = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const grav: AudioGravado = { blob, duracaoSeg: seg };
        setAudio(grav);
        setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
        setEstado("gravado");
        onRecorded?.(grav);
        limparStream();
      };
      rec.start();
      recorderRef.current = rec;
      setSeg(0);
      setEstado("gravando");
      pararTimer();
      timerRef.current = setInterval(() => setSeg((s) => s + 1), 1000);
    } catch {
      toast.error("Não foi possível acessar o microfone. Verifique a permissão.");
    }
  }, [seg, onRecorded]);

  const pausar = () => {
    recorderRef.current?.pause();
    pararTimer();
    setEstado("pausado");
  };
  const continuar = () => {
    recorderRef.current?.resume();
    timerRef.current = setInterval(() => setSeg((s) => s + 1), 1000);
    setEstado("gravando");
  };
  const parar = () => {
    pararTimer();
    recorderRef.current?.stop();
  };
  const descartar = () => {
    setAudio(null);
    onRecorded?.(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSeg(0);
    setEstado("idle");
  };

  const enviar = async () => {
    if (!audio || !registroId) return;
    setEnviando(true);
    const r = await uploadAudioAtendimento(registroId, audio);
    setEnviando(false);
    if (r.ok) {
      toast.success(
        r.transcricaoTaskId
          ? "Áudio salvo no Drive. Transcrição enfileirada."
          : "Áudio salvo no Drive.",
      );
      descartar();
      onUploaded?.();
    } else {
      toast.error(r.error ?? "Falha ao enviar o áudio.");
    }
  };

  return (
    <div className="rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 p-3 space-y-2">
      <div className="flex items-center gap-2">
        {(estado === "gravando" || estado === "pausado") && (
          <span className={cn("h-2 w-2 rounded-full", estado === "gravando" ? "bg-rose-500 animate-pulse" : "bg-amber-500")} />
        )}
        <span className="text-xs font-mono text-neutral-600 dark:text-neutral-300 tabular-nums">{fmt(seg)}</span>
        <span className="text-[11px] text-neutral-400">
          {estado === "idle" && "Gravar áudio do atendimento"}
          {estado === "gravando" && "Gravando…"}
          {estado === "pausado" && "Pausado"}
          {estado === "gravado" && "Gravação pronta"}
        </span>
      </div>

      {previewUrl && estado === "gravado" && (
        <audio controls src={previewUrl} className="w-full h-8" />
      )}

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
            {registroId ? (
              <Button size="sm" className="gap-1.5 text-xs" disabled={enviando} onClick={enviar}>
                {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                {enviando ? "Enviando…" : "Salvar no Drive"}
              </Button>
            ) : (
              <span className="text-[11px] text-emerald-600">Será salvo ao criar o atendimento.</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
