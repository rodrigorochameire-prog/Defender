"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc/client";
import { format, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  User,
  FileText,
  MapPin,
  StickyNote,
  History,
  CheckCircle2,
  X,
  ExternalLink,
  Copy,
  Check,
  Users,
  Pencil,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Clock,
  XCircle,
  BadgeCheck,
  Milestone,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Configurações por tipo de audiência
// ─────────────────────────────────────────────

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string; tint: string; dot: string }> = {
  instrucao: {
    label: "INSTRUÇÃO",
    color: "text-indigo-700 dark:text-indigo-300",
    bg: "bg-indigo-100 dark:bg-indigo-900/40",
    tint: "bg-indigo-50/40 dark:bg-indigo-950/20",
    dot: "bg-indigo-500",
  },
  sentenca: {
    label: "SENTENÇA",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-100 dark:bg-amber-900/40",
    tint: "bg-amber-50/40 dark:bg-amber-950/20",
    dot: "bg-amber-500",
  },
  conciliacao: {
    label: "CONCILIAÇÃO",
    color: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-100 dark:bg-sky-900/40",
    tint: "bg-sky-50/40 dark:bg-sky-950/20",
    dot: "bg-sky-500",
  },
  julgamento: {
    label: "JULGAMENTO",
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-100 dark:bg-rose-900/40",
    tint: "bg-rose-50/40 dark:bg-rose-950/20",
    dot: "bg-rose-500",
  },
  preliminar: {
    label: "AUDIÊNCIA PRELIMINAR",
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-100 dark:bg-violet-900/40",
    tint: "bg-violet-50/40 dark:bg-violet-950/20",
    dot: "bg-violet-500",
  },
};

function getTipoConfig(tipo?: string) {
  if (!tipo) return null;
  const key = tipo.toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "");
  for (const [k, v] of Object.entries(TIPO_CONFIG)) {
    if (key.includes(k)) return v;
  }
  return null;
}

// ─────────────────────────────────────────────
// Status do evento
// ─────────────────────────────────────────────

