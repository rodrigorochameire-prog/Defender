"use client";

import { use, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  FileText,
  Calendar,
  Clock,
  User,
  Scale,
  Lock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Mail,
  Archive,
  RefreshCw,
  Send,
  Eye,
  Edit2,
  Check,
  X,
  Plus,
  Gavel,
} from "lucide-react";
import { format, parseISO, differenceInDays, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { UI_STATUS_TO_DB, ALL_STATUS_OPTIONS, getStatusConfig } from "@/config/demanda-status";

// ─── Status color map (DB enum → badge style) ────────────────────────
const STATUS_BADGE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  "2_ATENDER":      { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", label: "Atender" },
  "4_MONITORAR":    { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", label: "Monitorar" },
  "5_TRIAGEM":      { bg: "bg-neutral-100 dark:bg-neutral-800/50", text: "text-neutral-600 dark:text-neutral-400", label: "Triagem" },
  "7_PROTOCOLADO":  { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", label: "Protocolado" },
  "7_CIENCIA":      { bg: "bg-sky-100 dark:bg-sky-900/30", text: "text-sky-700 dark:text-sky-300", label: "Ciência" },
  "7_SEM_ATUACAO":  { bg: "bg-neutral-100 dark:bg-neutral-800/50", text: "text-neutral-500 dark:text-neutral-500", label: "Sem Atuação" },
  "URGENTE":        { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", label: "Urgente" },
  "CONCLUIDO":      { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", label: "Concluído" },
  "ARQUIVADO":      { bg: "bg-neutral-100 dark:bg-neutral-800/40", text: "text-neutral-400 dark:text-neutral-500", label: "Arquivado" },
};

function getStatusBadge(status: string | null) {
  if (!status) return { bg: "bg-neutral-100 dark:bg-neutral-800/50", text: "text-neutral-500", label: "Pendente" };
  return STATUS_BADGE_STYLES[status] || { bg: "bg-neutral-100 dark:bg-neutral-800/50", text: "text-neutral-500", label: status };
}

// ─── Prioridade badge styles ────────────────────────
const PRIORIDADE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  "BAIXA":     { bg: "bg-neutral-100 dark:bg-neutral-800/50", text: "text-neutral-500 dark:text-neutral-400", label: "Baixa" },
  "NORMAL":    { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", label: "Normal" },
  "ALTA":      { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", label: "Alta" },
  "URGENTE":   { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", label: "Urgente" },
  "REU_PRESO": { bg: "bg-red-200 dark:bg-red-900/40", text: "text-red-800 dark:text-red-200", label: "Réu Preso" },
};

// ─── Atribuição labels ────────────────────────
const ATRIBUICAO_LABELS: Record<string, string> = {
  "JURI_CAMACARI": "Tribunal do Júri",
  "GRUPO_JURI": "Grupo Especial do Júri",
  "VVD_CAMACARI": "Violência Doméstica",
  "EXECUCAO_PENAL": "Execução Penal",
  "SUBSTITUICAO": "Substituição Criminal",
  "SUBSTITUICAO_CIVEL": "Curadoria Especial",
};

// ─── Status change options (derivado do DEMANDA_STATUS centralizado) ────
const STATUS_OPTIONS = ALL_STATUS_OPTIONS.map(opt => ({
  value: UI_STATUS_TO_DB[opt.value] || opt.value.toUpperCase(),
  label: opt.label,
  substatus: opt.value,
}));

// ─── Helper: format date safely ────────────────────────
function formatDate(dateStr: string | Date | null | undefined, fmt = "dd/MM/yyyy") {
  if (!dateStr) return null;
  try {
    const d = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
    if (isNaN(d.getTime())) return null;
    return format(d, fmt, { locale: ptBR });
  } catch {
    return null;
  }
}

function formatDateLong(dateStr: string | null | undefined) {
  return formatDate(dateStr, "dd 'de' MMMM 'de' yyyy");
}

// ═══════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════

export default function DemandaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const utils = trpc.useUtils();
  const [showStatusSelect, setShowStatusSelect] = useState(false);
  const [editingProvidencias, setEditingProvidencias] = useState(false);
  const [providenciasText, setProvidenciasText] = useState("");

  const demandaId = Number(id);

  // ─── Queries ────────────────────────
  const { data: demanda, isLoading, error } = trpc.demandas.getById.useQuery(
    { id: demandaId },
    { enabled: !isNaN(demandaId) }
  );

  const { data: oficioSugestao } = trpc.oficios.sugerirParaDemanda.useQuery(
    { demandaId },
    { enabled: !isNaN(demandaId) && !!demanda }
  );

  const { data: oficiosVinculados } = trpc.oficios.list.useQuery(
    { demandaId, limit: 10 },
    { enabled: !isNaN(demandaId) && !!demanda }
  );

  // ─── Mutations ────────────────────────
  const updateMutation = trpc.demandas.update.useMutation({
    onSuccess: () => {
      utils.demandas.getById.invalidate({ id: demandaId });
      utils.demandas.list.invalidate();
      toast.success("Demanda atualizada");
      setShowStatusSelect(false);
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar: ${err.message}`);
    },
  });

  // ─── Loading state ────────────────────────
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // ─── Not found ────────────────────────
  if (error || !demanda) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="h-16 w-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <FileText className="h-8 w-8 text-neutral-400" />
        </div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Demanda não encontrada
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm">
          {error?.message || "A demanda solicitada não existe ou você não tem acesso."}
        </p>
        <Link href="/admin/demandas">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Demandas
          </Button>
        </Link>
      </div>
    );
  }

  // ─── Derived data ────────────────────────
  const statusBadge = getStatusBadge(demanda.status);
  const prioridadeStyle = PRIORIDADE_STYLES[demanda.prioridade || "NORMAL"] || PRIORIDADE_STYLES["NORMAL"];
  const atribuicaoLabel = demanda.processo?.atribuicao
    ? ATRIBUICAO_LABELS[demanda.processo.atribuicao] || demanda.processo.atribuicao
    : null;

  // Prazo calculation
  let diasRestantes: number | null = null;
  let prazoVencido = false;
  let prazoUrgente = false;
  if (demanda.prazo) {
    try {
      const prazoDate = parseISO(demanda.prazo);
      if (!isNaN(prazoDate.getTime())) {
        diasRestantes = differenceInDays(prazoDate, new Date());
        prazoVencido = isPast(prazoDate) && diasRestantes < 0;
        prazoUrgente = diasRestantes <= 3;
      }
    } catch { /* ignore */ }
  }

  const handleStatusChange = (newStatus: string, substatus?: string) => {
    updateMutation.mutate({
      id: demandaId,
      status: newStatus as any,
      ...(substatus ? { substatus } : {}),
    });
  };

  const handleEditProvidencias = () => {
    setProvidenciasText(demanda.providencias || "");
    setEditingProvidencias(true);
  };

  const handleSaveProvidencias = () => {
    updateMutation.mutate(
      { id: demandaId, providencias: providenciasText },
      {
        onSuccess: () => {
          setEditingProvidencias(false);
        },
      }
    );
  };

  const handleArchive = () => {
    updateMutation.mutate({
      id: demandaId,
      status: "ARQUIVADO",
    });
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ─── Back navigation ─── */}
      <div className="flex items-center gap-2">
        <Link href="/admin/demandas">
          <Button variant="ghost" size="sm" className="gap-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </div>

      {/* ─── Header card ─── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Title & badges */}
          <div className="space-y-3 min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight leading-tight">
                  {demanda.ato}
                </h1>
                {demanda.assistido?.nome && (
                  <Link
                    href={`/admin/assistidos/${demanda.assistido.id}`}
                    className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    {demanda.assistido.nome}
                  </Link>
                )}
              </div>
            </div>

            {/* Badge row */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`${statusBadge.bg} ${statusBadge.text} border-0 font-medium`}>
                {statusBadge.label}
              </Badge>

              {demanda.substatus && (
                <Badge variant="outline" className="text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 font-normal text-xs">
                  {demanda.substatus}
                </Badge>
              )}

              <Badge className={`${prioridadeStyle.bg} ${prioridadeStyle.text} border-0 font-medium`}>
                {prioridadeStyle.label}
              </Badge>

              {atribuicaoLabel && (
                <Badge variant="outline" className="border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 text-xs">
                  {atribuicaoLabel}
                </Badge>
              )}

              {demanda.reuPreso && (
                <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-0">
                  <Lock className="h-3 w-3 mr-1" />
                  Réu Preso
                </Badge>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStatusSelect(!showStatusSelect)}
              className="border-neutral-200 dark:border-neutral-700"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Alterar Status
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleArchive}
              disabled={updateMutation.isPending || demanda.status === "ARQUIVADO"}
              className="border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              <Archive className="h-4 w-4 mr-1.5" />
              Arquivar
            </Button>
          </div>
        </div>

        {/* Status change dropdown */}
        {showStatusSelect && (
          <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">
              Alterar status para:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((opt) => {
                const isActive = demanda.substatus
                  ? demanda.substatus === opt.substatus
                  : demanda.status === opt.value;
                return (
                  <Button
                    key={opt.substatus}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className={
                      isActive
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "border-neutral-200 dark:border-neutral-700 text-xs"
                    }
                    disabled={updateMutation.isPending}
                    onClick={() => handleStatusChange(opt.value, opt.substatus)}
                  >
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── Prazo card (highlighted if urgent) ─── */}
      {demanda.prazo && (
        <div
          className={`rounded-xl border p-5 ${
            prazoVencido
              ? "bg-red-50/80 dark:bg-red-950/20 border-red-200/80 dark:border-red-800/40"
              : prazoUrgente
                ? "bg-amber-50/80 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/40"
                : "bg-white dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {prazoVencido ? (
                <AlertTriangle className="h-7 w-7 text-red-500" />
              ) : prazoUrgente ? (
                <Clock className="h-7 w-7 text-amber-500" />
              ) : (
                <Calendar className="h-7 w-7 text-emerald-500" />
              )}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Prazo Fatal
                </p>
                <p
                  className={`text-lg font-bold ${
                    prazoVencido
                      ? "text-red-600 dark:text-red-400"
                      : prazoUrgente
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-neutral-900 dark:text-neutral-100"
                  }`}
                >
                  {formatDateLong(demanda.prazo)}
                </p>
              </div>
            </div>
            {diasRestantes !== null && (
              <div
                className={`text-right ${
                  prazoVencido
                    ? "text-red-600 dark:text-red-400"
                    : prazoUrgente
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-neutral-500 dark:text-neutral-400"
                }`}
              >
                <p className="text-2xl font-bold tabular-nums">
                  {diasRestantes < 0
                    ? `${Math.abs(diasRestantes)}d`
                    : diasRestantes === 0
                      ? "HOJE"
                      : `${diasRestantes}d`}
                </p>
                <p className="text-xs">
                  {diasRestantes < 0 ? "atrasado" : diasRestantes === 0 ? "" : "restantes"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Info grid (2 columns on desktop) ─── */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Processo card */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-5 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Processo</h3>
          </div>
          <div className="space-y-3">
            <InfoRow label="Número dos Autos">
              {demanda.processo?.numeroAutos ? (
                <Link
                  href={`/admin/processos/${demanda.processo.id}`}
                  className="font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
                >
                  {demanda.processo.numeroAutos}
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </Link>
              ) : (
                <span className="text-neutral-400 text-sm">-</span>
              )}
            </InfoRow>

            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="Área">
                <span className="text-sm text-neutral-900 dark:text-neutral-100">
                  {demanda.processo?.area || "-"}
                </span>
              </InfoRow>
              <InfoRow label="Comarca">
                <span className="text-sm text-neutral-900 dark:text-neutral-100">
                  {demanda.processo?.comarca || "-"}
                </span>
              </InfoRow>
            </div>

            {demanda.processo?.vara && (
              <InfoRow label="Vara">
                <span className="text-sm text-neutral-900 dark:text-neutral-100">
                  {demanda.processo.vara}
                </span>
              </InfoRow>
            )}

            {demanda.processo?.classeProcessual && (
              <InfoRow label="Classe Processual">
                <span className="text-sm text-neutral-900 dark:text-neutral-100">
                  {demanda.processo.classeProcessual}
                </span>
              </InfoRow>
            )}

            {demanda.processo?.assunto && (
              <InfoRow label="Assunto">
                <span className="text-sm text-neutral-900 dark:text-neutral-100 line-clamp-2">
                  {demanda.processo.assunto}
                </span>
              </InfoRow>
            )}

            {demanda.processo?.parteContraria && (
              <InfoRow label="Parte Contrária">
                <span className="text-sm text-neutral-900 dark:text-neutral-100">
                  {demanda.processo.parteContraria}
                </span>
              </InfoRow>
            )}

            {demanda.processo?.fase && (
              <InfoRow label="Fase">
                <Badge variant="outline" className="border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 text-xs">
                  {demanda.processo.fase}
                </Badge>
              </InfoRow>
            )}

            {demanda.processo?.id && (
              <Link href={`/admin/processos/${demanda.processo.id}`} className="block mt-3">
                <Button variant="outline" size="sm" className="w-full border-neutral-200 dark:border-neutral-700 text-xs">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Ver Processo Completo
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Assistido card */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-5 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Assistido</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-neutral-400 to-neutral-500 dark:from-neutral-600 dark:to-neutral-700 flex items-center justify-center text-white text-lg font-bold shrink-0">
                {demanda.assistido?.nome?.charAt(0) || "?"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                  {demanda.assistido?.nome || "Não vinculado"}
                </p>
                {demanda.reuPreso && demanda.assistido?.statusPrisional && (
                  <Badge className="mt-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-0 text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    {demanda.assistido.statusPrisional.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>
            </div>

            <InfoRow label="Defensor Responsável">
              <span className="text-sm text-neutral-900 dark:text-neutral-100">
                {demanda.defensor?.name || "-"}
              </span>
            </InfoRow>

            {demanda.assistido?.id && (
              <Link href={`/admin/assistidos/${demanda.assistido.id}`} className="block mt-3">
                <Button variant="outline" size="sm" className="w-full border-neutral-200 dark:border-neutral-700 text-xs">
                  <User className="h-3.5 w-3.5 mr-1.5" />
                  Ver Ficha do Assistido
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ─── Dates metadata strip ─── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DateField label="Data de Entrada" value={formatDate(demanda.dataEntrada)} />
          <DateField label="Data da Intimação" value={formatDate(demanda.dataIntimacao)} />
          <DateField label="Data de Expedição" value={formatDate(demanda.dataExpedicao)} />
          <DateField label="Criado em" value={formatDate(demanda.createdAt)} />
        </div>
      </div>

      {/* ─── Providências (inline editable) ─── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gavel className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Providências
            </h3>
          </div>
          {!editingProvidencias && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditProvidencias}
              className="h-7 px-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              <Edit2 className="h-3.5 w-3.5 mr-1" />
              Editar
            </Button>
          )}
        </div>

        {editingProvidencias ? (
          <div className="space-y-3">
            <Textarea
              value={providenciasText}
              onChange={(e) => setProvidenciasText(e.target.value)}
              placeholder="Descreva as providências a serem tomadas..."
              rows={5}
              className="text-sm resize-none"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSaveProvidencias}
                disabled={updateMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
              >
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Salvar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingProvidencias(false)}
                disabled={updateMutation.isPending}
                className="h-8 border-neutral-200 dark:border-neutral-700"
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : demanda.providencias ? (
          <p className="text-sm text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap leading-relaxed">
            {demanda.providencias}
          </p>
        ) : (
          <button
            onClick={handleEditProvidencias}
            className="w-full text-left text-sm text-neutral-400 dark:text-neutral-500 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-lg p-3 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <Plus className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
            Adicionar providências...
          </button>
        )}
      </div>

      {/* ─── Documentos & Ofícios vinculados ─── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Ofícios Vinculados
            </h3>
            {oficiosVinculados && oficiosVinculados.items.length > 0 && (
              <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-0 text-xs h-5 px-1.5">
                {oficiosVinculados.items.length}
              </Badge>
            )}
          </div>
          <Link
            href={`/admin/oficios/novo?demandaId=${demandaId}&assistidoId=${demanda.assistidoId}&processoId=${demanda.processoId}`}
          >
            <Button variant="outline" size="sm" className="h-7 px-2 border-neutral-200 dark:border-neutral-700 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Novo Ofício
            </Button>
          </Link>
        </div>

        {oficiosVinculados && oficiosVinculados.items.length > 0 ? (
          <div className="space-y-2">
            {oficiosVinculados.items.map((oficio) => {
              const ofStatus = (oficio.metadata as any)?.status as string | undefined;
              const statusBadgeMap: Record<string, { bg: string; text: string; label: string }> = {
                rascunho: { bg: "bg-neutral-100 dark:bg-neutral-800", text: "text-neutral-500", label: "Rascunho" },
                revisao: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", label: "Em Revisão" },
                enviado: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", label: "Enviado" },
                arquivado: { bg: "bg-neutral-100 dark:bg-neutral-800", text: "text-neutral-400", label: "Arquivado" },
              };
              const ofBadge = ofStatus ? statusBadgeMap[ofStatus] : statusBadgeMap["rascunho"];
              return (
                <Link
                  key={oficio.id}
                  href={`/admin/oficios/${oficio.id}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {oficio.titulo}
                      </p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500">
                        {oficio.createdAt ? format(new Date(oficio.createdAt), "dd/MM/yyyy", { locale: ptBR }) : ""}
                        {oficio.geradoPorIA && (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-violet-500">
                            <Sparkles className="h-3 w-3" /> IA
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ofBadge && (
                      <Badge className={`${ofBadge.bg} ${ofBadge.text} border-0 text-xs`}>
                        {ofBadge.label}
                      </Badge>
                    )}
                    {oficio.googleDocUrl && (
                      <ExternalLink className="h-3.5 w-3.5 text-neutral-300 dark:text-neutral-600 group-hover:text-emerald-500 transition-colors" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-4">
            Nenhum ofício vinculado a esta demanda.
          </p>
        )}
      </div>

      {/* ─── Enrichment data (if available) ─── */}
      {demanda.enrichmentData && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <h3 className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Enriquecimento Automático
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {demanda.enrichmentData.crime && (
              <InfoRow label="Crime">
                <span className="text-neutral-900 dark:text-neutral-100">{demanda.enrichmentData.crime}</span>
              </InfoRow>
            )}
            {demanda.enrichmentData.fase_processual && (
              <InfoRow label="Fase Processual">
                <span className="text-neutral-900 dark:text-neutral-100">{demanda.enrichmentData.fase_processual}</span>
              </InfoRow>
            )}
            {demanda.enrichmentData.intimado && (
              <InfoRow label="Intimado">
                <span className="text-neutral-900 dark:text-neutral-100">{demanda.enrichmentData.intimado}</span>
              </InfoRow>
            )}
            {demanda.enrichmentData.vitima && (
              <InfoRow label="Vítima">
                <span className="text-neutral-900 dark:text-neutral-100">{demanda.enrichmentData.vitima}</span>
              </InfoRow>
            )}
            {demanda.enrichmentData.artigos && demanda.enrichmentData.artigos.length > 0 && (
              <div className="col-span-2 md:col-span-3">
                <InfoRow label="Artigos">
                  <div className="flex flex-wrap gap-1">
                    {demanda.enrichmentData.artigos.map((art, i) => (
                      <Badge key={i} variant="outline" className="text-xs border-neutral-200 dark:border-neutral-700">
                        {art}
                      </Badge>
                    ))}
                  </div>
                </InfoRow>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Delegação info (if delegated) ─── */}
      {demanda.delegadoParaId && (
        <div className="bg-sky-50/50 dark:bg-sky-950/10 border border-sky-200/50 dark:border-sky-800/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Send className="h-4 w-4 text-sky-500" />
            <h3 className="text-[10px] uppercase tracking-wider text-sky-500 dark:text-sky-400">
              Delegação
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {demanda.statusDelegacao && (
              <InfoRow label="Status">
                <span className="text-neutral-900 dark:text-neutral-100 capitalize">{demanda.statusDelegacao}</span>
              </InfoRow>
            )}
            {demanda.dataDelegacao && (
              <InfoRow label="Data">
                <span className="text-neutral-900 dark:text-neutral-100">{formatDate(demanda.dataDelegacao)}</span>
              </InfoRow>
            )}
          </div>
          {demanda.motivoDelegacao && (
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
              {demanda.motivoDelegacao}
            </p>
          )}
        </div>
      )}

      {/* ─── Ofício Sugerido (hint from IA) ─── */}
      {oficioSugestao?.sugerido && (
        <div className="rounded-xl border border-emerald-200/40 dark:border-emerald-800/20 bg-emerald-50/50 dark:bg-emerald-950/10 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2.5 min-w-0">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                  Ofício sugerido: {oficioSugestao.tipoLabel}
                </p>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                  {oficioSugestao.mensagem}
                </p>
              </div>
            </div>
            <Link
              href={`/admin/oficios/novo?demandaId=${demandaId}&assistidoId=${demanda.assistidoId}&processoId=${demanda.processoId}${oficioSugestao.tipoOficio ? `&tipo=${oficioSugestao.tipoOficio}` : ""}`}
              className="shrink-0"
            >
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Gerar
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ─── Quick actions ─── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-5">
        <h3 className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-3">
          Ações Rápidas
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-neutral-200 dark:border-neutral-700 text-xs"
            onClick={() => handleStatusChange("7_PROTOCOLADO")}
            disabled={updateMutation.isPending || demanda.status === "7_PROTOCOLADO"}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
            Marcar como Protocolado
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-neutral-200 dark:border-neutral-700 text-xs"
            onClick={() => handleStatusChange("URGENTE")}
            disabled={updateMutation.isPending || demanda.status === "URGENTE"}
          >
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5 text-red-500" />
            Marcar como Urgente
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-neutral-200 dark:border-neutral-700 text-xs"
            onClick={() => handleStatusChange("7_CIENCIA")}
            disabled={updateMutation.isPending || demanda.status === "7_CIENCIA"}
          >
            <Eye className="h-3.5 w-3.5 mr-1.5 text-sky-500" />
            Dar Ciência
          </Button>
        </div>
      </div>

      {/* ─── Last updated footer ─── */}
      <p className="text-xs text-neutral-400 dark:text-neutral-600 text-center pb-4">
        Última atualização: {formatDate(demanda.updatedAt, "dd/MM/yyyy 'às' HH:mm")}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-0.5">
        {label}
      </p>
      {children}
    </div>
  );
}

function DateField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-0.5">
        {label}
      </p>
      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">
        {value || "-"}
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <Skeleton className="h-8 w-24" />

      {/* Header card */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Prazo */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded" />
            <div>
              <Skeleton className="h-3 w-16 mb-1" />
              <Skeleton className="h-5 w-44" />
            </div>
          </div>
          <Skeleton className="h-8 w-12" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-5 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-5 space-y-3">
          <Skeleton className="h-4 w-24" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-5 w-3/4" />
        </div>
      </div>

      {/* Dates */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
