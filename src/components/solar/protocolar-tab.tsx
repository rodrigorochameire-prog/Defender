"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  FolderOpen,
  Link2,
  Loader2,
  RefreshCw,
  Send,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ──────────────────────────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────────────────────────

interface ProtocolarItem {
  id: string;
  nome: string;
  mimeType: string;
  tamanho: number | null;
  modificadoEm?: string;
  webViewLink?: string;

  atoDetectado: string | null;
  processoDetectado: string | null;
  demandaMatch: {
    id: number;
    ato: string;
    status: string;
    processoId: number;
    assistidoNome?: string;
  } | null;

  docxCorrespondente: {
    id: string;
    nome: string;
    mimeType: string;
    webViewLink?: string;
  } | null;

  subpastaDestino: string | null;
  faseSolar: {
    tipo: string;
    qualificacao: string | null;
    descricaoTemplate: string | null;
  } | null;

  matchStatus: "vinculado" | "processo_encontrado" | "ato_detectado" | "manual";
}

type FilterMatch = "todos" | "vinculados" | "parciais" | "manuais";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function matchStatusBadge(status: string) {
  switch (status) {
    case "vinculado":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[10px]">
          <Check className="h-3 w-3 mr-0.5" /> Vinculado
        </Badge>
      );
    case "processo_encontrado":
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0 text-[10px]">
          <Link2 className="h-3 w-3 mr-0.5" /> Processo
        </Badge>
      );
    case "ato_detectado":
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[10px]">
          <FileText className="h-3 w-3 mr-0.5" /> Ato
        </Badge>
      );
    default:
      return (
        <Badge className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-0 text-[10px]">
          <AlertTriangle className="h-3 w-3 mr-0.5" /> Manual
        </Badge>
      );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Componente Principal
// ──────────────────────────────────────────────────────────────────────────────

