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
  Loader2,
  Gavel,
  Clock,
  CalendarX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import { format, addDays, isSameDay, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";

// ============================================
// TIPOS
// ============================================

type VisaoAgenda = "dia" | "lista";

interface EventoUnificado {
  id: string;
  tipo: "audiencia" | "prazo";
  titulo: string;
  hora?: string;
  data: Date;
  membroId: number | null;
  processo?: string;
  assistido?: string;
  cor: string;
}

// ============================================
// COMPONENTES
// ============================================

function EventoCard({ evento }: { evento: EventoUnificado }) {
  const colorMap: Record<string, string> = {
    emerald: "border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10",
    amber: "border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10",
    rose: "border-l-rose-500 bg-rose-50/50 dark:bg-rose-900/10",
  };
  const iconMap: Record<string, typeof Gavel> = {
    audiencia: Gavel,
    prazo: Clock,
  };
  const Icon = iconMap[evento.tipo] || Clock;

  return (
    <div className={cn(
      "p-2.5 rounded-lg border-l-2 text-left transition-all duration-200",
      colorMap[evento.cor] || "border-l-neutral-300",
      "bg-white dark:bg-card/50 hover:shadow-sm"
    )}>
      <div className="flex items-center gap-1.5">
        <Icon className="w-3 h-3 text-muted-foreground" />
        {evento.hora && (
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">{evento.hora}</span>
        )}
        <Badge variant="outline" className="text-[9px] h-4 px-1">
          {evento.tipo === "audiencia" ? "Audiencia" : "Prazo"}
        </Badge>
      </div>
      <p className="text-xs font-medium text-foreground/80 mt-1 line-clamp-2">{evento.titulo}</p>
      {evento.processo && (
        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">{evento.processo}</p>
      )}
      {evento.assistido && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{evento.assistido}</p>
      )}
    </div>
  );
}

