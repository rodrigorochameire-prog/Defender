"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Box,
  Play,
  Plus,
  Trash2,
  Download,
  Eye,
  Edit,
  Video,
  Users,
  Layers,
  Clock,
  MoreHorizontal,
  RefreshCw,
  FolderOpen,
  Clapperboard,
  Scale,
  Swords,
  FileVideo,
  Maximize2,
  Copy,
  Film,
  Camera,
  Move3D,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// Status badges
const STATUS_CONFIG = {
  RASCUNHO: { label: "Rascunho", className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400" },
  PRONTO: { label: "Pronto", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  APRESENTADO: { label: "Apresentado", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  ARQUIVADO: { label: "Arquivado", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

// Cores para versões
const VERSAO_CORES = {
  acusacao: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", border: "border-red-300 dark:border-red-800" },
  defesa: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-300 dark:border-emerald-800" },
  alternativa: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400", border: "border-purple-300 dark:border-purple-800" },
  comparativa: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", border: "border-blue-300 dark:border-blue-800" },
};

interface NovaSimulacaoForm {
  titulo: string;
  descricao: string;
}

export default function Simulador3DPage() {
  const [selectedCasoId, setSelectedCasoId] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [novaSimulacao, setNovaSimulacao] = useState<NovaSimulacaoForm>({
    titulo: "",
    descricao: "",
  });

  // Query para listar casos
  const { data: casos } = trpc.casos.list.useQuery({
    status: "ativo",
    limit: 100,
  });

  // Query para listar simulações do caso selecionado
  const {
    data: simulacoes,
    refetch: refetchSimulacoes,
    isLoading: isLoadingSimulacoes,
  } = trpc.simulador.listByCaso.useQuery(
    { casoId: parseInt(selectedCasoId) },
    { enabled: !!selectedCasoId }
  );

  // Mutations
  const createMutation = trpc.simulador.create.useMutation({
    onSuccess: () => {
      toast.success("Simulação criada com sucesso!");
      refetchSimulacoes();
      setIsCreateDialogOpen(false);
      setNovaSimulacao({ titulo: "", descricao: "" });
    },
    onError: (error) => {
      toast.error(`Erro ao criar simulação: ${error.message}`);
    },
  });

  const deleteMutation = trpc.simulador.delete.useMutation({
    onSuccess: () => {
      toast.success("Simulação excluída!");
      refetchSimulacoes();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  // Handlers
  const handleCreateSimulacao = () => {
    if (!selectedCasoId || !novaSimulacao.titulo.trim()) {
      toast.error("Selecione um caso e informe o título");
      return;
    }

    createMutation.mutate({
      casoId: parseInt(selectedCasoId),
      titulo: novaSimulacao.titulo,
      descricao: novaSimulacao.descricao || undefined,
    });
  };

  const handleDeleteSimulacao = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta simulação?")) {
      deleteMutation.mutate({ id });
    }
  };

  const casoSelecionado = casos?.items?.find(c => c.id.toString() === selectedCasoId);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
              <Box className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Simulador 3D
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Reconstituição visual dos fatos para o Tribunal do Júri
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

            {/* Botão Criar Simulação */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                  disabled={!selectedCasoId}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Simulação
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Clapperboard className="h-5 w-5 text-cyan-500" />
                    Nova Simulação 3D
                  </DialogTitle>
                  <DialogDescription>
                    Crie uma reconstituição visual dos fatos do caso
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  {/* Título */}
                  <div className="grid gap-2">
                    <Label htmlFor="titulo">Título da Simulação</Label>
                    <Input
                      id="titulo"
                      value={novaSimulacao.titulo}
                      onChange={(e) => setNovaSimulacao(prev => ({ ...prev, titulo: e.target.value }))}
                      placeholder="Ex: Reconstituição do Homicídio - Versão Defesa"
                      className="bg-white dark:bg-zinc-800"
                    />
                  </div>

                  {/* Descrição */}
                  <div className="grid gap-2">
                    <Label htmlFor="descricao">Descrição (opcional)</Label>
                    <Textarea
                      id="descricao"
                      value={novaSimulacao.descricao}
                      onChange={(e) => setNovaSimulacao(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Descreva o objetivo desta simulação..."
                      className="bg-white dark:bg-zinc-800 min-h-[80px]"
                    />
                  </div>

                  {/* Info sobre versões */}
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      <Sparkles className="h-4 w-4 inline mr-1 text-cyan-500" />
                      Duas versões serão criadas automaticamente: <strong>Acusação</strong> e <strong>Defesa</strong>.
                      Você poderá adicionar versões alternativas depois.
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateSimulacao}
                    disabled={!novaSimulacao.titulo.trim() || createMutation.isPending}
                    className="bg-cyan-600 hover:bg-cyan-700"
                  >
                    {createMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Simulação
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
              <Box className="h-12 w-12 text-zinc-400" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Selecione um Caso
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-md">
              Escolha um caso para criar ou visualizar simulações 3D de reconstituição forense
            </p>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 max-w-3xl">
              <Card className="bg-white/50 dark:bg-zinc-900/50 border-dashed">
                <CardContent className="p-4 text-center">
                  <Move3D className="h-8 w-8 mx-auto mb-2 text-cyan-500" />
                  <h4 className="font-medium text-zinc-700 dark:text-zinc-300">Cenários 3D</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Modele o local do crime com objetos e personagens
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white/50 dark:bg-zinc-900/50 border-dashed">
                <CardContent className="p-4 text-center">
                  <Swords className="h-8 w-8 mx-auto mb-2 text-red-500" />
                  <h4 className="font-medium text-zinc-700 dark:text-zinc-300">Versões Comparativas</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Compare acusação vs defesa lado a lado
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white/50 dark:bg-zinc-900/50 border-dashed">
                <CardContent className="p-4 text-center">
                  <FileVideo className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                  <h4 className="font-medium text-zinc-700 dark:text-zinc-300">Exportação em Vídeo</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Gere vídeos MP4 para apresentar no plenário
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <>
            {/* Info do Caso Selecionado */}
            {casoSelecionado && (
              <Card className="mb-6 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/10 dark:to-blue-900/10 border-cyan-200 dark:border-cyan-800/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                        <FolderOpen className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {casoSelecionado.titulo}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{casoSelecionado.atribuicao}</Badge>
                          <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                            {casoSelecionado.fase || "ativo"}
                          </Badge>
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            {simulacoes?.length || 0} simulação(ões)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lista de Simulações */}
            {isLoadingSimulacoes ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-cyan-500" />
                <span className="ml-2 text-zinc-500">Carregando simulações...</span>
              </div>
            ) : !simulacoes || simulacoes.length === 0 ? (
              /* Estado vazio - Sem simulações */
              <Card className="border-dashed border-2 border-zinc-300 dark:border-zinc-700">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="p-4 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
                    <Clapperboard className="h-10 w-10 text-zinc-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Nenhuma simulação ainda
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-md mb-4">
                    Crie sua primeira simulação 3D para reconstituir os fatos do caso
                  </p>
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-cyan-600 hover:bg-cyan-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeira Simulação
                  </Button>
                </CardContent>
              </Card>
            ) : (
              /* Grid de Simulações */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {simulacoes.map((simulacao) => {
                  const statusConfig = STATUS_CONFIG[simulacao.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.RASCUNHO;

                  return (
                    <Card
                      key={simulacao.id}
                      className="group cursor-pointer transition-all hover:shadow-lg hover:border-cyan-300 dark:hover:border-cyan-700"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                              <Box className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                            </div>
                            <div>
                              <CardTitle className="text-base">
                                {simulacao.titulo}
                              </CardTitle>
                              <Badge className={statusConfig.className}>
                                {statusConfig.label}
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
                                window.location.href = `/admin/simulador-3d/${simulacao.id}`;
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/admin/simulador-3d/${simulacao.id}/preview`;
                              }}>
                                <Play className="h-4 w-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                toast.info("Exportação em desenvolvimento");
                              }}>
                                <Download className="h-4 w-4 mr-2" />
                                Exportar Vídeo
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-rose-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSimulacao(simulacao.id);
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
                        {simulacao.descricao && (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3">
                            {simulacao.descricao}
                          </p>
                        )}

                        {/* Preview placeholder */}
                        <div className="aspect-video rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mb-3 overflow-hidden">
                          {simulacao.thumbnail ? (
                            <img
                              src={simulacao.thumbnail}
                              alt={simulacao.titulo}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center text-zinc-400">
                              <Move3D className="h-8 w-8 mb-1" />
                              <span className="text-xs">Sem preview</span>
                            </div>
                          )}
                        </div>

                        {/* Versões */}
                        {simulacao.versoes && simulacao.versoes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {simulacao.versoes.map((versao) => {
                              const cores = VERSAO_CORES[versao.tipo as keyof typeof VERSAO_CORES] || VERSAO_CORES.alternativa;
                              return (
                                <Badge
                                  key={versao.id}
                                  variant="outline"
                                  className={cn("text-xs", cores.bg, cores.text, cores.border)}
                                >
                                  {versao.tipo === "acusacao" && <Scale className="h-3 w-3 mr-1" />}
                                  {versao.tipo === "defesa" && <Swords className="h-3 w-3 mr-1" />}
                                  {versao.nome}
                                  {versao.duracao && (
                                    <span className="ml-1 opacity-70">{versao.duracao}s</span>
                                  )}
                                </Badge>
                              );
                            })}
                          </div>
                        )}

                        {/* Metadados */}
                        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(simulacao.updatedAt).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{simulacao.criadoPor?.name?.split(" ")[0] || "Anônimo"}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Features Info */}
            <div className="mt-8 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/10 dark:to-blue-900/10 rounded-lg border border-cyan-200 dark:border-cyan-800/50">
              <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-cyan-500" />
                Recursos do Simulador 3D
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <Move3D className="h-4 w-4 text-cyan-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-zinc-700 dark:text-zinc-300">Cenário Interativo</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Arraste e posicione objetos</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-cyan-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-zinc-700 dark:text-zinc-300">Personagens Animados</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Mixamo + Ready Player Me</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Film className="h-4 w-4 text-cyan-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-zinc-700 dark:text-zinc-300">Timeline Visual</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Theatre.js para keyframes</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Video className="h-4 w-4 text-cyan-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-zinc-700 dark:text-zinc-300">Export Remotion</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">MP4/WebM de alta qualidade</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
