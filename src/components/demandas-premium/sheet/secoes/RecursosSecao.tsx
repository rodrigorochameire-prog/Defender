// @ts-nocheck
"use client";

import { Mic, Video, FileText, FileSignature } from "lucide-react";

interface Props {
  midiasFlat: any[];
  pdfFiles: any[];
  driveFolderUrl: string | null;
  /** Opens the doca (left-side PDF panel) with the given file ID */
  onOpenPreview: (fileId: string) => void;
}

export function RecursosSecao({ midiasFlat, pdfFiles, driveFolderUrl, onOpenPreview }: Props) {
  if (midiasFlat.length === 0 && pdfFiles.length === 0) return null;

  return (
    <>
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-1 pt-1">
        Recursos
      </h3>

      <div className="rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800 px-3.5 py-2.5 space-y-2">
        {/* Mídias strip — áudios e vídeos */}
        {midiasFlat.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
                Mídias
                <span className="ml-1.5 text-neutral-400 font-normal normal-case">{midiasFlat.length}</span>
              </span>
              {driveFolderUrl && (
                <a
                  href={driveFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Drive →
                </a>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {midiasFlat.slice(0, 8).map((m: any) => {
                const isAudio = (m.mimeType || "").startsWith("audio/");
                const Icon = isAudio ? Mic : Video;
                return (
                  <a
                    key={m.id}
                    href={m.webViewLink || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 max-w-[160px] transition-colors"
                    title={m.name || (isAudio ? "Áudio" : "Vídeo")}
                  >
                    <Icon className={`w-3 h-3 shrink-0 ${isAudio ? "text-amber-600 dark:text-amber-400" : "text-purple-600 dark:text-purple-400"}`} />
                    <span className="text-[10px] text-neutral-700 dark:text-neutral-300 truncate">
                      {m.name || (isAudio ? "Áudio" : "Vídeo")}
                    </span>
                    {m.hasAnalysis && (
                      <span className="shrink-0 w-1 h-1 rounded-full bg-emerald-500" title="Analisado" />
                    )}
                  </a>
                );
              })}
              {midiasFlat.length > 8 && driveFolderUrl && (
                <a
                  href={driveFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 text-[10px] text-neutral-500 transition-colors"
                >
                  +{midiasFlat.length - 8}
                </a>
              )}
            </div>
          </div>
        )}

        {/* PDFs strip — wrap chips compactos com fallback se sem nome */}
        {pdfFiles.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
                PDFs
                <span className="ml-1.5 text-neutral-400 font-normal normal-case">{pdfFiles.length}</span>
              </span>
              {driveFolderUrl && (
                <a
                  href={driveFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Drive →
                </a>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {pdfFiles.slice(0, 8).map((f: any, idx: number) => {
                const nameLower = (f.name || "").toLowerCase();
                const isAnalise =
                  nameLower.includes("análise") ||
                  nameLower.includes("analise") ||
                  nameLower.includes("relatório") ||
                  nameLower.includes("relatorio");
                const Icon = isAnalise ? FileSignature : FileText;
                const displayName = f.name || `PDF ${idx + 1}`;
                const canPreview = !!f.driveFileId;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canPreview) onOpenPreview(f.driveFileId);
                      else if (f.webViewLink) window.open(f.webViewLink, "_blank");
                    }}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md max-w-[160px] transition-colors cursor-pointer ${
                      isAnalise
                        ? "bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-900/30"
                        : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    }`}
                    title={`${displayName} — abrir aqui`}
                  >
                    <Icon className={`w-3 h-3 shrink-0 ${isAnalise ? "text-sky-600 dark:text-sky-400" : "text-neutral-400"}`} />
                    <span className={`text-[10px] truncate ${isAnalise ? "text-sky-700 dark:text-sky-300 font-medium" : "text-neutral-700 dark:text-neutral-300"}`}>
                      {displayName}
                    </span>
                  </button>
                );
              })}
              {pdfFiles.length > 8 && driveFolderUrl && (
                <a
                  href={driveFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 text-[10px] text-neutral-500 transition-colors"
                >
                  +{pdfFiles.length - 8}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
