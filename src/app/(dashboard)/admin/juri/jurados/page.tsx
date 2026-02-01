"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  Plus,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Scale,
  ChevronRight,
  BarChart3,
  History,
  ArrowLeft,
  LayoutGrid,
  List,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TIPOS
// ============================================
interface JuradoPerfil {
  id: number;
  nome: string;
  genero: "M" | "F";
  idade?: number;
  profissao?: string;
  perfilDominante?: "empatico" | "analitico" | "autoritario" | "conciliador" | "impulsivo";
  totalSessoes: number;
  absolvicoes: number;
  condenacoes: number;
  taxaAbsolvicao: number;
  confiabilidadePerfil: "alta" | "media" | "baixa";
}

// Dados mockados
const juradosMock: JuradoPerfil[] = [
  { id: 1, nome: "Maria Helena Silva", genero: "F", idade: 52, profissao: "Professora Universitária", perfilDominante: "analitico", totalSessoes: 8, absolvicoes: 6, condenacoes: 2, taxaAbsolvicao: 75, confiabilidadePerfil: "alta" },
  { id: 2, nome: "José Carlos Mendes", genero: "M", idade: 61, profissao: "Empresário", perfilDominante: "autoritario", totalSessoes: 12, absolvicoes: 3, condenacoes: 9, taxaAbsolvicao: 25, confiabilidadePerfil: "alta" },
  { id: 3, nome: "Ana Paula Ferreira", genero: "F", idade: 38, profissao: "Enfermeira", perfilDominante: "empatico", totalSessoes: 5, absolvicoes: 4, condenacoes: 1, taxaAbsolvicao: 80, confiabilidadePerfil: "media" },
  { id: 4, nome: "Pedro Henrique Costa", genero: "M", idade: 45, profissao: "Engenheiro Civil", perfilDominante: "analitico", totalSessoes: 6, absolvicoes: 3, condenacoes: 3, taxaAbsolvicao: 50, confiabilidadePerfil: "media" },
  { id: 5, nome: "Lucia Menezes", genero: "F", idade: 55, profissao: "Comerciante", perfilDominante: "conciliador", totalSessoes: 10, absolvicoes: 6, condenacoes: 4, taxaAbsolvicao: 60, confiabilidadePerfil: "alta" },
  { id: 6, nome: "Roberto Almeida Junior", genero: "M", idade: 58, profissao: "Militar Reformado", perfilDominante: "autoritario", totalSessoes: 15, absolvicoes: 4, condenacoes: 11, taxaAbsolvicao: 27, confiabilidadePerfil: "alta" },
  { id: 7, nome: "Juliana Ribeiro Melo", genero: "F", idade: 34, profissao: "Assistente Social", perfilDominante: "empatico", totalSessoes: 7, absolvicoes: 6, condenacoes: 1, taxaAbsolvicao: 86, confiabilidadePerfil: "alta" },
];

