"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  History, 
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  Gavel,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Mock data
const HISTORICO = [
  { id: 1, data: new Date(2025, 11, 15), reu: "Carlos Eduardo Santos", resultado: "ABSOLVIDO", crime: "Homicídio Simples" },
  { id: 2, data: new Date(2025, 10, 28), reu: "Pedro Henrique Silva", resultado: "CONDENADO", crime: "Homicídio Qualificado" },
  { id: 3, data: new Date(2025, 10, 10), reu: "Lucas Ferreira", resultado: "ABSOLVIDO", crime: "Tentativa de Homicídio" },
  { id: 4, data: new Date(2025, 9, 22), reu: "André Costa", resultado: "DESCLASSIFICADO", crime: "Homicídio Qualificado" },
  { id: 5, data: new Date(2025, 9, 5), reu: "Marcos Oliveira", resultado: "CONDENADO", crime: "Homicídio Simples" },
];

export default function HistoricoJuriPage() {
  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* SUB-HEADER - Padrão Defender */}
      <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/admin/juri">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center border border-zinc-300 dark:border-zinc-700">
              <History className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Histórico de Plenários</h1>
              <p className="text-[10px] text-zinc-500">Sessões realizadas e resultados</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4">

      {/* Filtros */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por réu..." className="pl-10 h-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Filtros</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">12</p>
            <p className="text-xs text-muted-foreground">Absolvições</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-rose-600">8</p>
            <p className="text-xs text-muted-foreground">Condenações</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-amber-600">3</p>
            <p className="text-xs text-muted-foreground">Desclassificações</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {HISTORICO.map((sessao) => (
          <Card key={sessao.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge 
                      className={cn(
                        "text-xs",
                        sessao.resultado === "ABSOLVIDO" && "bg-emerald-500 text-white",
                        sessao.resultado === "CONDENADO" && "bg-rose-500 text-white",
                        sessao.resultado === "DESCLASSIFICADO" && "bg-amber-500 text-white",
                      )}
                    >
                      {sessao.resultado === "ABSOLVIDO" && <CheckCircle2 className="w-3 h-3 mr-0.5" />}
                      {sessao.resultado === "CONDENADO" && <XCircle className="w-3 h-3 mr-0.5" />}
                      {sessao.resultado}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(sessao.data, "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="font-semibold text-sm truncate">{sessao.reu}</p>
                  <p className="text-xs text-muted-foreground">{sessao.crime}</p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/admin/juri/${sessao.id}`}>
                    Ver detalhes
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      </div>
    </div>
  );
}
