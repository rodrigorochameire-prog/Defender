"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { HomonymiaModal, SelectAssistedModal, type HomonymiaSuggestion } from "@/components/drive";

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
  },
  VVD: {
    label: "Violência Doméstica",
    icon: Shield,
    color: "amber",
    bgClass: "bg-amber-500/20",
    textClass: "text-amber-600 dark:text-amber-400",
    borderClass: "border-amber-500",
  },
  EP: {
    label: "Execução Penal",
    icon: Lock,
    color: "blue",
    bgClass: "bg-blue-500/20",
    textClass: "text-blue-600 dark:text-blue-400",
    borderClass: "border-blue-500",
  },
  SUBSTITUICAO: {
    label: "Substituição",
    icon: Scale,
    color: "rose",
    bgClass: "bg-rose-500/20",
    textClass: "text-rose-600 dark:text-rose-400",
    borderClass: "border-rose-500",
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
}: {
  file: {
    id: string;
    name: string;
    size?: string;
    createdTime?: string;
    webViewLink?: string;
  };
  onProcess: () => void;
  isProcessing: boolean;
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
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
            onClick={() => window.open(file.webViewLink, "_blank")}
          >
            <Eye className="w-4 h-4" />
          </Button>
        )}
        <Button
          size="sm"
          onClick={onProcess}
          disabled={isProcessing}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <FolderInput className="w-4 h-4 mr-1" />
              Processar
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function ExtractedDataCard({
  data,
  onConfirm,
  onCancel,
  isLoading,
}: {
  data: {
    numeroProcesso: string | null;
    orgaoJulgador: string | null;
    classeDemanda: string | null;
    assuntos: string | null;
    assistidos: Array<{ original: string; formatted: string }>;
    atribuicao: AtribuicaoType | null;
    atribuicaoConfianca: number;
    atribuicaoMotivo: string | null;
  };
  onConfirm: (formData: {
    atribuicao: AtribuicaoType;
    assistidoNome: string;
    numeroProcesso: string;
  }) => void;
  onCancel: () => void;
  isLoading: boolean;
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

  const atribConfig = ATRIBUICAO_CONFIG[selectedAtribuicao];
  const AtribIcon = atribConfig.icon;

  return (
    <Card className="border-2 border-emerald-500/30">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          Dados Extraídos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Órgão Julgador */}
        {data.orgaoJulgador && (
          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
              <Building2 className="w-3.5 h-3.5" />
              Órgão Julgador
            </div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {data.orgaoJulgador}
            </p>
          </div>
        )}

        {/* Classe e Assuntos */}
        <div className="grid grid-cols-2 gap-3">
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
            <Label>Atribuição</Label>
            <Select
              value={selectedAtribuicao}
              onValueChange={(v) => setSelectedAtribuicao(v as AtribuicaoType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ATRIBUICAO_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      {React.createElement(config.icon, {
                        className: cn("w-4 h-4", config.textClass),
                      })}
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assistido */}
          <div className="space-y-2">
            <Label>Assistido</Label>
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
                      {a.formatted}
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
            <Label>Número do Processo</Label>
            <Input
              value={numeroProcesso}
              onChange={(e) => setNumeroProcesso(e.target.value)}
              placeholder="0000000-00.0000.0.00.0000"
              className="font-mono"
            />
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
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
            disabled={
              isLoading || !selectedAssistido || !numeroProcesso
            }
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ArrowRight className="w-4 h-4 mr-2" />
            )}
            Distribuir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function DistribuicaoPage() {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [showHomonymiaModal, setShowHomonymiaModal] = useState(false);
  const [homonymiaSuggestions, setHomonymiaSuggestions] = useState<
    HomonymiaSuggestion[]
  >([]);
  const [pendingDistribution, setPendingDistribution] = useState<{
    atribuicao: AtribuicaoType;
    assistidoNome: string;
    numeroProcesso: string;
  } | null>(null);

  // Queries
  const { data: pendingFiles, isLoading: isLoadingFiles, refetch: refetchFiles } =
    trpc.distribuicao.listPending.useQuery();

  // Mutations
  const extractMutation = trpc.distribuicao.extractData.useMutation({
    onSuccess: (data) => {
      setExtractedData(data);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao extrair dados do PDF");
      setSelectedFileId(null);
    },
  });

  const searchSimilarMutation = trpc.distribuicao.searchSimilar.useMutation();

  const distributeMutation = trpc.distribuicao.distribute.useMutation({
    onSuccess: () => {
      toast.success("Documento distribuído com sucesso!");
      setSelectedFileId(null);
      setExtractedData(null);
      setPendingDistribution(null);
      refetchFiles();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao distribuir documento");
    },
  });

  // Handlers
  const handleProcessFile = async (fileId: string) => {
    setSelectedFileId(fileId);
    setExtractedData(null);
    extractMutation.mutate({ fileId });
  };

  const handleConfirmDistribution = async (formData: {
    atribuicao: AtribuicaoType;
    assistidoNome: string;
    numeroProcesso: string;
  }) => {
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
      setPendingDistribution(formData);
      setShowHomonymiaModal(true);
    } else {
      // Sem homonímia, criar novo
      distributeMutation.mutate({
        fileId: selectedFileId!,
        ...formData,
        createNewAssistido: true,
      });
    }
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
    setExtractedData(null);
    setPendingDistribution(null);
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
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
                Distribuição automática de documentos
              </p>
            </div>
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

      {/* Content */}
      <div className="p-4 md:p-6">
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
                    onProcess={() => handleProcessFile(file.id)}
                    isProcessing={
                      extractMutation.isPending && selectedFileId === file.id
                    }
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
                onConfirm={handleConfirmDistribution}
                onCancel={handleCancel}
                isLoading={
                  searchSimilarMutation.isPending || distributeMutation.isPending
                }
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
