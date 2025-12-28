"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { LoadingPage } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: events, isLoading } = trpc.calendar.currentMonth.useQuery({
    month: currentDate.getMonth(),
    year: currentDate.getFullYear(),
  });

  const { data: todayEvents } = trpc.calendar.today.useQuery();

  // Gerar dias do mês
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Ajustar para começar na segunda-feira
  const startDay = monthStart.getDay();
  const prefixDays = startDay === 0 ? 6 : startDay - 1;

  // Obter eventos de um dia específico
  const getEventsForDay = (day: Date) => {
    return events?.filter((e) => isSameDay(new Date(e.eventDate), day)) || [];
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário"
        description="Gerencie eventos e agendamentos"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Grid de dias */}
            <div className="grid grid-cols-7 gap-1">
              {/* Dias em branco antes do mês */}
              {Array.from({ length: prefixDays }).map((_, i) => (
                <div key={`prefix-${i}`} className="h-24 p-1" />
              ))}

              {/* Dias do mês */}
              {days.map((day) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentDay = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "h-24 p-1 border rounded-lg overflow-hidden hover:bg-gray-50 cursor-pointer",
                      isCurrentDay && "bg-primary/5 border-primary"
                    )}
                  >
                    <div
                      className={cn(
                        "text-sm font-medium mb-1",
                        isCurrentDay && "text-primary"
                      )}
                    >
                      {format(day, "d")}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className="text-xs px-1 py-0.5 rounded truncate"
                          style={{ backgroundColor: event.color || "#3b82f6", color: "white" }}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground px-1">
                          +{dayEvents.length - 3} mais
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Eventos de Hoje */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!todayEvents || todayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum evento para hoje
              </p>
            ) : (
              <div className="space-y-3">
                {todayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 border rounded-lg"
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-3 h-3 rounded-full mt-1"
                        style={{ backgroundColor: event.color || "#3b82f6" }}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{event.title}</p>
                        {event.pet && (
                          <p className="text-xs text-muted-foreground">
                            {event.pet.species === "cat" ? "🐱" : "🐶"} {event.pet.name}
                          </p>
                        )}
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {event.typeInfo.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
