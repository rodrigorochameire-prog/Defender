"use client";
import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ACCEPTED_MIME } from "@/lib/registros/anexo-utils";

export function AnexoDropzone({
  onFiles, children, className, dragHint,
}: { onFiles: (files: File[]) => void; children: React.ReactNode; className?: string; dragHint?: React.ReactNode }) {
  const [over, setOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      (ACCEPTED_MIME as readonly string[]).includes(f.type));
    if (files.length) onFiles(files);
  }, [onFiles]);

  return (
    <div
      data-testid="anexo-dropzone"
      onDragOver={(e) => { e.preventDefault(); if (!over) setOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false); }}
      onDrop={handleDrop}
      className={cn("relative", over && "ring-2 ring-emerald-400/70 ring-inset rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20", className)}
    >
      {children}
      {over && dragHint && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-white/85 dark:bg-neutral-900/85 px-2.5 py-1 rounded-md shadow-sm">
            {dragHint}
          </span>
        </div>
      )}
    </div>
  );
}
