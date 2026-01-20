import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db, pets, petTutors, notifications, calendarEvents, users } from "@/lib/db";
import { eq, and, desc, count, gte, lte } from "drizzle-orm";
import { Dog, Bell, Calendar, CreditCard, Home, Plus, ArrowUpRight, Heart, Clock, Syringe, Pill, Shield } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export const dynamic = "force-dynamic";

async function getTutorData(userId: number) {
  // Buscar pets do tutor
  const myPets = await db
    .select({ pet: pets })
    .from(pets)
    .innerJoin(petTutors, eq(pets.id, petTutors.petId))
    .where(eq(petTutors.tutorId, userId))
    .orderBy(desc(pets.createdAt));

  // Contar notificações não lidas
  const [unreadNotifications] = await db
    .select({ count: count() })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );

  // Buscar eventos dos próximos 7 dias
  const now = new Date();
  const in7Days = addDays(now, 7);
  
  const upcomingEvents = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        gte(calendarEvents.eventDate, startOfDay(now)),
        lte(calendarEvents.eventDate, endOfDay(in7Days))
      )
    )
    .orderBy(calendarEvents.eventDate)
    .limit(5);

  // Calcular total de créditos
  const totalCredits = myPets.reduce((sum, { pet }) => sum + pet.credits, 0);

  return {
    pets: myPets.map((r) => r.pet),
    unreadNotifications: unreadNotifications.count,
    totalCredits,
    upcomingEvents,
  };
}

const eventTypeConfig: Record<string, { icon: typeof Calendar; color: string; label: string }> = {
  vaccination: { icon: Syringe, color: "text-blue-500", label: "Vacina" },
  medication: { icon: Pill, color: "text-violet-500", label: "Medicamento" },
  medical: { icon: Heart, color: "text-rose-500", label: "Consulta" },
  preventive: { icon: Shield, color: "text-cyan-500", label: "Preventivo" },
  general: { icon: Calendar, color: "text-slate-500", label: "Evento" },
};

export default async function TutorDashboard() {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    redirect("/sign-in");
  }

  // Buscar usuário no banco de dados
  const dbUser = await db.query.users.findFirst({
    where: eq(users.email, clerkUser.emailAddresses[0]?.emailAddress || ""),
  });

  if (!dbUser) {
    redirect("/sign-in");
  }

  const data = await getTutorData(dbUser.id);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <Home />
          </div>
          <div className="page-header-info">
            <h1>Olá, {dbUser.name.split(" ")[0]}!</h1>
            <p>Bem-vindo ao seu painel</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button asChild size="sm" className="btn-sm btn-primary">
            <Link href="/tutor/pets/new">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Novo Pet
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Meus Pets</span>
            <Dog className="stat-card-icon primary" />
          </div>
          <div className="stat-card-value">{data.pets.length}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Dias Disponíveis</span>
            <CreditCard className="stat-card-icon blue" />
          </div>
          <div className="stat-card-value">{data.totalCredits}</div>
        </div>

        <div className={`stat-card ${data.unreadNotifications > 0 ? "highlight" : ""}`}>
          <div className="stat-card-header">
            <span className="stat-card-title">Notificações</span>
            <Bell className={`stat-card-icon ${data.unreadNotifications > 0 ? "amber" : "muted"}`} />
          </div>
          <div className="stat-card-value">{data.unreadNotifications}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Próx. Eventos</span>
            <Calendar className="stat-card-icon blue" />
          </div>
          <div className="stat-card-value">{data.upcomingEvents.length}</div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Meus Pets */}
        <div className="section-card">
          <div className="section-card-header">
            <div>
              <div className="section-card-title">
                <Dog />
                Meus Pets
              </div>
              <div className="section-card-subtitle">{data.pets.length} pets cadastrados</div>
            </div>
            <Link href="/tutor/pets" className="section-card-action">
              Ver todos
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="section-card-content">
            {data.pets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Dog /></div>
                <div className="empty-state-title">Nenhum pet cadastrado</div>
                <div className="empty-state-description">
                  Cadastre seu primeiro pet para começar
                </div>
                <Button asChild size="sm" className="mt-4">
                  <Link href="/tutor/pets/new">Cadastrar Pet</Link>
                </Button>
              </div>
            ) : (
              <div className="list-container">
                {data.pets.slice(0, 4).map((pet) => (
                  <Link key={pet.id} href={`/tutor/pets/${pet.id}`}>
                    <div className="list-item">
                      <div className="list-item-icon primary">
                        <Dog />
                      </div>
                      <div className="list-item-content">
                        <div className="list-item-title">{pet.name}</div>
                        <div className="list-item-subtitle">
                          {pet.breed || "Sem raça definida"} • {pet.credits} dias
                        </div>
                      </div>
                      <Badge className={
                        pet.approvalStatus === "approved" ? "badge-green" :
                        pet.approvalStatus === "pending" ? "badge-amber" : "badge-rose"
                      }>
                        {pet.approvalStatus === "approved" ? "Aprovado" : 
                         pet.approvalStatus === "pending" ? "Pendente" : "Rejeitado"}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Próximos Eventos (7 dias) */}
        <div className="section-card">
          <div className="section-card-header">
            <div>
              <div className="section-card-title">
                <Calendar />
                Próximos 7 Dias
              </div>
              <div className="section-card-subtitle">Eventos e lembretes</div>
            </div>
            <Link href="/tutor/calendar" className="section-card-action">
              Ver calendário
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="section-card-content">
            {data.upcomingEvents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Calendar /></div>
                <div className="empty-state-title">Nenhum evento próximo</div>
                <div className="empty-state-description">
                  Você não tem eventos nos próximos 7 dias
                </div>
              </div>
            ) : (
              <div className="list-container">
                {data.upcomingEvents.map((event) => {
                  const config = eventTypeConfig[event.eventType] || eventTypeConfig.general;
                  const Icon = config.icon;
                  return (
                    <Link key={event.id} href="/tutor/calendar">
                      <div className="list-item">
                        <div className="list-item-icon primary">
                          <Icon />
                        </div>
                        <div className="list-item-content">
                          <div className="list-item-title">{event.title}</div>
                          <div className="list-item-subtitle">
                            {format(new Date(event.eventDate), "EEEE, d 'de' MMM", { locale: ptBR })}
                          </div>
                        </div>
                        <Badge className="badge-blue">{config.label}</Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="section-card">
        <div className="section-card-header">
          <div className="section-card-title">Ações Rápidas</div>
        </div>
        <div className="section-card-content">
          <div className="action-grid">
            <Link href="/tutor/calendar" className="action-card">
              <div className="action-card-icon">
                <Calendar />
              </div>
              <span className="action-card-label">Calendário</span>
            </Link>
            <Link href="/tutor/health" className="action-card">
              <div className="action-card-icon">
                <Heart />
              </div>
              <span className="action-card-label">Saúde</span>
            </Link>
            <Link href="/tutor/pets" className="action-card">
              <div className="action-card-icon">
                <Dog />
              </div>
              <span className="action-card-label">Meus Pets</span>
            </Link>
            <Link href="/tutor/pets/new" className="action-card">
              <div className="action-card-icon">
                <Plus />
              </div>
              <span className="action-card-label">Novo Pet</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
