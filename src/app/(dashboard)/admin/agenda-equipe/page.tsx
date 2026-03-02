"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  User,
  Scale,
  Briefcase,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays, startOfWeek, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";

// ============================================
// TIPOS
// ============================================

type VisaoAgenda = "dia" | "semana" | "lista";

interface EventoAgenda {
  id: number;
  tipo: "prazo" | "audiencia" | "cobertura" | "manual";
  titulo: string;
  hora?: string;
  membro: string;
  membroIniciais: string;
  processo?: string;
  vara?: string;
  cor: string;
}

// ============================================
// MOCK DATA (será substituído por tRPC)
// ============================================

const MOCK_MEMBROS = [
  { nome: "Rodrigo", iniciais: "RM" },
  { nome: "Maria", iniciais: "MS" },
  { nome: "Pedro", iniciais: "PA" },
];

const MOCK_EVENTOS: EventoAgenda[] = [
  { id: 1, tipo: "audiencia", titulo: "Audiencia Joao Silva", hora: "09:00", membro: "Rodrigo", membroIniciais: "RM", processo: "0500123-45.2024", vara: "Vara do Juri", cor: "emerald" },
  { id: 2, tipo: "prazo", titulo: "Resposta a Acusacao", hora: "14:00", membro: "Rodrigo", membroIniciais: "RM", processo: "0500456-78.2024", cor: "amber" },
  { id: 3, tipo: "prazo", titulo: "Alegacoes Finais", hora: "10:00", membro: "Maria", membroIniciais: "MS", processo: "0500789-01.2024", cor: "amber" },
  { id: 4, tipo: "audiencia", titulo: "Audiencia Vara VVD", hora: "14:00", membro: "Maria", membroIniciais: "MS", vara: "Vara VVD", cor: "emerald" },
  { id: 5, tipo: "cobertura", titulo: "Ferias ate 03/03", membro: "Pedro", membroIniciais: "PA", cor: "sky" },
];

// ============================================
// COMPONENTES
// ============================================

function EventoCard({ evento }: { evento: EventoAgenda }) {
  const colorMap: Record<string, string> = {
    emerald: "border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10",
    amber: "border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10",
    sky: "border-l-sky-500 bg-sky-50/50 dark:bg-sky-900/10",
    violet: "border-l-violet-500 bg-violet-50/50 dark:bg-violet-900/10",
  };

  return (
    <div className={cn(
      "p-2.5 rounded-lg border-l-2 text-left transition-all duration-200",
      colorMap[evento.cor] || "border-l-zinc-300",
      "bg-white dark:bg-zinc-900/50 hover:shadow-sm"
    )}>
      {evento.hora && (
        <span className="text-[10px] font-semibold text-zinc-400 uppercase">{evento.hora}</span>
      )}
      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mt-0.5 line-clamp-2">{evento.titulo}</p>
      {evento.processo && (
        <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">{evento.processo}</p>
      )}
      {evento.vara && (
        <p className="text-[10px] text-zinc-400 mt-0.5">{evento.vara}</p>
      )}
    </div>
  );
}

function MembroColuna({ nome, iniciais, eventos }: { nome: string; iniciais: string; eventos: EventoAgenda[] }) {
  return (
    <div className="flex-1 min-w-[200px]">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
            {iniciais}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{nome}</span>
      </div>
      <div className="space-y-2">
        {eventos.length === 0 ? (
          <div className="p-4 text-center rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-dashed border-zinc-200 dark:border-zinc-700">
            <p className="text-[10px] text-zinc-400">Sem eventos</p>
          </div>
        ) : (
          eventos.map(ev => <EventoCard key={ev.id} evento={ev} />)
        )}
      </div>
    </div>
  );
}

// ============================================
// PAGE
// ============================================

export default function AgendaEquipePage() {
  const [visao, setVisao] = useState<VisaoAgenda>("dia");
  const [dataAtual, setDataAtual] = useState(new Date());

  const eventosPorMembro = useMemo(() => {
    const map: Record<string, EventoAgenda[]> = {};
    MOCK_MEMBROS.forEach(m => { map[m.nome] = []; });
    MOCK_EVENTOS.forEach(ev => {
      if (map[ev.membro]) map[ev.membro].push(ev);
    });
    return map;
  }, []);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <CalendarDays className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight font-serif">Agenda da Equipe</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {format(dataAtual, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Visão toggle */}
            <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
              {(["dia", "semana", "lista"] as VisaoAgenda[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setVisao(v)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all cursor-pointer",
                    visao === v
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>

            <Button
              size="sm"
              className="h-8 px-3 bg-zinc-900 hover:bg-emerald-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-emerald-500 text-white text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Evento
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {/* Navegação de data */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setDataAtual(prev => addDays(prev, -1))}
            className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDataAtual(new Date())}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
              isToday(dataAtual)
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-emerald-200"
            )}
          >
            Hoje
          </button>
          <button
            onClick={() => setDataAtual(prev => addDays(prev, 1))}
            className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Visão Dia - Colunas por membro */}
        {visao === "dia" && (
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4">
            <div className="flex gap-4 overflow-x-auto">
              {MOCK_MEMBROS.map(membro => (
                <MembroColuna
                  key={membro.nome}
                  nome={membro.nome}
                  iniciais={membro.iniciais}
                  eventos={eventosPorMembro[membro.nome] || []}
                />
              ))}
            </div>
          </Card>
        )}

        {/* Visão Lista */}
        {visao === "lista" && (
          <div className="space-y-2">
            {MOCK_EVENTOS.map(ev => (
              <Card key={ev.id} className="bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3 flex items-center gap-3 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all">
                <div className="flex items-center gap-2 min-w-[120px]">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{ev.membroIniciais}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-zinc-500">{ev.membro}</span>
                </div>
                {ev.hora && (
                  <span className="text-[10px] font-mono text-zinc-400 min-w-[40px]">{ev.hora}</span>
                )}
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex-1">{ev.titulo}</p>
                <Badge variant="outline" className="text-[9px] h-5">
                  {ev.tipo}
                </Badge>
              </Card>
            ))}
          </div>
        )}

        {/* Visão Semana - placeholder */}
        {visao === "semana" && (
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-8 text-center">
            <CalendarDays className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Visao semanal em desenvolvimento</p>
            <p className="text-xs text-zinc-400 mt-1">Grid 7 dias x N membros</p>
          </Card>
        )}
      </div>
    </div>
  );
}
