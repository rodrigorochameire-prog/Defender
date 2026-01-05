"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dog, 
  Users, 
  CalendarCheck, 
  AlertCircle, 
  ArrowUpRight,
  Clock,
  LayoutDashboard,
  PawPrint,
  Calendar,
  Syringe,
  Pill,
  Shield,
  Sparkles,
  Activity
} from "lucide-react";
import Link from "next/link";
import { LoadingPage } from "@/components/shared/loading";
import { PageIcon } from "@/components/shared/page-icon";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminDashboard() {
  const { data: petsData, isLoading: loadingPets } = trpc.pets.list.useQuery();
  const { data: pendingPets } = trpc.pets.pending.useQuery();
  const { data: stats } = trpc.users.stats.useQuery();
  
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const { data: eventsData } = trpc.calendar.list.useQuery({
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  });

  if (loadingPets) {
    return <LoadingPage />;
  }

  const totalPets = petsData?.length || 0;
  const totalTutors = stats?.tutors || 0;
  const pendingCount = pendingPets?.length || 0;
  
  const todayEvents = eventsData?.filter((e) => {
    const eventDate = new Date(e.eventDate);
    return (
      eventDate.getDate() === now.getDate() &&
      eventDate.getMonth() === now.getMonth() &&
      eventDate.getFullYear() === now.getFullYear()
    );
  }) || [];

  const upcomingEvents = eventsData?.filter((e) => {
    const eventDate = new Date(e.eventDate);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return eventDate >= now && eventDate <= sevenDaysFromNow;
  }).slice(0, 5) || [];

  const recentPets = petsData?.slice(0, 4) || [];

  const eventTypeConfig: Record<string, { icon: React.ElementType; label: string }> = {
    vaccination: { icon: Syringe, label: "Vacinação" },
    medication: { icon: Pill, label: "Medicamento" },
    preventive: { icon: Shield, label: "Preventivo" },
    appointment: { icon: Calendar, label: "Consulta" },
    grooming: { icon: Sparkles, label: "Banho/Tosa" },
    other: { icon: Activity, label: "Outro" },
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <PageIcon icon={LayoutDashboard} size="md" />
          <div className="page-header-info">
            <h1 className="page-header-title">Dashboard</h1>
            <p className="page-header-subtitle">
              <Clock />
              {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button asChild variant="outline" size="sm" className="rounded-lg text-xs">
            <Link href="/admin/calendar" className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Calendário</span>
            </Link>
          </Button>
          <Button asChild size="sm" className="rounded-lg text-xs">
            <Link href="/admin/pets" className="flex items-center gap-1.5">
              <PawPrint className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ver Pets</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Dog />
          </div>
          <div className="stat-value">{totalPets}</div>
          <div className="stat-label">Pets cadastrados</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Users />
          </div>
          <div className="stat-value">{totalTutors}</div>
          <div className="stat-label">Tutores ativos</div>
        </div>

        <div className={`stat-card ${pendingCount > 0 ? 'highlight' : ''}`}>
          <div className="stat-icon">
            <AlertCircle />
          </div>
          <div className="stat-value">{pendingCount}</div>
          <div className="stat-label">Aguardando aprovação</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <CalendarCheck />
          </div>
          <div className="stat-value">{todayEvents.length}</div>
          <div className="stat-label">Eventos hoje</div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Próximos Eventos */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <div className="section-header mb-0">
              <div>
                <CardTitle className="section-title">
                  <Calendar />
                  Próximos Eventos
                </CardTitle>
                <CardDescription className="section-description">
                  Eventos dos próximos 7 dias
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs h-8">
                <Link href="/admin/calendar" className="flex items-center gap-1">
                  Ver todos
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {upcomingEvents.length === 0 ? (
              <div className="empty-state py-8">
                <div className="empty-state-icon">
                  <Calendar />
                </div>
                <div className="empty-state-title">Nenhum evento programado</div>
                <div className="empty-state-description">
                  Crie eventos para organizar as atividades dos pets
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {upcomingEvents.map((event) => {
                  const config = eventTypeConfig[event.eventType] || eventTypeConfig.other;
                  const Icon = config.icon;
                  return (
                    <div key={event.id} className="list-item">
                      <div className="list-item-icon">
                        <Icon />
                      </div>
                      <div className="list-item-content">
                        <div className="list-item-title">{event.title}</div>
                        <div className="list-item-subtitle">
                          {format(new Date(event.eventDate), "d MMM, HH:mm", { locale: ptBR })}
                          {event.pet?.name && ` • ${event.pet.name}`}
                        </div>
                      </div>
                      <span className="badge-neutral">{config.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pets Recentes */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <div className="section-header mb-0">
              <div>
                <CardTitle className="section-title">
                  <PawPrint />
                  Pets Recentes
                </CardTitle>
                <CardDescription className="section-description">
                  Últimos pets cadastrados
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs h-8">
                <Link href="/admin/pets" className="flex items-center gap-1">
                  Ver todos
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentPets.length === 0 ? (
              <div className="empty-state py-8">
                <div className="empty-state-icon">
                  <Dog />
                </div>
                <div className="empty-state-title">Nenhum pet cadastrado</div>
                <div className="empty-state-description">
                  Aguardando cadastro de novos pets
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {recentPets.map((pet) => (
                  <Link key={pet.id} href={`/admin/pets/${pet.id}`}>
                    <div className="list-item">
                      <div className="list-item-icon">
                        <Dog />
                      </div>
                      <div className="list-item-content">
                        <div className="list-item-title">{pet.name}</div>
                        <div className="list-item-subtitle">
                          {pet.breed || "Sem raça definida"}
                        </div>
                      </div>
                      <span className={
                        pet.approvalStatus === "approved" 
                          ? "badge-success" 
                          : pet.approvalStatus === "pending"
                          ? "badge-warning"
                          : "badge-neutral"
                      }>
                        {pet.approvalStatus === "approved" ? "Aprovado" : 
                         pet.approvalStatus === "pending" ? "Pendente" : "Rejeitado"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="section-title">
            <Sparkles />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button variant="outline" asChild className="h-auto py-3 rounded-lg justify-start">
              <Link href="/admin/calendar" className="flex flex-col items-start gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium">Novo Evento</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-3 rounded-lg justify-start">
              <Link href="/admin/health" className="flex flex-col items-start gap-1">
                <Syringe className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium">Registrar Vacina</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-3 rounded-lg justify-start">
              <Link href="/admin/documents" className="flex flex-col items-start gap-1">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium">Documentos</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-3 rounded-lg justify-start">
              <Link href="/admin/wall" className="flex flex-col items-start gap-1">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium">Publicar no Mural</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
