"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertTriangle,
  Clock,
  Timer,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  AlertOctagon,
} from "lucide-react";
import Link from "next/link";
import { format, differenceInDays, parseISO, isToday, isTomorrow, isPast, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// Dados mockados de prazos urgentes
const mockPrazos = [
  { 
    id: 1, 
    assistido: "Diego Bonfim Almeida",
    processo: "8012906-74.2025.8.05.0039",
    ato: "Resposta à Acusação",
    prazo: "2026-01-15",
    status: "2_ATENDER",
    area: "JURI",
    reuPreso: true,
    providencias: "Requerer diligências, verificar câmeras de segurança",
  },
  { 
    id: 4, 
    assistido: "Ana Paula Costa",
    processo: "0009012-34.2025.8.05.0039",
    ato: "Pedido de Relaxamento",
    prazo: "2026-01-14",
    status: "2_ATENDER",
    area: "VIOLENCIA_DOMESTICA",
    reuPreso: true,
    providencias: "Prisão ilegal, prazo expirado",
  },
  { 
    id: 8, 
    assistido: "Lucas Oliveira",
    processo: "0008901-23.2025.8.05.0039",
    ato: "Habeas Corpus",
    prazo: "2026-01-15",
    status: "2_ATENDER",
    area: "JURI",
    reuPreso: true,
    providencias: "Liberdade provisória com medidas",
  },
  { 
    id: 2, 
    assistido: "Maria Silva Santos",
    processo: "0001234-56.2025.8.05.0039",
    ato: "Alegações Finais",
    prazo: "2026-01-16",
    status: "5_FILA",
    area: "JURI",
    reuPreso: false,
    providencias: "Analisar provas, preparar tese de absolvição",
  },
  { 
    id: 7, 
    assistido: "Pedro Santos",
    processo: "0002345-67.2025.8.05.0039",
    ato: "Contrarrazões",
    prazo: "2026-01-17",
    status: "5_FILA",
    area: "EXECUCAO_PENAL",
    reuPreso: false,
    providencias: null,
  },
  { 
    id: 3, 
    assistido: "José Carlos Oliveira",
    processo: "0005678-90.2025.8.05.0039",
    ato: "Agravo em Execução",
    prazo: "2026-01-18",
    status: "4_MONITORAR",
    area: "EXECUCAO_PENAL",
    reuPreso: true,
    providencias: "Aguardando decisão do agravo",
  },
];

function getPrazoInfo(prazoStr: string) {
  const prazo = parseISO(prazoStr);
  const hoje = new Date();
  const dias = differenceInDays(prazo, hoje);
  
  if (isPast(prazo) && !isToday(prazo)) {
    return { 
      text: `Vencido há ${Math.abs(dias)} dia(s)`, 
      className: "text-red-600 bg-red-100 dark:bg-red-900/50 border-red-200", 
      icon: AlertOctagon,
      urgent: true 
    };
  }
  if (isToday(prazo)) {
    return { 
      text: "HOJE", 
      className: "text-red-600 bg-red-100 dark:bg-red-900/50 border-red-200 font-bold", 
      icon: Timer,
      urgent: true 
    };
  }
  if (isTomorrow(prazo)) {
    return { 
      text: "Amanhã", 
      className: "text-orange-600 bg-orange-100 dark:bg-orange-900/50 border-orange-200", 
      icon: Clock,
      urgent: true 
    };
  }
  if (dias <= 3) {
    return { 
      text: `Em ${dias} dias`, 
      className: "text-orange-500 bg-orange-50 dark:bg-orange-900/30 border-orange-100", 
      icon: Clock,
      urgent: false 
    };
  }
  if (dias <= 7) {
    return { 
      text: `Em ${dias} dias`, 
      className: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-100", 
      icon: Calendar,
      urgent: false 
    };
  }
  return { 
    text: format(prazo, "dd/MM/yyyy", { locale: ptBR }), 
    className: "text-muted-foreground bg-slate-50 dark:bg-slate-800 border-slate-100", 
    icon: Calendar,
    urgent: false 
  };
}

function getAreaLabel(area: string) {
  const labels: Record<string, string> = {
    JURI: "Júri",
    EXECUCAO_PENAL: "Exec. Penal",
    VIOLENCIA_DOMESTICA: "Viol. Dom.",
    SUBSTITUICAO: "Substituição",
    CURADORIA: "Curadoria",
  };
  return labels[area] || area;
}

export default function PrazosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [periodoFilter, setPeriodoFilter] = useState("all");

  // Filtrar e ordenar
  const filteredPrazos = mockPrazos
    .filter((prazo) => {
      const matchesSearch = 
        prazo.assistido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prazo.processo.includes(searchTerm) ||
        prazo.ato.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (periodoFilter === "all") return matchesSearch;
      
      const prazoDate = parseISO(prazo.prazo);
      const hoje = new Date();
      
      if (periodoFilter === "vencido") return matchesSearch && isPast(prazoDate) && !isToday(prazoDate);
      if (periodoFilter === "hoje") return matchesSearch && isToday(prazoDate);
      if (periodoFilter === "amanha") return matchesSearch && isTomorrow(prazoDate);
      if (periodoFilter === "semana") return matchesSearch && differenceInDays(prazoDate, hoje) <= 7;
      
      return matchesSearch;
    })
    .sort((a, b) => {
      // Réu preso primeiro
      if (a.reuPreso && !b.reuPreso) return -1;
      if (!a.reuPreso && b.reuPreso) return 1;
      // Depois por prazo
      return new Date(a.prazo).getTime() - new Date(b.prazo).getTime();
    });

  const stats = {
    vencidos: mockPrazos.filter(p => isPast(parseISO(p.prazo)) && !isToday(parseISO(p.prazo))).length,
    hoje: mockPrazos.filter(p => isToday(parseISO(p.prazo))).length,
    amanha: mockPrazos.filter(p => isTomorrow(parseISO(p.prazo))).length,
    semana: mockPrazos.filter(p => {
      const dias = differenceInDays(parseISO(p.prazo), new Date());
      return dias > 1 && dias <= 7;
    }).length,
    reuPreso: mockPrazos.filter(p => p.reuPreso).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prazos Urgentes</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhamento de prazos e demandas urgentes
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className={stats.vencidos > 0 ? "border-red-500 bg-red-50 dark:bg-red-950" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Vencidos</CardTitle>
            <AlertOctagon className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.vencidos}</div>
          </CardContent>
        </Card>
        <Card className={stats.hoje > 0 ? "border-red-400 bg-red-50/50 dark:bg-red-950/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-500">Hoje</CardTitle>
            <Timer className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.hoje}</div>
          </CardContent>
        </Card>
        <Card className={stats.amanha > 0 ? "border-orange-300" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">Amanhã</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.amanha}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos 7 dias</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.semana}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Réu Preso</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.reuPreso}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por assistido, processo ou ato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="vencido">Vencidos</SelectItem>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="amanha">Amanhã</SelectItem>
            <SelectItem value="semana">Próximos 7 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Prazos */}
      <div className="space-y-4">
        {filteredPrazos.map((prazo) => {
          const prazoInfo = getPrazoInfo(prazo.prazo);
          const PrazoIcon = prazoInfo.icon;
          
          return (
            <Card 
              key={prazo.id} 
              className={`hover:shadow-md transition-shadow ${prazo.reuPreso ? "ring-2 ring-red-500/30" : ""} ${prazoInfo.urgent ? "border-l-4 border-l-red-500" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${prazoInfo.className}`}>
                        <PrazoIcon className="h-4 w-4" />
                        {prazoInfo.text}
                      </span>
                      {prazo.reuPreso && (
                        <Badge variant="destructive" className="bg-red-700">RÉU PRESO</Badge>
                      )}
                      <Badge variant="outline">{getAreaLabel(prazo.area)}</Badge>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg">{prazo.ato}</h3>
                      <p className="text-muted-foreground">{prazo.assistido}</p>
                      <p className="text-sm text-muted-foreground font-mono">{prazo.processo}</p>
                    </div>
                    
                    {prazo.providencias && (
                      <p className="text-sm bg-slate-50 dark:bg-slate-900 p-2 rounded">
                        <span className="font-medium">Providências:</span> {prazo.providencias}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Link href={`/admin/demandas/${prazo.id}`}>
                      <Button variant="outline" size="sm" className="gap-1">
                        Ver
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="default" size="sm" className="gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Concluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {filteredPrazos.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Nenhum prazo urgente</p>
              <p className="text-sm text-muted-foreground">Todos os prazos estão em dia!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
