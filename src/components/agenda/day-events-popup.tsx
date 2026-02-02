import { motion, AnimatePresence } from "motion/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  X,
  Clock,
  MapPin,
  User,
  FileText,
  ChevronRight,
  Gavel,
  Users,
  Calendar as CalendarIcon,
  Home,
  Lock,
  Folder,
  RefreshCw,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface DayEventsPopupProps {
  isOpen: boolean;
  date: Date;
  eventos: any[];
  position: { x: number; y: number };
  onClose: () => void;
  onEventClick: (evento: any) => void;
}

// Cores por atribuição - Design Premium e Profissional
const atribuicaoColors: Record<string, { bg: string; text: string; dot: string; icon: string; border: string; borderLeft: string; borderColor: string; borderHover: string }> = {
  "Tribunal do Júri": {
    bg: "bg-white dark:bg-zinc-900 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10",
    text: "text-emerald-800 dark:text-emerald-400",
    dot: "bg-emerald-600",
    icon: "text-emerald-600 dark:text-emerald-500",
    border: "border-zinc-200/70 dark:border-zinc-800/70",
    borderLeft: "border-l-emerald-500",
    borderColor: "border-emerald-300/70 dark:border-emerald-700/50",
    borderHover: "hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-emerald-200/50 dark:hover:shadow-emerald-900/50",
  },
  "Grupo Especial do Júri": {
    bg: "bg-white dark:bg-zinc-900 hover:bg-teal-50/30 dark:hover:bg-teal-950/10",
    text: "text-teal-800 dark:text-teal-400",
    dot: "bg-teal-600",
    icon: "text-teal-600 dark:text-teal-500",
    border: "border-zinc-200/70 dark:border-zinc-800/70",
    borderLeft: "border-l-teal-600",
    borderColor: "border-teal-300/70 dark:border-teal-700/50",
    borderHover: "hover:border-teal-400 dark:hover:border-teal-600 hover:shadow-teal-200/50 dark:hover:shadow-teal-900/50",
  },
  "Violência Doméstica": {
    bg: "bg-white dark:bg-zinc-900 hover:bg-amber-50/30 dark:hover:bg-amber-950/10",
    text: "text-amber-800 dark:text-amber-400",
    dot: "bg-amber-500",
    icon: "text-amber-600 dark:text-amber-500",
    border: "border-zinc-200/70 dark:border-zinc-800/70",
    borderLeft: "border-l-amber-500",
    borderColor: "border-amber-300/70 dark:border-amber-700/50",
    borderHover: "hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-amber-200/50 dark:hover:shadow-amber-900/50",
  },
  "Execução Penal": {
    bg: "bg-white dark:bg-zinc-900 hover:bg-blue-50/30 dark:hover:bg-blue-950/10",
    text: "text-blue-800 dark:text-blue-400",
    dot: "bg-blue-600",
    icon: "text-blue-600 dark:text-blue-500",
    border: "border-zinc-200/70 dark:border-zinc-800/70",
    borderLeft: "border-l-blue-600",
    borderColor: "border-blue-300/70 dark:border-blue-700/50",
    borderHover: "hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50",
  },
  "Criminal Geral": {
    bg: "bg-white dark:bg-zinc-900 hover:bg-rose-50/30 dark:hover:bg-rose-950/10",
    text: "text-rose-800 dark:text-rose-400",
    dot: "bg-rose-600",
    icon: "text-rose-600 dark:text-rose-500",
    border: "border-zinc-200/70 dark:border-zinc-800/70",
    borderLeft: "border-l-rose-600",
    borderColor: "border-rose-300/70 dark:border-rose-700/50",
    borderHover: "hover:border-rose-400 dark:hover:border-rose-600 hover:shadow-rose-200/50 dark:hover:shadow-rose-900/50",
  },
  "Substituição": {
    bg: "bg-white dark:bg-zinc-900 hover:bg-slate-50/30 dark:hover:bg-slate-950/10",
    text: "text-slate-800 dark:text-slate-400",
    dot: "bg-slate-600",
    icon: "text-slate-600 dark:text-slate-500",
    border: "border-zinc-200/70 dark:border-zinc-800/70",
    borderLeft: "border-l-slate-600",
    borderColor: "border-slate-300/70 dark:border-slate-700/50",
    borderHover: "hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50",
  },
  "Curadoria Especial": {
    bg: "bg-white dark:bg-zinc-900 hover:bg-purple-50/30 dark:hover:bg-purple-950/10",
    text: "text-purple-800 dark:text-purple-400",
    dot: "bg-purple-600",
    icon: "text-purple-600 dark:text-purple-500",
    border: "border-zinc-200/70 dark:border-zinc-800/70",
    borderLeft: "border-l-purple-600",
    borderColor: "border-purple-300/70 dark:border-purple-700/50",
    borderHover: "hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-purple-200/50 dark:hover:shadow-purple-900/50",
  },
  "Geral": {
    bg: "bg-white dark:bg-zinc-900 hover:bg-zinc-50/30 dark:hover:bg-zinc-950/10",
    text: "text-zinc-800 dark:text-zinc-400",
    dot: "bg-zinc-500",
    icon: "text-zinc-600 dark:text-zinc-500",
    border: "border-zinc-200/70 dark:border-zinc-800/70",
    borderLeft: "border-l-zinc-500",
    borderColor: "border-zinc-300/70 dark:border-zinc-700/50",
    borderHover: "hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-zinc-200/50 dark:hover:shadow-zinc-900/50",
  },
};

