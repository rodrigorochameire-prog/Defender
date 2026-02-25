"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useDriveContext } from "./DriveContext";
import {
  getFileIcon,
  getFileTypeLabel,
  formatFileSize,
  getEnrichmentBadge,
} from "./drive-constants";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  X,
  Download,
  ExternalLink,
  Pencil,
  Star,
  ChevronDown,
  ChevronRight,
  Search,
  Loader2,
  Sparkles,
  User,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  Link2,
  Brain,
  Scale,
  FileText,
  Check,
  RotateCcw,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────

interface DriveFile {
  id: number;
  driveFileId: string;
  name: string;
  mimeType: string | null;
  fileSize: number | null;
  size?: number | null;
  isFolder: boolean;
  webViewLink: string | null;
  webContentLink?: string | null;
  thumbnailLink: string | null;
  enrichmentStatus: string | null;
  enrichmentError?: string | null;
  categoria?: string | null;
  documentType?: string | null;
  assistidoId: number | null;
  processoId: number | null;
  createdAt: Date;
  updatedAt?: Date | null;
  lastModifiedTime?: Date | null;
  driveFolderId: string;
  parentFileId?: number | null;
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  try {
    return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return "-";
  }
}

function maskCpf(cpf: string | null | undefined): string {
  if (!cpf) return "-";
  if (cpf.length < 11) return cpf;
  // Show first 3 and last 2: 123.***.***-45
  return `${cpf.slice(0, 3)}.***.***-${cpf.slice(-2)}`;
}

function getFavorites(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem("drive-favorites");
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function toggleFavorite(fileId: number): boolean {
  const favs = getFavorites();
  if (favs.has(fileId)) {
    favs.delete(fileId);
  } else {
    favs.add(fileId);
  }
  localStorage.setItem("drive-favorites", JSON.stringify([...favs]));
  return favs.has(fileId);
}

function getPrazoBadgeClass(prazoFatal: string | Date | null): string {
  if (!prazoFatal) return "bg-zinc-500/10 text-zinc-400 border-zinc-500/30";
  const days = differenceInDays(new Date(prazoFatal), new Date());
  if (days < 0) return "bg-red-500/10 text-red-400 border-red-500/30";
  if (days <= 3) return "bg-rose-500/10 text-rose-400 border-rose-500/30";
  if (days <= 7) return "bg-amber-500/10 text-amber-400 border-amber-500/30";
  return "bg-zinc-500/10 text-zinc-400 border-zinc-500/30";
}

// ─── Section Header ─────────────────────────────────────────────────

function SectionHeader({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  badge,
}: {
  title: string;
  icon: React.ElementType;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-zinc-800/50 transition-colors duration-150"
    >
      <Icon className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex-1">
        {title}
      </span>
      {badge && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {badge}
        </span>
      )}
      {isOpen ? (
        <ChevronDown className="h-3 w-3 text-zinc-600 shrink-0" />
      ) : (
        <ChevronRight className="h-3 w-3 text-zinc-600 shrink-0" />
      )}
    </button>
  );
}

// ─── Preview Section ────────────────────────────────────────────────

function FilePreview({ file }: { file: DriveFile }) {
  const mimeType = file.mimeType || "";
  const isPdf = mimeType.includes("pdf");
  const isImage = mimeType.startsWith("image/");
  const isAudio = mimeType.startsWith("audio/");
  const isGoogleDoc =
    mimeType.includes("google-apps.document") ||
    mimeType.includes("google-apps.spreadsheet");

  if (isPdf && file.webViewLink) {
    return (
      <div className="aspect-video bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
        <iframe
          src={`${file.webViewLink.replace("/view", "/preview")}`}
          className="w-full h-full border-0"
          title={file.name}
        />
      </div>
    );
  }

  if (isImage) {
    const imgSrc = file.thumbnailLink
      ? file.thumbnailLink.replace("=s220", "=s800")
      : file.webViewLink;
    if (imgSrc) {
      return (
        <div className="aspect-video bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 flex items-center justify-center">
          <a
            href={file.webViewLink || "#"}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={imgSrc}
              alt={file.name}
              className="max-w-full max-h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
            />
          </a>
        </div>
      );
    }
  }

  if (isAudio) {
    const audioSrc = file.webContentLink || file.webViewLink;
    return (
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center">
          {(() => {
            const AudioIcon = getFileIcon(file.mimeType);
            return <AudioIcon className="w-8 h-8 text-cyan-400" />;
          })()}
        </div>
        {audioSrc && (
          <audio controls className="w-full max-w-full" preload="metadata">
            <source src={audioSrc} />
          </audio>
        )}
      </div>
    );
  }

  if (isGoogleDoc && file.webViewLink) {
    return (
      <div className="aspect-video bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
        <iframe
          src={file.webViewLink}
          className="w-full h-full border-0"
          title={file.name}
        />
      </div>
    );
  }

  // Fallback: large file icon + open in Drive
  const FileIcon = getFileIcon(file.mimeType);
  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-8 flex flex-col items-center gap-3">
      <FileIcon className="w-16 h-16 text-zinc-600" />
      <p className="text-xs text-zinc-500">Preview nao disponivel</p>
      {file.webViewLink && (
        <a
          href={file.webViewLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Abrir no Drive
          </Button>
        </a>
      )}
    </div>
  );
}

