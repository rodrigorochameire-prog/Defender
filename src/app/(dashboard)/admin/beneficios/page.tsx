"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Award,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Clock,
  User,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { useAssignment } from "@/contexts/assignment-context";
import { format, differenceInDays, parseISO } from "date-fns";

// Dados mockados
const mockBeneficios = [
  {
    id: 1,
    assistido: "Roberto Silva Santos",
    processo: "0001234-56.2024.8.05.0039",
    tipo: "progressao",
    regimeAtual: "Fechado",
    regimeAlvo: "Semiaberto",
    dataElegibilidade: "2026-01-20",
    status: "elegivel",
    fracao: "1/6",
  },
  {
    id: 2,
    assistido: "Carlos Eduardo Lima",
    processo: "0005678-90.2024.8.05.0039",
    tipo: "livramento",
    regimeAtual: "Semiaberto",
    regimeAlvo: "Liberdade",
    dataElegibilidade: "2026-02-15",
    status: "aguardando",
    fracao: "1/3",
  },
  {
    id: 3,
    assistido: "João Pedro Oliveira",
    processo: "0009012-34.2024.8.05.0039",
    tipo: "saida_temporaria",
    regimeAtual: "Semiaberto",
    regimeAlvo: "Saída",
    dataElegibilidade: "2026-01-10",
    status: "requerido",
    fracao: "1/6",
  },
  {
    id: 4,
    assistido: "Marcos Souza Almeida",
    processo: "0003456-78.2024.8.05.0039",
    tipo: "progressao",
    regimeAtual: "Semiaberto",
    regimeAlvo: "Aberto",
    dataElegibilidade: "2025-12-20",
    status: "deferido",
    fracao: "1/6",
  },
];

const tipoConfig: Record<string, { label: string; color: string; bg: string }> = {
  progressao: { label: "Progressão", color: "text-blue-700", bg: "bg-blue-100" },
  livramento: { label: "Livramento", color: "text-emerald-700", bg: "bg-emerald-100" },
  saida_temporaria: { label: "Saída Temporária", color: "text-amber-700", bg: "bg-amber-100" },
  indulto: { label: "Indulto", color: "text-violet-700", bg: "bg-violet-100" },
  remicao: { label: "Remição", color: "text-teal-700", bg: "bg-teal-100" },
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  elegivel: { label: "Elegível", color: "text-emerald-700", bg: "bg-emerald-100" },
  aguardando: { label: "Aguardando", color: "text-amber-700", bg: "bg-amber-100" },
  requerido: { label: "Requerido", color: "text-blue-700", bg: "bg-blue-100" },
  deferido: { label: "Deferido", color: "text-emerald-700", bg: "bg-emerald-100" },
  indeferido: { label: "Indeferido", color: "text-rose-700", bg: "bg-rose-100" },
};

export default function BeneficiosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { config } = useAssignment();

  const filteredBeneficios = mockBeneficios.filter(
    (b) =>
      b.assistido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.processo.includes(searchTerm)
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
            <Award className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Benefícios</h1>
            <p className="text-muted-foreground text-sm">
              Progressões, livramentos e incidentes
            </p>
          </div>
        </div>
        <Button
          className="gap-2"
          style={{ backgroundColor: config.accentColor }}
        >
          <Plus className="h-4 w-4" />
          Novo Pedido
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="stat-card">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {mockBeneficios.filter((b) => b.status === "elegivel").length}
                </p>
                <p className="text-sm text-muted-foreground">Elegíveis</p>
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
                  {mockBeneficios.filter((b) => b.status === "requerido").length}
                </p>
                <p className="text-sm text-muted-foreground">Requeridos</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {mockBeneficios.filter((b) => b.status === "aguardando").length}
                </p>
                <p className="text-sm text-muted-foreground">Aguardando</p>
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
                  {mockBeneficios.filter((b) => b.status === "deferido").length}
                </p>
                <p className="text-sm text-muted-foreground">Deferidos</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <Award className="h-5 w-5 text-violet-600" />
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

      {/* Lista de Benefícios */}
      <div className="space-y-4">
        {filteredBeneficios.map((beneficio) => {
          const tipo = tipoConfig[beneficio.tipo] || tipoConfig.progressao;
          const status = statusConfig[beneficio.status] || statusConfig.aguardando;
          const diasRestantes = differenceInDays(parseISO(beneficio.dataElegibilidade), new Date());

          return (
            <Card key={beneficio.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: config.accentColorLight }}
                    >
                      <TrendingUp className="h-6 w-6" style={{ color: config.accentColor }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{beneficio.assistido}</h3>
                        <Badge className={`${tipo.bg} ${tipo.color} border-0`}>
                          {tipo.label}
                        </Badge>
                        <Badge className={`${status.bg} ${status.color} border-0`}>
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-sm font-mono text-muted-foreground">
                        {beneficio.processo}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-muted-foreground">
                          {beneficio.regimeAtual} → {beneficio.regimeAlvo}
                        </span>
                        <span className="text-muted-foreground">
                          Fração: {beneficio.fracao}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Data-base</p>
                      <p className="font-medium">
                        {format(parseISO(beneficio.dataElegibilidade), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <Badge
                      className={
                        diasRestantes <= 0
                          ? "bg-emerald-100 text-emerald-700"
                          : diasRestantes <= 30
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-700"
                      }
                    >
                      {diasRestantes <= 0
                        ? "Elegível agora"
                        : `Em ${diasRestantes} dias`}
                    </Badge>
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