function MembroColuna({ nome, iniciais, eventos }: { nome: string; iniciais: string; eventos: EventoUnificado[] }) {
  return (
    <div className="flex-1 min-w-[200px]">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-[10px] bg-neutral-100 dark:bg-muted text-muted-foreground font-medium">
            {iniciais}
          </AvatarFallback>
        </Avatar>
        <div>
          <span className="text-sm font-medium text-foreground/80">{nome}</span>
          <span className="text-[10px] text-muted-foreground ml-1.5">{eventos.length} evento{eventos.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
      <div className="space-y-2">
        {eventos.length === 0 ? (
          <div className="p-4 text-center rounded-lg bg-neutral-50 dark:bg-muted/50 border border-dashed border-neutral-200 dark:border-border">
            <p className="text-[10px] text-muted-foreground">Sem eventos</p>
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

  // Queries
  const { data: audiencias, isLoading: loadingAud } = trpc.audiencias.proximas.useQuery({ dias: 30, limite: 100 });
  const { data: prazos, isLoading: loadingPrazos } = trpc.demandas.prazosUrgentes.useQuery({ dias: 30 });
  const { data: membros, isLoading: loadingMembros } = trpc.users.list.useQuery();

  const isLoading = loadingAud || loadingPrazos || loadingMembros;

  // Unify events
  const todosEventos = useMemo(() => {
    const eventos: EventoUnificado[] = [];

    // Audiencias
    (audiencias ?? []).forEach((aud) => {
      const d = new Date(aud.dataHora);
      eventos.push({
        id: `aud-${aud.id}`,
        tipo: "audiencia",
        titulo: aud.titulo || aud.assistido?.nome || `Audiencia ${aud.tipo || ""}`,
        hora: format(d, "HH:mm"),
        data: d,
        membroId: aud.responsavelId,
        processo: aud.processo?.numero || undefined,
        assistido: aud.assistido?.nome || undefined,
        cor: "emerald",
      });
    });

    // Prazos
    (prazos ?? []).forEach((p) => {
      const d = p.prazo ? parseISO(p.prazo) : new Date();
      eventos.push({
        id: `prazo-${p.id}`,
        tipo: "prazo",
        titulo: p.ato || "Prazo",
        data: d,
        membroId: p.defensorId,
        processo: p.processo?.numeroAutos || undefined,
        assistido: p.assistido?.nome || undefined,
        cor: p.reuPreso ? "rose" : "amber",
      });
    });

    return eventos.sort((a, b) => a.data.getTime() - b.data.getTime());
  }, [audiencias, prazos]);

  // Filter events for the selected date
  const eventosDia = useMemo(() => {
    return todosEventos.filter(ev => isSameDay(ev.data, dataAtual));
  }, [todosEventos, dataAtual]);

  // Events grouped by member for "dia" view
  const membrosAtivos = useMemo(() => {
    const lista = (membros ?? []).map(m => ({
      id: m.id,
      nome: m.name || m.email || "?",
      iniciais: getInitials(m.name || m.email || "?"),
    }));
    return lista;
  }, [membros]);

  const eventosPorMembro = useMemo(() => {
    const map: Record<number, EventoUnificado[]> = {};
    membrosAtivos.forEach(m => { map[m.id] = []; });
    eventosDia.forEach(ev => {
      if (ev.membroId && map[ev.membroId]) {
        map[ev.membroId].push(ev);
      }
    });
    return map;
  }, [eventosDia, membrosAtivos]);

  // Members that have events on the selected day (show only active)
  const membrosComEventos = useMemo(() => {
    return membrosAtivos.filter(m => (eventosPorMembro[m.id] || []).length > 0);
  }, [membrosAtivos, eventosPorMembro]);

  // For list view: all upcoming events
  const eventosLista = useMemo(() => {
    return todosEventos.slice(0, 30);
  }, [todosEventos]);

  return (
    <div className="min-h-screen bg-muted dark:bg-[#0f0f11]">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-card border-b border-neutral-200 dark:border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-foreground dark:bg-white flex items-center justify-center shadow-lg">
              <CalendarDays className="w-5 h-5 text-background dark:text-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight font-serif">Agenda da Equipe</h1>
              <p className="text-xs text-muted-foreground">
                {format(dataAtual, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-neutral-100 dark:bg-muted rounded-lg p-0.5">
              {(["dia", "lista"] as VisaoAgenda[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setVisao(v)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all cursor-pointer",
                    visao === v
                      ? "bg-white dark:bg-muted text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {/* Navegação de data */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setDataAtual(prev => addDays(prev, -1))}
            className="p-1.5 rounded-lg bg-white dark:bg-card border border-neutral-200 dark:border-border text-muted-foreground hover:text-foreground hover:border-emerald-200 dark:hover:border-emerald-800 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDataAtual(new Date())}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
              isToday(dataAtual)
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                : "bg-white dark:bg-card border border-neutral-200 dark:border-border text-muted-foreground hover:border-emerald-200"
            )}
          >
            Hoje
          </button>
          <button
            onClick={() => setDataAtual(prev => addDays(prev, 1))}
            className="p-1.5 rounded-lg bg-white dark:bg-card border border-neutral-200 dark:border-border text-muted-foreground hover:text-foreground hover:border-emerald-200 dark:hover:border-emerald-800 transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {/* Stats ribbon */}
          <div className="ml-auto flex items-center gap-4 text-[10px] text-muted-foreground">
            <span><Gavel className="w-3 h-3 inline mr-1" />{(audiencias ?? []).length} audiencias</span>
            <span><Clock className="w-3 h-3 inline mr-1" />{(prazos ?? []).length} prazos</span>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Visão Dia - Colunas por membro */}
        {!isLoading && visao === "dia" && (
          <Card className="bg-white dark:bg-card border-neutral-200/80 dark:border-border/80 rounded-xl p-4">
            {membrosComEventos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarX className="w-10 h-10 text-neutral-300 dark:text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum evento para {isToday(dataAtual) ? "hoje" : format(dataAtual, "dd/MM")}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Navegue para outro dia ou mude para a visao Lista</p>
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto">
                {membrosComEventos.map(membro => (
                  <MembroColuna
                    key={membro.id}
                    nome={membro.nome}
                    iniciais={membro.iniciais}
                    eventos={eventosPorMembro[membro.id] || []}
                  />
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Visão Lista */}
        {!isLoading && visao === "lista" && (
          <div className="space-y-2">
            {eventosLista.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CalendarX className="w-10 h-10 text-neutral-300 dark:text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum evento proximo</p>
              </div>
            ) : (
              eventosLista.map(ev => {
                const membro = membrosAtivos.find(m => m.id === ev.membroId);
                return (
                  <Card key={ev.id} className="bg-white dark:bg-card border-neutral-200/80 dark:border-border/80 rounded-xl p-3 flex items-center gap-3 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[9px] bg-neutral-100 dark:bg-muted text-muted-foreground">
                          {membro?.iniciais || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-muted-foreground truncate">{membro?.nome || "—"}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground min-w-[60px]">
                      {format(ev.data, "dd/MM")}
                      {ev.hora && ` ${ev.hora}`}
                    </span>
                    <p className="text-sm font-medium text-foreground/80 flex-1 truncate">{ev.titulo}</p>
                    <Badge variant="outline" className="text-[9px] h-5 flex-shrink-0">
                      {ev.tipo === "audiencia" ? "Audiencia" : "Prazo"}
                    </Badge>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
