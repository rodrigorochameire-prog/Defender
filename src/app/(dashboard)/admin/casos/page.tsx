"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Briefcase,
  Search,
  Plus,
  ChevronRight,
  Scale,
  Users,
  FileText,
  Calendar,
  Clock,
  Tag,
  Filter,
  LayoutGrid,
  List,
  FolderOpen,
  ExternalLink,
  AlertCircle,
  Lock,
  Unlock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssignment } from "@/contexts/assignment-context";
import Link from "next/link";

// ==========================================
// TIPOS
// ==========================================

interface Caso {
  id: number;
  titulo: string;
  codigo?: string | null;
  atribuicao: string;
  status: string;
  fase?: string | null;
  prioridade: string;
  tags?: string | null; // JSON array
  linkDrive?: string | null;
  defensorNome?: string | null;
  // Contagens
  totalAssistidos: number;
  totalProcessos: number;
  demandasPendentes: number;
  audienciasFuturas: number;
  // Teoria do Caso
  hasTeoriaFatos: boolean;
  hasTeoriaProvas: boolean;
  hasTeoriaDireito: boolean;
  // Assistido principal (primeiro)
  assistidoPrincipal?: {
    nome: string;
    foto?: string | null;
    preso: boolean;
  };
  createdAt: Date;
}

// ==========================================
// CONSTANTES
// ==========================================

