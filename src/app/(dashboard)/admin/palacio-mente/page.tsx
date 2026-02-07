"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Brain,
  Search,
  Plus,
  Trash2,
  Download,
  Upload,
  Eye,
  Edit,
  Network,
  GitBranch,
  Clock,
  Grid3X3,
  Workflow,
  Sparkles,
  RefreshCw,
  MoreHorizontal,
  ExternalLink,
  Save,
  FolderOpen,
  Users,
  FileText,
  Scale,
  MessageSquare,
  Target,
  Link2,
  Unlink,
  Palette,
  LayoutGrid,
  Timer,
  Share2,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// Tipos de diagramas disponíveis
const TIPOS_DIAGRAMA = [
  {
    id: "MAPA_MENTAL",
    label: "Mapa Mental",
    descricao: "Brainstorming e conexão de ideias",
    icon: Brain,
    cor: "emerald"
  },
  {
    id: "TIMELINE",
    label: "Linha do Tempo",
    descricao: "Cronologia dos fatos",
    icon: Clock,
    cor: "blue"
  },
  {
    id: "RELACIONAL",
    label: "Mapa Relacional",
    descricao: "Relacionamentos entre pessoas/provas",
    icon: Network,
    cor: "purple"
  },
  {
    id: "HIERARQUIA",
    label: "Árvore Hierárquica",
    descricao: "Estrutura de argumentos/teses",
    icon: GitBranch,
    cor: "amber"
  },
  {
    id: "MATRIX",
    label: "Matriz",
    descricao: "Análise de contradições/comparações",
    icon: Grid3X3,
    cor: "rose"
  },
  {
    id: "FLUXOGRAMA",
    label: "Fluxograma",
    descricao: "Fluxo de eventos e decisões",
    icon: Workflow,
    cor: "cyan"
  },
  {
    id: "LIVRE",
    label: "Livre",
    descricao: "Layout livre para rascunhos",
    icon: Sparkles,
    cor: "zinc"
  },
] as const;

// Cores para badges de tipo
const TIPO_CORES: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
};

// Ícones para tipos de entidades do caso
const ENTITY_ICONS: Record<string, typeof Users> = {
  persona: Users,
  fato: FileText,
  documento: FileText,
  testemunha: MessageSquare,
  tese: Target,
  prova: Scale,
};

interface NovoDiagramaForm {
  titulo: string;
  descricao: string;
  tipo: string;
}

