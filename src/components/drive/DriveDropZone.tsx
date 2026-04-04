"use client";

import { useState, useCallback, useRef, type DragEvent, type ReactNode } from "react";
import { Upload } from "lucide-react";

// ─── Props ──────────────────────────────────────────────────────────

interface DriveDropZoneProps {
  folderId: string;
  onFilesDropped?: (files: File[]) => void;
  children: ReactNode;
}

// ─── Component ──────────────────────────────────────────────────────

export function DriveDropZone({
  folderId,
  onFilesDropped,
  children,
}: DriveDropZoneProps) {
  // Counter-based tracking to handle nested element dragenter/dragleave
  const dragCounterRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0 && onFilesDropped) {
        onFilesDropped(droppedFiles);
      }
    },
    [onFilesDropped]
  );

  return (
    <div
      className="relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {/* ── Drop overlay ── */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 backdrop-blur-sm transition-opacity duration-200">
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-emerald-500/50 bg-neutral-900/60 px-6 md:px-16 py-8 md:py-12">
            <div className="rounded-xl bg-emerald-500/10 p-4">
              <Upload className="h-10 w-10 text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-neutral-200">
                Solte para enviar
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                Os arquivos serao enviados para a pasta atual
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
