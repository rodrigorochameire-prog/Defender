"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ExternalLink,
  Eye,
  Edit,
  Clock,
  MoreHorizontal,
  RefreshCw,
  FolderOpen,
  Scale,
  Swords,
  Sparkles,
  Link2,
  Copy,
  CheckCircle2,
  Info,
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
  acusacao: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400" },
  defesa: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400" },
  alternativa: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400" },
};

interface NovaSimulacaoForm {
  titulo: string;
  descricao: string;
  splineUrl: string;
}

export default function Simulador3DPage() {
  const [selectedCasoId, setSelectedCasoId] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [novaSimulacao, setNovaSimulacao] = useState<NovaSimulacaoForm>({
    titulo: "",
    descricao: "",
    splineUrl: "",
  });
  const [copiedId, setCopiedId] = useState<number | null>(null);

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
      setNovaSimulacao({ titulo: "", descricao: "", splineUrl: "" });
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

  const handleCopySplineUrl = (url: string, id: number) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("URL copiada!");
    setTimeout(() => setCopiedId(null), 2000);
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
                Reconstituição visual com Spline
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
                    <Sparkles className="h-5 w-5 text-cyan-500" />
                    Nova Simulação 3D
                  </DialogTitle>
                  <DialogDescription>
                    Crie uma reconstituição visual dos fatos usando Spline
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="titulo">Título da Simulação</Label>
                    <Input
                      id="titulo"
                      value={novaSimulacao.titulo}
                      onChange={(e) => setNovaSimulacao(prev => ({ ...prev, titulo: e.target.value }))}
                      placeholder="Ex: Reconstituição - Versão Defesa"
                      className="bg-white dark:bg-zinc-800"
                    />
                  </div>

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

                  {/* Info sobre Spline */}
                  <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-cyan-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-cyan-700 dark:text-cyan-300">
                          Como funciona:
                        </p>
                        <ol className="mt-1 text-cyan-600 dark:text-cyan-400 space-y-1 list-decimal list-inside">
                          <li>Crie a simulação aqui</li>
                          <li>Acesse <a href="https://spline.design" target="_blank" rel="noopener noreferrer" className="underline font-medium">spline.design</a> para criar a cena 3D</li>
                          <li>Cole o link de compartilhamento na simulação</li>
                          <li>Apresente direto no plenário!</li>
                        </ol>
                      </div>
                    </div>
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
                        Criar
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
            <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-md mb-6">
              Escolha um caso para criar simulações 3D de reconstituição
            </p>

            {/* Como funciona */}
            <Card className="max-w-2xl w-full bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/10 dark:to-blue-900/10 border-cyan-200 dark:border-cyan-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-cyan-500" />
                  Como usar o Simulador 3D
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4">
                    <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center mx-auto mb-2">
                      <span className="text-cyan-600 font-bold">1</span>
                    </div>
                    <h4 className="font-medium text-zinc-700 dark:text-zinc-300">Crie no Spline</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Use o editor visual gratuito em spline.design
                    </p>
                  </div>
                  <div className="text-center p-4">
                    <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center mx-auto mb-2">
                      <span className="text-cyan-600 font-bold">2</span>
                    </div>
                    <h4 className="font-medium text-zinc-700 dark:text-zinc-300">Vincule ao Caso</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Cole o link de compartilhamento aqui
                    </p>
                  </div>
                  <div className="text-center p-4">
                    <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center mx-auto mb-2">
                      <span className="text-cyan-600 font-bold">3</span>
                    </div>
                    <h4 className="font-medium text-zinc-700 dark:text-zinc-300">Apresente</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Abra direto no plenário do Júri
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-cyan-200 dark:border-cyan-800">
                  <Button variant="outline" className="w-full" asChild>
                    <a href="https://spline.design" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir Spline Design (gratuito)
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* Info do Caso */}
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
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            {simulacoes?.length || 0} simulação(ões)
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://spline.design" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Criar no Spline
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lista de Simulações */}
            {isLoadingSimulacoes ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-cyan-500" />
                <span className="ml-2 text-zinc-500">Carregando...</span>
              </div>
            ) : !simulacoes || simulacoes.length === 0 ? (
              <Card className="border-dashed border-2 border-zinc-300 dark:border-zinc-700">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="p-4 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
                    <Box className="h-10 w-10 text-zinc-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Nenhuma simulação ainda
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-md mb-4">
                    Crie sua primeira simulação 3D para este caso
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {simulacoes.map((simulacao) => {
                  const statusConfig = STATUS_CONFIG[simulacao.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.RASCUNHO;
                  const cenaData = simulacao.cenaData as { cenario?: { modeloUrl?: string } } | null;
                  const splineUrl = cenaData?.cenario?.modeloUrl;

                  return (
                    <Card
                      key={simulacao.id}
                      className="group transition-all hover:shadow-lg hover:border-cyan-300 dark:hover:border-cyan-700"
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
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {splineUrl && (
                                <>
                                  <DropdownMenuItem asChild>
                                    <a href={splineUrl} target="_blank" rel="noopener noreferrer">
                                      <Play className="h-4 w-4 mr-2" />
                                      Abrir Simulação
                                    </a>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCopySplineUrl(splineUrl, simulacao.id)}>
                                    {copiedId === simulacao.id ? (
                                      <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                                    ) : (
                                      <Copy className="h-4 w-4 mr-2" />
                                    )}
                                    Copiar Link
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem asChild>
                                <a href="https://spline.design" target="_blank" rel="noopener noreferrer">
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar no Spline
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-rose-600"
                                onClick={() => handleDeleteSimulacao(simulacao.id)}
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

                        {/* Preview ou placeholder */}
                        <div
                          className="aspect-video rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mb-3 overflow-hidden cursor-pointer"
                          onClick={() => splineUrl && window.open(splineUrl, '_blank')}
                        >
                          {splineUrl ? (
                            <div className="text-center">
                              <Play className="h-10 w-10 mx-auto text-cyan-500 mb-2" />
                              <span className="text-xs text-zinc-500">Clique para abrir</span>
                            </div>
                          ) : (
                            <div className="text-center p-4">
                              <Link2 className="h-8 w-8 mx-auto text-zinc-400 mb-2" />
                              <span className="text-xs text-zinc-500 block">Sem link do Spline</span>
                              <Button
                                variant="link"
                                size="sm"
                                className="text-cyan-500 mt-1"
                                asChild
                              >
                                <a href="https://spline.design" target="_blank" rel="noopener noreferrer">
                                  Criar agora
                                </a>
                              </Button>
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
                                  className={cn("text-xs", cores.bg, cores.text)}
                                >
                                  {versao.tipo === "acusacao" && <Scale className="h-3 w-3 mr-1" />}
                                  {versao.tipo === "defesa" && <Swords className="h-3 w-3 mr-1" />}
                                  {versao.nome}
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
                              })}
                            </span>
                          </div>
                          {splineUrl && (
                            <Badge variant="outline" className="text-xs bg-cyan-50 dark:bg-cyan-900/20">
                              <Box className="h-3 w-3 mr-1" />
                              Spline
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Dicas */}
            <Card className="mt-6 bg-zinc-50 dark:bg-zinc-900/50">
              <CardContent className="p-4">
                <h4 className="font-medium text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-500" />
                  Dicas para criar no Spline
                </h4>
                <ul className="text-sm text-zinc-500 dark:text-zinc-400 space-y-1">
                  <li>• Use formas básicas (cubos, esferas) para representar pessoas</li>
                  <li>• Adicione setas para indicar movimento e direção</li>
                  <li>• Use cores diferentes para acusação (vermelho) e defesa (verde)</li>
                  <li>• Exporte como link público para apresentar no plenário</li>
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