export default function PalacioMentePage() {
  const [selectedCasoId, setSelectedCasoId] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [novoDiagrama, setNovoDiagrama] = useState<NovoDiagramaForm>({
    titulo: "",
    descricao: "",
    tipo: "MAPA_MENTAL",
  });
  const [selectedDiagramaId, setSelectedDiagramaId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Query para listar casos
  const { data: casos } = trpc.casos.list.useQuery({
    status: "ativo",
    limit: 100,
  });

  // Query para listar diagramas do caso selecionado
  const {
    data: diagramas,
    refetch: refetchDiagramas,
    isLoading: isLoadingDiagramas,
  } = trpc.palacio.listByCaso.useQuery(
    { casoId: parseInt(selectedCasoId) },
    { enabled: !!selectedCasoId }
  );

  // Query para buscar diagrama específico
  const {
    data: diagramaAtual,
    isLoading: isLoadingDiagrama,
  } = trpc.palacio.getById.useQuery(
    { id: selectedDiagramaId! },
    { enabled: !!selectedDiagramaId }
  );

  // Query para entidades do caso (para vincular no diagrama)
  const { data: entidadesCaso } = trpc.palacio.getCaseEntities.useQuery(
    { casoId: parseInt(selectedCasoId) },
    { enabled: !!selectedCasoId }
  );

  // Mutations
  const createMutation = trpc.palacio.create.useMutation({
    onSuccess: () => {
      toast.success("Diagrama criado com sucesso!");
      refetchDiagramas();
      setIsCreateDialogOpen(false);
      setNovoDiagrama({ titulo: "", descricao: "", tipo: "MAPA_MENTAL" });
    },
    onError: (error) => {
      toast.error(`Erro ao criar diagrama: ${error.message}`);
    },
  });

  const deleteMutation = trpc.palacio.delete.useMutation({
    onSuccess: () => {
      toast.success("Diagrama excluído!");
      refetchDiagramas();
      if (selectedDiagramaId) {
        setSelectedDiagramaId(null);
      }
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  const exportMutation = trpc.palacio.export.useMutation({
    onSuccess: (data) => {
      // Criar blob e fazer download
      const blob = new Blob([data.conteudo], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.nomeArquivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exportado como ${data.nomeArquivo}`);
    },
    onError: (error) => {
      toast.error(`Erro ao exportar: ${error.message}`);
    },
  });

  // Handlers
  const handleCreateDiagrama = () => {
    if (!selectedCasoId || !novoDiagrama.titulo.trim()) {
      toast.error("Selecione um caso e informe o título");
      return;
    }

    createMutation.mutate({
      casoId: parseInt(selectedCasoId),
      titulo: novoDiagrama.titulo,
      descricao: novoDiagrama.descricao || undefined,
      tipo: novoDiagrama.tipo as typeof TIPOS_DIAGRAMA[number]["id"],
    });
  };

  const handleDeleteDiagrama = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este diagrama?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleExportDiagrama = (id: number, formato: "obsidian" | "standard" | "animated") => {
    exportMutation.mutate({ diagramaId: id, formato });
  };

  const getTipoInfo = (tipo: string) => {
    return TIPOS_DIAGRAMA.find(t => t.id === tipo) || TIPOS_DIAGRAMA[0];
  };

  const casoSelecionado = casos?.items?.find(c => c.id.toString() === selectedCasoId);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Palácio da Mente
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Visualize e conecte as peças do quebra-cabeça
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Seletor de Caso */}
            <Select value={selectedCasoId} onValueChange={setSelectedCasoId}>
              <SelectTrigger className="w-[280px] bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                <SelectValue placeholder="Selecione um caso..." />
              </SelectTrigger>
              <SelectContent>
                {casos?.items?.map((caso) => (
                  <SelectItem key={caso.id} value={caso.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{caso.titulo}</span>
                      <Badge variant="outline" className="text-xs">
                        {caso.fase || "ativo"}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Botão Criar Diagrama */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  disabled={!selectedCasoId}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Diagrama
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Criar Novo Diagrama</DialogTitle>
                  <DialogDescription>
                    Escolha o tipo de diagrama para visualizar o caso
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  {/* Título */}
                  <div className="grid gap-2">
                    <Label htmlFor="titulo">Título do Diagrama</Label>
                    <Input
                      id="titulo"
                      value={novoDiagrama.titulo}
                      onChange={(e) => setNovoDiagrama(prev => ({ ...prev, titulo: e.target.value }))}
                      placeholder="Ex: Cronologia dos Fatos"
                      className="bg-white dark:bg-zinc-800"
                    />
                  </div>

                  {/* Descrição */}
                  <div className="grid gap-2">
                    <Label htmlFor="descricao">Descrição (opcional)</Label>
                    <Textarea
                      id="descricao"
                      value={novoDiagrama.descricao}
                      onChange={(e) => setNovoDiagrama(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Descreva o propósito deste diagrama..."
                      className="bg-white dark:bg-zinc-800 min-h-[80px]"
                    />
                  </div>

                  {/* Tipo de Diagrama */}
                  <div className="grid gap-2">
                    <Label>Tipo de Diagrama</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {TIPOS_DIAGRAMA.map((tipo) => {
                        const Icon = tipo.icon;
                        const isSelected = novoDiagrama.tipo === tipo.id;
                        return (
                          <button
                            key={tipo.id}
                            type="button"
                            onClick={() => setNovoDiagrama(prev => ({ ...prev, tipo: tipo.id }))}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all",
                              isSelected
                                ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                                : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                            )}
                          >
                            <div className={cn(
                              "p-1.5 rounded-md",
                              isSelected
                                ? "bg-purple-500 text-white"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            )}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm font-medium",
                                isSelected ? "text-purple-700 dark:text-purple-300" : "text-zinc-700 dark:text-zinc-300"
                              )}>
                                {tipo.label}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                {tipo.descricao}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateDiagrama}
                    disabled={!novoDiagrama.titulo.trim() || createMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {createMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Diagrama
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="p-4 md:p-6">
        {!selectedCasoId ? (
          /* Estado vazio - Nenhum caso selecionado */
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="p-4 rounded-full bg-zinc-200 dark:bg-zinc-800 mb-4">
              <Brain className="h-12 w-12 text-zinc-400" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Selecione um Caso
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-md">
              Escolha um caso para visualizar ou criar diagramas de investigação no estilo Sherlock Holmes
            </p>
          </div>
        ) : (
          <>
            {/* Info do Caso Selecionado */}
            {casoSelecionado && (
              <Card className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 border-purple-200 dark:border-purple-800/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <FolderOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {casoSelecionado.titulo}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{casoSelecionado.atribuicao}</Badge>
                          <Badge className={TIPO_CORES.zinc}>{casoSelecionado.fase || "ativo"}</Badge>
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            {diagramas?.length || 0} diagrama(s)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Estatísticas de Entidades */}
                    {entidadesCaso && (
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                          <Users className="h-4 w-4" />
                          <span>{entidadesCaso.personas.length} personas</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                          <FileText className="h-4 w-4" />
                          <span>{entidadesCaso.fatos.length} fatos</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                          <MessageSquare className="h-4 w-4" />
                          <span>{entidadesCaso.testemunhas.length} testemunhas</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                          <Target className="h-4 w-4" />
                          <span>{entidadesCaso.teses.length} teses</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lista de Diagramas */}
            {isLoadingDiagramas ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-purple-500" />
                <span className="ml-2 text-zinc-500">Carregando diagramas...</span>
              </div>
            ) : !diagramas || diagramas.length === 0 ? (
              /* Estado vazio - Sem diagramas */
              <Card className="border-dashed border-2 border-zinc-300 dark:border-zinc-700">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="p-4 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
                    <LayoutGrid className="h-10 w-10 text-zinc-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Nenhum diagrama ainda
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-md mb-4">
                    Crie seu primeiro diagrama para começar a visualizar as conexões do caso
                  </p>
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Diagrama
                  </Button>
                </CardContent>
              </Card>
            ) : (
              /* Grid de Diagramas */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {diagramas.map((diagrama) => {
                  const tipoInfo = getTipoInfo(diagrama.tipo);
                  const Icon = tipoInfo.icon;

                  return (
                    <Card
                      key={diagrama.id}
                      className={cn(
                        "group cursor-pointer transition-all hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700",
                        selectedDiagramaId === diagrama.id && "ring-2 ring-purple-500"
                      )}
                      onClick={() => setSelectedDiagramaId(diagrama.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              `bg-${tipoInfo.cor}-100 dark:bg-${tipoInfo.cor}-900/30`
                            )} style={{
                              backgroundColor: tipoInfo.cor === 'emerald' ? 'rgb(209 250 229)' :
                                            tipoInfo.cor === 'blue' ? 'rgb(219 234 254)' :
                                            tipoInfo.cor === 'purple' ? 'rgb(243 232 255)' :
                                            tipoInfo.cor === 'amber' ? 'rgb(254 243 199)' :
                                            tipoInfo.cor === 'rose' ? 'rgb(255 228 230)' :
                                            tipoInfo.cor === 'cyan' ? 'rgb(207 250 254)' :
                                            'rgb(244 244 245)'
                            }}>
                              <Icon className="h-5 w-5" style={{
                                color: tipoInfo.cor === 'emerald' ? 'rgb(5 150 105)' :
                                       tipoInfo.cor === 'blue' ? 'rgb(37 99 235)' :
                                       tipoInfo.cor === 'purple' ? 'rgb(147 51 234)' :
                                       tipoInfo.cor === 'amber' ? 'rgb(217 119 6)' :
                                       tipoInfo.cor === 'rose' ? 'rgb(225 29 72)' :
                                       tipoInfo.cor === 'cyan' ? 'rgb(6 182 212)' :
                                       'rgb(113 113 122)'
                              }} />
                            </div>
                            <div>
                              <CardTitle className="text-base">
                                {diagrama.titulo}
                              </CardTitle>
                              <Badge className={TIPO_CORES[tipoInfo.cor]} variant="secondary">
                                {tipoInfo.label}
                              </Badge>
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDiagramaId(diagrama.id);
                                setIsEditing(true);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(JSON.stringify(diagrama.excalidrawData || {}));
                                toast.success("JSON copiado para a área de transferência");
                              }}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar JSON
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleExportDiagrama(diagrama.id, "obsidian");
                              }}>
                                <Download className="h-4 w-4 mr-2" />
                                Exportar Obsidian
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleExportDiagrama(diagrama.id, "standard");
                              }}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Exportar Excalidraw
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleExportDiagrama(diagrama.id, "animated");
                              }}>
                                <Timer className="h-4 w-4 mr-2" />
                                Exportar Animado
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-rose-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDiagrama(diagrama.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        {diagrama.descricao && (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3">
                            {diagrama.descricao}
                          </p>
                        )}

                        {/* Preview do thumbnail ou placeholder */}
                        <div className="aspect-video rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mb-3 overflow-hidden">
                          {diagrama.thumbnail ? (
                            <img
                              src={diagrama.thumbnail}
                              alt={diagrama.titulo}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center text-zinc-400">
                              <Icon className="h-8 w-8 mb-1" />
                              <span className="text-xs">Sem preview</span>
                            </div>
                          )}
                        </div>

                        {/* Metadados */}
                        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(diagrama.updatedAt).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>v{diagrama.versao || 1}</span>
                          </div>
                        </div>

                        {/* Tags */}
                        {diagrama.tags && (diagrama.tags as string[]).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(diagrama.tags as string[]).slice(0, 3).map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {(diagrama.tags as string[]).length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{(diagrama.tags as string[]).length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Painel de Edição - Excalidraw Editor (placeholder para integração futura) */}
            {selectedDiagramaId && isEditing && (
              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-500" />
                      {diagramaAtual?.titulo || "Editando Diagrama"}
                    </DialogTitle>
                    <DialogDescription>
                      Use as ferramentas do Excalidraw para criar seu diagrama
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex-1 min-h-[70vh] bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                    {/* Placeholder para o editor Excalidraw */}
                    <div className="text-center">
                      <div className="p-4 rounded-full bg-purple-100 dark:bg-purple-900/30 inline-block mb-4">
                        <Sparkles className="h-12 w-12 text-purple-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                        Editor Excalidraw
                      </h3>
                      <p className="text-zinc-500 dark:text-zinc-400 max-w-md mb-4">
                        A integração com o editor Excalidraw será implementada em breve.
                        Por enquanto, você pode exportar os diagramas e editá-los em{" "}
                        <a
                          href="https://excalidraw.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-500 hover:underline"
                        >
                          excalidraw.com
                        </a>
                      </p>

                      {/* Links úteis */}
                      <div className="flex items-center justify-center gap-3">
                        <Button variant="outline" asChild>
                          <a href="https://excalidraw.com" target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Abrir Excalidraw
                          </a>
                        </Button>
                        <Button variant="outline" asChild>
                          <a href="https://dai-shi.github.io/excalidraw-animate/" target="_blank" rel="noopener noreferrer">
                            <Timer className="h-4 w-4 mr-2" />
                            Excalidraw Animate
                          </a>
                        </Button>
                      </div>

                      {/* Entidades disponíveis para vincular */}
                      {entidadesCaso && (
                        <div className="mt-6 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg max-w-lg mx-auto">
                          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                            Entidades disponíveis para vincular:
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-left text-sm">
                            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                              <Users className="h-4 w-4" />
                              <span>{entidadesCaso.personas.length} Personas</span>
                            </div>
                            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                              <FileText className="h-4 w-4" />
                              <span>{entidadesCaso.fatos.length} Fatos</span>
                            </div>
                            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                              <Scale className="h-4 w-4" />
                              <span>{entidadesCaso.documentos.length} Documentos</span>
                            </div>
                            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                              <MessageSquare className="h-4 w-4" />
                              <span>{entidadesCaso.testemunhas.length} Testemunhas</span>
                            </div>
                            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                              <Target className="h-4 w-4" />
                              <span>{entidadesCaso.teses.length} Teses</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Fechar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </>
        )}
      </div>
    </div>
  );
}
