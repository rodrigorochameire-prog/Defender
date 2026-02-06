"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Upload,
  User,
  Users,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { PJeImportModal } from "@/components/demandas-premium/pje-import-modal";

// Opções de atribuição para o modal (apenas VVD pré-selecionado)
const atribuicaoOptions = [
  { value: "Violência Doméstica", label: "Violência Doméstica" },
];

export default function VVDPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filterMPUAtiva, setFilterMPUAtiva] = useState<boolean | undefined>(undefined);
  const [isPJeImportModalOpen, setIsPJeImportModalOpen] = useState(false);

  // Queries
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.vvd.stats.useQuery();
  const { data: processosData, isLoading: processosLoading, refetch: refetchProcessos } = trpc.vvd.listProcessos.useQuery({
    search: searchTerm || undefined,
    mpuAtiva: filterMPUAtiva,
    limit: 100,
  });
  const { data: intimacoesData, isLoading: intimacoesLoading, refetch: refetchIntimacoes } = trpc.vvd.listIntimacoes.useQuery({
    tipoIntimacao: "todos",
    status: "pendente",
    limit: 50,
  });

  const processos = processosData?.processos || [];
  const intimacoes = intimacoesData || [];

  // Função para atualizar todos os dados após importação
  const handleImportComplete = () => {
    refetchStats();
    refetchProcessos();
    refetchIntimacoes();
    setIsPJeImportModalOpen(false);
  };

  // Helpers
  const getDiasRestantes = (dataVencimento: string | null) => {
    if (!dataVencimento) return null;
    const dias = differenceInDays(parseISO(dataVencimento), new Date());
    return dias;
  };

  const getStatusBadge = (diasRestantes: number | null) => {
    if (diasRestantes === null) {
      return <Badge variant="outline">Sem prazo</Badge>;
    }
    if (diasRestantes < 0) {
      return <Badge variant="destructive">Vencida ({Math.abs(diasRestantes)} dias)</Badge>;
    }
    if (diasRestantes <= 7) {
      return <Badge className="bg-red-500">Vence em {diasRestantes} dias</Badge>;
    }
    if (diasRestantes <= 30) {
      return <Badge className="bg-amber-500">Vence em {diasRestantes} dias</Badge>;
    }
    return <Badge className="bg-green-500">{diasRestantes} dias</Badge>;
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header Secundário (página especial) */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
              <Shield className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Violência Doméstica</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Controle de Medidas Protetivas de Urgência</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => {
              refetchStats();
              refetchProcessos();
              refetchIntimacoes();
            }} className="h-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              <RefreshCw className="h-4 w-4 mr-1" />
              Atualizar
            </Button>
            <Button
              size="sm"
              onClick={() => setIsPJeImportModalOpen(true)}
              className="h-8 px-3 bg-zinc-800 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600 text-white text-xs font-medium rounded-md transition-colors"
            >
              <Upload className="h-3.5 w-3.5 mr-1" />
              Importar PJe
            </Button>
        </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 md:p-6 space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalProcessos || 0}</p>
                <p className="text-xs text-muted-foreground">Total de Processos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats?.mpusAtivas || 0}</p>
                <p className="text-xs text-muted-foreground">MPUs Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats?.mpusVencendo || 0}</p>
                <p className="text-xs text-muted-foreground">Vencendo em 30 dias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats?.intimacoesPendentes || 0}</p>
                <p className="text-xs text-muted-foreground">Intimações Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">
            <Shield className="h-4 w-4 mr-1" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="processos">
            <FileText className="h-4 w-4 mr-1" />
            Processos
          </TabsTrigger>
          <TabsTrigger value="intimacoes">
            <Bell className="h-4 w-4 mr-1" />
            Intimações
          </TabsTrigger>
          <TabsTrigger value="partes">
            <Users className="h-4 w-4 mr-1" />
            Partes
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* MPUs Próximas de Vencer */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  MPUs Próximas de Vencer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {processos
                      .filter((p) => p.mpuAtiva && p.dataVencimentoMPU)
                      .sort((a, b) => {
                        const diasA = getDiasRestantes(a.dataVencimentoMPU);
                        const diasB = getDiasRestantes(b.dataVencimentoMPU);
                        return (diasA || 999) - (diasB || 999);
                      })
                      .slice(0, 10)
                      .map((processo) => {
                        const diasRestantes = getDiasRestantes(processo.dataVencimentoMPU);
                        return (
                          <div
                            key={processo.id}
                            className={cn(
                              "p-3 rounded-lg border",
                              diasRestantes !== null && diasRestantes <= 7
                                ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                                : diasRestantes !== null && diasRestantes <= 30
                                ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                                : "border-zinc-200 dark:border-zinc-800"
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-sm">{processo.autor?.nome || "Sem autor"}</p>
                                <p className="text-xs text-muted-foreground font-mono">{processo.numeroAutos}</p>
                                {processo.crime && (
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    {processo.crime}
                                  </Badge>
                                )}
                              </div>
                              {getStatusBadge(diasRestantes)}
                            </div>
                            {processo.dataVencimentoMPU && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Vencimento: {format(parseISO(processo.dataVencimentoMPU), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    {processos.filter((p) => p.mpuAtiva).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <ShieldCheck className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <p>Nenhuma MPU próxima de vencer</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Intimações Pendentes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4 text-blue-500" />
                  Intimações Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {intimacoes.slice(0, 10).map((intimacao) => (
                      <div
                        key={intimacao.id}
                        className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{intimacao.autor?.nome || "Sem nome"}</p>
                            <p className="text-xs text-muted-foreground">{intimacao.ato}</p>
                            {intimacao.dataExpedicao && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Expedição: {format(parseISO(intimacao.dataExpedicao), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant={intimacao.tipoIntimacao === "CIENCIA" ? "secondary" : "default"}
                          >
                            {intimacao.tipoIntimacao === "CIENCIA" ? "Ciência" : "Peticionar"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {intimacoes.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-30 text-green-500" />
                        <p>Nenhuma intimação pendente</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Processos Tab */}
        <TabsContent value="processos" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Processos de Violência Doméstica</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou número..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button
                    variant={filterMPUAtiva === true ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterMPUAtiva(filterMPUAtiva === true ? undefined : true)}
                  >
                    <ShieldCheck className="h-4 w-4 mr-1" />
                    MPU Ativa
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Autor (Assistido)</TableHead>
                      <TableHead>Processo</TableHead>
                      <TableHead>Crime</TableHead>
                      <TableHead>MPU</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processosLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <RefreshCw className="h-5 w-5 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : processos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum processo encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      processos.map((processo) => {
                        const diasRestantes = getDiasRestantes(processo.dataVencimentoMPU);
                        return (
                          <TableRow key={processo.id} className="cursor-pointer hover:bg-muted/50">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{processo.autor?.nome || "Sem autor"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {processo.numeroAutos}
                              </code>
                            </TableCell>
                            <TableCell>
                              {processo.crime ? (
                                <Badge variant="outline">{processo.crime}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {processo.mpuAtiva ? (
                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                  <ShieldCheck className="h-3 w-3 mr-1" />
                                  Ativa
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                  Inativa
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {processo.dataVencimentoMPU ? (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">
                                    {format(parseISO(processo.dataVencimentoMPU), "dd/MM/yyyy", { locale: ptBR })}
                                  </span>
                                  {getStatusBadge(diasRestantes)}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{processo.situacao || "ativo"}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Intimações Tab */}
        <TabsContent value="intimacoes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Intimações de Violência Doméstica</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Autor</TableHead>
                      <TableHead>Processo</TableHead>
                      <TableHead>Ato</TableHead>
                      <TableHead>Expedição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {intimacoesLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <RefreshCw className="h-5 w-5 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : intimacoes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhuma intimação pendente
                        </TableCell>
                      </TableRow>
                    ) : (
                      intimacoes.map((intimacao) => (
                        <TableRow key={intimacao.id}>
                          <TableCell className="font-medium">{intimacao.autor?.nome || "-"}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {intimacao.processo?.numeroAutos || "-"}
                            </code>
                          </TableCell>
                          <TableCell>{intimacao.ato}</TableCell>
                          <TableCell>
                            {intimacao.dataExpedicao
                              ? format(parseISO(intimacao.dataExpedicao), "dd/MM/yyyy", { locale: ptBR })
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={intimacao.tipoIntimacao === "CIENCIA" ? "secondary" : "default"}
                            >
                              {intimacao.tipoIntimacao === "CIENCIA" ? "Ciência" : "Peticionar"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{intimacao.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Partes Tab */}
        <TabsContent value="partes" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Partes (Autores e Vítimas)</CardTitle>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Parte
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Funcionalidade em desenvolvimento</p>
                <p className="text-xs mt-1">As partes são criadas automaticamente na importação de intimações</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>

      {/* Modal de Importação PJe */}
      <PJeImportModal
        isOpen={isPJeImportModalOpen}
        onClose={() => setIsPJeImportModalOpen(false)}
        onImport={() => {}} // Não usado para VVD - usa onVVDImportComplete
        atribuicaoOptions={atribuicaoOptions}
        atoOptions={[]}
        statusOptions={[]}
        demandasExistentes={[]}
        onVVDImportComplete={handleImportComplete}
      />
    </div>
  );
}
