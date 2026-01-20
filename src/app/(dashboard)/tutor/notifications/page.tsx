"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  BellOff,
  Check,
  CheckCheck,
  Calendar,
  FileText,
  MessageSquare,
  Heart,
  Sparkles
} from "lucide-react";
import { useState } from "react";

const mockNotifications = [
  {
    id: 1,
    type: "health",
    title: "Lembrete de vacina",
    message: "A vacina V10 do Max está próxima do vencimento",
    time: "Há 2 horas",
    read: false,
    icon: Heart,
    color: "text-rose-500 bg-rose-500/10",
  },
  {
    id: 2,
    type: "booking",
    title: "Reserva confirmada",
    message: "Sua reserva para o dia 20/01 foi confirmada",
    time: "Há 5 horas",
    read: false,
    icon: Calendar,
    color: "text-blue-500 bg-blue-500/10",
  },
  {
    id: 3,
    type: "document",
    title: "Novo relatório disponível",
    message: "Relatório de comportamento do Max está pronto",
    time: "Ontem",
    read: true,
    icon: FileText,
    color: "text-green-500 bg-green-500/10",
  },
  {
    id: 4,
    type: "message",
    title: "Mensagem da creche",
    message: "A equipe TeteCare enviou uma atualização",
    time: "2 dias atrás",
    read: true,
    icon: MessageSquare,
    color: "text-purple-500 bg-purple-500/10",
  },
];

export default function TutorNotificationsPage() {
  const [notifications, setNotifications] = useState(mockNotifications);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bell className="h-8 w-8 text-cyan-500" />
            Notificações
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadCount} novas
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            Atualizações sobre seus pets
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead} className="gap-2">
            <CheckCheck className="h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <Sparkles className="h-5 w-5 text-cyan-500" />
            </div>
            <div>
              <CardTitle>Atividades Recentes</CardTitle>
              <CardDescription>
                Novidades sobre seus pets e reservas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <BellOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const Icon = notification.icon;
                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                      !notification.read 
                        ? "bg-cyan-500/5 border-cyan-500/20" 
                        : "bg-muted/30 border-transparent hover:border-border"
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className={`p-2 rounded-lg ${notification.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{notification.title}</p>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-2">
                        {notification.time}
                      </p>
                    </div>
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
