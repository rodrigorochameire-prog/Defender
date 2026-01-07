import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Bell, Check, CheckCheck, Calendar, Pill, Syringe, DollarSign } from "lucide-react";
import { toast } from "sonner";

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  
  // Mock notifications - substituir por query real
  const notifications = [
    {
      id: 1,
      type: "vaccine",
      title: "Vacina Próxima",
      message: "Rex precisa tomar a vacina V10 em 3 dias",
      date: new Date(),
      read: false,
    },
    {
      id: 2,
      type: "medication",
      title: "Hora do Medicamento",
      message: "Lembre-se de dar o antipulgas para Bella",
      date: new Date(Date.now() - 3600000),
      read: false,
    },
    {
      id: 3,
      type: "credit",
      title: "Créditos Baixos",
      message: "Max está com apenas 2 créditos restantes",
      date: new Date(Date.now() - 7200000),
      read: true,
    },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "vaccine":
        return <Syringe className="h-4 w-4 text-orange-600" />;
      case "medication":
        return <Pill className="h-4 w-4 text-blue-600" />;
      case "credit":
        return <DollarSign className="h-4 w-4 text-green-600" />;
      default:
        return <Calendar className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return "agora mesmo";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m atrás`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
    return `${Math.floor(seconds / 86400)}d atrás`;
  };

  const handleMarkAsRead = (id: number) => {
    // Implementar marcação como lida
    toast.success("Notificação marcada como lida");
  };

  const handleMarkAllAsRead = () => {
    // Implementar marcação de todas como lidas
    toast.success("Todas as notificações foram marcadas como lidas");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificações</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Nenhuma notificação
              </p>
              <p className="text-xs text-muted-foreground">
                Você está em dia com tudo!
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-accent/50 transition-smooth cursor-pointer ${
                    !notification.read ? "bg-accent/20" : ""
                  }`}
                  onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="p-2 bg-muted rounded-full">
                        {getIcon(notification.type)}
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-none">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getTimeAgo(notification.date)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <Separator />
        
        <div className="p-2">
          <Button variant="ghost" className="w-full text-sm" size="sm">
            Ver todas as notificações
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
