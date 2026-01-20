"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Heart, 
  Calendar, 
  Loader2, 
  PawPrint,
  CreditCard,
  Smile,
  Meh,
  Frown,
  ShoppingCart,
  BarChart3,
  Clock,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TutorAnalyticsPage() {
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: pets = [], isLoading: loadingPets } = trpc.pets.myPets.useQuery();

  // Auto-selecionar primeiro pet
  useEffect(() => {
    if (pets.length > 0 && !selectedPetId) {
      setSelectedPetId(pets[0].id);
    }
  }, [pets, selectedPetId]);

  const selectedPet = pets.find((p) => p.id === selectedPetId);

  // Queries de analytics (só executam quando há pet selecionado)
  const { data: wellness, isLoading: loadingWellness } = trpc.analytics.petWellnessTimeline.useQuery(
    { petId: selectedPetId!, days: 30 },
    { enabled: !!selectedPetId }
  );

  const { data: frequency, isLoading: loadingFrequency } = trpc.analytics.petFrequency.useQuery(
    { petId: selectedPetId!, months: 6 },
    { enabled: !!selectedPetId }
  );

  const { data: creditStatement, isLoading: loadingStatement } = trpc.analytics.creditStatement.useQuery(
    { petId: selectedPetId!, limit: 20 },
    { enabled: !!selectedPetId }
  );

  const { data: topUpSuggestion, isLoading: loadingSuggestion } = trpc.analytics.smartTopUpSuggestion.useQuery(
    { petId: selectedPetId! },
    { enabled: !!selectedPetId }
  );

  if (loadingPets) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <BarChart3 />
          </div>
          <div className="page-header-info">
            <h1>Dashboard Analítico</h1>
            <p>Acompanhe a evolução e estatísticas do seu pet</p>
          </div>
        </div>
      </div>

      {/* Pet Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Selecione o Pet</CardTitle>
        </CardHeader>
        <CardContent>
          {pets.length === 0 ? (
            <div className="text-center py-8">
              <PawPrint className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum pet cadastrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {pets.map((pet) => (
                <button
                  key={pet.id}
                  onClick={() => setSelectedPetId(pet.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedPetId === pet.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full mx-auto mb-2 bg-muted flex items-center justify-center overflow-hidden">
                      {pet.photoUrl ? (
                        <img
                          src={pet.photoUrl}
                          alt={pet.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <PawPrint className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <p className="font-semibold">{pet.name}</p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {pet.credits} créditos
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPet ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Créditos</span>
                <CreditCard className="stat-card-icon primary" />
              </div>
              <div className="stat-card-value">{selectedPet.credits}</div>
              {topUpSuggestion && (
                <p className="stat-card-description">
                  {topUpSuggestion.monthsRemaining < 1 
                    ? "Hora de recarregar!" 
                    : `~${topUpSuggestion.monthsRemaining} meses restantes`}
                </p>
              )}
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Frequência Média</span>
                <Calendar className="stat-card-icon blue" />
              </div>
              <div className="stat-card-value">
                {loadingFrequency ? "..." : `${frequency?.avgMonthlyVisits || 0}`}
              </div>
              <p className="stat-card-description">visitas/mês</p>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Humor</span>
                {(wellness?.moodStats.positivePercent || 0) >= 60 ? (
                  <Smile className="stat-card-icon green" />
                ) : (wellness?.moodStats.positivePercent || 0) >= 30 ? (
                  <Meh className="stat-card-icon amber" />
                ) : (
                  <Frown className="stat-card-icon red" />
                )}
              </div>
              <div className="stat-card-value">
                {loadingWellness ? "..." : `${wellness?.moodStats.positivePercent || 0}%`}
              </div>
              <p className="stat-card-description">positivo</p>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Peso</span>
                <Activity className="stat-card-icon muted" />
              </div>
              <div className="stat-card-value">
                {selectedPet.weight ? `${(selectedPet.weight / 1000).toFixed(1)} kg` : "—"}
              </div>
              <p className="stat-card-description">peso atual</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="overview" className="gap-2">
                <Activity className="h-4 w-4" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="wellness" className="gap-2">
                <Heart className="h-4 w-4" />
                Bem-Estar
              </TabsTrigger>
              <TabsTrigger value="credits" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Créditos
              </TabsTrigger>
            </TabsList>

            {/* Tab: Visão Geral */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Frequência Mensal */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Frequência Mensal
                    </CardTitle>
                    <CardDescription>Visitas à creche por mês</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingFrequency ? (
                      <div className="flex items-center justify-center h-48">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : frequency?.data && frequency.data.length > 0 ? (
                      <div className="space-y-4">
                        {/* Gráfico de barras */}
                        <div className="flex items-end gap-2 h-32">
                          {frequency.data.map((month, i) => {
                            const maxVisits = Math.max(...frequency.data.map(m => m.visits), 1);
                            const height = (month.visits / maxVisits) * 100;
                            
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                <span className="text-sm font-medium">{month.visits}</span>
                                <div 
                                  className="w-full bg-primary rounded-t transition-all"
                                  style={{ height: `${Math.max(8, height)}%` }}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {month.month}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-center text-sm text-muted-foreground">
                          Total: {frequency.totalVisits} visitas | Média: {frequency.avgMonthlyVisits}/mês
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Sem dados de frequência ainda</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Sugestão de Recarga */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-amber-500" />
                      Recarga Inteligente
                    </CardTitle>
                    <CardDescription>Sugestão baseada no seu histórico</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingSuggestion ? (
                      <div className="flex items-center justify-center h-48">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : topUpSuggestion ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-lg bg-muted/50">
                            <p className="text-sm text-muted-foreground">Saldo Atual</p>
                            <p className="text-2xl font-bold">{topUpSuggestion.currentCredits}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-muted/50">
                            <p className="text-sm text-muted-foreground">Uso Mensal</p>
                            <p className="text-2xl font-bold">{topUpSuggestion.monthlyAvg}</p>
                          </div>
                        </div>

                        {topUpSuggestion.needsTopUp && topUpSuggestion.suggestedPackage && (
                          <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-semibold">{topUpSuggestion.suggestedPackage.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {topUpSuggestion.suggestedPackage.credits} créditos
                                </p>
                              </div>
                              <p className="text-lg font-bold text-primary">
                                R$ {(topUpSuggestion.suggestedPackage.priceInCents / 100).toFixed(2)}
                              </p>
                            </div>
                            <Button className="w-full mt-2">
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Comprar Agora
                            </Button>
                          </div>
                        )}

                        {!topUpSuggestion.needsTopUp && (
                          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-center">
                            <Smile className="h-8 w-8 mx-auto mb-2" />
                            <p className="font-medium">Tudo certo!</p>
                            <p className="text-sm">Você tem créditos suficientes para ~{topUpSuggestion.monthsRemaining} meses</p>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: Bem-Estar */}
            <TabsContent value="wellness" className="space-y-6 mt-6">
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Distribuição de Humor */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Distribuição de Humor</CardTitle>
                    <CardDescription>Últimos 30 dias</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingWellness ? (
                      <div className="flex items-center justify-center h-48">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : wellness?.moodStats ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-green-500" />
                            <span>Positivo</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{wellness.moodStats.positive}</span>
                            <span className="text-sm text-muted-foreground">
                              ({wellness.moodStats.positivePercent}%)
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-amber-500" />
                            <span>Neutro</span>
                          </div>
                          <span className="font-bold">{wellness.moodStats.neutral}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-red-500" />
                            <span>Negativo</span>
                          </div>
                          <span className="font-bold">{wellness.moodStats.negative}</span>
                        </div>

                        {/* Barra de progresso visual */}
                        <div className="h-4 rounded-full overflow-hidden flex mt-4">
                          {wellness.moodStats.positive > 0 && (
                            <div 
                              className="bg-green-500 transition-all"
                              style={{ width: `${wellness.moodStats.positivePercent}%` }}
                            />
                          )}
                          {wellness.moodStats.neutral > 0 && (
                            <div 
                              className="bg-amber-500 transition-all"
                              style={{ 
                                width: `${(wellness.moodStats.neutral / wellness.totalLogs) * 100}%` 
                              }}
                            />
                          )}
                          {wellness.moodStats.negative > 0 && (
                            <div 
                              className="bg-red-500 transition-all"
                              style={{ 
                                width: `${(wellness.moodStats.negative / wellness.totalLogs) * 100}%` 
                              }}
                            />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Sem dados de bem-estar</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Timeline de Logs */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Linha do Tempo
                    </CardTitle>
                    <CardDescription>Registros recentes do mural</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingWellness ? (
                      <div className="flex items-center justify-center h-48">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : wellness?.logs && wellness.logs.length > 0 ? (
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {wellness.logs.slice(0, 10).map((log) => (
                          <div 
                            key={log.id} 
                            className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                          >
                            {log.attachments && JSON.parse(log.attachments)?.[0] ? (
                              <img 
                                src={JSON.parse(log.attachments)[0]} 
                                alt="Log" 
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                <PawPrint className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {format(new Date(log.logDate), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                                {log.mood && (
                                  <Badge variant="outline" className="text-xs">
                                    {log.mood === "happy" || log.mood === "excited" ? "😊" : 
                                     log.mood === "calm" || log.mood === "neutral" ? "😐" : "😔"}
                                    {log.mood}
                                  </Badge>
                                )}
                              </div>
                              {log.notes && (
                                <p className="text-sm text-muted-foreground truncate mt-1">
                                  {log.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum registro ainda</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: Créditos */}
            <TabsContent value="credits" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Extrato de Créditos
                      </CardTitle>
                      <CardDescription>Histórico de uso de créditos</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      Saldo: {creditStatement?.currentBalance || 0}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingStatement ? (
                    <div className="flex items-center justify-center h-48">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : creditStatement?.statement && creditStatement.statement.length > 0 ? (
                    <div className="space-y-2">
                      {creditStatement.statement.map((item) => (
                        <div 
                          key={item.id} 
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                              <TrendingDown className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                              <p className="font-medium">{item.description}</p>
                              <p className="text-sm text-muted-foreground">{item.dateFormatted}</p>
                            </div>
                          </div>
                          <span className="font-bold text-red-600">{item.credits}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum uso de crédito registrado</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pacotes disponíveis */}
              {topUpSuggestion?.allPackages && topUpSuggestion.allPackages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Pacotes de Créditos
                    </CardTitle>
                    <CardDescription>Escolha o melhor para você</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      {topUpSuggestion.allPackages.map((pkg) => (
                        <div 
                          key={pkg.id}
                          className={`p-4 rounded-lg border-2 transition-all hover:border-primary ${
                            topUpSuggestion.suggestedPackage?.id === pkg.id 
                              ? "border-primary bg-primary/5" 
                              : "border-border"
                          }`}
                        >
                          {topUpSuggestion.suggestedPackage?.id === pkg.id && (
                            <Badge className="mb-2">Recomendado</Badge>
                          )}
                          <p className="font-semibold text-lg">{pkg.name}</p>
                          <p className="text-sm text-muted-foreground mb-2">
                            {pkg.credits} créditos
                          </p>
                          <p className="text-2xl font-bold text-primary">
                            R$ {(pkg.priceInCents / 100).toFixed(2)}
                          </p>
                          {pkg.discountPercent > 0 && (
                            <Badge variant="secondary" className="mt-2">
                              {pkg.discountPercent}% desconto
                            </Badge>
                          )}
                          <Button className="w-full mt-4" variant={
                            topUpSuggestion.suggestedPackage?.id === pkg.id ? "default" : "outline"
                          }>
                            Comprar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium text-muted-foreground">
              Selecione um pet para visualizar as estatísticas
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
