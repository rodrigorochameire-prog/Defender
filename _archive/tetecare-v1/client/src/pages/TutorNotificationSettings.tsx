import TutorLayout from "@/components/TutorLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bell, ShieldAlert, Info } from "lucide-react";

const NOTIFICATION_TYPES = [
  { 
    value: "vaccine_reminder_7d", 
    label: "Lembrete de Vacina (7 dias antes)",
    description: "Receba um lembrete uma semana antes da vacina do seu pet vencer"
  },
  { 
    value: "vaccine_reminder_1d", 
    label: "Lembrete de Vacina (1 dia antes)",
    description: "Receba um lembrete um dia antes da vacina do seu pet vencer"
  },
  { 
    value: "medication_reminder", 
    label: "Lembrete de Medicamento",
    description: "Receba lembretes dos horários de medicação do seu pet"
  },
  { 
    value: "checkin_notification", 
    label: "Notificação de Check-in",
    description: "Seja notificado quando seu pet chegar na creche"
  },
  { 
    value: "checkout_notification", 
    label: "Notificação de Check-out",
    description: "Seja notificado quando seu pet sair da creche"
  },
  { 
    value: "daily_report", 
    label: "Relatório Diário",
    description: "Receba um resumo diário das atividades do seu pet na creche"
  },
  { 
    value: "credits_low", 
    label: "Créditos Baixos",
    description: "Seja alertado quando os créditos de creche estiverem acabando"
  },
  { 
    value: "event_reminder", 
    label: "Lembrete de Eventos",
    description: "Receba lembretes de eventos agendados para seu pet"
  },
];

export default function TutorNotificationSettings() {
  const { data: preferences, isLoading, refetch } = trpc.tutorPreferences.getMine.useQuery();
  const upsertMutation = trpc.tutorPreferences.upsert.useMutation();

  const handleToggle = async (notificationType: string, enabled: boolean) => {
    try {
      await upsertMutation.mutateAsync({
        notificationType: notificationType as any,
        enabled,
      });
      toast.success(enabled ? "Notificação ativada" : "Notificação desativada");
      refetch();
    } catch (error: any) {
      if (error.message.includes("bloqueada pelo administrador")) {
        toast.error("Esta notificação foi bloqueada pelo administrador e não pode ser alterada");
      } else {
        toast.error(error.message || "Erro ao atualizar preferência");
      }
    }
  };

  if (isLoading) {
    return (
      <TutorLayout>
        <div className="container max-w-4xl py-8 animate-fade-in">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Carregando configurações...</p>
          </div>
        </div>
      </TutorLayout>
    );
  }

  // Count enabled/disabled
  const enabledCount = NOTIFICATION_TYPES.filter((type) => {
    const pref = preferences?.find((p) => p.notificationType === type.value);
    return pref ? pref.enabled : true; // Default enabled
  }).length;

  const blockedCount = preferences?.filter((p) => p.adminOverride).length || 0;

  return (
    <TutorLayout>
      <div className="container max-w-4xl py-8 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Configurações de Notificações</h1>
          <p className="text-muted-foreground mt-2">
            Escolha quais notificações você deseja receber sobre seus pets
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Notificações Ativas</CardTitle>
              <Bell className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enabledCount}</div>
              <p className="text-xs text-muted-foreground">de {NOTIFICATION_TYPES.length} disponíveis</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Notificações Desativadas</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{NOTIFICATION_TYPES.length - enabledCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bloqueadas pelo Admin</CardTitle>
              <ShieldAlert className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{blockedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="mb-6 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Sobre as notificações
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  As notificações são enviadas automaticamente para mantê-lo informado sobre a saúde e bem-estar do seu pet. 
                  Você pode ativar ou desativar cada tipo de notificação conforme sua preferência.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Types */}
        <div className="space-y-4">
          {NOTIFICATION_TYPES.map((type) => {
            const pref = preferences?.find((p) => p.notificationType === type.value);
            const isEnabled = pref ? pref.enabled : true; // Default enabled if no preference
            const isBlocked = pref?.adminOverride || false;

            return (
              <Card key={type.value} className="hover-lift">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{type.label}</h3>
                        {isBlocked && (
                          <Badge variant="destructive" className="text-xs">
                            <ShieldAlert className="h-3 w-3 mr-1" />
                            Bloqueado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleToggle(type.value, checked)}
                      disabled={isBlocked || upsertMutation.isPending}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {blockedCount > 0 && (
          <Card className="mt-6 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <ShieldAlert className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    Notificações bloqueadas
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Algumas notificações foram bloqueadas pelo administrador e não podem ser alteradas. 
                    Entre em contato com a creche se tiver dúvidas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TutorLayout>
  );
}