// Abreviações para títulos de eventos no calendário
const abreviacoes: Record<string, string> = {
  // AIJ - Instrução e Julgamento
  "Audiência de Instrução e Julgamento": "AIJ",
  "Instrução e Julgamento": "AIJ",
  
  // Custódia
  "Audiência de Custódia": "Custódia",
  
  // Justificação
  "Audiência de Justificação": "Justificação",
  
  // Audiências Gerais
  "Audiência Preliminar": "AP",
  "Audiência de Apresentação": "Apresentação",
  "Audiência Concentrada": "Aud. Concentrada",
  "Audiência de Conciliação": "Conciliação",
  
  // Júri
  "Sessão de Julgamento do Tribunal do Júri": "Júri",
  "Sessão do Tribunal do Júri": "Júri",
  "Tribunal do Júri": "Júri",
  "Sessão de Júri": "Júri",
  "Plenário do Júri": "Júri",
  
  // PAP - Produção Antecipada de Provas
  "Produção Antecipada de Provas": "PAP",
  
  // ANPP - Acordo de Não Persecução Penal
  "Acordo de Não Persecução Penal": "ANPP",
  
  // Admonitória (Execução Penal)
  "Audiência Admonitória": "Admonitória",
  
  // Oitiva Especial
  "Oitiva Especial": "Oitiva especial",
  
  // Retratação
  "Audiência de Retratação": "Retratação",
  
  // Execução Penal
  "Audiência de Execução": "Exec",
  "Audiência de Progressão": "Progressão",
  "Audiência de Livramento": "Livramento",
  "Audiência de Unificação": "Unificação",
  "Audiência Adminitória": "Adminitória",
  "Adminitória": "Adminitória",
  
  // Violência Doméstica
  "Audiência de Retratação": "Retratação",
  "Retratação": "Retratação",
  "Audiência de Medidas Protetivas": "Med. Protetivas",
  "Medidas Protetivas": "Med. Protetivas",
  
  // Genéricas
  "Audiência": "Aud",
  "Atendimento": "Atend",
  "Reunião": "Reunião",
  "Diligência": "Dilig",
};

