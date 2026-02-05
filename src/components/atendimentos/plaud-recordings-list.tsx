"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Mic,
  Clock,
  Calendar,
  Link2,
  Unlink,
  MoreVertical,
  Play,
  FileText,
  User,
  CheckCircle2,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PlaudRecordingsListProps {
  onSelectRecording?: (recordingId: number) => void;
  showLinkButton?: boolean;
  atendimentoId?: number; // Para vincular diretamente
  className?: string;
}

export function PlaudRecordingsList({
  onSelectRecording,
  showLinkButton = true,
  atendimentoId,
  className,
}: PlaudRecordingsListProps) {
  const [selectedRecording, setSelectedRecording] = useState<number | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const utils = trpc.useUtils();

  const { data: recordings, isLoading, refetch } = trpc.atendimentos.unlinkedRecordings.useQuery();

  const linkMutation = trpc.atendimentos.linkRecording.useMutation({
    onSuccess: () => {
      toast.success("Gravação vinculada com sucesso!");
      utils.atendimentos.unlinkedRecordings.invalidate();
      setLinkDialogOpen(false);
      setSelectedRecording(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleLink = (recordingId: number) => {
    if (atendimentoId) {
      // Vincula diretamente
      linkMutation.mutate({ recordingId, atendimentoId });
    } else {
      // Abre dialog para selecionar atendimento
      setSelectedRecording(recordingId);
      setLinkDialogOpen(true);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Concluída
          </Badge>
        );
      case "transcribing":
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-700">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Processando
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-700">
            <AlertCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Recebida
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Gravações do Plaud
              </CardTitle>
              <CardDescription>
                {recordings?.length || 0} gravação(ões) não vinculada(s)
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {recordings && recordings.length > 0 ? (
            <div className="space-y-3">
              {recordings.map((recording) => (
                <div
                  key={recording.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Mic className="h-5 w-5 text-purple-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {recording.title || `Gravação ${recording.plaudRecordingId.slice(0, 8)}`}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(recording.duration)}
                      </span>
                      {recording.recordedAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(recording.recordedAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(recording.status)}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {recording.transcription && (
                          <DropdownMenuItem
                            onClick={() => onSelectRecording?.(recording.id)}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Ver transcrição
                          </DropdownMenuItem>
                        )}
                        {showLinkButton && (
                          <DropdownMenuItem onClick={() => handleLink(recording.id)}>
                            <Link2 className="mr-2 h-4 w-4" />
                            Vincular a atendimento
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Mic className="h-12 w-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
              <p className="text-zinc-500">Nenhuma gravação pendente</p>
              <p className="text-xs text-zinc-400 mt-1">
                Novas gravações do Plaud aparecerão aqui automaticamente
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de vinculação - simplificado, seria melhor ter um seletor de atendimento */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Gravação</DialogTitle>
            <DialogDescription>
              Esta gravação será vinculada ao atendimento selecionado.
              A transcrição e resumo serão copiados para o atendimento.
            </DialogDescription>
          </DialogHeader>

          {/* Aqui deveria ter um seletor de atendimento */}
          <div className="py-4">
            <p className="text-sm text-zinc-500">
              Para vincular esta gravação, acesse a página do atendimento e clique em &quot;Vincular gravação&quot;.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
