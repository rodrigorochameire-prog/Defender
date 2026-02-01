"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FolderOpen,
  File,
  FileText,
  ImageIcon,
  Film,
  Music,
  Archive,
  Search,
  LayoutGrid,
  List,
  ExternalLink,
  Download,
  Eye,
  Clock,
  RefreshCw,
  Plus,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Home,
  Star,
  Trash2,
  FolderPlus,
  Upload,
  Filter,
  XCircle,
  ArrowUpDown,
  HardDrive,
  Users,
  Scale,
  Folder,
  Copy,
  Share2,
  Edit,
  FileUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAssignment } from "@/contexts/assignment-context";
import { StatsCard, StatsGrid } from "@/components/shared/stats-card";

// ==========================================
// TIPOS
// ==========================================

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime: Date;
  createdAt: Date;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  isFolder: boolean;
  parentId?: string;
  starred?: boolean;
  path?: string;
  // Relacionamentos
  processoId?: number;
  processoNumero?: string;
  assistidoId?: number;
  assistidoNome?: string;
}

interface Breadcrumb {
  id: string;
  name: string;
}

// ==========================================
// CONSTANTES E HELPERS
// ==========================================

const FILE_ICONS: Record<string, React.ElementType> = {
  folder: FolderOpen,
  document: FileText,
  pdf: FileText,
  image: ImageIcon,
  video: Film,
  audio: Music,
  archive: Archive,
  default: File,
};

const FILE_COLORS: Record<string, string> = {
  folder: "text-amber-500",
  document: "text-blue-500",
  pdf: "text-rose-500",
  image: "text-emerald-500",
  video: "text-violet-500",
  audio: "text-pink-500",
  archive: "text-orange-500",
  default: "text-zinc-500",
};

const FILE_BG_COLORS: Record<string, string> = {
  folder: "bg-amber-50 dark:bg-amber-900/20",
  document: "bg-blue-50 dark:bg-blue-900/20",
  pdf: "bg-rose-50 dark:bg-rose-900/20",
  image: "bg-emerald-50 dark:bg-emerald-900/20",
  video: "bg-violet-50 dark:bg-violet-900/20",
  audio: "bg-pink-50 dark:bg-pink-900/20",
  archive: "bg-orange-50 dark:bg-orange-900/20",
  default: "bg-zinc-50 dark:bg-zinc-900/20",
};

function getFileType(mimeType: string): string {
  if (mimeType.includes("folder")) return "folder";
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("document") || mimeType.includes("word") || mimeType.includes("text")) return "document";
  if (mimeType.includes("image")) return "image";
  if (mimeType.includes("video")) return "video";
  if (mimeType.includes("audio")) return "audio";
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar")) return "archive";
  return "default";
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// ==========================================
// DADOS MOCK - Estrutura hierárquica completa
// ==========================================