// Função para abreviar título
const abreviarTitulo = (titulo: string): string => {
  // Busca correspondência exata
  if (abreviacoes[titulo]) {
    return abreviacoes[titulo];
  }
  
  // Busca parcial (se o título contém alguma das chaves)
  for (const [chave, abrev] of Object.entries(abreviacoes)) {
    if (titulo.includes(chave)) {
      return abrev;
    }
  }
  
  // Se não encontrou, retorna o título original truncado
  return titulo.length > 24 ? titulo.substring(0, 24) + "..." : titulo;
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

const tipoIcons: Record<string, any> = {
  audiencia: Gavel,
  reuniao: Users,
  prazo: Clock,
  compromisso: CalendarIcon,
  diligencia: MapPin,
  atendimento: Users,
  plantao: Clock,
};

const prioridadeConfig: Record<string, { color: string; label: string }> = {
  urgente: { color: "text-red-600 dark:text-red-400", label: "Urgente" },
  alta: { color: "text-amber-600 dark:text-amber-400", label: "Alta" },
  media: { color: "text-blue-600 dark:text-blue-400", label: "Média" },
  baixa: { color: "text-zinc-500 dark:text-zinc-400", label: "Baixa" },
};

export function DayEventsPopup({
  isOpen,
  date,
  eventos,
  position,
  onClose,
  onEventClick,
}: DayEventsPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isOpen || !popupRef.current) return;

    const popup = popupRef.current;
    const popupRect = popup.getBoundingClientRect();
    const padding = 16; // Espaço de segurança das bordas
    const popupWidth = 420; // Largura fixa do popup
    const popupHeight = Math.min(600, popupRect.height); // Altura máxima

    let x = position.x;
    let y = position.y;

    // Ajustar horizontalmente
    // Se não couber à direita, posiciona à esquerda
    if (x + popupWidth + padding > window.innerWidth) {
      x = Math.max(padding, window.innerWidth - popupWidth - padding);
    }
    
    // Garantir que não saia pela esquerda
    if (x < padding) {
      x = padding;
    }

    // Ajustar verticalmente
    // Se não couber abaixo, posiciona acima
    if (y + popupHeight + padding > window.innerHeight) {
      y = Math.max(padding, window.innerHeight - popupHeight - padding);
    }
    
    // Garantir que não saia por cima
    if (y < padding) {
      y = padding;
    }

    setAdjustedPosition({ x, y });
  }, [isOpen, position]);

  if (!isOpen) return null;

  const eventosOrdenados = [...eventos].sort((a, b) => {
    const timeA = a.horarioInicio || "00:00";
    const timeB = b.horarioInicio || "00:00";
    return timeA.localeCompare(timeB);
  });

  return (
    <>
      {/* Overlay para fechar ao clicar fora */}
      <div
        className="fixed inset-0 z-[99]"
        onClick={onClose}
      />

      {/* Popup */}
      <AnimatePresence>
        <motion.div
          ref={popupRef}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="fixed z-[100]"
          style={{
            left: `${adjustedPosition.x}px`,
            top: `${adjustedPosition.y}px`,
          }}
        >
          <Card className="w-[420px] max-h-[600px] overflow-hidden shadow-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between sticky top-0 z-10">
              <div>
                <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  {format(date, "EEEE", { locale: ptBR })}
                </p>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {format(date, "d 'de' MMMM", { locale: ptBR })}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[480px] overflow-y-auto">
              {eventosOrdenados.length === 0 ? (
                <div className="p-12 text-center">
                  <CalendarIcon className="w-14 h-14 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    Nenhum evento neste dia
                  </p>
                </div>
              ) : (
                <div className="p-3">
                  {eventosOrdenados.map((evento, index) => {
                    const atribuicaoColor = atribuicaoColors[evento.atribuicao] || atribuicaoColors["Criminal Geral"];
                    const AtribuicaoIcon = atribuicaoIcons[evento.atribuicao] || Folder;
                    const TipoIcon = tipoIcons[evento.tipo] || CalendarIcon;
                    const prioridadeInfo = prioridadeConfig[evento.prioridade] || prioridadeConfig.baixa;

                    return (
                      <motion.div
                        key={evento.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        onClick={() => {
                          onEventClick(evento);
                          onClose();
                        }}
                        className={`mb-2.5 rounded-xl border border-zinc-300/60 dark:border-zinc-700/60 hover:border-zinc-400/80 dark:hover:border-zinc-600/80 cursor-pointer transition-all ${atribuicaoColor.bg} group shadow-sm hover:shadow-md`}
                      >
                        <div className="p-4 relative">
                          {/* Header do Evento */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <span className={`text-sm font-bold ${atribuicaoColor.text}`}>
                                {evento.horarioInicio}
                              </span>
                              {evento.horarioFim && (
                                <>
                                  <span className="text-xs text-zinc-400">até</span>
                                  <span className={`text-sm font-bold ${atribuicaoColor.text}`}>
                                    {evento.horarioFim}
                                  </span>
                                </>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          </div>

                          {/* Título e Tipo */}
                          <div className="flex items-start gap-3 mb-3">
                            <TipoIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-tight mb-1.5 line-clamp-2">
                                {abreviarTitulo(evento.titulo)}
                              </h4>
                              {evento.assistido && (
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 flex-shrink-0" />
                                  {evento.assistido}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Info adicional */}
                          {(evento.local || evento.processo) && (
                            <div className="space-y-1.5 mb-3">
                              {evento.local && (
                                <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="truncate">{evento.local}</span>
                                </div>
                              )}
                              {evento.processo && (
                                <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="truncate font-mono text-xs">{evento.processo}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Footer - Atribuição e Prioridade */}
                          <div className="flex items-center justify-between pt-3 border-t border-zinc-200/50 dark:border-zinc-700/50">
                            <div className="flex items-center gap-2">
                              <AtribuicaoIcon className={`w-4 h-4 ${atribuicaoColor.icon}`} />
                              <span className={`text-xs font-semibold ${atribuicaoColor.text}`}>
                                {evento.atribuicao}
                              </span>
                            </div>
                            {evento.prioridade && evento.prioridade !== "baixa" && (
                              <Badge
                                variant="outline"
                                className={`text-xs px-2.5 py-0.5 h-6 border-0 font-semibold ${
                                  evento.prioridade === "urgente"
                                    ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                                    : evento.prioridade === "alta"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                                }`}
                              >
                                {evento.prioridade === "urgente" && <AlertTriangle className="w-3.5 h-3.5 mr-1" />}
                                {prioridadeInfo.label}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer com total */}
            {eventosOrdenados.length > 0 && (
              <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 sticky bottom-0">
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 text-center">
                  {eventosOrdenados.length} evento{eventosOrdenados.length !== 1 ? "s" : ""} neste dia
                </p>
              </div>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>
    </>
  );
}