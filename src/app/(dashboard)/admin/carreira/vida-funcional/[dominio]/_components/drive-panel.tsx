"use client";

import { FileText, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

export function DrivePanel({ folderId }: { folderId: string }) {
  const { data, isLoading } = trpc.drive.files.useQuery({ folderId, limit: 50 }, { enabled: !!folderId });
  // Adapt: DB rows have numeric `id` and string `driveFileId` (the real Drive file ID)
  const files = (data?.files ?? []) as Array<{ id: number; driveFileId: string; name: string; webViewLink?: string | null }>;

  return (
    <div className="mt-2 rounded-lg border border-border/60 bg-neutral-50 dark:bg-neutral-900/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Drive</span>
        <a
          href={`https://drive.google.com/drive/folders/${folderId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
        >
          Abrir pasta <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando arquivos…</p>
      ) : files.length === 0 ? (
        <p className="text-xs text-muted-foreground">Pasta vazia ou sem acesso.</p>
      ) : (
        <ul className="space-y-1">
          {files.map((f) => (
            <li key={f.id}>
              <a
                href={f.webViewLink ?? `https://drive.google.com/file/d/${f.driveFileId}/view`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span className="truncate">{f.name}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
