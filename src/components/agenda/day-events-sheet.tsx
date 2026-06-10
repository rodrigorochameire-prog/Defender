"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  X,
  FileText,
  Calendar as CalendarIcon,
  Edit3,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Maximize2,
  EyeOff,
  User,
  Users,
  Scale,
  MoreVertical,
} from "lucide-react";
import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ATRIBUICAO_OPTIONS,
  getAtribuicaoColors,
  getAtribuicaoIcon,
  normalizeAreaToFilter,
  SOLID_COLOR_MAP,
} from "@/lib/config/atribuicoes";
import { extrairTipoEvento, isSessaoPlenario } from "./extrair-tipo";
import { defensorBadge } from "@/lib/juri/normalize-defensor";
import { agendaItemVisual } from "@/lib/agenda/agenda-item-visual";

interface DayEventsSheetProps {
  isOpen: boolean;
  date: Date;
  eventos: any[];
  onClose: () => void;
  onEventClick: (evento: any) => void;
  onOpenModal?: (evento: any) => void;
  onEditEvento?: (evento: any) => void;
  onDeleteEvento?: (id: string) => void;
  onStatusChange?: (id: string, status: string) => void;
  onDuplicate?: (evento: any) => void;
}

// Verifica se o evento não ocorrerá (cancelado ou redesignado)
const isEventoCancelado = (status: string) =>
  status === "cancelado" ||
  status === "cancelada" ||
  status === "remarcado" ||
  status === "redesignado" ||
  status === "reagendada";

function ProcessoCopyRow({
  processo,
  cancelado,
}: {
  processo: string;
  cancelado: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-1.5 mt-0.5 group/processo">
      <FileText className="w-3 h-3 text-neutral-300 dark:text-neutral-600 shrink-0" />
      <span
        className={cn(
          "text-[11px] font-mono truncate",
          cancelado
            ? "text-neutral-400"
            : "text-neutral-400 dark:text-neutral-500",
        )}
      >
        {processo}
      </span>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(processo);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className={cn(
          "shrink-0 p-0.5 rounded transition-all cursor-pointer",
          copied
            ? "text-emerald-500 opacity-100"
            : "text-neutral-300 hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-300 opacity-0 group-hover/processo:opacity-100",
        )}
        title="Copiar número do processo"
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      </span>
    </div>
  );
}

