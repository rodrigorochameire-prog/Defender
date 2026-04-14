"use client";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  FileText,
  ExternalLink,
  FolderOpen,
  RefreshCw,
  Database,
  AlertCircle,
} from "lucide-react";
import { GLASS } from "@/lib/config/design-tokens";

const MIME_ICONS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.google-apps.document": "DOC",
  "application/vnd.google-apps.spreadsheet": "XLS",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "text/plain": "TXT",
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "audio/mpeg": "MP3",
  "audio/ogg": "OGG",
  "video/mp4": "MP4",
};

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

export function IndexedFilesSection({ assistidoId }: { assistidoId: number }) {
  const { data: files, isLoading } = trpc.drive.filesByAssistido.useQuery(
    { assistidoId },
    { staleTime: 60_000 },
  );
  const indexMutation = trpc.drive.indexDriveTree.useMutation();
  const utils = trpc.useUtils();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
        <RefreshCw className="w-3 h-3 animate-spin" />
        Carregando índice...
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className={cn(GLASS.card, "p-4 text-center")}>
        <Database className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground mb-2">
          Nenhum arquivo indexado para este assistido
        </p>
        <button
          onClick={async () => {
            await indexMutation.mutateAsync();
            utils.drive.filesByAssistido.invalidate({ assistidoId });
          }}
          disabled={indexMutation.isPending}
          className="text-[10px] font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors cursor-pointer inline-flex items-center gap-1"
        >
          <RefreshCw
            className={cn("w-3 h-3", indexMutation.isPending && "animate-spin")}
          />
          {indexMutation.isPending ? "Indexando..." : "Executar indexação do Drive"}
        </button>
        {indexMutation.data && (
          <p className="text-[10px] text-emerald-600 mt-1">
            {indexMutation.data.indexed} arquivos indexados, {indexMutation.data.linked} vinculados
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">
          Arquivos Indexados
        </h3>
        <span className="text-[10px] font-mono tabular-nums text-zinc-500">
          {files.length} arquivo{files.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2">
        {files.map((file) => {
          const ext = MIME_ICONS[file.mimeType ?? ""] ?? file.fileName.split(".").pop()?.toUpperCase().slice(0, 4) ?? "FILE";
          const driveUrl = `https://drive.google.com/file/d/${file.driveFileId}/view`;
          return (
            <a
              key={file.id}
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-all group"
            >
              {/* File type badge */}
              <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
                  {ext}
                </span>
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate block">
                  {file.fileName}
                </span>
                <span className="text-xs text-zinc-500 truncate block mt-0.5">
                  {file.drivePath}
                </span>
              </div>

              {/* Size */}
              {file.sizeBytes && (
                <span className="text-xs text-zinc-500 font-mono tabular-nums shrink-0">
                  {formatSize(file.sizeBytes)}
                </span>
              )}

              {/* Strategy badge */}
              <span
                className={cn(
                  "text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-md shrink-0 border",
                  file.linkStrategy === "path"
                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50"
                    : file.linkStrategy === "manual"
                      ? "bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800/50"
                      : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50",
                )}
              >
                {file.linkStrategy}
              </span>

              {/* External link */}
              <ExternalLink className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-500 transition-colors shrink-0" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
