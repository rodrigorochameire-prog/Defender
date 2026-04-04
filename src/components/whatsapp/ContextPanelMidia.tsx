"use client";

import { useState } from "react";
import { Image, FileText, Mic, File, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface ContextPanelMidiaProps {
  contactId: number;
  configId: number;
}

type FilterType = "all" | "image" | "document" | "audio";

// =============================================================================
// HELPERS
// =============================================================================

function getTypeIcon(type: string) {
  switch (type) {
    case "image":
      return <Image className="h-4 w-4 text-muted-foreground" />;
    case "audio":
      return <Mic className="h-4 w-4 text-muted-foreground" />;
    case "document":
      return <FileText className="h-4 w-4 text-muted-foreground" />;
    default:
      return <File className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ContextPanelMidia({ contactId }: ContextPanelMidiaProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const { data, isLoading } = trpc.whatsappChat.listMessages.useQuery(
    { contactId, limit: 100 },
    { enabled: !!contactId }
  );

  const mediaMessages = (data?.messages ?? []).filter((m) =>
    ["image", "audio", "document", "video"].includes(m.type)
  );

  const filtered = activeFilter === "all"
    ? mediaMessages
    : mediaMessages.filter((m) => {
        if (activeFilter === "audio") return m.type === "audio";
        if (activeFilter === "image") return m.type === "image" || m.type === "video";
        if (activeFilter === "document") return m.type === "document";
        return true;
      });

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "image", label: "Imagens" },
    { key: "document", label: "Docs" },
    { key: "audio", label: "Áudio" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Filter chips */}
      <div className="flex gap-1 px-3 py-2 border-b border-neutral-200 dark:border-border">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={cn(
              "px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer",
              activeFilter === key
                ? "bg-neutral-200 dark:bg-muted text-neutral-900 dark:text-foreground"
                : "bg-transparent text-muted-foreground hover:text-neutral-700 dark:hover:text-foreground/80"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
            <File className="h-8 w-8 text-neutral-300 dark:text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">Nenhuma mídia encontrada</p>
          </div>
        ) : (
          <div className="px-3 py-2 space-y-1">
            {filtered.map((msg) => (
              <div
                key={msg.id}
                className="flex items-center gap-2 rounded-md p-2 hover:bg-neutral-100 dark:hover:bg-muted/50 transition-colors group"
              >
                <div className="w-7 h-7 rounded-md bg-neutral-100 dark:bg-muted flex items-center justify-center flex-shrink-0">
                  {getTypeIcon(msg.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-neutral-900 dark:text-foreground truncate">
                    {msg.mediaFilename || msg.content || `${msg.type}`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {msg.mediaMimeType?.split("/")[1]?.toUpperCase() ?? msg.type.toUpperCase()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
