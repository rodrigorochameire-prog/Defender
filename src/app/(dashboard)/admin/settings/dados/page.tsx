"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Database,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  Search,
  Filter,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  HardDrive,
  Users,
  FileText,
  Scale,
  Gavel,
  BarChart3,
  TrendingUp,
  Loader2,
  Eye,
  Beaker,
  Sparkles,
  Settings,
  ChevronRight,
  ArrowUpDown,
  Play,
  Pause,
  RotateCcw,
  Shield,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, subDays, subHours, subMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

// ============================================
// TIPOS E DADOS MOCKADOS
// ============================================

interface DataRecord {
  id: string;
  tabela: string;
  tipo: "real" | "mock" | "seed" | "teste";
  origem: "manual" | "api" | "importacao" | "sistema" | "mock";
  criadoEm: Date;
  atualizadoEm: Date;
  descricao: string;
  registros: number;
}

interface ActivityLog {
  id: string;
  tipo: "criacao" | "atualizacao" | "exclusao" | "importacao" | "exportacao";
  tabela: string;
  quantidade: number;
  usuario: string;
  timestamp: Date;
  status: "sucesso" | "erro" | "pendente";
  detalhes?: string;
}

// Dados mockados para demonstração
const MOCK_TABLES: DataRecord[] = [
  { id: "1", tabela: "assistidos", tipo: "real", origem: "manual", criadoEm: subDays(new Date(), 30), atualizadoEm: subHours(new Date(), 2), descricao: "Cadastro de assistidos", registros: 156 },
  { id: "2", tabela: "processos", tipo: "real", origem: "api", criadoEm: subDays(new Date(), 25), atualizadoEm: subHours(new Date(), 5), descricao: "Processos judiciais", registros: 89 },
  { id: "3", tabela: "jurados", tipo: "mock", origem: "mock", criadoEm: subDays(new Date(), 7), atualizadoEm: subDays(new Date(), 1), descricao: "Banco de jurados (dados de teste)", registros: 45 },
  { id: "4", tabela: "sessoes_juri", tipo: "mock", origem: "mock", criadoEm: subDays(new Date(), 5), atualizadoEm: subDays(new Date(), 2), descricao: "Sessões do júri (dados de teste)", registros: 12 },
  { id: "5", tabela: "demandas", tipo: "real", origem: "manual", criadoEm: subDays(new Date(), 20), atualizadoEm: subMinutes(new Date(), 30), descricao: "Demandas ativas", registros: 234 },
  { id: "6", tabela: "audiencias", tipo: "seed", origem: "sistema", criadoEm: subDays(new Date(), 15), atualizadoEm: subHours(new Date(), 12), descricao: "Audiências agendadas", registros: 67 },
  { id: "7", tabela: "documentos", tipo: "real", origem: "importacao", criadoEm: subDays(new Date(), 10), atualizadoEm: subHours(new Date(), 1), descricao: "Documentos anexados", registros: 412 },
  { id: "8", tabela: "usuarios", tipo: "seed", origem: "sistema", criadoEm: subDays(new Date(), 60), atualizadoEm: subDays(new Date(), 3), descricao: "Usuários do sistema", registros: 8 },
  { id: "9", tabela: "atendimentos", tipo: "teste", origem: "mock", criadoEm: subDays(new Date(), 3), atualizadoEm: subHours(new Date(), 6), descricao: "Atendimentos (teste)", registros: 23 },
  { id: "10", tabela: "prazos", tipo: "real", origem: "api", criadoEm: subDays(new Date(), 12), atualizadoEm: subMinutes(new Date(), 45), descricao: "Prazos processuais", registros: 178 },
];

const ACTIVITY_LOGS: ActivityLog[] = [
  { id: "1", tipo: "criacao", tabela: "assistidos", quantidade: 3, usuario: "Dr. Silva", timestamp: subMinutes(new Date(), 15), status: "sucesso" },
  { id: "2", tipo: "importacao", tabela: "processos", quantidade: 12, usuario: "Sistema", timestamp: subHours(new Date(), 1), status: "sucesso" },
  { id: "3", tipo: "atualizacao", tabela: "jurados", quantidade: 5, usuario: "Dra. Santos", timestamp: subHours(new Date(), 2), status: "sucesso" },
  { id: "4", tipo: "exclusao", tabela: "atendimentos", quantidade: 2, usuario: "Admin", timestamp: subHours(new Date(), 3), status: "sucesso", detalhes: "Registros de teste removidos" },
  { id: "5", tipo: "criacao", tabela: "demandas", quantidade: 1, usuario: "Dr. Oliveira", timestamp: subHours(new Date(), 4), status: "sucesso" },
  { id: "6", tipo: "exportacao", tabela: "audiencias", quantidade: 45, usuario: "Sistema", timestamp: subHours(new Date(), 6), status: "sucesso" },
  { id: "7", tipo: "criacao", tabela: "documentos", quantidade: 8, usuario: "Dra. Costa", timestamp: subHours(new Date(), 8), status: "erro", detalhes: "Falha no upload de 2 arquivos" },
  { id: "8", tipo: "atualizacao", tabela: "prazos", quantidade: 15, usuario: "Sistema", timestamp: subHours(new Date(), 12), status: "sucesso" },
];

