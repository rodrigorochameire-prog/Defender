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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">
          Arquivos Indexados
        </h3>
        <span className="text-[9px] font-mono tabular-nums text-muted-foreground">
          {files.length} arquivo{files.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-1">
        {files.map((file) => {
          const ext = MIME_ICONS[file.mimeType ?? ""] ?? file.fileName.split(".").pop()?.toUpperCase().slice(0, 4) ?? "FILE";
          const driveUrl = `https://drive.google.com/file/d/${file.driveFileId}/view`;
          return (
            <a
              key={file.id}
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                GLASS.cardHover,
                "flex items-center gap-3 px-3 py-2 group",
              )}
            >
              {/* File type badge */}
              <div className="w-8 h-8 rounded-md bg-neutral-900/[0.04] dark:bg-white/[0.05] flex items-center justify-center shrink-0">
                <span className="text-[8px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">
                  {ext}
                </span>
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-foreground/90 truncate block group-hover:text-foreground transition-colors">
                  {file.fileName}
                </span>
                <span className="text-[10px] text-muted-foreground truncate block">
                  {file.drivePath}
                </span>
              </div>

              {/* Size */}
              {file.sizeBytes && (
                <span className="text-[10px] text-muted-foreground font-mono tabular-nums shrink-0">
                  {formatSize(file.sizeBytes)}
                </span>
              )}

              {/* Strategy badge */}
              <span
                className={cn(
                  "text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0",
                  file.linkStrategy === "path"
                    ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                    : file.linkStrategy === "manual"
                      ? "bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400"
                      : "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400",
                )}
              >
                {file.linkStrategy}
              </span>

              {/* External link */}
              <ExternalLink className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