export function DayEventsSheet({
  isOpen,
  date,
  eventos,
  onClose,
  onEventClick,
  onOpenModal,
  onEditEvento,
  onDeleteEvento,
  onStatusChange,
  onDuplicate,
}: DayEventsSheetProps) {
  const [activeAtribFilter, setActiveAtribFilter] = useState<string | null>(
    null,
  );
  const [ocultarAdv, setOcultarAdv] = useState(false);

  const sortedEventos = [...eventos].sort((a, b) =>
    (a.horarioInicio || "").localeCompare(b.horarioInicio || ""),
  );

  // Contagem por patrocínio (só audiências reais de titularidade — ignora
  // cancelados, atendimentos e eventos de mutirão, que não são patrocínio DPE)
  const { nDpe, nAdv } = useMemo(() => {
    let dpe = 0, adv = 0;
    for (const ev of eventos) {
      if (ev.fonte !== "audiencias" || isEventoCancelado(ev.status)) continue;
      const filterKey = normalizeAreaToFilter(ev.atribuicaoKey || ev.atribuicao);
      if (filterKey === "MUTIRAO" || filterKey === "MUTIRAO_PROTEGE") continue;
      if (ev.tipoPatrocinio === "PARTICULAR") adv++;
      else dpe++;
    }
    return { nDpe: dpe, nAdv: adv };
  }, [eventos]);

  // Atribuições presentes no dia (deduplicadas por filterKey, com contagem)
  const dayAtribuicoes = useMemo(() => {
    const seen = new Map<
      string,
      { key: string; color: string; Icon: any; label: string; shortLabel: string; count: number }
    >();
    for (const ev of eventos) {
      const filterKey = normalizeAreaToFilter(
        ev.atribuicaoKey || ev.atribuicao,
      );
      if (filterKey === "all") continue;
      const existing = seen.get(filterKey);
      if (existing) {
        existing.count++;
        continue;
      }
      const color = SOLID_COLOR_MAP[filterKey] || "#71717a";
      const Icon = getAtribuicaoIcon(filterKey);
      const label = getAtribuicaoColors(filterKey).label;
      const shortLabel =
        ATRIBUICAO_OPTIONS.find((o) => o.value === filterKey)?.shortLabel ||
        label;
      seen.set(filterKey, { key: filterKey, color, Icon, label, shortLabel, count: 1 });
    }
    return Array.from(seen.values());
  }, [eventos]);

  // Filtrar por atribuição + ocultar-advogado se ativos
  const filteredEventos = sortedEventos.filter((ev) => {
    if (ocultarAdv && ev.tipoPatrocinio === "PARTICULAR" && !isEventoCancelado(ev.status)) {
      return false;
    }
    if (activeAtribFilter) {
      const filterKey = normalizeAreaToFilter(ev.atribuicaoKey || ev.atribuicao);
      return filterKey === activeAtribFilter;
    }
    return true;
  });

  const dayName = format(date, "EEEE", { locale: ptBR });
  const dayDate = format(date, "d 'de' MMMM", { locale: ptBR });

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[520px] md:w-[640px] lg:w-[720px] p-0 flex flex-col gap-0 border-l-0 outline-none bg-[#f7f7f7] dark:bg-neutral-950 rounded-l-2xl sm:rounded-l-none shadow-2xl [&>button:first-of-type]:hidden"
      >
        <SheetTitle className="sr-only">Agenda do dia</SheetTitle>

        {/* ===== NAV HEADER — Padrão charcoal (idêntico ao event-detail-sheet) ===== */}
        <div className="bg-neutral-900 dark:bg-neutral-950 text-white backdrop-blur-md px-4 py-2.5 flex items-center justify-between">
          <SheetHeader className="p-0">
            <SheetTitle className="text-[13px] font-semibold tracking-tight text-white">Agenda</SheetTitle>
          </SheetHeader>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-neutral-800 flex items-center justify-center cursor-pointer"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ===== SCROLLABLE CONTENT ===== */}
        <div className="flex-1 overflow-y-auto">
          {/* ===== HERO CARD — branco com outline (Padrão Defender) ===== */}
          <div className="mx-3 mt-3 mb-4 px-4 py-4 rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800">
            <div className="flex items-start gap-3.5">
              {/* Avatar calendário (mês + dia — o dia da semana vive no título) */}
              <div className="w-11 h-11 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex flex-col items-center justify-center shrink-0">
                <span className="text-[9px] font-medium text-neutral-500 dark:text-neutral-500 leading-none uppercase">
                  {format(date, "MMM", { locale: ptBR }).replace(".", "")}
                </span>
                <span className="text-base font-bold text-neutral-700 dark:text-neutral-200 leading-tight">
                  {format(date, "d")}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-h-[28px]">
                  <h2
                    className="text-[15px] font-semibold text-neutral-800 dark:text-neutral-100 leading-tight truncate"
                    title={`${dayName}, ${dayDate}`}
                  >
                    {dayName.charAt(0).toUpperCase() + dayName.slice(1)}
                  </h2>
                  <span
                    className="ml-auto shrink-0 h-[22px] inline-flex items-center text-[10px] font-medium tabular-nums text-neutral-500 dark:text-neutral-500 px-2 rounded-full bg-neutral-100 dark:bg-neutral-800"
                    title={nAdv > 0 ? `${nDpe} da Defensoria · ${nAdv} com advogado constituído (mutirão fora da conta)` : undefined}
                  >
                    {filteredEventos.length} evento{filteredEventos.length !== 1 ? "s" : ""}
                    {nAdv > 0 && (
                      <span className="text-neutral-400 dark:text-neutral-600 font-normal">&nbsp;· {nDpe} DPE · {nAdv} adv</span>
                    )}
                  </span>
                </div>

                {/* Filtro de atribuições inline (pills Padrão Defender) */}
                {(dayAtribuicoes.length > 1 || nAdv > 0) && (
                <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                  {dayAtribuicoes.length > 1 &&
                    dayAtribuicoes.map(({ key, color, Icon, label, shortLabel, count }) => {
                      const isActive = activeAtribFilter === key;
                      return (
                        <button
                          key={key}
                          onClick={() =>
                            setActiveAtribFilter(isActive ? null : key)
                          }
                          className={cn(
                            "inline-flex items-center gap-1 h-[22px] px-2 rounded-full text-[10px] font-medium ring-1 ring-inset transition-colors cursor-pointer",
                            !isActive &&
                              "bg-white text-neutral-500 ring-neutral-200 hover:ring-neutral-300 hover:text-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:ring-neutral-700 dark:hover:ring-neutral-600",
                          )}
                          style={
                            isActive
                              ? {
                                  color,
                                  backgroundColor: `${color}14`,
                                  boxShadow: `inset 0 0 0 1px ${color}55`,
                                }
                              : undefined
                          }
                          title={label}
                        >
                          <Icon
                            className="w-3 h-3"
                            style={isActive ? undefined : { color }}
                          />
                          {shortLabel}
                          <span
                            className={cn(
                              "tabular-nums",
                              !isActive && "text-neutral-400 dark:text-neutral-500",
                            )}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  {nAdv > 0 && (
                    <button
                      type="button"
                      onClick={() => setOcultarAdv((v) => !v)}
                      title={ocultarAdv ? "Mostrar audiências com advogado constituído" : "Ocultar audiências com advogado constituído"}
                      className={cn(
                        "ml-auto inline-flex items-center gap-1 h-[22px] px-1.5 rounded-full text-[10px] font-medium transition-colors cursor-pointer",
                        ocultarAdv
                          ? "text-neutral-600 bg-neutral-100 ring-1 ring-inset ring-neutral-200 dark:text-neutral-300 dark:bg-neutral-800 dark:ring-neutral-700"
                          : "text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300",
                      )}
                    >
                      {ocultarAdv ? (
                        <EyeOff className="w-3 h-3" />
                      ) : (
                        <User className="w-3 h-3" />
                      )}
                      {ocultarAdv ? "adv ocultos" : "ocultar adv"}
                    </button>
                  )}
                </div>
                )}
              </div>
            </div>
          </div>

          {/* ===== EVENT LIST ===== */}
          <div className="px-3 pb-4 space-y-2">
            {filteredEventos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
                <CalendarIcon className="w-8 h-8 mb-2" />
                <p className="text-sm">Nenhum evento neste dia</p>
              </div>
            ) : (
              filteredEventos.map((evento) => {
                const cancelado = isEventoCancelado(evento.status);
                const concluido = evento.status === "concluido";
                // Advogado constituído: o card recua visualmente (foco do dia é
                // o que a DPE sustenta) e ganha indicador discreto à direita.
                const temAdv = evento.tipoPatrocinio === "PARTICULAR";
                const colors = getAtribuicaoColors(
                  evento.atribuicaoKey || evento.atribuicao,
                );
                const solidColor = cancelado
                  ? "#a1a1aa"
                  : (colors as any).color || "#71717a";
                const visual = agendaItemVisual(evento);
                const tipo = extrairTipoEvento(evento);
                const assistidoNome = evento.assistido || "";
                const processo = evento.processo || "";
                // Etiqueta R/J/G: só na Sessão de Julgamento (plenário), não em AIJ/instrução.
                const defBadge = isSessaoPlenario(evento) ? defensorBadge(evento.defensorNome) : null;

                return (
                  <div
                    key={evento.id}
                    className={cn(
                      "group rounded-xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 transition-all duration-200 flex",
                      cancelado
                        ? "opacity-60"
                        : temAdv
                          ? "opacity-55 hover:opacity-100 shadow-none hover:shadow-sm"
                          : "shadow-sm shadow-black/[0.04] hover:shadow-md hover:border-neutral-300/80",
                    )}
                  >
                    {/* Body — clicável: abre detalhes (substitui botão "Detalhes") */}
                    <button
                      type="button"
                      onClick={() => onEventClick(evento)}
                      className="flex-1 min-w-0 flex items-start gap-3 px-3.5 py-3 text-left cursor-pointer rounded-l-xl"
                      aria-label="Ver detalhes"
                    >
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full shrink-0 mt-1.5",
                          visual.dashed ? "border-2" : "",
                        )}
                        style={
                          visual.dashed
                            ? { borderColor: solidColor, backgroundColor: "transparent" }
                            : { backgroundColor: solidColor }
                        }
                      />

                      <div className="flex-1 min-w-0">
                        {/* Linha 1: hora + tipo */}
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-sm font-bold tabular-nums shrink-0",
                              cancelado
                                ? "text-neutral-400 line-through"
                                : "text-neutral-800 dark:text-neutral-200",
                            )}
                          >
                            {evento.horarioInicio || "--:--"}
                          </span>
                          <span
                            className={cn(
                              "text-xs font-medium shrink-0 truncate",
                              cancelado ? "text-neutral-400" : "",
                            )}
                            style={
                              cancelado ? undefined : { color: solidColor }
                            }
                          >
                            {tipo}
                          </span>
                          {visual.dashed && !cancelado && (
                            <Users
                              className="w-3 h-3 shrink-0 opacity-70"
                              style={{ color: solidColor }}
                              title="Atendimento"
                            />
                          )}
                          {temAdv && !cancelado && (
                            <span
                              className="ml-auto inline-flex items-center gap-1 shrink-0 text-neutral-400 dark:text-neutral-500"
                              title={`Advogado constituído${evento.advogadoParticular ? ` — ${evento.advogadoParticular}` : ""}`}
                            >
                              <User className="w-3 h-3" />
                              <span className="text-[9px] font-medium uppercase tracking-wider">adv</span>
                            </span>
                          )}
                          {defBadge && !cancelado && (
                            <span
                              title={`Júri de ${defBadge.label}`}
                              className={cn("inline-flex items-center gap-1 shrink-0", defBadge.text)}
                            >
                              <span className={cn("inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[8px] font-bold text-white", defBadge.dot)}>
                                {defBadge.initial}
                              </span>
                              <span className="text-[10px] font-semibold">{defBadge.label.replace(/^Dr[a]?\. /, "")}</span>
                            </span>
                          )}
                          {cancelado && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-medium ml-auto shrink-0">
                              {evento.status}
                            </span>
                          )}
                          {/* Indicador "realizado" sutil — só ícone discreto à direita,
                              quando concluído. */}
                          {concluido && !cancelado && (
                            <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-emerald-600/80 dark:text-emerald-500/70 shrink-0">
                              <CheckCircle2 className="w-3 h-3" />
                            </span>
                          )}
                        </div>

                        {/* Linha 2: nome do assistido */}
                        {assistidoNome && (
                          <p
                            className={cn(
                              "text-[13px] font-medium truncate mt-0.5",
                              cancelado
                                ? "text-neutral-400 line-through"
                                : "text-neutral-700 dark:text-neutral-300",
                            )}
                          >
                            {assistidoNome}
                          </p>
                        )}

                        {/* Linha 3: processo */}
                        {processo && (
                          <ProcessoCopyRow
                            processo={processo}
                            cancelado={cancelado}
                          />
                        )}
                      </div>
                    </button>

                    {/* Coluna vertical de ações à direita — sempre visível, compacta.
                        Substitui a faixa horizontal "Realizado / Detalhes / Tela cheia".
                        justify-evenly distribui os 4 botões na altura do body, mantendo
                        as colunas visualmente equilibradas. */}
                    <TooltipProvider delayDuration={250}>
                      <div className="flex flex-col justify-evenly border-l border-neutral-100 dark:border-neutral-800/60 py-1">
                        {/* Toggle realizado — checkbox-style discreto. Cinza vazio
                            por padrão, verde preenchido quando concluído. */}
                        {onStatusChange && !cancelado && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (concluido) {
                                    onStatusChange(evento.id, "confirmado");
                                    toast.success("Marcado como pendente.");
                                  } else {
                                    onStatusChange(evento.id, "concluido");
                                    toast.success("Marcado como realizado.");
                                  }
                                }}
                                className={cn(
                                  "px-2 py-0.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer",
                                  concluido
                                    ? "text-emerald-500/80 hover:text-emerald-600"
                                    : "text-neutral-300 hover:text-neutral-500",
                                )}
                                aria-label={concluido ? "Desmarcar como realizado" : "Marcar como realizado"}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-[11px]">
                              {concluido ? "Desmarcar realizado" : "Marcar como realizado"}
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Restaurar (só se cancelado) — substitui o toggle de realizado */}
                        {onStatusChange && cancelado && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStatusChange(evento.id, "confirmado");
                                  toast.success("Evento restaurado.");
                                }}
                                className="px-2 py-0.5 text-blue-500/80 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer"
                                aria-label="Restaurar"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-[11px]">
                              Restaurar
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Tela cheia — abre o modal completo */}
                        {onOpenModal && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenModal(evento);
                                }}
                                className="px-2 py-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer"
                                aria-label="Tela cheia"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-[11px]">
                              Tela cheia
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Editar — ação rápida frequente que substitui "Detalhes" no slot */}
                        {onEditEvento && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditEvento(evento);
                                }}
                                className="px-2 py-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer"
                                aria-label="Editar"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-[11px]">
                              Editar
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Menu kebab — secundárias (cancelar, duplicar, excluir, ver assistido, ver demanda) */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              className="px-2 py-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer"
                              aria-label="Mais ações"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {evento.assistidoId && (
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/assistidos/${evento.assistidoId}`}>
                                  <User className="w-3.5 h-3.5 mr-2" /> Ver assistido
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {evento.vinculoDemanda && (
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/demandas/${evento.vinculoDemanda}`}>
                                  <Scale className="w-3.5 h-3.5 mr-2" /> Ver demanda
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {onDuplicate && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDuplicate(evento);
                                }}
                              >
                                <Copy className="w-3.5 h-3.5 mr-2" /> Duplicar
                              </DropdownMenuItem>
                            )}
                            {!cancelado && !concluido && onStatusChange && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onStatusChange(evento.id, "cancelado");
                                    toast.success("Evento cancelado.");
                                  }}
                                  className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/30"
                                >
                                  <XCircle className="w-3.5 h-3.5 mr-2" /> Cancelar
                                </DropdownMenuItem>
                              </>
                            )}
                            {onDeleteEvento && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteEvento(evento.id);
                                }}
                                className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/30"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TooltipProvider>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