// ============================================
// COMPONENTES
// ============================================

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color,
  subtitle,
}: { 
  label: string; 
  value: number | string; 
  icon: React.ElementType; 
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
        {subtitle && <p className="text-[10px] text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function TableRow({ 
  record, 
  selected,
  onSelect,
  onView,
}: { 
  record: DataRecord;
  selected: boolean;
  onSelect: () => void;
  onView: () => void;
}) {
  const tipoConfig: Record<string, { label: string; color: string }> = {
    real: { label: "Produção", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    mock: { label: "Mock", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    seed: { label: "Seed", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    teste: { label: "Teste", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  };

  const origemConfig: Record<string, { label: string; icon: React.ElementType }> = {
    manual: { label: "Manual", icon: Users },
    api: { label: "API", icon: Zap },
    importacao: { label: "Import", icon: Download },
    sistema: { label: "Sistema", icon: Settings },
    mock: { label: "Mock", icon: Beaker },
  };

  const tipo = tipoConfig[record.tipo];
  const origem = origemConfig[record.origem];

  return (
    <div className={cn(
      "flex items-center gap-4 px-4 py-3 transition-all",
      "border-b border-zinc-100 dark:border-zinc-800 last:border-0",
      selected ? "bg-amber-50 dark:bg-amber-900/10" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
    )}>
      <Checkbox checked={selected} onCheckedChange={onSelect} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 font-mono">
            {record.tabela}
          </span>
          <Badge className={cn("text-[10px] px-1.5", tipo.color)}>
            {tipo.label}
          </Badge>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">{record.descricao}</p>
      </div>

      <div className="hidden md:flex items-center gap-1 text-xs text-zinc-500">
        <origem.icon className="w-3 h-3" />
        {origem.label}
      </div>

      <div className="text-right hidden sm:block">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {record.registros.toLocaleString()}
        </p>
        <p className="text-[10px] text-zinc-400">registros</p>
      </div>

      <div className="text-right hidden lg:block">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {format(record.atualizadoEm, "dd/MM/yy HH:mm", { locale: ptBR })}
        </p>
        <p className="text-[10px] text-zinc-400">última atualização</p>
      </div>

      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onView}>
        <Eye className="w-4 h-4 text-zinc-400" />
      </Button>
    </div>
  );
}

function ActivityItem({ log }: { log: ActivityLog }) {
  const tipoConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    criacao: { label: "Criação", icon: Sparkles, color: "text-emerald-500" },
    atualizacao: { label: "Atualização", icon: RefreshCw, color: "text-blue-500" },
    exclusao: { label: "Exclusão", icon: Trash2, color: "text-rose-500" },
    importacao: { label: "Importação", icon: Download, color: "text-amber-500" },
    exportacao: { label: "Exportação", icon: Upload, color: "text-purple-500" },
  };

  const statusConfig: Record<string, { icon: React.ElementType; color: string }> = {
    sucesso: { icon: CheckCircle2, color: "text-emerald-500" },
    erro: { icon: XCircle, color: "text-rose-500" },
    pendente: { icon: Clock, color: "text-amber-500" },
  };

  const tipo = tipoConfig[log.tipo];
  const status = statusConfig[log.status];

  return (
    <div className="flex items-start gap-3 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-100 dark:bg-zinc-800", tipo.color)}>
        <tipo.icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {tipo.label}
          </span>
          <span className="text-xs text-zinc-500">em</span>
          <span className="text-sm font-mono text-zinc-600 dark:text-zinc-400">{log.tabela}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-zinc-500">
            {log.quantidade} registro{log.quantidade > 1 ? "s" : ""} • {log.usuario}
          </span>
          {log.detalhes && (
            <span className="text-xs text-zinc-400">• {log.detalhes}</span>
          )}
        </div>
        <p className="text-[10px] text-zinc-400 mt-1">
          {format(log.timestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>
      <status.icon className={cn("w-4 h-4", status.color)} />
    </div>
  );
}

// ============================================
// PÁGINA PRINCIPAL
// ============================================

export default function DataManagementPage() {
  const [activeTab, setActiveTab] = useState("visao-geral");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterOrigem, setFilterOrigem] = useState<string>("all");
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Estatísticas
  const stats = useMemo(() => {
    const totalRegistros = MOCK_TABLES.reduce((acc, t) => acc + t.registros, 0);
    const mockRegistros = MOCK_TABLES.filter(t => t.tipo === "mock" || t.tipo === "teste").reduce((acc, t) => acc + t.registros, 0);
    const realRegistros = MOCK_TABLES.filter(t => t.tipo === "real").reduce((acc, t) => acc + t.registros, 0);
    
    return {
      tabelas: MOCK_TABLES.length,
      totalRegistros,
      mockRegistros,
      realRegistros,
      atividadesHoje: ACTIVITY_LOGS.filter(l => l.timestamp > subHours(new Date(), 24)).length,
    };
  }, []);

  // Filtragem
  const filteredRecords = useMemo(() => {
    return MOCK_TABLES.filter(record => {
      const matchSearch = record.tabela.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.descricao.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTipo = filterTipo === "all" || record.tipo === filterTipo;
      const matchOrigem = filterOrigem === "all" || record.origem === filterOrigem;
      
      let matchDate = true;
      if (dateFrom) {
        matchDate = matchDate && record.criadoEm >= new Date(dateFrom);
      }
      if (dateTo) {
        matchDate = matchDate && record.criadoEm <= new Date(dateTo);
      }
      
      return matchSearch && matchTipo && matchOrigem && matchDate;
    });
  }, [searchTerm, filterTipo, filterOrigem, dateFrom, dateTo]);

  // Handlers
  const handleSelectAll = () => {
    if (selectedRecords.length === filteredRecords.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(filteredRecords.map(r => r.id));
    }
  };

  const handleDeleteSelected = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`${selectedRecords.length} registro(s) removido(s) com sucesso`);
      setSelectedRecords([]);
    } catch (error) {
      toast.error("Erro ao remover registros");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateMockData = async (tabela: string, quantidade: number) => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`${quantidade} registros de teste criados em ${tabela}`);
    } catch (error) {
      toast.error("Erro ao gerar dados de teste");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCleanMockData = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success("Todos os dados mockados foram removidos");
    } catch (error) {
      toast.error("Erro ao limpar dados mockados");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Gerenciamento de Dados
              </h1>
              <p className="text-xs text-zinc-500">
                Monitor, gerencie e administre os dados do sistema
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Exportar
            </Button>
            <Button variant="outline" size="sm" className="h-8">
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Importar
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 md:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            label="Tabelas"
            value={stats.tabelas}
            icon={Database}
            color="bg-violet-500"
          />
          <StatCard
            label="Total de Registros"
            value={stats.totalRegistros.toLocaleString()}
            icon={HardDrive}
            color="bg-blue-500"
          />
          <StatCard
            label="Dados Reais"
            value={stats.realRegistros.toLocaleString()}
            icon={CheckCircle2}
            color="bg-emerald-500"
          />
          <StatCard
            label="Dados Mock/Teste"
            value={stats.mockRegistros.toLocaleString()}
            icon={Beaker}
            color="bg-amber-500"
          />
          <StatCard
            label="Atividades (24h)"
            value={stats.atividadesHoje}
            icon={Activity}
            color="bg-rose-500"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1 h-auto">
            <TabsTrigger value="visao-geral" className="text-xs px-4 py-2">
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="tabelas" className="text-xs px-4 py-2">
              <Database className="w-3.5 h-3.5 mr-1.5" />
              Tabelas
            </TabsTrigger>
            <TabsTrigger value="mock-data" className="text-xs px-4 py-2">
              <Beaker className="w-3.5 h-3.5 mr-1.5" />
              Dados de Teste
            </TabsTrigger>
            <TabsTrigger value="atividades" className="text-xs px-4 py-2">
              <Activity className="w-3.5 h-3.5 mr-1.5" />
              Monitor
            </TabsTrigger>
            <TabsTrigger value="limpeza" className="text-xs px-4 py-2">
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Limpeza
            </TabsTrigger>
          </TabsList>

          {/* Tab: Visão Geral */}
          <TabsContent value="visao-geral" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Gráfico de Distribuição */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-violet-500" />
                    Distribuição por Tipo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Produção", value: stats.realRegistros, total: stats.totalRegistros, color: "bg-emerald-500" },
                    { label: "Mock", value: MOCK_TABLES.filter(t => t.tipo === "mock").reduce((a, t) => a + t.registros, 0), total: stats.totalRegistros, color: "bg-amber-500" },
                    { label: "Seed", value: MOCK_TABLES.filter(t => t.tipo === "seed").reduce((a, t) => a + t.registros, 0), total: stats.totalRegistros, color: "bg-blue-500" },
                    { label: "Teste", value: MOCK_TABLES.filter(t => t.tipo === "teste").reduce((a, t) => a + t.registros, 0), total: stats.totalRegistros, color: "bg-purple-500" },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-600 dark:text-zinc-400">{item.label}</span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">
                          {item.value.toLocaleString()} ({Math.round((item.value / item.total) * 100)}%)
                        </span>
                      </div>
                      <Progress value={(item.value / item.total) * 100} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Atividade Recente */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="w-4 h-4 text-rose-500" />
                    Atividade Recente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-0 max-h-64 overflow-y-auto">
                    {ACTIVITY_LOGS.slice(0, 5).map((log) => (
                      <ActivityItem key={log.id} log={log} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabelas por Módulo */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  Tabelas por Módulo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { modulo: "Assistidos", icon: Users, tabelas: ["assistidos", "atendimentos"], cor: "bg-blue-500" },
                    { modulo: "Processos", icon: Scale, tabelas: ["processos", "prazos", "documentos"], cor: "bg-emerald-500" },
                    { modulo: "Júri", icon: Gavel, tabelas: ["jurados", "sessoes_juri"], cor: "bg-violet-500" },
                    { modulo: "Agenda", icon: Calendar, tabelas: ["audiencias", "demandas"], cor: "bg-amber-500" },
                  ].map((mod) => {
                    const registros = MOCK_TABLES
                      .filter(t => mod.tabelas.includes(t.tabela))
                      .reduce((acc, t) => acc + t.registros, 0);
                    return (
                      <div key={mod.modulo} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", mod.cor)}>
                            <mod.icon className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{mod.modulo}</span>
                        </div>
                        <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                          {registros.toLocaleString()}
                        </div>
                        <p className="text-[10px] text-zinc-500">{mod.tabelas.length} tabelas</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Tabelas */}
          <TabsContent value="tabelas" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-sm font-medium">
                    Tabelas do Sistema
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <Input
                        placeholder="Buscar tabela..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-48 h-8 text-sm"
                      />
                    </div>
                    <Select value={filterTipo} onValueChange={setFilterTipo}>
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="real">Produção</SelectItem>
                        <SelectItem value="mock">Mock</SelectItem>
                        <SelectItem value="seed">Seed</SelectItem>
                        <SelectItem value="teste">Teste</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterOrigem} onValueChange={setFilterOrigem}>
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue placeholder="Origem" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="api">API</SelectItem>
                        <SelectItem value="importacao">Importação</SelectItem>
                        <SelectItem value="sistema">Sistema</SelectItem>
                        <SelectItem value="mock">Mock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Toolbar */}
                {selectedRecords.length > 0 && (
                  <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/30 flex items-center justify-between">
                    <span className="text-sm text-amber-700 dark:text-amber-400">
                      {selectedRecords.length} selecionado(s)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedRecords([])}>
                        Limpar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" className="h-7 text-xs">
                            <Trash2 className="w-3 h-3 mr-1" />
                            Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir {selectedRecords.length} registro(s)? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteSelected} className="bg-rose-600 hover:bg-rose-700">
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}

                {/* Header */}
                <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center gap-4">
                  <Checkbox 
                    checked={selectedRecords.length === filteredRecords.length && filteredRecords.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-xs text-zinc-500 flex-1">Tabela</span>
                  <span className="text-xs text-zinc-500 hidden md:block w-16">Origem</span>
                  <span className="text-xs text-zinc-500 hidden sm:block w-20 text-right">Registros</span>
                  <span className="text-xs text-zinc-500 hidden lg:block w-28 text-right">Atualização</span>
                  <div className="w-8" />
                </div>

                {/* Rows */}
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredRecords.map((record) => (
                    <TableRow
                      key={record.id}
                      record={record}
                      selected={selectedRecords.includes(record.id)}
                      onSelect={() => {
                        setSelectedRecords(prev => 
                          prev.includes(record.id) 
                            ? prev.filter(id => id !== record.id)
                            : [...prev, record.id]
                        );
                      }}
                      onView={() => toast.info(`Visualizando ${record.tabela}`)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Dados de Teste */}
          <TabsContent value="mock-data" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Gerar Dados */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Gerar Dados de Teste
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-zinc-500">
                    Crie dados fictícios para testar funcionalidades do sistema.
                  </p>
                  
                  <div className="space-y-3">
                    {[
                      { tabela: "assistidos", label: "Assistidos", icon: Users },
                      { tabela: "processos", label: "Processos", icon: Scale },
                      { tabela: "jurados", label: "Jurados", icon: Gavel },
                      { tabela: "audiencias", label: "Audiências", icon: Calendar },
                    ].map((item) => (
                      <div key={item.tabela} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                        <div className="flex items-center gap-2">
                          <item.icon className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select defaultValue="10">
                            <SelectTrigger className="w-20 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5</SelectItem>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="25">25</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                              <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            size="sm" 
                            className="h-7 text-xs bg-amber-500 hover:bg-amber-600"
                            onClick={() => handleGenerateMockData(item.tabela, 10)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Dados Mockados Existentes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Beaker className="w-4 h-4 text-purple-500" />
                    Dados de Teste Existentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-zinc-500">
                    Dados mockados atualmente no sistema.
                  </p>
                  
                  <div className="space-y-2">
                    {MOCK_TABLES.filter(t => t.tipo === "mock" || t.tipo === "teste").map((table) => (
                      <div key={table.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                        <div>
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 font-mono">{table.tabela}</span>
                          <p className="text-[10px] text-zinc-500">{table.registros} registros</p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                              <Trash2 className="w-3 h-3 mr-1" />
                              Limpar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Limpar dados de teste</AlertDialogTitle>
                              <AlertDialogDescription>
                                Remover todos os {table.registros} registros de teste da tabela {table.tabela}?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction className="bg-rose-600 hover:bg-rose-700">
                                Limpar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="w-full">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Limpar Todos os Dados de Teste
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Limpar todos os dados de teste
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação removerá permanentemente todos os dados marcados como &quot;mock&quot; ou &quot;teste&quot; do sistema. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleCleanMockData}
                            className="bg-rose-600 hover:bg-rose-700"
                          >
                            Limpar Tudo
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Monitor */}
          <TabsContent value="atividades" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="w-4 h-4 text-rose-500" />
                    Monitor de Atividades
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Atualizar
                    </Button>
                    <Badge variant="secondary" className="text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
                      Ao vivo
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {ACTIVITY_LOGS.map((log) => (
                    <ActivityItem key={log.id} log={log} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Limpeza */}
          <TabsContent value="limpeza" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  Limpeza Avançada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-xs text-zinc-500">
                  Remova registros com base em critérios específicos como data de inclusão ou forma de criação.
                </p>

                {/* Filtros de Limpeza */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="space-y-2">
                    <Label className="text-xs">Data de Inclusão (De)</Label>
                    <Input 
                      type="date" 
                      className="h-9"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Data de Inclusão (Até)</Label>
                    <Input 
                      type="date" 
                      className="h-9"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Tipo de Dado</Label>
                    <Select value={filterTipo} onValueChange={setFilterTipo}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="real">Produção</SelectItem>
                        <SelectItem value="mock">Mock</SelectItem>
                        <SelectItem value="seed">Seed</SelectItem>
                        <SelectItem value="teste">Teste</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Forma de Inclusão</Label>
                    <Select value={filterOrigem} onValueChange={setFilterOrigem}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecionar origem" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="api">API</SelectItem>
                        <SelectItem value="importacao">Importação</SelectItem>
                        <SelectItem value="sistema">Sistema</SelectItem>
                        <SelectItem value="mock">Mock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        {filteredRecords.length} tabela(s) serão afetadas
                      </h4>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                        Total de {filteredRecords.reduce((a, t) => a + t.registros, 0).toLocaleString()} registros encontrados com os critérios selecionados.
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {filteredRecords.slice(0, 5).map((t) => (
                          <Badge key={t.id} variant="secondary" className="text-[10px]">
                            {t.tabela}
                          </Badge>
                        ))}
                        {filteredRecords.length > 5 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{filteredRecords.length - 5}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setFilterTipo("all");
                    setFilterOrigem("all");
                    setDateFrom("");
                    setDateTo("");
                  }}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Limpar Filtros
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={filteredRecords.length === 0}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Executar Limpeza
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-rose-500" />
                          Confirmar limpeza
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Você está prestes a remover {filteredRecords.reduce((a, t) => a + t.registros, 0).toLocaleString()} registros de {filteredRecords.length} tabela(s). Esta ação é irreversível. Deseja continuar?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDeleteSelected}
                          className="bg-rose-600 hover:bg-rose-700"
                        >
                          Confirmar Limpeza
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
