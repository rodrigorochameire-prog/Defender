"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  X,
  MapPin,
  FileText,
  Gavel,
  Users,
  Clock,
  Calendar as CalendarIcon,
  Home,
  Lock,
  Folder,
  RefreshCw,
  Shield,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface DayEventsSheetProps {
  isOpen: boolean;
  date: Date;
  eventos: any[];
  onClose: () => void;
  onEventClick: (evento: any) => void;
  onEditEvento?: (evento: any) => void;
  onDeleteEvento?: (id: string) => void;
}

// Verifica se o evento não ocorrerá (cancelado ou redesignado)
const isEventoCancelado = (status: string) =>
  status === "cancelado" || status === "cancelada" ||
  status === "remarcado" || status === "redesignado" || status === "reagendada";

// Abreviações para títulos de eventos
const abreviacoes: Record<string, string> = {
  "Audiência de Instrução e Julgamento": "AIJ",
  "Instrução e Julgamento": "AIJ",
  "Audiência de Custódia": "Custódia",
  "Audiência de Justificação": "Justificação",
  "Audiência Preliminar": "AP",
  "Audiência de Apresentação": "Apresentação",
  "Audiência Concentrada": "Aud. Concentrada",
  "Audiência de Conciliação": "Conciliação",
  "Sessão de Julgamento do Tribunal do Júri": "Júri",
  "Sessão do Tribunal do Júri": "Júri",
  "Tribunal do Júri": "Júri",
  "Sessão de Júri": "Júri",
  "Plenário do Júri": "Júri",
  "Produção Antecipada de Provas": "PAP",
  "Acordo de Não Persecução Penal": "ANPP",
  "Audiência Admonitória": "Admonitória",
  "Oitiva Especial": "Oitiva especial",
  "Audiência de Retratação": "Retratação",
  "Audiência de Execução": "Exec",
  "Audiência de Progressão": "Progressão",
  "Audiência de Livramento": "Livramento",
  "Audiência de Unificação": "Unificação",
  "Audiência Adminitória": "Adminitória",
  "Adminitória": "Adminitória",
  "Retratação": "Retratação",
  "Audiência de Medidas Protetivas": "Med. Protetivas",
  "Medidas Protetivas": "Med. Protetivas",
  "Audiência": "Aud",
  "Atendimento": "Atend",
  "Reunião": "Reunião",
  "Diligência": "Dilig",
};

const abreviarTitulo = (titulo: string): string => {
  if (abreviacoes[titulo]) return abreviacoes[titulo];
  for (const [chave, abrev] of Object.entries(abreviacoes)) {
    if (titulo.includes(chave)) return abrev;
  }
  return titulo.length > 24 ? titulo.substring(0, 24) + "..." : titulo;
};

// Cores da barra lateral por atribuição
const borderLeftColors: Record<string, string> = {
  "Tribunal do Júri": "bg-emerald-500",
  "Grupo Especial do Júri": "bg-teal-600",
  "Violência Doméstica": "bg-amber-500",
  "Execução Penal": "bg-blue-600",
  "Criminal Geral": "bg-rose-600",
  "Substituição": "bg-zinc-500",
  "Curadoria Especial": "bg-purple-600",
  "Geral": "bg-zinc-400",
};

const atribuicaoIcons: Record<string, any> = {
  "Tribunal do Júri": Gavel,
  "Grupo Especial do Júri": Gavel,
  "Violência Doméstica": Home,
  "Execução Penal": Lock,
  "Criminal Geral": Folder,
  "Substituição": RefreshCw,
  "Curadoria Especial": Shield,
};

export function DayEventsSheet({
  isOpen,
  date,
  eventos,
  onClose,
  onEventClick,
  onEditEvento,
  onDeleteEvento,
}: DayEventsSheetProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sortedEventos = [...eventos].sort((a, b) =>
    (a.horarioInicio || "").localeCompare(b.horarioInicio || "")
  );

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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-medium">
                {dayName}
              </p>
              <SheetTitle className="text-lg font-serif font-semibold text-zinc-900 dark:text-zinc-100">
                {dayDate}
              </SheetTitle>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium tabular-nums">
                {eventos.length} evento{eventos.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </SheetHeader>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto">
          {sortedEventos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <CalendarIcon className="w-8 h-8 mb-2" />
              <p className="text-sm">Nenhum evento neste dia</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {sortedEventos.map((evento) => {
                const cancelado = isEventoCancelado(evento.status);
                const isExpanded = expandedId === evento.id;
                const barColor = cancelado
                  ? "bg-zinc-300 dark:bg-zinc-600"
                  : borderLeftColors[evento.atribuicao] || "bg-zinc-400";
                const tipoAbrev = abreviarTitulo(evento.titulo);
                const assistidoNome = evento.assistido || "";

                return (
                  <div key={evento.id} className="group">
                    {/* Compact row */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : evento.id)}
                      className={cn(
                        "w-full text-left flex items-stretch gap-0 transition-colors",
                        cancelado
                          ? "opacity-50"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      )}
                    >
                      {/* Color bar */}
                      <div className={cn("w-1 flex-shrink-0 my-2 ml-1 rounded-full", barColor)} />

                      <div className="flex-1 min-w-0 px-4 py-2.5">
                        {/* Line 1: Time + Type + Name */}
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-xs font-bold tabular-nums shrink-0",
                            cancelado ? "text-zinc-400 line-through" : "text-zinc-800 dark:text-zinc-200"
                          )}>
                            {evento.horarioInicio || "--:--"}
                          </span>
                          <span className={cn(
                            "text-xs font-semibold shrink-0",
                            cancelado ? "text-zinc-400" : "text-zinc-500 dark:text-zinc-400"
                          )}>
                            {tipoAbrev}
                          </span>
                          <span className="text-[10px] text-zinc-300 dark:text-zinc-600">·</span>
                          <span className={cn(
                            "text-xs truncate",
                            cancelado ? "text-zinc-400 line-through" : "text-zinc-700 dark:text-zinc-300"
                          )}>
                            {assistidoNome || "—"}
                          </span>
                        </div>

                        {/* Line 2: Process number */}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <FileText className="w-3 h-3 text-zinc-300 dark:text-zinc-600 shrink-0" />
                          <span className={cn(
                            "text-[11px] font-mono truncate",
                            cancelado ? "text-zinc-400" : "text-zinc-400 dark:text-zinc-500"
                          )}>
                            {evento.processo || "Sem processo"}
                          </span>
                          {cancelado && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium ml-auto shrink-0">
                              {evento.status}
                            </span>
                          )}
                        </div>
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
                      <div className="bg-zinc-50/50 dark:bg-zinc-800/20 px-5 py-3 ml-1 border-l-2 border-zinc-200 dark:border-zinc-700 space-y-2">
                        {evento.local && (
                          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{evento.local}</span>
                          </div>
                        )}
                        {evento.atribuicao && (
                          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            {(() => {
                              const Icon = atribuicaoIcons[evento.atribuicao] || Folder;
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
                        {/* Actions */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-zinc-500 hover:text-emerald-600 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick(evento);
                            }}
                          >
                            Abrir
                          </Button>
                          {onEditEvento && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditEvento(evento);
                              }}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {onDeleteEvento && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-zinc-400 hover:text-red-500 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteEvento(evento.id);
                              }}
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
