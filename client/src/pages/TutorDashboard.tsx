import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Dog, Calendar, Pill, Syringe, FileText, TrendingUp, AlertCircle, 
  Clock, CreditCard, Activity, Heart, ShoppingBag, Package, ArrowRight,
  CheckCircle2, XCircle, Sparkles
} from "lucide-react";
import { Link } from "wouter";
import TutorLayout from "@/components/TutorLayout";
import { DailyReportCard } from "@/components/DailyReportCard";
import { WhatsAppContactButton } from "@/components/WhatsAppContactButton";
import { HealthBehaviorModal } from "@/components/HealthBehaviorModal";
import { useState } from "react";

export default function TutorDashboard() {
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const { data: pets, isLoading } = trpc.pets.listMine.useQuery();
  const { data: notifications } = trpc.notifications.getUserNotifications.useQuery();
  const { data: allLogs } = trpc.logs.listMine.useQuery();
  
  // Get recent daycare logs (last 3)
  const allRecentLogs = (allLogs || [])
    .filter(log => log.source === "daycare")
    .sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime())
    .slice(0, 3);

  const unreadNotifications = notifications?.filter(n => !n.isRead) || [];
  
  // Calculate statistics
  const totalCredits = pets?.reduce((sum, pet) => sum + pet.credits, 0) || 0;
  const activePets = pets?.filter(p => p.status === "checked-in").length || 0;
  const petsInDaycare = pets?.filter(p => p.status === "checked-in").length || 0;
  
  // Calculate alerts
  const alerts: Array<{ type: string; petName: string; message: string; severity: string; icon: any }> = [];
  pets?.forEach(pet => {
    if (pet.credits < 5) {
      alerts.push({
        type: "credits",
        petName: pet.name,
        message: `Saldo baixo: ${pet.credits} diárias restantes`,
        severity: pet.credits === 0 ? "high" : "medium",
        icon: CreditCard,
      });
    }
  });



  if (isLoading) {
    return (
      <TutorLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </TutorLayout>
    );
  }

  return (
    <TutorLayout>
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              Central de Monitoramento
            </h1>
            <p className="text-muted-foreground mt-2">
              Acompanhe tudo sobre seus pets em um só lugar
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsHealthModalOpen(true)}
            >
              <Activity className="h-4 w-4 mr-2" />
              Registrar Saúde
            </Button>
            <Link href="/tutor/credits">
              <Button variant="outline" size="sm">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Comprar Créditos
              </Button>
            </Link>
            <Link href="/tutor/subscriptions">
              <Button size="sm">
                <Package className="h-4 w-4 mr-2" />
                Ver Planos
              </Button>
            </Link>
          </div>
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <AlertCircle className="h-5 w-5" />
                  Alertas Importantes
                  {alerts.length > 5 && (
                    <Badge variant="secondary" className="ml-2">
                      {alerts.length}
                    </Badge>
                  )}
                </CardTitle>
                {alerts.length > 5 && (
                  <Link href="/tutor/credits">
                    <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
                      Ver todos <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.slice(0, 5).map((alert, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-orange-200">
                  <alert.icon className="h-5 w-5 text-orange-600" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{alert.petName}</p>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                  </div>
                  <Link href="/tutor/credits">
                    <Button size="sm" variant="outline">
                      Resolver
                    </Button>
                  </Link>
                </div>
              ))}
              {alerts.length > 5 && (
                <div className="text-center pt-2">
                  <Link href="/tutor/credits">
                    <Button variant="link" size="sm" className="text-orange-600">
                      + {alerts.length - 5} alertas adicionais
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-card hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Pets</CardTitle>
              <Dog className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pets?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                {activePets} ativos
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Na Creche Hoje</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{petsInDaycare}</div>
              <p className="text-xs text-muted-foreground">
                pets presentes
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Créditos Totais</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCredits}</div>
              <p className="text-xs text-muted-foreground">
                diárias disponíveis
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Notificações</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unreadNotifications.length}</div>
              <p className="text-xs text-muted-foreground">
                não lidas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* My Pets Section */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Dog className="h-5 w-5" />
                  Meus Pets
                </CardTitle>
                <Link href="/tutor/pets">
                  <Button variant="ghost" size="sm">
                    Ver todos <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!pets || pets.length === 0 ? (
                <div className="empty-state py-8">
                  <Dog className="empty-state-icon" />
                  <p className="empty-state-title">Nenhum pet cadastrado</p>
                  <p className="empty-state-description">
                    Cadastre seu primeiro pet para começar
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    {pets.slice(0, 6).map((pet) => (
                  <Link key={pet.id} href={`/tutor/pets/${pet.id}`}>
                    <div className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {pet.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{pet.name}</p>
                        <p className="text-sm text-muted-foreground">{pet.breed}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={pet.status === "checked-in" ? "default" : "secondary"}>
                          {pet.status === "checked-in" ? "Na creche" : "Fora da creche"}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {pet.credits} créditos
                        </p>
                        <Progress 
                          value={Math.min((pet.credits / 10) * 100, 100)} 
                          className="h-1 mt-2"
                        />
                      </div>
                    </div>
                  </Link>
                    ))}
                  </div>
                  {pets.length > 6 && (
                    <div className="text-center pt-4 border-t">
                      <Link href="/tutor/pets">
                        <Button variant="link" size="sm">
                          + {pets.length - 6} pets adicionais
                        </Button>
                      </Link>
                    </div>
                  )}
                </>              )}
            </CardContent>
          </Card>

          {/* Health & Care Section */}
          <Card className="shadow-card hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg">
                  <Heart className="h-5 w-5 text-white" />
                </div>
                Saúde & Cuidados
              </CardTitle>
              <CardDescription>
                Mantenha a saúde dos seus pets em dia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {/* Preventivo Card */}
                <Link href="/tutor/preventive">
                  <div className="group relative p-4 rounded-lg border-2 border-border hover:border-primary bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 transition-all cursor-pointer hover-lift">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg group-hover:scale-110 transition-transform">
                          <Syringe className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-blue-900 dark:text-blue-100">Preventivo</p>
                          <p className="text-xs text-blue-700 dark:text-blue-300">Vacinas, antipulgas, vermífugos</p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>

                {/* Medicamentos Card */}
                <Link href="/tutor/medications">
                  <div className="group relative p-4 rounded-lg border-2 border-border hover:border-primary bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 transition-all cursor-pointer hover-lift">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500 rounded-lg group-hover:scale-110 transition-transform">
                          <Pill className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-purple-900 dark:text-purple-100">Medicamentos</p>
                          <p className="text-xs text-purple-700 dark:text-purple-300">Tratamentos e remédios ativos</p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>

                {/* Ração Card */}
                <Link href="/tutor/food">
                  <div className="group relative p-4 rounded-lg border-2 border-border hover:border-primary bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 transition-all cursor-pointer hover-lift">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500 rounded-lg group-hover:scale-110 transition-transform">
                          <ShoppingBag className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-amber-900 dark:text-amber-100">Ração</p>
                          <p className="text-xs text-amber-700 dark:text-amber-300">Alimentação e preferências</p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-amber-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Section */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Últimos Relatórios da Creche
              </CardTitle>
              <Link href="/tutor/pets">
                <Button variant="ghost" size="sm">
                  Ver histórico <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <CardDescription>
              Acompanhe como seus pets estão na creche
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allRecentLogs.length === 0 ? (
              <div className="empty-state py-8">
                <FileText className="empty-state-icon" />
                <p className="empty-state-title">Nenhum relatório recente</p>
                <p className="empty-state-description">
                  Relatórios da creche aparecerão aqui
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {allRecentLogs.map((log) => {
                  const pet = pets?.find(p => p.id === log.petId);
                  return (
                    <DailyReportCard key={log.id} log={log} petName={pet?.name || "Pet"} />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link href="/tutor/credits">
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Comprar Créditos
                </Button>
              </Link>
              <Link href="/tutor/subscriptions">
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <Package className="h-5 w-5 mr-2" />
                  Assinar Plano
                </Button>
              </Link>
              <Link href="/tutor/calendar">
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <Calendar className="h-5 w-5 mr-2" />
                  Ver Calendário
                </Button>
              </Link>
              <Link href="/tutor/reports">
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <FileText className="h-5 w-5 mr-2" />
                  Gerar Relatório
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Floating WhatsApp Contact Button */}
      <WhatsAppContactButton variant="floating" />
      
      {/* Health Behavior Modal */}
      <HealthBehaviorModal 
        open={isHealthModalOpen}
        onOpenChange={setIsHealthModalOpen}
        pets={pets || []}
      />
    </TutorLayout>
  );
}
