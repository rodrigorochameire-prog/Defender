"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Share2,
  ArrowRight,
  CalendarDays,
  Gavel,
  AlertCircle,
  Scale,
  Eye,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { format, isToday, isTomorrow, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EventosCompartilhadosProps {
  profissionalId: number;
  supervisorId?: number;
  supervisorNome?: string;
  limite?: number;
  showHeader?: boolean;
}

export function EventosCompartilhados({
  profissionalId,
  supervisorId,
  supervisorNome = "Defensor",
  limite = 5,
  showHeader = true,
}: EventosCompartilhadosProps) {
  // Buscar compartilhamentos recebidos
  const { data: compartilhamentos = [], isLoading: loadingCompartilhamentos } = 
    trpc.profissionais.getCompartilhamentos.useQuery({
      profissionalId,
    });

  // Buscar eventos do calendário
  const { data: eventos = [], isLoading: loadingEventos } = 
    trpc.calendar.list.useQuery({
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // próximos 30 dias
    });

  // Filtrar eventos compartilhados
  const eventosCompartilhados = useMemo(() => {
    const idsCompartilhados = compartilhamentos
      .filter((c: any) => c.entidadeTipo === "audiencia" || c.entidadeTipo === "evento")
      .map((c: any) => c.entidadeId);

    return eventos
      .filter((e: any) => idsCompartilhados.includes(e.id))
      .sort((a: any, b: any) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
      .slice(0, limite);
  }, [eventos, compartilhamentos, limite]);

  const isLoading = loadingCompartilhamentos || loadingEventos;

  // Função para determinar cor e ícone por tipo de evento
  const getEventoStyle = (eventType: string) => {
    switch (eventType) {
      case "audiencia":
        return {
          icon: CalendarDays,
          bgClass: "bg-blue-100 dark:bg-blue-900/30",
          iconClass: "text-blue-600",
          badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        };
      case "juri":
        return {
          icon: Gavel,
          bgClass: "bg-violet-100 dark:bg-violet-900/30",
          iconClass: "text-violet-600",
          badgeClass: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
        };
      case "prazo":
        return {
          icon: AlertCircle,
          bgClass: "bg-amber-100 dark:bg-amber-900/30",
          iconClass: "text-amber-600",
          badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        };
      default:
        return {
          icon: Calendar,
          bgClass: "bg-zinc-100 dark:bg-zinc-800",
          iconClass: "text-zinc-600",
          badgeClass: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
        };
    }
  };

  // Função para formatar data relativa
  const formatDataRelativa = (data: Date) => {
    if (isToday(data)) return { texto: "Hoje", classe: "bg-rose-100 text-rose-600" };
    if (isTomorrow(data)) return { texto: "Amanhã", classe: "bg-amber-100 text-amber-600" };
    const dias = differenceInDays(data, new Date());
    if (dias <= 7) return { texto: format(data, "EEEE", { locale: ptBR }), classe: "bg-blue-100 text-blue-600" };
    return { texto: format(data, "dd/MM", { locale: ptBR }), classe: "bg-zinc-100 text-zinc-600" };
  };

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden">
        {showHeader && (
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <Skeleton className="h-5 w-48" />
          </div>
        )}
        <div className="p-4 space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden">
      {showHeader && (
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                Agenda de {supervisorNome}
              </h3>
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px]">
                <Share2 className="w-3 h-3 mr-1" />
                Compartilhada
              </Badge>
            </div>
            <Link href="/admin/agenda">
              <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-500 hover:text-blue-600">
                Ver tudo <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
        {eventosCompartilhados.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-14 h-14 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Nenhum evento compartilhado
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Eventos compartilhados por {supervisorNome} aparecerão aqui
            </p>
          </div>
        ) : (
          eventosCompartilhados.map((evento: any) => {
            const eventDate = new Date(evento.eventDate);
            const style = getEventoStyle(evento.eventType);
            const dataInfo = formatDataRelativa(eventDate);
            const Icon = style.icon;

            return (
              <Link key={evento.id} href={`/admin/agenda?evento=${evento.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-blue-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all cursor-pointer group">
                  {/* Ícone do tipo */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bgClass}`}>
                    <Icon className={`w-5 h-5 ${style.iconClass}`} />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      {evento.title}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(eventDate, "HH:mm")}
                      </span>
                      {evento.location && (
                        <span className="flex items-center gap-1 truncate max-w-[120px]">
                          <MapPin className="w-3 h-3" />
                          {evento.location}
                        </span>
                      )}
                    </div>
                    
                    {/* Tags */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Badge variant="secondary" className={`text-[9px] ${style.badgeClass}`}>
                        {evento.eventType}
                      </Badge>
                      {evento.assistido && (
                        <Badge variant="outline" className="text-[9px]">
                          <User className="w-2.5 h-2.5 mr-0.5" />
                          {evento.assistido.nome?.split(" ")[0]}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Data */}
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded capitalize ${dataInfo.classe}`}>
                      {dataInfo.texto}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {format(eventDate, "dd/MM")}
                    </span>
                  </div>

                  {/* Hover action */}
                  <Eye className="w-4 h-4 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </Card>
  );
}

export default EventosCompartilhados;
