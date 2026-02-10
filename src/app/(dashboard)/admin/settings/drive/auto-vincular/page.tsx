"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Link2,
  Search,
  Users,
  FolderOpen,
  Wand2,
  Check,
  X,
  RefreshCw,
  HardDrive,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import Link from "next/link";

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function AutoVincularPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isLinking, setIsLinking] = useState(false);

  // Buscar assistidos sem vinculação
  const { data: assistidosData, isLoading: loadingAssistidos, refetch: refetchAssistidos } =
    trpc.assistidos.list.useQuery({ limit: 100 });

  // Buscar sugestões para todos os assistidos sem vínculo
  const assistidosSemVinculo = useMemo(() => {
    if (!assistidosData) return [];
    return assistidosData.filter(a => !a.driveFolderId);
  }, [assistidosData]);

  const assistidosComVinculo = useMemo(() => {
    if (!assistidosData) return [];
    return assistidosData.filter(a => a.driveFolderId);
  }, [assistidosData]);

  // Auto-link mutation
  const autoLinkMutation = trpc.drive.autoLinkAssistidosByName.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.linkedCount} assistido(s) vinculado(s) automaticamente!`);
      refetchAssistidos();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mutation para vincular individualmente
  const linkMutation = trpc.drive.linkAssistidoToFolder.useMutation({
    onSuccess: () => {
      toast.success("Assistido vinculado com sucesso!");
      refetchAssistidos();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Filtrar por busca
  const filteredAssistidos = useMemo(() => {
    if (!searchTerm.trim()) return assistidosSemVinculo;
    const term = searchTerm.toLowerCase();
    return assistidosSemVinculo.filter(a =>
      a.nome.toLowerCase().includes(term)
    );
  }, [assistidosSemVinculo, searchTerm]);

  // Toggle seleção
  const toggleSelected = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Selecionar todos
  const selectAll = () => {
    setSelectedIds(new Set(filteredAssistidos.map(a => a.id)));
  };

  // Desselecionar todos
  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Executar auto-vinculação
  const handleAutoLink = () => {
    autoLinkMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/settings/drive">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Auto-Vincular Assistidos
            </h1>
            <p className="text-sm text-muted-foreground">
              Vincule automaticamente assistidos às pastas do Drive pelo nome
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{assistidosComVinculo.length}</p>
              <p className="text-xs text-muted-foreground">Já vinculados</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{assistidosSemVinculo.length}</p>
              <p className="text-xs text-muted-foreground">Sem vínculo</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{assistidosData?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total assistidos</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Auto-Link Button */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <Wand2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Vinculação Automática por Nome</h3>
              <p className="text-sm text-muted-foreground">
                Busca pastas no Drive com nomes similares aos assistidos (80%+ de similaridade)
              </p>
            </div>
          </div>
          <Button
            onClick={handleAutoLink}
            disabled={autoLinkMutation.isPending}
            className="gap-2"
          >
            {autoLinkMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Executar Auto-Vinculação
              </>
            )}
          </Button>
        </div>

        {/* Resultado da auto-vinculação */}
        {autoLinkMutation.data && (
          <div className="mt-4 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="font-medium">
                {autoLinkMutation.data.linkedCount} assistido(s) vinculado(s)
              </span>
            </div>

            {autoLinkMutation.data.results.filter(r => r.linked).length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Vinculados:</p>
                <div className="grid gap-2">
                  {autoLinkMutation.data.results
                    .filter(r => r.linked)
                    .map((result, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded bg-emerald-50 dark:bg-emerald-900/20 text-sm"
                      >
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span className="font-medium">{result.assistidoNome}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{result.folderName}</span>
                        <Badge variant="outline" className="ml-auto text-xs">
                          {Math.round((result.similarity || 0) * 100)}% match
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {autoLinkMutation.data.results.filter(r => !r.linked).length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Sem correspondência ({autoLinkMutation.data.results.filter(r => !r.linked).length}):
                </p>
                <div className="flex flex-wrap gap-1">
                  {autoLinkMutation.data.results
                    .filter(r => !r.linked)
                    .slice(0, 10)
                    .map((result, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {result.assistidoNome}
                      </Badge>
                    ))}
                  {autoLinkMutation.data.results.filter(r => !r.linked).length > 10 && (
                    <Badge variant="secondary" className="text-xs">
                      +{autoLinkMutation.data.results.filter(r => !r.linked).length - 10} mais
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Lista de Assistidos sem vínculo */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Assistidos sem Vínculo</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchAssistidos()}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar assistido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Selection actions */}
        {filteredAssistidos.length > 0 && (
          <div className="flex items-center gap-4 mb-4 pb-4 border-b">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.size === filteredAssistidos.length && filteredAssistidos.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) selectAll();
                  else deselectAll();
                }}
              />
              <span className="text-sm text-muted-foreground">
                {selectedIds.size > 0 ? `${selectedIds.size} selecionado(s)` : "Selecionar todos"}
              </span>
            </div>
          </div>
        )}

        {/* Lista */}
        {loadingAssistidos ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filteredAssistidos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? (
              <>Nenhum assistido encontrado para &ldquo;{searchTerm}&rdquo;</>
            ) : (
              <>
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                <p className="font-medium">Todos os assistidos estão vinculados!</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredAssistidos.map((assistido) => (
              <AssistidoRow
                key={assistido.id}
                assistido={assistido}
                isSelected={selectedIds.has(assistido.id)}
                onToggle={() => toggleSelected(assistido.id)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ==========================================
// COMPONENTE DE LINHA
// ==========================================

interface AssistidoRowProps {
  assistido: {
    id: number;
    nome: string;
    cpf?: string | null;
    statusPrisional?: string | null;
  };
  isSelected: boolean;
  onToggle: () => void;
}

function AssistidoRow({ assistido, isSelected, onToggle }: AssistidoRowProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Buscar sugestões de pastas
  const { data: suggestions, isLoading: loadingSuggestions } =
    trpc.drive.suggestFoldersForAssistido.useQuery(
      { assistidoId: assistido.id },
      { enabled: showSuggestions }
    );

  // Mutation para vincular
  const linkMutation = trpc.drive.linkAssistidoToFolder.useMutation({
    onSuccess: () => {
      toast.success(`${assistido.nome} vinculado com sucesso!`);
      setShowSuggestions(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleLink = (folderId: string) => {
    linkMutation.mutate({ assistidoId: assistido.id, folderId });
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    CADEIA_PUBLICA: { label: "Preso", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
    PENITENCIARIA: { label: "Preso", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
    COP: { label: "Preso", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
    HOSPITAL_CUSTODIA: { label: "Preso", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
    MONITORADO: { label: "Monitorado", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    DOMICILIAR: { label: "Domiciliar", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
    SOLTO: { label: "Solto", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  };

  const status = statusConfig[assistido.statusPrisional || "SOLTO"] || statusConfig.SOLTO;

  return (
    <div className="border rounded-lg">
      <div className="flex items-center gap-3 p-3">
        <Checkbox checked={isSelected} onCheckedChange={onToggle} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{assistido.nome}</span>
            <Badge variant="secondary" className={cn("text-xs", status.color)}>
              {status.label}
            </Badge>
          </div>
          {assistido.cpf && (
            <p className="text-xs text-muted-foreground font-mono">{assistido.cpf}</p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="gap-2"
        >
          <FolderOpen className="w-4 h-4" />
          {showSuggestions ? "Ocultar" : "Sugestões"}
        </Button>
      </div>

      {/* Sugestões de pastas */}
      {showSuggestions && (
        <div className="border-t p-3 bg-muted/30">
          {loadingSuggestions ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Buscando sugestões...
            </div>
          ) : suggestions && suggestions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">
                Pastas sugeridas (clique para vincular):
              </p>
              {suggestions.map((folder, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors",
                    "hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-900/20 dark:hover:border-emerald-800"
                  )}
                  onClick={() => handleLink(folder.folderId)}
                >
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{folder.folderName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        folder.similarity >= 0.9 && "bg-emerald-100 text-emerald-700 border-emerald-200",
                        folder.similarity >= 0.8 && folder.similarity < 0.9 && "bg-blue-100 text-blue-700 border-blue-200",
                        folder.similarity < 0.8 && "bg-amber-100 text-amber-700 border-amber-200"
                      )}
                    >
                      {Math.round(folder.similarity * 100)}% match
                    </Badge>
                    {linkMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <X className="w-4 h-4" />
              Nenhuma pasta similar encontrada
            </div>
          )}
        </div>
      )}
    </div>
  );
}
