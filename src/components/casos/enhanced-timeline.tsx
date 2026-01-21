"use client";

import { cn } from "@/lib/utils";
import { FileText, Gavel, AlertCircle, CheckCircle2, Clock, Calendar, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface TimelineEvent {
  id: string;
  date: Date;
  title: string;
  description: string;
  processo: string; // Ex: "Execução Penal" ou Número do Processo
  assistido: string; // Nome do assistido
  processoTipo?: "juri" | "execucao" | "criminal" | "civel"; // Tipo para cor
  status: "completed" | "pending" | "alert";
}

const processoColors = {
  juri: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  execucao: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
  criminal: "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800",
  civel: "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800",
};

/**
 * EnhancedTimeline - Timeline Contextualizada
 * 
 * Mostra claramente qual processo e assistido cada evento pertence,
 * resolvendo a confusão quando há múltiplos processos tramitando em paralelo.
 */
export function EnhancedTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="w-12 h-12 text-stone-300 dark:text-zinc-700 mb-3" />
        <p className="text-sm text-stone-500 dark:text-zinc-400">
          Nenhum evento registrado ainda
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-stone-200 dark:before:via-zinc-800 before:to-transparent">
      {events.map((event, index) => (
        <div 
          key={event.id} 
          className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
        >
          
          {/* Ícone Central */}
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-zinc-950 shadow shrink-0 z-10",
            "md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2",
            event.status === 'alert' ? "bg-red-100 dark:bg-red-950" : 
            event.status === 'completed' ? "bg-emerald-100 dark:bg-emerald-950" :
            "bg-stone-100 dark:bg-zinc-900"
          )}>
            {event.status === 'alert' ? <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400"/> : 
             event.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400"/> :
             <Gavel className="w-5 h-5 text-stone-500 dark:text-zinc-400"/>}
          </div>

          {/* Cartão do Evento */}
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-zinc-900 p-4 rounded-xl border border-stone-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200">
            
            {/* Contexto Superior (Processo + Assistido) - O DIFERENCIAL */}
            <div className="flex flex-wrap gap-2 mb-3 pb-2 border-b border-stone-100 dark:border-zinc-800">
              {/* Tag do Processo */}
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wide",
                  processoColors[event.processoTipo || "criminal"]
                )}
              >
                <FileText className="w-3 h-3 mr-1" /> 
                {event.processo}
              </Badge>
              
              {/* Tag do Assistido */}
              <Badge 
                variant="outline" 
                className="text-[10px] font-medium bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 border-stone-200 dark:border-zinc-700"
              >
                <User className="w-3 h-3 mr-1" />
                {event.assistido}
              </Badge>
            </div>

            {/* Conteúdo Principal */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-serif font-semibold text-stone-800 dark:text-stone-200 text-base leading-tight">
                {event.title}
              </h3>
              <time className="font-mono text-xs text-stone-400 dark:text-zinc-500 flex-shrink-0 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(event.date, "dd/MM/yyyy", { locale: ptBR })}
              </time>
            </div>
            
            <p className="text-sm text-stone-600 dark:text-zinc-400 leading-relaxed">
              {event.description}
            </p>

            {/* Footer com horário */}
            <div className="mt-3 pt-2 border-t border-stone-100 dark:border-zinc-800">
              <span className="text-xs text-stone-400 dark:text-zinc-500 font-mono">
                {format(event.date, "HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * TimelineGroup - Agrupa eventos por mês
 */
export function TimelineGroup({ title, events }: { title: string; events: TimelineEvent[] }) {
  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-stone-200 dark:bg-zinc-800" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
          {title}
        </h3>
        <div className="h-px flex-1 bg-stone-200 dark:bg-zinc-800" />
      </div>
      <EnhancedTimeline events={events} />
    </div>
  );
}
