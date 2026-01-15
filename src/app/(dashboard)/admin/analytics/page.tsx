"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users,
  AlertTriangle,
  Clock,
  DollarSign,
  PawPrint,
  Calendar,
  RefreshCw,
  Loader2,
  Syringe,
  Pill,
  CreditCard,
  Phone,
  Mail,
  ChevronRight,
  Activity,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [occupancyDays, setOccupancyDays] = useState("30");
  const [churnDays, setChurnDays] = useState("15");

  // Queries
  const { data: occupancy, isLoading: loadingOccupancy, refetch: refetchOccupancy } = 
    trpc.analytics.occupancyRate.useQuery({ days: parseInt(occupancyDays) });
  
  const { data: churn, isLoading: loadingChurn, refetch: refetchChurn } = 
    trpc.analytics.churnRate.useQuery({ inactiveDays: parseInt(churnDays) });
  
  const { data: peakHours, isLoading: loadingPeak } = 
    trpc.analytics.peakHours.useQuery({ days: 30 });
  
  const { data: attention, isLoading: loadingAttention, refetch: refetchAttention } = 
    trpc.analytics.petsRequiringAttention.useQuery();
  
  const { data: revenue, isLoading: loadingRevenue } = 
    trpc.analytics.revenueProjection.useQuery({ months: 6 });

  const refetchAll = () => {
    refetchOccupancy();
    refetchChurn();
    refetchAttention();
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <BarChart3 />
          </div>
          <div className="page-header-info">
            <h1>Analytics Avançado</h1>
            <p>Métricas e insights para gestão estratégica</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button variant="outline" size="sm" onClick={refetchAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Taxa de Ocupação</span>
            <Activity className="stat-card-icon primary" />
          </div>
          <div className="stat-card-value">
            {loadingOccupancy ? "..." : `${occupancy?.avgOccupancyPercent || 0}%`}
          </div>
          <p className="stat-card-description">
            Média dos últimos {occupancyDays} dias
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Churn Rate</span>
            {(churn?.churnRate || 0) > 20 ? (
              <TrendingDown className="stat-card-icon red" />
            ) : (
              <TrendingUp className="stat-card-icon green" />
            )}
          </div>
          <div className="stat-card-value">
            {loadingChurn ? "..." : `${churn?.churnRate || 0}%`}
          </div>
          <p className="stat-card-description">
            {churn?.totalInactive || 0} pets inativos há +{churnDays} dias
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Pets em Alerta</span>
            <AlertTriangle className="stat-card-icon amber" />
          </div>
          <div className="stat-card-value">
            {loadingAttention ? "..." : attention?.summary.petsAffected || 0}
          </div>
          <p className="stat-card-description">
            {attention?.summary.totalAlerts || 0} alertas pendentes
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Horário de Pico</span>
            <Clock className="stat-card-icon blue" />
          </div>
          <div className="stat-card-value">
            {loadingPeak ? "..." : peakHours?.peakHour ? `${peakHours.peakHour}:00` : "—"}
          </div>
          <p className="stat-card-description">
            Horário mais movimentado
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            Ocupação
          </TabsTrigger>
          <TabsTrigger value="attention" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Atenção
          </TabsTrigger>
          <TabsTrigger value="churn" className="gap-2">
            <Users className="h-4 w-4" />
            Reativação
          </TabsTrigger>
          <TabsTrigger value="revenue" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Receita
          </TabsTrigger>
        </TabsList>

        {/* Tab: Ocupação */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Gráfico de Ocupação */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Taxa de Ocupação Diária</CardTitle>
                    <CardDescription>
                      Ocupação vs capacidade máxima ({occupancy?.capacity || 30} pets)
                    </CardDescription>
                  </div>
                  <Select value={occupancyDays} onValueChange={setOccupancyDays}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="14">14 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="60">60 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loadingOccupancy ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : occupancy?.data ? (
                  <div className="space-y-4">
                    {/* Gráfico de barras simplificado */}
                    <div className="flex items-end gap-1 h-48">
                      {occupancy.data.slice(-14).map((day, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div 
                            className="w-full bg-primary/80 rounded-t transition-all"
                            style={{ 
                              height: `${Math.max(4, (day.count / occupancy.capacity) * 100)}%`,
                              opacity: day.occupancyPercent > 80 ? 1 : 0.7,
                            }}
                            title={`${day.date}: ${day.count} pets (${day.occupancyPercent}%)`}
                          />
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(day.date), "dd")}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Média: {occupancy.avgOccupancy} pets/dia</span>
                      <span>Capacidade: {occupancy.capacity} pets</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Sem dados disponíveis
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mapa de Calor de Horários */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Horários de Pico</CardTitle>
                <CardDescription>Check-ins por horário</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPeak ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : peakHours?.data ? (
                  <div className="space-y-2">
                    {peakHours.data
                      .filter(h => h.count > 0)
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 8)
                      .map((hour, i) => {
                        const maxCount = Math.max(...peakHours.data.map(h => h.count));
                        const percent = maxCount > 0 ? (hour.count / maxCount) * 100 : 0;
                        
                        return (
                          <div key={hour.hour} className="flex items-center gap-3">
                            <span className="text-sm font-medium w-12">{hour.label}</span>
                            <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                              <div 
                                className={`h-full rounded transition-all ${
                                  i === 0 ? 'bg-primary' : 'bg-primary/60'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-8">{hour.count}</span>
                          </div>
                        );
                      })}
                    {peakHours.data.filter(h => h.count > 0).length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        Sem dados de horário
                      </p>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Pets que Requerem Atenção */}
        <TabsContent value="attention" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                    <Syringe className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{attention?.summary.vaccinesDue || 0}</p>
                    <p className="text-sm text-muted-foreground">Vacinas vencendo</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <Pill className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{attention?.summary.medicationsToday || 0}</p>
                    <p className="text-sm text-muted-foreground">Medicamentos hoje</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{attention?.summary.lowCredits || 0}</p>
                    <p className="text-sm text-muted-foreground">Créditos baixos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <PawPrint className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{attention?.summary.petsAffected || 0}</p>
                    <p className="text-sm text-muted-foreground">Pets afetados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Pets que Requerem Atenção
              </CardTitle>
              <CardDescription>
                Vacinas vencendo em 7 dias, medicamentos ativos e créditos baixos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAttention ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : attention?.items && attention.items.length > 0 ? (
                <div className="space-y-3">
                  {attention.items.map((item) => (
                    <div 
                      key={item.petId} 
                      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {item.petPhoto ? (
                          <img 
                            src={item.petPhoto} 
                            alt={item.petName} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <PawPrint className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.petName}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {item.alerts.map((alert, i) => (
                            <Badge 
                              key={i} 
                              variant={
                                alert.priority === "high" ? "destructive" : 
                                alert.priority === "medium" ? "default" : "secondary"
                              }
                              className="text-xs"
                            >
                              {alert.type === "vaccine" && <Syringe className="h-3 w-3 mr-1" />}
                              {alert.type === "medication" && <Pill className="h-3 w-3 mr-1" />}
                              {alert.type === "low_credits" && <CreditCard className="h-3 w-3 mr-1" />}
                              {alert.message}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                    <PawPrint className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-muted-foreground">Todos os pets estão em dia!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Churn / Reativação */}
        <TabsContent value="churn" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Pets Inativos - Oportunidade de Reativação
                  </CardTitle>
                  <CardDescription>
                    Pets que não frequentam há mais de {churnDays} dias
                  </CardDescription>
                </div>
                <Select value={churnDays} onValueChange={setChurnDays}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="15">15 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loadingChurn ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : churn?.inactivePets && churn.inactivePets.length > 0 ? (
                <div className="space-y-3">
                  {churn.inactivePets.slice(0, 10).map((pet) => (
                    <div 
                      key={pet.id} 
                      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {pet.photoUrl ? (
                          <img 
                            src={pet.photoUrl} 
                            alt={pet.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <PawPrint className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{pet.name}</p>
                          <Badge variant="secondary" className="text-xs">
                            {pet.species === "dog" ? "Cachorro" : "Gato"}
                          </Badge>
                        </div>
                        {pet.tutor && (
                          <p className="text-sm text-muted-foreground">
                            Tutor: {pet.tutor.name}
                          </p>
                        )}
                        <p className="text-xs text-amber-600 mt-1">
                          {pet.daysSinceLastVisit !== null 
                            ? `Última visita há ${pet.daysSinceLastVisit} dias`
                            : "Nunca fez check-in"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {pet.tutor?.phone && (
                          <Button variant="outline" size="sm">
                            <Phone className="h-4 w-4" />
                          </Button>
                        )}
                        {pet.tutor?.email && (
                          <Button variant="outline" size="sm">
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {churn.inactivePets.length > 10 && (
                    <p className="text-center text-sm text-muted-foreground pt-2">
                      + {churn.inactivePets.length - 10} pets inativos
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-muted-foreground">Todos os pets estão ativos!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Receita */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Projeção de Receita Mensal
              </CardTitle>
              <CardDescription>
                Baseado no uso de créditos dos últimos 6 meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRevenue ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : revenue?.data ? (
                <div className="space-y-6">
                  {/* Gráfico de barras */}
                  <div className="flex items-end gap-4 h-48">
                    {revenue.data.map((month, i) => {
                      const maxRevenue = Math.max(...revenue.data.map(m => m.revenue));
                      const height = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;
                      
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                          <span className="text-xs font-medium">
                            {month.revenueFormatted}
                          </span>
                          <div 
                            className={`w-full rounded-t transition-all ${
                              month.isProjection ? 'bg-primary/40 border-2 border-dashed border-primary' : 'bg-primary'
                            }`}
                            style={{ height: `${Math.max(8, height)}%` }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {month.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Receita Total (6 meses)</p>
                      <p className="text-2xl font-bold">
                        R$ {(revenue.totalRevenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Média Mensal</p>
                      <p className="text-2xl font-bold">
                        R$ {(revenue.avgMonthlyRevenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
