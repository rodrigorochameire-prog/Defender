"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, 
  ArrowLeft,
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Mock data
const UNIDADES = [
  { id: 1, nome: "Cadeia Pública de Camaçari", capacidade: 150, ocupacao: 245, tendencia: "up" },
  { id: 2, nome: "COP - Centro de Observação Penal", capacidade: 800, ocupacao: 1120, tendencia: "stable" },
  { id: 3, nome: "CPMS - Simões Filho", capacidade: 450, ocupacao: 380, tendencia: "down" },
  { id: 4, nome: "PLB - Lemos Brito", capacidade: 1200, ocupacao: 1450, tendencia: "up" },
  { id: 5, nome: "Presídio Salvador", capacidade: 600, ocupacao: 720, tendencia: "stable" },
];

export default function LotacaoPage() {
  const totalCapacidade = UNIDADES.reduce((acc, u) => acc + u.capacidade, 0);
  const totalOcupacao = UNIDADES.reduce((acc, u) => acc + u.ocupacao, 0);
  const superlotacao = UNIDADES.filter(u => u.ocupacao > u.capacidade).length;

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
          <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 flex-shrink-0">
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-orange-700 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Lotação das Unidades
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 hidden sm:block">
              Capacidade e ocupação atual
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalOcupacao.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Presos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalCapacidade.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Capacidade</p>
          </CardContent>
        </Card>
        <Card className={cn(superlotacao > 0 && "border-rose-200 bg-rose-50/50 dark:bg-rose-950/20")}>
          <CardContent className="pt-4 pb-3 text-center">
            <p className={cn("text-2xl font-bold", superlotacao > 0 ? "text-rose-600" : "text-emerald-600")}>{superlotacao}</p>
            <p className="text-xs text-muted-foreground">Superlotadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Unidades */}
      <div className="space-y-3">
        {UNIDADES.map((unidade) => {
          const percentual = Math.round((unidade.ocupacao / unidade.capacidade) * 100);
          const superlotada = unidade.ocupacao > unidade.capacidade;
          
          return (
            <Card key={unidade.id} className={cn(superlotada && "border-rose-200 dark:border-rose-800")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <p className="font-semibold text-sm">{unidade.nome}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {unidade.tendencia === "up" && <TrendingUp className="w-4 h-4 text-rose-500" />}
                    {unidade.tendencia === "down" && <TrendingDown className="w-4 h-4 text-emerald-500" />}
                    <Badge 
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        superlotada ? "text-rose-600 border-rose-200" : "text-emerald-600 border-emerald-200"
                      )}
                    >
                      {percentual}%
                    </Badge>
                  </div>
                </div>
                
                <Progress 
                  value={Math.min(percentual, 100)} 
                  className={cn("h-2", superlotada && "[&>div]:bg-rose-500")}
                />
                
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {unidade.ocupacao.toLocaleString()} presos
                  </span>
                  <span>Capacidade: {unidade.capacidade.toLocaleString()}</span>
                </div>
                
                {superlotada && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-rose-600">
                    <AlertTriangle className="w-3 h-3" />
                    Excesso de {(unidade.ocupacao - unidade.capacidade).toLocaleString()} presos
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
