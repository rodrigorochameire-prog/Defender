"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  X,
  Search,
  FileText,
  ChevronDown,
  Loader2,
  Columns,
  FolderOpen,
  Files,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";

// ─── Types ──────────────────────────────────────────────────────────

interface CompareFile {
  id: number;
  name: string;
  webViewLink: string;
  driveFolderId?: string;
  driveFileId?: string;
}

interface DocumentCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFileA?: CompareFile;
  /** driveFolderId of the initial file, to prioritize sibling files */
  currentFolderId?: string;
  /** assistidoId context for broader file search */
  assistidoId?: number;
}

// ─── File Selector (Improved with folder grouping) ───────────────

function FileSelector({
  label,
  selectedFile,
  onSelect,
  sameFolderFiles,
  otherFiles,
  isLoading,
  allowSameFile,
}: {
  label: string;
  selectedFile: CompareFile | null;
  onSelect: (file: CompareFile) => void;
  sameFolderFiles: CompareFile[];
  otherFiles: CompareFile[];
  isLoading: boolean;
  allowSameFile?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const filterFn = (f: CompareFile) =>
    search ? f.name.toLowerCase().includes(search.toLowerCase()) : true;

  const filteredSameFolder = useMemo(
    () => sameFolderFiles.filter(filterFn),
    [sameFolderFiles, search]
  );
  const filteredOther = useMemo(
    () => otherFiles.filter(filterFn),
    [otherFiles, search]
  );

  const hasResults = filteredSameFolder.length > 0 || filteredOther.length > 0;

  const renderFile = (file: CompareFile) => (
    <button
      key={`${file.id}-${file.name}`}
      type="button"
      onClick={() => {
        onSelect(file);
        setIsOpen(false);
        setSearch("");
      }}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors",
        selectedFile?.id === file.id &&
          "bg-violet-50 dark:bg-violet-900/20"
      )}
    >
      <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
      <span className="truncate text-neutral-700 dark:text-neutral-300">
        {file.name}
      </span>
    </button>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors",
          selectedFile
            ? "border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20"
            : "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 hover:border-neutral-300"
        )}
      >
        <FileText className="w-4 h-4 text-neutral-400 shrink-0" />
        <span
          className={cn(
            "text-sm truncate flex-1",
            selectedFile
              ? "text-neutral-900 dark:text-neutral-100 font-medium"
              : "text-neutral-400"
          )}
        >
          {selectedFile ? selectedFile.name : `Selecionar ${label}...`}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-neutral-400 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl max-h-[380px] overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-neutral-100 dark:border-neutral-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar arquivo..."
                className="h-8 pl-8 text-xs rounded-md"
                autoFocus
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-[320px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
              </div>
            ) : !hasResults ? (
              <div className="text-center py-6 text-xs text-neutral-400">
                Nenhum arquivo encontrado
              </div>
            ) : (
              <>
                {/* Same folder section */}
                {filteredSameFolder.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50/50 dark:bg-emerald-900/10 border-b border-neutral-100 dark:border-neutral-800">
                      <FolderOpen className="w-3 h-3 text-emerald-500" />
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        Mesma pasta
                      </span>
                      <Badge
                        variant="outline"
                        className="ml-auto text-[9px] px-1.5 py-0 h-4 text-emerald-500 border-emerald-300 dark:border-emerald-700"
                      >
                        {filteredSameFolder.length}
                      </Badge>
                    </div>
                    {filteredSameFolder.map(renderFile)}
                  </div>
                )}

                {/* Other files section */}
                {filteredOther.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800/30 border-b border-neutral-100 dark:border-neutral-800">
                      <Files className="w-3 h-3 text-neutral-400" />
                      <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Outros arquivos
                      </span>
                      <Badge
                        variant="outline"
                        className="ml-auto text-[9px] px-1.5 py-0 h-4 text-neutral-400 border-neutral-300 dark:border-neutral-700"
                      >
                        {filteredOther.length}
                      </Badge>
                    </div>
                    {filteredOther.map(renderFile)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PDF Panel ──────────────────────────────────────────────────────

function PdfPanel({
  file,
  label,
}: {
  file: CompareFile | null;
  label: string;
}) {
  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg">
        <div className="text-center">
          <FileText className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
          <p className="text-sm text-neutral-400">Selecione {label}</p>
        </div>
      </div>
    );
  }

  // Use proxy to avoid Google CSP frame-ancestors block
  const previewUrl = file.driveFileId
    ? `/api/drive/proxy?fileId=${file.driveFileId}`
    : "";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700 rounded-t-lg">
        <p
          className="text-xs font-medium text-neutral-600 dark:text-neutral-400 truncate"
          title={file.name}
        >
          {file.name}
        </p>
      </div>
      <div className="flex-1 rounded-b-lg overflow-hidden border border-t-0 border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900">
        {previewUrl ? (
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title={file.name}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-400 text-sm">
            Preview indisponivel
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function DocumentCompareModal({
  isOpen,
  onClose,
  initialFileA,
  currentFolderId,
  assistidoId,
}: DocumentCompareModalProps) {
  const [fileA, setFileA] = useState<CompareFile | null>(
    initialFileA || null
  );
  const [fileB, setFileB] = useState<CompareFile | null>(null);

  // Fetch all files for the selector
  const { data: driveFiles, isLoading } =
    trpc.drive.getFilesWithEnrichmentStatus.useQuery(
      { assistidoId, limit: 500 } as any,
      {
        enabled: isOpen,
        select: (data: any) => {
          const files = (data?.files || data || []) as any[];
          return files
            .filter((f: any) => {
              const mime = f.mimeType || "";
              return mime.includes("pdf") && f.webViewLink;
            })
            .map((f: any) => ({
              id: f.id,
              name: f.name,
              webViewLink: f.webViewLink || "",
              driveFolderId: f.driveFolderId || "",
              driveFileId: f.driveFileId || "",
            }));
        },
      }
    );

  const allFiles = driveFiles || [];

  // Determine the folder to group by: use currentFolderId prop, or infer from initialFileA
  const folderId =
    currentFolderId || initialFileA?.driveFolderId || "";

  // Split files into "same folder" and "others"
  const { sameFolderFiles, otherFiles } = useMemo(() => {
    if (!folderId) {
      return { sameFolderFiles: [] as CompareFile[], otherFiles: allFiles };
    }
    const same: CompareFile[] = [];
    const other: CompareFile[] = [];
    for (const f of allFiles) {
      if (f.driveFolderId === folderId) {
        same.push(f);
      } else {
        other.push(f);
      }
    }
    return { sameFolderFiles: same, otherFiles: other };
  }, [allFiles, folderId]);

  // Reset fileA to initial when modal opens
  useEffect(() => {
    if (isOpen && initialFileA) {
      setFileA(initialFileA);
      setFileB(null);
    }
  }, [isOpen, initialFileA]);

  // Swap files
  const handleSwap = () => {
    const tmp = fileA;
    setFileA(fileB);
    setFileB(tmp);
  };

  // Check if same file selected on both panels
  const isSameFileMode = fileA && fileB && fileA.id === fileB.id;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Columns className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Comparar Documentos
            </h2>
            <p className="text-[10px] text-neutral-400">
              {isSameFileMode
                ? "Comparando páginas do mesmo arquivo"
                : "Visualize dois PDFs lado a lado"}
            </p>
          </div>
        </div>

        {/* File Selectors */}
        <div className="flex-1 flex items-center gap-2 max-w-3xl mx-auto">
          <div className="flex-1">
            <FileSelector
              label="Documento A"
              selectedFile={fileA}
              onSelect={setFileA}
              sameFolderFiles={sameFolderFiles}
              otherFiles={otherFiles}
              isLoading={isLoading}
              allowSameFile
            />
          </div>

          {/* Swap / VS badge */}
          <button
            type="button"
            onClick={handleSwap}
            title="Trocar documentos"
            className="shrink-0 group"
          >
            <Badge
              variant="outline"
              className="text-[9px] px-2 py-0.5 text-violet-500 border-violet-300 dark:border-violet-700 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 mr-1 group-hover:rotate-180 transition-transform duration-300" />
              VS
            </Badge>
          </button>

          <div className="flex-1">
            <FileSelector
              label="Documento B"
              selectedFile={fileB}
              onSelect={setFileB}
              sameFolderFiles={sameFolderFiles}
              otherFiles={otherFiles}
              isLoading={isLoading}
              allowSameFile
            />
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            onClose();
            setFileA(initialFileA || null);
            setFileB(null);
          }}
          className="h-8 w-8 text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300 shrink-0"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Same-file hint */}
      {isSameFileMode && (
        <div className="px-4 py-1.5 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-200 dark:border-amber-800/30 text-center">
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            Mesmo arquivo selecionado em ambos os painéis — navegue independentemente para comparar páginas diferentes
          </p>
        </div>
      )}

      {/* Content: Side-by-side PDFs */}
      <div className="flex-1 flex gap-3 p-3 min-h-0">
        <PdfPanel file={fileA} label="Documento A" />
        <PdfPanel file={fileB} label="Documento B" />
      </div>
    </div>
  );
}
