"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  RefreshCw,
  ExternalLink,
  Check,
  X,
  Clock,
  AlertTriangle,
  Gavel,
  Briefcase,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: "prazo" | "audiencia" | "juri" | "atendimento";
  synced: boolean;
  googleEventId?: string;
}

interface GoogleCalendarSyncProps {
  calendarId?: string;
  isConnected?: boolean;
  lastSync?: Date;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSync?: () => void;
  className?: string;
}

const eventTypeConfig = {
  prazo: { icon: Clock, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  audiencia: { icon: Briefcase, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  juri: { icon: Gavel, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  atendimento: { icon: Calendar, color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
};

export function GoogleCalendarSync({
  calendarId,
  isConnected = false,
  lastSync,
  onConnect,
  onDisconnect,
  onSync,
  className = "",
}: GoogleCalendarSyncProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncSettings, setSyncSettings] = useState({
    prazos: true,
    audiencias: true,
    juris: true,
    atendimentos: false,
  });

  // Mock pending events for demo
  const mockPendingEvents: CalendarEvent[] = [
    {
      id: "1",
      title: "Prazo: Alegações Finais - José Silva",
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      type: "prazo",
      synced: true,
      googleEventId: "abc123",
    },
    {
      id: "2",
      title: "Audiência de Instrução - Maria Santos",
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      type: "audiencia",
      synced: true,
      googleEventId: "def456",
    },
    {
      id: "3",
      title: "Júri - Pedro Costa",
      date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      type: "juri",
      synced: false,
    },
  ];

  async function handleSync() {
    setSyncing(true);
    try {
      // TODO: Implement actual sync with Google Calendar API
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onSync?.();
    } finally {
      setSyncing(false);
    }
  }

  function formatLastSync(date?: Date) {
    if (!date) return "Nunca sincronizado";
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Agora mesmo";
    if (minutes < 60) return `Há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Há ${hours}h`;
    return date.toLocaleDateString("pt-BR");
  }

  if (!isConnected) {
    return (
      <Card className={`border-dashed ${className}`}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Google Calendar</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            Conecte sua conta Google para sincronizar prazos, audiências e sessões do júri automaticamente.
          </p>
          <Button onClick={onConnect} className="gap-2">
            <Calendar className="h-4 w-4" />
            Conectar Google Calendar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Google Calendar</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatLastSync(lastSync)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-xs gap-1">
              <Check className="h-3 w-3" />
              Conectado
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSync}
              disabled={syncing}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sync Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Sincronização Automática</h4>
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-600" />
                <Label htmlFor="sync-prazos" className="text-sm">Prazos</Label>
              </div>
              <Switch
                id="sync-prazos"
                checked={syncSettings.prazos}
                onCheckedChange={(checked) => setSyncSettings((s) => ({ ...s, prazos: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600" />
                <Label htmlFor="sync-audiencias" className="text-sm">Audiências</Label>
              </div>
              <Switch
                id="sync-audiencias"
                checked={syncSettings.audiencias}
                onCheckedChange={(checked) => setSyncSettings((s) => ({ ...s, audiencias: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gavel className="h-4 w-4 text-purple-600" />
                <Label htmlFor="sync-juris" className="text-sm">Sessões do Júri</Label>
              </div>
              <Switch
                id="sync-juris"
                checked={syncSettings.juris}
                onCheckedChange={(checked) => setSyncSettings((s) => ({ ...s, juris: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-600" />
                <Label htmlFor="sync-atendimentos" className="text-sm">Atendimentos</Label>
              </div>
              <Switch
                id="sync-atendimentos"
                checked={syncSettings.atendimentos}
                onCheckedChange={(checked) => setSyncSettings((s) => ({ ...s, atendimentos: checked }))}
              />
            </div>
          </div>
        </div>

        {/* Recent Events */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Próximos Eventos Sincronizados</h4>
          <div className="space-y-2">
            {mockPendingEvents.slice(0, 3).map((event) => {
              const config = eventTypeConfig[event.type];
              const Icon = config.icon;
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bgColor}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.date.toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                  </div>
                  {event.synced ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => window.open("https://calendar.google.com", "_blank")}
          >
            <ExternalLink className="h-4 w-4" />
            Abrir Calendar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onDisconnect}
          >
            Desconectar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
