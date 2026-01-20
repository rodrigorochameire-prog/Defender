"use client";

import { useState } from "react";
import { SwissCard, SwissCardContent } from "@/components/shared/swiss-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  User,
  Briefcase,
  MapPin,
} from "lucide-react";
import { useAssignment } from "@/contexts/assignment-context";
import { cn } from "@/lib/utils";

// Dados mockados
const mockJurados = [
  {
    id: 1,
    nome: "Maria Conceição Santos",
    profissao: "Professora",
    escolaridade: "Superior",
    idade: 45,
    bairro: "Centro",
    totalSessoes: 12,
    votosCondenacao: 7,
    votosAbsolvicao: 5,
    perfilTendencia: "neutro",
  },
  {
    id: 2,
    nome: "João Carlos Oliveira",
    profissao: "Comerciante",
    escolaridade: "Médio",
    idade: 52,
    bairro: "Gleba A",
    totalSessoes: 8,
    votosCondenacao: 6,
    votosAbsolvicao: 2,
    perfilTendencia: "condenatorio",
  },
  {
    id: 3,
    nome: "Ana Paula Lima",
    profissao: "Enfermeira",
    escolaridade: "Superior",
    idade: 38,
    bairro: "Vila de Abrantes",
    totalSessoes: 5,
    votosCondenacao: 1,
    votosAbsolvicao: 4,
    perfilTendencia: "absolutorio",
  },
  {
    id: 4,
    nome: "Roberto Almeida",
    profissao: "Aposentado",
    escolaridade: "Fundamental",
    idade: 67,
    bairro: "Phoc II",
    totalSessoes: 15,
    votosCondenacao: 10,
    votosAbsolvicao: 5,
    perfilTendencia: "condenatorio",
  },
];

const perfilConfig: Record<string, { label: string; color: string; bg: string }> = {
  condenatorio: { label: "Condenatório", color: "text-rose-700", bg: "bg-rose-100" },
  absolutorio: { label: "Absolutório", color: "text-emerald-700", bg: "bg-emerald-100" },
  neutro: { label: "Neutro", color: "text-slate-700", bg: "bg-slate-100" },
  desconhecido: { label: "Desconhecido", color: "text-gray-500", bg: "bg-gray-100" },
};

export default function JuradosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { config } = useAssignment();

  const filteredJurados = mockJurados.filter(
    (j) =>
      j.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.profissao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.bairro.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      {/* Header - Padrão Swiss */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Banco de Jurados</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Análise e estatísticas de jurados
            </p>
          </div>
        </div>
        <Button className="gap-2 h-9">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Adicionar Jurado</span>
          <span className="sm:hidden">Adicionar</span>
        </Button>
      </div>

      {/* Stats - Padrão Swiss */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <SwissCard className="border-l-[3px] border-l-slate-500 dark:border-l-slate-400">
          <SwissCardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-bold">{mockJurados.length}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Total de Jurados</p>
              </div>
              <div className="hidden sm:flex h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 items-center justify-center">
                <User className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
          </SwissCardContent>
        </SwissCard>
        <SwissCard className="border-l-[3px] border-l-rose-500 dark:border-l-rose-400">
          <SwissCardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-bold">
                  {mockJurados.filter((j) => j.perfilTendencia === "condenatorio").length}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Condenatório</p>
              </div>
              <div className="hidden sm:flex h-10 w-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 items-center justify-center">
                <ThumbsDown className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </SwissCardContent>
        </SwissCard>
        <SwissCard className="border-l-[3px] border-l-emerald-500 dark:border-l-emerald-400">
          <SwissCardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-bold">
                  {mockJurados.filter((j) => j.perfilTendencia === "absolutorio").length}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Absolutório</p>
              </div>
              <div className="hidden sm:flex h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center">
                <ThumbsUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </SwissCardContent>
        </SwissCard>
        <SwissCard className="border-l-[3px] border-l-blue-500 dark:border-l-blue-400">
          <SwissCardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-bold">
                  {mockJurados.reduce((acc, j) => acc + j.totalSessoes, 0)}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Total de Votos</p>
              </div>
              <div className="hidden sm:flex h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 items-center justify-center">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </SwissCardContent>
        </SwissCard>
      </div>

      {/* Search - Padrão Swiss */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, profissão ou bairro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
        <Button variant="outline" className="gap-2 h-9">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filtrar</span>
        </Button>
      </div>

      {/* Lista de Jurados - Padrão Swiss */}
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredJurados.map((jurado) => {
          const perfil = perfilConfig[jurado.perfilTendencia] || perfilConfig.desconhecido;
          const taxaCondenacao = jurado.totalSessoes > 0
            ? Math.round((jurado.votosCondenacao / jurado.totalSessoes) * 100)
            : 0;

          return (
            <SwissCard
              key={jurado.id}
              className={cn(
                "transition-all duration-200 hover:shadow-md cursor-pointer group",
                "border-l-[3px]",
                jurado.perfilTendencia === "condenatorio" && "border-l-rose-500 dark:border-l-rose-400",
                jurado.perfilTendencia === "absolutorio" && "border-l-emerald-500 dark:border-l-emerald-400",
                jurado.perfilTendencia === "neutro" && "border-l-slate-400 dark:border-l-slate-500"
              )}
            >
              <SwissCardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm sm:text-base truncate">{jurado.nome}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Briefcase className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{jurado.profissao}</span>
                    </p>
                  </div>
                  <Badge className={cn("text-xs sm:text-xs border-0 ml-2 flex-shrink-0", perfil.bg, perfil.color)}>
                    {perfil.label}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {jurado.bairro}
                    </span>
                    <span className="font-mono">{jurado.idade} anos</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Escolaridade</span>
                    <span>{jurado.escolaridade}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs sm:text-xs text-muted-foreground">
                      {jurado.totalSessoes} sessões
                    </span>
                    <span className="text-xs sm:text-xs font-medium font-mono">
                      {taxaCondenacao}% condenação
                    </span>
                  </div>
                  <div className="h-1.5 sm:h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-400 dark:bg-rose-500 rounded-full transition-all"
                      style={{ width: `${taxaCondenacao}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs sm:text-xs font-mono">
                    <span className="text-rose-600 dark:text-rose-400">{jurado.votosCondenacao} cond.</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{jurado.votosAbsolvicao} abs.</span>
                  </div>
                </div>
              </SwissCardContent>
            </SwissCard>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredJurados.length === 0 && (
        <SwissCard className="border-dashed">
          <SwissCardContent className="text-center py-12">
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
              <UserCheck className="w-6 h-6 text-blue-500" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhum jurado encontrado</p>
          </SwissCardContent>
        </SwissCard>
      )}
    </div>
  );
}