const MOCK_FILES: DriveFile[] = [
  // ===== NÍVEL 1: Pastas Raiz =====
  { id: "root-assistidos", name: "Assistidos", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-30"), createdAt: new Date("2025-06-01"), isFolder: true },
  { id: "root-processos", name: "Processos", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-29"), createdAt: new Date("2025-06-01"), isFolder: true },
  { id: "root-pautas", name: "Pautas", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-28"), createdAt: new Date("2025-06-01"), isFolder: true },
  { id: "root-jurisprudencia", name: "Jurisprudência", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-25"), createdAt: new Date("2025-06-01"), isFolder: true },
  { id: "root-modelos", name: "Modelos", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-20"), createdAt: new Date("2025-06-01"), isFolder: true },

  // ===== NÍVEL 2: Assistidos > Atribuições =====
  { id: "assist-juri", name: "Tribunal do Júri", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-30"), createdAt: new Date("2025-06-01"), isFolder: true, parentId: "root-assistidos" },
  { id: "assist-vvd", name: "Violência Doméstica", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-29"), createdAt: new Date("2025-06-01"), isFolder: true, parentId: "root-assistidos" },
  { id: "assist-ep", name: "Execução Penal", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-28"), createdAt: new Date("2025-06-01"), isFolder: true, parentId: "root-assistidos" },

  // ===== NÍVEL 2: Processos > Atribuições =====
  { id: "proc-juri", name: "Tribunal do Júri", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-30"), createdAt: new Date("2025-06-01"), isFolder: true, parentId: "root-processos" },
  { id: "proc-vvd", name: "Violência Doméstica", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-29"), createdAt: new Date("2025-06-01"), isFolder: true, parentId: "root-processos" },
  { id: "proc-ep", name: "Execução Penal", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-28"), createdAt: new Date("2025-06-01"), isFolder: true, parentId: "root-processos" },

  // ===== NÍVEL 3: Assistidos > Júri > Pessoas =====
  { id: "juri-jose", name: "José Carlos Santos", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-30"), createdAt: new Date("2025-08-15"), isFolder: true, parentId: "assist-juri", assistidoId: 1, assistidoNome: "José Carlos Santos" },
  { id: "juri-pedro", name: "Pedro Oliveira Lima", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-29"), createdAt: new Date("2025-07-20"), isFolder: true, parentId: "assist-juri", assistidoId: 2, assistidoNome: "Pedro Oliveira Lima" },
  { id: "juri-marcos", name: "Marcos Antônio Reis", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-28"), createdAt: new Date("2025-09-10"), isFolder: true, parentId: "assist-juri", assistidoId: 3, assistidoNome: "Marcos Antônio Reis" },

  // ===== NÍVEL 3: Assistidos > VVD > Pessoas =====
  { id: "vvd-maria", name: "Maria Aparecida Silva", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-27"), createdAt: new Date("2025-10-05"), isFolder: true, parentId: "assist-vvd", assistidoId: 4, assistidoNome: "Maria Aparecida Silva" },
  { id: "vvd-ana", name: "Ana Paula Ferreira", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-26"), createdAt: new Date("2025-11-12"), isFolder: true, parentId: "assist-vvd", assistidoId: 5, assistidoNome: "Ana Paula Ferreira" },

  // ===== NÍVEL 3: Assistidos > EP > Pessoas =====
  { id: "ep-fernando", name: "Fernando Costa", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-25"), createdAt: new Date("2025-06-20"), isFolder: true, parentId: "assist-ep", assistidoId: 6, assistidoNome: "Fernando Costa" },
  { id: "ep-carlos", name: "Carlos Eduardo Santos", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-24"), createdAt: new Date("2025-07-15"), isFolder: true, parentId: "assist-ep", assistidoId: 7, assistidoNome: "Carlos Eduardo Santos" },

  // ===== NÍVEL 4: José Carlos > Subpastas =====
  { id: "jose-docs", name: "Documentos Pessoais", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-30"), createdAt: new Date("2025-08-15"), isFolder: true, parentId: "juri-jose" },
  { id: "jose-proc-folder", name: "Processo 8002341-90", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-30"), createdAt: new Date("2025-08-16"), isFolder: true, parentId: "juri-jose", processoId: 1, processoNumero: "8002341-90.2025.8.05.0039" },
  { id: "jose-fotos", name: "Fotos", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-28"), createdAt: new Date("2025-08-17"), isFolder: true, parentId: "juri-jose" },

  // ===== NÍVEL 3: Processos > Júri > Processos =====
  { id: "pjuri-2341", name: "8002341-90.2025.8.05.0039 - José Carlos", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-30"), createdAt: new Date("2025-08-16"), isFolder: true, parentId: "proc-juri", processoId: 1, processoNumero: "8002341-90.2025.8.05.0039", assistidoId: 1, assistidoNome: "José Carlos Santos" },
  { id: "pjuri-2342", name: "8002342-75.2025.8.05.0039 - Pedro Oliveira", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-29"), createdAt: new Date("2025-07-21"), isFolder: true, parentId: "proc-juri", processoId: 2, processoNumero: "8002342-75.2025.8.05.0039", assistidoId: 2, assistidoNome: "Pedro Oliveira Lima" },
  { id: "pjuri-2343", name: "8002343-60.2025.8.05.0039 - Marcos Antônio", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-28"), createdAt: new Date("2025-09-10"), isFolder: true, parentId: "proc-juri", processoId: 3, processoNumero: "8002343-60.2025.8.05.0039", assistidoId: 3, assistidoNome: "Marcos Antônio Reis" },

  // ===== NÍVEL 3: Processos > VVD > Processos =====
  { id: "pvvd-5001", name: "8005001-12.2025.8.05.0039 - Maria Aparecida", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-27"), createdAt: new Date("2025-10-05"), isFolder: true, parentId: "proc-vvd", processoId: 4, processoNumero: "8005001-12.2025.8.05.0039", assistidoId: 4, assistidoNome: "Maria Aparecida Silva" },

  // ===== NÍVEL 3: Processos > EP > Processos =====
  { id: "pep-0800", name: "8000800-20.2024.8.05.0039 - Fernando Costa", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-25"), createdAt: new Date("2024-06-10"), isFolder: true, parentId: "proc-ep", processoId: 5, processoNumero: "8000800-20.2024.8.05.0039", assistidoId: 6, assistidoNome: "Fernando Costa" },

  // ===== NÍVEL 5: José Carlos > Documentos Pessoais > Arquivos =====
  { id: "jose-rg", name: "RG.jpg", mimeType: "image/jpeg", size: 1234567, modifiedTime: new Date("2026-01-15"), createdAt: new Date("2025-08-15"), isFolder: false, parentId: "jose-docs", assistidoId: 1, assistidoNome: "José Carlos Santos", thumbnailLink: "/placeholder.jpg" },
  { id: "jose-cpf", name: "CPF.jpg", mimeType: "image/jpeg", size: 987654, modifiedTime: new Date("2026-01-15"), createdAt: new Date("2025-08-15"), isFolder: false, parentId: "jose-docs", assistidoId: 1, assistidoNome: "José Carlos Santos" },
  { id: "jose-comp", name: "Comprovante Residência.pdf", mimeType: "application/pdf", size: 456789, modifiedTime: new Date("2026-01-14"), createdAt: new Date("2025-08-16"), isFolder: false, parentId: "jose-docs", assistidoId: 1, assistidoNome: "José Carlos Santos" },

  // ===== Arquivos do Processo José (vinculados em ambas pastas) =====
  { id: "doc-jose-denuncia", name: "Denúncia.pdf", mimeType: "application/pdf", size: 345678, modifiedTime: new Date("2025-08-20"), createdAt: new Date("2025-08-20"), isFolder: false, parentId: "jose-proc-folder", starred: true, processoId: 1, processoNumero: "8002341-90.2025.8.05.0039", assistidoId: 1, assistidoNome: "José Carlos Santos" },
  { id: "doc-jose-resposta", name: "Resposta à Acusação.pdf", mimeType: "application/pdf", size: 245678, modifiedTime: new Date("2026-01-30"), createdAt: new Date("2025-09-10"), isFolder: false, parentId: "jose-proc-folder", starred: true, processoId: 1, processoNumero: "8002341-90.2025.8.05.0039", assistidoId: 1, assistidoNome: "José Carlos Santos" },
  { id: "doc-jose-alegacoes", name: "Alegações Finais.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 156789, modifiedTime: new Date("2026-01-28"), createdAt: new Date("2026-01-28"), isFolder: false, parentId: "jose-proc-folder", processoId: 1, processoNumero: "8002341-90.2025.8.05.0039", assistidoId: 1, assistidoNome: "José Carlos Santos" },
  { id: "doc-jose-laudo", name: "Laudo Pericial.pdf", mimeType: "application/pdf", size: 567890, modifiedTime: new Date("2025-10-15"), createdAt: new Date("2025-10-15"), isFolder: false, parentId: "jose-proc-folder", processoId: 1, processoNumero: "8002341-90.2025.8.05.0039" },
  { id: "doc-jose-audio", name: "Audiência Instrução.mp3", mimeType: "audio/mpeg", size: 45678901, modifiedTime: new Date("2025-11-20"), createdAt: new Date("2025-11-20"), isFolder: false, parentId: "jose-proc-folder", processoId: 1, processoNumero: "8002341-90.2025.8.05.0039" },

  // ===== Links virtuais para Processos > Júri > 8002341-90 (mesmos arquivos) =====
  { id: "link-jose-denuncia", name: "Denúncia.pdf", mimeType: "application/pdf", size: 345678, modifiedTime: new Date("2025-08-20"), createdAt: new Date("2025-08-20"), isFolder: false, parentId: "pjuri-2341", starred: true, processoId: 1, processoNumero: "8002341-90.2025.8.05.0039", assistidoId: 1, assistidoNome: "José Carlos Santos" },
  { id: "link-jose-resposta", name: "Resposta à Acusação.pdf", mimeType: "application/pdf", size: 245678, modifiedTime: new Date("2026-01-30"), createdAt: new Date("2025-09-10"), isFolder: false, parentId: "pjuri-2341", starred: true, processoId: 1, processoNumero: "8002341-90.2025.8.05.0039", assistidoId: 1, assistidoNome: "José Carlos Santos" },
  { id: "link-jose-alegacoes", name: "Alegações Finais.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 156789, modifiedTime: new Date("2026-01-28"), createdAt: new Date("2026-01-28"), isFolder: false, parentId: "pjuri-2341", processoId: 1, processoNumero: "8002341-90.2025.8.05.0039" },

  // ===== NÍVEL 5: José Carlos > Fotos > Arquivos =====
  { id: "jose-foto1", name: "Local do Crime 01.jpg", mimeType: "image/jpeg", size: 3456789, modifiedTime: new Date("2025-08-20"), createdAt: new Date("2025-08-20"), isFolder: false, parentId: "jose-fotos", assistidoId: 1, assistidoNome: "José Carlos Santos" },
  { id: "jose-foto2", name: "Local do Crime 02.jpg", mimeType: "image/jpeg", size: 3234567, modifiedTime: new Date("2025-08-20"), createdAt: new Date("2025-08-20"), isFolder: false, parentId: "jose-fotos", assistidoId: 1, assistidoNome: "José Carlos Santos" },
  { id: "jose-foto3", name: "Evidência A.jpg", mimeType: "image/jpeg", size: 2345678, modifiedTime: new Date("2025-08-21"), createdAt: new Date("2025-08-21"), isFolder: false, parentId: "jose-fotos" },

  // ===== NÍVEL 4: Pedro Oliveira > Subpastas =====
  { id: "pedro-docs", name: "Documentos Pessoais", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-29"), createdAt: new Date("2025-07-20"), isFolder: true, parentId: "juri-pedro" },
  { id: "pedro-proc-folder", name: "Processo 8002342-75", mimeType: "application/vnd.google-apps.folder", modifiedTime: new Date("2026-01-29"), createdAt: new Date("2025-07-21"), isFolder: true, parentId: "juri-pedro", processoId: 2, processoNumero: "8002342-75.2025.8.05.0039" },

  // ===== Arquivos do Pedro =====
  { id: "doc-pedro-denuncia", name: "Denúncia.pdf", mimeType: "application/pdf", size: 298765, modifiedTime: new Date("2025-07-25"), createdAt: new Date("2025-07-25"), isFolder: false, parentId: "pedro-proc-folder", processoId: 2, processoNumero: "8002342-75.2025.8.05.0039" },
  { id: "doc-pedro-alegacoes", name: "Alegações Finais.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 189012, modifiedTime: new Date("2026-01-29"), createdAt: new Date("2026-01-29"), isFolder: false, parentId: "pedro-proc-folder", starred: true, processoId: 2, processoNumero: "8002342-75.2025.8.05.0039" },

  // ===== Pautas =====
  { id: "pauta-2026-05", name: "Semana 05-2026.pdf", mimeType: "application/pdf", size: 89456, modifiedTime: new Date("2026-01-28"), createdAt: new Date("2026-01-28"), isFolder: false, parentId: "root-pautas", starred: true },
  { id: "pauta-2026-04", name: "Semana 04-2026.pdf", mimeType: "application/pdf", size: 92345, modifiedTime: new Date("2026-01-21"), createdAt: new Date("2026-01-21"), isFolder: false, parentId: "root-pautas" },
  { id: "pauta-video", name: "Gravação Audiência.mp4", mimeType: "video/mp4", size: 156789012, modifiedTime: new Date("2026-01-25"), createdAt: new Date("2026-01-25"), isFolder: false, parentId: "root-pautas" },

  // ===== Jurisprudência =====
  { id: "juris-stj", name: "STJ - Tráfico Privilegiado.pdf", mimeType: "application/pdf", size: 234567, modifiedTime: new Date("2026-01-24"), createdAt: new Date("2026-01-24"), isFolder: false, parentId: "root-jurisprudencia" },
  { id: "juris-stf", name: "STF - HC 123456.pdf", mimeType: "application/pdf", size: 345678, modifiedTime: new Date("2026-01-23"), createdAt: new Date("2026-01-23"), isFolder: false, parentId: "root-jurisprudencia" },
  { id: "juris-pack", name: "Jurisprudência Completa.zip", mimeType: "application/zip", size: 45678901, modifiedTime: new Date("2026-01-22"), createdAt: new Date("2026-01-22"), isFolder: false, parentId: "root-jurisprudencia" },

  // ===== Modelos =====
  { id: "modelo-alegacoes", name: "Alegações Finais Júri.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 67890, modifiedTime: new Date("2026-01-20"), createdAt: new Date("2026-01-20"), isFolder: false, parentId: "root-modelos", starred: true },
  { id: "modelo-hc", name: "Habeas Corpus.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 54321, modifiedTime: new Date("2026-01-19"), createdAt: new Date("2026-01-19"), isFolder: false, parentId: "root-modelos" },
  { id: "modelo-resposta", name: "Resposta à Acusação.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 48765, modifiedTime: new Date("2026-01-18"), createdAt: new Date("2026-01-18"), isFolder: false, parentId: "root-modelos" },
];

// Interface para árvore de navegação
interface FolderTreeNode {
  id: string;
  name: string;
  children: FolderTreeNode[];
  isFolder: boolean;
  parentId?: string;
  fileCount: number;
  icon?: React.ElementType;
  color?: string;
}

// Função para construir árvore a partir dos arquivos
function buildFolderTree(files: DriveFile[], parentId?: string): FolderTreeNode[] {
  const folders = files.filter(f => f.isFolder && f.parentId === parentId);
  return folders.map(folder => {
    const children = buildFolderTree(files, folder.id);
    const directFiles = files.filter(f => !f.isFolder && f.parentId === folder.id);
    return {
      id: folder.id,
      name: folder.name,
      children,
      isFolder: true,
      parentId: folder.parentId,
      fileCount: directFiles.length + children.reduce((acc, c) => acc + c.fileCount, 0),
    };
  });
}

// Componente de item da árvore de pastas
function FolderTreeItem({
  node,
  level,
  currentFolder,
  expandedFolders,
  onToggleExpand,
  onNavigate,
}: {
  node: FolderTreeNode;
  level: number;
  currentFolder: string | null;
  expandedFolders: Set<string>;
  onToggleExpand: (id: string) => void;
  onNavigate: (id: string) => void;
}) {
  const isExpanded = expandedFolders.has(node.id);
  const isActive = currentFolder === node.id;
  const hasChildren = node.children.length > 0;

  // Cores sutis e profissionais por nível
  const levelStyles = [
    { icon: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20", active: "bg-amber-100 dark:bg-amber-900/40 ring-1 ring-amber-200 dark:ring-amber-800" },
    { icon: "text-sky-500", bg: "bg-sky-50 dark:bg-sky-900/20", active: "bg-sky-100 dark:bg-sky-900/40 ring-1 ring-sky-200 dark:ring-sky-800" },
    { icon: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", active: "bg-emerald-100 dark:bg-emerald-900/40 ring-1 ring-emerald-200 dark:ring-emerald-800" },
    { icon: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-900/20", active: "bg-violet-100 dark:bg-violet-900/40 ring-1 ring-violet-200 dark:ring-violet-800" },
    { icon: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/20", active: "bg-rose-100 dark:bg-rose-900/40 ring-1 ring-rose-200 dark:ring-rose-800" },
  ];
  const style = levelStyles[level % levelStyles.length];

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer transition-all group",
          isActive
            ? style.active
            : "hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
        )}
        style={{ paddingLeft: `${12 + level * 14}px` }}
      >
        {/* Expand/Collapse button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(node.id);
          }}
          className={cn(
            "w-4 h-4 rounded flex items-center justify-center transition-all flex-shrink-0",
            hasChildren 
              ? "hover:bg-zinc-200 dark:hover:bg-zinc-700" 
              : "invisible"
          )}
        >
          {hasChildren && (
            <ChevronRight className={cn(
              "w-3 h-3 text-zinc-400 transition-transform duration-200",
              isExpanded && "rotate-90"
            )} />
          )}
        </button>

        {/* Folder icon and name */}
        <button
          onClick={() => onNavigate(node.id)}
          className="flex-1 flex items-center gap-2 min-w-0"
        >
          <div className={cn(
            "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors",
            isActive ? style.bg : "bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700"
          )}>
            <FolderOpen className={cn("w-3 h-3", isActive ? style.icon : "text-zinc-500")} />
          </div>
          <span className={cn(
            "text-[13px] truncate transition-colors",
            isActive 
              ? "font-medium text-zinc-900 dark:text-zinc-100" 
              : "text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200"
          )}>
            {node.name}
          </span>
        </button>

        {/* File count badge */}
        {node.fileCount > 0 && (
          <span className={cn(
            "text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400 font-medium tabular-nums",
            "opacity-0 group-hover:opacity-100 transition-opacity"
          )}>
            {node.fileCount}
          </span>
        )}
      </div>

      {/* Children com animação */}
      {isExpanded && hasChildren && (
        <div className="relative animate-in slide-in-from-top-1 duration-200">
          {/* Linha de conexão vertical sutil */}
          <div 
            className="absolute top-0 bottom-1 w-px bg-zinc-200/60 dark:bg-zinc-700/60"
            style={{ left: `${20 + level * 14}px` }}
          />
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              currentFolder={currentFolder}
              expandedFolders={expandedFolders}
              onToggleExpand={onToggleExpand}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENTES
// ==========================================

function FileCard({ 
  file, 
  viewMode,
  onPreview,
  onNavigate,
}: { 
  file: DriveFile;
  viewMode: "grid" | "list";
  onPreview: (file: DriveFile) => void;
  onNavigate: (folderId: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const fileType = getFileType(file.mimeType);
  const Icon = FILE_ICONS[fileType] || FILE_ICONS.default;
  const colorClass = FILE_COLORS[fileType] || FILE_COLORS.default;
  const bgClass = FILE_BG_COLORS[fileType] || FILE_BG_COLORS.default;

  const handleClick = () => {
    if (file.isFolder) {
      onNavigate(file.id);
    } else {
      onPreview(file);
    }
  };

  if (viewMode === "list") {
    return (
      <div 
        className={cn(
          "flex items-center gap-4 px-4 py-3 transition-all cursor-pointer group",
          "hover:bg-zinc-50 dark:hover:bg-zinc-800/30",
          "border-b border-zinc-100 dark:border-zinc-800/50 last:border-0"
        )}
        onClick={handleClick}
      >
        {/* Ícone com fundo circular */}
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105",
          bgClass
        )}>
          <Icon className={cn("w-5 h-5", colorClass)} />
        </div>
        
        {/* Info Principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={cn(
              "text-sm font-medium truncate transition-colors",
              "text-zinc-800 dark:text-zinc-200 group-hover:text-amber-600 dark:group-hover:text-amber-400"
            )}>
              {file.name}
            </h4>
            {file.starred && (
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {file.assistidoNome && (
              <Link 
                href={`/admin/assistidos/${file.assistidoId}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              >
                <Users className="w-2.5 h-2.5" />
                {file.assistidoNome}
              </Link>
            )}
            {file.processoNumero && (
              <Link
                href={`/admin/processos/${file.processoId}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors font-mono"
              >
                <Scale className="w-2.5 h-2.5" />
                {file.processoNumero.slice(-15)}
              </Link>
            )}
          </div>
        </div>

        {/* Metadados */}
        <div className="hidden md:flex items-center gap-6 text-xs text-zinc-500 flex-shrink-0">
          <div className="text-right">
            <p className="font-medium text-zinc-700 dark:text-zinc-300">{formatFileSize(file.size)}</p>
          </div>
          <div className="text-right w-24">
            <p>{formatDistanceToNow(file.modifiedTime, { locale: ptBR, addSuffix: true })}</p>
          </div>
        </div>

        {/* Ações - Aparecem no hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          {!file.isFolder && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px]">Download</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px]">Compartilhar</TooltipContent>
              </Tooltip>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <Eye className="w-4 h-4 mr-2" />
                Visualizar
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="w-4 h-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="w-4 h-4 mr-2" />
                Copiar link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Edit className="w-4 h-4 mr-2" />
                Renomear
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Star className="w-4 h-4 mr-2" />
                {file.starred ? "Remover favorito" : "Adicionar favorito"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-rose-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  // Grid view - Refinado
  return (
    <div 
      className={cn(
        "group cursor-pointer rounded-xl overflow-hidden transition-all",
        "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800",
        "hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-none hover:border-zinc-300 dark:hover:border-zinc-700",
        "hover:-translate-y-0.5"
      )}
      onClick={handleClick}
    >
      {/* Preview Area */}
      <div className={cn(
        "h-24 flex items-center justify-center relative",
        bgClass
      )}>
        {file.thumbnailLink && !file.isFolder ? (
          <Image
            src={file.thumbnailLink}
            alt={file.name}
            fill
            sizes="(max-width: 768px) 100vw, 320px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-white/80 dark:bg-zinc-800/80 flex items-center justify-center shadow-sm">
            <Icon className={cn("w-7 h-7", colorClass)} />
          </div>
        )}
        
        {/* Hover Overlay */}
        {!file.isFolder && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
            <Button 
              size="sm" 
              variant="secondary" 
              className="h-9 w-9 p-0 rounded-xl shadow-lg" 
              onClick={(e) => { e.stopPropagation(); onPreview(file); }}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button 
              size="sm" 
              variant="secondary" 
              className="h-9 w-9 p-0 rounded-xl shadow-lg" 
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Star Badge */}
        {file.starred && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 dark:bg-zinc-800/90 flex items-center justify-center shadow-sm">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className={cn(
          "text-sm font-medium truncate mb-1 transition-colors",
          "text-zinc-800 dark:text-zinc-200 group-hover:text-amber-600 dark:group-hover:text-amber-400"
        )}>
          {file.name}
        </h4>
        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <span className="font-medium">{file.isFolder ? "Pasta" : formatFileSize(file.size)}</span>
          <span>{formatDistanceToNow(file.modifiedTime, { locale: ptBR, addSuffix: true })}</span>
        </div>
        
        {/* Assistido Badge */}
        {file.assistidoNome && (
          <div className="mt-2 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 w-fit">
            <Users className="w-2.5 h-2.5" />
            <span className="truncate max-w-20">{file.assistidoNome.split(" ")[0]}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewDialog({ 
  file, 
  open, 
  onClose 
}: { 
  file: DriveFile | null; 
  open: boolean; 
  onClose: () => void;
}) {
  if (!file) return null;

  const fileType = getFileType(file.mimeType);
  const Icon = FILE_ICONS[fileType] || FILE_ICONS.default;
  const colorClass = FILE_COLORS[fileType] || FILE_COLORS.default;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Icon className={cn("w-5 h-5", colorClass)} />
            <span className="truncate">{file.name}</span>
          </DialogTitle>
          <DialogDescription>
            {formatFileSize(file.size)} • Modificado {formatDistanceToNow(file.modifiedTime, { locale: ptBR, addSuffix: true })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-[400px] bg-zinc-100 dark:bg-zinc-900 rounded-lg flex items-center justify-center">
          {file.thumbnailLink ? (
            <Image
              src={file.thumbnailLink}
              alt={file.name}
              width={960}
              height={540}
              sizes="(max-width: 1024px) 100vw, 960px"
              className="max-w-full max-h-full object-contain"
              unoptimized
            />
          ) : (
            <div className="text-center">
              <Icon className={cn("w-16 h-16 mx-auto mb-4", colorClass)} />
              <p className="text-zinc-500 mb-4">Preview não disponível para este tipo de arquivo</p>
              <Button variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir externamente
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-3">
            {file.assistidoNome && (
              <Link href={`/admin/assistidos/${file.assistidoId}`}>
                <Badge variant="outline" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                  <Users className="w-3 h-3 mr-1" />
                  {file.assistidoNome}
                </Badge>
              </Link>
            )}
            {file.processoNumero && (
              <Link href={`/admin/processos/${file.processoId}`}>
                <Badge variant="outline" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer font-mono text-[10px]">
                  <Scale className="w-3 h-3 mr-1" />
                  {file.processoNumero}
                </Badge>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UploadDialog({ 
  open, 
  onClose,
  currentFolder,
}: { 
  open: boolean; 
  onClose: () => void;
  currentFolder: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // Handle file upload
      console.log("Files dropped:", e.dataTransfer.files);
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base">Upload de Arquivos</span>
              <p className="text-xs font-normal text-zinc-500 mt-0.5">
                Arraste arquivos ou clique para selecionar
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div 
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer group overflow-hidden",
            dragActive 
              ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 scale-[1.02]" 
              : "border-zinc-200 dark:border-zinc-700 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {/* Padrão decorativo */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: '16px 16px'
          }} />
          
          <input 
            ref={fileInputRef}
            type="file" 
            multiple 
            className="hidden" 
            onChange={(e) => {
              if (e.target.files) {
                console.log("Files selected:", e.target.files);
              }
            }}
          />
          <div className={cn(
            "relative w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all",
            dragActive 
              ? "bg-amber-100 dark:bg-amber-900/30" 
              : "bg-zinc-100 dark:bg-zinc-800 group-hover:bg-amber-50 dark:group-hover:bg-amber-900/20"
          )}>
            <FileUp className={cn(
              "w-8 h-8 transition-colors",
              dragActive ? "text-amber-600" : "text-zinc-400 group-hover:text-amber-500"
            )} />
          </div>
          <p className={cn(
            "text-sm font-medium mb-1 transition-colors",
            dragActive ? "text-amber-700 dark:text-amber-400" : "text-zinc-700 dark:text-zinc-300"
          )}>
            {dragActive ? "Solte para fazer upload" : "Arraste arquivos aqui"}
          </p>
          <p className="text-xs text-zinc-500">
            ou <span className="text-amber-600 dark:text-amber-400 font-medium">clique para selecionar</span>
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            {["PDF", "DOC", "JPG", "PNG"].map((ext) => (
              <span key={ext} className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium">
                {ext}
              </span>
            ))}
            <span className="text-[9px] text-zinc-400">• Máx. 50MB</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} className="rounded-lg">
            Cancelar
          </Button>
          <Button className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
            <Upload className="w-4 h-4 mr-2" />
            Fazer Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewFolderDialog({ 
  open, 
  onClose,
  currentFolder,
}: { 
  open: boolean; 
  onClose: () => void;
  currentFolder: string | null;
}) {
  const [folderName, setFolderName] = useState("");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-amber-500" />
            Nova Pasta
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input 
            placeholder="Nome da pasta" 
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={!folderName.trim()}
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            Criar Pasta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function DrivePage() {
  const { config } = useAssignment();
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("date");
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: "root", name: "Meu Drive" }]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [previewMode, setPreviewMode] = useState<"grid" | "list" | "preview">("list");

  // Árvore de pastas
  const folderTree = useMemo(() => buildFolderTree(MOCK_FILES, undefined), []);

  // Navegação - Reconstrói todo o caminho do breadcrumb
  const navigateToFolder = useCallback((folderId: string) => {
    const folder = MOCK_FILES.find(f => f.id === folderId);
    if (!folder) return;

    // Construir caminho completo até a pasta
    const path: Breadcrumb[] = [{ id: "root", name: "Meu Drive" }];
    let current: DriveFile | undefined = folder;
    const ancestors: DriveFile[] = [];

    // Subir na árvore até a raiz
    while (current) {
      ancestors.unshift(current);
      current = current.parentId ? MOCK_FILES.find(f => f.id === current!.parentId) : undefined;
    }

    // Adicionar cada ancestral ao breadcrumb
    ancestors.forEach(f => {
      path.push({ id: f.id, name: f.name });
    });

    setCurrentFolder(folderId);
    setBreadcrumbs(path);

    // Auto-expandir pastas ancestrais na árvore
    setExpandedFolders(prev => {
      const next = new Set(prev);
      ancestors.forEach(f => {
        if (f.parentId) next.add(f.parentId);
      });
      return next;
    });
  }, []);

  const navigateToBreadcrumb = useCallback((index: number) => {
    if (index === 0) {
      setCurrentFolder(null);
      setBreadcrumbs([{ id: "root", name: "Meu Drive" }]);
    } else {
      const crumb = breadcrumbs[index];
      setCurrentFolder(crumb.id);
      setBreadcrumbs(prev => prev.slice(0, index + 1));
    }
  }, [breadcrumbs]);

  // Filtrar arquivos
  const filteredFiles = useMemo(() => {
    let result = MOCK_FILES.filter((file) => {
      // Mostrar apenas itens da pasta atual
      if (currentFolder === null) {
        // Root: mostrar apenas pastas principais e arquivos sem parentId
        return !file.parentId;
      } else {
        // Dentro de pasta: mostrar apenas filhos
        return file.parentId === currentFolder;
      }
    });

    // Busca
    if (searchTerm) {
      result = MOCK_FILES.filter(file =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.assistidoNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.processoNumero?.includes(searchTerm)
      );
    }

    // Filtro por tipo
    if (filterType !== "all") {
      if (filterType === "starred") {
        result = result.filter(f => f.starred);
      } else if (filterType === "folder") {
        result = result.filter(f => f.isFolder);
      } else {
        result = result.filter(f => getFileType(f.mimeType) === filterType);
      }
    }

    // Ordenação
    result.sort((a, b) => {
      // Pastas primeiro
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;

      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "size":
          return (b.size || 0) - (a.size || 0);
        case "date":
        default:
          return new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime();
      }
    });

    return result;
  }, [currentFolder, searchTerm, filterType, sortBy]);

  const handlePreview = (file: DriveFile) => {
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  // Stats
  const stats = useMemo(() => ({
    total: MOCK_FILES.filter(f => !f.isFolder).length,
    folders: MOCK_FILES.filter(f => f.isFolder).length,
    starred: MOCK_FILES.filter(f => f.starred).length,
    totalSize: MOCK_FILES.reduce((acc, f) => acc + (f.size || 0), 0),
  }), []);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
        {/* Sub-header */}
        <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <HardDrive className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Drive</h1>
                <p className="text-[10px] text-zinc-500">{stats.total} arquivos • {formatFileSize(stats.totalSize)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setNewFolderOpen(true)}
              >
                <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
                Nova Pasta
              </Button>
              <Button 
                size="sm"
                className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setUploadOpen(true)}
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Upload
              </Button>
            </div>
          </div>
        </div>

        {/* Conteúdo Principal - Layout com Sidebar */}
        <div className="p-4 md:p-6">
          <div className="flex gap-6">
            {/* Sidebar de Navegação Hierárquica */}
            <div className="hidden lg:block w-72 flex-shrink-0">
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden sticky top-4">
                {/* Header da Sidebar */}
                <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5" />
                      Explorador
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                      onClick={() => setExpandedFolders(new Set())}
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Árvore de Navegação */}
                <div className="p-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                  {/* Raiz */}
                  <button
                    onClick={() => {
                      setCurrentFolder(null);
                      setBreadcrumbs([{ id: "root", name: "Meu Drive" }]);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all mb-1",
                      currentFolder === null
                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 font-medium"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    <HardDrive className="w-4 h-4 text-amber-500" />
                    <span className="flex-1 text-left">Meu Drive</span>
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{stats.total}</Badge>
                  </button>

                  {/* Árvore de Pastas */}
                  <div className="space-y-0.5">
                    {folderTree.map((node) => (
                      <FolderTreeItem
                        key={node.id}
                        node={node}
                        level={0}
                        currentFolder={currentFolder}
                        expandedFolders={expandedFolders}
                        onToggleExpand={(id) => {
                          setExpandedFolders(prev => {
                            const next = new Set(prev);
                            if (next.has(id)) {
                              next.delete(id);
                            } else {
                              next.add(id);
                            }
                            return next;
                          });
                        }}
                        onNavigate={navigateToFolder}
                      />
                    ))}
                  </div>
                </div>

                {/* Favoritos */}
                <div className="border-t border-zinc-100 dark:border-zinc-800 p-3">
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="w-full flex items-center justify-between text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 hover:text-zinc-700 dark:hover:text-zinc-300">
                      <span className="flex items-center gap-1.5">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        Favoritos
                      </span>
                      <ChevronDown className="w-3 h-3 transition-transform ui-open:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1">
                      {MOCK_FILES.filter(f => f.starred && !f.isFolder).slice(0, 5).map((file) => {
                        const fileType = getFileType(file.mimeType);
                        const Icon = FILE_ICONS[fileType];
                        const colorClass = FILE_COLORS[fileType];
                        return (
                          <button
                            key={file.id}
                            onClick={() => handlePreview(file)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <Icon className={cn("w-3.5 h-3.5", colorClass)} />
                            <span className="flex-1 text-left truncate">{file.name.split('.')[0]}</span>
                          </button>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                {/* Armazenamento */}
                <div className="border-t border-zinc-100 dark:border-zinc-800 p-3">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <HardDrive className="w-3 h-3" />
                    Armazenamento
                  </h3>
                  <div className="space-y-2">
                    <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                        style={{ width: "23%" }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-500">
                      <span>{formatFileSize(stats.totalSize)} usado</span>
                      <span>15 GB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Área Principal */}
            <div className="flex-1 space-y-4">
              {/* Stats Bar Compacta */}
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                      <Folder className="w-4 h-4 text-amber-500" />
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{stats.folders}</span>
                      <span className="text-zinc-500">pastas</span>
                    </div>
                    <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700" />
                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                      <File className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{stats.total}</span>
                      <span className="text-zinc-500">arquivos</span>
                    </div>
                    <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700" />
                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                      <Star className="w-4 h-4 text-amber-500" />
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{stats.starred}</span>
                      <span className="text-zinc-500">favoritos</span>
                    </div>
                    <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700" />
                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                      <HardDrive className="w-4 h-4 text-zinc-400" />
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatFileSize(stats.totalSize)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={viewMode === "list" ? "secondary" : "ghost"}
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setViewMode("list")}
                        >
                          <List className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Lista</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={viewMode === "grid" ? "secondary" : "ghost"}
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setViewMode("grid")}
                        >
                          <LayoutGrid className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Grade</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={previewMode === "preview" ? "secondary" : "ghost"}
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setPreviewMode(previewMode === "preview" ? "list" : "preview")}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Preview</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>

              {/* Acesso Rápido */}
              {currentFolder === null && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500" />
                      Acesso Rápido
                    </h3>
                    <span className="text-[10px] text-zinc-400">Arquivos recentes</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {MOCK_FILES
                      .filter(f => !f.isFolder)
                      .sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime())
                      .slice(0, 6)
                      .map((file) => {
                        const fileType = getFileType(file.mimeType);
                        const Icon = FILE_ICONS[fileType];
                        const colorClass = FILE_COLORS[fileType];
                        const bgClass = FILE_BG_COLORS[fileType];
                        return (
                          <button
                            key={file.id}
                            onClick={() => handlePreview(file)}
                            className={cn(
                              "flex-shrink-0 flex items-center gap-3 px-3 py-2 rounded-xl border transition-all hover:shadow-md",
                              "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                            )}
                          >
                            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", bgClass)}>
                              <Icon className={cn("w-4 h-4", colorClass)} />
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate max-w-28">
                                {file.name.split('.')[0]}
                              </p>
                              <p className="text-[10px] text-zinc-400">
                                {formatDistanceToNow(file.modifiedTime, { locale: ptBR, addSuffix: true })}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Breadcrumbs + Filtros */}
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center justify-between flex-wrap gap-3">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-1 text-sm">
                  {breadcrumbs.map((crumb, index) => (
                    <div key={crumb.id} className="flex items-center">
                      {index > 0 && <ChevronRight className="w-4 h-4 text-zinc-400 mx-1" />}
                      <button 
                        className={cn(
                          "px-2 py-1 rounded-md transition-colors",
                          index === breadcrumbs.length - 1 
                            ? "text-zinc-900 dark:text-zinc-100 font-medium" 
                            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        )}
                        onClick={() => navigateToBreadcrumb(index)}
                      >
                        {index === 0 && <Home className="w-4 h-4 inline mr-1" />}
                        {crumb.name}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Controles */}
                <div className="flex items-center gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input
                      placeholder="Buscar arquivos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-48 h-8 text-sm"
                    />
                    {searchTerm && (
                      <button 
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        onClick={() => setSearchTerm("")}
                      >
                        <XCircle className="w-4 h-4 text-zinc-400 hover:text-zinc-600" />
                      </button>
                    )}
                  </div>

                  {/* Filter */}
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <Filter className="w-3.5 h-3.5 mr-1.5" />
                      <SelectValue placeholder="Filtrar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="starred">Favoritos</SelectItem>
                      <SelectItem value="folder">Pastas</SelectItem>
                      <SelectItem value="pdf">PDFs</SelectItem>
                      <SelectItem value="document">Documentos</SelectItem>
                      <SelectItem value="image">Imagens</SelectItem>
                      <SelectItem value="video">Vídeos</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Sort */}
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Data</SelectItem>
                      <SelectItem value="name">Nome</SelectItem>
                      <SelectItem value="size">Tamanho</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* View Toggle */}
                  <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-md p-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-7 w-7 p-0", viewMode === "grid" && "bg-white dark:bg-zinc-700 shadow-sm")}
                      onClick={() => setViewMode("grid")}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-7 w-7 p-0", viewMode === "list" && "bg-white dark:bg-zinc-700 shadow-sm")}
                      onClick={() => setViewMode("list")}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Files Content */}
            <div className="p-4">
              {filteredFiles.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                  <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    {searchTerm ? "Nenhum arquivo encontrado" : "Pasta vazia"}
                  </h3>
                  <p className="text-sm text-zinc-500 mb-4">
                    {searchTerm ? "Tente ajustar os filtros de busca." : "Faça upload de arquivos ou crie uma nova pasta."}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" onClick={() => setNewFolderOpen(true)}>
                      <FolderPlus className="w-4 h-4 mr-2" />
                      Nova Pasta
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setUploadOpen(true)}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredFiles.map((file) => (
                    <FileCard 
                      key={file.id} 
                      file={file} 
                      viewMode="grid"
                      onPreview={handlePreview}
                      onNavigate={navigateToFolder}
                    />
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredFiles.map((file) => (
                    <FileCard 
                      key={file.id} 
                      file={file} 
                      viewMode="list"
                      onPreview={handlePreview}
                      onNavigate={navigateToFolder}
                    />
                  ))}
                </div>
              )}
            </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dialogs */}
        <PreviewDialog 
          file={previewFile} 
          open={previewOpen} 
          onClose={() => setPreviewOpen(false)} 
        />
        <UploadDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          currentFolder={currentFolder}
        />
        <NewFolderDialog
          open={newFolderOpen}
          onClose={() => setNewFolderOpen(false)}
          currentFolder={currentFolder}
        />
      </div>
    </TooltipProvider>
  );
}
