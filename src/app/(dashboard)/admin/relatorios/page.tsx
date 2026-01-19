"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3,
  Download,
  FileText,
  Calendar,
  Users,
  Scale,
  Clock,
  TrendingUp,
} from "lucide-react";

const relatorios = [
  {
    id: 1,
    titulo: "Demandas por Período",
    descricao: "Relatório de demandas recebidas e protocoladas",
    icon: Clock,
    tipo: "mensal",
  },
  {
    id: 2,
    titulo: "Processos por Área",
    descricao: "Distribuição de processos por área de atuação",
    icon: Scale,
    tipo: "geral",
  },
  {
    id: 3,
    titulo: "Assistidos Atendidos",
    descricao: "Número de assistidos por período",
    icon: Users,
    tipo: "mensal",
  },
  {
    id: 4,
    titulo: "Sessões do Júri",
    descricao: "Resultados das sessões do tribunal do júri",
    icon: Calendar,
    tipo: "anual",
  },
  {
    id: 5,
    titulo: "Prazos Cumpridos",
    descricao: "Taxa de cumprimento de prazos",
    icon: TrendingUp,
    tipo: "mensal",
  },
  {
    id: 6,
    titulo: "Audiências Realizadas",
    descricao: "Estatísticas de audiências por tipo",
    icon: Calendar,
    tipo: "mensal",
  },
];

export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground mt-1">
            Estatísticas e relatórios da Defensoria
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demandas/Mês</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-green-600">+12% vs mês anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processos Ativos</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">287</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Cumprimento</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">94%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atendimentos/Mês</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Relatórios Disponíveis
          </CardTitle>
          <CardDescription>
            Selecione um relatório para gerar ou exportar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {relatorios.map((relatorio) => {
              const Icon = relatorio.icon;
              return (
                <Card key={relatorio.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg mt-1">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{relatorio.titulo}</p>
                          <p className="text-sm text-muted-foreground">{relatorio.descricao}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-muted-foreground capitalize">
                        {relatorio.tipo}
                      </span>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Download className="h-3 w-3" />
                        Gerar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
