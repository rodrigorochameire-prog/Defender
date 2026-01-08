"use client";

import { trpc } from "@/lib/trpc/client";
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
  FileText,
  MessageSquare,
  Plus
} from "lucide-react";
import Link from "next/link";
import { DashboardSkeleton } from "@/components/shared/skeletons";
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
    return <DashboardSkeleton />;
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
    other: { icon: Calendar, label: "Evento" },
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <LayoutDashboard />
          </div>
          <div className="page-header-info">
            <h1>Dashboard</h1>
            <p>{format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button asChild variant="outline" size="sm" className="btn-sm btn-outline">
            <Link href="/admin/calendar">
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Calendário
            </Link>
          </Button>
          <Button asChild size="sm" className="btn-sm btn-primary">
            <Link href="/admin/pets">
              <PawPrint className="h-3.5 w-3.5 mr-1.5" />
              Ver Pets
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Pets Cadastrados</span>
            <Dog className="stat-card-icon primary" />
          </div>
          <div className="stat-card-value">{totalPets}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Tutores Ativos</span>
            <Users className="stat-card-icon blue" />
          </div>
          <div className="stat-card-value">{totalTutors}</div>
        </div>

        <div className={`stat-card ${pendingCount > 0 ? 'highlight' : ''}`}>
          <div className="stat-card-header">
            <span className="stat-card-title">Aguardando Aprovação</span>
            <AlertCircle className={`stat-card-icon ${pendingCount > 0 ? 'amber' : 'muted'}`} />
          </div>
          <div className="stat-card-value">{pendingCount}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Eventos Hoje</span>
            <CalendarCheck className="stat-card-icon blue" />
          </div>
          <div className="stat-card-value">{todayEvents.length}</div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="content-grid">
        {/* Próximos Eventos */}
        <div className="section-card">
          <div className="section-card-header">
            <div>
              <div className="section-card-title">
                <Calendar />
                Próximos Eventos
              </div>
              <div className="section-card-subtitle">Próximos 7 dias</div>
            </div>
            <Link href="/admin/calendar" className="section-card-action">
              Ver todos
              <ArrowUpRight />
            </Link>
          </div>
          <div className="section-card-content">
            {upcomingEvents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Calendar />
                </div>
                <div className="empty-state-title">Nenhum evento</div>
                <div className="empty-state-description">
                  Nenhum evento agendado para os próximos dias
                </div>
              </div>
            ) : (
              <div className="list-container">
                {upcomingEvents.map((event) => {
                  const config = eventTypeConfig[event.eventType] || eventTypeConfig.other;
                  const Icon = config.icon;
                  return (
                    <div key={event.id} className="list-item">
                      <div className="list-item-icon primary">
                        <Icon />
                      </div>
                      <div className="list-item-content">
                        <div className="list-item-title">{event.title}</div>
                        <div className="list-item-subtitle">
                          {format(new Date(event.eventDate), "d MMM, HH:mm", { locale: ptBR })}
                          {event.pet?.name && ` • ${event.pet.name}`}
                        </div>
                      </div>
                      <span className="badge badge-primary">{config.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Pets Recentes */}
        <div className="section-card">
          <div className="section-card-header">
            <div>
              <div className="section-card-title">
                <PawPrint />
                Pets Recentes
              </div>
              <div className="section-card-subtitle">Últimos cadastrados</div>
            </div>
            <Link href="/admin/pets" className="section-card-action">
              Ver todos
              <ArrowUpRight />
            </Link>
          </div>
          <div className="section-card-content">
            {recentPets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Dog />
                </div>
                <div className="empty-state-title">Nenhum pet</div>
                <div className="empty-state-description">
                  Aguardando cadastro de pets
                </div>
              </div>
            ) : (
              <div className="list-container">
                {recentPets.map((pet) => (
                  <Link key={pet.id} href={`/admin/pets/${pet.id}`}>
                    <div className="list-item">
                      <div className="list-item-icon primary">
                        <Dog />
                      </div>
                      <div className="list-item-content">
                        <div className="list-item-title">{pet.name}</div>
                        <div className="list-item-subtitle">
                          {pet.breed || "Sem raça definida"}
                        </div>
                      </div>
                      <span className={`badge ${
                        pet.approvalStatus === "approved" 
                          ? "badge-success" 
                          : pet.approvalStatus === "pending"
                          ? "badge-warning"
                          : "badge-default"
                      }`}>
                        {pet.approvalStatus === "approved" ? "Aprovado" : 
                         pet.approvalStatus === "pending" ? "Pendente" : "Rejeitado"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="section-card">
        <div className="section-card-header">
          <div className="section-card-title">
            <Plus />
            Ações Rápidas
          </div>
        </div>
        <div className="section-card-content">
          <div className="action-grid">
            <Link href="/admin/calendar" className="action-card">
              <div className="action-card-icon">
                <Calendar />
              </div>
              <span className="action-card-label">Novo Evento</span>
            </Link>
            <Link href="/admin/health" className="action-card">
              <div className="action-card-icon">
                <Syringe />
              </div>
              <span className="action-card-label">Registrar Vacina</span>
            </Link>
            <Link href="/admin/documents" className="action-card">
              <div className="action-card-icon">
                <FileText />
              </div>
              <span className="action-card-label">Documentos</span>
            </Link>
            <Link href="/admin/wall" className="action-card">
              <div className="action-card-icon">
                <MessageSquare />
              </div>
              <span className="action-card-label">Publicar</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
