"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Search,
  Plus,
  Lightbulb,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  MoreVertical,
  Edit3,
  Trash2,
  ChevronDown,
  User,
  FileText,
  MapPin,
  Phone,
  Globe,
  History,
  Loader2,
  Filter,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ==========================================
// TIPOS E CONSTANTES
// ==========================================

interface DiligenciasPanelProps {
  processoId?: number;
  processoNumero?: string;
  assistidoId?: number;
  assistidoNome?: string;
  casoId?: number;
  area?: string;
  fase?: string;
  tags?: string[];
  compact?: boolean;
}

const STATUS_CONFIG = {
  A_PESQUISAR: { label: "A Pesquisar", color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: Search },
  EM_ANDAMENTO: { label: "Em Andamento", color: "bg-blue-100 text-blue-800 border-blue-300", icon: Clock },
  AGUARDANDO: { label: "Aguardando", color: "bg-purple-100 text-purple-800 border-purple-300", icon: Clock },
  LOCALIZADO: { label: "Localizado", color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle },
  OBTIDO: { label: "Obtido", color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle },
  INFRUTIFERO: { label: "Infrutífero", color: "bg-gray-100 text-gray-600 border-gray-300", icon: XCircle },
  ARQUIVADO: { label: "Arquivado", color: "bg-gray-100 text-gray-500 border-gray-200", icon: XCircle },
} as const;

const TIPO_CONFIG = {
  LOCALIZACAO_PESSOA: { label: "Localização de Pessoa", icon: User },
  LOCALIZACAO_DOCUMENTO: { label: "Localização de Documento", icon: FileText },
  REQUISICAO_DOCUMENTO: { label: "Requisição de Documento", icon: FileText },
  PESQUISA_OSINT: { label: "Pesquisa OSINT", icon: Globe },
  DILIGENCIA_CAMPO: { label: "Diligência de Campo", icon: MapPin },
  INTIMACAO: { label: "Intimação", icon: FileText },
  OITIVA: { label: "Oitiva", icon: User },
  PERICIA: { label: "Perícia", icon: Search },
  EXAME: { label: "Exame", icon: FileText },
  OUTRO: { label: "Outro", icon: FileText },
} as const;

