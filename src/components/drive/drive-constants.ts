import {
  Scale, Shield, Lock, Zap,
  FileText, FileImage, FileAudio, FileVideo,
  File, FolderOpen, FileSpreadsheet, FileCode,
  Inbox, BookOpen,
} from "lucide-react";

// Import actual folder IDs from text-extraction
import { ATRIBUICAO_FOLDER_IDS, SPECIAL_FOLDER_IDS } from "@/lib/utils/text-extraction";

export const DRIVE_ATRIBUICOES = [
  {
    key: "JURI",
    label: "Juri",
    icon: Scale,
    folderId: ATRIBUICAO_FOLDER_IDS.JURI,
    color: "emerald",
    bgClass: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
    hoverClass: "hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-500/5",
    iconClass: "text-emerald-600 dark:text-emerald-400",
    activeBorderClass: "border-l-2 border-emerald-500",
    iconBgClass: "bg-emerald-100 dark:bg-emerald-500/10",
  },
  {
    key: "VVD",
    label: "Violencia Domestica",
    icon: Shield,
    folderId: ATRIBUICAO_FOLDER_IDS.VVD,
    color: "rose",
    bgClass: "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400",
    dotClass: "bg-rose-500",
    hoverClass: "hover:border-rose-300 dark:hover:border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-500/5",
    iconClass: "text-rose-600 dark:text-rose-400",
    activeBorderClass: "border-l-2 border-rose-500",
    iconBgClass: "bg-rose-100 dark:bg-rose-500/10",
  },
  {
    key: "EP",
    label: "Execucao Penal",
    icon: Lock,
    folderId: ATRIBUICAO_FOLDER_IDS.EP,
    color: "amber",
    bgClass: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
    dotClass: "bg-amber-500",
    hoverClass: "hover:border-amber-300 dark:hover:border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-500/5",
    iconClass: "text-amber-600 dark:text-amber-400",
    activeBorderClass: "border-l-2 border-amber-500",
    iconBgClass: "bg-amber-100 dark:bg-amber-500/10",
  },
  {
    key: "SUBSTITUICAO",
    label: "Substituicao",
    icon: Zap,
    folderId: ATRIBUICAO_FOLDER_IDS.SUBSTITUICAO,
    color: "sky",
    bgClass: "bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400",
    dotClass: "bg-sky-500",
    hoverClass: "hover:border-sky-300 dark:hover:border-sky-500/30 hover:bg-sky-50 dark:hover:bg-sky-500/5",
    iconClass: "text-sky-600 dark:text-sky-400",
    activeBorderClass: "border-l-2 border-sky-500",
    iconBgClass: "bg-sky-100 dark:bg-sky-500/10",
  },
] as const;

export const SPECIAL_FOLDERS = [
  {
    key: "DISTRIBUICAO",
    label: "Distribuicao",
    icon: Inbox,
    folderId: SPECIAL_FOLDER_IDS.DISTRIBUICAO,
    color: "violet",
    hoverClass: "hover:border-violet-300 dark:hover:border-violet-500/30 hover:bg-violet-50 dark:hover:bg-violet-500/5",
    iconClass: "text-violet-600 dark:text-violet-400",
    iconBgClass: "bg-violet-100 dark:bg-violet-500/10",
  },
  {
    key: "JURISPRUDENCIA",
    label: "Jurisprudencia",
    icon: BookOpen,
    folderId: SPECIAL_FOLDER_IDS.JURISPRUDENCIA,
    color: "cyan",
    hoverClass: "hover:border-cyan-300 dark:hover:border-cyan-500/30 hover:bg-cyan-50 dark:hover:bg-cyan-500/5",
    iconClass: "text-cyan-600 dark:text-cyan-400",
    iconBgClass: "bg-cyan-100 dark:bg-cyan-500/10",
  },
] as const;

export const FILE_ICON_MAP: Record<string, typeof FileText> = {
  "application/pdf": FileText,
  "application/msword": FileText,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": FileText,
  "application/vnd.google-apps.document": FileText,
  "application/vnd.google-apps.spreadsheet": FileSpreadsheet,
  "application/vnd.google-apps.folder": FolderOpen,
  "image/jpeg": FileImage,
  "image/png": FileImage,
  "image/gif": FileImage,
  "audio/mpeg": FileAudio,
  "audio/mp3": FileAudio,
  "audio/wav": FileAudio,
  "audio/ogg": FileAudio,
  "video/mp4": FileVideo,
  "text/plain": FileCode,
};

export function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File;
  return FILE_ICON_MAP[mimeType] || File;
}

export function getFileTypeLabel(mimeType: string | null): string {
  if (!mimeType) return "Arquivo";
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("image")) return "Imagem";
  if (mimeType.includes("audio")) return "Audio";
  if (mimeType.includes("video")) return "Video";
  if (mimeType.includes("folder")) return "Pasta";
  if (mimeType.includes("document") || mimeType.includes("word")) return "Documento";
  if (mimeType.includes("spreadsheet")) return "Planilha";
  return "Arquivo";
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function getEnrichmentBadge(status: string | null) {
  switch (status) {
    case "completed": return { label: "Extraido", class: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30" };
    case "processing": return { label: "Processando", class: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 animate-pulse" };
    case "pending": return { label: "Pendente", class: "bg-zinc-100 dark:bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-500/30" };
    case "failed": return { label: "Falhou", class: "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30" };
    case "unsupported": return { label: "N/A", class: "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-500 border-zinc-200 dark:border-zinc-700/30" };
    default: return { label: "", class: "" };
  }
}

export function getAtribuicaoByKey(key: string) {
  return DRIVE_ATRIBUICOES.find(a => a.key === key);
}

export function getAtribuicaoFolderId(key: string | null): string | null {
  if (!key) return null;
  const atribuicao = DRIVE_ATRIBUICOES.find(a => a.key === key);
  return atribuicao?.folderId || null;
}