export function ProtocolarTab() {
  const [filterMatch, setFilterMatch] = useState<FilterMatch>("todos");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [protocolando, setProtocolando] = useState<string | null>(null);

  // Query: listar PDFs da pasta Protocolar
  const {
    data: protocolarData,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.solar.listProtocolar.useQuery(
    { pageSize: 100 },
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 min
    }
  );

  // Mutation: protocolar no Solar
  const protocolarMutation = trpc.solar.protocolarNoSolar.useMutation({
    onSuccess: (result, variables) => {
      if (result.success) {
        toast.success(
          `Protocolado: ${variables.pdfFileName}`,
          {
            description: `${result.resumo?.etapasBemSucedidas ?? 0} etapas concluidas`,
          }
        );
        refetch();
      } else {
        toast.error("Falha no protocolo", {
          description: result.error || "Verifique os detalhes",
        });
      }
    },
    onError: (error) => {
      toast.error("Erro ao protocolar", { description: error.message });
    },
  });

  // Items filtrados
  const items: ProtocolarItem[] = useMemo(() => {
    if (!protocolarData?.items) return [];
    return protocolarData.items as ProtocolarItem[];
  }, [protocolarData]);

  const filteredItems = useMemo(() => {
    if (filterMatch === "todos") return items;
    if (filterMatch === "vinculados") return items.filter(i => i.matchStatus === "vinculado");
    if (filterMatch === "parciais") return items.filter(i => i.matchStatus === "processo_encontrado" || i.matchStatus === "ato_detectado");
    return items.filter(i => i.matchStatus === "manual");
  }, [items, filterMatch]);

  // Contadores
  const contadores = useMemo(() => ({
    total: items.length,
    vinculados: items.filter(i => i.matchStatus === "vinculado").length,
    parciais: items.filter(i => i.matchStatus === "processo_encontrado" || i.matchStatus === "ato_detectado").length,
    manuais: items.filter(i => i.matchStatus === "manual").length,
  }), [items]);

  // Handlers
  function toggleSelection(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  }

  async function handleProtocolar(item: ProtocolarItem) {
    if (!item.demandaMatch) {
      toast.error("Demanda nao vinculada", {
        description: "Vincule o arquivo a uma demanda antes de protocolar",
      });
      return;
    }

    setProtocolando(item.id);

    try {
      await protocolarMutation.mutateAsync({
        pdfFileId: item.id,
        pdfFileName: item.nome,
        docxFileId: item.docxCorrespondente?.id,
        atendimentoId: "", // TODO: Será preenchido quando o matching Solar estiver completo
        numeroProcesso: item.processoDetectado || "",
        ato: item.atoDetectado || item.demandaMatch.ato,
        faseDescricao: item.faseSolar?.descricaoTemplate?.replace(
          "{nome}",
          item.demandaMatch.assistidoNome?.toUpperCase() ?? ""
        ),
        demandaId: item.demandaMatch.id,
        subpastaDestino: item.subpastaDestino || undefined,
        dryRun: false,
      });
    } finally {
      setProtocolando(null);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Protocolar
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            PDFs da pasta Protocolar prontos para enviar ao Solar
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={cn("h-4 w-4 mr-1.5", isRefetching && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card
          className={cn(
            "cursor-pointer transition-all border",
            filterMatch === "todos"
              ? "border-zinc-400 dark:border-zinc-500 bg-zinc-50 dark:bg-zinc-800/50"
              : "hover:border-zinc-300 dark:hover:border-zinc-700"
          )}
          onClick={() => setFilterMatch("todos")}
        >
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{contadores.total}</div>
            <div className="text-xs text-zinc-500">Total PDFs</div>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "cursor-pointer transition-all border",
            filterMatch === "vinculados"
              ? "border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
              : "hover:border-zinc-300 dark:hover:border-zinc-700"
          )}
          onClick={() => setFilterMatch("vinculados")}
        >
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{contadores.vinculados}</div>
            <div className="text-xs text-zinc-500">Vinculados</div>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "cursor-pointer transition-all border",
            filterMatch === "parciais"
              ? "border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20"
              : "hover:border-zinc-300 dark:hover:border-zinc-700"
          )}
          onClick={() => setFilterMatch("parciais")}
        >
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{contadores.parciais}</div>
            <div className="text-xs text-zinc-500">Parciais</div>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "cursor-pointer transition-all border",
            filterMatch === "manuais"
              ? "border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20"
              : "hover:border-zinc-300 dark:hover:border-zinc-700"
          )}
          onClick={() => setFilterMatch("manuais")}
        >
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{contadores.manuais}</div>
            <div className="text-xs text-zinc-500">Manuais</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              <span className="ml-2 text-sm text-zinc-500">Carregando arquivos do Drive...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-3" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {items.length === 0
                  ? "Nenhum PDF encontrado na pasta Protocolar"
                  : "Nenhum item com este filtro"
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead className="text-xs">Arquivo</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Processo</TableHead>
                    <TableHead className="text-xs">Demanda</TableHead>
                    <TableHead className="text-xs">Destino</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow
                      key={item.id}
                      className={cn(
                        "group",
                        selectedIds.has(item.id) && "bg-zinc-50 dark:bg-zinc-800/30"
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelection(item.id)}
                        />
                      </TableCell>

                      {/* Arquivo */}
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate max-w-[200px]" title={item.nome}>
                              {item.nome}
                            </p>
                            <p className="text-[10px] text-zinc-400">
                              {formatBytes(item.tamanho)}
                              {item.docxCorrespondente && (
                                <span className="ml-1.5 text-blue-500">
                                  + DOCX
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Tipo */}
                      <TableCell>
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">
                          {item.atoDetectado || "—"}
                        </span>
                      </TableCell>

                      {/* Processo */}
                      <TableCell>
                        <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                          {item.processoDetectado || "—"}
                        </span>
                      </TableCell>

                      {/* Demanda */}
                      <TableCell>
                        {item.demandaMatch ? (
                          <div className="text-xs">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                              #{item.demandaMatch.id}
                            </span>
                            {item.demandaMatch.assistidoNome && (
                              <p className="text-[10px] text-zinc-400 truncate max-w-[120px]">
                                {item.demandaMatch.assistidoNome}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </TableCell>

                      {/* Destino (subpasta) */}
                      <TableCell>
                        {item.subpastaDestino ? (
                          <div className="flex items-center gap-1">
                            <FolderOpen className="h-3 w-3 text-zinc-400" />
                            <span className="text-[10px] text-zinc-500 truncate max-w-[100px]" title={item.subpastaDestino}>
                              {item.subpastaDestino}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {matchStatusBadge(item.matchStatus)}
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {item.webViewLink && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              asChild
                            >
                              <a href={item.webViewLink} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant={item.matchStatus === "vinculado" ? "default" : "outline"}
                            size="sm"
                            className={cn(
                              "h-7 text-xs gap-1",
                              item.matchStatus === "vinculado"
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : ""
                            )}
                            disabled={
                              protocolando === item.id ||
                              !item.demandaMatch
                            }
                            onClick={() => handleProtocolar(item)}
                          >
                            {protocolando === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                            Protocolar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info footer */}
      {protocolarData && protocolarData.total > 0 && (
        <p className="text-xs text-zinc-400 text-center">
          {protocolarData.total} PDF(s) encontrado(s) na pasta Protocolar
          {protocolarData.totalDrive && protocolarData.totalDrive > protocolarData.total && (
            <span> ({protocolarData.totalDrive} arquivos total incl. DOCX)</span>
          )}
        </p>
      )}
    </div>
  );
}
