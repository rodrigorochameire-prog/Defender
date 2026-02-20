"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type RecordingState =
  | "idle"
  | "recording"
  | "processing"
  | "done"
  | "error";

interface UseAudioRecorderOptions {
  onTranscriptReady?: (transcript: string) => void;
}

export function useAudioRecorder(options?: UseAudioRecorderOptions) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-stop at 600 seconds (10 minutes)
  useEffect(() => {
    if (recordingState === "recording" && recordingSeconds >= 600) {
      stopRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingSeconds, recordingState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setTranscript(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Detect best supported mimeType
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop stream tracks
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        setRecordingState("processing");

        try {
          const audioBlob = new Blob(chunksRef.current, { type: mimeType });
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording");
          formData.append("mimeType", mimeType);

          const response = await fetch("/api/ai/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(
              (err as { error?: string })?.error ?? "Falha na transcrição."
            );
          }

          const data = (await response.json()) as {
            transcript?: string;
          };
          const text = data.transcript ?? "";
          setTranscript(text);
          setRecordingState("done");
          options?.onTranscriptReady?.(text);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Erro ao transcrever.";
          setError(message);
          setRecordingState("error");
        }
      };

      // Start recording in 1s chunks
      mediaRecorder.start(1000);
      setRecordingState("recording");
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível acessar o microfone.";
      setError(message);
      setRecordingState("error");
    }
  }, [options]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    setRecordingState("idle");
    setRecordingSeconds(0);
    setTranscript(null);
    setError(null);
    chunksRef.current = [];
  }, []);

  return {
    recordingState,
    recordingSeconds,
    transcript,
    error,
    startRecording,
    stopRecording,
    reset,
  };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

interface AudioRecorderButtonProps {
  onTranscriptReady?: (transcript: string) => void;
  compact?: boolean;
  className?: string;
}

export function AudioRecorderButton({
  onTranscriptReady,
  compact = false,
  className,
}: AudioRecorderButtonProps) {
  const { recordingState, recordingSeconds, startRecording, stopRecording } =
    useAudioRecorder({ onTranscriptReady });

  const isRecording = recordingState === "recording";
  const isProcessing = recordingState === "processing";

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else if (
      recordingState === "idle" ||
      recordingState === "done" ||
      recordingState === "error"
    ) {
      startRecording();
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size={compact ? "sm" : "default"}
      onClick={handleClick}
      disabled={isProcessing}
      className={cn(
        "relative transition-all",
        isRecording &&
          "border border-rose-400 text-rose-500 animate-pulse bg-rose-50 dark:bg-rose-950/30",
        !isRecording &&
          !isProcessing &&
          "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
        compact && "h-7 w-7 p-0",
        className
      )}
      title={
        isProcessing
          ? "Transcrevendo..."
          : isRecording
          ? `Parar gravação (${formatTime(recordingSeconds)})`
          : "Gravar áudio"
      }
    >
      {isProcessing ? (
        <Loader2
          className={cn("animate-spin", compact ? "h-3.5 w-3.5" : "h-4 w-4")}
        />
      ) : isRecording ? (
        <div className="flex items-center gap-1">
          <Square
            className={cn(
              "fill-current",
              compact ? "h-3.5 w-3.5" : "h-4 w-4"
            )}
          />
          {!compact && (
            <span className="text-xs font-mono">
              {formatTime(recordingSeconds)}
            </span>
          )}
        </div>
      ) : (
        <Mic className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
      )}
      {compact && isRecording && (
        <span className="absolute -top-1 -right-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
        </span>
      )}
    </Button>
  );
}
