"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Plus,
  Search,
  FileText,
  Sparkles,
  BarChart3,
  FolderSearch,
  Pencil,
  CheckCircle2,
  Loader2,
  RefreshCw,
  LayoutTemplate,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { OficioCard } from "@/components/oficios/oficio-card";
import { TemplateSelector } from "@/components/oficios/template-selector";
import { toast } from "sonner";

export default function OficiosPage() {
  const router = useRouter();
  const [tab, setTab] = useState("meus");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);

  // Data fetching
  const { data: stats } = trpc.oficios.stats.useQuery();
  const { data: oficiosData, refetch } = trpc.oficios.list.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? (statusFilter as "rascunho" | "revisao" | "enviado" | "arquivado") : undefined,
    tipoOficio: tipoFilter !== "all" ? tipoFilter : undefined,
    limit: 50,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: analiseStatus, refetch: refetchStatus } = trpc.oficios.statusAnalise.useQuery(
    undefined,
    { refetchInterval: isAnalyzing ? 3000 : false }
  );
  const { data: analises, refetch: refetchAnalises } = trpc.oficios.analises.useQuery(
    { limit: 50 },
    {
      enabled: tab === "analise",
      refetchInterval: isAnalyzing ? 3000 : false,
    }
  );

  const analisarDriveMutation = trpc.oficios.analisarDrive.useMutation({
    onSuccess: (data) => {
      if (data.novos > 0) {
        toast.success(`${data.novos} oficios enviados para analise`);
        setIsAnalyzing(true);
      } else if (data.jaAnalisados > 0) {
        toast.info(`Todos os ${data.total} oficios ja foram analisados`);
      } else {
        toast.info("Nenhum oficio encontrado na pasta do Drive");
      }
      refetchStatus();
      refetchAnalises();
    },
    onError: (error) => {
      toast.error(`Erro ao analisar Drive: ${error.message}`);
    },
  });

  // Stop polling when all files are done processing
  useEffect(() => {
    if (isAnalyzing && analiseStatus) {
      const { pendentes, processando } = analiseStatus;
      if (pendentes === 0 && processando === 0) {
        setIsAnalyzing(false);
        refetchAnalises();
        toast.success("Analise concluida!");
      }
    }
  }, [isAnalyzing, analiseStatus, refetchAnalises]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);
  const { data: templates } = trpc.oficios.templates.useQuery(
    undefined,
    { enabled: tab === "templates" }
  );
  const { data: tiposOficio } = trpc.oficios.tiposOficio.useQuery();

  const updateMutation = trpc.oficios.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Oficio atualizado");
    },
  });

  const handleArchive = (id: number) => {
    updateMutation.mutate({ id, metadata: { status: "arquivado" } });
  };

  const handleTemplateSelect = (template: { id: number; titulo: string; conteudo: string }) => {
    setTemplateSelectorOpen(false);
    if (template.id === 0) {
      // Blank document
      router.push("/admin/oficios/novo");
    } else {
      router.push(`/admin/oficios/novo?modeloId=${template.id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Mail className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Oficios</h1>
            <p className="text-sm text-zinc-500">
              Gerar, revisar e gerenciar oficios com IA
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
            onClick={() => router.push("/admin/oficios/templates")}
          >
            <LayoutTemplate className="w-4 h-4 mr-2" />
            Templates
          </Button>
          <Button
            onClick={() => setTemplateSelectorOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Oficio
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard
          icon={BarChart3}
          label="Total"
          value={stats?.oficios.total ?? 0}
          color="text-zinc-400"
        />
        <StatsCard
          icon={Pencil}
          label="Rascunhos"
          value={stats?.oficios.rascunhos ?? 0}
          color="text-yellow-500 dark:text-yellow-400"
        />
        <StatsCard
          icon={CheckCircle2}
          label="Enviados"
          value={stats?.oficios.enviados ?? 0}
          color="text-emerald-500 dark:text-emerald-400"
        />
        <StatsCard
          icon={FileText}
          label="Templates"
          value={stats?.templates ?? 0}
          color="text-blue-500 dark:text-blue-400"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/30">
          <TabsTrigger value="meus" className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Meus Oficios
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="analise" className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700">
            <FolderSearch className="w-3.5 h-3.5 mr-1.5" />
            Analise Drive
          </TabsTrigger>
        </TabsList>

        {/* Tab: Meus Oficios */}
        <TabsContent value="meus" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <Input
                placeholder="Buscar oficios..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="revisao">Em Revisao</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[160px] bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                {(tiposOficio || []).map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* List */}
          {!oficiosData?.items.length ? (
            <EmptyState
              icon={FileText}
              title="Nenhum oficio encontrado"
              description="Crie seu primeiro oficio usando um template ou em branco"
              action={
                <Button
                  variant="outline"
                  className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                  onClick={() => setTemplateSelectorOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar oficio
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {oficiosData.items.map((oficio) => (
                <OficioCard
                  key={oficio.id}
                  oficio={oficio as Parameters<typeof OficioCard>[0]["oficio"]}
                  onArchive={handleArchive}
                />
              ))}
              {oficiosData.total > oficiosData.items.length && (
                <p className="text-center text-xs text-zinc-500 dark:text-zinc-600 py-2">
                  Mostrando {oficiosData.items.length} de {oficiosData.total}
                </p>
              )}
            </div>
          )}
        </TabsContent>

        {/* Tab: Templates */}
        <TabsContent value="templates" className="space-y-4">
          {!templates?.length ? (
            <EmptyState
              icon={Sparkles}
              title="Nenhum template de oficio"
              description="Use Analisar meus oficios para gerar templates automaticamente a partir do Drive"
              action={
                <Button
                  variant="outline"
                  className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                  onClick={() => setTab("analise")}
                >
                  <FolderSearch className="w-4 h-4 mr-2" />
                  Ir para Analise Drive
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() =>
                    router.push(`/admin/oficios/novo?modeloId=${tmpl.id}`)
                  }
                  className="text-left p-4 rounded-xl border border-zinc-200 dark:border-zinc-700/30 bg-white dark:bg-zinc-900/50
                    hover:bg-zinc-50 dark:hover:bg-zinc-800/70 hover:border-emerald-500/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {tmpl.titulo}
                    </span>
                  </div>
                  {tmpl.descricao && (
                    <p className="text-xs text-zinc-500 line-clamp-2 mb-2">
                      {tmpl.descricao}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    {tmpl.area && (
                      <Badge variant="outline" className="text-[10px] text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-600">
                        {tmpl.area}
                      </Badge>
                    )}
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-600">
                      {tmpl.totalUsos || 0}x usado
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Analise Drive */}
        <TabsContent value="analise" className="space-y-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700/30 bg-white dark:bg-zinc-900/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <FolderSearch className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Analise de Oficios do Drive</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MiniStat label="Analisados" value={analiseStatus?.total ?? 0} />
              <MiniStat label="Concluidos" value={analiseStatus?.concluidos ?? 0} />
              <MiniStat label="Processando" value={analiseStatus?.processando ?? 0} />
              <MiniStat label="Erros" value={analiseStatus?.erros ?? 0} />
            </div>

            {/* Progress bar during analysis */}
            {isAnalyzing && analiseStatus && analiseStatus.total > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                  <span>Analisando oficios...</span>
                  <span>
                    {analiseStatus.concluidos + analiseStatus.erros}/{analiseStatus.total}
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round(
                        ((analiseStatus.concluidos + analiseStatus.erros) / analiseStatus.total) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <p className="text-sm text-zinc-500 mb-4">
              {analiseStatus?.ultimaAnalise
                ? `Ultima analise: ${new Date(analiseStatus.ultimaAnalise).toLocaleDateString("pt-BR")}`
                : "Nenhuma analise realizada ainda"}
            </p>

            <div className="flex gap-2">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={analisarDriveMutation.isPending || isAnalyzing}
                onClick={() => analisarDriveMutation.mutate()}
              >
                {analisarDriveMutation.isPending || isAnalyzing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {isAnalyzing
                  ? "Analisando..."
                  : analisarDriveMutation.isPending
                    ? "Iniciando..."
                    : "Analisar meus oficios"}
              </Button>
              {(analiseStatus?.total ?? 0) > 0 && !isAnalyzing && (
                <Button
                  variant="outline"
                  className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                  onClick={() => {
                    refetchStatus();
                    refetchAnalises();
                    toast.info("Dados atualizados");
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar
                </Button>
              )}
            </div>

            <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-3">
              A analise vai extrair e classificar todos os oficios da pasta do Drive,
              identificar padroes e gerar templates automaticamente.
            </p>
          </div>

          {/* Analysis results */}
          {analises && analises.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Oficios Analisados ({analises.length})
              </h4>
              {analises.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700/30 bg-zinc-50 dark:bg-zinc-800/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {a.status === "processando" && (
                        <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin flex-shrink-0" />
                      )}
                      {a.status === "pendente" && (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-300 dark:border-zinc-600 flex-shrink-0" />
                      )}
                      {a.status === "concluido" && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      )}
                      {a.status === "erro" && (
                        <div className="w-3.5 h-3.5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[8px] text-red-500 font-bold">!</span>
                        </div>
                      )}
                      <span className="text-sm text-zinc-800 dark:text-zinc-200 truncate">
                        {a.driveFileName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {a.tipoOficio && (
                        <Badge variant="outline" className="text-[10px] text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-600">
                          {a.tipoOficio}
                        </Badge>
                      )}
                      {a.qualidadeScore !== null && a.qualidadeScore > 0 && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            (a.qualidadeScore ?? 0) >= 80
                              ? "text-emerald-500 dark:text-emerald-400 border-emerald-500/20"
                              : (a.qualidadeScore ?? 0) >= 60
                                ? "text-yellow-500 dark:text-yellow-400 border-yellow-500/20"
                                : "text-red-500 dark:text-red-400 border-red-500/20"
                          }`}
                        >
                          {a.qualidadeScore}/100
                        </Badge>
                      )}
                    </div>
                  </div>
                  {a.assunto && (
                    <p className="text-xs text-zinc-500 mt-1 truncate">{a.assunto}</p>
                  )}
                  {a.erro && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1 truncate">{a.erro}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Template Selector Modal */}
      <TemplateSelector
        open={templateSelectorOpen}
        onClose={() => setTemplateSelectorOpen(false)}
        onSelect={handleTemplateSelect}
      />
    </div>
  );
}

// ==========================================
// Sub-components
// ==========================================

function StatsCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/30 bg-white dark:bg-zinc-900/50">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/50">
      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
      <p className="text-[10px] text-zinc-500">{label}</p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12">
      <Icon className="w-10 h-10 mx-auto text-zinc-400 dark:text-zinc-600 mb-3" />
      <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">{title}</h3>
      <p className="text-xs text-zinc-400 dark:text-zinc-600 mb-4 max-w-sm mx-auto">{description}</p>
      {action}
    </div>
  );
}
