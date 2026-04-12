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
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
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
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <CollapsiblePageHeader title="Ofícios" icon={Mail}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#525252] flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-white text-[15px] font-semibold tracking-tight leading-tight">
                Ofícios
              </h1>
              <p className="text-[10px] text-white/55 hidden sm:block">
                Gerar, revisar e gerenciar ofícios com IA
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => router.push("/admin/oficios/templates")}
              className="h-8 px-3 rounded-xl bg-white/[0.08] text-white/80 ring-1 ring-white/[0.05] hover:bg-white/[0.14] hover:text-white transition-all duration-150 cursor-pointer flex items-center gap-1.5 text-[11px] font-semibold shrink-0"
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Templates</span>
            </button>
            <button
              onClick={() => setTemplateSelectorOpen(true)}
              className="h-8 px-3 rounded-xl bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition-all duration-150 cursor-pointer flex items-center gap-1.5 text-[11px] font-semibold shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Novo Ofício</span>
            </button>
          </div>
        </div>
      </CollapsiblePageHeader>

      <div className="px-5 md:px-8 py-3 md:py-4 space-y-6">

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard
          icon={BarChart3}
          label="Total"
          value={stats?.oficios.total ?? 0}
          color="text-neutral-400"
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
        <TabsList className="bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/30">
          <TabsTrigger value="meus" className="data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-700">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Meus Oficios
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-700">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="analise" className="data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-700">
            <FolderSearch className="w-3.5 h-3.5 mr-1.5" />
            Analise Drive
          </TabsTrigger>
        </TabsList>

        {/* Tab: Meus Oficios */}
        <TabsContent value="meus" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              <Input
                placeholder="Buscar oficios..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-white dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300">
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
              <SelectTrigger className="w-[160px] bg-white dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300">
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
                  className="border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
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
                <p className="text-center text-xs text-neutral-500 dark:text-neutral-600 py-2">
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
                  className="border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
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
                  className="text-left p-4 rounded-xl border border-neutral-200 dark:border-neutral-700/30 bg-white dark:bg-neutral-900/50
                    hover:bg-neutral-50 dark:hover:bg-neutral-800/70 hover:border-emerald-500/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    <span className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {tmpl.titulo}
                    </span>
                  </div>
                  {tmpl.descricao && (
                    <p className="text-xs text-neutral-500 line-clamp-2 mb-2">
                      {tmpl.descricao}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    {tmpl.area && (
                      <Badge variant="outline" className="text-[10px] text-neutral-500 dark:text-neutral-400 border-neutral-300 dark:border-neutral-600">
                        {tmpl.area}
                      </Badge>
                    )}
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-600">
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
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-700/30 bg-white dark:bg-neutral-900/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <FolderSearch className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              <h3 className="font-medium text-neutral-900 dark:text-neutral-100">Analise de Oficios do Drive</h3>
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
                <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                  <span>Analisando oficios...</span>
                  <span>
                    {analiseStatus.concluidos + analiseStatus.erros}/{analiseStatus.total}
                  </span>
                </div>
                <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
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

            <p className="text-sm text-neutral-500 mb-4">
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
                  className="border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
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

            <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-3">
              A analise vai extrair e classificar todos os oficios da pasta do Drive,
              identificar padroes e gerar templates automaticamente.
            </p>
          </div>

          {/* Analysis results */}
          {analises && analises.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Oficios Analisados ({analises.length})
              </h4>
              {analises.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700/30 bg-neutral-50 dark:bg-neutral-800/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {a.status === "processando" && (
                        <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin flex-shrink-0" />
                      )}
                      {a.status === "pendente" && (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-neutral-300 dark:border-neutral-600 flex-shrink-0" />
                      )}
                      {a.status === "concluido" && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      )}
                      {a.status === "erro" && (
                        <div className="w-3.5 h-3.5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[8px] text-red-500 font-bold">!</span>
                        </div>
                      )}
                      <span className="text-sm text-neutral-800 dark:text-neutral-200 truncate">
                        {a.driveFileName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {a.tipoOficio && (
                        <Badge variant="outline" className="text-[10px] text-neutral-500 dark:text-neutral-400 border-neutral-300 dark:border-neutral-600">
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
                    <p className="text-xs text-neutral-500 mt-1 truncate">{a.assunto}</p>
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
    <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700/30 bg-white dark:bg-neutral-900/50">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-neutral-500">{label}</span>
      </div>
      <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800/50">
      <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
      <p className="text-[10px] text-neutral-500">{label}</p>
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
      <Icon className="w-10 h-10 mx-auto text-neutral-400 dark:text-neutral-600 mb-3" />
      <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">{title}</h3>
      <p className="text-xs text-neutral-400 dark:text-neutral-600 mb-4 max-w-sm mx-auto">{description}</p>
      {action}
    </div>
  );
}
