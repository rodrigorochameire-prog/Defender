import { useState } from "react";
import { Bell, X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useWebSocket, type Notification } from "@/hooks/useWebSocket";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

export function NotificationBell() {
  const { notifications, isConnected, removeNotification, clearNotifications } = useWebSocket();
  const [isOpen, setIsOpen] = useState(false);
  const previousCountRef = useRef(notifications.length);

  // Show toast for new notifications
  useEffect(() => {
    if (notifications.length > previousCountRef.current) {
      const latestNotification = notifications[0];
      
      // Play notification sound (optional)
      try {
        const audio = new Audio("/notification.mp3");
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Ignore if audio fails to play
        });
      } catch (error) {
        // Ignore audio errors
      }

      // Show toast
      toast(latestNotification.title, {
        description: latestNotification.message,
        duration: 5000,
      });
    }
    
    previousCountRef.current = notifications.length;
  }, [notifications]);

  const getNotificationIcon = (type: string) => {
    if (type.includes("approved") || type.includes("created")) {
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    } else if (type.includes("rejected") || type.includes("cancelled")) {
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    } else {
      return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const unreadCount = notifications.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
          {!isConnected && (
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">Notificações</h3>
            <p className="text-xs text-muted-foreground">
              {isConnected ? "Conectado" : "Desconectado"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearNotifications()}
              className="text-xs"
            >
              Limpar tudo
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification, index) => (
                <div
                  key={index}
                  className="p-4 hover:bg-accent transition-colors relative group"
                >
                  <button
                    onClick={() => removeNotification(index)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </button>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-1">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(notification.timestamp), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
