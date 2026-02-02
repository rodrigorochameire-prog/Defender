"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Award,
  Plus,
  Search,
  ArrowLeft,
  TrendingUp,
  Clock,
  CheckCircle2,
  FileText,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ==========================================
// CONFIGURAÇÕES
// ==========================================

const TIPO_CONFIG: Record<string, { label: string; color: string }> = {
  progressao: { label: "Progressão", color: "text-blue-600" },
  livramento: { label: "Livramento", color: "text-emerald-600" },
  saida_temporaria: { label: "Saída Temporária", color: "text-amber-600" },
  indulto: { label: "Indulto", color: "text-violet-600" },
  remicao: { label: "Remição", color: "text-teal-600" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  elegivel: { label: "Elegível", color: "text-emerald-600" },
  aguardando: { label: "Aguardando", color: "text-amber-600" },
  requerido: { label: "Requerido", color: "text-blue-600" },
  deferido: { label: "Deferido", color: "text-emerald-600" },
  indeferido: { label: "Indeferido", color: "text-rose-600" },
};

export default function BeneficiosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Estado vazio - sem dados mockados
  const beneficios: any[] = [];

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* SUB-HEADER */}
      <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border border-blue-200 dark:border-blue-800">
              <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Painel de Benefícios</h1>
              <p className="text-[10px] text-zinc-500">Progressões, livramentos e incidentes</p>
            </div>
          </div>
          
          <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Novo Pedido
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4">
        {/* Stats Mobile-first */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Elegíveis", value: 0, icon: TrendingUp, color: "text-emerald-600" },
            { label: "Requeridos", value: 0, icon: FileText, color: "text-blue-600" },
            { label: "Aguardando", value: 0, icon: Clock, color: "text-amber-600" },
            { label: "Deferidos", value: 0, icon: CheckCircle2, color: "text-emerald-600" },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="p-4 sm:p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-6 h-6 sm:w-5 sm:h-5", stat.color)} />
                  <div>
                    <p className={cn("text-2xl sm:text-xl font-bold", stat.color)}>{stat.value}</p>
                    <p className="text-xs sm:text-[10px] text-zinc-500 uppercase tracking-wide">{stat.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <Input
              placeholder="Buscar por nome ou processo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
            />
          </div>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-full md:w-40 h-9 text-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="progressao">Progressão</SelectItem>
              <SelectItem value="livramento">Livramento</SelectItem>
              <SelectItem value="saida_temporaria">Saída Temporária</SelectItem>
              <SelectItem value="indulto">Indulto</SelectItem>
              <SelectItem value="remicao">Remição</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-36 h-9 text-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="elegivel">Elegível</SelectItem>
              <SelectItem value="requerido">Requerido</SelectItem>
              <SelectItem value="aguardando">Aguardando</SelectItem>
              <SelectItem value="deferido">Deferido</SelectItem>
              <SelectItem value="indeferido">Indeferido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Estado Vazio */}
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <Award className="w-7 h-7 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Nenhum benefício cadastrado
            </h3>
            <p className="text-sm text-zinc-500 max-w-md mx-auto mb-6">
              Utilize a Calculadora SEEU para identificar elegibilidade e cadastre
              os pedidos de progressão, livramento e outros benefícios.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/admin/calculadoras">
                <Button variant="outline" size="sm" className="h-9">
                  <Calculator className="w-4 h-4 mr-2" />
                  Calculadora SEEU
                </Button>
              </Link>
              <Button size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Pedido
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
