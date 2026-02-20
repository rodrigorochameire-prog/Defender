"use client";

import { FileText, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type DriveFile = {
  id: number;
  name: string;
  mimeType: string | null;
  webViewLink: string | null;
  lastModifiedTime: string | null;
  isFolder: boolean | null;
  driveFolderId: string | null;
};

function groupByMonth(files: DriveFile[]): Map<string, DriveFile[]> {
  const map = new Map<string, DriveFile[]>();
  for (const f of files) {
    const key = f.lastModifiedTime
      ? format(parseISO(f.lastModifiedTime), "MMMM yyyy", { locale: ptBR })
      : "Sem data";
    const list = map.get(key) ?? [];
    list.push(f);
    map.set(key, list);
  }
  return map;
}

export function TimelineDocumental({ files }: { files: DriveFile[] }) {
  const onlyFiles = files.filter((f) => !f.isFolder);

  if (onlyFiles.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-400">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-[11px]">Nenhum documento na timeline</p>
      </div>
    );
  }

  const grouped = groupByMonth(onlyFiles);

  return (
    <div className="max-h-96 overflow-y-auto space-y-4">
      {Array.from(grouped.entries()).map(([month, monthFiles]) => (
        <div key={month}>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide px-1 mb-1.5">
            {month}
          </p>
          <div className="space-y-0.5">
            {monthFiles.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 group cursor-pointer"
                onClick={() => f.webViewLink && window.open(f.webViewLink, "_blank")}
              >
                <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate flex-1">
                  {f.name}
                </span>
                {f.lastModifiedTime && (
                  <span className="text-[10px] text-zinc-400 shrink-0">
                    {format(parseISO(f.lastModifiedTime), "dd/MM HH'h'mm", { locale: ptBR })}
                  </span>
                )}
                {f.webViewLink && (
                  <ExternalLink className="h-3 w-3 text-zinc-300 group-hover:text-emerald-500 shrink-0 transition-colors" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
