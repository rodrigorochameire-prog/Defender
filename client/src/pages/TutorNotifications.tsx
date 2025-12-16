import TutorLayout from "@/components/TutorLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function TutorNotifications() {
  const utils = trpc.useUtils();
  const { data: notifications, isLoading } = trpc.notifications.getUserNotifications.useQuery();
  
  const markAsRead = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getUserNotifications.invalidate();
      toast.success("Notificação marcada como lida");
    },
  });

  if (isLoading) {
    return (
      <TutorLayout>
        <div className="container max-w-7xl py-8 space-y-8 animate-fade-in">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando notificações...</p>
          </div>
        </div>
      </TutorLayout>
    );
  }

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  return (
    <TutorLayout>
      <div className="container max-w-7xl py-8 space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notificações</h1>
            <p className="text-muted-foreground mt-2">
              {unreadCount > 0 ? `Você tem ${unreadCount} notificação${unreadCount > 1 ? 'ões' : ''} não lida${unreadCount > 1 ? 's' : ''}` : 'Todas as notificações foram lidas'}
            </p>
          </div>
        </div>

        {!notifications || notifications.length === 0 ? (
          <Card>
            <CardContent className="empty-state">
              <BellOff className="empty-state-icon" />
              <p className="empty-state-title">Nenhuma notificação</p>
              <p className="empty-state-description">
                Você receberá notificações sobre seus pets aqui
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {notifications.map((notification: any) => (
              <Card key={notification.id} className={`hover-lift ${!notification.isRead ? 'border-l-4 border-l-primary' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${!notification.isRead ? 'bg-primary/10' : 'bg-muted'}`}>
                        <Bell className={`h-5 w-5 ${!notification.isRead ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base">{notification.title}</CardTitle>
                          {!notification.isRead && (
                            <Badge variant="default" className="bg-primary">Nova</Badge>
                          )}
                        </div>
                        <CardDescription className="text-sm">
                          {format(new Date(notification.createdAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead.mutate({ id: notification.id })}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TutorLayout>
  );
}
