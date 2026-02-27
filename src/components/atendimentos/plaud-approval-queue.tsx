"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Mic,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  MessageSquare,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PlaudApprovalModal } from "./plaud-approval-modal";

interface PlaudApprovalQueueProps {
  className?: string;
}

export function PlaudApprovalQueue({ className }: PlaudApprovalQueueProps) {
  const [approvalRecordingId, setApprovalRecordingId] = useState<number | null>(null);
  const [rejectRecordingId, setRejectRecordingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: recordings, isLoading, refetch } = trpc.atendimentos.pendingRecordings.useQuery();

  const rejectMutation = trpc.atendimentos.rejectRecording.useMutation({
    onSuccess: () => {
      toast.success("Gravação rejeitada e removida");
      utils.atendimentos.pendingRecordings.invalidate();
      setRejectRecordingId(null);
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

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
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
              <Skeleton key={i} className="h-24 w-full" />
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
                Gravações Pendentes
                {recordings && recordings.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {recordings.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Revise e aprove gravações antes de vinculá-las ao OMBUDS
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
                  className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10 overflow-hidden"
                >
                  {/* Header do card */}
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                      <Mic className="h-5 w-5 text-amber-600" />
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
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {recording.createdAt
                            ? formatDistanceToNow(new Date(recording.createdAt), {
                                addSuffix: true,
                                locale: ptBR,
                              })
                            : "-"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                        Pendente
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleExpand(recording.id)}
                      >
                        {expandedId === recording.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Preview expandível */}
                  {expandedId === recording.id && (
                    <div className="px-3 pb-3 space-y-3">
                      {/* Transcrição preview */}
                      {recording.transcription && (
                        <div className="rounded-md bg-white dark:bg-zinc-900 p-3 border border-zinc-200 dark:border-zinc-800">
                          <div className="flex items-center gap-2 mb-2 text-xs font-medium text-zinc-500">
                            <FileText className="h-3 w-3" />
                            Transcrição
                          </div>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-4 whitespace-pre-line">
                            {recording.transcription.slice(0, 500)}
                            {recording.transcription.length > 500 && "..."}
                          </p>
                        </div>
                      )}

                      {/* Resumo preview */}
                      {recording.summary && (
                        <div className="rounded-md bg-white dark:bg-zinc-900 p-3 border border-zinc-200 dark:border-zinc-800">
                          <div className="flex items-center gap-2 mb-2 text-xs font-medium text-zinc-500">
                            <MessageSquare className="h-3 w-3" />
                            Resumo
                          </div>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-4 whitespace-pre-line">
                            {recording.summary.slice(0, 500)}
                            {recording.summary.length > 500 && "..."}
                          </p>
                        </div>
                      )}

                      {/* Ações */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => setApprovalRecordingId(recording.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Aprovar e Vincular
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                          onClick={() => setRejectRecordingId(recording.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Ações compactas quando colapsado */}
                  {expandedId !== recording.id && (
                    <div className="flex items-center gap-2 px-3 pb-3">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => setApprovalRecordingId(recording.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => setRejectRecordingId(recording.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
              <p className="text-zinc-500">Nenhuma gravação pendente</p>
              <p className="text-xs text-zinc-400 mt-1">
                Novas gravações do Plaud aparecerão aqui para aprovação
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Aprovação */}
      {approvalRecordingId && (
        <PlaudApprovalModal
          recordingId={approvalRecordingId}
          open={!!approvalRecordingId}
          onOpenChange={(open) => {
            if (!open) setApprovalRecordingId(null);
          }}
          onApproved={() => {
            setApprovalRecordingId(null);
            utils.atendimentos.pendingRecordings.invalidate();
          }}
        />
      )}

      {/* Dialog de confirmação de rejeição */}
      <AlertDialog
        open={!!rejectRecordingId}
        onOpenChange={(open) => {
          if (!open) setRejectRecordingId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar gravação?</AlertDialogTitle>
            <AlertDialogDescription>
              A gravação será <strong>permanentemente deletada</strong> do sistema.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (rejectRecordingId) {
                  rejectMutation.mutate({ recordingId: rejectRecordingId });
                }
              }}
            >
              {rejectMutation.isPending ? "Deletando..." : "Deletar permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
