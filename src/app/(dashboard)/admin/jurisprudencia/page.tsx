"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit3,
  Copy,
  Trash2,
  Star,
  StarOff,
  FileText,
  FolderSync,
  MessageSquare,
  Filter,
  Download,
  ExternalLink,
  Sparkles,
  Scale,
  Building2,
  Gavel,
  RefreshCw,
  Check,
  Clock,
  AlertCircle,
  ChevronRight,
  Send,
  Loader2,
  FolderPlus,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

// Componentes estruturais
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { EmptyState } from "@/components/shared/empty-state";
import { KPICardPremium, KPIGrid } from "@/components/shared/kpi-card-premium";

// ==========================================
// TIPOS
// ==========================================

type Tribunal = "STF" | "STJ" | "TJBA" | "TRF1" | "TRF3" | "OUTRO";

// ==========================================
// CONSTANTES
// ==========================================

const TRIBUNAL_CONFIG: Record<
  Tribunal,
  { label: string; color: string; icon: typeof Scale }
> = {
  STF: {
    label: "STF",
    color: "text-amber-600 bg-amber-50 border-amber-200",
    icon: Building2,
  },
  STJ: {
    label: "STJ",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    icon: Gavel,
  },
  TJBA: {
    label: "TJBA",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    icon: Scale,
  },
  TRF1: {
    label: "TRF1",
    color: "text-violet-600 bg-violet-50 border-violet-200",
    icon: Scale,
  },
  TRF3: {
    label: "TRF3",
    color: "text-rose-600 bg-rose-50 border-rose-200",
    icon: Scale,
  },
  OUTRO: {
    label: "Outro",
    color: "text-zinc-600 bg-zinc-50 border-zinc-200",
    icon: FileText,
  },
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function JurisprudenciaPage() {
  const [activeTab, setActiveTab] = useState("julgados");
  const [search, setSearch] = useState("");
  const [tribunalFilter, setTribunalFilter] = useState<string>("all");
  const [showAddFolderDialog, setShowAddFolderDialog] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);

  // Queries
  const { data: stats, isLoading: loadingStats } =
    trpc.jurisprudencia.stats.useQuery();

  const {
    data: julgadosData,
    isLoading: loadingJulgados,
    refetch: refetchJulgados,
  } = trpc.jurisprudencia.listJulgados.useQuery({
    tribunal: tribunalFilter !== "all" ? (tribunalFilter as Tribunal) : undefined,
    search: search || undefined,
    limit: 50,
  });

  const { data: temas } = trpc.jurisprudencia.listTemas.useQuery({
    parentId: null,
  });

  const { data: driveFolders, refetch: refetchFolders } =
    trpc.jurisprudencia.listDriveFolders.useQuery();

  // Mutations
  const toggleFavoritoMutation = trpc.jurisprudencia.toggleFavorito.useMutation({
    onSuccess: () => {
      refetchJulgados();
      toast.success("Favorito atualizado");
    },
  });

  const processarIAMutation = trpc.jurisprudencia.processarJulgadoIA.useMutation({
    onSuccess: () => {
      refetchJulgados();
      toast.success("Julgado processado com IA");
    },
    onError: (err) => {
      toast.error("Erro ao processar: " + err.message);
    },
  });

  const syncFolderMutation = trpc.jurisprudencia.syncDriveFolder.useMutation({
    onSuccess: (data) => {
      refetchJulgados();
      refetchFolders();
      toast.success(
        `Sincronizado! ${data.arquivosNovos.length} novos arquivos importados`
      );
    },
    onError: (err) => {
      toast.error("Erro na sincronização: " + err.message);
    },
  });

  // Estatísticas formatadas
  const porTribunalObj = useMemo(() => {
    const obj: Record<string, number> = {};
    stats?.porTribunal?.forEach((item) => {
      obj[item.tribunal] = item.count;
    });
    return obj;
  }, [stats?.porTribunal]);

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-6 py-4">
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/admin" },
              { label: "Jurisprudência" },
            ]}
          />

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900 dark:to-amber-950 rounded-xl border border-amber-200 dark:border-amber-800">
                <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Banco de Jurisprudência
                </h1>
                <p className="text-sm text-zinc-500">
                  Julgados do STF, STJ e TJBA com busca inteligente por IA
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setShowAIChat(!showAIChat)}
              >
                <MessageSquare className="w-4 h-4" />
                Perguntar à IA
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setShowAddFolderDialog(true)}
              >
                <FolderSync className="w-4 h-4" />
                Sincronizar Drive
              </Button>
              <Link href="/admin/jurisprudencia/novo">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Julgado
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Stats */}
        <KPIGrid columns={5}>
          <KPICardPremium
            title="Total de Julgados"
            value={stats?.totalJulgados || 0}
            icon={BookOpen}
            gradient="amber"
            size="sm"
          />
          <KPICardPremium
            title="STF"
            value={porTribunalObj["STF"] || 0}
            icon={Building2}
            gradient="amber"
            size="sm"
          />
          <KPICardPremium
            title="STJ"
            value={porTribunalObj["STJ"] || 0}
            icon={Gavel}
            gradient="emerald"
            size="sm"
          />
          <KPICardPremium
            title="TJBA"
            value={porTribunalObj["TJBA"] || 0}
            icon={Scale}
            gradient="blue"
            size="sm"
          />
          <KPICardPremium
            title="Favoritos"
            value={stats?.totalFavoritos || 0}
            icon={Star}
            gradient="rose"
            size="sm"
          />
        </KPIGrid>

        {/* AI Chat Panel */}
        {showAIChat && (
          <AIChatPanel onClose={() => setShowAIChat(false)} />
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="julgados" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Julgados
              </TabsTrigger>
              <TabsTrigger value="temas" className="gap-2">
                <FileText className="w-4 h-4" />
                Temas & Teses
              </TabsTrigger>
              <TabsTrigger value="sync" className="gap-2">
                <FolderSync className="w-4 h-4" />
                Sincronização
              </TabsTrigger>
            </TabsList>

            {/* Filtros */}
            {activeTab === "julgados" && (
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    placeholder="Buscar julgados..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={tribunalFilter} onValueChange={setTribunalFilter}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="w-4 h-4 mr-2 text-zinc-400" />
                    <SelectValue placeholder="Tribunal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="STF">STF</SelectItem>
                    <SelectItem value="STJ">STJ</SelectItem>
                    <SelectItem value="TJBA">TJBA</SelectItem>
                    <SelectItem value="TRF1">TRF1</SelectItem>
                    <SelectItem value="TRF3">TRF3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Tab: Julgados */}
          <TabsContent value="julgados" className="mt-6">
            {loadingJulgados ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
            ) : !julgadosData?.julgados?.length ? (
              <EmptyState
                icon={BookOpen}
                title="Nenhum julgado encontrado"
                description={
                  search
                    ? "Tente ajustar os termos de busca"
                    : "Importe julgados do Google Drive ou adicione manualmente"
                }
                action={{
                  label: "Sincronizar Drive",
                  onClick: () => setShowAddFolderDialog(true),
                  icon: FolderSync,
                }}
              />
            ) : (
              <div className="space-y-4">
                {julgadosData.julgados.map((julgado) => (
                  <JulgadoCard
                    key={julgado.id}
                    julgado={julgado}
                    onToggleFavorito={() =>
                      toggleFavoritoMutation.mutate({ id: julgado.id })
                    }
                    onProcessarIA={() =>
                      processarIAMutation.mutate({ id: julgado.id })
                    }
                    isProcessing={processarIAMutation.isPending}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Temas */}
          <TabsContent value="temas" className="mt-6">
            <TemasSection />
          </TabsContent>

          {/* Tab: Sincronização */}
          <TabsContent value="sync" className="mt-6">
            <SyncSection
              folders={driveFolders || []}
              onSync={(id) => syncFolderMutation.mutate({ folderId: id })}
              isSyncing={syncFolderMutation.isPending}
              onAddFolder={() => setShowAddFolderDialog(true)}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog: Adicionar Pasta */}
      <AddFolderDialog
        open={showAddFolderDialog}
        onOpenChange={setShowAddFolderDialog}
        onSuccess={() => {
          refetchFolders();
          setShowAddFolderDialog(false);
        }}
      />
    </div>
  );
}

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

interface JulgadoCardProps {
  julgado: {
    id: number;
    tribunal: string;
    tipoDecisao: string;
    numeroProcesso: string | null;
    relator: string | null;
    orgaoJulgador: string | null;
    dataJulgamento: string | null;
    ementa: string | null;
    ementaResumo: string | null;
    status: string | null;
    isFavorito: boolean | null;
    citacaoFormatada: string | null;
    driveFileUrl: string | null;
  };
  onToggleFavorito: () => void;
  onProcessarIA: () => void;
  isProcessing: boolean;
}

function JulgadoCard({
  julgado,
  onToggleFavorito,
  onProcessarIA,
  isProcessing,
}: JulgadoCardProps) {
  const config = TRIBUNAL_CONFIG[julgado.tribunal as Tribunal] || TRIBUNAL_CONFIG.OUTRO;
  const Icon = config.icon;

  const statusConfig = {
    pendente: { icon: Clock, color: "text-zinc-500", label: "Pendente" },
    processando: { icon: Loader2, color: "text-blue-500", label: "Processando" },
    processado: { icon: Check, color: "text-emerald-500", label: "Processado" },
    erro: { icon: AlertCircle, color: "text-red-500", label: "Erro" },
  };

  const status = statusConfig[julgado.status as keyof typeof statusConfig] || statusConfig.pendente;
  const StatusIcon = status.icon;

  return (
    <div className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 hover:shadow-md transition-all">
      <div className="flex items-start gap-4">
        {/* Ícone do tribunal */}
        <div className={cn("p-2.5 rounded-lg shrink-0", config.color)}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs font-medium">
                  {config.label}
                </Badge>
                {julgado.numeroProcesso && (
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {julgado.numeroProcesso}
                  </span>
                )}
                <div className={cn("flex items-center gap-1 text-xs", status.color)}>
                  <StatusIcon className={cn("w-3 h-3", julgado.status === "processando" && "animate-spin")} />
                  {status.label}
                </div>
              </div>
              {julgado.relator && (
                <p className="text-sm text-zinc-500 mt-1">
                  Rel. {julgado.relator}
                  {julgado.orgaoJulgador && ` - ${julgado.orgaoJulgador}`}
                  {julgado.dataJulgamento && (
                    <span className="ml-2">
                      ({format(new Date(julgado.dataJulgamento), "dd/MM/yyyy")})
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Ações */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onToggleFavorito}
              >
                {julgado.isFavorito ? (
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                ) : (
                  <StarOff className="w-4 h-4 text-zinc-400" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/admin/jurisprudencia/${julgado.id}`}
                      className="flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Ver detalhes
                    </Link>
                  </DropdownMenuItem>
                  {julgado.citacaoFormatada && (
                    <DropdownMenuItem
                      onClick={() => {
                        navigator.clipboard.writeText(julgado.citacaoFormatada!);
                        toast.success("Citação copiada!");
                      }}
                      className="flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copiar citação
                    </DropdownMenuItem>
                  )}
                  {julgado.driveFileUrl && (
                    <DropdownMenuItem asChild>
                      <a
                        href={julgado.driveFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Abrir no Drive
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onProcessarIA}
                    disabled={isProcessing || julgado.status === "processado"}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isProcessing ? "Processando..." : "Processar com IA"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Ementa/Resumo */}
          <div className="mt-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
              {julgado.ementaResumo || julgado.ementa || "Sem ementa disponível"}
            </p>
          </div>

          {/* Citação para copiar */}
          {julgado.citacaoFormatada && (
            <div className="mt-3 flex items-center gap-2">
              <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded flex-1 truncate">
                {julgado.citacaoFormatada}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => {
                  navigator.clipboard.writeText(julgado.citacaoFormatada!);
                  toast.success("Citação copiada!");
                }}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// PAINEL DE CHAT COM IA
// ==========================================

function AIChatPanel({ onClose }: { onClose: () => void }) {
  const [pergunta, setPergunta] = useState("");
  const [mensagens, setMensagens] = useState<
    Array<{ role: "user" | "assistant"; content: string; precedentes?: any[] }>
  >([]);

  const askMutation = trpc.jurisprudencia.askIA.useMutation({
    onSuccess: (data) => {
      setMensagens((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.resposta,
          precedentes: data.precedentesFormatados,
        },
      ]);
    },
    onError: (err) => {
      toast.error("Erro: " + err.message);
    },
  });

  const handleSubmit = () => {
    if (!pergunta.trim()) return;

    setMensagens((prev) => [...prev, { role: "user", content: pergunta }]);
    askMutation.mutate({ pergunta });
    setPergunta("");
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold">Assistente de Jurisprudência</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Fechar
        </Button>
      </div>

      <ScrollArea className="h-80 p-4">
        {mensagens.length === 0 ? (
          <div className="text-center text-zinc-500 py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              Faça perguntas sobre jurisprudência criminal.
              <br />A IA buscará nos julgados e citará os precedentes relevantes.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {mensagens.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "p-3 rounded-lg",
                  msg.role === "user"
                    ? "bg-amber-50 dark:bg-amber-950/20 ml-8"
                    : "bg-zinc-50 dark:bg-zinc-800 mr-8"
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {msg.precedentes && msg.precedentes.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-zinc-500">
                      Precedentes citados:
                    </p>
                    {msg.precedentes.map((p, j) => (
                      <div
                        key={j}
                        className="bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-700"
                      >
                        <div className="flex items-center justify-between">
                          <code className="text-xs">{p.citacao}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => {
                              navigator.clipboard.writeText(p.citacao);
                              toast.success("Citação copiada!");
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {askMutation.isPending && (
              <div className="flex items-center gap-2 text-zinc-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Buscando precedentes...</span>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-2">
          <Textarea
            placeholder="Ex: Qual o entendimento do STJ sobre busca domiciliar sem mandado?"
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            className="min-h-[60px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button
            className="shrink-0"
            onClick={handleSubmit}
            disabled={askMutation.isPending || !pergunta.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SEÇÃO DE TEMAS
// ==========================================

function TemasSection() {
  const { data: temas, isLoading } = trpc.jurisprudencia.listTemas.useQuery({
    parentId: null,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!temas?.length) {
    return (
      <EmptyState
        icon={FileText}
        title="Nenhum tema cadastrado"
        description="Crie temas para organizar seus julgados por assunto"
        action={{
          label: "Criar Tema",
          onClick: () => {},
          icon: Plus,
        }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {temas.map((tema) => (
        <div
          key={tema.id}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: tema.cor || "#6366f1" }}
            />
            <Badge variant="secondary" className="text-xs">
              {tema.totalJulgados || 0} julgados
            </Badge>
          </div>
          <h3 className="mt-3 font-semibold text-zinc-900 dark:text-zinc-100">
            {tema.nome}
          </h3>
          {tema.descricao && (
            <p className="mt-1 text-sm text-zinc-500 line-clamp-2">
              {tema.descricao}
            </p>
          )}
          <div className="mt-3 flex items-center text-xs text-zinc-400">
            <ChevronRight className="w-4 h-4" />
            Ver julgados
          </div>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// SEÇÃO DE SINCRONIZAÇÃO
// ==========================================

function SyncSection({
  folders,
  onSync,
  isSyncing,
  onAddFolder,
}: {
  folders: any[];
  onSync: (id: number) => void;
  isSyncing: boolean;
  onAddFolder: () => void;
}) {
  if (!folders.length) {
    return (
      <EmptyState
        icon={FolderSync}
        title="Nenhuma pasta configurada"
        description="Configure pastas do Google Drive para sincronizar julgados automaticamente"
        action={{
          label: "Adicionar Pasta",
          onClick: onAddFolder,
          icon: FolderPlus,
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {folders.map((folder) => (
        <div
          key={folder.id}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <FolderSync className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                  {folder.folderName || "Pasta do Drive"}
                </h3>
                <p className="text-sm text-zinc-500">
                  {folder.arquivosSincronizados || 0} de {folder.totalArquivos || 0} arquivos
                  {folder.lastSyncAt && (
                    <span className="ml-2">
                      - Última sync:{" "}
                      {format(new Date(folder.lastSyncAt), "dd/MM HH:mm")}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {folder.tribunal && (
                <Badge variant="outline">{folder.tribunal}</Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSync(folder.id)}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Sincronizar
              </Button>
            </div>
          </div>
        </div>
      ))}

      <Button variant="outline" className="w-full gap-2" onClick={onAddFolder}>
        <Plus className="w-4 h-4" />
        Adicionar outra pasta
      </Button>
    </div>
  );
}

// ==========================================
// DIALOG: ADICIONAR PASTA
// ==========================================

function AddFolderDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [folderId, setFolderId] = useState("");
  const [folderName, setFolderName] = useState("");
  const [tribunal, setTribunal] = useState<string>("");

  const addMutation = trpc.jurisprudencia.addDriveFolder.useMutation({
    onSuccess: () => {
      toast.success("Pasta adicionada com sucesso!");
      onSuccess();
      setFolderId("");
      setFolderName("");
      setTribunal("");
    },
    onError: (err) => {
      toast.error("Erro: " + err.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Pasta do Drive</DialogTitle>
          <DialogDescription>
            Adicione uma pasta do Google Drive para sincronizar julgados
            automaticamente. Os PDFs serão processados por IA para extrair
            informações.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">ID da Pasta do Drive</label>
            <Input
              placeholder="Ex: 1abc123..."
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
            />
            <p className="text-xs text-zinc-500">
              Copie o ID da URL da pasta no Google Drive
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nome da Pasta (opcional)</label>
            <Input
              placeholder="Ex: Julgados STJ 2024"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Tribunal (para todos os arquivos da pasta)
            </label>
            <Select value={tribunal} onValueChange={setTribunal}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tribunal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STF">STF</SelectItem>
                <SelectItem value="STJ">STJ</SelectItem>
                <SelectItem value="TJBA">TJBA</SelectItem>
                <SelectItem value="TRF1">TRF1</SelectItem>
                <SelectItem value="TRF3">TRF3</SelectItem>
                <SelectItem value="OUTRO">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() =>
              addMutation.mutate({
                folderId,
                folderName: folderName || undefined,
                tribunal: tribunal ? (tribunal as any) : undefined,
              })
            }
            disabled={!folderId || addMutation.isPending}
          >
            {addMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
