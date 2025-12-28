import { getSession } from "@/lib/auth/session";
import { db, pets, petTutors, notifications } from "@/lib/db";
import { eq, and, desc, count } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dog, Bell, Calendar, CreditCard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Olá, {session.name.split(" ")[0]}! 👋
        </h1>
        <p className="text-gray-500">Bem-vindo ao seu painel</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meus Pets</CardTitle>
            <Dog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pets.length}</div>
            <p className="text-xs text-muted-foreground">pets cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Créditos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.totalCredits}
            </div>
            <p className="text-xs text-muted-foreground">dias disponíveis</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notificações</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.unreadNotifications}
            </div>
            <p className="text-xs text-muted-foreground">não lidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próxima Reserva</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-gray-500">-</div>
            <p className="text-xs text-muted-foreground">nenhuma agendada</p>
          </CardContent>
        </Card>
      </div>

      {/* My Pets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Meus Pets</CardTitle>
          <Button size="sm" asChild>
            <Link href="/tutor/pets/new">Adicionar Pet</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {stats.pets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Dog className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Você ainda não tem pets cadastrados</p>
              <Button className="mt-4" asChild>
                <Link href="/tutor/pets/new">Cadastrar meu primeiro pet</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.pets.map((pet) => (
                <Link
                  key={pet.id}
                  href={`/tutor/pets/${pet.id}`}
                  className="block p-4 border rounded-lg hover:border-primary hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-xl">
                        {pet.species === "cat" ? "🐱" : "🐶"}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{pet.name}</p>
                      <p className="text-sm text-gray-500">
                        {pet.breed || "Sem raça definida"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        pet.approvalStatus === "approved"
                          ? "bg-green-100 text-green-700"
                          : pet.approvalStatus === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {pet.approvalStatus === "approved"
                        ? "Aprovado"
                        : pet.approvalStatus === "pending"
                        ? "Pendente"
                        : "Rejeitado"}
                    </span>
                    <span className="text-gray-500">
                      {pet.credits} créditos
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/tutor/bookings">Fazer Reserva</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/tutor/credits">Comprar Créditos</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/tutor/calendar">Ver Calendário</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
