"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  Check,
  CheckCheck,
  Calendar,
  FileText,
  MessageSquare,
  X,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Users,
  Scale,
  Loader2,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useRouter } from "next/navigation";

const typeIcons: Record<string, React.ElementType> = {
  prazo: AlertTriangle,
  prazo_alerta: AlertTriangle,
  audiencia: Calendar,
  audiencia_lembrete: Calendar,
  juri: Scale,
  juri_aviso: Scale,
  movimentacao: FileText,
  atendimento_agendado: Users,
  visita_carceraria: Users,
  aviso_geral: Info,
  documento: FileText,
  mensagem: MessageSquare,
  usuario: Users,
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: AlertCircle,
  radar_match: Radio,
  radar_confirmado: Radio,
};

const typeColors: Record<string, string> = {
  prazo: "text-amber-500 bg-amber-500/10",
  prazo_alerta: "text-amber-500 bg-amber-500/10",
  audiencia: "text-emerald-500 bg-emerald-500/10",
  audiencia_lembrete: "text-emerald-500 bg-emerald-500/10",
  juri: "text-purple-500 bg-purple-500/10",
  juri_aviso: "text-purple-500 bg-purple-500/10",
  movimentacao: "text-neutral-500 bg-neutral-500/10",
  atendimento_agendado: "text-teal-500 bg-teal-500/10",
  visita_carceraria: "text-emerald-500 bg-emerald-500/10",
  aviso_geral: "text-neutral-500 bg-neutral-500/10",
  documento: "text-emerald-500 bg-emerald-500/10",
  mensagem: "text-neutral-500 bg-neutral-500/10",
  usuario: "text-neutral-500 bg-neutral-500/10",
  info: "text-emerald-500 bg-emerald-500/10",
  warning: "text-amber-500 bg-amber-500/10",
  success: "text-emerald-500 bg-emerald-500/10",
  error: "text-red-500 bg-red-500/10",
  radar_match: "text-cyan-500 bg-cyan-500/10",
  radar_confirmado: "text-emerald-500 bg-emerald-500/10",
};

export function NotificationsPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const utils = trpc.useUtils();

  // Buscar notificações reais
  const { data: notifications = [], isLoading } = trpc.notifications.list.useQuery(
    { limit: 20 },
    { 
      enabled: isOpen,
      refetchInterval: isOpen ? 30000 : false, // Atualiza a cada 30s quando aberto
    }
  );

  // Buscar contagem de não lidas (sempre atualizado)
  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 60000, // Atualiza a cada 1 minuto
  });

  // Mutations
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const deleteMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate({ id: notification.id });
    }
    if (notification.actionUrl) {
      setIsOpen(false);
      router.push(notification.actionUrl);
    }
  };

  const formatTime = (date: Date | string) => {
    try {
      return formatDistanceToNow(new Date(date), { 
        addSuffix: true, 
        locale: ptBR 
      });
    } catch {
      return "";
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full bg-muted hover:bg-muted/80 border border-border hover:border-emerald-500/50 relative transition-all duration-200"
        >
          <Bell className="h-3.5 w-3.5 text-foreground/80" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center shadow-sm animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notificações</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Notificações</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              {markAllAsReadMutation.isPending ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <CheckCheck className="h-3 w-3 mr-1" />
              )}
              Marcar todas
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[320px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Loader2 className="h-6 w-6 text-muted-foreground/40 mb-2 animate-spin" />
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Você está em dia! 🎉
              </p>
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type] || Info;
                const colorClass = typeColors[notification.type] || typeColors.info;
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors relative group",
                      !notification.isRead && "bg-primary/5"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* Indicator */}
                    {!notification.isRead && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                    )}

                    {/* Icon */}
                    <div
                      className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0",
                        colorClass
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm line-clamp-1",
                          !notification.isRead
                            ? "font-semibold text-foreground"
                            : "font-medium text-foreground/80"
                        )}
                      >
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsReadMutation.mutate({ id: notification.id });
                          }}
                          disabled={markAsReadMutation.isPending}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate({ id: notification.id });
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2.5">
            <Button
              variant="ghost"
              className="w-full h-8 text-xs font-medium text-primary hover:text-primary"
              onClick={() => {
                setIsOpen(false);
                router.push("/admin/notifications");
              }}
            >
              Ver todas as notificações
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
