import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dog, Users, Calendar, TrendingUp, AlertCircle, CheckCircle2, Clock, Activity, Pill, Syringe, Shield, Brain, Plus } from "lucide-react";
import { Link } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { HealthBehaviorModal } from "@/components/HealthBehaviorModal";
import { useState } from "react";

export default function AdminDashboard() {
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: pets, isLoading: petsLoading } = trpc.pets.list.useQuery();
  const { data: upcomingVaccines } = trpc.vaccines.upcoming.useQuery({ daysAhead: 30 });
  const { data: healthStats } = trpc.healthStats.getDashboardStats.useQuery();

  const checkedInPets = pets?.filter(p => p.status === "checked-in") || [];
  const checkedOutPets = pets?.filter(p => p.status === "checked-out") || [];

  if (statsLoading || petsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-lg text-muted-foreground">
          Visão geral da creche e gestão de pets
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card hover:shadow-hover transition-smooth border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Pets</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Dog className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalPets || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Cadastrados na plataforma
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-hover transition-smooth border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Na Creche</CardTitle>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats?.checkedIn || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Pets presentes hoje
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-hover transition-smooth border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Mensal</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              R$ {((stats?.monthlyRevenue || 0) / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Mês atual
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-hover transition-smooth border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vacinas Próximas</CardTitle>
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{upcomingVaccines?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Próximos 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Registro Rápido */}
      <Card className="shadow-card border-border/50">
        <CardHeader className="pb-4">
          <div>
            <CardTitle className="text-xl">Registro Rápido</CardTitle>
            <CardDescription className="mt-1.5">
              Registre humor, fezes e comportamento dos pets na creche
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {checkedInPets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">Nenhum pet na creche para registrar</p>
            </div>
          ) : (
            <Button 
              onClick={() => setHealthModalOpen(true)}
              size="lg"
              className="w-full md:w-auto"
            >
              <Plus className="mr-2 h-5 w-5" />
              Novo Registro de Saúde
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pets na Creche */}
        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Pets na Creche</CardTitle>
                <CardDescription className="mt-1.5">
                  Pets que fizeram check-in hoje
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-base px-3 py-1">
                {checkedInPets.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {checkedInPets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-muted/50 rounded-full mb-4">
                  <Dog className="h-12 w-12 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-muted-foreground mb-2">Nenhum pet na creche</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Faça o check-in dos pets quando chegarem
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {checkedInPets.slice(0, 3).map((pet) => (
                  <Link key={pet.id} href={`/admin/pets/${pet.id}`}>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-accent/50 transition-smooth cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                          {pet.name[0]}
                        </div>
                        <div>
                          <p className="font-medium">{pet.name}</p>
                          <p className="text-sm text-muted-foreground">{pet.breed}</p>
                        </div>
                      </div>
                      <Badge variant="default" className="bg-green-500/10 text-green-700 hover:bg-green-500/20">
                        Na creche
                      </Badge>
                    </div>
                  </Link>
                ))}
                {checkedInPets.length > 3 && (
                  <Link href="/admin/pets">
                    <Button variant="outline" className="w-full mt-4">
                      Ver todos ({checkedInPets.length})
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vacinas Próximas */}
        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Vacinas Próximas</CardTitle>
                <CardDescription className="mt-1.5">
                  Vacinas agendadas para os próximos 30 dias
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-base px-3 py-1">
                {upcomingVaccines?.length || 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {!upcomingVaccines || upcomingVaccines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-muted/50 rounded-full mb-4">
                  <Calendar className="h-12 w-12 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-muted-foreground mb-2">Nenhuma vacina agendada</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Todas as vacinas estão em dia
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingVaccines.slice(0, 3).map((item: any) => (
                  <div key={item.vaccination.id} className="p-4 rounded-lg border border-border/50 hover:bg-accent/50 transition-smooth">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{item.pet.name}</p>
                        <p className="text-sm text-muted-foreground">{item.vaccine.name}</p>
                      </div>
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        {new Date(item.vaccination.nextDueDate).toLocaleDateString("pt-BR")}
                      </Badge>
                    </div>
                  </div>
                ))}
                {upcomingVaccines.length > 3 && (
                  <Link href="/admin/vaccines">
                    <Button variant="outline" className="w-full mt-4">
                      Ver todas ({upcomingVaccines.length})
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Health Statistics Section */}
      {healthStats && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Activity className="h-6 w-6 text-primary" />
                Estatísticas de Saúde
              </h2>
              <p className="text-muted-foreground mt-1">
                Visão geral da saúde dos pets
              </p>
            </div>
            <Link href="/admin/health-notifications">
              <Button variant="outline">
                <AlertCircle className="h-4 w-4 mr-2" />
                Ver Notificações
              </Button>
            </Link>
          </div>

          {/* Health Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Vaccination Rate */}
            <Card className="shadow-card hover:shadow-hover transition-smooth">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Vacinação</CardTitle>
                <Syringe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthStats.vaccination.rate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {healthStats.vaccination.upToDate} de {healthStats.vaccination.total} pets em dia
                </p>
                <div className="mt-3 flex gap-2 text-xs">
                  {healthStats.vaccination.overdue > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {healthStats.vaccination.overdue} atrasados
                    </Badge>
                  )}
                  {healthStats.vaccination.upcoming > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {healthStats.vaccination.upcoming} próximos
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Active Medications */}
            <Card className="shadow-card hover:shadow-hover transition-smooth">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Medicamentos Ativos</CardTitle>
                <Pill className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthStats.medications.total}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {healthStats.medications.byPet.length} pets em tratamento
                </p>
              </CardContent>
            </Card>

            {/* Preventives This Month */}
            <Card className="shadow-card hover:shadow-hover transition-smooth">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Preventivos no Mês</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthStats.preventives.total}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {healthStats.preventives.flea} antipulgas, {healthStats.preventives.deworming} vermífugos
                </p>
              </CardContent>
            </Card>

            {/* Overdue Treatments */}
            <Card className="shadow-card hover:shadow-hover transition-smooth">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tratamentos Atrasados</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{healthStats.overdue.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Requerem atenção imediata
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Overdue Treatments List */}
          {healthStats.overdue.length > 0 && (
            <Card className="shadow-card border-orange-200 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Tratamentos Atrasados
                </CardTitle>
                <CardDescription>
                  {healthStats.overdue.length} {healthStats.overdue.length === 1 ? 'tratamento atrasado' : 'tratamentos atrasados'} que requerem atenção
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {healthStats.overdue.slice(0, 5).map((item: any, idx: number) => {
                    const daysOverdue = Math.floor(
                      (new Date().getTime() - new Date(item.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    
                    const typeLabels: Record<string, string> = {
                      vaccination: "Vacina",
                      flea: "Antipulgas",
                      deworming: "Vermífugo",
                    };
                    
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex-1">
                          <p className="font-medium">{item.petName}</p>
                          <p className="text-sm text-muted-foreground">
                            {typeLabels[item.type]}: {item.itemName}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive" className="text-xs">
                            {daysOverdue} {daysOverdue === 1 ? 'dia' : 'dias'} atrasado
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(item.dueDate).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {healthStats.overdue.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      +{healthStats.overdue.length - 5} mais
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Ações Rápidas */}
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-xl">Ações Rápidas</CardTitle>
          <CardDescription className="mt-1.5">
            Acesso rápido às funcionalidades principais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/admin/pets/new">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover-lift">
                <Dog className="h-6 w-6" />
                <span>Novo Pet</span>
              </Button>
            </Link>
            <Link href="/admin/logs">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover-lift">
                <Clock className="h-6 w-6" />
                <span>Registrar Log</span>
              </Button>
            </Link>
            <Link href="/admin/calendar">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover-lift">
                <Calendar className="h-6 w-6" />
                <span>Calendário</span>
              </Button>
            </Link>
            <Link href="/admin/finances">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover-lift">
                <TrendingUp className="h-6 w-6" />
                <span>Finanças</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Health Behavior Modal */}
      <HealthBehaviorModal
        open={healthModalOpen}
        onOpenChange={setHealthModalOpen}
        pets={checkedInPets.map(p => ({ id: p.id, name: p.name }))}
        onSuccess={() => {
          // Optionally refresh data
        }}
      />
    </AdminLayout>
  );
}
