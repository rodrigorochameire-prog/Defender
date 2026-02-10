"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FolderOpen,
  Plus,
  RefreshCw,
  Trash2,
  Settings,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Clock,
  ArrowLeftRight,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Link2,
  Copy,
  Check,
  HardDrive,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  FileText,
  Users,
  Scale,
  Gavel,
  FolderSync,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

// ==========================================
// TIPOS
// ==========================================

interface SyncFolder {
  id: number;
  driveFolderId: string;
  name: string;
  description: string | null;
  syncDirection: string;
  isActive: boolean;
  lastSyncAt: Date | null;
  createdAt: Date;
}

// ==========================================
// COMPONENTES
// ==========================================

function ConnectionStatus({
  isConfigured,
  accountEmail,
  accountName,
}: {
  isConfigured: boolean;
  accountEmail?: string | null;
  accountName?: string | null;
}) {
  return (
    <Card className={cn(
      "p-6 border-2",
      isConfigured ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10" : "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center",
            isConfigured ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-amber-100 dark:bg-amber-900/30"
          )}>
            <HardDrive className={cn(
              "w-7 h-7",
              isConfigured ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
            )} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Google Drive</h3>
              <Badge className={cn(
                isConfigured
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              )}>
                {isConfigured ? (
                  <><CheckCircle2 className="w-3 h-3 mr-1" /> Conectado</>
                ) : (
                  <><AlertCircle className="w-3 h-3 mr-1" /> Não configurado</>
                )}
              </Badge>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {isConfigured
                ? "Integração ativa. Configure as pastas para sincronização abaixo."
                : "Configure as variáveis de ambiente para conectar ao Google Drive."
              }
            </p>
          </div>
        </div>
        {!isConfigured && (
          <Button variant="outline" asChild>
            <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Google Cloud Console
            </a>
          </Button>
        )}
      </div>

      {/* Mostrar conta autenticada */}
      {isConfigured && accountEmail && (
        <div className="mt-4 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            Conta Google autenticada:
          </h4>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                {accountEmail.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              {accountName && (
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{accountName}</p>
              )}
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{accountEmail}</p>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-3">
            💡 As pastas do Drive devem estar <strong>compartilhadas</strong> com esta conta para funcionar.
          </p>
        </div>
      )}

      {!isConfigured && (
        <div className="mt-6 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-amber-200 dark:border-amber-800">
          <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">
            Variáveis de ambiente necessárias:
          </h4>
          <div className="space-y-2 font-mono text-xs">
            <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded flex items-center justify-between">
              <code className="text-zinc-600 dark:text-zinc-400">GOOGLE_CLIENT_ID</code>
              <span className="text-rose-500">não definida</span>
            </div>
            <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded flex items-center justify-between">
              <code className="text-zinc-600 dark:text-zinc-400">GOOGLE_CLIENT_SECRET</code>
              <span className="text-rose-500">não definida</span>
            </div>
            <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded flex items-center justify-between">
              <code className="text-zinc-600 dark:text-zinc-400">GOOGLE_REFRESH_TOKEN</code>
              <span className="text-rose-500">não definida</span>
            </div>
            <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded flex items-center justify-between">
              <code className="text-zinc-600 dark:text-zinc-400">GOOGLE_DRIVE_ROOT_FOLDER_ID</code>
              <span className="text-rose-500">não definida</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function SyncFolderCard({ 
  folder, 
  onSync, 
  onRemove,
  isSyncing 
}: { 
  folder: SyncFolder;
  onSync: () => void;
  onRemove: () => void;
  isSyncing: boolean;
}) {
  const directionIcons = {
    bidirectional: <ArrowLeftRight className="w-4 h-4" />,
    drive_to_app: <ArrowRight className="w-4 h-4" />,
    app_to_drive: <ArrowLeft className="w-4 h-4" />,
  };
  
  const directionLabels = {
    bidirectional: "Bidirecional",
    drive_to_app: "Drive → App",
    app_to_drive: "App → Drive",
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100">{folder.name}</h4>
            {folder.description && (
              <p className="text-xs text-zinc-500">{folder.description}</p>
            )}
            <div className="flex items-center gap-3 mt-1">
              <Badge variant="outline" className="text-xs">
                {directionIcons[folder.syncDirection as keyof typeof directionIcons]}
                <span className="ml-1">{directionLabels[folder.syncDirection as keyof typeof directionLabels]}</span>
              </Badge>
              {folder.lastSyncAt && (
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(folder.lastSyncAt), { addSuffix: true, locale: ptBR })}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={onSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sincronizar agora</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  onClick={onRemove}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remover da sincronização</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <code className="text-xs text-zinc-400 font-mono break-all">
          ID: {folder.driveFolderId}
        </code>
      </div>
    </Card>
  );
}

// IDs das pastas de atribuição
const ATRIBUICAO_FOLDER_IDS = {
  JURI: "1_S-2qdqO0n1npNcs0PnoagBM4ZtwKhk-",
  VVD: "1fN2GiGlNzc61g01ZeBMg9ZBy1hexx0ti",
  EP: "1-mbwgP3-ygVVjoN9RPTbHwnaicnBAv0q",
  SUBSTITUICAO: "1eNDT0j-5KQkzYXbqK6IBa9sIMT3QFWVU",
};

// Pastas especiais
const SPECIAL_FOLDER_IDS = {
  JURISPRUDENCIA: "1Dvpn1r6b5nZ3bALst9_YEbZHlRDSPw7S",
  DISTRIBUICAO: "1dw8Hfpt_NLtLZ8DYDIcgjauo_xtM1nH4",
};

function SuggestedFolders({
  onAdd,
  onRegisterAll,
  isRegistering,
  existingFolderIds = [],
  accountEmail,
}: {
  onAdd: (folder: { name: string; description: string; folderId: string }) => void;
  onRegisterAll?: () => void;
  isRegistering?: boolean;
  existingFolderIds?: string[];
  accountEmail?: string | null;
}) {
  const suggestions = [
    {
      name: "Júri",
      description: "Assistidos da atribuição do Tribunal do Júri",
      icon: Gavel,
      folderId: ATRIBUICAO_FOLDER_IDS.JURI,
      color: "emerald" as const,
    },
    {
      name: "VVD",
      description: "Violência e Vítimas Domésticas",
      icon: Users,
      folderId: ATRIBUICAO_FOLDER_IDS.VVD,
      color: "amber" as const,
    },
    {
      name: "Execução Penal",
      description: "Assistidos em Execução Penal",
      icon: Scale,
      folderId: ATRIBUICAO_FOLDER_IDS.EP,
      color: "blue" as const,
    },
    {
      name: "Substituição",
      description: "Assistidos em Substituição",
      icon: FileText,
      folderId: ATRIBUICAO_FOLDER_IDS.SUBSTITUICAO,
      color: "zinc" as const,
    },
  ];

  // Filtrar sugestões que já estão registradas
  const availableSuggestions = suggestions.filter(
    s => !existingFolderIds.includes(s.folderId)
  );

  if (availableSuggestions.length === 0) {
    return null;
  }

  const colorClasses = {
    emerald: "hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/10",
    amber: "hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/10",
    blue: "hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/10",
    zinc: "hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
  };

  const iconColorClasses = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    blue: "text-blue-600 dark:text-blue-400",
    zinc: "text-zinc-600 dark:text-zinc-400",
  };

  return (
    <Card className="p-4 border-dashed">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Pastas de Atribuição
          </h4>
          <p className="text-xs text-zinc-500 mt-1">
            Estrutura: Atribuição → Assistido → Processo → Documentos
          </p>
        </div>
        {onRegisterAll && availableSuggestions.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRegisterAll}
            disabled={isRegistering}
            className="border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
          >
            {isRegistering ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FolderSync className="w-4 h-4 mr-2" />
            )}
            Registrar Todas
          </Button>
        )}
      </div>

      {/* Alerta de compartilhamento */}
      {accountEmail && (
        <div className="mb-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <p className="font-medium text-amber-700 dark:text-amber-300">
                As pastas devem ser acessíveis por sua conta Google
              </p>
              <p className="text-amber-600 dark:text-amber-400 mt-1">
                As pastas precisam estar na sua conta{" "}
                <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded font-mono text-[10px]">
                  {accountEmail}
                </code>
                {" "}ou compartilhadas com ela (Editor).
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {availableSuggestions.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <button
              key={suggestion.name}
              onClick={() => onAdd(suggestion)}
              className={cn(
                "p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-all text-left group",
                colorClasses[suggestion.color]
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn("w-4 h-4 text-zinc-400 group-hover:" + iconColorClasses[suggestion.color])} />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {suggestion.name}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">{suggestion.description}</p>
              <code className="text-[10px] text-zinc-400 font-mono mt-2 block truncate">
                {suggestion.folderId}
              </code>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function DriveConfigPage() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<SyncFolder | null>(null);
  const [syncingFolderId, setSyncingFolderId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    folderId: "",
    name: "",
    description: "",
    syncDirection: "bidirectional" as "bidirectional" | "drive_to_app" | "app_to_drive",
  });

  // tRPC queries
  const { data: configStatus, isLoading: isCheckingConfig } = trpc.drive.isConfigured.useQuery();
  const { data: syncFolders, isLoading: isLoadingFolders, refetch: refetchFolders } = trpc.drive.syncFolders.useQuery(undefined, {
    enabled: configStatus?.configured === true,
  });
  const { data: stats } = trpc.drive.stats.useQuery(undefined, {
    enabled: configStatus?.configured === true,
  });
  const { data: rootLink } = trpc.drive.getRootLink.useQuery(undefined, {
    enabled: configStatus?.configured === true,
  });
  const { data: accountInfo } = trpc.drive.getAccountInfo.useQuery(undefined, {
    enabled: configStatus?.configured === true,
  });

  // Mutations
  const registerMutation = trpc.drive.registerFolder.useMutation({
    onSuccess: () => {
      toast.success("Pasta registrada para sincronização!");
      setAddModalOpen(false);
      resetForm();
      refetchFolders();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao registrar pasta");
    },
  });

  const removeMutation = trpc.drive.removeFolder.useMutation({
    onSuccess: () => {
      toast.success("Pasta removida da sincronização");
      setRemoveDialogOpen(false);
      setSelectedFolder(null);
      refetchFolders();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao remover pasta");
    },
  });

  const syncMutation = trpc.drive.syncFolder.useMutation({
    onSuccess: (result) => {
      toast.success(`Sincronizado: ${result.added} novos, ${result.updated} atualizados`);
      setSyncingFolderId(null);
      refetchFolders();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao sincronizar");
      setSyncingFolderId(null);
    },
  });

  const syncAllMutation = trpc.drive.syncAll.useMutation({
    onSuccess: (results) => {
      const total = results.reduce((acc, r) => acc + r.added + r.updated, 0);
      toast.success(`Sincronização concluída: ${total} alterações`);
      refetchFolders();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao sincronizar");
    },
  });

  const registerAllMutation = trpc.drive.registerAllAtribuicoes.useMutation({
    onSuccess: (data) => {
      const registered = data.results.filter(r => r.status === "registered").length;
      const reactivated = data.results.filter(r => r.status === "reactivated").length;
      const existing = data.results.filter(r => r.status === "already_exists").length;

      if (registered > 0 || reactivated > 0) {
        toast.success(`${registered + reactivated} pastas configuradas! (${existing} já existiam)`);
      } else {
        toast.info("Todas as pastas já estavam configuradas");
      }
      refetchFolders();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao registrar pastas");
    },
  });

  const resetForm = () => {
    setFormData({
      folderId: "",
      name: "",
      description: "",
      syncDirection: "bidirectional",
    });
  };

  const handleAddFolder = () => {
    if (!formData.folderId || !formData.name) {
      toast.error("Preencha o ID da pasta e o nome");
      return;
    }
    registerMutation.mutate({
      folderId: formData.folderId,
      name: formData.name,
      description: formData.description || undefined,
      syncDirection: formData.syncDirection,
    });
  };

  const handleRemoveFolder = () => {
    if (!selectedFolder) return;
    removeMutation.mutate({ folderId: selectedFolder.driveFolderId });
  };

  const handleSyncFolder = (folder: SyncFolder) => {
    setSyncingFolderId(folder.driveFolderId);
    syncMutation.mutate({ folderId: folder.driveFolderId });
  };

  const handleSuggestionClick = (suggestion: { name: string; description: string; folderId?: string }) => {
    setFormData({
      ...formData,
      folderId: suggestion.folderId || "",
      name: suggestion.name,
      description: suggestion.description,
    });
    setAddModalOpen(true);
  };

  // Loading
  if (isCheckingConfig) {
    return (
      <div className="p-6 max-w-[1200px] mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const isConfigured = configStatus?.configured === true;

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
            <HardDrive className="w-5 h-5 text-white dark:text-zinc-900" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              Configuração do Google Drive
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Gerencie a integração e pastas sincronizadas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/distribuicao">
            <Button variant="outline" size="sm">
              <FolderPlus className="w-4 h-4 mr-2" />
              Distribuição
            </Button>
          </Link>
          <Link href="/admin/drive">
            <Button variant="outline" size="sm">
              <FolderOpen className="w-4 h-4 mr-2" />
              Abrir Drive
            </Button>
          </Link>
          {isConfigured && rootLink?.link && (
            <a href={rootLink.link} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir no Google
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Status da Conexão */}
      <ConnectionStatus
        isConfigured={isConfigured}
        accountEmail={accountInfo?.email}
        accountName={accountInfo?.name}
      />

      {/* Pastas Sincronizadas */}
      {isConfigured && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Pastas Sincronizadas
              </h2>
              <p className="text-sm text-zinc-500">
                {syncFolders?.length || 0} pastas configuradas • {stats?.totalFiles || 0} arquivos sincronizados
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => syncAllMutation.mutate()}
                disabled={syncAllMutation.isPending || !syncFolders?.length}
              >
                {syncAllMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Sincronizar Todas
              </Button>
              <Button 
                size="sm"
                onClick={() => {
                  resetForm();
                  setAddModalOpen(true);
                }}
                className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Pasta
              </Button>
            </div>
          </div>

          {isLoadingFolders ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : syncFolders && syncFolders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {syncFolders.map((folder) => (
                <SyncFolderCard
                  key={folder.id}
                  folder={folder}
                  onSync={() => handleSyncFolder(folder)}
                  onRemove={() => {
                    setSelectedFolder(folder);
                    setRemoveDialogOpen(true);
                  }}
                  isSyncing={syncingFolderId === folder.driveFolderId}
                />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center border-dashed">
              <FolderOpen className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
              <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Nenhuma pasta sincronizada
              </h3>
              <p className="text-sm text-zinc-500 mb-4">
                Adicione pastas do Google Drive para sincronizar com a aplicação
              </p>
              <Button onClick={() => setAddModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Pasta
              </Button>
            </Card>
          )}

          {/* Sugestões */}
          <SuggestedFolders
            onAdd={handleSuggestionClick}
            onRegisterAll={() => registerAllMutation.mutate()}
            isRegistering={registerAllMutation.isPending}
            existingFolderIds={syncFolders?.map(f => f.driveFolderId) || []}
            accountEmail={accountInfo?.email}
          />

          {/* Instruções */}
          <Card className="p-6 bg-zinc-50 dark:bg-zinc-900/50">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Como obter o ID de uma pasta do Google Drive
            </h3>
            <ol className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium shrink-0">1</span>
                <span>Abra o Google Drive e navegue até a pasta desejada</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium shrink-0">2</span>
                <span>Copie o URL da barra de endereços do navegador</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium shrink-0">3</span>
                <span>O ID é a parte final do URL após <code className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded text-xs">/folders/</code></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium shrink-0">4</span>
                <div>
                  <span>Exemplo: </span>
                  <code className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded text-xs break-all">
                    https://drive.google.com/drive/folders/<strong>1ABC123xyz...</strong>
                  </code>
                </div>
              </li>
            </ol>
          </Card>
        </>
      )}

      {/* Modal: Adicionar Pasta */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Pasta para Sincronização</DialogTitle>
            <DialogDescription>
              Configure uma pasta do Google Drive para sincronizar com a aplicação
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folderId">ID da Pasta (Google Drive) *</Label>
              <Input
                id="folderId"
                value={formData.folderId}
                onChange={(e) => setFormData({ ...formData, folderId: e.target.value })}
                placeholder="1ABC123xyz..."
                className="font-mono"
              />
              <p className="text-xs text-zinc-500">
                Copie o ID da URL da pasta no Google Drive
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Pasta *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Assistidos, Processos..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Documentos organizados por assistido"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="syncDirection">Direção da Sincronização</Label>
              <Select 
                value={formData.syncDirection} 
                onValueChange={(v) => setFormData({ ...formData, syncDirection: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bidirectional">
                    <div className="flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4" />
                      Bidirecional
                    </div>
                  </SelectItem>
                  <SelectItem value="drive_to_app">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4" />
                      Drive → Aplicação
                    </div>
                  </SelectItem>
                  <SelectItem value="app_to_drive">
                    <div className="flex items-center gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      Aplicação → Drive
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddFolder} 
              disabled={registerMutation.isPending}
              className="bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900"
            >
              {registerMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog: Confirmar remoção */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover pasta da sincronização?</AlertDialogTitle>
            <AlertDialogDescription>
              A pasta <strong>{selectedFolder?.name}</strong> será removida da sincronização.
              Os arquivos não serão excluídos do Google Drive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveFolder}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {removeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
