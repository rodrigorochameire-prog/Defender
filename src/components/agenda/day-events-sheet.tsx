"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  X,
  MapPin,
  FileText,
  Clock,
  Calendar as CalendarIcon,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  User,
  Scale,
  StickyNote,
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
  getAtribuicaoColors,
  getAtribuicaoIcon,
  normalizeAreaToFilter,
  SOLID_COLOR_MAP,
} from "@/lib/config/atribuicoes";

interface DayEventsSheetProps {
  isOpen: boolean;
  date: Date;
  eventos: any[];
  onClose: () => void;
  onEventClick: (evento: any) => void;
  onEditEvento?: (evento: any) => void;
  onDeleteEvento?: (id: string) => void;
  onStatusChange?: (id: string, status: string) => void;
}

// Verifica se o evento não ocorrerá (cancelado ou redesignado)
const isEventoCancelado = (status: string) =>
  status === "cancelado" || status === "cancelada" ||
  status === "remarcado" || status === "redesignado" || status === "reagendada";

// Extrair tipo de audiência do título (sem o nome do assistido)
const tipoAbreviacoes: Record<string, string> = {
  "Audiência de Instrução e Julgamento": "AIJ",
  "Instrução e Julgamento": "AIJ",
  "Audiência de Custódia": "Custódia",
  "Audiência de Justificação": "Justificação",
  "Audiência Preliminar": "Preliminar",
  "Audiência de Apresentação": "Apresentação",
  "Audiência Concentrada": "Concentrada",
  "Audiência de Conciliação": "Conciliação",
  "Sessão de Julgamento do Tribunal do Júri": "Júri",
  "Sessão do Tribunal do Júri": "Júri",
  "Tribunal do Júri": "Júri",
  "Sessão de Júri": "Júri",
  "Plenário do Júri": "Júri",
  "Produção Antecipada de Provas": "PAP",
  "Acordo de Não Persecução Penal": "ANPP",
  "Audiência Admonitória": "Admonitória",
  "Oitiva Especial": "Oitiva Especial",
  "Audiência de Retratação": "Retratação",
  "Audiência de Execução": "Execução",
  "Audiência de Progressão": "Progressão",
  "Audiência de Livramento": "Livramento",
  "Audiência de Unificação": "Unificação",
  "Audiência Adminitória": "Adminitória",
  "Adminitória": "Adminitória",
  "Retratação": "Retratação",
  "Audiência de Medidas Protetivas": "Med. Protetivas",
  "Medidas Protetivas": "Med. Protetivas",
  "Audiência": "Audiência",
  "Atendimento": "Atendimento",
  "Reunião": "Reunião",
  "Diligência": "Diligência",
};

function extrairTipo(titulo: string): string {
  // Remove prefixo ADV se presente
  const clean = titulo.replace(/^ADV\s*[-–]\s*/i, "").replace(/^ADV\s+/i, "");
  // Tenta encontrar tipo no título antes do primeiro " - "
  const firstSegment = clean.split(/\s*[-–]\s*/)[0]?.trim() || "";

  // Verificar match direto ou parcial
  if (tipoAbreviacoes[firstSegment]) return tipoAbreviacoes[firstSegment];
  for (const [chave, abrev] of Object.entries(tipoAbreviacoes)) {
    if (firstSegment.includes(chave)) return abrev;
  }
  // Se o primeiro segmento é muito curto (tipo "AIJ"), retornar como está
  if (firstSegment.length <= 20) return firstSegment;
  return firstSegment.substring(0, 20) + "…";
}

