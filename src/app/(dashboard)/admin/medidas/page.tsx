"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Shield,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  MapPin,
} from "lucide-react";
import { useAssignment } from "@/contexts/assignment-context";
import { format, differenceInDays, parseISO } from "date-fns";

// Dados mockados
const mockMedidas = [
  {
    id: 1,
    processo: "0001234-56.2025.8.05.0039",
    nomeVitima: "Maria da Silva",
    tipoMedida: "Afastamento do Lar",
    dataDecisao: "2026-01-10",
    dataVencimento: "2026-04-10",
    status: "ativa",
    distanciaMetros: 500,
    assistido: "João Carlos Santos",
  },
  {
    id: 2,
    processo: "0005678-90.2025.8.05.0039",
    nomeVitima: "Ana Paula Costa",
    tipoMedida: "Proibição de Contato",
    dataDecisao: "2026-01-05",
    dataVencimento: "2026-02-05",
    status: "ativa",
    distanciaMetros: null,
    assistido: "Pedro Oliveira Lima",
  },
  {
    id: 3,
    processo: "0009012-34.2024.8.05.0039",
    nomeVitima: "Carla Fernanda Souza",
    tipoMedida: "Proibição de Aproximação",
    dataDecisao: "2025-10-15",
    dataVencimento: "2026-01-15",
    status: "expirada",
    distanciaMetros: 300,
    assistido: "Roberto Almeida Silva",
  },
];

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  ativa: { label: "Ativa", color: "text-emerald-700", bg: "bg-emerald-100", icon: CheckCircle2 },
  expirada: { label: "Expirada", color: "text-slate-600", bg: "bg-slate-100", icon: Clock },
  revogada: { label: "Revogada", color: "text-rose-700", bg: "bg-rose-100", icon: AlertTriangle },
};

export default function MedidasProtetivasPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { config } = useAssignment();

  const filteredMedidas = mockMedidas.filter(
    (m) =>
      m.nomeVitima.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.assistido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.processo.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg"
            style={{
              background: `linear-gradient(145deg, ${config.accentColor}, ${config.accentColorDark})`,
            }}
          >
            <Shield className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Medidas Protetivas</h1>
            <p className="text-muted-foreground text-sm">
              Gestão de MPUs - Lei Maria da Penha
            </p>
          </div>
        </div>
        <Button
          className="gap-2"
          style={{ backgroundColor: config.accentColor }}
        >
          <Plus className="h-4 w-4" />
          Nova Medida
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="stat-card">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{mockMedidas.length}</p>
                <p className="text-sm text-muted-foreground">Total de MPUs</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {mockMedidas.filter((m) => m.status === "ativa").length}
                </p>
                <p className="text-sm text-muted-foreground">Ativas</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {mockMedidas.filter((m) => {
                    const dias = differenceInDays(parseISO(m.dataVencimento), new Date());
                    return dias >= 0 && dias <= 15 && m.status === "ativa";
                  }).length}
                </p>
                <p className="text-sm text-muted-foreground">Vencendo em 15 dias</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {mockMedidas.filter((m) => m.status === "expirada").length}
                </p>
                <p className="text-sm text-muted-foreground">Expiradas</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por vítima, assistido ou processo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtrar
        </Button>
      </div>

      {/* Lista de Medidas */}
      <div className="space-y-4">
        {filteredMedidas.map((medida) => {
          const statusInfo = statusConfig[medida.status] || statusConfig.ativa;
          const diasRestantes = differenceInDays(parseISO(medida.dataVencimento), new Date());
          const StatusIcon = statusInfo.icon;

          return (
            <Card key={medida.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: config.accentColorLight }}
                    >
                      <Shield className="h-6 w-6" style={{ color: config.accentColor }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{medida.tipoMedida}</h3>
                        <Badge className={`${statusInfo.bg} ${statusInfo.color} border-0`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <p className="text-sm font-mono text-muted-foreground">
                        {medida.processo}
                      </p>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <User className="h-3 w-3" />
                          Vítima: {medida.nomeVitima}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <User className="h-3 w-3" />
                          Assistido: {medida.assistido}
                        </span>
                        {medida.distanciaMetros && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {medida.distanciaMetros}m
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Vencimento</p>
                      <p className="font-medium">
                        {format(parseISO(medida.dataVencimento), "dd/MM/yyyy")}
                      </p>
                    </div>
                    {medida.status === "ativa" && (
                      <Badge
                        className={
                          diasRestantes <= 15
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }
                      >
                        {diasRestantes > 0 ? `${diasRestantes} dias restantes` : "Vence hoje"}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
