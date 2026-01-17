"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
            <UserCheck className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Banco de Jurados</h1>
            <p className="text-muted-foreground text-sm">
              Análise e estatísticas de jurados
            </p>
          </div>
        </div>
        <Button
          className="gap-2"
          style={{ backgroundColor: config.accentColor }}
        >
          <Plus className="h-4 w-4" />
          Adicionar Jurado
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="stat-card">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{mockJurados.length}</p>
                <p className="text-sm text-muted-foreground">Total de Jurados</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <User className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {mockJurados.filter((j) => j.perfilTendencia === "condenatorio").length}
                </p>
                <p className="text-sm text-muted-foreground">Perfil Condenatório</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-rose-100 flex items-center justify-center">
                <ThumbsDown className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {mockJurados.filter((j) => j.perfilTendencia === "absolutorio").length}
                </p>
                <p className="text-sm text-muted-foreground">Perfil Absolutório</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <ThumbsUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {mockJurados.reduce((acc, j) => acc + j.totalSessoes, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total de Votos</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-blue-600" />
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
            placeholder="Buscar por nome, profissão ou bairro..."
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

      {/* Lista de Jurados */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredJurados.map((jurado) => {
          const perfil = perfilConfig[jurado.perfilTendencia] || perfilConfig.desconhecido;
          const taxaCondenacao = jurado.totalSessoes > 0
            ? Math.round((jurado.votosCondenacao / jurado.totalSessoes) * 100)
            : 0;

          return (
            <Card key={jurado.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{jurado.nome}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      {jurado.profissao}
                    </p>
                  </div>
                  <Badge className={`${perfil.bg} ${perfil.color} border-0`}>
                    {perfil.label}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {jurado.bairro}
                    </span>
                    <span>{jurado.idade} anos</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Escolaridade</span>
                    <span>{jurado.escolaridade}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-muted-foreground">
                      {jurado.totalSessoes} sessões
                    </span>
                    <span className="text-xs font-medium">
                      {taxaCondenacao}% condenação
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-400 rounded-full"
                      style={{ width: `${taxaCondenacao}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs">
                    <span className="text-rose-600">{jurado.votosCondenacao} cond.</span>
                    <span className="text-emerald-600">{jurado.votosAbsolvicao} abs.</span>
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