function ProcessoCopyRow({ processo, cancelado }: { processo: string; cancelado: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-1.5 mt-0.5 group/processo">
      <FileText className="w-3 h-3 text-zinc-300 dark:text-zinc-600 shrink-0" />
      <span className={cn(
        "text-[11px] font-mono truncate",
        cancelado ? "text-zinc-400" : "text-zinc-400 dark:text-zinc-500"
      )}>
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
            : "text-zinc-300 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-300 opacity-0 group-hover/processo:opacity-100"
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
  onEditEvento,
  onDeleteEvento,
  onStatusChange,
}: DayEventsSheetProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeAtribFilter, setActiveAtribFilter] = useState<string | null>(null);

  const sortedEventos = [...eventos].sort((a, b) =>
    (a.horarioInicio || "").localeCompare(b.horarioInicio || "")
  );

  // Atribuições presentes no dia (deduplicadas por filterKey)
  const dayAtribuicoes = useMemo(() => {
    const seen = new Map<string, { key: string; color: string; Icon: any }>();
    for (const ev of eventos) {
      const filterKey = normalizeAreaToFilter(ev.atribuicaoKey || ev.atribuicao);
      if (filterKey === "all" || seen.has(filterKey)) continue;
      const color = SOLID_COLOR_MAP[filterKey] || "#71717a";
      const Icon = getAtribuicaoIcon(filterKey);
      seen.set(filterKey, { key: filterKey, color, Icon });
    }
    return Array.from(seen.values());
  }, [eventos]);

  // Filtrar por atribuição se ativo
  const filteredEventos = activeAtribFilter
    ? sortedEventos.filter((ev) => {
        const filterKey = normalizeAreaToFilter(ev.atribuicaoKey || ev.atribuicao);
        return filterKey === activeAtribFilter;
      })
    : sortedEventos;

  const dayName = format(date, "EEEE", { locale: ptBR });
  const dayDate = format(date, "d 'de' MMMM", { locale: ptBR });

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[420px] p-0 flex flex-col gap-0 border-l border-zinc-200 dark:border-zinc-800"
      >
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 space-y-0">
          <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-medium">
            {dayName}
          </p>
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg font-serif font-semibold text-zinc-900 dark:text-zinc-100">
              {dayDate}
            </SheetTitle>

            {/* Filtro de atribuições inline — só ícones presentes no dia */}
            {dayAtribuicoes.length > 1 && (
              <>
                <span className="w-px h-4 bg-zinc-200 dark:bg-zinc-700" />
                {dayAtribuicoes.map(({ key, color, Icon }) => {
                  const isActive = activeAtribFilter === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveAtribFilter(isActive ? null : key)}
                      className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer",
                        isActive ? "shadow-sm" : "opacity-40 hover:opacity-75"
                      )}
                      style={isActive ? { backgroundColor: `${color}18`, color } : { color }}
                      title={getAtribuicaoColors(key).label}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </>
            )}

            <span className="flex-1" />
            <span className="text-[10px] font-medium tabular-nums text-zinc-400 dark:text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
              {eventos.length}
            </span>
          </div>
        </SheetHeader>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto">
          {filteredEventos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <CalendarIcon className="w-8 h-8 mb-2" />
              <p className="text-sm">Nenhum evento neste dia</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {filteredEventos.map((evento) => {
                const cancelado = isEventoCancelado(evento.status);
                const isExpanded = expandedId === evento.id;
                const colors = getAtribuicaoColors(evento.atribuicaoKey || evento.atribuicao);
                const solidColor = cancelado ? "#a1a1aa" : (colors as any).color || "#71717a";
                const tipo = extrairTipo(evento.titulo);
                const assistidoNome = evento.assistido || "";
                const processo = evento.processo || "";

                return (
                  <div key={evento.id} className="group">
                    {/* Row */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : evento.id)}
                      className={cn(
                        "w-full text-left flex items-stretch gap-0 transition-colors cursor-pointer",
                        cancelado
                          ? "opacity-45"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      )}
                    >
                      {/* Color bar */}
                      <div
                        className="w-[3px] flex-shrink-0 my-2.5 ml-1.5 rounded-full"
                        style={{ backgroundColor: solidColor }}
                      />

                      <div className="flex-1 min-w-0 px-3 py-2.5">
                        {/* Linha 1: Horário + Tipo */}
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-bold tabular-nums shrink-0",
                            cancelado ? "text-zinc-400 line-through" : "text-zinc-800 dark:text-zinc-200"
                          )}>
                            {evento.horarioInicio || "--:--"}
                          </span>
                          <span
                            className={cn(
                              "text-xs font-medium shrink-0",
                              cancelado ? "text-zinc-400" : ""
                            )}
                            style={cancelado ? undefined : { color: solidColor }}
                          >
                            {tipo}
                          </span>
                          {cancelado && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium ml-auto shrink-0">
                              {evento.status}
                            </span>
                          )}
                        </div>

                        {/* Linha 2: Nome do assistido */}
                        {assistidoNome && (
                          <p className={cn(
                            "text-[13px] font-medium truncate mt-0.5",
                            cancelado ? "text-zinc-400 line-through" : "text-zinc-700 dark:text-zinc-300"
                          )}>
                            {assistidoNome}
                          </p>
                        )}

                        {/* Linha 3: Processo (com botão copiar) */}
                        {processo && (
                          <ProcessoCopyRow processo={processo} cancelado={cancelado} />
                        )}
                      </div>

                      {/* Expand indicator */}
                      <div className="flex items-center pr-3 shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="bg-zinc-50/50 dark:bg-zinc-800/20 px-5 py-3 ml-1.5 border-l-2 space-y-2.5" style={{ borderColor: solidColor + "40" }}>
                        {/* Info rows */}
                        {evento.local && (
                          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{evento.local}</span>
                          </div>
                        )}
                        {evento.atribuicao && (
                          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            {(() => {
                              const Icon = getAtribuicaoIcon(evento.atribuicaoKey || evento.atribuicao);
                              return <Icon className="w-3.5 h-3.5 shrink-0" />;
                            })()}
                            <span>{evento.atribuicao}</span>
                          </div>
                        )}
                        {evento.horarioFim && (
                          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>{evento.horarioInicio} — {evento.horarioFim}</span>
                          </div>
                        )}

                        {/* Observações */}
                        {evento.observacoes && (
                          <div className="flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <StickyNote className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{evento.observacoes}</span>
                          </div>
                        )}

                        {/* Status quick-change */}
                        {onStatusChange && (
                          <div className="flex items-center gap-1 pt-0.5">
                            {!cancelado && evento.status !== "concluido" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onStatusChange(evento.id, "concluido");
                                    toast.success("Marcado como realizado!");
                                  }}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Realizado
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onStatusChange(evento.id, "cancelado");
                                    toast.success("Evento cancelado.");
                                  }}
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Cancelar
                                </Button>
                              </>
                            )}
                            {cancelado && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStatusChange(evento.id, "confirmado");
                                  toast.success("Evento restaurado!");
                                }}
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Restaurar
                              </Button>
                            )}
                            {evento.status === "concluido" && (
                              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Realizado
                              </span>
                            )}
                          </div>
                        )}

                        {/* Separator */}
                        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2" />

                        {/* Navigation + Actions */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Abrir detalhes */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick(evento);
                            }}
                          >
                            <ExternalLink className="w-3 h-3" />
                            Detalhes
                          </Button>

                          {/* Ver assistido */}
                          {evento.assistidoId && (
                            <Link
                              href={`/admin/assistidos/${evento.assistidoId}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer gap-1"
                              >
                                <User className="w-3 h-3" />
                                Assistido
                              </Button>
                            </Link>
                          )}

                          {/* Ver demanda/processo */}
                          {evento.vinculoDemanda && (
                            <Link
                              href={`/admin/demandas/${evento.vinculoDemanda}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer gap-1"
                              >
                                <Scale className="w-3 h-3" />
                                Demanda
                              </Button>
                            </Link>
                          )}

                          {/* Spacer */}
                          <span className="flex-1" />

                          {/* Edit */}
                          {onEditEvento && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditEvento(evento);
                              }}
                              title="Editar"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {/* Delete */}
                          {onDeleteEvento && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-zinc-400 hover:text-red-500 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteEvento(evento.id);
                              }}
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
