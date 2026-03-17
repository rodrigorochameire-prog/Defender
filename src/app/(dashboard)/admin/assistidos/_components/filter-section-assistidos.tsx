"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Filter,
  ChevronUp,
  ChevronDown,
  XCircle,
  LayoutGrid,
  List,
  MapPin,
  Activity,
} from "lucide-react";
import {
  ATRIBUICAO_OPTIONS,
  SOLID_COLOR_MAP,
} from "@/lib/config/atribuicoes";
import { ProcessingQueuePanel } from "@/components/drive/ProcessingQueuePanel";
import { useProcessingQueue } from "@/contexts/processing-queue";

const estadosPrisionais = [
  { value: "CADEIA_PUBLICA", label: "Preso", color: "#ef4444" },
  { value: "PENITENCIARIA", label: "Penitenciaria", color: "#dc2626" },
  { value: "MONITORADO", label: "Monitorado", color: "#3b82f6" },
  { value: "DOMICILIAR", label: "Domiciliar", color: "#f59e0b" },
  { value: "SOLTO", label: "Solto", color: "#22c55e" },
];

export interface FilterSectionAssistidosProps {
  selectedAtribuicao: string;
  setSelectedAtribuicao: (value: string) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  selectedComarca: string;
  setSelectedComarca: (value: string) => void;
  comarcas: string[];
  sortBy: string;
  setSortBy: (value: string) => void;
  groupBy: string;
  setGroupBy: (value: string) => void;
  viewMode: "grid" | "list";
  setViewMode: (value: "grid" | "list") => void;
}

export function FilterSectionAssistidos({
  selectedAtribuicao,
  setSelectedAtribuicao,
  selectedStatus,
  setSelectedStatus,
  selectedComarca,
  setSelectedComarca,
  comarcas,
  sortBy,
  setSortBy,
  groupBy,
  setGroupBy,
  viewMode,
  setViewMode,
}: FilterSectionAssistidosProps) {
  const { activeCount } = useProcessingQueue();
  const [isMainExpanded, setIsMainExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    atribuicoes: false,
    status: false,
    comarca: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const totalFilters =
    (selectedAtribuicao !== "all" ? 1 : 0) +
    (selectedStatus !== "all" ? 1 : 0) +
    (selectedComarca !== "all" ? 1 : 0);

  const handleClearAll = () => {
    setSelectedAtribuicao("all");
    setSelectedStatus("all");
    setSelectedComarca("all");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div
          onClick={() => setIsMainExpanded(!isMainExpanded)}
          className="flex items-center gap-3 cursor-pointer flex-1 group"
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Filtros</h3>
            <p className="text-[10px] text-zinc-400">
              {totalFilters > 0 ? `${totalFilters} ativo${totalFilters > 1 ? 's' : ''}` : 'Nenhum filtro aplicado'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalFilters > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-7 text-[10px] px-2 text-zinc-400 hover:text-zinc-600"
            >
              <XCircle className="w-3 h-3 mr-1" />
              Limpar
            </Button>
          )}
          <div
            onClick={() => setIsMainExpanded(!isMainExpanded)}
            className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            {isMainExpanded ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </div>
        </div>
      </div>

      {/* Secoes de Filtro */}
      {isMainExpanded && (
        <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          {/* Atribuicao */}
          <div>
            <button
              onClick={() => toggleSection('atribuicoes')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Atribuicao</span>
                {selectedAtribuicao !== "all" && (
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-medium text-white"
                    style={{ backgroundColor: SOLID_COLOR_MAP[selectedAtribuicao] || '#71717a' }}
                  >
                    {ATRIBUICAO_OPTIONS.find(o => o.value === selectedAtribuicao)?.shortLabel}
                  </span>
                )}
              </div>
              {expandedSections.atribuicoes ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
            </button>

            {expandedSections.atribuicoes && (
              <div className="mt-1.5 px-2 flex flex-wrap gap-1.5">
                {ATRIBUICAO_OPTIONS.filter(o => o.value !== "all").map((option) => {
                  const isSelected = selectedAtribuicao === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setSelectedAtribuicao(isSelected ? "all" : option.value)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all",
                        isSelected
                          ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
                          : "bg-white dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      )}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: SOLID_COLOR_MAP[option.value] || '#71717a' }}
                      />
                      {option.shortLabel}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Estado Prisional */}
          <div>
            <button
              onClick={() => toggleSection('status')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Estado Prisional</span>
                {selectedStatus !== "all" && (
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-medium text-white"
                    style={{ backgroundColor: estadosPrisionais.find(e => e.value === selectedStatus)?.color }}
                  >
                    {estadosPrisionais.find(e => e.value === selectedStatus)?.label}
                  </span>
                )}
              </div>
              {expandedSections.status ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
            </button>

            {expandedSections.status && (
              <div className="mt-1.5 px-2 flex flex-wrap gap-1.5">
                {estadosPrisionais.map((estado) => {
                  const isSelected = selectedStatus === estado.value;
                  return (
                    <button
                      key={estado.value}
                      onClick={() => setSelectedStatus(isSelected ? "all" : estado.value)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all",
                        isSelected
                          ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
                          : "bg-white dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      )}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: estado.color }}
                      />
                      {estado.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comarca */}
          {comarcas.length > 0 && (
            <div>
              <button
                onClick={() => toggleSection('comarca')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Comarca</span>
                  {selectedComarca !== "all" && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                      {selectedComarca}
                    </span>
                  )}
                </div>
                {expandedSections.comarca ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
              </button>

              {expandedSections.comarca && (
                <div className="mt-1.5 px-2 flex flex-wrap gap-1.5">
                  {comarcas.map((comarca) => {
                    const isSelected = selectedComarca === comarca;
                    return (
                      <button
                        key={comarca}
                        onClick={() => setSelectedComarca(isSelected ? "all" : comarca)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all",
                          isSelected
                            ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
                            : "bg-white dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                        )}
                      >
                        <MapPin className="w-2.5 h-2.5" />
                        {comarca}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Barra de Acoes (Ordenacao, View) */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
        {/* Botoes de Ordenacao */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-zinc-400 mr-1">Ordenar:</span>
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
            {[
              { id: "nome", label: "Nome" },
              { id: "prioridade", label: "Prioridade" },
              { id: "complexidade", label: "Complexidade" },
              { id: "prazo", label: "Prazo" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSortBy(opt.id)}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-medium rounded-md transition-all",
                  sortBy === opt.id
                    ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ProcessingQueuePanel>
            <button
              className={cn(
                "h-8 w-8 inline-flex items-center justify-center gap-1 rounded-md transition-colors",
                activeCount > 0
                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
              title="Fila de processamento"
            >
              <Activity className={cn("h-3.5 w-3.5", activeCount > 0 && "animate-pulse")} />
              {activeCount > 0 && (
                <span className="text-[10px] font-medium">{activeCount}</span>
              )}
            </button>
          </ProcessingQueuePanel>
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex items-center gap-1 px-2.5 h-7 text-xs font-medium rounded-md transition-all",
                viewMode === "grid"
                  ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1 px-2.5 h-7 text-xs font-medium rounded-md transition-all",
                viewMode === "list"
                  ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
