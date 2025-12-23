import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, Users, DollarSign } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function AdminOccupancyReport() {
  const [dateRange, setDateRange] = useState<"week" | "month" | "year">("month");
  
  // Calculate date range
  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    
    switch (dateRange) {
      case "week":
        start.setDate(start.getDate() - 7);
        break;
      case "month":
        start.setMonth(start.getMonth() - 1);
        break;
      case "year":
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    
    return { start, end };
  };

  const { start, end } = getDateRange();
  
  const { data: occupancyData, isLoading } = trpc.reports.occupancy.useQuery({
    startDate: start,
    endDate: end,
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Carregando relatório...</div>
        </div>
      </AdminLayout>
    );
  }

  const stats = occupancyData || {
    totalCheckIns: 0,
    averageOccupancy: 0,
    peakOccupancy: 0,
    revenue: 0,
    dailyData: [],
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatório de Ocupação</h1>
          <p className="text-muted-foreground mt-2">
            Visualize a taxa de ocupação da creche e tendências de uso
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex gap-2">
          <Button
            variant={dateRange === "week" ? "default" : "outline"}
            onClick={() => setDateRange("week")}
          >
            Última Semana
          </Button>
          <Button
            variant={dateRange === "month" ? "default" : "outline"}
            onClick={() => setDateRange("month")}
          >
            Último Mês
          </Button>
          <Button
            variant={dateRange === "year" ? "default" : "outline"}
            onClick={() => setDateRange("year")}
          >
            Último Ano
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Check-ins</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCheckIns}</div>
              <p className="text-xs text-muted-foreground mt-1">
                No período selecionado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ocupação Média</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageOccupancy.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Taxa média diária
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pico de Ocupação</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.peakOccupancy}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Maior ocupação registrada
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Estimada</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {(stats.revenue / 100).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Baseado em estadias pagas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Occupancy Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Taxa de Ocupação Diária</CardTitle>
            <CardDescription>
              Visualização da ocupação da creche ao longo do tempo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.dailyData.length > 0 ? (
              <div className="space-y-4">
                {stats.dailyData.map((day: any, index: number) => {
                  const date = new Date(day.date);
                  const formattedDate = date.toLocaleDateString("pt-BR", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  });
                  
                  const occupancyPercent = day.occupancyRate;
                  const barColor = 
                    occupancyPercent >= 80 ? "bg-red-500" :
                    occupancyPercent >= 60 ? "bg-yellow-500" :
                    occupancyPercent >= 40 ? "bg-blue-500" :
                    "bg-green-500";

                  return (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-24 text-sm text-muted-foreground">
                        {formattedDate}
                      </div>
                      <div className="flex-1 bg-muted rounded-full h-8 relative overflow-hidden">
                        <div
                          className={`${barColor} h-full transition-all duration-300 flex items-center justify-end pr-3`}
                          style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                        >
                          <span className="text-xs font-medium text-white">
                            {occupancyPercent.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-16 text-sm font-medium text-right">
                        {day.checkIns} pets
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum dado de ocupação disponível para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Insights e Recomendações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.averageOccupancy < 40 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  💡 Ocupação Baixa
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  A taxa de ocupação está abaixo de 40%. Considere campanhas promocionais ou pacotes especiais para atrair mais clientes.
                </p>
              </div>
            )}
            
            {stats.averageOccupancy >= 80 && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                  ⚠️ Alta Ocupação
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  A creche está operando próxima à capacidade máxima. Considere expandir a capacidade ou ajustar preços.
                </p>
              </div>
            )}

            {stats.peakOccupancy === 100 && (
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                  🚨 Capacidade Máxima Atingida
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  A creche atingiu 100% de ocupação em alguns dias. Isso pode indicar necessidade de expansão ou lista de espera.
                </p>
              </div>
            )}

            {stats.averageOccupancy >= 40 && stats.averageOccupancy < 80 && (
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  ✅ Ocupação Saudável
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  A taxa de ocupação está em um nível saudável, permitindo crescimento sem comprometer a qualidade do serviço.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