const PRIORIDADE_CONFIG = {
  BAIXA: { label: "Baixa", color: "bg-gray-100 text-gray-600" },
  NORMAL: { label: "Normal", color: "bg-blue-100 text-blue-700" },
  ALTA: { label: "Alta", color: "bg-orange-100 text-orange-700" },
  URGENTE: { label: "Urgente", color: "bg-red-100 text-red-700" },
  REU_PRESO: { label: "Réu Preso", color: "bg-red-200 text-red-800" },
} as const;

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export function DiligenciasPanel({
  processoId,
  assistidoId,
  casoId,
  area,
  fase,
  tags,
  compact = false,
}: DiligenciasPanelProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDiligencia, setSelectedDiligencia] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const utils = trpc.useUtils();

  // Queries
  const { data: diligencias, isLoading } = trpc.diligencias.list.useQuery({
    processoId,
    assistidoId,
    casoId,
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
  });

  const { data: stats } = trpc.diligencias.stats.useQuery({
    processoId,
    assistidoId,
    casoId,
  });

  const { data: sugestoes } = trpc.diligencias.getSugestoes.useQuery({
    casoId,
    processoId,
    assistidoId,
    area,
    fase,
    tags,
  }, {
    enabled: showSugestoes,
  });

  // Mutations
  const updateMutation = trpc.diligencias.update.useMutation({
    onSuccess: () => {
      utils.diligencias.list.invalidate();
      utils.diligencias.stats.invalidate();
      toast.success("Diligência atualizada!");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteMutation = trpc.diligencias.delete.useMutation({
    onSuccess: () => {
      utils.diligencias.list.invalidate();
      utils.diligencias.stats.invalidate();
      toast.success("Diligência excluída!");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const createFromSugestaoMutation = trpc.diligencias.createFromSugestao.useMutation({
    onSuccess: () => {
      utils.diligencias.list.invalidate();
      utils.diligencias.stats.invalidate();
      utils.diligencias.getSugestoes.invalidate();
      toast.success("Diligência criada a partir da sugestão!");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const bulkCreateMutation = trpc.diligencias.bulkCreateFromSugestoes.useMutation({
    onSuccess: (data) => {
      utils.diligencias.list.invalidate();
      utils.diligencias.stats.invalidate();
      utils.diligencias.getSugestoes.invalidate();
      toast.success(`${data.count} diligências criadas!`);
      setShowSugestoes(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Handlers
  const handleStatusChange = (id: number, newStatus: string) => {
    updateMutation.mutate({ id, status: newStatus as any });
  };

  const handleDelete = (id: number) => {
    if (confirm("Excluir esta diligência?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleAcceptSugestao = (templateId: number) => {
    createFromSugestaoMutation.mutate({
      templateId,
      processoId,
      assistidoId,
      casoId,
    });
  };

  const handleAcceptAllSugestoes = () => {
    const templateIds = sugestoes
      ?.filter(s => !s.jaExiste)
      .map(s => s.templateId) || [];

    if (templateIds.length === 0) {
      toast.info("Não há sugestões pendentes");
      return;
    }

    bulkCreateMutation.mutate({
      templateIds,
      processoId,
      assistidoId,
      casoId,
    });
  };

  const openDetail = (diligencia: any) => {
    setSelectedDiligencia(diligencia);
    setShowDetailModal(true);
  };

  // Estatísticas
  const pendentes = (stats?.aPesquisar || 0) + (stats?.emAndamento || 0) + (stats?.aguardando || 0);
  const sugestoesPendentes = sugestoes?.filter(s => !s.jaExiste).length || 0;

  return (
    <Card className={cn(compact && "border-0 shadow-none")}>
      <CardHeader className={cn("pb-3", compact && "px-0 pt-0")}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Diligências Investigativas
            </CardTitle>
            {!compact && (
              <CardDescription>
                Gerencie pesquisas, localizações e investigações do caso
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            {stats && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground mr-4">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  {pendentes} pendentes
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  {stats.concluidas} concluídas
                </span>
                {stats.urgentes > 0 && (
                  <span className="flex items-center gap-1 text-red-600 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    {stats.urgentes} urgentes
                  </span>
                )}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSugestoes(!showSugestoes)}
              className="relative"
            >
              <Lightbulb className="h-4 w-4 mr-1" />
              Sugestões
              {sugestoesPendentes > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-amber-500">
                  {sugestoesPendentes}
                </Badge>
              )}
            </Button>
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Nova
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn(compact && "px-0")}>
        {/* Painel de Sugestões */}
        {showSugestoes && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center gap-2 text-amber-800">
                <Lightbulb className="h-4 w-4" />
                Diligências Sugeridas para o Caso
              </h4>
              {sugestoesPendentes > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAcceptAllSugestoes}
                  disabled={bulkCreateMutation.isPending}
                  className="border-amber-300 hover:bg-amber-100"
                >
                  {bulkCreateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-1" />
                  )}
                  Aceitar Todas ({sugestoesPendentes})
                </Button>
              )}
            </div>

            {sugestoes && sugestoes.length > 0 ? (
              <div className="space-y-2">
                {sugestoes.map((sugestao) => (
                  <div
                    key={sugestao.templateId}
                    className={cn(
                      "flex items-center justify-between p-3 bg-white rounded-md border",
                      sugestao.jaExiste && "opacity-50"
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{sugestao.titulo}</span>
                        <Badge variant="outline" className="text-xs">
                          {TIPO_CONFIG[sugestao.tipo as keyof typeof TIPO_CONFIG]?.label || sugestao.tipo}
                        </Badge>
                        {sugestao.prioridade && sugestao.prioridade !== "NORMAL" && (
                          <Badge className={cn("text-xs", PRIORIDADE_CONFIG[sugestao.prioridade as keyof typeof PRIORIDADE_CONFIG]?.color)}>
                            {PRIORIDADE_CONFIG[sugestao.prioridade as keyof typeof PRIORIDADE_CONFIG]?.label}
                          </Badge>
                        )}
                      </div>
                      {sugestao.descricao && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {sugestao.descricao}
                        </p>
                      )}
                    </div>
                    {sugestao.jaExiste ? (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Já criada
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAcceptSugestao(sugestao.templateId)}
                        disabled={createFromSugestaoMutation.isPending}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Criar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-amber-700">
                Nenhuma sugestão disponível para este contexto.
              </p>
            )}
          </div>
        )}

        {/* Filtros */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar diligências..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => utils.diligencias.list.invalidate()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Lista de Diligências */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : diligencias && diligencias.length > 0 ? (
          <div className="space-y-2">
            {diligencias.map((diligencia) => (
              <DiligenciaItem
                key={diligencia.id}
                diligencia={diligencia}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onEdit={() => openDetail(diligencia)}
                compact={compact}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma diligência encontrada</p>
            <p className="text-sm">
              Clique em &quot;Sugestões&quot; para ver diligências recomendadas
            </p>
          </div>
        )}
      </CardContent>

      {/* Modal de Criação */}
      <CreateDiligenciaModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        processoId={processoId}
        assistidoId={assistidoId}
        casoId={casoId}
        onSuccess={() => {
          utils.diligencias.list.invalidate();
          utils.diligencias.stats.invalidate();
        }}
      />

      {/* Modal de Detalhes */}
      {selectedDiligencia && (
        <DiligenciaDetailModal
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
          diligencia={selectedDiligencia}
          onUpdate={() => {
            utils.diligencias.list.invalidate();
            utils.diligencias.stats.invalidate();
          }}
        />
      )}
    </Card>
  );
}

// ==========================================
// COMPONENTE DE ITEM DE DILIGÊNCIA
// ==========================================

interface DiligenciaItemProps {
  diligencia: any;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  onEdit: () => void;
  compact?: boolean;
}

function DiligenciaItem({
  diligencia,
  onStatusChange,
  onDelete,
  onEdit,
  compact,
}: DiligenciaItemProps) {
  const statusConfig = STATUS_CONFIG[diligencia.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.A_PESQUISAR;
  const tipoConfig = TIPO_CONFIG[diligencia.tipo as keyof typeof TIPO_CONFIG] || TIPO_CONFIG.OUTRO;
  const prioridadeConfig = PRIORIDADE_CONFIG[diligencia.prioridade as keyof typeof PRIORIDADE_CONFIG] || PRIORIDADE_CONFIG.NORMAL;
  const StatusIcon = statusConfig.icon;
  const TipoIcon = tipoConfig.icon;

  const isPriorityHigh = ["ALTA", "URGENTE", "REU_PRESO"].includes(diligencia.prioridade);

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/50 cursor-pointer",
        isPriorityHigh && "border-l-4 border-l-red-400"
      )}
      onClick={onEdit}
    >
      {/* Ícone do Tipo */}
      <div className="flex-shrink-0">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          statusConfig.color.split(" ")[0]
        )}>
          <TipoIcon className="h-5 w-5" />
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{diligencia.titulo}</span>
          {diligencia.isSugestaoAutomatica && (
            <Lightbulb className="h-3 w-3 text-amber-500" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {diligencia.nomePessoaAlvo && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {diligencia.nomePessoaAlvo}
            </span>
          )}
          {diligencia.processoNumero && (
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {diligencia.processoNumero}
            </span>
          )}
          {diligencia.prazoEstimado && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(diligencia.prazoEstimado), "dd/MM", { locale: ptBR })}
            </span>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge className={cn("text-xs", prioridadeConfig.color)}>
          {prioridadeConfig.label}
        </Badge>
        <Badge variant="outline" className={cn("text-xs border", statusConfig.color)}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {statusConfig.label}
        </Badge>
      </div>

      {/* Ações */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Edit3 className="h-4 w-4 mr-2" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(diligencia.id, "EM_ANDAMENTO"); }}>
            <Clock className="h-4 w-4 mr-2" />
            Em Andamento
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(diligencia.id, "LOCALIZADO"); }}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Localizado/Obtido
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(diligencia.id, "INFRUTIFERO"); }}>
            <XCircle className="h-4 w-4 mr-2" />
            Infrutífero
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); onDelete(diligencia.id); }}
            className="text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ==========================================
// MODAL DE CRIAÇÃO
// ==========================================

interface CreateDiligenciaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processoId?: number;
  assistidoId?: number;
  casoId?: number;
  onSuccess: () => void;
}

function CreateDiligenciaModal({
  open,
  onOpenChange,
  processoId,
  assistidoId,
  casoId,
  onSuccess,
}: CreateDiligenciaModalProps) {
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    tipo: "OUTRO",
    prioridade: "NORMAL",
    nomePessoaAlvo: "",
    tipoRelacao: "",
    telefoneAlvo: "",
    enderecoAlvo: "",
  });

  const createMutation = trpc.diligencias.create.useMutation({
    onSuccess: () => {
      toast.success("Diligência criada!");
      onOpenChange(false);
      onSuccess();
      setFormData({
        titulo: "",
        descricao: "",
        tipo: "OUTRO",
        prioridade: "NORMAL",
        nomePessoaAlvo: "",
        tipoRelacao: "",
        telefoneAlvo: "",
        enderecoAlvo: "",
      });
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      tipo: formData.tipo as any,
      prioridade: formData.prioridade as any,
      processoId,
      assistidoId,
      casoId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Diligência</DialogTitle>
          <DialogDescription>
            Crie uma nova diligência investigativa
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ex: Localizar testemunha João Silva"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select
                value={formData.prioridade}
                onValueChange={(value) => setFormData({ ...formData, prioridade: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORIDADE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descreva a diligência..."
              rows={3}
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Pessoa/Alvo (opcional)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nomePessoaAlvo">Nome</Label>
                <Input
                  id="nomePessoaAlvo"
                  value={formData.nomePessoaAlvo}
                  onChange={(e) => setFormData({ ...formData, nomePessoaAlvo: e.target.value })}
                  placeholder="Nome da pessoa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipoRelacao">Relação</Label>
                <Input
                  id="tipoRelacao"
                  value={formData.tipoRelacao}
                  onChange={(e) => setFormData({ ...formData, tipoRelacao: e.target.value })}
                  placeholder="Ex: testemunha, vítima"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="space-y-2">
                <Label htmlFor="telefoneAlvo">Telefone</Label>
                <Input
                  id="telefoneAlvo"
                  value={formData.telefoneAlvo}
                  onChange={(e) => setFormData({ ...formData, telefoneAlvo: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="enderecoAlvo">Endereço</Label>
                <Input
                  id="enderecoAlvo"
                  value={formData.enderecoAlvo}
                  onChange={(e) => setFormData({ ...formData, enderecoAlvo: e.target.value })}
                  placeholder="Endereço conhecido"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Diligência
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// MODAL DE DETALHES
// ==========================================

interface DiligenciaDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diligencia: any;
  onUpdate: () => void;
}

function DiligenciaDetailModal({
  open,
  onOpenChange,
  diligencia,
  onUpdate,
}: DiligenciaDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [novaAcao, setNovaAcao] = useState("");

  const utils = trpc.useUtils();

  const { data: fullDiligencia } = trpc.diligencias.getById.useQuery(
    { id: diligencia.id },
    { enabled: open }
  );

  const updateMutation = trpc.diligencias.update.useMutation({
    onSuccess: () => {
      toast.success("Diligência atualizada!");
      utils.diligencias.getById.invalidate();
      onUpdate();
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const addHistoricoMutation = trpc.diligencias.addHistorico.useMutation({
    onSuccess: () => {
      toast.success("Nota adicionada ao histórico!");
      utils.diligencias.getById.invalidate();
      setNovaAcao("");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleAddHistorico = () => {
    if (!novaAcao.trim()) return;
    addHistoricoMutation.mutate({
      diligenciaId: diligencia.id,
      acao: "nota",
      descricao: novaAcao,
    });
  };

  const data = fullDiligencia || diligencia;
  const statusConfig = STATUS_CONFIG[data.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.A_PESQUISAR;
  const tipoConfig = TIPO_CONFIG[data.tipo as keyof typeof TIPO_CONFIG] || TIPO_CONFIG.OUTRO;
  const prioridadeConfig = PRIORIDADE_CONFIG[data.prioridade as keyof typeof PRIORIDADE_CONFIG] || PRIORIDADE_CONFIG.NORMAL;

  const historico = (data.historico as any[]) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{data.titulo}</DialogTitle>
            <div className="flex items-center gap-2">
              <Badge className={cn("text-xs", prioridadeConfig.color)}>
                {prioridadeConfig.label}
              </Badge>
              <Badge variant="outline" className={cn("text-xs border", statusConfig.color)}>
                {statusConfig.label}
              </Badge>
            </div>
          </div>
          <DialogDescription>
            {tipoConfig.label}
            {data.isSugestaoAutomatica && (
              <span className="ml-2 text-amber-600">
                <Lightbulb className="h-3 w-3 inline mr-1" />
                Sugestão automática
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Descrição */}
          {data.descricao && (
            <div>
              <h4 className="font-medium mb-2">Descrição</h4>
              <p className="text-sm text-muted-foreground">{data.descricao}</p>
            </div>
          )}

          {/* Pessoa/Alvo */}
          {data.nomePessoaAlvo && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Pessoa/Alvo
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Nome:</span>
                  <p className="font-medium">{data.nomePessoaAlvo}</p>
                </div>
                {data.tipoRelacao && (
                  <div>
                    <span className="text-muted-foreground">Relação:</span>
                    <p className="font-medium">{data.tipoRelacao}</p>
                  </div>
                )}
                {data.telefoneAlvo && (
                  <div>
                    <span className="text-muted-foreground">Telefone:</span>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {data.telefoneAlvo}
                    </p>
                  </div>
                )}
                {data.enderecoAlvo && (
                  <div>
                    <span className="text-muted-foreground">Endereço:</span>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {data.enderecoAlvo}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Links OSINT */}
          {data.linksOsint && Object.keys(data.linksOsint).length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Links de Pesquisa (OSINT)
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.linksOsint).map(([key, value]) => {
                  if (!value) return null;
                  if (key === "outros" && Array.isArray(value)) {
                    return value.map((url, i) => (
                      <Button
                        key={`outros-${i}`}
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Link {i + 1}
                        </a>
                      </Button>
                    ));
                  }
                  return (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a href={value as string} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </a>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Histórico */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico de Ações
            </h4>

            {/* Adicionar nota */}
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Adicionar nota ao histórico..."
                value={novaAcao}
                onChange={(e) => setNovaAcao(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddHistorico()}
              />
              <Button
                onClick={handleAddHistorico}
                disabled={!novaAcao.trim() || addHistoricoMutation.isPending}
              >
                {addHistoricoMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>

            {historico.length > 0 ? (
              <div className="space-y-2">
                {historico.slice().reverse().map((entrada, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-2 text-sm border-l-2 border-muted pl-4"
                  >
                    <div className="flex-1">
                      <p>{entrada.descricao}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(entrada.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma ação registrada ainda
              </p>
            )}
          </div>

          {/* Resultado */}
          {data.resultado && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium mb-2 text-green-800">Resultado</h4>
              <p className="text-sm text-green-700">{data.resultado}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
