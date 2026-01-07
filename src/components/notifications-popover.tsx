"use client";

import { useState } from "react";
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
  Dog,
  Calendar,
  FileText,
  MessageSquare,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: number;
  type: "pet" | "booking" | "document" | "message";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: 1,
    type: "pet",
    title: "Novo pet cadastrado",
    message: "Max (Golden Retriever) foi adicionado",
    time: "5 min",
    read: false,
  },
  {
    id: 2,
    type: "booking",
    title: "Nova reserva",
    message: "Luna - 15/01/2026",
    time: "1h",
    read: false,
  },
  {
    id: 3,
    type: "document",
    title: "Documento enviado",
    message: "Carteira de vacinação de Thor",
    time: "3h",
    read: true,
  },
  {
    id: 4,
    type: "message",
    title: "Nova mensagem",
    message: "Maria enviou sobre Bella",
    time: "Ontem",
    read: true,
  },
];

const typeIcons = {
  pet: Dog,
  booking: Calendar,
  document: FileText,
  message: MessageSquare,
};

const typeColors = {
  pet: "text-primary",
  booking: "text-blue-500",
  document: "text-green-500",
  message: "text-purple-500",
};

export function NotificationsPopover() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted relative"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">
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
              onClick={markAllAsRead}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[320px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação
              </p>
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type];
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors relative group",
                      !notification.read && "bg-primary/5"
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    {/* Indicator */}
                    {!notification.read && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                    )}

                    {/* Icon */}
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        "bg-muted"
                      )}
                    >
                      <Icon
                        className={cn("h-4 w-4", typeColors[notification.type])}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-[13px] truncate",
                          !notification.read
                            ? "font-semibold text-foreground"
                            : "font-medium text-foreground/80"
                        )}
                      >
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {notification.time}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
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
                          removeNotification(notification.id);
                        }}
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
                window.location.href = "/admin/notifications";
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

