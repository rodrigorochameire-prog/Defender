"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Play } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { AudioPlayerInline } from "./audio-player-inline";
import { VideoModal } from "./video-modal";

interface AtendimentoAudio {
  id: number;
  data: Date | string;
  audioDriveFileId: string;
  transcricaoResumo?: string | null;
}

interface Props {
  assistidoId: number | null;
  atendimentosComAudio: AtendimentoAudio[];
}

type MediaItem = {
  key: string;
  driveFileId: string;
  name: string;
  mimeType: string;
  date: Date;
  transcricaoResumo?: string | null;
  kind: "audio" | "video";
};

export function MidiaBlock({ assistidoId, atendimentosComAudio }: Props) {
  const midias = trpc.drive.midiasByAssistido.useQuery(
    { assistidoId: assistidoId ?? 0 },
    { enabled: !!assistidoId }
  );
  const [videoOpen, setVideoOpen] = useState<MediaItem | null>(null);

  const items: MediaItem[] = useMemo(() => {
    const list: MediaItem[] = [];
    const data: any = midias.data;
    const drivFiles = [
      ...(data?.processos ?? []).flatMap((p: any) => p.files ?? []),
      ...(data?.ungrouped ?? []),
    ];
    for (const f of drivFiles) {
      const kind: "audio" | "video" = f.mimeType?.startsWith?.("video/") ? "video" : "audio";
      list.push({
        key: `drive-${f.driveFileId}`,
        driveFileId: f.driveFileId,
        name: f.name,
        mimeType: f.mimeType,
        date: f.lastModifiedTime ? new Date(f.lastModifiedTime) : new Date(0),
        kind,
      });
    }
    for (const atd of atendimentosComAudio) {
      list.push({
        key: `atd-${atd.id}`,
        driveFileId: atd.audioDriveFileId,
        name: `Atendimento ${format(new Date(atd.data), "dd/MM/yyyy", { locale: ptBR })}`,
        mimeType: "audio/mpeg",
        date: new Date(atd.data),
        transcricaoResumo: atd.transcricaoResumo ?? null,
        kind: "audio",
      });
    }
    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [midias.data, atendimentosComAudio]);

  if (items.length === 0) {
    return (
      <p className="text-[11px] text-neutral-400 italic py-4 text-center">
        Nenhuma mídia vinculada a este assistido.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.key}
          className="rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 p-2.5 bg-white dark:bg-neutral-900/50"
        >
          {item.kind === "audio" ? (
            <>
              <AudioPlayerInline driveFileId={item.driveFileId} title={item.name} />
              {item.transcricaoResumo && (
                <details className="mt-1.5">
                  <summary className="text-[9px] font-medium text-neutral-500 cursor-pointer hover:text-neutral-700">
                    Ver transcrição
                  </summary>
                  <p className="text-[10px] text-neutral-600 dark:text-neutral-400 mt-1 whitespace-pre-wrap leading-relaxed">
                    {item.transcricaoResumo}
                  </p>
                </details>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-neutral-800 dark:text-neutral-200 truncate">
                  {item.name}
                </div>
                <div className="text-[9px] text-neutral-400">
                  {format(item.date, "dd/MM/yyyy", { locale: ptBR })}
                </div>
              </div>
              <button
                type="button"
                aria-label="Assistir"
                onClick={() => setVideoOpen(item)}
                className="text-[10px] font-medium px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer flex items-center gap-1"
              >
                <Play className="w-3 h-3" /> Assistir
              </button>
            </div>
          )}
        </div>
      ))}
      {videoOpen && (
        <VideoModal
          open={!!videoOpen}
          onOpenChange={(o) => !o && setVideoOpen(null)}
          driveFileId={videoOpen.driveFileId}
          title={videoOpen.name}
        />
      )}
    </div>
  );
}
