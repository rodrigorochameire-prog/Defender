"use client";

import { useState, useMemo, useEffect } from "react";
import { X, Layers, ChevronDown, ChevronRight, Loader2, AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface DuplicatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolved: () => void; // callback para refetch da lista de demandas
}

export function DuplicatesModal({ isOpen, onClose, onResolved }: DuplicatesModalProps) {
  // Estado: qual demanda manter por grupo (chave = "processoId-ato")
  const [selectedToKeep, setSelectedToKeep] = useState<Record<string, number>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  // Query para buscar duplicatas
  const { data: groups, isLoading, refetch } = trpc.demandas.findDuplicates.useQuery(
    undefined,
    { enabled: isOpen }
  );

  // Mutation para deletar em batch
  const deleteBatchMutation = trpc.demandas.deleteBatch.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.deleted} duplicata(s) resolvida(s)`);
      setConfirming(false);
      setSelectedToKeep({});
      refetch();
      onResolved();
    },
    onError: (error) => {
      toast.error(`Erro ao resolver duplicatas: ${error.message}`);
      setConfirming(false);
    },
  });

  // Default: selecionar a demanda mais recente (primeiro item, já ordenado por updatedAt DESC)
  useEffect(() => {
    if (!groups) return;
    const defaults: Record<string, number> = {};
    for (const group of groups) {
      const key = `${group.processoId}-${group.ato}`;
      if (!selectedToKeep[key] && group.demandas.length > 0) {
        defaults[key] = group.demandas[0].id;
      }
    }
    if (Object.keys(defaults).length > 0) {
      setSelectedToKeep(prev => ({ ...defaults, ...prev }));
    }
  }, [groups]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calcular IDs para deletar
  const idsToDelete = useMemo(() => {
    if (!groups) return [];
    const ids: number[] = [];
    for (const group of groups) {
      const key = `${group.processoId}-${group.ato}`;
      const keepId = selectedToKeep[key];
      for (const d of group.demandas) {
        if (d.id !== keepId) {
          ids.push(d.id);
        }
      }
    }
    return ids;
  }, [groups, selectedToKeep]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleResolve = () => {
    if (idsToDelete.length === 0) {
      toast.info("Nenhuma duplicata para resolver");
      return;
    }
    if (!confirming) {
      setConfirming(true);
      return;
    }
    deleteBatchMutation.mutate({ ids: idsToDelete });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-500/20 flex items-center justify-center">
                <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Encontrar Duplicatas</h2>
                <p className="text-xs text-neutral-500">
                  {isLoading
                    ? "Escaneando..."
                    : groups && groups.length > 0
                      ? `${groups.length} grupo(s) com ${groups.reduce((s, g) => s + g.count, 0)} demandas duplicadas`
                      : "Nenhuma duplicata encontrada"}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-400 mr-2" />
              <span className="text-sm text-neutral-500">Escaneando duplicatas...</span>
            </div>
          ) : !groups || groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
              <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-400" />
              <p className="text-sm font-medium">Nenhuma duplicata encontrada</p>
              <p className="text-xs mt-1">Sua lista de demandas está limpa</p>
            </div>
          ) : (
            groups.map((group) => {
              const key = `${group.processoId}-${group.ato}`;
              const isExpanded = expandedGroups.has(key);
              const keepId = selectedToKeep[key];

              return (
                <div
                  key={key}
                  className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden"
                >
                  {/* Group header — clicável */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                    onClick={() => toggleGroup(key)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{group.assistidoNome}</span>
                        <span className="text-xs text-neutral-400">•</span>
                        <span className="text-xs text-neutral-500 truncate">{group.ato}</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 font-mono mt-0.5 truncate">
                        {group.processoNumero}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] border-amber-300 text-amber-700 dark:text-amber-300 shrink-0"
                    >
                      {group.count}x
                    </Badge>
                  </button>

                  {/* Group content — tabela comparativa */}
                  {isExpanded && (
                    <div className="border-t border-neutral-200 dark:border-neutral-800">
                      <table className="w-full text-xs">
                        <thead className="bg-neutral-50 dark:bg-neutral-800/30">
                          <tr>
                            <th className="px-3 py-1.5 text-left font-medium w-[50px]">Manter</th>
                            <th className="px-3 py-1.5 text-left font-medium">Status</th>
                            <th className="px-3 py-1.5 text-left font-medium">Data Entrada</th>
                            <th className="px-3 py-1.5 text-left font-medium">Prazo</th>
                            <th className="px-3 py-1.5 text-left font-medium">Providências</th>
                            <th className="px-3 py-1.5 text-left font-medium w-[80px]">Criado em</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                          {group.demandas.map((d, idx) => {
                            const isKept = d.id === keepId;
                            const isToDelete = !isKept;

                            return (
                              <tr
                                key={d.id}
                                className={
                                  isKept
                                    ? "bg-emerald-50/50 dark:bg-emerald-900/10"
                                    : "bg-red-50/30 dark:bg-red-900/5 opacity-60"
                                }
                              >
                                {/* Radio — manter esta */}
                                <td className="px-3 py-2 text-center">
                                  <input
                                    type="radio"
                                    name={`keep-${key}`}
                                    checked={isKept}
                                    onChange={() => setSelectedToKeep(prev => ({ ...prev, [key]: d.id }))}
                                    className="accent-emerald-600"
                                  />
                                </td>

                                {/* Status */}
                                <td className="px-3 py-2">
                                  <Badge variant="outline" className="text-[9px] py-0">
                                    {d.substatus || d.status || "—"}
                                  </Badge>
                                  {d.reuPreso && (
                                    <span className="ml-1 text-red-500 text-[9px]">Preso</span>
                                  )}
                                </td>

                                {/* Data Entrada */}
                                <td className="px-3 py-2">{d.dataEntrada || "-"}</td>

                                {/* Prazo */}
                                <td className="px-3 py-2">{d.prazo || "-"}</td>

                                {/* Providências (coluna migrada para tabela "registros") */}
                                <td className="px-3 py-2">
                                  <span className="truncate block max-w-[200px]">
                                    -
                                  </span>
                                </td>

                                {/* Criado em */}
                                <td className="px-3 py-2 text-neutral-400">
                                  {formatDate(d.createdAt)}
                                  {idx === 0 && (
                                    <span className="ml-1 text-[8px] text-emerald-600">(recente)</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {groups && groups.length > 0 && (
          <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 shrink-0">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-500">
                {confirming ? (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Confirma a exclusão de {idsToDelete.length} demanda(s)? (soft delete — pode ser desfeito)
                  </span>
                ) : (
                  <>{idsToDelete.length} demanda(s) serão excluídas</>
                )}
              </p>
              <div className="flex items-center gap-2">
                {confirming && (
                  <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                    Cancelar
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={idsToDelete.length === 0 || deleteBatchMutation.isPending}
                  className={confirming
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }
                  onClick={handleResolve}
                >
                  {deleteBatchMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      Excluindo...
                    </>
                  ) : confirming ? (
                    <>
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Confirmar exclusão
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Resolver {idsToDelete.length} duplicata(s)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