const FASES_CASO = {
  INQUERITO: { label: "Inquérito", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", icon: "🔍" },
  INSTRUCAO: { label: "Instrução", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: "⚖️" },
  PLENARIO: { label: "Plenário", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", icon: "🎭" },
  RECURSO: { label: "Recurso", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: "📤" },
  EXECUCAO: { label: "Execução", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", icon: "⏱️" },
  ARQUIVADO: { label: "Arquivado", color: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400", icon: "📁" },
};

const PRIORIDADES = {
  BAIXA: { label: "Baixa", color: "text-zinc-400" },
  NORMAL: { label: "Normal", color: "text-zinc-600 dark:text-zinc-400" },
  ALTA: { label: "Alta", color: "text-amber-600 dark:text-amber-400" },
  URGENTE: { label: "Urgente", color: "text-rose-600 dark:text-rose-400" },
  REU_PRESO: { label: "Réu Preso", color: "text-rose-600 dark:text-rose-400" },
};

// Dados de exemplo
const MOCK_CASOS: Caso[] = [
  {
    id: 1,
    titulo: "Homicídio Qualificado - Operação Reuso",
    codigo: "CASO-2025-001",
    atribuicao: "JURI_CAMACARI",
    status: "ativo",
    fase: "INSTRUCAO",
    prioridade: "REU_PRESO",
    tags: JSON.stringify(["NulidadeBusca", "ExcessoPrazo", "LegitimaDefesa"]),
    linkDrive: "https://drive.google.com/drive/folders/example",
    defensorNome: "Dr. João Silva",
    totalAssistidos: 2,
    totalProcessos: 3,
    demandasPendentes: 4,
    audienciasFuturas: 1,
    hasTeoriaFatos: true,
    hasTeoriaProvas: true,
    hasTeoriaDireito: false,
    assistidoPrincipal: {
      nome: "José Carlos Santos",
      preso: true,
    },
    createdAt: new Date("2025-01-10"),
  },
  {
    id: 2,
    titulo: "Tráfico de Drogas - Bairro Nova Esperança",
    codigo: "CASO-2025-002",
    atribuicao: "SUBSTITUICAO",
    status: "ativo",
    fase: "RECURSO",
    prioridade: "ALTA",
    tags: JSON.stringify(["FlagranteForjado", "ProvaIlicita"]),
    defensorNome: "Dra. Maria Oliveira",
    totalAssistidos: 1,
    totalProcessos: 2,
    demandasPendentes: 2,
    audienciasFuturas: 0,
    hasTeoriaFatos: true,
    hasTeoriaProvas: false,
    hasTeoriaDireito: true,
    assistidoPrincipal: {
      nome: "Pedro Almeida",
      preso: false,
    },
    createdAt: new Date("2025-01-15"),
  },
  {
    id: 3,
    titulo: "Latrocínio Tentado - Posto Central",
    codigo: "CASO-2025-003",
    atribuicao: "JURI_CAMACARI",
    status: "ativo",
    fase: "PLENARIO",
    prioridade: "REU_PRESO",
    tags: JSON.stringify(["Desclassificacao", "RubroQuesito"]),
    defensorNome: "Dr. João Silva",
    totalAssistidos: 1,
    totalProcessos: 1,
    demandasPendentes: 1,
    audienciasFuturas: 1,
    hasTeoriaFatos: true,
    hasTeoriaProvas: true,
    hasTeoriaDireito: true,
    assistidoPrincipal: {
      nome: "Marcos Silva",
      preso: true,
    },
    createdAt: new Date("2024-11-20"),
  },
];

// ==========================================
// COMPONENTE DE CARD DO CASO
// ==========================================

function CasoCard({ caso }: { caso: Caso }) {
  const faseConfig = FASES_CASO[caso.fase as keyof typeof FASES_CASO] || FASES_CASO.INSTRUCAO;
  const prioridadeConfig = PRIORIDADES[caso.prioridade as keyof typeof PRIORIDADES] || PRIORIDADES.NORMAL;
  const tags = caso.tags ? JSON.parse(caso.tags) : [];
  const teoriaCompleta = caso.hasTeoriaFatos && caso.hasTeoriaProvas && caso.hasTeoriaDireito;

  return (
    <Link href={`/admin/casos/${caso.id}`}>
      <Card className={cn(
        "group cursor-pointer transition-all duration-200",
        "bg-white dark:bg-zinc-950",
        "border border-zinc-200 dark:border-zinc-800",
        "hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-lg",
        caso.assistidoPrincipal?.preso 
          ? "border-l-[4px] border-l-rose-500" 
          : "border-l-[4px] border-l-emerald-500"
      )}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {caso.codigo && (
                  <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                    {caso.codigo}
                  </span>
                )}
                <Badge className={cn("text-[10px] px-1.5 py-0", faseConfig.color)}>
                  {faseConfig.icon} {faseConfig.label}
                </Badge>
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {caso.titulo}
              </h3>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
          </div>

          {/* Assistido Principal */}
          {caso.assistidoPrincipal && (
            <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
              <Avatar className={cn(
                "w-8 h-8 ring-2",
                caso.assistidoPrincipal.preso ? "ring-rose-500" : "ring-emerald-500"
              )}>
                <AvatarImage src={caso.assistidoPrincipal.foto || undefined} />
                <AvatarFallback className="text-xs">
                  {caso.assistidoPrincipal.nome.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
                  {caso.assistidoPrincipal.nome}
                </p>
                <div className="flex items-center gap-1">
                  {caso.assistidoPrincipal.preso ? (
                    <>
                      <Lock className="w-3 h-3 text-rose-500" />
                      <span className="text-[10px] text-rose-600 dark:text-rose-400">Preso</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3 h-3 text-emerald-500" />
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Solto</span>
                    </>
                  )}
                </div>
              </div>
              {caso.totalAssistidos > 1 && (
                <Badge variant="secondary" className="text-[10px]">
                  +{caso.totalAssistidos - 1}
                </Badge>
              )}
            </div>
          )}

          {/* Contadores */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-2 rounded bg-zinc-50 dark:bg-zinc-900/50">
                  <Users className="w-4 h-4 mx-auto text-zinc-400 mb-1" />
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    {caso.totalAssistidos}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Assistidos</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-2 rounded bg-zinc-50 dark:bg-zinc-900/50">
                  <Scale className="w-4 h-4 mx-auto text-zinc-400 mb-1" />
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    {caso.totalProcessos}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Processos</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "text-center p-2 rounded",
                  caso.demandasPendentes > 0 
                    ? "bg-amber-50 dark:bg-amber-900/20" 
                    : "bg-zinc-50 dark:bg-zinc-900/50"
                )}>
                  <Clock className={cn(
                    "w-4 h-4 mx-auto mb-1",
                    caso.demandasPendentes > 0 ? "text-amber-500" : "text-zinc-400"
                  )} />
                  <span className={cn(
                    "text-sm font-semibold",
                    caso.demandasPendentes > 0 
                      ? "text-amber-700 dark:text-amber-400" 
                      : "text-zinc-700 dark:text-zinc-300"
                  )}>
                    {caso.demandasPendentes}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Demandas Pendentes</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "text-center p-2 rounded",
                  caso.audienciasFuturas > 0 
                    ? "bg-blue-50 dark:bg-blue-900/20" 
                    : "bg-zinc-50 dark:bg-zinc-900/50"
                )}>
                  <Calendar className={cn(
                    "w-4 h-4 mx-auto mb-1",
                    caso.audienciasFuturas > 0 ? "text-blue-500" : "text-zinc-400"
                  )} />
                  <span className={cn(
                    "text-sm font-semibold",
                    caso.audienciasFuturas > 0 
                      ? "text-blue-700 dark:text-blue-400" 
                      : "text-zinc-700 dark:text-zinc-300"
                  )}>
                    {caso.audienciasFuturas}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Audiências Futuras</TooltipContent>
            </Tooltip>
          </div>

          {/* Teoria do Caso Status */}
          <div className="flex items-center gap-2 mb-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium",
                  teoriaCompleta 
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                )}>
                  <Scale className="w-3 h-3" />
                  Teoria: {[caso.hasTeoriaFatos, caso.hasTeoriaProvas, caso.hasTeoriaDireito].filter(Boolean).length}/3
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    {caso.hasTeoriaFatos ? "✅" : "⬜"} Fatos
                  </div>
                  <div className="flex items-center gap-2">
                    {caso.hasTeoriaProvas ? "✅" : "⬜"} Provas
                  </div>
                  <div className="flex items-center gap-2">
                    {caso.hasTeoriaDireito ? "✅" : "⬜"} Direito
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>

            {caso.linkDrive && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={caso.linkDrive}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium
                      bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400
                      hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    <FolderOpen className="w-3 h-3" />
                    Drive
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>Abrir pasta no Drive</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag: string, idx: number) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className="text-[10px] px-1.5 py-0 border-dashed"
                >
                  #{tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function CasosPage() {
  const { currentAssignment } = useAssignment();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFase, setFilterFase] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredCasos = useMemo(() => {
    return MOCK_CASOS.filter((caso) => {
      // Filtro por workspace
      const matchesWorkspace = 
        currentAssignment === "all" || 
        caso.atribuicao === currentAssignment;

      // Filtro por busca
      const matchesSearch =
        !searchTerm ||
        caso.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caso.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caso.assistidoPrincipal?.nome.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro por fase
      const matchesFase = filterFase === "all" || caso.fase === filterFase;

      // Filtro por status
      const matchesStatus = filterStatus === "all" || caso.status === filterStatus;

      return matchesWorkspace && matchesSearch && matchesFase && matchesStatus;
    });
  }, [currentAssignment, searchTerm, filterFase, filterStatus]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = filteredCasos.length;
    const reuPreso = filteredCasos.filter(c => c.assistidoPrincipal?.preso).length;
    const demandasPendentes = filteredCasos.reduce((acc, c) => acc + c.demandasPendentes, 0);
    const audienciasProximas = filteredCasos.reduce((acc, c) => acc + c.audienciasFuturas, 0);
    return { total, reuPreso, demandasPendentes, audienciasProximas };
  }, [filteredCasos]);

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/30">
              <Briefcase className="w-6 h-6 text-indigo-700 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Casos Ativos
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Gestão inteligente com Teoria do Caso integrada
              </p>
            </div>
          </div>

          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Caso
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 border-0">
            <div className="flex items-center gap-3">
              <Briefcase className="w-5 h-5 text-zinc-500" />
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.total}</p>
                <p className="text-xs text-zinc-500">Casos Ativos</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/30 dark:to-rose-900/20 border-0">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-rose-500" />
              <div>
                <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">{stats.reuPreso}</p>
                <p className="text-xs text-rose-600 dark:text-rose-400">Réus Presos</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-0">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.demandasPendentes}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">Demandas Pendentes</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-0">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.audienciasProximas}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Audiências Próximas</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Buscar por título, código ou assistido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-zinc-950"
            />
          </div>

          <Select value={filterFase} onValueChange={setFilterFase}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Fase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as fases</SelectItem>
              {Object.entries(FASES_CASO).map(([key, val]) => (
                <SelectItem key={key} value={key}>
                  {val.icon} {val.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="suspenso">Suspensos</SelectItem>
              <SelectItem value="arquivado">Arquivados</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={viewMode === "grid" ? "bg-zinc-900 dark:bg-zinc-100" : ""}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Modo Grade</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={viewMode === "list" ? "bg-zinc-900 dark:bg-zinc-100" : ""}
                >
                  <List className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Modo Lista</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCasos.map((caso) => (
              <CasoCard key={caso.id} caso={caso} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50 dark:bg-zinc-900/50">
                  <TableHead className="text-[10px] uppercase text-zinc-500 font-medium">Caso</TableHead>
                  <TableHead className="text-[10px] uppercase text-zinc-500 font-medium">Assistido</TableHead>
                  <TableHead className="text-[10px] uppercase text-zinc-500 font-medium">Fase</TableHead>
                  <TableHead className="text-[10px] uppercase text-zinc-500 font-medium text-center">Processos</TableHead>
                  <TableHead className="text-[10px] uppercase text-zinc-500 font-medium text-center">Demandas</TableHead>
                  <TableHead className="text-[10px] uppercase text-zinc-500 font-medium text-center">Teoria</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCasos.map((caso) => {
                  const faseConfig = FASES_CASO[caso.fase as keyof typeof FASES_CASO] || FASES_CASO.INSTRUCAO;
                  const teoriaCount = [caso.hasTeoriaFatos, caso.hasTeoriaProvas, caso.hasTeoriaDireito].filter(Boolean).length;
                  
                  return (
                    <TableRow 
                      key={caso.id}
                      className={cn(
                        "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50",
                        caso.assistidoPrincipal?.preso && "border-l-[3px] border-l-rose-500"
                      )}
                    >
                      <TableCell>
                        <Link href={`/admin/casos/${caso.id}`} className="block">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400">
                            {caso.titulo}
                          </div>
                          <div className="font-mono text-[10px] text-zinc-400">{caso.codigo}</div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {caso.assistidoPrincipal && (
                          <div className="flex items-center gap-2">
                            <Avatar className={cn(
                              "w-6 h-6 ring-1",
                              caso.assistidoPrincipal.preso ? "ring-rose-500" : "ring-emerald-500"
                            )}>
                              <AvatarFallback className="text-[10px]">
                                {caso.assistidoPrincipal.nome.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">
                              {caso.assistidoPrincipal.nome}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", faseConfig.color)}>
                          {faseConfig.icon} {faseConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {caso.totalProcessos}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-medium",
                          caso.demandasPendentes > 0 
                            ? "text-amber-600 dark:text-amber-400" 
                            : "text-zinc-400"
                        )}>
                          {caso.demandasPendentes}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-medium",
                          teoriaCount === 3 
                            ? "text-emerald-600 dark:text-emerald-400" 
                            : "text-zinc-400"
                        )}>
                          {teoriaCount}/3
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Empty State */}
        {filteredCasos.length === 0 && (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Nenhum caso encontrado
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Crie um novo caso ou ajuste os filtros de busca.
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