// ─── Action Buttons Row ─────────────────────────────────────────────

function ActionRow({
  file,
  isFavorited,
  onToggleFavorite,
  onStartRename,
}: {
  file: DriveFile;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onStartRename: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {/* Download / Open */}
      {file.webContentLink && (
        <a href={file.webContentLink} target="_blank" rel="noopener noreferrer">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
        </a>
      )}

      {/* Open in Drive */}
      {file.webViewLink && (
        <a
          href={file.webViewLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
            title="Abrir no Drive"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
      )}

      {/* Rename */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
        title="Renomear"
        onClick={onStartRename}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      {/* Favorite */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8",
          isFavorited
            ? "text-amber-400 hover:text-amber-300"
            : "text-zinc-400 hover:text-zinc-200"
        )}
        title={isFavorited ? "Remover dos favoritos" : "Favoritar"}
        onClick={onToggleFavorite}
      >
        <Star
          className={cn("h-4 w-4", isFavorited && "fill-amber-400")}
        />
      </Button>
    </div>
  );
}

// ─── Inline Rename ──────────────────────────────────────────────────

function InlineRename({
  file,
  onCancel,
  onRenamed,
}: {
  file: DriveFile;
  onCancel: () => void;
  onRenamed: () => void;
}) {
  const [newName, setNewName] = useState(file.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const renameMutation = trpc.drive.renameFile.useMutation({
    onSuccess: () => {
      toast.success("Arquivo renomeado");
      utils.drive.files.invalidate();
      onRenamed();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao renomear");
    },
  });

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const handleSubmit = () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === file.name) {
      onCancel();
      return;
    }
    renameMutation.mutate({ fileId: file.driveFileId, newName: trimmed });
  };

  return (
    <div className="flex items-center gap-1.5">
      <Input
        ref={inputRef}
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") onCancel();
        }}
        className="h-7 text-sm bg-zinc-800 border-zinc-700 text-zinc-200 flex-1"
        disabled={renameMutation.isPending}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-emerald-400 hover:text-emerald-300"
        onClick={handleSubmit}
        disabled={renameMutation.isPending}
      >
        {renameMutation.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-zinc-500 hover:text-zinc-300"
        onClick={onCancel}
        disabled={renameMutation.isPending}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Metadata Section ───────────────────────────────────────────────

function MetadataSection({ file }: { file: DriveFile }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div>
          <SectionHeader
            title="Metadados"
            icon={FileText}
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-3 space-y-2">
          <MetaRow label="Tipo" value={getFileTypeLabel(file.mimeType)} />
          <MetaRow
            label="Tamanho"
            value={formatFileSize(file.fileSize ?? file.size ?? null)}
          />
          <MetaRow label="Criado" value={formatDate(file.createdAt)} />
          <MetaRow
            label="Modificado"
            value={formatDate(file.lastModifiedTime || file.updatedAt)}
          />
          <MetaRow
            label="Drive ID"
            value={
              <span
                className="font-mono text-[10px] text-zinc-600 truncate block max-w-[180px]"
                title={file.driveFileId}
              >
                {file.driveFileId}
              </span>
            }
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[11px] text-zinc-500 shrink-0">{label}</span>
      <span className="text-[11px] text-zinc-300 text-right">{value}</span>
    </div>
  );
}

