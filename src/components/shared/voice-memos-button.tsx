"use client";

import { useState, useRef, useCallback } from "react";
import { Smartphone, Upload, Loader2, Mic, CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SHORTCUT_NAME = "Gravar Audio OMBUDS";
const SHORTCUT_URL = `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}`;

type VoiceMemosState = "idle" | "importing" | "transcribing" | "done" | "error";

interface VoiceMemosButtonProps {
  onTranscriptReady?: (transcript: string) => void;
  /** Called with the audio file after successful transcription — use to upload to Drive */
  onAudioFile?: (file: File) => void;
  compact?: boolean;
  className?: string;
  assistidoId?: number | null;
  processoId?: number | null;
}

export function VoiceMemosButton({
  onTranscriptReady,
  onAudioFile,
  compact = false,
  className,
}: VoiceMemosButtonProps) {
  const [state, setState] = useState<VoiceMemosState>("idle");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRecordingViaShortcut = useCallback(() => {
    window.open(SHORTCUT_URL, "_self");
    toast.info("Gravando via Atalhos", {
      description:
        "A gravacao iniciou no app Atalhos. Quando terminar, importe o arquivo aqui.",
      duration: 8000,
    });
    setPopoverOpen(false);
  }, []);

  const showSetupInstructions = useCallback(() => {
    toast.info("Como configurar o Atalho", {
      description: `Abra o app Atalhos → Novo Atalho → adicione "Gravar Audio" (inicio: Imediatamente) + "Salvar Arquivo" → nomeie "${SHORTCUT_NAME}"`,
      duration: 15000,
    });
    setPopoverOpen(false);
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      const validTypes = [
        "audio/mp4",
        "audio/x-m4a",
        "audio/m4a",
        "audio/mpeg",
        "audio/wav",
        "audio/webm",
        "audio/ogg",
        "audio/aac",
      ];
      const isValid =
        validTypes.some((t) => file.type.startsWith(t.split("/")[0])) ||
        file.name.match(/\.(m4a|mp3|wav|webm|ogg|aac|mp4)$/i);

      if (!isValid) {
        toast.error("Formato nao suportado", {
          description: "Use .m4a, .mp3, .wav, .webm, .ogg ou .aac",
        });
        return;
      }

      // Check size (25MB limit for transcription)
      if (file.size > 25 * 1024 * 1024) {
        toast.error("Arquivo muito grande", {
          description: "O limite para transcricao e 25MB.",
        });
        return;
      }

      setState("transcribing");
      setPopoverOpen(false);

      try {
        const formData = new FormData();
        formData.append("audio", file, file.name);
        formData.append("mimeType", file.type || "audio/mp4");

        const response = await fetch("/api/ai/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(
            (err as { error?: string })?.error ?? "Falha na transcricao."
          );
        }

        const data = (await response.json()) as { transcript?: string };
        const text = data.transcript ?? "";

        if (!text.trim()) {
          toast.warning("Transcricao vazia", {
            description: "O audio nao continha fala detectavel.",
          });
          setState("idle");
          return;
        }

        setState("done");
        toast.success("Transcricao concluida", {
          description: `${text.length} caracteres transcritos.`,
        });
        onTranscriptReady?.(text);
        onAudioFile?.(file);

        // Reset after a moment
        setTimeout(() => setState("idle"), 2000);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao transcrever audio.";
        toast.error("Erro na transcricao", { description: message });
        setState("error");
        setTimeout(() => setState("idle"), 3000);
      } finally {
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [onTranscriptReady, onAudioFile]
  );

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
    setPopoverOpen(false);
  }, []);

  const isProcessing = state === "transcribing";

  if (compact) {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept=".m4a,.mp3,.wav,.webm,.ogg,.aac,.mp4,audio/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isProcessing}
              className={cn(
                "h-7 w-7 p-0 transition-all",
                isProcessing
                  ? "text-amber-500 animate-pulse"
                  : "text-teal-500 hover:text-teal-400 hover:bg-teal-500/10",
                className
              )}
              title={
                isProcessing
                  ? "Transcrevendo audio..."
                  : "Gravar / Importar audio"
              }
            >
              {isProcessing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Smartphone className="h-3.5 w-3.5" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-56 p-1.5"
            align="end"
            side="bottom"
          >
            <div className="space-y-0.5">
              <button
                onClick={startRecordingViaShortcut}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Mic className="h-3.5 w-3.5 text-rose-500" />
                Gravar agora (Atalhos)
              </button>
              <button
                onClick={triggerFileInput}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Upload className="h-3.5 w-3.5 text-blue-500" />
                Importar audio (.m4a)
              </button>
              <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
              <button
                onClick={showSetupInstructions}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[10px] text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <CircleHelp className="h-3 w-3" />
                Como configurar o Atalho
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </>
    );
  }

  // Full-size button variant
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".m4a,.mp3,.wav,.webm,.ogg,.aac,.mp4,audio/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={isProcessing}
            className={cn(
              "transition-all",
              isProcessing && "text-amber-500 animate-pulse border-amber-300",
              !isProcessing &&
                "text-teal-600 hover:text-teal-700 border-teal-200 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20",
              className
            )}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Smartphone className="h-4 w-4 mr-2" />
            )}
            {isProcessing ? "Transcrevendo..." : "Gravar Audio"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-1.5" align="start" side="bottom">
          <div className="space-y-0.5">
            <button
              onClick={startRecordingViaShortcut}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Mic className="h-4 w-4 text-rose-500" />
              Gravar agora (Atalhos)
            </button>
            <button
              onClick={triggerFileInput}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Upload className="h-4 w-4 text-blue-500" />
              Importar audio (.m4a)
            </button>
            <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
            <button
              onClick={showSetupInstructions}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-xs text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <CircleHelp className="h-3.5 w-3.5" />
              Como configurar o Atalho
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
