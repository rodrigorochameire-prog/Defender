"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ClipboardCheck, 
  ArrowLeft,
  Search,
  Plus,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Mock data
const INSPECOES = [
  { id: 1, unidade: "Cadeia Pública de Camaçari", data: new Date(2025, 11, 10), status: "CONCLUIDA", pendencias: 0 },
  { id: 2, unidade: "COP - Centro de Observação Penal", data: new Date(2025, 10, 25), status: "PENDENCIAS", pendencias: 3 },
  { id: 3, unidade: "CPMS - Simões Filho", data: new Date(2025, 10, 5), status: "CONCLUIDA", pendencias: 0 },
  { id: 4, unidade: "PLB - Lemos Brito", data: new Date(2025, 9, 20), status: "AGENDADA", pendencias: 0 },
];

export default function InspecoesPage() {
  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/admin/custodia">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </Link>
          <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex-shrink-0">
            <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-700 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Inspeções
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 hidden sm:block">
              Relatórios de condições das unidades
            </p>
          </div>
        </div>

        <Button size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Nova Inspeção</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar unidade..." className="pl-10 h-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Filtros</span>
        </Button>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {INSPECOES.map((inspecao) => (
          <Card key={inspecao.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge 
                      className={cn(
                        "text-xs",
                        inspecao.status === "CONCLUIDA" && "bg-emerald-500 text-white",
                        inspecao.status === "PENDENCIAS" && "bg-amber-500 text-white",
                        inspecao.status === "AGENDADA" && "bg-blue-500 text-white",
                      )}
                    >
                      {inspecao.status === "CONCLUIDA" && <CheckCircle2 className="w-3 h-3 mr-0.5" />}
                      {inspecao.status === "PENDENCIAS" && <AlertTriangle className="w-3 h-3 mr-0.5" />}
                      {inspecao.status === "AGENDADA" && <Calendar className="w-3 h-3 mr-0.5" />}
                      {inspecao.status === "CONCLUIDA" ? "Concluída" : inspecao.status === "PENDENCIAS" ? `${inspecao.pendencias} Pendências` : "Agendada"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <p className="font-semibold text-sm truncate">{inspecao.unidade}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(inspecao.data, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  Ver relatório
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
