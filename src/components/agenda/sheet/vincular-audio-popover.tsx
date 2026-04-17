"use client";

import { useState } from "react";
import { Link2, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  depoenteId: number;
  currentAudioId: string | null;
  assistidoId: number;
  onChange?: () => void;
}

export function VincularAudioPopover({ depoenteId, currentAudioId, assistidoId, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const midias = trpc.drive.midiasByAssistido.useQuery(
    { assistidoId },
    { enabled: !!assistidoId && open },
  );

  const mutation = trpc.audiencias.vincularAudioDepoente.useMutation({
    onSuccess: () => {
      toast.success("Áudio vinculado");
      setOpen(false);
      onChange?.();
    },
    onError: (e) => toast.error(e.message ?? "Erro ao vincular"),
  });

  const audios = (() => {
    const data: any = midias.data;
    const all = [
      ...(data?.processos ?? []).flatMap((p: any) => p.files ?? []),
      ...(data?.ungrouped ?? []),
    ];
    return all.filter((f: any) => f.mimeType?.startsWith?.("audio/"));
  })();

  const select = (audioDriveFileId: string | null) => {
    mutation.mutate({ depoenteId, audioDriveFileId });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-[10px] font-medium px-2 py-1 rounded-md bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 cursor-pointer flex items-center gap-1"
      >
        <Link2 className="w-3 h-3" />
        {currentAudioId ? "Trocar áudio" : "Vincular áudio"}
      </button>

      {open && (
        <>
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-72 p-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg z-50">
            {midias.isLoading && (
              <p className="text-[10px] text-neutral-400 italic p-2 text-center">Carregando…</p>
            )}
            {!midias.isLoading && audios.length === 0 && (
              <p className="text-[10px] text-neutral-400 italic p-2 text-center">Nenhum áudio disponível</p>
            )}
            {audios.map((a: any) => (
              <button
                key={a.driveFileId}
                type="button"
                onClick={() => select(a.driveFileId)}
                disabled={mutation.isPending}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer text-[11px] flex items-center gap-2",
                  currentAudioId === a.driveFileId && "bg-emerald-50 dark:bg-emerald-900/20",
                )}
              >
                <span className="flex-1 truncate">{a.name}</span>
                {currentAudioId === a.driveFileId && (
                  <span className="text-[9px] text-emerald-600">atual</span>
                )}
              </button>
            ))}
            {currentAudioId && (
              <>
                <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1" />
                <button
                  type="button"
                  onClick={() => select(null)}
                  disabled={mutation.isPending}
                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/20 cursor-pointer text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-2"
                >
                  <X className="w-3 h-3" />
                  Nenhum (desvincular)
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
