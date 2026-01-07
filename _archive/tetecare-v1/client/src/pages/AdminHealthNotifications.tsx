import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, Calendar, Pill, Syringe, Shield, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminHealthNotifications() {
  const [daysAhead, setDaysAhead] = useState("7");
  
  // Queries
  const { data: reminders, refetch, isLoading } = trpc.healthNotifications.getUpcomingReminders.useQuery({
    daysAhead: parseInt(daysAhead),
  });

  // Mutations
  const sendNotification = trpc.healthNotifications.sendHealthReminders.useMutation({
    onSuccess: (data) => {
      if (data.sent) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao enviar notificação");
    },
  });

  const handleSendNotification = () => {
    if (reminders && reminders.total === 0) {
      toast.info("Nenhum item próximo do vencimento para notificar");
      return;
    }
    
    if (confirm(`Enviar notificação com ${reminders?.total || 0} lembretes de saúde?`)) {
      sendNotification.mutate({ daysAhead: parseInt(daysAhead) });
    }
  };

  return (
    <AdminLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Notificações de Saúde</h1>
            <p className="text-muted-foreground mt-2">
              Configure e envie lembretes automáticos de vacinas, medicamentos e preventivos
            </p>
          </div>
          <Bell className="h-12 w-12 text-primary" />
        </div>

        <div className="grid gap-6">
          {/* Control Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Painel de Controle</CardTitle>
              <CardDescription>
                Configure o período de antecedência e envie notificações manualmente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">
                    Período de Antecedência
                  </label>
                  <Select value={daysAhead} onValueChange={setDaysAhead}>
                    <SelectTrigger className="w-full">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 dias</SelectItem>
                      <SelectItem value="7">7 dias (recomendado)</SelectItem>
                      <SelectItem value="14">14 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleSendNotification}
                    disabled={sendNotification.isPending || isLoading}
                    size="lg"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Notificação Agora
                  </Button>
                </div>
              </div>

              {reminders && reminders.total > 0 && (
                <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-900 dark:text-orange-100">
                        {reminders.total} {reminders.total === 1 ? "item próximo" : "itens próximos"} do vencimento
                      </p>
                      <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                        Clique no botão acima para enviar uma notificação ao responsável
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {reminders && reminders.total === 0 && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">
                        Tudo em dia!
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Nenhum item próximo do vencimento nos próximos {daysAhead} dias
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics - Compacto */}
          {reminders && reminders.total > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Resumo de Alertas</CardTitle>
                    <CardDescription>Próximos {daysAhead} dias</CardDescription>
                  </div>
                  <Badge variant="default" className="text-lg px-3 py-1">
                    {reminders.total} total
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <Syringe className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-xl font-bold">{reminders.vaccinations.length}</p>
                      <p className="text-xs text-muted-foreground">Vacinas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <Pill className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-xl font-bold">{reminders.medications.length}</p>
                      <p className="text-xs text-muted-foreground">Medicamentos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <Shield className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-xl font-bold">{reminders.fleaTreatments.length}</p>
                      <p className="text-xs text-muted-foreground">Antipulgas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <Shield className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-xl font-bold">{reminders.dewormingTreatments.length}</p>
                      <p className="text-xs text-muted-foreground">Vermífugos</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed List */}
          {reminders && reminders.total > 0 && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Vaccinations */}
              {reminders.vaccinations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Syringe className="h-5 w-5" />
                      Vacinas Próximas
                    </CardTitle>
                    <CardDescription>
                      {reminders.vaccinations.length} {reminders.vaccinations.length === 1 ? "vacina" : "vacinas"} nos próximos {daysAhead} dias
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {reminders.vaccinations.map((v: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{v.petName}</p>
                            <p className="text-sm text-muted-foreground">{v.vaccineName}</p>
                          </div>
                          <Badge variant="outline">
                            {new Date(v.nextDueDate).toLocaleDateString('pt-BR')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Medications */}
              {reminders.medications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Pill className="h-5 w-5" />
                      Medicamentos Terminando
                    </CardTitle>
                    <CardDescription>
                      {reminders.medications.length} {reminders.medications.length === 1 ? "medicamento" : "medicamentos"} terminando
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {reminders.medications.map((m: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{m.petName}</p>
                            <p className="text-sm text-muted-foreground">{m.medicationName}</p>
                          </div>
                          <Badge variant="outline">
                            {new Date(m.endDate).toLocaleDateString('pt-BR')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Flea Treatments */}
              {reminders.fleaTreatments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Antipulgas Próximos
                    </CardTitle>
                    <CardDescription>
                      {reminders.fleaTreatments.length} {reminders.fleaTreatments.length === 1 ? "aplicação" : "aplicações"} próximas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {reminders.fleaTreatments.map((f: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{f.petName}</p>
                            <p className="text-sm text-muted-foreground">{f.productName}</p>
                          </div>
                          <Badge variant="outline">
                            {new Date(f.nextDueDate).toLocaleDateString('pt-BR')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Deworming */}
              {reminders.dewormingTreatments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Vermífugos Próximos
                    </CardTitle>
                    <CardDescription>
                      {reminders.dewormingTreatments.length} {reminders.dewormingTreatments.length === 1 ? "aplicação" : "aplicações"} próximas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {reminders.dewormingTreatments.map((d: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{d.petName}</p>
                            <p className="text-sm text-muted-foreground">{d.productName}</p>
                          </div>
                          <Badge variant="outline">
                            {new Date(d.nextDueDate).toLocaleDateString('pt-BR')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Documentation */}
          <Card>
            <CardHeader>
              <CardTitle>Como Configurar Notificações Automáticas</CardTitle>
              <CardDescription>
                Agende verificações diárias para enviar notificações automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  Para configurar notificações automáticas diárias, você pode usar ferramentas de agendamento como <strong>cron</strong> (Linux/Mac) ou <strong>Task Scheduler</strong> (Windows), ou serviços de monitoramento como <strong>UptimeRobot</strong> ou <strong>Cronitor</strong>.
                </p>
                
                <h4 className="font-semibold mt-4 mb-2">Exemplo com cURL:</h4>
                <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-xs">
{`curl -X POST https://seu-dominio.com/api/trpc/healthNotifications.sendHealthReminders \\
  -H "Content-Type: application/json" \\
  -H "Cookie: auth_token=SEU_TOKEN" \\
  -d '{"daysAhead": 7}'`}
                </pre>

                <h4 className="font-semibold mt-4 mb-2">Exemplo com cron (executar diariamente às 9h):</h4>
                <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-xs">
{`0 9 * * * curl -X POST https://seu-dominio.com/api/trpc/healthNotifications.sendHealthReminders ...`}
                </pre>

                <p className="mt-4">
                  <strong>Nota:</strong> Por enquanto, use o botão "Enviar Notificação Agora" acima para testar e enviar notificações manualmente.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
