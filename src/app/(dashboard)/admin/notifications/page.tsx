"use client";

import { useState } from "react";
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
} from "lucide-react";

const mockNotifications = [
  {
    id: 1,
    type: "pet",
    title: "Novo pet cadastrado",
    message: "O tutor João cadastrou um novo pet: Max (Golden Retriever)",
    time: "Há 5 minutos",
    read: false,
    icon: Dog,
  },
  {
    id: 2,
    type: "booking",
    title: "Nova reserva",
    message: "Reserva confirmada para Luna - 15/01/2026",
    time: "Há 1 hora",
    read: false,
    icon: Calendar,
  },
  {
    id: 3,
    type: "document",
    title: "Documento enviado",
    message: "Carteira de vacinação de Thor foi atualizada",
    time: "Há 3 horas",
    read: true,
    icon: FileText,
  },
  {
    id: 4,
    type: "message",
    title: "Nova mensagem",
    message: "Maria enviou uma mensagem sobre o pet Bella",
    time: "Ontem",
    read: true,
    icon: MessageSquare,
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
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <Bell />
          </div>
          <div className="page-header-info">
            <h1 className="flex items-center gap-2">
              Notificações
              {unreadCount > 0 && (
                <Badge className="badge-rose">{unreadCount} novas</Badge>
              )}
            </h1>
            <p>Acompanhe as atualizações do sistema</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <div className="page-header-actions">
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              Marcar todas como lidas
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid grid-cols-4">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="title">Total</span>
            <Bell className="icon text-primary" />
          </div>
          <div className="stat-card-value">{notifications.length}</div>
        </div>

        <div className={`stat-card ${unreadCount > 0 ? "alert" : ""}`}>
          <div className="stat-card-header">
            <span className="title">Não lidas</span>
            <AlertCircle className={`icon ${unreadCount > 0 ? "text-rose-500" : "text-muted-foreground"}`} />
          </div>
          <div className="stat-card-value">{unreadCount}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="title">Lidas</span>
            <Check className="icon text-green-500" />
          </div>
          <div className="stat-card-value">{notifications.filter(n => n.read).length}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="title">Última</span>
            <Calendar className="icon text-blue-500" />
          </div>
          <div className="stat-card-value text-xl">Hoje</div>
        </div>
      </div>

      {/* Notifications List */}
      <Card className="section-card">
        <CardHeader className="section-card-header">
          <CardTitle className="section-card-title">
            <Bell className="icon" />
            Atividades Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="section-card-content">
          {notifications.length === 0 ? (
            <div className="empty-state">
              <BellOff className="empty-state-icon" />
              <p className="empty-state-text">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => {
                const Icon = notification.icon;
                return (
                  <div
                    key={notification.id}
                    className={`list-item border rounded-xl p-4 cursor-pointer transition-all ${
                      !notification.read 
                        ? "bg-primary/5 border-primary/20 hover:border-primary/40" 
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{notification.title}</p>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1.5">
                        {notification.time}
                      </p>
                    </div>
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0"
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
