"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  FolderInput,
  FileText,
  Upload,
  RefreshCw,
  Eye,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Search,
  Inbox,
  FolderOpen,
  Gavel,
  Shield,
  Lock,
  Scale,
  Clock,
  User,
  Hash,
  Building2,
  ArrowRight,
  ExternalLink,
  Link2,
  Plus,
  History,
  Sparkles,
  X,
  SplitSquareVertical,
  Maximize2,
  Minimize2,
  FileCheck,
  AlertCircle,
  Briefcase,
  Calendar,
  Tag,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { HomonymiaModal, SelectAssistedModal, type HomonymiaSuggestion } from "@/components/drive";
import Link from "next/link";

// ==========================================
// CONFIGURAÇÕES
// ==========================================

const ATRIBUICAO_CONFIG = {
  JURI: {
    label: "Júri",
    icon: Gavel,
    color: "emerald",
    bgClass: "bg-emerald-500/20",
    textClass: "text-emerald-600 dark:text-emerald-400",
    borderClass: "border-emerald-500",
    ringClass: "ring-emerald-500/30",
  },
  VVD: {
    label: "Violência Doméstica",
    icon: Shield,
    color: "amber",
    bgClass: "bg-amber-500/20",
    textClass: "text-amber-600 dark:text-amber-400",
    borderClass: "border-amber-500",
    ringClass: "ring-amber-500/30",
  },
  EP: {
    label: "Execução Penal",
    icon: Lock,
    color: "blue",
    bgClass: "bg-blue-500/20",
    textClass: "text-blue-600 dark:text-blue-400",
    borderClass: "border-blue-500",
    ringClass: "ring-blue-500/30",
  },
  SUBSTITUICAO: {
    label: "Substituição",
    icon: Scale,
    color: "rose",
    bgClass: "bg-rose-500/20",
    textClass: "text-rose-600 dark:text-rose-400",
    borderClass: "border-rose-500",
    ringClass: "ring-rose-500/30",
  },
} as const;

type AtribuicaoType = keyof typeof ATRIBUICAO_CONFIG;

// ==========================================
// COMPONENTES
// ==========================================

function FileCard({
  file,
  onProcess,
  isProcessing,
  isSelected,
}: {
  file: {
    id: string;
    name: string;
    size?: string;
    createdTime?: string;
    webViewLink?: string;
    thumbnailLink?: string;
  };
  onProcess: () => void;
  isProcessing: boolean;
  isSelected: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border transition-all cursor-pointer",
        isSelected
          ? "border-emerald-500 ring-2 ring-emerald-500/20"
          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
      )}
      onClick={onProcess}
    >
      <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0">
        <FileText className="w-6 h-6 text-rose-600 dark:text-rose-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
          {file.name}
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
          {file.size && <span>{file.size}</span>}
          {file.createdTime && (
            <span>
              {formatDistanceToNow(new Date(file.createdTime), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {file.webViewLink && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              window.open(file.webViewLink, "_blank");
            }}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        )}
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
        ) : isSelected ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-zinc-400" />
        )}
      </div>
    </div>
  );
}

// Preview do PDF com visualização inline
function PdfPreview({
  webViewLink,
  isExpanded,
  onToggleExpand,
}: {
  webViewLink?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  if (!webViewLink) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
        <div className="text-center p-8">
          <FileText className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500">Nenhum documento selecionado</p>
        </div>
      </div>
    );
  }

  // Converter link do Google Drive para embed
  const embedUrl = webViewLink.replace("/view", "/preview");

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 bg-zinc-100 dark:bg-zinc-800 rounded-t-xl">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Visualização do Documento
        </span>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => window.open(webViewLink, "_blank")}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Abrir no Drive</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={onToggleExpand}
                >
                  {isExpanded ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isExpanded ? "Reduzir" : "Expandir"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className="flex-1 bg-white dark:bg-zinc-900 rounded-b-xl overflow-hidden">
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          title="PDF Preview"
          allow="autoplay"
        />
      </div>
    </div>
  );
}

