"use client";
import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ACCEPTED_MIME } from "@/lib/registros/anexo-utils";

export function AnexoDropzone({
  onFiles, children, className,
}: { onFiles: (files: File[]) => void; children: React.ReactNode; className?: string }) {
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
      className={cn(over && "ring-2 ring-emerald-400/70 ring-inset rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20", className)}
    >
      {children}
    </div>
  );
}
