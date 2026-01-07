import { getSession } from "@/lib/auth/session";
import { db, pets, petTutors, notifications } from "@/lib/db";
import { eq, and, desc, count } from "drizzle-orm";
import { Dog, Bell, Calendar, CreditCard, Home, Plus, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Force dynamic rendering (não pre-renderizar no build)
export const dynamic = "force-dynamic";

async function getTutorStats(userId: number) {
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

  // Calcular total de créditos
  const totalCredits = myPets.reduce((sum, { pet }) => sum + pet.credits, 0);

  return {
    pets: myPets.map((r) => r.pet),
    unreadNotifications: unreadNotifications.count,
    totalCredits,
  };
}

export default async function TutorDashboard() {
  const session = await getSession();
  if (!session) return null;

  const stats = await getTutorStats(session.id);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <Home />
          </div>
          <div className="page-header-info">
            <h1>Olá, {session.name.split(" ")[0]}!</h1>
            <p>Bem-vindo ao seu painel</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button asChild size="sm" className="btn-sm btn-primary rounded-lg">
            <Link href="/tutor/pets/new" className="flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Adicionar Pet
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
          <div className="stat-card-value">{stats.pets.length}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Dias Disponíveis</span>
            <CreditCard className="stat-card-icon blue" />
          </div>
          <div className="stat-card-value">{stats.totalCredits}</div>
        </div>

        <div className={`stat-card ${stats.unreadNotifications > 0 ? "highlight" : ""}`}>
          <div className="stat-card-header">
            <span className="stat-card-title">Notificações</span>
            <Bell className={`stat-card-icon ${stats.unreadNotifications > 0 ? "amber" : "muted"}`} />
          </div>
          <div className="stat-card-value">{stats.unreadNotifications}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Próxima Reserva</span>
            <Calendar className="stat-card-icon blue" />
          </div>
          <div className="stat-card-value">-</div>
        </div>
      </div>

      {/* Meus Pets */}
      <div className="section-card">
        <div className="section-card-header">
          <div>
            <div className="section-card-title">
              <Dog />
              Meus Pets
            </div>
            <div className="section-card-subtitle">{stats.pets.length} pets cadastrados</div>
          </div>
          <Link href="/tutor/pets" className="link-primary">
            Ver todos
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="section-card-content">
          {stats.pets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Dog />
              </div>
              <div className="empty-state-title">Nenhum pet cadastrado</div>
              <div className="empty-state-description">
                Cadastre seu primeiro pet para começar
              </div>
              <Button asChild size="sm" className="mt-3">
                <Link href="/tutor/pets/new">Cadastrar Pet</Link>
              </Button>
            </div>
          ) : (
            <div className="list-container">
              {stats.pets.slice(0, 4).map((pet) => (
                <Link key={pet.id} href={`/tutor/pets/${pet.id}`}>
                  <div className="list-item">
                    <div className="list-item-icon orange">
                      <Dog />
                    </div>
                    <div className="list-item-content">
                      <div className="list-item-title">{pet.name}</div>
                      <div className="list-item-subtitle">
                        {pet.breed || "Sem raça definida"} • {pet.credits} créditos
                      </div>
                    </div>
                    <span className={`badge ${
                      pet.approvalStatus === "approved" 
                        ? "badge-success" 
                        : pet.approvalStatus === "pending"
                        ? "badge-warning"
                        : "badge-error"
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

      {/* Ações Rápidas */}
      <div className="section-card">
        <div className="section-card-header">
          <div className="section-card-title">
            Ações Rápidas
          </div>
        </div>
        <div className="section-card-content">
          <div className="action-grid">
            <Link href="/tutor/bookings" className="action-card">
              <div className="action-card-icon">
                <Calendar />
              </div>
              <span className="action-card-label">Fazer Reserva</span>
            </Link>
            <Link href="/tutor/credits" className="action-card">
              <div className="action-card-icon">
                <CreditCard />
              </div>
              <span className="action-card-label">Comprar Créditos</span>
            </Link>
            <Link href="/tutor/calendar" className="action-card">
              <div className="action-card-icon">
                <Calendar />
              </div>
              <span className="action-card-label">Calendário</span>
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
