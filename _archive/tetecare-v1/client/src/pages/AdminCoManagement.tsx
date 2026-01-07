import { useState } from "react";
import { trpc } from "../lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Users, Activity, TrendingUp, Clock, Pill, Apple, Shield, Calendar, User } from "lucide-react";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function AdminCoManagement() {
  const [timeRange, setTimeRange] = useState("7d");
  const [resourceFilter, setResourceFilter] = useState("all");
  
  // Fetch real data from tRPC
  const { data: statsData } = trpc.changeHistory.getCollaborationStats.useQuery();
  const { data: recentChangesData } = trpc.changeHistory.getRecentChanges.useQuery({ limit: 50 });
  
  // Calculate days based on timeRange
  const daysMap: Record<string, number> = {
    "24h": 1,
    "7d": 7,
    "30d": 30,
    "all": 90,
  };
  const days = daysMap[timeRange] || 7;
  
  // Fetch activity by day
  const { data: activityByDayData, isLoading: isLoadingActivity } = trpc.changeHistory.getActivityByDay.useQuery({ days });
  
  const stats = {
    totalChanges: statsData?.totalChanges || 0,
    adminChanges: statsData?.adminChanges || 0,
    tutorChanges: statsData?.tutorChanges || 0,
    todayChanges: recentChangesData?.filter((c: any) => {
      const changeDate = new Date(c.createdAt);
      const today = new Date();
      return changeDate.toDateString() === today.toDateString();
    }).length || 0,
  };
  
  // Transform activity data for chart
  const activityData = activityByDayData?.map(item => ({
    date: new Date(item.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    admin: item.adminChanges,
    tutor: item.tutorChanges,
  })) || [];
  
  const resourceDistribution = [
    { name: "Medicamentos", value: statsData?.byResourceType?.medication || 0, color: "#8B5CF6" },
    { name: "Alimentação", value: statsData?.byResourceType?.food || 0, color: "#10B981" },
    { name: "Preventivos", value: statsData?.byResourceType?.preventive || 0, color: "#F59E0B" },
    { name: "Dados do Pet", value: statsData?.byResourceType?.pet_data || 0, color: "#3B82F6" },
    { name: "Calendário", value: statsData?.byResourceType?.calendar || 0, color: "#EC4899" },
  ].filter(item => item.value > 0);
  
  // Helper function to format timestamps
  function formatTimestamp(date: Date | string): string {
    const now = new Date();
    const changeDate = new Date(date);
    const diffMs = now.getTime() - changeDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `Há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    return changeDate.toLocaleDateString('pt-BR');
  }
  
  // Transform real changes data
  const recentChanges = (recentChangesData || []).slice(0, 20).map((change: any) => ({
    id: change.id,
    type: change.resourceType,
    action: change.changeType,
    user: `Usuário #${change.changedBy}`,
    role: change.changedByRole,
    pet: `Pet #${change.petId}`,
    field: change.fieldName,
    oldValue: change.oldValue,
    newValue: change.newValue,
    timestamp: formatTimestamp(change.createdAt),
  }));
  
  const getResourceIcon = (type: string) => {
    switch (type) {
      case "medication": return <Pill className="h-4 w-4" />;
      case "food": return <Apple className="h-4 w-4" />;
      case "preventive": return <Shield className="h-4 w-4" />;
      case "pet_data": return <Activity className="h-4 w-4" />;
      case "calendar": return <Calendar className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };
  
  const getResourceLabel = (type: string) => {
    const labels: Record<string, string> = {
      medication: "Medicamento",
      food: "Alimentação",
      preventive: "Preventivo",
      pet_data: "Dados do Pet",
      calendar: "Calendário",
    };
    return labels[type] || type;
  };
  
  return (
    <AdminLayout>
    <div className="container max-w-7xl py-8 space-y-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Cogestão Admin-Tutor</h1>
        <p className="text-muted-foreground">
          Acompanhe todas as alterações feitas por administradores e tutores em tempo real
        </p>
      </div>
      
      {/* Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Alterações</p>
                <p className="text-3xl font-bold">{stats.totalChanges}</p>
                <p className="text-xs text-muted-foreground mt-1">Últimos 7 dias</p>
              </div>
              <Activity className="h-10 w-10 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Por Administradores</p>
                <p className="text-3xl font-bold text-purple-600">{stats.adminChanges}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round((stats.adminChanges / stats.totalChanges) * 100)}% do total
                </p>
              </div>
              <Users className="h-10 w-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Por Tutores</p>
                <p className="text-3xl font-bold text-green-600">{stats.tutorChanges}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round((stats.tutorChanges / stats.totalChanges) * 100)}% do total
                </p>
              </div>
              <User className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hoje</p>
                <p className="text-3xl font-bold text-blue-600">{stats.todayChanges}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +15% vs ontem
                </p>
              </div>
              <Clock className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Linha do Tempo de Atividades */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade por Dia</CardTitle>
          </CardHeader>
          <CardContent>
              {isLoadingActivity ? (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-muted-foreground">Carregando dados...</p>
                </div>
              ) : activityData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-muted-foreground">Nenhuma atividade registrada no período</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="admin" stroke="#8B5CF6" name="Admin" strokeWidth={2} />
                    <Line type="monotone" dataKey="tutor" stroke="#10B981" name="Tutor" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
          </CardContent>
        </Card>
        
        {/* Distribuição por Tipo de Recurso */}
        <Card>
          <CardHeader>
            <CardTitle>Alterações por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={resourceDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {resourceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Últimas 24 horas</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Recurso</label>
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="medication">Medicamentos</SelectItem>
                  <SelectItem value="food">Alimentação</SelectItem>
                  <SelectItem value="preventive">Preventivos</SelectItem>
                  <SelectItem value="pet_data">Dados do Pet</SelectItem>
                  <SelectItem value="calendar">Calendário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                Exportar Relatório
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Timeline de Alterações Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Alterações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentChanges.map((change) => (
              <div key={change.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="mt-1">
                  {getResourceIcon(change.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={change.role === "admin" ? "default" : "secondary"}>
                      {change.role === "admin" ? "Admin" : "Tutor"}
                    </Badge>
                    <span className="font-medium">{change.user}</span>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">{change.pet}</span>
                  </div>
                  <p className="text-sm mb-2">
                    <span className="font-medium">{getResourceLabel(change.type)}:</span> {change.field}
                  </p>
                  {change.oldValue && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground line-through">{change.oldValue}</span>
                      <span>→</span>
                      <span className="text-green-600 font-medium">{change.newValue}</span>
                    </div>
                  )}
                  {!change.oldValue && (
                    <div className="text-xs">
                      <span className="text-green-600 font-medium">{change.newValue}</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {change.timestamp}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}