// ============================================
// HELPERS
// ============================================
function getTendenciaIndicator(taxa: number) {
  if (taxa >= 60) return { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" };
  if (taxa >= 40) return { icon: Scale, color: "text-zinc-500", bg: "bg-zinc-100 dark:bg-zinc-800" };
  return { icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-900/20" };
}

function getPerfilLabel(perfil?: string) {
  const labels: Record<string, string> = {
    empatico: "Empático",
    analitico: "Analítico", 
    autoritario: "Autoritário",
    conciliador: "Conciliador",
    impulsivo: "Impulsivo",
  };
  return labels[perfil || ""] || "—";
}

// ============================================
// COMPONENTE: Stats Compactos
// ============================================
function StatsBar({ jurados }: { jurados: JuradoPerfil[] }) {
  const stats = useMemo(() => {
    const total = jurados.length;
    const favoraveis = jurados.filter(j => j.taxaAbsolvicao >= 60).length;
    const neutros = jurados.filter(j => j.taxaAbsolvicao >= 40 && j.taxaAbsolvicao < 60).length;
    const desfavoraveis = jurados.filter(j => j.taxaAbsolvicao < 40).length;
    const media = total > 0 ? Math.round(jurados.reduce((acc, j) => acc + j.taxaAbsolvicao, 0) / total) : 0;
    const sessoes = jurados.reduce((acc, j) => acc + j.totalSessoes, 0);
    return { total, favoraveis, neutros, desfavoraveis, media, sessoes };
  }, [jurados]);

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
      {[
        { label: "Total", value: stats.total, icon: Users, color: "text-zinc-600" },
        { label: "Favoráveis", value: stats.favoraveis, icon: TrendingUp, color: "text-emerald-600" },
        { label: "Neutros", value: stats.neutros, icon: Scale, color: "text-zinc-500" },
        { label: "Desfavoráveis", value: stats.desfavoraveis, icon: TrendingDown, color: "text-rose-600" },
        { label: "Média", value: `${stats.media}%`, icon: BarChart3, color: "text-blue-600" },
        { label: "Sessões", value: stats.sessoes, icon: History, color: "text-violet-600" },
      ].map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Icon className={cn("w-4 h-4", stat.color)} />
              <div>
                <p className={cn("text-lg font-bold", stat.color)}>{stat.value}</p>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wide">{stat.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// COMPONENTE: Card Compacto do Jurado
// ============================================
function JuradoCardCompact({ jurado }: { jurado: JuradoPerfil }) {
  const tendencia = getTendenciaIndicator(jurado.taxaAbsolvicao);
  const TendIcon = tendencia.icon;

  return (
    <Link href={`/admin/juri/jurados/${jurado.id}`}>
      <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all group">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarFallback className="text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {jurado.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate group-hover:text-blue-600 transition-colors">
              {jurado.nome}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="truncate">{jurado.profissao}</span>
              {jurado.idade && <span>• {jurado.idade}a</span>}
            </div>
          </div>

          {/* Perfil */}
          <div className="hidden sm:block text-[10px] text-zinc-500 text-right w-20">
            {getPerfilLabel(jurado.perfilDominante)}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-[11px]">
            <div className="text-center w-12">
              <p className="font-semibold text-zinc-700 dark:text-zinc-300">{jurado.totalSessoes}</p>
              <p className="text-[9px] text-zinc-400">sessões</p>
            </div>
            <div className="text-center w-10">
              <p className="font-semibold text-emerald-600">{jurado.absolvicoes}</p>
              <p className="text-[9px] text-zinc-400">abs</p>
            </div>
            <div className="text-center w-10">
              <p className="font-semibold text-rose-600">{jurado.condenacoes}</p>
              <p className="text-[9px] text-zinc-400">cond</p>
            </div>
          </div>

          {/* Taxa */}
          <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md", tendencia.bg)}>
            <TendIcon className={cn("w-3.5 h-3.5", tendencia.color)} />
            <span className={cn("text-sm font-bold", tendencia.color)}>{jurado.taxaAbsolvicao}%</span>
          </div>

          <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
        </div>
      </div>
    </Link>
  );
}

// ============================================
// COMPONENTE: Card Grid (mais visual)
// ============================================
function JuradoCardGrid({ jurado }: { jurado: JuradoPerfil }) {
  const tendencia = getTendenciaIndicator(jurado.taxaAbsolvicao);
  const TendIcon = tendencia.icon;

  return (
    <Link href={`/admin/juri/jurados/${jurado.id}`}>
      <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 hover:shadow-sm transition-all group">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-sm font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {jurado.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 transition-colors">
                {jurado.nome.split(" ").slice(0, 2).join(" ")}
              </p>
              <p className="text-[11px] text-zinc-500 truncate max-w-[140px]">{jurado.profissao}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[9px] h-5 px-1.5 text-zinc-500 border-zinc-200">
            {getPerfilLabel(jurado.perfilDominante)}
          </Badge>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-[11px] mb-3">
          <div className="flex items-center gap-4">
            <span className="text-zinc-500">{jurado.totalSessoes} sessões</span>
            <span className="text-emerald-600">{jurado.absolvicoes} abs</span>
            <span className="text-rose-600">{jurado.condenacoes} cond</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md", tendencia.bg)}>
            <TendIcon className={cn("w-3.5 h-3.5", tendencia.color)} />
            <span className={cn("text-sm font-bold", tendencia.color)}>{jurado.taxaAbsolvicao}%</span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-[10px] text-zinc-500 hover:text-blue-600">
            <Eye className="w-3 h-3 mr-1" />
            Ver perfil
          </Button>
        </div>
      </div>
    </Link>
  );
}

// ============================================
// PÁGINA PRINCIPAL
// ============================================
export default function JuradosPage() {
  const [busca, setBusca] = useState("");
  const [filtroTendencia, setFiltroTendencia] = useState<string>("todos");
  const [filtroPerfil, setFiltroPerfil] = useState<string>("todos");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const juradosFiltrados = useMemo(() => {
    return juradosMock.filter((j) => {
      const matchBusca = j.nome.toLowerCase().includes(busca.toLowerCase()) ||
        j.profissao?.toLowerCase().includes(busca.toLowerCase());
      
      const matchTendencia = filtroTendencia === "todos" ||
        (filtroTendencia === "favoravel" && j.taxaAbsolvicao >= 60) ||
        (filtroTendencia === "neutro" && j.taxaAbsolvicao >= 40 && j.taxaAbsolvicao < 60) ||
        (filtroTendencia === "desfavoravel" && j.taxaAbsolvicao < 40);
      
      const matchPerfil = filtroPerfil === "todos" || j.perfilDominante === filtroPerfil;

      return matchBusca && matchTendencia && matchPerfil;
    });
  }, [busca, filtroTendencia, filtroPerfil]);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* SUB-HEADER */}
      <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/admin/juri">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <Users className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Banco de Jurados</h1>
              <p className="text-[10px] text-zinc-500">Análise comportamental</p>
            </div>
          </div>
          
          <Button size="sm" className="h-8 text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Novo Jurado
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4">
        {/* Stats */}
        <StatsBar jurados={juradosMock} />

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <Input
              placeholder="Buscar por nome ou profissão..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 h-9 text-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
            />
          </div>
          <Select value={filtroTendencia} onValueChange={setFiltroTendencia}>
            <SelectTrigger className="w-full md:w-40 h-9 text-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <SelectValue placeholder="Tendência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="favoravel">Favoráveis</SelectItem>
              <SelectItem value="neutro">Neutros</SelectItem>
              <SelectItem value="desfavoravel">Desfavoráveis</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroPerfil} onValueChange={setFiltroPerfil}>
            <SelectTrigger className="w-full md:w-36 h-9 text-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <SelectValue placeholder="Perfil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="empatico">Empático</SelectItem>
              <SelectItem value="analitico">Analítico</SelectItem>
              <SelectItem value="autoritario">Autoritário</SelectItem>
              <SelectItem value="conciliador">Conciliador</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "px-2.5 py-1.5 rounded-md transition-all",
                viewMode === "list" ? "bg-zinc-100 dark:bg-zinc-800" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "px-2.5 py-1.5 rounded-md transition-all",
                viewMode === "grid" ? "bg-zinc-100 dark:bg-zinc-800" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lista/Grid */}
        {viewMode === "list" ? (
          <div className="space-y-2">
            {juradosFiltrados.map((jurado) => (
              <JuradoCardCompact key={jurado.id} jurado={jurado} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {juradosFiltrados.map((jurado) => (
              <JuradoCardGrid key={jurado.id} jurado={jurado} />
            ))}
          </div>
        )}

        {juradosFiltrados.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-10 h-10 mx-auto mb-3 text-zinc-300" />
            <p className="text-sm text-zinc-500">Nenhum jurado encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
