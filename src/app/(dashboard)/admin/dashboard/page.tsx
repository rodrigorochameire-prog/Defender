"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dog, 
  Users, 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Activity, 
  Pill, 
  Syringe, 
  Plus 
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: checkedInPets, isLoading: petsLoading } = trpc.dashboard.checkedInPets.useQuery();
  const { data: vaccineStats } = trpc.vaccines.stats.useQuery();

  if (statsLoading || petsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-lg text-muted-foreground">
          Visão geral da creche e gestão de pets
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
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

        <Card className="shadow-sm hover:shadow-md transition-shadow">
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

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Tutores</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats?.totalTutors || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Cadastrados na plataforma
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats?.pendingApproval || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Aguardando aprovação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pets na Creche */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Pets na Creche</CardTitle>
                <CardDescription className="mt-1.5">
                  Pets que fizeram check-in hoje
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-base px-3 py-1">
                {checkedInPets?.length || 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {!checkedInPets || checkedInPets.length === 0 ? (
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
                {checkedInPets.slice(0, 5).map((pet) => (
                  <Link key={pet.id} href={`/admin/pets/${pet.id}`}>
                    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                          {pet.name[0]}
                        </div>
                        <div>
                          <p className="font-medium">{pet.name}</p>
                          <p className="text-sm text-muted-foreground">{pet.breed || "Sem raça"}</p>
                        </div>
                      </div>
                      <Badge variant="default" className="bg-green-500/10 text-green-700">
                        Na creche
                      </Badge>
                    </div>
                  </Link>
                ))}
                {checkedInPets.length > 5 && (
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

        {/* Vacinas */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Estatísticas de Vacinas</CardTitle>
                <CardDescription className="mt-1.5">
                  Visão geral das vacinações
                </CardDescription>
              </div>
              <Syringe className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{vaccineStats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-950">
                <p className="text-2xl font-bold text-orange-600">{vaccineStats?.upcoming || 0}</p>
                <p className="text-xs text-muted-foreground">Próximas</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950">
                <p className="text-2xl font-bold text-red-600">{vaccineStats?.overdue || 0}</p>
                <p className="text-xs text-muted-foreground">Atrasadas</p>
              </div>
            </div>
            <Link href="/admin/vaccines">
              <Button variant="outline" className="w-full mt-4">
                Ver todas as vacinas
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Ações Rápidas</CardTitle>
          <CardDescription className="mt-1.5">
            Acesso rápido às funcionalidades principais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/admin/pets/new">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Dog className="h-6 w-6" />
                <span>Novo Pet</span>
              </Button>
            </Link>
            <Link href="/admin/logs">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Clock className="h-6 w-6" />
                <span>Registrar Log</span>
              </Button>
            </Link>
            <Link href="/admin/calendar">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Calendar className="h-6 w-6" />
                <span>Calendário</span>
              </Button>
            </Link>
            <Link href="/admin/finances">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <TrendingUp className="h-6 w-6" />
                <span>Finanças</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
