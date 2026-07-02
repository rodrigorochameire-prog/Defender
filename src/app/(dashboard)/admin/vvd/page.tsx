"use client";

import { useState, Fragment } from "react";
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
import { prazoSeveridade, ESCALA_MPU } from "@/lib/prazo";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PJeImportModal } from "@/components/demandas-premium/pje-import-modal";
import { toast } from "sonner";
import { KPICardPremium, KPIGrid } from "@/components/shared/kpi-card-premium";
import { GlassHeaderShell } from "@/components/layouts/header/glass-header-shell";
import { HeaderActionsBar, type HeaderAction } from "@/components/layouts/header/header-actions-bar";

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

  // Mutation para importar demandas gerais (não-MPU) para a tabela de demandas
  const importDemandasMutation = trpc.demandas.importFromSheets.useMutation({
    onSuccess: (result) => {
      if (result.imported > 0) {
        toast.success(`${result.imported} demandas VVD (não-MPU) importadas para a lista de demandas`);
      }
      if (result.errors.length > 0) {
        result.errors.forEach((err) => toast.error(err));
      }
    },
    onError: (error) => {
      toast.error(`Erro ao importar demandas: ${error.message}`);
    },
  });

  const processos = processosData?.processos || [];
  const intimacoes = intimacoesData || [];

  // Função para importar demandas gerais (não-MPU) para a tabela de demandas
  const handleImportDemandasGerais = async (importedData: any[], atualizarExistentes?: boolean): Promise<{ imported: number; updated: number; skipped: number; errors: string[]; assistidosSemSolar: number }> => {
    if (importedData.length === 0) return { imported: 0, updated: 0, skipped: 0, errors: [], assistidosSemSolar: 0 };

    // Mapear dados do modal para o formato esperado pela mutation importFromSheets
    const rows = importedData.map((data) => ({
      assistido: data.assistido || "Não informado",
      processoNumero: data.processos?.[0]?.numero || data.numeroProcesso || "",
      ato: data.ato || "Ciência",
      prazo: data.prazo || undefined,
      dataEntrada: data.data || data.dataExpedicao || undefined,
      status: "triagem",
      providencias: data.providencias || "Classificar demanda",
      atribuicao: "Violência Doméstica",
    }));

    return importDemandasMutation.mutateAsync({ rows, atualizarExistentes: atualizarExistentes || false });
  };

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

  // Escala de monitoramento de MPU (≤7 crítico, ≤30 alerta, 31+ tranquilo).
  // Severidade vem da fonte única; aqui só mapeamos cor canônica → classes.
  const getStatusBadge = (diasRestantes: number | null) => {
    if (diasRestantes === null) {
      return <Badge variant="outline">Sem prazo</Badge>;
    }
    if (diasRestantes < 0) {
      return <Badge variant="danger">Vencida ({Math.abs(diasRestantes)} dias)</Badge>;
    }
    const cor = prazoSeveridade(diasRestantes, ESCALA_MPU).cor;
    if (cor === "red") {
      return <Badge variant="outline" className="border-rose-300 text-rose-600 dark:border-rose-700 dark:text-rose-400">Vence em {diasRestantes} dias</Badge>;
    }
    if (cor === "amber") {
      return <Badge variant="outline" className="border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400">Vence em {diasRestantes} dias</Badge>;
    }
    return <Badge variant="outline" className="border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400">{diasRestantes} dias</Badge>;
  };

  // ── Header rico (GlassHeaderShell + HeaderActionsBar) ──────────────────
  // Row 1 do CollapsiblePageHeader tinha só subtítulo descritivo (sem dado) +
  // 2 botões (Atualizar/Importar PJe) → viram HeaderAction[]. HeaderSlotTitle
  // não carregava chips, só title+accentHex (âmbar) — accentHex não tem
  // equivalente no shell ainda (prop `iconClassName` é item do Lote E).
  const headerActions: HeaderAction[] = [
    {
      id: "refresh",
      label: "Atualizar",
      icon: RefreshCw,
      priority: 20,
      hideLabel: true,
      onSelect: () => {
        refetchStats();
        refetchProcessos();
        refetchIntimacoes();
      },
    },
    {
      id: "importar-pje",
      label: "Importar PJe",
      icon: Upload,
      priority: 30,
      variant: "primary",
      onSelect: () => setIsPJeImportModalOpen(true),
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <GlassHeaderShell
        title="Violência Doméstica"
        icon={Shield}
        actions={<HeaderActionsBar actions={headerActions} />}
      />

      {/* Conteúdo */}
      <div className="p-4 md:p-6 space-y-6">

      {/* Stats Ribbon — compact inline KPIs */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 text-xs overflow-x-auto scrollbar-none shadow-sm">
        {[
          { icon: FileText, value: stats?.totalProcessos || 0, label: "processos" },
          { icon: ShieldCheck, value: stats?.mpusAtivas || 0, label: "MPUs ativas", highlight: true },
          { icon: Clock, value: stats?.mpusVencendo || 0, label: "vencendo 30d", alert: (stats?.mpusVencendo || 0) > 0 },
          { icon: Bell, value: stats?.intimacoesPendentes || 0, label: "intimações", alert: (stats?.intimacoesPendentes || 0) > 0 },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Fragment key={index}>
              {index > 0 && <div className="w-px h-4 bg-neutral-200/60 dark:bg-neutral-700/60 flex-shrink-0" />}
              <div className={cn(
                "flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-lg transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800",
                stat.alert ? "bg-amber-50 dark:bg-amber-950/20" : "",
                stat.highlight ? "bg-emerald-50/50 dark:bg-emerald-950/10" : ""
              )}>
                <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", stat.alert ? "text-amber-500 dark:text-amber-400" : stat.highlight ? "text-emerald-500 dark:text-emerald-400" : "text-neutral-400 dark:text-neutral-500")} />
                <span className={cn("font-bold tabular-nums", stat.alert ? "text-amber-600 dark:text-amber-400" : "text-neutral-800 dark:text-neutral-100")}>{stat.value}</span>
                <span className="text-neutral-500 dark:text-neutral-400 font-medium">{stat.label}</span>
              </div>
            </Fragment>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full">
          <TabsTrigger value="dashboard" className="flex-1">
            <Shield className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="processos" className="flex-1">
            <FileText className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Processos</span>
          </TabsTrigger>
          <TabsTrigger value="intimacoes" className="flex-1">
            <Bell className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Intimações</span>
          </TabsTrigger>
          <TabsTrigger value="partes" className="flex-1">
            <Users className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Partes</span>
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
                        const corMpu = diasRestantes === null ? null : prazoSeveridade(diasRestantes, ESCALA_MPU).cor;
                        return (
                          <div
                            key={processo.id}
                            className={cn(
                              "p-3 rounded-lg border",
                              corMpu === "red"
                                ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                                : corMpu === "amber"
                                ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                                : "border-neutral-200 dark:border-neutral-800"
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-sm">{processo.requerido?.nome || "Sem requerido"}</p>
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
                  <Bell className="h-4 w-4 text-rose-500" />
                  Intimações Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {intimacoes.slice(0, 10).map((intimacao) => (
                      <div
                        key={intimacao.id}
                        className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{intimacao.requerido?.nome || "Sem nome"}</p>
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
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-30 text-emerald-500" />
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-base">Processos de Violência Doméstica</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou número..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full sm:w-64"
                    />
                  </div>
                  <Button
                    variant={filterMPUAtiva === true ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterMPUAtiva(filterMPUAtiva === true ? undefined : true)}
                    className="shrink-0"
                  >
                    <ShieldCheck className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">MPU Ativa</span>
                    <span className="sm:hidden">MPU</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requerido (Assistido)</TableHead>
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
                                <span className="font-medium">{processo.requerido?.nome || "Sem requerido"}</span>
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
                                <Badge variant="outline" className="border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400">
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
                      <TableHead>Requerido</TableHead>
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
                          <TableCell className="font-medium">{intimacao.requerido?.nome || "-"}</TableCell>
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
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Gerencie requeridos e requerentes na página dedicada</p>
            <Link href="/admin/vvd/partes">
              <Button className="bg-neutral-900 hover:bg-emerald-600 dark:bg-neutral-700 dark:hover:bg-emerald-600 text-white">
                <Users className="h-4 w-4 mr-2" />
                Abrir Partes VVD
              </Button>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
      </div>

      {/* Modal de Importação PJe */}
      <PJeImportModal
        isOpen={isPJeImportModalOpen}
        onClose={() => setIsPJeImportModalOpen(false)}
        onImport={handleImportDemandasGerais} // Importa demandas não-MPU para tabela de demandas
        atribuicaoOptions={atribuicaoOptions}
        atoOptions={[]}
        statusOptions={[]}
        demandasExistentes={[]}
        onVVDImportComplete={handleImportComplete}
        defaultAtribuicao="Violência Doméstica"
      />
    </div>
  );
}