// Card de Processo Existente Encontrado
function ProcessoExistenteCard({
  processo,
  onUse,
  onIgnore,
}: {
  processo: {
    id: number;
    numero: string;
    assistidoId: number | null;
    assistidoNome: string | null;
    tipoProcesso: string | null;
    driveFolderId: string | null;
  };
  onUse: () => void;
  onIgnore: () => void;
}) {
  return (
    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <Link2 className="w-5 h-5 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-blue-700 dark:text-blue-300">
              Processo Encontrado!
            </span>
            <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">
              Existente
            </Badge>
          </div>
          <p className="text-sm font-mono text-zinc-700 dark:text-zinc-300 mb-1">
            {processo.numero}
          </p>
          {processo.assistidoNome && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {processo.assistidoNome}
            </p>
          )}
          {processo.tipoProcesso && (
            <Badge variant="secondary" className="text-xs mt-2">
              {processo.tipoProcesso}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <Button
          size="sm"
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          onClick={onUse}
        >
          <Link2 className="w-4 h-4 mr-1" />
          Vincular a este processo
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onIgnore}
        >
          Ignorar
        </Button>
      </div>
    </div>
  );
}

// Card de Dados Extraídos com melhor layout
function ExtractedDataCard({
  data,
  processoExistente,
  onConfirm,
  onCancel,
  onLinkToProcesso,
  onCreateDemanda,
  isLoading,
  showCreateDemanda,
}: {
  data: {
    numeroProcesso: string | null;
    orgaoJulgador: string | null;
    classeDemanda: string | null;
    assuntos: string | null;
    assistidos: Array<{ original: string; formatted: string; papel?: string }>;
    atribuicao: AtribuicaoType | null;
    atribuicaoConfianca: number;
    atribuicaoMotivo: string | null;
    tipoDocumento?: string | null;
    dataDocumento?: string | null;
    resumo?: string | null;
  };
  processoExistente: {
    id: number;
    numero: string;
    assistidoId: number | null;
    assistidoNome: string | null;
    tipoProcesso: string | null;
    driveFolderId: string | null;
  } | null;
  onConfirm: (formData: {
    atribuicao: AtribuicaoType;
    assistidoNome: string;
    numeroProcesso: string;
  }) => void;
  onCancel: () => void;
  onLinkToProcesso: (processoId: number) => void;
  onCreateDemanda: (data: {
    atribuicao: AtribuicaoType;
    assistidoNome: string;
    numeroProcesso: string;
  }) => void;
  isLoading: boolean;
  showCreateDemanda: boolean;
}) {
  const [selectedAtribuicao, setSelectedAtribuicao] = useState<AtribuicaoType>(
    data.atribuicao || "SUBSTITUICAO"
  );
  const [selectedAssistido, setSelectedAssistido] = useState(
    data.assistidos[0]?.formatted || ""
  );
  const [numeroProcesso, setNumeroProcesso] = useState(
    data.numeroProcesso || ""
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ignoreExistingProcesso, setIgnoreExistingProcesso] = useState(false);

  const atribConfig = ATRIBUICAO_CONFIG[selectedAtribuicao];

  // Verificar se todos os campos obrigatórios estão preenchidos
  const canSubmit = selectedAssistido.trim() && numeroProcesso.trim();

  return (
    <div className="space-y-4">
      {/* Processo Existente */}
      {processoExistente && !ignoreExistingProcesso && (
        <ProcessoExistenteCard
          processo={processoExistente}
          onUse={() => onLinkToProcesso(processoExistente.id)}
          onIgnore={() => setIgnoreExistingProcesso(true)}
        />
      )}

      {/* Dados Extraídos */}
      <Card className="border-2 border-emerald-500/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Dados Extraídos por IA
            </CardTitle>
            {data.tipoDocumento && (
              <Badge variant="secondary" className="text-xs">
                {data.tipoDocumento}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Resumo */}
          {data.resumo && (
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-sm text-zinc-600 dark:text-zinc-400">
              {data.resumo}
            </div>
          )}

          {/* Grid de informações */}
          <div className="grid grid-cols-2 gap-3">
            {data.orgaoJulgador && (
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 col-span-2">
                <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                  <Building2 className="w-3.5 h-3.5" />
                  Órgão Julgador
                </div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {data.orgaoJulgador}
                </p>
              </div>
            )}
            {data.classeDemanda && (
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                <p className="text-xs text-zinc-500 mb-1">Classe</p>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {data.classeDemanda}
                </p>
              </div>
            )}
            {data.assuntos && (
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                <p className="text-xs text-zinc-500 mb-1">Assuntos</p>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {data.assuntos}
                </p>
              </div>
            )}
          </div>

          {/* Atribuição Identificada */}
          {data.atribuicao && (
            <div
              className={cn(
                "p-3 rounded-lg border-l-4",
                ATRIBUICAO_CONFIG[data.atribuicao].bgClass,
                ATRIBUICAO_CONFIG[data.atribuicao].borderClass
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {React.createElement(ATRIBUICAO_CONFIG[data.atribuicao].icon, {
                    className: cn(
                      "w-4 h-4",
                      ATRIBUICAO_CONFIG[data.atribuicao].textClass
                    ),
                  })}
                  <span
                    className={cn(
                      "font-medium",
                      ATRIBUICAO_CONFIG[data.atribuicao].textClass
                    )}
                  >
                    {ATRIBUICAO_CONFIG[data.atribuicao].label}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {data.atribuicaoConfianca}% confiança
                </Badge>
              </div>
              {data.atribuicaoMotivo && (
                <p className="text-xs text-zinc-500 mt-1">
                  {data.atribuicaoMotivo}
                </p>
              )}
            </div>
          )}

          {/* Formulário de Confirmação */}
          <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            {/* Atribuição */}
            <div className="space-y-2">
              <Label className="text-xs">Atribuição</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(ATRIBUICAO_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedAtribuicao(key as AtribuicaoType)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left",
                      selectedAtribuicao === key
                        ? cn(config.bgClass, config.borderClass, "ring-2", config.ringClass)
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                    )}
                  >
                    {React.createElement(config.icon, {
                      className: cn("w-4 h-4", config.textClass),
                    })}
                    <span className="text-sm font-medium">{config.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Assistido */}
            <div className="space-y-2">
              <Label className="text-xs">Nome do Assistido</Label>
              {data.assistidos.length > 1 ? (
                <Select
                  value={selectedAssistido}
                  onValueChange={setSelectedAssistido}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o assistido" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.assistidos.map((a, i) => (
                      <SelectItem key={i} value={a.formatted}>
                        <div className="flex items-center gap-2">
                          <span>{a.formatted}</span>
                          {a.papel && (
                            <Badge variant="outline" className="text-xs">
                              {a.papel}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={selectedAssistido}
                  onChange={(e) => setSelectedAssistido(e.target.value)}
                  placeholder="Nome do assistido"
                />
              )}
            </div>

            {/* Número do Processo */}
            <div className="space-y-2">
              <Label className="text-xs">Número do Processo</Label>
              <Input
                value={numeroProcesso}
                onChange={(e) => setNumeroProcesso(e.target.value)}
                placeholder="0000000-00.0000.0.00.0000"
                className="font-mono"
              />
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-col gap-2 pt-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  onConfirm({
                    atribuicao: selectedAtribuicao,
                    assistidoNome: selectedAssistido,
                    numeroProcesso,
                  })
                }
                disabled={isLoading || !canSubmit}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <FolderInput className="w-4 h-4 mr-2" />
                )}
                Distribuir
              </Button>
            </div>
            {showCreateDemanda && (
              <Button
                variant="outline"
                onClick={() =>
                  onCreateDemanda({
                    atribuicao: selectedAtribuicao,
                    assistidoNome: selectedAssistido,
                    numeroProcesso,
                  })
                }
                disabled={isLoading || !canSubmit}
                className="w-full border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Distribuir + Criar Demanda
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Histórico de Distribuições
function HistoryCard({
  item,
}: {
  item: {
    id: number;
    originalFilename: string;
    extractedNumeroProcesso: string | null;
    extractedAssistidoNome: string | null;
    atribuicaoIdentificada: string | null;
    status: string;
    processedAt: Date | null;
  };
}) {
  const atribConfig = item.atribuicaoIdentificada
    ? ATRIBUICAO_CONFIG[item.atribuicaoIdentificada as AtribuicaoType]
    : null;

  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          item.status === "completed"
            ? "bg-emerald-100 dark:bg-emerald-900/30"
            : "bg-red-100 dark:bg-red-900/30"
        )}
      >
        {item.status === "completed" ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
          {item.originalFilename}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {item.extractedAssistidoNome && (
            <span className="text-xs text-zinc-500 truncate">
              {item.extractedAssistidoNome}
            </span>
          )}
          {atribConfig && (
            <Badge
              variant="outline"
              className={cn("text-xs", atribConfig.textClass)}
            >
              {atribConfig.label}
            </Badge>
          )}
        </div>
      </div>
      {item.processedAt && (
        <span className="text-xs text-zinc-400">
          {formatDistanceToNow(new Date(item.processedAt), {
            addSuffix: true,
            locale: ptBR,
          })}
        </span>
      )}
    </div>
  );
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function DistribuicaoPage() {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{
    id: string;
    name: string;
    webViewLink?: string;
  } | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [showHomonymiaModal, setShowHomonymiaModal] = useState(false);
  const [homonymiaSuggestions, setHomonymiaSuggestions] = useState<
    HomonymiaSuggestion[]
  >([]);
  const [pendingDistribution, setPendingDistribution] = useState<{
    atribuicao: AtribuicaoType;
    assistidoNome: string;
    numeroProcesso: string;
    createDemanda?: boolean;
  } | null>(null);
  const [processoExistente, setProcessoExistente] = useState<{
    id: number;
    numero: string;
    assistidoId: number | null;
    assistidoNome: string | null;
    tipoProcesso: string | null;
    driveFolderId: string | null;
  } | null>(null);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [viewMode, setViewMode] = useState<"split" | "list">("split");

  // Queries
  const { data: pendingFiles, isLoading: isLoadingFiles, refetch: refetchFiles } =
    trpc.distribuicao.listPending.useQuery();

  const { data: history, isLoading: isLoadingHistory } =
    trpc.distribuicao.history.useQuery({ limit: 20 });

  // Mutations
  const extractMutation = trpc.distribuicao.extractData.useMutation({
    onSuccess: (data) => {
      setExtractedData(data);
      // Buscar processo existente
      if (data.numeroProcesso) {
        searchProcessoMutation.mutate({ numeroProcesso: data.numeroProcesso });
      }
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao extrair dados do PDF");
      setSelectedFileId(null);
      setSelectedFile(null);
    },
  });

  const searchProcessoMutation = trpc.distribuicao.searchProcesso.useMutation({
    onSuccess: (data) => {
      setProcessoExistente(data);
    },
  });

  const searchSimilarMutation = trpc.distribuicao.searchSimilar.useMutation();

  const distributeMutation = trpc.distribuicao.distribute.useMutation({
    onSuccess: (result) => {
      toast.success("Documento distribuído com sucesso!");

      // Se criou demanda, redirecionar
      if (pendingDistribution?.createDemanda && result.assistidoId) {
        window.open(`/admin/demandas/nova?assistidoId=${result.assistidoId}&numero=${pendingDistribution.numeroProcesso}`, "_blank");
      }

      setSelectedFileId(null);
      setSelectedFile(null);
      setExtractedData(null);
      setPendingDistribution(null);
      setProcessoExistente(null);
      refetchFiles();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao distribuir documento");
    },
  });

  const linkToProcessoMutation = trpc.distribuicao.linkToProcesso.useMutation({
    onSuccess: () => {
      toast.success("Documento vinculado ao processo existente!");
      setSelectedFileId(null);
      setSelectedFile(null);
      setExtractedData(null);
      setProcessoExistente(null);
      refetchFiles();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao vincular documento");
    },
  });

  // Handlers
  const handleProcessFile = async (file: {
    id: string;
    name: string;
    webViewLink?: string;
  }) => {
    setSelectedFileId(file.id);
    setSelectedFile(file);
    setExtractedData(null);
    setProcessoExistente(null);
    extractMutation.mutate({ fileId: file.id });
  };

  const handleConfirmDistribution = async (formData: {
    atribuicao: AtribuicaoType;
    assistidoNome: string;
    numeroProcesso: string;
  }, createDemanda = false) => {
    // Buscar assistidos similares
    const similar = await searchSimilarMutation.mutateAsync({
      nome: formData.assistidoNome,
    });

    if (similar.length > 0) {
      // Mostrar modal de homonímia
      setHomonymiaSuggestions(
        similar.map((s) => ({
          id: s.id,
          nome: s.nome,
          cpf: s.cpf,
          atribuicao: s.atribuicao,
          driveFolderId: s.driveFolderId,
          similarity: s.similarity as "exact" | "similar" | "first_last",
        }))
      );
      setPendingDistribution({ ...formData, createDemanda });
      setShowHomonymiaModal(true);
    } else {
      // Sem homonímia, criar novo
      distributeMutation.mutate({
        fileId: selectedFileId!,
        ...formData,
        createNewAssistido: true,
      });
      if (createDemanda) {
        setPendingDistribution({ ...formData, createDemanda: true });
      }
    }
  };

  const handleLinkToProcesso = (processoId: number) => {
    if (!selectedFileId || !extractedData?.atribuicao) return;

    linkToProcessoMutation.mutate({
      fileId: selectedFileId,
      processoId,
      atribuicao: extractedData.atribuicao,
    });
  };

  const handleHomonymiaSelect = (
    selection: { type: "existing"; assistidoId: number } | { type: "new" }
  ) => {
    if (!pendingDistribution || !selectedFileId) return;

    if (selection.type === "existing") {
      distributeMutation.mutate({
        fileId: selectedFileId,
        ...pendingDistribution,
        assistidoId: selection.assistidoId,
        createNewAssistido: false,
      });
    } else {
      distributeMutation.mutate({
        fileId: selectedFileId,
        ...pendingDistribution,
        createNewAssistido: true,
      });
    }

    setShowHomonymiaModal(false);
  };

  const handleCancel = () => {
    setSelectedFileId(null);
    setSelectedFile(null);
    setExtractedData(null);
    setPendingDistribution(null);
    setProcessoExistente(null);
  };

  // Stats
  const stats = useMemo(() => {
    const pending = pendingFiles?.length || 0;
    const completed = history?.filter((h) => h.status === "completed").length || 0;
    const failed = history?.filter((h) => h.status === "failed").length || 0;

    return { pending, completed, failed };
  }, [pendingFiles, history]);

  return (
    <div className="h-screen flex flex-col bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <FolderInput className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                Distribuição
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Distribuição automática de documentos com IA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Stats */}
            <div className="hidden md:flex items-center gap-4 mr-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {stats.pending} pendentes
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {stats.completed} distribuídos
                </span>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <Button
                variant={viewMode === "split" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 rounded-r-none"
                onClick={() => setViewMode("split")}
              >
                <SplitSquareVertical className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 rounded-l-none"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchFiles()}
              className="h-8"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-4 md:p-6">
        {viewMode === "split" ? (
          // Split View
          <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Lista de Arquivos */}
            <div className="flex flex-col h-full overflow-hidden">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "pending" | "history")}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <TabsList className="mb-3 w-full grid grid-cols-2">
                  <TabsTrigger value="pending" className="flex items-center gap-1">
                    <Inbox className="w-4 h-4" />
                    Pendentes
                    {stats.pending > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                        {stats.pending}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex items-center gap-1">
                    <History className="w-4 h-4" />
                    Histórico
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="flex-1 overflow-auto m-0 pr-1">
                  {isLoadingFiles ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 rounded-xl" />
                      ))}
                    </div>
                  ) : pendingFiles && pendingFiles.length > 0 ? (
                    <div className="space-y-2">
                      {pendingFiles.map((file) => (
                        <FileCard
                          key={file.id}
                          file={file}
                          onProcess={() => handleProcessFile(file)}
                          isProcessing={
                            extractMutation.isPending && selectedFileId === file.id
                          }
                          isSelected={selectedFileId === file.id}
                        />
                      ))}
                    </div>
                  ) : (
                    <Card className="p-8 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      </div>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                        Nenhum arquivo pendente
                      </h3>
                      <p className="text-sm text-zinc-500">
                        Todos os documentos foram distribuídos
                      </p>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="history" className="flex-1 overflow-auto m-0 pr-1">
                  {isLoadingHistory ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 rounded-lg" />
                      ))}
                    </div>
                  ) : history && history.length > 0 ? (
                    <div className="space-y-2">
                      {history.map((item) => (
                        <HistoryCard key={item.id} item={item} />
                      ))}
                    </div>
                  ) : (
                    <Card className="p-8 text-center">
                      <History className="w-8 h-8 mx-auto mb-3 text-zinc-400" />
                      <p className="text-sm text-zinc-500">
                        Nenhuma distribuição realizada ainda
                      </p>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Preview do PDF */}
            <div
              className={cn(
                "h-full transition-all",
                isPreviewExpanded ? "lg:col-span-2" : "lg:col-span-1"
              )}
            >
              <PdfPreview
                webViewLink={selectedFile?.webViewLink}
                isExpanded={isPreviewExpanded}
                onToggleExpand={() => setIsPreviewExpanded(!isPreviewExpanded)}
              />
            </div>

            {/* Dados Extraídos */}
            {!isPreviewExpanded && (
              <div className="h-full overflow-auto">
                {extractMutation.isPending ? (
                  <Card className="p-8 text-center">
                    <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-emerald-500" />
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                      Analisando documento com IA...
                    </p>
                    <p className="text-xs text-zinc-500">
                      Extraindo dados do PDF com Gemini Vision
                    </p>
                  </Card>
                ) : extractedData ? (
                  <ExtractedDataCard
                    data={extractedData}
                    processoExistente={processoExistente}
                    onConfirm={(formData) => handleConfirmDistribution(formData, false)}
                    onCancel={handleCancel}
                    onLinkToProcesso={handleLinkToProcesso}
                    onCreateDemanda={(formData) => handleConfirmDistribution(formData, true)}
                    isLoading={
                      searchSimilarMutation.isPending ||
                      distributeMutation.isPending ||
                      linkToProcessoMutation.isPending
                    }
                    showCreateDemanda={true}
                  />
                ) : (
                  <Card className="p-8 text-center border-dashed border-2">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <FileCheck className="w-8 h-8 text-zinc-400" />
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                      Selecione um documento
                    </h3>
                    <p className="text-sm text-zinc-500">
                      Clique em um documento para visualizar e extrair os dados
                    </p>
                  </Card>
                )}
              </div>
            )}
          </div>
        ) : (
          // List View (original layout)
          <div className="h-full overflow-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lista de Arquivos Pendentes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-zinc-400" />
                    Caixa de Entrada
                  </h2>
                  {pendingFiles && (
                    <Badge variant="secondary">
                      {pendingFiles.length} pendente{pendingFiles.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>

                {isLoadingFiles ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 rounded-xl" />
                    ))}
                  </div>
                ) : pendingFiles && pendingFiles.length > 0 ? (
                  <div className="space-y-3">
                    {pendingFiles.map((file) => (
                      <FileCard
                        key={file.id}
                        file={file}
                        onProcess={() => handleProcessFile(file)}
                        isProcessing={
                          extractMutation.isPending && selectedFileId === file.id
                        }
                        isSelected={selectedFileId === file.id}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                      Nenhum arquivo pendente
                    </h3>
                    <p className="text-sm text-zinc-500">
                      Todos os documentos foram distribuídos
                    </p>
                  </Card>
                )}
              </div>

              {/* Preview e Confirmação */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-zinc-400" />
                  Processamento
                </h2>

                {extractMutation.isPending ? (
                  <Card className="p-8 text-center">
                    <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-emerald-500" />
                    <p className="text-sm text-zinc-500">
                      Extraindo dados do documento...
                    </p>
                  </Card>
                ) : extractedData ? (
                  <ExtractedDataCard
                    data={extractedData}
                    processoExistente={processoExistente}
                    onConfirm={(formData) => handleConfirmDistribution(formData, false)}
                    onCancel={handleCancel}
                    onLinkToProcesso={handleLinkToProcesso}
                    onCreateDemanda={(formData) => handleConfirmDistribution(formData, true)}
                    isLoading={
                      searchSimilarMutation.isPending ||
                      distributeMutation.isPending ||
                      linkToProcessoMutation.isPending
                    }
                    showCreateDemanda={true}
                  />
                ) : (
                  <Card className="p-8 text-center border-dashed border-2">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <FolderOpen className="w-8 h-8 text-zinc-400" />
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                      Selecione um documento
                    </h3>
                    <p className="text-sm text-zinc-500">
                      Clique em &ldquo;Processar&rdquo; em um documento da lista para extrair
                      os dados
                    </p>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Homonímia */}
      <HomonymiaModal
        open={showHomonymiaModal}
        onOpenChange={setShowHomonymiaModal}
        extractedName={pendingDistribution?.assistidoNome || ""}
        suggestions={homonymiaSuggestions}
        onSelect={handleHomonymiaSelect}
        isLoading={distributeMutation.isPending}
      />
    </div>
  );
}
