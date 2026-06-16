// @ts-nocheck
"use client";

import React, { useRef } from "react";
import {
  FileText,
  ArrowRight,
  FolderOpen,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Loader2,
  Upload,
  File,
  Image,
  FileSpreadsheet,
} from "lucide-react";
import { SectionsViewer } from "@/components/drive/SectionsViewer";
import type { PreviewFile } from "@/components/agenda/registro-audiencia/shared/document-preview-dialog";

interface Props {
  processoId?: number | null;
  assistidoId?: number | null;
  primaryAutos: PreviewFile | null;
  previewFiles: PreviewFile[];
  autosAgrupados: any;
  driveFolder: any;
  driveFolderLoading: boolean;
  uploadingFiles: string[];
  docsOpen: boolean;
  createDriveFolderPending?: boolean;
  onToggleDocs: () => void;
  onOpenDoca: (fileId: string, page?: number) => void;
  onOpenPreview: (fileId: string) => void;
  onUploadFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCreateDriveFolder: () => void;
}

function DriveFileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  if (mimeType.startsWith("image/")) return <Image className={className} />;
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("csv")
  )
    return <FileSpreadsheet className={className} />;
  return <File className={className} />;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AutosSecao(props: Props) {
  const {
    processoId,
    assistidoId,
    primaryAutos,
    previewFiles,
    driveFolder,
    driveFolderLoading,
    uploadingFiles,
    docsOpen,
    createDriveFolderPending,
    onToggleDocs,
    onOpenDoca,
    onUploadFiles,
    onCreateDriveFolder,
  } = props;

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {/* ===== AUTOS EM DESTAQUE — visualização inline (sem sair da plataforma) ===== */}
      {primaryAutos && (
        <div className="rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800 overflow-hidden">
          <button
            type="button"
            onClick={() => onOpenDoca(primaryAutos.driveFileId)}
            className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer text-left group/autos"
          >
            <span className="shrink-0 w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center ring-1 ring-sky-100 dark:ring-sky-900/40">
              <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold text-foreground">Ver autos</span>
              <span
                className="block text-[11px] text-neutral-500 dark:text-neutral-400 truncate"
                title={primaryAutos.name ?? undefined}
              >
                {primaryAutos.name ?? "Documento do processo"}
                {previewFiles.length > 1 && (
                  <span className="text-neutral-400">
                    {" "}
                    · +{previewFiles.length - 1} doc
                    {previewFiles.length - 1 > 1 ? "s" : ""}
                  </span>
                )}
              </span>
            </span>
            <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 dark:text-sky-400 opacity-0 group-hover/autos:opacity-100 transition-opacity">
              Abrir <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      )}

      {/* ===== ATOS — seções dos autos por tipo (clique doca o PDF na página) ===== */}
      {processoId && (
        <>
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-1 pt-1">
            Atos
          </h3>
          <div className="rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800 px-3.5 py-2.5">
            <SectionsViewer
              processoId={processoId}
              assistidoId={assistidoId ?? 0}
              onOpenSection={(s) => {
                if (s.fileDriveId) onOpenDoca(s.fileDriveId, s.paginaInicio);
              }}
            />
          </div>
        </>
      )}

      {/* ===== DOCUMENTOS (Drive) ===== */}
      <div className="rounded-xl border border-neutral-200/60 dark:border-neutral-700/40 overflow-hidden">
        {/* Collapsible header */}
        <button
          onClick={onToggleDocs}
          className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
        >
          <FolderOpen className="w-4 h-4 text-neutral-400 shrink-0" />
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Documentos
          </span>
          {driveFolder?.files && driveFolder.files.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/40">
              {driveFolder.files.length}
            </span>
          )}
          {driveFolder?.folderUrl && (
            <a
              href={driveFolder.folderUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="ml-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              title="Abrir pasta no Drive"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <div className="ml-auto">
            {docsOpen ? (
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            ) : (
              <ChevronRight className="w-3 h-3 text-neutral-400" />
            )}
          </div>
        </button>

        {/* Expanded content */}
        {docsOpen && (
          <div className="border-t border-neutral-200/40 dark:border-neutral-700/30">
            {/* Loading state */}
            {driveFolderLoading && (
              <div className="flex items-center justify-center gap-2 py-5 text-neutral-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Carregando...</span>
              </div>
            )}

            {/* Drive not configured */}
            {!driveFolderLoading && driveFolder && !driveFolder.configured && (
              <div className="px-4 py-4 text-center">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                  Google Drive não configurado
                </p>
                <a
                  href="/admin/settings/drive"
                  className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Configurar Drive
                </a>
              </div>
            )}

            {/* No folder exists yet */}
            {!driveFolderLoading && driveFolder?.configured && !driveFolder.folderId && (
              <div className="px-4 py-4 text-center">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                  Nenhuma pasta vinculada a esta demanda
                </p>
                <button
                  onClick={onCreateDriveFolder}
                  disabled={createDriveFolderPending}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {createDriveFolderPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FolderOpen className="w-3.5 h-3.5" />
                  )}
                  Criar pasta no Drive
                </button>
              </div>
            )}

            {/* File list */}
            {!driveFolderLoading && driveFolder?.configured && driveFolder.folderId && (
              <>
                {driveFolder.files.length === 0 ? (
                  <div className="px-4 py-3 text-center text-xs text-neutral-400 dark:text-neutral-500">
                    Nenhum arquivo na pasta
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                    {driveFolder.files.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-2 px-4 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors group/file"
                      >
                        <DriveFileIcon
                          mimeType={f.mimeType}
                          className="w-3.5 h-3.5 text-neutral-400 shrink-0"
                        />
                        <span
                          className="text-xs text-neutral-700 dark:text-neutral-300 flex-1 truncate"
                          title={f.name}
                        >
                          {f.name}
                        </span>
                        {f.size !== null && (
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 shrink-0">
                            {formatBytes(f.size)}
                          </span>
                        )}
                        {f.webViewLink && (
                          <a
                            href={f.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover/file:opacity-100 transition-opacity text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                            title="Abrir no Drive"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload area */}
                <div className="px-4 py-2.5 border-t border-neutral-100 dark:border-neutral-800/60">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.heic,.webp"
                    className="hidden"
                    onChange={onUploadFiles}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFiles.length > 0}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-600 text-xs text-neutral-500 dark:text-neutral-400 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 dark:hover:border-emerald-600 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {uploadingFiles.length > 0 ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Enviando {uploadingFiles.length} arquivo
                        {uploadingFiles.length > 1 ? "s" : ""}...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        Enviar documento
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
