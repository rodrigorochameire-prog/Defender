"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  BellOff,
  Check,
  CheckCheck,
  Dog,
  Calendar,
  FileText,
  MessageSquare,
  AlertCircle,
  Info,
  Sparkles
} from "lucide-react";
import { useState } from "react";

const mockNotifications = [
  {
    id: 1,
    type: "pet",
    title: "Novo pet cadastrado",
    message: "O tutor João cadastrou um novo pet: Max (Golden Retriever)",
    time: "Há 5 minutos",
    read: false,
    icon: Dog,
    color: "text-orange-500 bg-orange-500/10",
  },
  {
    id: 2,
    type: "booking",
    title: "Nova reserva",
    message: "Reserva confirmada para Luna - 15/01/2026",
    time: "Há 1 hora",
    read: false,
    icon: Calendar,
    color: "text-blue-500 bg-blue-500/10",
  },
  {
    id: 3,
    type: "document",
    title: "Documento enviado",
    message: "Carteira de vacinação de Thor foi atualizada",
    time: "Há 3 horas",
    read: true,
    icon: FileText,
    color: "text-green-500 bg-green-500/10",
  },
  {
    id: 4,
    type: "message",
    title: "Nova mensagem",
    message: "Maria enviou uma mensagem sobre o pet Bella",
    time: "Ontem",
    read: true,
    icon: MessageSquare,
    color: "text-purple-500 bg-purple-500/10",
  },
];

export default function AdminNotificationsPage() {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            Notificações
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadCount} novas
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe todas as atualizações do sistema
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead} className="gap-2">
            <CheckCheck className="h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{notifications.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Total</p>
              </div>
              <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                <Bell className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-red-500">{unreadCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Não lidas</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-green-500">
                  {notifications.filter(n => n.read).length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Lidas</p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                <Check className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-blue-500">Hoje</p>
                <p className="text-xs text-muted-foreground mt-1">Última atividade</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <Info className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Atividades Recentes</CardTitle>
              <CardDescription>
                Suas notificações dos últimos dias
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
                        ? "bg-primary/5 border-primary/20" 
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
                          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
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
