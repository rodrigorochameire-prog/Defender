"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Radar,
  Plus,
  Search,
  Globe,
  MapPin,
  FileText,
  MapPinned,
  Phone,
  Folder,
  Microscope,
  Users,
  LayoutGrid,
  List,
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DiligenciaCard } from "./DiligenciaCard";
import { NovaDiligenciaModal } from "./NovaDiligenciaModal";
import { OsintRadar } from "./OsintRadar";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import {
  Diligencia,
  CATEGORIAS_DILIGENCIA,
  CATEGORIA_OPTIONS,
  STATUS_OPTIONS,
  CategoriaDigilenciaKey,
} from "@/config/diligencias";

// Mapeamento de ícones
const CATEGORIA_ICONS: Record<CategoriaDigilenciaKey, React.ElementType> = {
  SOCIAL: Globe,
  CAMPO: MapPin,
  OFICIAL: FileText,
  GEO: MapPinned,
  TELEFONIA: Phone,
  DOCUMENTAL: Folder,
  PERICIAL: Microscope,
  TESTEMUNHAL: Users,
};

interface DiligenciasPainelProps {
  casoId?: number;
  assistidoId?: number;
  processoId?: number;
  className?: string;
}

export function DiligenciasPainel({
  casoId,
  assistidoId,
  processoId,
  className,
}: DiligenciasPainelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"painel" | "osint">("painel");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterCategoria, setFilterCategoria] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Query para listar diligências
  const {
    data: diligenciasData,
    isLoading,
    refetch,
  } = trpc.diligencias.list.useQuery({
    casoId,
    assistidoId,
    processoId,
    categoria: filterCategoria !== "ALL" ? filterCategoria : undefined,
    status: filterStatus !== "ALL" ? filterStatus : undefined,
    search: searchQuery.trim() || undefined,
    limit: 100,
  });

  // Query para estatísticas
  const { data: stats } = trpc.diligencias.getStats.useQuery({
    casoId,
    assistidoId,
    processoId,
  });

  // Mutations
  const createMutation = trpc.diligencias.create.useMutation({
    onSuccess: () => {
      toast.success("Diligência criada!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao criar: ${error.message}`);
    },
  });

  const updateMutation = trpc.diligencias.update.useMutation({
    onSuccess: () => {
      toast.success("Diligência atualizada!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const deleteMutation = trpc.diligencias.delete.useMutation({
    onSuccess: () => {
      toast.success("Diligência excluída!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  // Converter dados do banco para o formato do componente
  const diligencias: Diligencia[] = useMemo(() => {
    if (!diligenciasData) return [];
    return diligenciasData.map((d) => ({
      id: d.id.toString(),
      casoId: d.casoId ?? undefined,
      assistidoId: d.assistidoId ?? undefined,
      processoId: d.processoId ?? undefined,
      titulo: d.titulo,
      descricao: d.descricao ?? undefined,
      categoria: d.categoria as CategoriaDigilenciaKey,
      status: d.status as any,
      executor: d.executor as any,
      executorNome: d.executorNome ?? undefined,
      executorContato: d.executorContato ?? undefined,
      dataInicio: d.dataInicio?.toISOString(),
      dataConclusao: d.dataConclusao?.toISOString(),
      prazo: d.prazo ?? undefined,
      checklist: (d.checklist as any) ?? undefined,
      notas: d.notas ?? undefined,
      resultado: d.resultado ?? undefined,
      arquivos: (d.arquivos as any) ?? undefined,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));
  }, [diligenciasData]);

  // Handlers
  const handleSaveDiligencia = (nova: Diligencia) => {
    createMutation.mutate({
      casoId,
      assistidoId,
      processoId,
      titulo: nova.titulo,
      descricao: nova.descricao,
      categoria: nova.categoria,
      status: nova.status,
      executor: nova.executor,
      executorNome: nova.executorNome,
      executorContato: nova.executorContato,
      prazo: nova.prazo,
      checklist: nova.checklist,
      notas: nova.notas,
    });
  };

  const handleUpdateDiligencia = (updated: Diligencia) => {
    updateMutation.mutate({
      id: parseInt(updated.id),
      titulo: updated.titulo,
      descricao: updated.descricao,
      categoria: updated.categoria,
      status: updated.status,
      executor: updated.executor,
      executorNome: updated.executorNome,
      executorContato: updated.executorContato,
      prazo: updated.prazo,
      checklist: updated.checklist,
      notas: updated.notas,
      resultado: updated.resultado,
    });
  };

  const handleDeleteDiligencia = (id: string) => {
    deleteMutation.mutate({ id: parseInt(id) });
  };

  // Agrupar por categoria para visualização de grid
  const diligenciasPorCategoria = useMemo(() => {
    const grouped: Record<CategoriaDigilenciaKey, Diligencia[]> = {
      SOCIAL: [],
      CAMPO: [],
      OFICIAL: [],
      GEO: [],
      TELEFONIA: [],
      DOCUMENTAL: [],
      PERICIAL: [],
      TESTEMUNHAL: [],
    };

    diligencias.forEach((d) => {
      grouped[d.categoria].push(d);
    });

    return grouped;
  }, [diligencias]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "painel" | "osint")}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList className="bg-muted">
            <TabsTrigger value="painel" className="gap-2">
              <LayoutGrid className="w-4 h-4" /> Painel
            </TabsTrigger>
            <TabsTrigger value="osint" className="gap-2">
              <Radar className="w-4 h-4" /> OSINT
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              className="h-9 w-9"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Nova Diligência
            </Button>
          </div>
        </div>

        {/* Tab: Painel */}
        <TabsContent value="painel" className="mt-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <Circle className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
                    <p className="text-xs text-zinc-500">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-amber-200 dark:border-amber-800/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {stats?.emAndamento ?? 0}
                    </p>
                    <p className="text-xs text-zinc-500">Em andamento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-800/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {stats?.concluidas ?? 0}
                    </p>
                    <p className="text-xs text-zinc-500">Concluídas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <AlertCircle className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.pendentes ?? 0}</p>
                    <p className="text-xs text-zinc-500">Pendentes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar diligências..."
                className="pl-10"
              />
            </div>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas categorias</SelectItem>
                {CATEGORIA_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos status</SelectItem>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Diligências Grid/List */}
          {diligencias.length === 0 ? (
            <div className="text-center py-16 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
              <Radar className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
              <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Nenhuma diligência encontrada
              </h3>
              <p className="text-sm text-zinc-500 mb-4">
                Comece criando sua primeira diligência de investigação
              </p>
              <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Nova Diligência
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {Object.entries(diligenciasPorCategoria).map(
                ([categoria, items]) => {
                  if (items.length === 0) return null;

                  const cat = CATEGORIAS_DILIGENCIA[categoria as CategoriaDigilenciaKey];
                  const Icon = CATEGORIA_ICONS[categoria as CategoriaDigilenciaKey];

                  return (
                    <Card
                      key={categoria}
                      className="border-zinc-200 dark:border-zinc-800"
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <div
                            className={cn(
                              "p-1.5 rounded-lg",
                              `bg-${cat.cor}-100 dark:bg-${cat.cor}-900/30`
                            )}
                          >
                            <Icon
                              className={cn(
                                "w-4 h-4",
                                `text-${cat.cor}-600 dark:text-${cat.cor}-400`
                              )}
                            />
                          </div>
                          {cat.label}
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {items.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {items.map((d) => (
                          <DiligenciaCard
                            key={d.id}
                            diligencia={d}
                            onUpdate={handleUpdateDiligencia}
                            onDelete={handleDeleteDiligencia}
                            compact
                          />
                        ))}
                      </CardContent>
                    </Card>
                  );
                }
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {diligencias.map((d) => (
                <DiligenciaCard
                  key={d.id}
                  diligencia={d}
                  onUpdate={handleUpdateDiligencia}
                  onDelete={handleDeleteDiligencia}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: OSINT */}
        <TabsContent value="osint" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-600" />
                Radar OSINT
              </CardTitle>
              <p className="text-sm text-zinc-500">
                Pesquise em fontes abertas para coletar informações
              </p>
            </CardHeader>
            <CardContent>
              <OsintRadar />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Nova Diligência */}
      <NovaDiligenciaModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSave={handleSaveDiligencia}
        casoId={casoId}
        assistidoId={assistidoId}
        processoId={processoId}
      />
    </div>
  );
}
