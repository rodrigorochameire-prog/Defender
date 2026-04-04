"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Loader2,
  Eye,
  Trash2,
  ExternalLink,
  Send,
} from "lucide-react";
import { toast } from "sonner";

type Tipo = "bug" | "sugestao" | "duvida";
type Status = "novo" | "visto" | "enviado_jira" | "descartado";

const TIPO_LABELS: Record<Tipo, string> = {
  bug: "Bug",
  sugestao: "Sugestao",
  duvida: "Duvida",
};

const TIPO_BADGE_VARIANT: Record<Tipo, "danger" | "success" | "info"> = {
  bug: "danger",
  sugestao: "success",
  duvida: "info",
};

const STATUS_LABELS: Record<Status, string> = {
  novo: "Novo",
  visto: "Visto",
  enviado_jira: "No Jira",
  descartado: "Descartado",
};

type Prioridade = "baixa" | "media" | "alta";

const PRIORIDADE_LABELS: Record<Prioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export default function AdminFeedbacksPage() {
  const [filterTipo, setFilterTipo] = useState<Tipo | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<Status | undefined>(
    undefined
  );
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [selectedPrioridade, setSelectedPrioridade] = useState<Prioridade>("media");

  const { data: feedbackList, isLoading, refetch } = trpc.feedbacks.list.useQuery({
    tipo: filterTipo,
    status: filterStatus,
  });

  const updateStatus = trpc.feedbacks.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status", { description: error.message });
    },
  });

  const exportToJira = trpc.feedbacks.exportToJira.useMutation({
    onSuccess: (data) => {
      toast.success(`Ticket criado: ${data.ticketKey}`, {
        description: "Feedback enviado para o Jira com sucesso",
      });
      setExportingId(null);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao exportar para Jira", { description: error.message });
    },
  });

  const novosCount = feedbackList?.filter((f) => f.status === "novo").length ?? 0;

  const isActiveFilter = !filterTipo && !filterStatus;

  const pillBase =
    "rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer";
  const pillActive =
    "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-transparent";
  const pillInactive =
    "border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-600";

  function clearFilters() {
    setFilterTipo(undefined);
    setFilterStatus(undefined);
  }

  function toggleTipo(tipo: Tipo) {
    setFilterTipo((prev) => (prev === tipo ? undefined : tipo));
  }

  function toggleStatus(status: Status) {
    setFilterStatus((prev) => (prev === status ? undefined : status));
  }

  function formatDate(date: Date | string | null) {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-[#0f0f11]">
      {/* Header Padrao Defender */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center shadow-lg">
            <MessageSquare className="w-5 h-5 text-white dark:text-neutral-900" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
              Feedbacks
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {novosCount > 0
                ? `${novosCount} novo${novosCount > 1 ? "s" : ""}`
                : "Nenhum feedback novo"}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={`${pillBase} ${isActiveFilter ? pillActive : pillInactive}`}
            onClick={clearFilters}
          >
            Todos
          </button>

          {(["bug", "sugestao", "duvida"] as Tipo[]).map((tipo) => (
            <button
              key={tipo}
              className={`${pillBase} ${filterTipo === tipo ? pillActive : pillInactive}`}
              onClick={() => toggleTipo(tipo)}
            >
              {TIPO_LABELS[tipo]}
            </button>
          ))}

          <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1" />

          {(["novo", "visto", "enviado_jira", "descartado"] as Status[]).map(
            (status) => (
              <button
                key={status}
                className={`${pillBase} ${filterStatus === status ? pillActive : pillInactive}`}
                onClick={() => toggleStatus(status)}
              >
                {STATUS_LABELS[status]}
              </button>
            )
          )}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && feedbackList && feedbackList.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Nenhum feedback encontrado
            </p>
          </div>
        )}

        {/* Feedback list */}
        {!isLoading &&
          feedbackList &&
          feedbackList.length > 0 &&
          feedbackList.map((fb) => (
            <div
              key={fb.id}
              className={`bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3 ${
                fb.status === "descartado" ? "opacity-50" : ""
              }`}
            >
              {/* Top row: type badge + status pill + date */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={TIPO_BADGE_VARIANT[fb.tipo as Tipo]}>
                  {TIPO_LABELS[fb.tipo as Tipo]}
                </Badge>
                <span className="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  {STATUS_LABELS[fb.status as Status]}
                </span>
                <span className="ml-auto text-xs text-neutral-400">
                  {formatDate(fb.createdAt)}
                </span>
              </div>

              {/* Message */}
              <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {fb.mensagem}
              </p>

              {/* Bottom row */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3 text-xs text-neutral-400">
                  {fb.userName && <span>{fb.userName}</span>}
                  {fb.pagina && (
                    <span className="truncate max-w-[200px]" title={fb.pagina}>
                      {fb.pagina}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Visto button — only when status is novo */}
                  {fb.status === "novo" && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() =>
                        updateStatus.mutate({ id: fb.id, status: "visto" })
                      }
                      disabled={updateStatus.isPending}
                      title="Marcar como visto"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Visto
                    </Button>
                  )}

                  {/* Descartar button — when not already enviado_jira or descartado */}
                  {fb.status !== "enviado_jira" &&
                    fb.status !== "descartado" && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          updateStatus.mutate({
                            id: fb.id,
                            status: "descartado",
                          })
                        }
                        disabled={updateStatus.isPending}
                        title="Descartar feedback"
                        className="text-neutral-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Descartar
                      </Button>
                    )}

                  {/* Enviar pro Jira — when novo or visto */}
                  {(fb.status === "novo" || fb.status === "visto") && !fb.jiraTicketId && (
                    exportingId === fb.id ? (
                      <div className="flex items-center gap-1">
                        <select
                          className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs px-1.5 py-1 text-neutral-700 dark:text-neutral-300"
                          value={selectedPrioridade}
                          onChange={(e) => setSelectedPrioridade(e.target.value as Prioridade)}
                        >
                          {(["baixa", "media", "alta"] as Prioridade[]).map((p) => (
                            <option key={p} value={p}>
                              {PRIORIDADE_LABELS[p]}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() =>
                            exportToJira.mutate({
                              id: fb.id,
                              prioridade: selectedPrioridade,
                            })
                          }
                          disabled={exportToJira.isPending}
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          {exportToJira.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5 mr-1" />
                              Enviar
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setExportingId(null)}
                          disabled={exportToJira.isPending}
                          className="text-neutral-400"
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          setExportingId(fb.id);
                          setSelectedPrioridade("media");
                        }}
                        className="text-blue-500 hover:text-blue-600"
                      >
                        <Send className="h-3.5 w-3.5 mr-1" />
                        Jira
                      </Button>
                    )
                  )}

                  {/* Jira ticket link */}
                  {fb.jiraTicketId && (
                    <Button
                      variant="ghost"
                      size="xs"
                      asChild
                    >
                      <a
                        href={`https://ombuds.atlassian.net/browse/${fb.jiraTicketId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Jira: ${fb.jiraTicketId}`}
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        {fb.jiraTicketId}
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
