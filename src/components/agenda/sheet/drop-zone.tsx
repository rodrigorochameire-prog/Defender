"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onFiles: (files: File[]) => void;
  onReject?: (file: File, reason: string) => void;
  maxSizeMB?: number;
  disabled?: boolean;
  accept?: string;
  label?: string;
}

export function DropZone({
  onFiles,
  onReject,
  maxSizeMB = 50,
  disabled = false,
  accept,
  label = "Arraste arquivos aqui ou clique para subir",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (filesList: FileList | File[] | null) => {
    if (!filesList) return;
    const files = Array.from(filesList);
    const accepted: File[] = [];
    for (const f of files) {
      if (f.size > maxSizeMB * 1024 * 1024) {
        onReject?.(f, `Arquivo muito grande (máx ${maxSizeMB} MB)`);
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length > 0) onFiles(accepted);
  };

  return (
    <div
      data-testid="drop-zone"
      onDragEnter={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragOver={(e) => { e.preventDefault(); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "rounded-lg border border-dashed px-3 py-3 flex items-center justify-center gap-2 text-[11px] transition-colors cursor-pointer",
        dragging
          ? "border-emerald-500 bg-emerald-50/30 text-emerald-700"
          : "border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:border-neutral-400",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <Upload className="w-3.5 h-3.5" />
      <span>{label}</span>
      <label className="sr-only" htmlFor="drop-zone-input">upload</label>
      <input
        id="drop-zone-input"
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        disabled={disabled}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
