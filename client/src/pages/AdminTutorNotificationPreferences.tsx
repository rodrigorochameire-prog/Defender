import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Users, Search, ShieldAlert, Check, X } from "lucide-react";

const NOTIFICATION_TYPES = [
  { value: "vaccine_reminder_7d", label: "Lembrete de Vacina (7 dias)" },
  { value: "vaccine_reminder_1d", label: "Lembrete de Vacina (1 dia)" },
  { value: "medication_reminder", label: "Lembrete de Medicamento" },
  { value: "checkin_notification", label: "Notificação de Check-in" },
  { value: "checkout_notification", label: "Notificação de Check-out" },
  { value: "daily_report", label: "Relatório Diário" },
  { value: "credits_low", label: "Créditos Baixos" },
  { value: "event_reminder", label: "Lembrete de Evento" },
];

export default function AdminTutorNotificationPreferences() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTutor, setSelectedTutor] = useState<number | null>(null);

  const { data: allPreferences, isLoading, refetch } = trpc.tutorPreferences.getAll.useQuery();
  const adminOverrideMutation = trpc.tutorPreferences.adminOverride.useMutation();

  const handleAdminOverride = async (tutorId: number, notificationType: string, override: boolean) => {
    try {
      await adminOverrideMutation.mutateAsync({
        tutorId,
        notificationType: notificationType as any,
        adminOverride: override,
      });
      toast.success(override ? "Notificação bloqueada para este tutor" : "Bloqueio removido");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar preferência");
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container max-w-7xl py-8 animate-fade-in">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Carregando preferências...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Group preferences by tutor
  const tutorGroups = allPreferences?.reduce((acc, pref) => {
    const key = pref.tutorId;
    if (!acc[key]) {
      acc[key] = {
        tutorId: pref.tutorId,
        tutorName: pref.tutorName || "Sem nome",
        tutorEmail: pref.tutorEmail || "",
        preferences: [],
      };
    }
    acc[key].preferences.push(pref);
    return acc;
  }, {} as Record<number, any>);

  const tutors = Object.values(tutorGroups || {});

  // Filter tutors by search term
  const filteredTutors = tutors.filter((tutor) =>
    tutor.tutorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tutor.tutorEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const totalTutors = tutors.length;
  const tutorsWithOverrides = tutors.filter((t) =>
    t.preferences.some((p: any) => p.adminOverride)
  ).length;
  const totalPreferences = allPreferences?.length || 0;

  return (
    <AdminLayout>
      <div className="container max-w-7xl py-8 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Preferências de Notificações por Tutor</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie quais notificações cada tutor pode receber
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Tutores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTutors}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Com Bloqueios Admin</CardTitle>
              <ShieldAlert className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tutorsWithOverrides}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Preferências</CardTitle>
              <Check className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPreferences}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tutor por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tutors List */}
        <div className="space-y-6">
          {filteredTutors.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  {searchTerm ? "Nenhum tutor encontrado com este termo de busca." : "Nenhum tutor com preferências cadastradas."}
                </p>
              </CardContent>
            </Card>
          )}

          {filteredTutors.map((tutor) => (
            <Card key={tutor.tutorId} className="hover-lift">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{tutor.tutorName}</CardTitle>
                    <CardDescription>{tutor.tutorEmail}</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTutor(selectedTutor === tutor.tutorId ? null : tutor.tutorId)}
                  >
                    {selectedTutor === tutor.tutorId ? "Ocultar" : "Gerenciar"}
                  </Button>
                </div>
              </CardHeader>
              {selectedTutor === tutor.tutorId && (
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm font-medium mb-4">Configurações de Notificações:</p>
                    <div className="grid grid-cols-1 gap-4">
                      {NOTIFICATION_TYPES.map((type) => {
                        const pref = tutor.preferences.find((p: any) => p.notificationType === type.value);
                        const isEnabled = pref ? pref.enabled : true; // Default enabled if no preference
                        const isOverridden = pref?.adminOverride || false;

                        return (
                          <div
                            key={type.value}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="font-medium">{type.label}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={isEnabled ? "default" : "secondary"}>
                                  {isEnabled ? "Habilitado" : "Desabilitado"}
                                </Badge>
                                {isOverridden && (
                                  <Badge variant="destructive">
                                    <ShieldAlert className="h-3 w-3 mr-1" />
                                    Bloqueado pelo Admin
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Bloquear:</span>
                                <Switch
                                  checked={isOverridden}
                                  onCheckedChange={(checked) =>
                                    handleAdminOverride(tutor.tutorId, type.value, checked)
                                  }
                                  disabled={adminOverrideMutation.isPending}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
