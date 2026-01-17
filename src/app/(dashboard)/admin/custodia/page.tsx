"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Clock,
  User,
  Calendar,
  Scale,
  Gavel,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useAssignment } from "@/contexts/assignment-context";
import { format, parseISO } from "date-fns";

// Dados mockados
const mockCustodias = [
  {
    id: 1,
    assistido: "Carlos Eduardo Lima",
    processo: "0001234-56.2026.8.05.0039",
    dataAudiencia: "2026-01-17T09:00:00",
    local: "CEAC Camaçari",
    crime: "Art. 129 §9º CP",
    resultado: null,
    status: "agendada",
  },
  {
    id: 2,
    assistido: "Pedro Henrique Santos",
    processo: "0005678-90.2026.8.05.0039",
    dataAudiencia: "2026-01-17T14:00:00",
    local: "CEAC Camaçari",
    crime: "Art. 147 CP",
    resultado: null,
    status: "agendada",
  },
  {
    id: 3,
    assistido: "João Paulo Oliveira",
    processo: "0009012-34.2026.8.05.0039",
    dataAudiencia: "2026-01-16T10:00:00",
    local: "CEAC Camaçari",
    crime: "Art. 129 §9º CP",
    resultado: "liberdade_provisoria",
    status: "realizada",
  },
  {
    id: 4,
    assistido: "Roberto Silva",
    processo: "0003456-78.2026.8.05.0039",
    dataAudiencia: "2026-01-16T15:00:00",
    local: "CEAC Camaçari",
    crime: "Art. 213 CP",
    resultado: "prisao_preventiva",
    status: "realizada",
  },
];

const resultadoConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  liberdade_provisoria: { label: "Liberdade Provisória", color: "text-emerald-700", bg: "bg-emerald-100", icon: CheckCircle2 },
  prisao_preventiva: { label: "Prisão Preventiva", color: "text-rose-700", bg: "bg-rose-100", icon: XCircle },
  relaxamento: { label: "Relaxamento", color: "text-blue-700", bg: "bg-blue-100", icon: CheckCircle2 },
};

export default function CustodiaPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { config } = useAssignment();

  const filteredCustodias = mockCustodias.filter(
    (c) =>
      c.assistido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.processo.includes(searchTerm)
  );

  const hoje = filteredCustodias.filter((c) => c.status === "agendada");
  const realizadas = filteredCustodias.filter((c) => c.status === "realizada");

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
            <AlertTriangle className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audiências de Custódia</h1>
            <p className="text-muted-foreground text-sm">
              Flagrantes e análise de prisões
            </p>
          </div>
        </div>
        <Button
          className="gap-2"
          style={{ backgroundColor: config.accentColor }}
        >
          <Plus className="h-4 w-4" />
          Registrar Custódia
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="stat-card">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{hoje.length}</p>
                <p className="text-sm text-muted-foreground">Agendadas Hoje</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {realizadas.filter((c) => c.resultado === "liberdade_provisoria").length}
                </p>
                <p className="text-sm text-muted-foreground">Liberdades</p>
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
                  {realizadas.filter((c) => c.resultado === "prisao_preventiva").length}
                </p>
                <p className="text-sm text-muted-foreground">Preventivas</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-rose-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{mockCustodias.length}</p>
                <p className="text-sm text-muted-foreground">Total Mês</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <Gavel className="h-5 w-5 text-violet-600" />
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
            placeholder="Buscar por assistido ou processo..."
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

      {/* Custódias de Hoje */}
      {hoje.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Audiências de Hoje
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {hoje.map((custodia) => (
              <Card key={custodia.id} className="border-l-4 border-l-amber-400">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{custodia.assistido}</h3>
                      <p className="text-sm font-mono text-muted-foreground">
                        {custodia.processo}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-sm">
                        <Badge variant="secondary">{custodia.crime}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold" style={{ color: config.accentColor }}>
                        {format(parseISO(custodia.dataAudiencia), "HH:mm")}
                      </p>
                      <p className="text-xs text-muted-foreground">{custodia.local}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Histórico */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Histórico Recente</h2>
        <div className="space-y-3">
          {realizadas.map((custodia) => {
            const resultado = custodia.resultado
              ? resultadoConfig[custodia.resultado]
              : null;
            const ResultadoIcon = resultado?.icon || Scale;

            return (
              <Card key={custodia.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{custodia.assistido}</h3>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(custodia.dataAudiencia), "dd/MM/yyyy 'às' HH:mm")}
                        </p>
                      </div>
                    </div>
                    {resultado && (
                      <Badge className={`${resultado.bg} ${resultado.color} border-0`}>
                        <ResultadoIcon className="h-3 w-3 mr-1" />
                        {resultado.label}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