function getStatusConfig(status?: string) {
  const s = status?.toLowerCase() ?? "";
  if (s === "realizada" || s === "concluida" || s === "concluída")
    return { label: "Realizada", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-100 dark:bg-emerald-900/40", dot: "bg-emerald-500" };
  if (s === "cancelada")
    return { label: "Cancelada", color: "text-red-700 dark:text-red-300", bg: "bg-red-100 dark:bg-red-900/40", dot: "bg-red-500" };
  if (s === "adiada")
    return { label: "Adiada", color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-100 dark:bg-orange-900/40", dot: "bg-orange-500" };
  return { label: "Agendada", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-100 dark:bg-amber-900/40", dot: "bg-amber-500" };
}

// ─────────────────────────────────────────────
// Countdown
// ─────────────────────────────────────────────

function getCountdown(dataHora: Date | null) {
  if (!dataHora) return null;
  const days = differenceInCalendarDays(dataHora, new Date());
  if (days === 0) return { text: "hoje", className: "text-emerald-600 dark:text-emerald-400 font-semibold" };
  if (days === 1) return { text: "amanhã", className: "text-amber-600 dark:text-amber-400 font-semibold" };
  if (days === -1) return { text: "ontem", className: "text-neutral-400 dark:text-neutral-500" };
  if (days > 1) return { text: `em ${days} dias`, className: "text-neutral-500 dark:text-neutral-400" };
  return { text: `há ${Math.abs(days)} dias`, className: "text-neutral-400 dark:text-neutral-500" };
}

// ─────────────────────────────────────────────
// Depoente status
// ─────────────────────────────────────────────

function getDepoenteStatusConfig(status?: string) {
  const s = status?.toLowerCase() ?? "";
  if (s === "ouvido" || s === "ouvida")
    return { borderColor: "border-l-emerald-400", icon: <CheckCircle2 className="w-3 h-3 text-emerald-500" />, label: "Ouvido" };
  if (s === "nao_localizado" || s === "não localizado" || s === "revel")
    return { borderColor: "border-l-red-400", icon: <XCircle className="w-3 h-3 text-red-400" />, label: "Não localizado" };
  return { borderColor: "border-l-amber-400", icon: <Clock className="w-3 h-3 text-amber-500" />, label: "Pendente" };
}

function getIntimacaoConfig(intimado?: boolean | string) {
  if (intimado === true || intimado === "sim" || intimado === "intimado")
    return { label: "Intimado", className: "border-emerald-300 text-emerald-700 dark:text-emerald-400 dark:border-emerald-700" };
  if (intimado === "edital")
    return { label: "Edital", className: "border-red-300 text-red-700 dark:text-red-400 dark:border-red-700" };
  return { label: "Não intimado", className: "border-amber-300 text-amber-700 dark:text-amber-400 dark:border-amber-700" };
}

// ─────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────

function DepoenteCard({ depoente }: { depoente: any }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = getDepoenteStatusConfig(depoente.status);
  const intimacaoCfg = getIntimacaoConfig(depoente.intimado);
  const hasCertidao = !!depoente.certidao;

  return (
    <div className={cn(
      "rounded-lg border border-neutral-200 dark:border-neutral-700/60 border-l-[3px] bg-white dark:bg-neutral-800/40 overflow-hidden",
      statusCfg.borderColor
    )}>
      <div className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 truncate">
                {depoente.nome}
              </span>
              {depoente.tipo && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 font-medium flex-shrink-0">
                  {depoente.tipo}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <div className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                {statusCfg.icon}
                <span>
                  {statusCfg.label}
                  {depoente.dataOitiva ? ` em ${depoente.dataOitiva}` : ""}
                </span>
              </div>
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full border font-medium",
                intimacaoCfg.className
              )}>
                {intimacaoCfg.label}
              </span>
            </div>
          </div>
          {hasCertidao && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex-shrink-0 p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              title="Ver certidão"
            >
              {expanded
                ? <ChevronDown className="w-3.5 h-3.5" />
                : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
      {expanded && hasCertidao && (
        <div className="px-3 py-2 border-t border-neutral-100 dark:border-neutral-700/40 bg-neutral-50 dark:bg-neutral-900/40">
          <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 leading-relaxed whitespace-pre-wrap">
            {depoente.certidao}
          </p>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: React.ComponentType<any>; label: string }) {
  return (
    <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-medium flex items-center gap-1.5 mb-2.5">
      <Icon className="w-3 h-3" />
      {label}
    </p>
  );
}

function HistoricoTimeline({ itens }: { itens: any[] }) {
  function getPontoColor(resultado?: string) {
    const r = resultado?.toLowerCase() ?? "";
    if (r.includes("realiz") || r.includes("conclu")) return "bg-emerald-500";
    if (r.includes("adiada") || r.includes("adiado") || r.includes("suspenso")) return "bg-amber-500";
    if (r.includes("cancel") || r.includes("não realiz")) return "bg-red-500";
    return "bg-neutral-400";
  }

  return (
    <div className="relative pl-4">
      <div className="absolute left-[7px] top-0 bottom-0 w-px bg-neutral-200 dark:bg-neutral-700" />
      <div className="space-y-3">
        {itens.map((h: any, i: number) => (
          <div key={i} className="relative flex gap-3 text-xs">
            <div className={cn(
              "absolute left-[-9px] top-[3px] w-2.5 h-2.5 rounded-full border-2 border-white dark:border-neutral-900 flex-shrink-0",
              getPontoColor(h.resultado ?? h.status)
            )} />
            <span className="text-neutral-400 flex-shrink-0 tabular-nums w-10">
              {h.dataAudiencia
                ? format(new Date(h.dataAudiencia), "dd/MM")
                : "—"}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">
                {h.tipo ?? "Audiência"}
              </span>
              {(h.resultado ?? h.status) && (
                <span className="text-neutral-400 dark:text-neutral-500">
                  {" · "}{h.resultado ?? h.status}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────

interface EventDetailSheetProps {
  evento: any | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (evento: any) => void;
}

export function EventDetailSheet({ evento, open, onClose, onEdit }: EventDetailSheetProps) {
  const [copied, setCopied] = useState(false);

  // Parse numeric audiencia id — aceita número cru ou prefixo "audiencia-<id>"
  const audienciaIdNum = (() => {
    const raw = evento?.id;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string") {
      const match = raw.match(/^audiencia-(\d+)$/);
      if (match) return parseInt(match[1], 10);
      if (/^\d+$/.test(raw)) return parseInt(raw, 10);
    }
    return null;
  })();

  const { data: registro } = trpc.audiencias.buscarRegistro.useQuery(
    { audienciaId: audienciaIdNum ?? 0 },
    { enabled: audienciaIdNum !== null && open }
  );

  const { data: historico } = trpc.audiencias.buscarHistoricoRegistros.useQuery(
    { processoId: evento?.processoId },
    { enabled: !!evento?.processoId && open }
  );

  const depoentes: any[] = (registro as any)?.depoentes ?? [];
  const historicoRecente = (historico ?? []).slice(0, 3);
  const temEnrichment = depoentes.length > 0;
  const depoenteOuvidos = depoentes.filter((d: any) => {
    const s = d.status?.toLowerCase() ?? "";
    return s === "ouvido" || s === "ouvida";
  }).length;

  const copyProcesso = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!evento) return null;

  const dataHora = evento.data && evento.horarioInicio
    ? (() => { try { return new Date(`${evento.data}T${evento.horarioInicio}`); } catch { return null; } })()
    : evento.dataHora
      ? new Date(evento.dataHora)
      : null;

  const processoNum = evento.processo ?? evento.processoNumero ?? null;
  const assistidoNome = evento.assistido ?? evento.assistidoNome ?? null;
  const tipoCfg = getTipoConfig(evento.titulo ?? evento.tipo);
  const statusCfg = getStatusConfig(evento.status);
  const countdown = getCountdown(dataHora);
  const isRealizada = ["realizada", "concluida", "concluída"].includes(evento.status?.toLowerCase() ?? "");

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[480px] md:w-[560px] p-0 flex flex-col gap-0 border-l border-neutral-200 dark:border-neutral-800 [&>button:first-of-type]:hidden"
      >
        <SheetTitle className="sr-only">Detalhes do evento</SheetTitle>

        {/* ── Header premium ── */}
        <div className={cn(
          "px-4 pt-3 pb-4 border-b border-neutral-100 dark:border-neutral-800",
          tipoCfg?.tint ?? ""
        )}>
          {/* Linha 1: badges + botões */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              {tipoCfg && (
                <span className={cn(
                  "text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full",
                  tipoCfg.color, tipoCfg.bg
                )}>
                  {tipoCfg.label}
                </span>
              )}
              <span className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1",
                statusCfg.color, statusCfg.bg
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                {statusCfg.label}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {onEdit && (
                <button
                  onClick={() => onEdit(evento)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100/80 dark:hover:bg-neutral-800 transition-colors"
                  title="Editar evento"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100/80 dark:hover:bg-neutral-800 transition-colors"
                title="Fechar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Linha 2: título */}
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 leading-snug">
            {evento.titulo ?? evento.tipo ?? "Evento"}
          </p>

          {/* Linha 3: data/hora + countdown */}
          {dataHora && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {format(dataHora, "EEEE, dd 'de' MMMM · HH:mm", { locale: ptBR })}
                {evento.horarioFim ? ` — ${evento.horarioFim}` : ""}
              </p>
              {countdown && (
                <span className={cn("text-[11px]", countdown.className)}>
                  · {countdown.text}
                </span>
              )}
            </div>
          )}

          {/* Linha 4: local */}
          {evento.local && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {evento.local}
            </p>
          )}
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60">

          {/* 1 — Assistido + Processo */}
          {(assistidoNome || processoNum) && (
            <div className="px-4 py-3 space-y-2.5">
              {assistidoNome && (
                <div className="flex items-center gap-2.5">
                  <User className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-0.5">Assistido</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                        {assistidoNome}
                      </p>
                      {evento.assistidoId && (
                        <Link href={`/admin/assistidos/${evento.assistidoId}`} onClick={onClose}>
                          <ExternalLink className="w-3 h-3 text-neutral-400 hover:text-emerald-600 flex-shrink-0 transition-colors" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {processoNum && (
                <div className="flex items-center gap-2.5">
                  <FileText className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-0.5">Processo</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-mono text-neutral-700 dark:text-neutral-300 truncate">
                        {processoNum}
                      </p>
                      <button onClick={() => copyProcesso(processoNum)} title="Copiar número">
                        {copied
                          ? <Check className="w-3 h-3 text-emerald-500" />
                          : <Copy className="w-3 h-3 text-neutral-400 hover:text-neutral-600 cursor-pointer transition-colors" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2 — Depoentes (hero) */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2.5">
              <SectionLabel
                icon={Users}
                label={temEnrichment
                  ? `Depoentes · ${depoenteOuvidos} ouvido${depoenteOuvidos !== 1 ? "s" : ""} de ${depoentes.length}`
                  : "Depoentes"}
              />
            </div>

            {temEnrichment ? (
              <div className="space-y-2">
                {depoentes.map((d: any, i: number) => (
                  <DepoenteCard key={i} depoente={d} />
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700/60 bg-neutral-50/60 dark:bg-neutral-800/20 px-3.5 py-3">
                <AlertCircle className="w-4 h-4 text-neutral-300 dark:text-neutral-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Análise de depoentes não disponível
                  </p>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                    Ative o enrichment do processo no Drive para visualizar status, intimações e certidões por depoente.
                  </p>
                  {evento.processoId && (
                    <Link
                      href={`/admin/drive?processo=${evento.processoId}`}
                      onClick={onClose}
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 mt-1.5 transition-colors"
                    >
                      Abrir no Drive <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3 — Dados estratégicos */}
          {(evento.crime || evento.assunto || evento.atribuicao || evento.fase || historicoRecente.length > 0) && (
            <div className="px-4 py-3">
              <SectionLabel icon={Scale} label="Dados do Caso" />
              <div className="grid grid-cols-2 gap-2">
                {(evento.crime ?? evento.assunto) && (
                  <div className="col-span-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 px-3 py-2">
                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-0.5">Crime / Assunto</p>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium leading-snug">
                      {evento.crime ?? evento.assunto}
                    </p>
                  </div>
                )}
                {evento.fase && (
                  <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/40 px-3 py-2">
                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-0.5">Fase</p>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">{evento.fase}</p>
                  </div>
                )}
                {historicoRecente.length > 0 && (
                  <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/40 px-3 py-2">
                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-0.5">Audiências anteriores</p>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">{historicoRecente.length} realizadas</p>
                  </div>
                )}
                {evento.atribuicao && (
                  <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/40 px-3 py-2">
                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-0.5">Atribuição</p>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium truncate">{evento.atribuicao}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4 — Observações */}
          {evento.descricao && (
            <div className="px-4 py-3">
              <SectionLabel icon={StickyNote} label="Observações" />
              <p className="text-xs text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap leading-relaxed">
                {evento.descricao}
              </p>
            </div>
          )}

          {/* 5 — Histórico (timeline) */}
          {historicoRecente.length > 0 && (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <SectionLabel icon={History} label="Histórico do Processo" />
                {evento.processoId && (
                  <Link
                    href={`/admin/audiencias?processo=${evento.processoId}`}
                    onClick={onClose}
                    className="text-[10px] text-neutral-400 hover:text-emerald-600 flex items-center gap-0.5 transition-colors -mt-2.5"
                  >
                    Ver todas <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                )}
              </div>
              <HistoricoTimeline itens={historicoRecente} />
            </div>
          )}

        </div>

        {/* ── Bottom bar sticky ── */}
        <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(evento)}
              className="flex-1 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Editar
            </button>
          )}
          {isRealizada ? (
            evento.id && (
              <Link
                href={`/admin/audiencias/${evento.id}/registro`}
                onClick={onClose}
                className="flex-1 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors text-center flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ver registro
              </Link>
            )
          ) : (
            evento.id && (
              <Link
                href={`/admin/audiencias/${evento.id}/registro`}
                onClick={onClose}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition-colors text-center"
              >
                Registrar audiência
              </Link>
            )
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
