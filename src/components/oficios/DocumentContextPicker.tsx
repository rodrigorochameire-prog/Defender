"use client";

import { useState, useMemo } from "react";
import {
  FileText,
  File,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  HardDrive,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";

interface DocumentContextPickerProps {
  assistidoId?: number;
  processoId?: number;
  casoId?: number;
  selectedDriveFileIds: number[];
  selectedDocumentoIds: number[];
  onDriveFileIdsChange: (ids: number[]) => void;
  onDocumentoIdsChange: (ids: number[]) => void;
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getFileIcon(mimeType: string | null | undefined) {
  if (!mimeType) return File;
  if (mimeType.includes("pdf")) return FileText;
  if (mimeType.includes("document") || mimeType.includes("word")) return FileText;
  return File;
}

export default function DocumentContextPicker({
  assistidoId,
  processoId,
  casoId,
  selectedDriveFileIds,
  selectedDocumentoIds,
  onDriveFileIdsChange,
  onDocumentoIdsChange,
}: DocumentContextPickerProps) {
  const [search, setSearch] = useState("");

  const hasFilters = !!(assistidoId || processoId || casoId);

  const { data, isLoading } = trpc.oficios.getDocumentosParaContexto.useQuery(
    { assistidoId, processoId, casoId },
    { enabled: hasFilters }
  );

  const documentos = data?.documentos || [];
  const driveFilesData = data?.driveFiles || [];

  // Filter by search
  const filteredDocs = useMemo(() => {
    if (!search) return documentos;
    const term = search.toLowerCase();
    return documentos.filter(
      (d) =>
        (d.titulo || "").toLowerCase().includes(term) ||
        (d.fileName || "").toLowerCase().includes(term)
    );
  }, [documentos, search]);

  const filteredDrive = useMemo(() => {
    if (!search) return driveFilesData;
    const term = search.toLowerCase();
    return driveFilesData.filter((f) => f.name.toLowerCase().includes(term));
  }, [driveFilesData, search]);

  const totalSelected = selectedDocumentoIds.length + selectedDriveFileIds.length;
  const hasItems = filteredDocs.length > 0 || filteredDrive.length > 0;

  const toggleDocumento = (id: number) => {
    if (selectedDocumentoIds.includes(id)) {
      onDocumentoIdsChange(selectedDocumentoIds.filter((x) => x !== id));
    } else {
      onDocumentoIdsChange([...selectedDocumentoIds, id]);
    }
  };

  const toggleDriveFile = (id: number) => {
    if (selectedDriveFileIds.includes(id)) {
      onDriveFileIdsChange(selectedDriveFileIds.filter((x) => x !== id));
    } else {
      onDriveFileIdsChange([...selectedDriveFileIds, id]);
    }
  };

  if (!hasFilters) {
    return (
      <div className="rounded-xl border border-border/40 bg-muted/20 p-6 text-center">
        <FolderOpen className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
        <p className="text-sm text-muted-foreground">
          Selecione um assistido ou processo para ver documentos disponiveis
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/40 bg-muted/20 p-8 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-500 mr-2" />
        <span className="text-sm text-muted-foreground">Carregando documentos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      {hasItems && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50 border-border text-foreground h-8 text-xs"
          />
        </div>
      )}

      <div className="rounded-xl border border-border/40 bg-muted/20 max-h-[300px] overflow-y-auto">
        {/* Documentos vinculados */}
        {filteredDocs.length > 0 && (
          <div>
            <div className="sticky top-0 bg-card/90 backdrop-blur-sm px-3 py-1.5 border-b border-border/40">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Documentos Vinculados ({filteredDocs.length})
                </span>
              </div>
            </div>
            {filteredDocs.map((doc) => {
              const isSelected = selectedDocumentoIds.includes(doc.id);
              const Icon = getFileIcon(doc.mimeType);
              return (
                <label
                  key={`doc-${doc.id}`}
                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors
                    hover:bg-muted/30 ${isSelected ? "bg-emerald-500/5" : ""}`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleDocumento(doc.id)}
                    className="border-border data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-foreground truncate block">
                      {doc.titulo || doc.fileName || `Documento #${doc.id}`}
                    </span>
                    {doc.fileSize && (
                      <span className="text-[10px] text-muted-foreground/60">{formatFileSize(doc.fileSize)}</span>
                    )}
                  </div>
                  {doc.hasContent ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" title="Conteudo ja extraido" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Sera extraido sob demanda" />
                  )}
                </label>
              );
            })}
          </div>
        )}

        {/* Drive files */}
        {filteredDrive.length > 0 && (
          <div>
            <div className="sticky top-0 bg-card/90 backdrop-blur-sm px-3 py-1.5 border-b border-border/40">
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Arquivos do Drive ({filteredDrive.length})
                </span>
              </div>
            </div>
            {filteredDrive.map((file) => {
              const isSelected = selectedDriveFileIds.includes(file.id);
              const Icon = getFileIcon(file.mimeType);
              return (
                <label
                  key={`drive-${file.id}`}
                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors
                    hover:bg-muted/30 ${isSelected ? "bg-emerald-500/5" : ""}`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleDriveFile(file.id)}
                    className="border-border data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-foreground truncate block">{file.name}</span>
                    {file.size && (
                      <span className="text-[10px] text-muted-foreground/60">{formatFileSize(file.size)}</span>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[9px] border-border/50 text-muted-foreground shrink-0">
                    Drive
                  </Badge>
                </label>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!hasItems && (
          <div className="p-6 text-center">
            <FolderOpen className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
            <p className="text-sm text-muted-foreground">
              {search ? "Nenhum documento encontrado" : "Nenhum documento vinculado ao assistido/processo"}
            </p>
          </div>
        )}
      </div>

      {/* Selected count */}
      {totalSelected > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{totalSelected} documento{totalSelected > 1 ? "s" : ""} selecionado{totalSelected > 1 ? "s" : ""}</span>
        </div>
      )}
    </div>
  );
}