// ─── Enrichment Section ─────────────────────────────────────────────

function EnrichmentSection({ file }: { file: DriveFile }) {
  const [isOpen, setIsOpen] = useState(true);
  const utils = trpc.useUtils();

  const retryMutation = trpc.drive.retryEnrichment.useMutation({
    onSuccess: () => {
      toast.success("Re-processamento iniciado");
      utils.drive.files.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao re-processar");
    },
  });

  const badge = getEnrichmentBadge(file.enrichmentStatus);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div>
          <SectionHeader
            title="Enrichment"
            icon={Sparkles}
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
            badge={badge.label || undefined}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-3 space-y-3">
          {/* Status badge */}
          {badge.label && (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-[11px] px-2 py-0.5 rounded-full border",
                  badge.class
                )}
              >
                {badge.label}
              </span>
            </div>
          )}

          {/* Document type and categoria */}
          {file.documentType && (
            <MetaRow label="Tipo Detectado" value={file.documentType} />
          )}
          {file.categoria && (
            <MetaRow label="Categoria" value={file.categoria} />
          )}

          {/* Error message */}
          {file.enrichmentError && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-2">
              <p className="text-[10px] text-red-400 break-words">
                {file.enrichmentError}
              </p>
            </div>
          )}

          {/* Retry button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-lg w-full"
            onClick={() => retryMutation.mutate({ fileIds: [file.id] })}
            disabled={
              retryMutation.isPending ||
              file.enrichmentStatus === "processing"
            }
          >
            {retryMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            )}
            Re-processar
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Juridical Context Section ──────────────────────────────────────

function JuridicalContextSection({ file }: { file: DriveFile }) {
  const [isOpen, setIsOpen] = useState(true);

  // Find the parent folder name by extracting from breadcrumb or querying
  // We use the file's driveFolderId to find the folder name
  // For simplicity, we query the assistido based on the folder name
  // The folder's name is usually available in the breadcrumb path
  const ctx = useDriveContext();

  // Get current folder name from breadcrumbs (the innermost folder is most likely the assistido)
  const folderName = useMemo(() => {
    if (ctx.breadcrumbPath.length > 0) {
      // Use the last subfolder (deepest in the path), which usually matches the assistido
      // Skip the root atribuicao folder
      const path = ctx.breadcrumbPath;
      return path.length > 1 ? path[path.length - 1].name : path[0].name;
    }
    return null;
  }, [ctx.breadcrumbPath]);

  const { data: assistido, isLoading } =
    trpc.drive.getAssistidoByFolderName.useQuery(
      { folderName: folderName! },
      { enabled: !!folderName }
    );

  const statusColors: Record<string, string> = {
    SOLTO: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    CADEIA_PUBLICA: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    PENITENCIARIA: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    DOMICILIAR: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    MONITORADO: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div>
          <SectionHeader
            title="Contexto Juridico"
            icon={Scale}
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-3 space-y-3">
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full bg-zinc-800" />
              <Skeleton className="h-6 w-3/4 bg-zinc-800" />
            </div>
          )}

          {!isLoading && !assistido && (
            <div className="text-center py-3">
              <User className="w-8 h-8 mx-auto text-zinc-700 mb-2" />
              <p className="text-[11px] text-zinc-500">
                Nenhum assistido vinculado
              </p>
              {folderName && (
                <p className="text-[10px] text-zinc-600 mt-1">
                  Pasta: {folderName}
                </p>
              )}
            </div>
          )}

          {!isLoading && assistido && (
            <>
              {/* Assistido info */}
              <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                    {assistido.photoUrl ? (
                      <img
                        src={assistido.photoUrl}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-zinc-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {assistido.nome}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      {maskCpf(assistido.cpf)}
                    </p>
                  </div>
                </div>

                {/* Status prisional */}
                {assistido.statusPrisional && (
                  <Badge
                    className={cn(
                      "text-[10px]",
                      statusColors[assistido.statusPrisional] ||
                        "bg-zinc-700/50 text-zinc-400"
                    )}
                  >
                    {assistido.statusPrisional.replace(/_/g, " ")}
                  </Badge>
                )}

                {/* Contact */}
                {assistido.telefone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-zinc-500" />
                    <span className="text-[11px] text-zinc-400">
                      {assistido.telefone}
                    </span>
                  </div>
                )}
                {assistido.localPrisao && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-rose-500" />
                    <span className="text-[11px] text-zinc-400">
                      {assistido.localPrisao}
                    </span>
                  </div>
                )}
              </div>

              {/* Processos */}
              {assistido.processos && assistido.processos.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                    Processos ({assistido.processos.length})
                  </p>
                  <div className="space-y-1">
                    {assistido.processos.map((proc: any) => (
                      <Link
                        key={proc.id}
                        href={`/admin/processos/${proc.id}`}
                      >
                        <div className="bg-zinc-800/50 rounded-md px-2.5 py-1.5 hover:bg-zinc-800 transition-colors cursor-pointer">
                          <p className="text-[11px] font-mono text-zinc-300 truncate">
                            {proc.numero}
                          </p>
                          <p className="text-[10px] text-zinc-500 truncate">
                            {proc.vara || proc.tipoAcao || proc.status}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Demandas pendentes */}
              {assistido.demandas && assistido.demandas.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-amber-500" />
                    Demandas Pendentes
                  </p>
                  <div className="space-y-1">
                    {assistido.demandas.map((dem: any) => (
                      <div
                        key={dem.id}
                        className={cn(
                          "rounded-md px-2.5 py-1.5 border-l-2",
                          dem.prioridade === "URGENTE" ||
                            dem.prioridade === "REU_PRESO"
                            ? "border-rose-500 bg-rose-500/5"
                            : "border-amber-500 bg-amber-500/5"
                        )}
                      >
                        <p className="text-[11px] text-zinc-300 truncate">
                          {dem.ato}
                        </p>
                        {dem.prazoFatal && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Calendar className="h-2.5 w-2.5 text-zinc-500" />
                            <span
                              className={cn(
                                "text-[10px] px-1 py-px rounded border",
                                getPrazoBadgeClass(dem.prazoFatal)
                              )}
                            >
                              {format(new Date(dem.prazoFatal), "dd/MM/yyyy")}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Link to assistido profile */}
              <Link href={`/admin/assistidos/${assistido.id}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-zinc-400 hover:text-zinc-200 w-full"
                >
                  Ver perfil completo
                </Button>
              </Link>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── IA Insights Section (Placeholder) ──────────────────────────────

function IAInsightsSection({ file }: { file: DriveFile }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div>
          <SectionHeader
            title="IA Insights"
            icon={Brain}
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-3 space-y-3">
          {/* Dados Extraidos */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              Dados Extraidos
            </p>
            {file.documentType || file.categoria ? (
              <div className="bg-zinc-800/50 rounded-lg p-2 space-y-1">
                {file.documentType && (
                  <MetaRow label="Tipo Doc" value={file.documentType} />
                )}
                {file.categoria && (
                  <MetaRow label="Categoria" value={file.categoria} />
                )}
              </div>
            ) : (
              <p className="text-[11px] text-zinc-600">
                Nenhum dado extraido
              </p>
            )}
          </div>

          {/* Jurisprudencia Relacionada */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              Jurisprudencia Relacionada
            </p>
            <p className="text-[11px] text-zinc-600">
              Analise nao disponivel
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-zinc-600 w-full mt-1 cursor-not-allowed"
              disabled
            >
              <Search className="h-3 w-3 mr-1.5" />
              Analisar
            </Button>
          </div>

          {/* Analise do Caso */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              Analise do Caso
            </p>
            <p className="text-[11px] text-zinc-600">
              Agente IA nao configurado
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-zinc-600 w-full mt-1 cursor-not-allowed"
              disabled
            >
              <Brain className="h-3 w-3 mr-1.5" />
              Solicitar Analise
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Link Actions Section ───────────────────────────────────────────

function LinkActionsSection({ file }: { file: DriveFile }) {
  const [isOpen, setIsOpen] = useState(false);
  const [processoSearch, setProcessoSearch] = useState("");
  const [assistidoSearch, setAssistidoSearch] = useState("");
  const utils = trpc.useUtils();

  const { data: processoResults } = trpc.drive.searchProcessosForLink.useQuery(
    { search: processoSearch },
    { enabled: processoSearch.length >= 2 }
  );

  const { data: assistidoResults } =
    trpc.drive.searchAssistidosForLink.useQuery(
      { search: assistidoSearch },
      { enabled: assistidoSearch.length >= 2 }
    );

  const linkMutation = trpc.drive.linkFileToEntity.useMutation({
    onSuccess: () => {
      toast.success("Arquivo vinculado com sucesso");
      utils.drive.files.invalidate();
      setProcessoSearch("");
      setAssistidoSearch("");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao vincular");
    },
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div>
          <SectionHeader
            title="Vincular"
            icon={Link2}
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-3 space-y-3">
          {/* Current links */}
          {(file.processoId || file.assistidoId) && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2">
              <p className="text-[10px] text-emerald-400 font-medium">
                Vinculado a:
              </p>
              {file.processoId && (
                <p className="text-[11px] text-zinc-400">
                  Processo #{file.processoId}
                </p>
              )}
              {file.assistidoId && (
                <p className="text-[11px] text-zinc-400">
                  Assistido #{file.assistidoId}
                </p>
              )}
            </div>
          )}

          {/* Vincular a Processo */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              Vincular a Processo
            </p>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-600" />
              <Input
                value={processoSearch}
                onChange={(e) => setProcessoSearch(e.target.value)}
                placeholder="Buscar por numero ou nome..."
                className="h-7 text-xs pl-7 bg-zinc-800 border-zinc-700 text-zinc-300 placeholder:text-zinc-600"
              />
            </div>
            {processoResults && processoResults.length > 0 && (
              <div className="mt-1 max-h-32 overflow-y-auto space-y-0.5">
                {processoResults.map((proc: any) => (
                  <button
                    key={proc.id}
                    onClick={() =>
                      linkMutation.mutate({
                        fileId: file.id,
                        processoId: proc.id,
                      })
                    }
                    className="w-full text-left px-2 py-1.5 rounded-md hover:bg-zinc-800 transition-colors"
                    disabled={linkMutation.isPending}
                  >
                    <p className="text-[11px] font-mono text-zinc-300 truncate">
                      {proc.numero}
                    </p>
                    {proc.assistidoNome && (
                      <p className="text-[10px] text-zinc-500 truncate">
                        {proc.assistidoNome}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Vincular a Assistido */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              Vincular a Assistido
            </p>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-600" />
              <Input
                value={assistidoSearch}
                onChange={(e) => setAssistidoSearch(e.target.value)}
                placeholder="Buscar por nome ou CPF..."
                className="h-7 text-xs pl-7 bg-zinc-800 border-zinc-700 text-zinc-300 placeholder:text-zinc-600"
              />
            </div>
            {assistidoResults && assistidoResults.length > 0 && (
              <div className="mt-1 max-h-32 overflow-y-auto space-y-0.5">
                {assistidoResults.map((ass: any) => (
                  <button
                    key={ass.id}
                    onClick={() =>
                      linkMutation.mutate({
                        fileId: file.id,
                        assistidoId: ass.id,
                      })
                    }
                    className="w-full text-left px-2 py-1.5 rounded-md hover:bg-zinc-800 transition-colors"
                    disabled={linkMutation.isPending}
                  >
                    <p className="text-[11px] text-zinc-300 truncate">
                      {ass.nome}
                    </p>
                    {ass.cpf && (
                      <p className="text-[10px] text-zinc-500 font-mono">
                        {maskCpf(ass.cpf)}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Detail Panel Content ───────────────────────────────────────────

function DetailPanelContent({ file }: { file: DriveFile }) {
  const ctx = useDriveContext();
  const [isFavorited, setIsFavorited] = useState(() =>
    getFavorites().has(file.id)
  );
  const [isRenaming, setIsRenaming] = useState(false);

  const handleToggleFavorite = useCallback(() => {
    const newState = toggleFavorite(file.id);
    setIsFavorited(newState);
  }, [file.id]);

  return (
    <div className="flex flex-col h-full">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-2 h-12 px-4 border-b border-zinc-800 shrink-0">
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <InlineRename
              file={file}
              onCancel={() => setIsRenaming(false)}
              onRenamed={() => setIsRenaming(false)}
            />
          ) : (
            <p
              className="text-sm font-medium text-zinc-200 truncate"
              title={file.name}
            >
              {file.name}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-500 hover:text-zinc-300 shrink-0"
          onClick={() => ctx.closeDetailPanel()}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* ─── Scrollable Content ─── */}
      <div className="flex-1 overflow-y-auto">
        {/* Preview */}
        <div className="p-4">
          <FilePreview file={file} />
        </div>

        {/* Actions Row */}
        <div className="px-4 pb-3 flex items-center justify-center border-b border-zinc-800/50">
          <ActionRow
            file={file}
            isFavorited={isFavorited}
            onToggleFavorite={handleToggleFavorite}
            onStartRename={() => setIsRenaming(true)}
          />
        </div>

        {/* Collapsible Sections */}
        <div className="divide-y divide-zinc-800/50">
          <MetadataSection file={file} />
          <EnrichmentSection file={file} />
          <JuridicalContextSection file={file} />
          <IAInsightsSection file={file} />
          <LinkActionsSection file={file} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function DriveDetailPanel() {
  const ctx = useDriveContext();

  // Determine active folder for the file query
  const activeFolderId = ctx.selectedFolderId || null;

  // Fetch files to find the selected file
  // (tRPC deduplicates identical queries, so this shares cache with DriveContentArea)
  const { data } = trpc.drive.files.useQuery(
    {
      folderId: activeFolderId!,
      parentFileId: null,
    },
    { enabled: !!activeFolderId && ctx.detailPanelFileId !== null }
  );

  // Find the file by detailPanelFileId
  const file = useMemo(() => {
    if (!data?.files || ctx.detailPanelFileId === null) return null;
    return data.files.find((f: any) => f.id === ctx.detailPanelFileId) || null;
  }, [data?.files, ctx.detailPanelFileId]);

  const isOpen = ctx.detailPanelFileId !== null;

  // Desktop: inline panel. Mobile: Sheet overlay.
  // We render both and use CSS to show/hide based on breakpoint.
  if (!isOpen) return null;

  // Loading state when file not yet found
  if (!file) {
    return (
      <>
        {/* Desktop panel */}
        <div className="hidden lg:flex w-80 border-l border-zinc-800 bg-zinc-950 flex-col shrink-0">
          <div className="flex items-center gap-2 h-12 px-4 border-b border-zinc-800">
            <Skeleton className="h-4 w-40 bg-zinc-800" />
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-500 hover:text-zinc-300"
              onClick={() => ctx.closeDetailPanel()}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 space-y-3">
            <Skeleton className="aspect-video w-full bg-zinc-800 rounded-lg" />
            <Skeleton className="h-8 w-full bg-zinc-800" />
            <Skeleton className="h-20 w-full bg-zinc-800" />
          </div>
        </div>

        {/* Mobile sheet */}
        <Sheet
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) ctx.closeDetailPanel();
          }}
        >
          <SheetContent
            side="right"
            className="w-full sm:max-w-sm bg-zinc-950 border-zinc-800 p-0"
          >
            <SheetTitle className="sr-only">Detalhes do arquivo</SheetTitle>
            <div className="p-4 space-y-3">
              <Skeleton className="aspect-video w-full bg-zinc-800 rounded-lg" />
              <Skeleton className="h-8 w-full bg-zinc-800" />
              <Skeleton className="h-20 w-full bg-zinc-800" />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <>
      {/* Desktop: inline panel (hidden on mobile) */}
      <div className="hidden lg:flex w-80 border-l border-zinc-800 bg-zinc-950 flex-col shrink-0 transition-all duration-300">
        <DetailPanelContent file={file as any} />
      </div>

      {/* Mobile: Sheet overlay (hidden on desktop) */}
      <div className="lg:hidden">
        <Sheet
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) ctx.closeDetailPanel();
          }}
        >
          <SheetContent
            side="right"
            className="w-full sm:max-w-sm bg-zinc-950 border-zinc-800 p-0"
          >
            <SheetTitle className="sr-only">
              {file.name}
            </SheetTitle>
            <DetailPanelContent file={file as any} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
