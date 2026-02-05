"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Mic,
  FileText,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Copy,
  ExternalLink,
  ListChecks,
  HelpCircle,
  Lightbulb,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TranscriptionViewerProps {
  atendimentoId: number;
  className?: string;
}

export function TranscriptionViewer({
  atendimentoId,
  className,
}: TranscriptionViewerProps) {
  const [keyPointsOpen, setKeyPointsOpen] = useState(true);

  const { data: atendimento, isLoading, refetch } = trpc.atendimentos.getById.useQuery(
    { id: atendimentoId },
    { enabled: !!atendimentoId }
  );

  const extractKeyPointsMutation = trpc.atendimentos.extractKeyPoints.useMutation({
    onSuccess: () => {
      toast.success("Pontos-chave extraídos com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleExtractKeyPoints = () => {
    extractKeyPointsMutation.mutate({ atendimentoId });
  };

  const handleCopyTranscription = () => {
    if (atendimento?.atendimento.transcricao) {
      navigator.clipboard.writeText(atendimento.atendimento.transcricao);
      toast.success("Transcrição copiada!");
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!atendimento) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-zinc-300 mb-3" />
          <p className="text-zinc-500">Atendimento não encontrado</p>
        </CardContent>
      </Card>
    );
  }

  const { atendimento: data } = atendimento;
  const hasTranscription = !!data.transcricao;
  const status = data.transcricaoStatus || "pending";

  const statusConfig = {
    pending: {
      label: "Aguardando",
      color: "zinc",
      icon: Clock,
    },
    processing: {
      label: "Processando",
      color: "amber",
      icon: Loader2,
    },
    completed: {
      label: "Concluída",
      color: "green",
      icon: CheckCircle2,
    },
    failed: {
      label: "Erro",
      color: "red",
      icon: AlertCircle,
    },
  };

  const currentStatus = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = currentStatus.icon;

  const pontosChave = data.pontosChave as {
    compromissos?: string[];
    informacoesRelevantes?: string[];
    duvidasPendentes?: string[];
    providenciasNecessarias?: string[];
  } | null;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Gravação e Transcrição
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              {data.duracao && (
                <>
                  <Clock className="h-3 w-3" />
                  <span>{formatDuration(data.duracao)}</span>
                </>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn(
                currentStatus.color === "green" && "bg-green-100 text-green-700",
                currentStatus.color === "amber" && "bg-amber-100 text-amber-700",
                currentStatus.color === "red" && "bg-red-100 text-red-700"
              )}
            >
              <StatusIcon
                className={cn(
                  "h-3 w-3 mr-1",
                  status === "processing" && "animate-spin"
                )}
              />
              {currentStatus.label}
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!hasTranscription && status === "pending" ? (
          <div className="text-center py-8">
            <Mic className="h-12 w-12 mx-auto text-zinc-300 mb-3" />
            <p className="text-zinc-500 mb-2">
              Nenhuma transcrição disponível
            </p>
            <p className="text-xs text-zinc-400">
              Vincule uma gravação do Plaud para obter a transcrição automática
            </p>
          </div>
        ) : (
          <Tabs defaultValue="transcription" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="transcription" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Transcrição</span>
              </TabsTrigger>
              <TabsTrigger value="summary" className="flex items-center gap-1">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Resumo</span>
              </TabsTrigger>
              <TabsTrigger value="keypoints" className="flex items-center gap-1">
                <ListChecks className="h-4 w-4" />
                <span className="hidden sm:inline">Pontos-chave</span>
              </TabsTrigger>
            </TabsList>

            {/* Transcrição */}
            <TabsContent value="transcription" className="space-y-4">
              {data.transcricao ? (
                <>
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={handleCopyTranscription}>
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {data.transcricao}
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  {status === "processing" ? (
                    <>
                      <Loader2 className="h-8 w-8 mx-auto text-amber-500 animate-spin mb-3" />
                      <p className="text-zinc-500">Processando transcrição...</p>
                    </>
                  ) : (
                    <>
                      <FileText className="h-8 w-8 mx-auto text-zinc-300 mb-3" />
                      <p className="text-zinc-500">Transcrição não disponível</p>
                    </>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Resumo */}
            <TabsContent value="summary" className="space-y-4">
              {data.transcricaoResumo ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm leading-relaxed">{data.transcricaoResumo}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Sparkles className="h-8 w-8 mx-auto text-zinc-300 mb-3" />
                  <p className="text-zinc-500">Resumo não disponível</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    O resumo será gerado automaticamente após a transcrição
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Pontos-chave */}
            <TabsContent value="keypoints" className="space-y-4">
              {pontosChave ? (
                <div className="space-y-4">
                  {/* Compromissos */}
                  {pontosChave.compromissos && pontosChave.compromissos.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Compromissos Assumidos
                      </h4>
                      <ul className="space-y-1 ml-6">
                        {pontosChave.compromissos.map((item, i) => (
                          <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 list-disc">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Informações Relevantes */}
                  {pontosChave.informacoesRelevantes && pontosChave.informacoesRelevantes.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        Informações Relevantes
                      </h4>
                      <ul className="space-y-1 ml-6">
                        {pontosChave.informacoesRelevantes.map((item, i) => (
                          <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 list-disc">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Dúvidas Pendentes */}
                  {pontosChave.duvidasPendentes && pontosChave.duvidasPendentes.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-blue-500" />
                        Dúvidas Pendentes
                      </h4>
                      <ul className="space-y-1 ml-6">
                        {pontosChave.duvidasPendentes.map((item, i) => (
                          <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 list-disc">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Providências Necessárias */}
                  {pontosChave.providenciasNecessarias && pontosChave.providenciasNecessarias.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        Providências Necessárias
                      </h4>
                      <ul className="space-y-1 ml-6">
                        {pontosChave.providenciasNecessarias.map((item, i) => (
                          <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 list-disc">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ListChecks className="h-8 w-8 mx-auto text-zinc-300 mb-3" />
                  <p className="text-zinc-500 mb-4">Pontos-chave não extraídos</p>
                  {data.transcricao && (
                    <Button
                      variant="outline"
                      onClick={handleExtractKeyPoints}
                      disabled={extractKeyPointsMutation.isPending}
                    >
                      {extractKeyPointsMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Extraindo...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Extrair com IA
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Link para áudio no Drive */}
        {data.audioUrl && (
          <div className="mt-4 pt-4 border-t">
            <a
              href={data.audioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir áudio no Google Drive
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
