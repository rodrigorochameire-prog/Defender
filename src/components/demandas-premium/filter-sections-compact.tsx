"use client";

import { Button } from "@/components/ui/button";
import { XCircle, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { STATUS_GROUPS, type StatusGroup } from "@/config/demanda-status";
import { useState } from "react";
import { useContextControl, type AtribuicaoFiltro } from "@/components/layout/context-control";
import { cn } from "@/lib/utils";

// Mapeamento de atribuição do contexto global para o filtro local
const ATRIBUICAO_MAP: Record<AtribuicaoFiltro, string | null> = {
  TODOS: null,
  JURI: "Tribunal do Júri",
  VVD: "Violência Doméstica", 
  EP: "Execução Penal",
};

interface FilterSectionsCompactProps {
  selectedPrazoFilter: string | null;
  setSelectedPrazoFilter: (filter: string | null) => void;
  selectedAtribuicao: string | null;
  setSelectedAtribuicao: (value: string | null) => void;
  selectedEstadoPrisional: string | null;
  setSelectedEstadoPrisional: (estado: string | null) => void;
  selectedTipoAto: string | null;
  setSelectedTipoAto: (ato: string | null) => void;
  selectedStatusGroup: StatusGroup | null;
  setSelectedStatusGroup: (group: StatusGroup | null) => void;
  atribuicaoOptions: Array<{ value: string; label: string; icon: any }>;
  atribuicaoIcons: Record<string, React.ComponentType<{ className?: string }>>;
  atribuicaoColors: Record<string, string>;
  atoOptions: Array<{ value: string; label: string; icon: any }>;
}

const estadosPrisionais = [
  { value: "preso", label: "Preso", color: "#ef4444" },
  { value: "solto", label: "Solto", color: "#22c55e" },
  { value: "monitorado", label: "Monitorado", color: "#3b82f6" },
  { value: "domiciliar", label: "Domiciliar", color: "#f59e0b" },
  { value: "cautelar", label: "Cautelar", color: "#a855f7" },
];

export function FilterSectionsCompact({
  selectedPrazoFilter,
  setSelectedPrazoFilter,
  selectedAtribuicao,
  setSelectedAtribuicao,
  selectedEstadoPrisional,
  setSelectedEstadoPrisional,
  selectedTipoAto,
  setSelectedTipoAto,
  selectedStatusGroup,
  setSelectedStatusGroup,
  atribuicaoOptions,
  atoOptions,
}: FilterSectionsCompactProps) {
  const [isMainExpanded, setIsMainExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    atribuicoes: false,
    status: false,
    prisional: false,
  });

  // Usar contexto global da sidebar
  const { atribuicao: atribuicaoGlobal } = useContextControl();
  const isAtribuicaoTravada = atribuicaoGlobal !== "TODOS";
  const atribuicaoGlobalLabel = ATRIBUICAO_MAP[atribuicaoGlobal];

  const toggleSection = (section: keyof typeof expandedSections) => {
    // Se atribuições está travada, não permite expandir
    if (section === "atribuicoes" && isAtribuicaoTravada) return;
    
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const totalFilters =
    (selectedPrazoFilter ? 1 : 0) +
    (selectedAtribuicao || isAtribuicaoTravada ? 1 : 0) +
    (selectedStatusGroup ? 1 : 0) +
    (selectedEstadoPrisional ? 1 : 0);

  const handleClearAll = () => {
    setSelectedPrazoFilter(null);
    setSelectedAtribuicao(null);
    setSelectedStatusGroup(null);
    setSelectedEstadoPrisional(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between group/main">
        <div 
          onClick={() => setIsMainExpanded(!isMainExpanded)}
          className="flex items-center gap-3 cursor-pointer flex-1"
        >
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center border border-border group-hover/main:border-emerald-300/50 dark:group-hover/main:border-emerald-700/50 transition-all">
            <svg className="w-4 h-4 text-muted-foreground group-hover/main:text-emerald-600 dark:group-hover/main:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-foreground group-hover/main:text-foreground transition-colors">Filtros</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {totalFilters > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-foreground text-background text-[10px] font-bold">
                    {totalFilters}
                  </span>
                  <span className="text-muted-foreground">ativo{totalFilters > 1 ? 's' : ''}</span>
                </span>
              ) : (
                'Nenhum filtro aplicado'
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {totalFilters > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearAll}
              className="h-8 text-[11px] px-3 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <XCircle className="w-3 h-3 mr-1.5" />
              Limpar
            </Button>
          )}
          <div 
            onClick={() => setIsMainExpanded(!isMainExpanded)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
          >
            {isMainExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Divisor */}
      {isMainExpanded && (
        <div className="border-b border-border -mt-1" />
      )}

      {/* Filtros em Linhas Horizontais */}
      {isMainExpanded && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-3 duration-300">
          {/* Atribuições */}
          <div className="group">
            <div
              onClick={() => toggleSection('atribuicoes')}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group/header",
                isAtribuicaoTravada
                  ? "bg-muted/50 cursor-default"
                  : "hover:bg-muted/50 cursor-pointer"
              )}
            >
              <div className="flex items-center gap-2.5">
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Atribuição
                </h4>
                {isAtribuicaoTravada ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-foreground text-background text-[10px] font-medium">
                    <Lock className="w-2.5 h-2.5" />
                    {atribuicaoGlobalLabel}
                  </span>
                ) : selectedAtribuicao ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-medium">
                    {selectedAtribuicao}
                  </span>
                ) : null}
              </div>
              {isAtribuicaoTravada ? (
                <span className="text-[10px] text-muted-foreground/50 font-medium italic">
                  via sidebar
                </span>
              ) : expandedSections.atribuicoes ? (
                <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </div>
            
            {expandedSections.atribuicoes && !isAtribuicaoTravada && (
              <div className="mt-2 px-1 flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                {atribuicaoOptions
                  .filter((opt) => opt.value !== "Todas")
                  .map((atribuicao) => {
                    const Icon = atribuicao.icon;
                    const isSelected = selectedAtribuicao === atribuicao.value;
                    return (
                      <button
                        key={atribuicao.value}
                        onClick={() => setSelectedAtribuicao(isSelected ? null : atribuicao.value)}
                        className={cn(
                          "group/btn flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-150",
                          isSelected
                            ? "bg-secondary text-foreground shadow-sm"
                            : "bg-background text-muted-foreground border border-border hover:border-border hover:text-foreground"
                        )}
                      >
                        <Icon className={cn("w-3.5 h-3.5 transition-colors", isSelected ? 'text-foreground/80' : 'text-muted-foreground group-hover/btn:text-foreground/80')} />
                        <span>{atribuicao.label}</span>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="group">
            <button
              onClick={() => toggleSection('status')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-all duration-200 group/header"
            >
              <div className="flex items-center gap-2.5">
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Status
                </h4>
                {selectedStatusGroup && (
                  <span 
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-white text-[10px] font-medium"
                    style={{ backgroundColor: STATUS_GROUPS[selectedStatusGroup].color }}
                  >
                    {STATUS_GROUPS[selectedStatusGroup].label}
                  </span>
                )}
              </div>
              {expandedSections.status ? (
                <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
            
            {expandedSections.status && (
              <div className="mt-2 px-1 flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                {(Object.keys(STATUS_GROUPS) as StatusGroup[]).map((groupKey) => {
                  const group = STATUS_GROUPS[groupKey];
                  const isSelected = selectedStatusGroup === groupKey;
                  return (
                    <button
                      key={groupKey}
                      onClick={() => setSelectedStatusGroup(isSelected ? null : groupKey)}
                      className={cn(
                        "group/btn flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-150",
                        isSelected
                          ? "bg-secondary text-foreground shadow-sm"
                          : "bg-background text-muted-foreground border border-border hover:border-border hover:text-foreground"
                      )}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      <span className="capitalize">{group.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Estado Prisional */}
          <div className="group">
            <button
              onClick={() => toggleSection('prisional')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-all duration-200 group/header"
            >
              <div className="flex items-center gap-2.5">
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Estado Prisional
                </h4>
                {selectedEstadoPrisional && (
                  <span 
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-white text-[10px] font-medium"
                    style={{ backgroundColor: estadosPrisionais.find(e => e.value === selectedEstadoPrisional)?.color }}
                  >
                    {estadosPrisionais.find(e => e.value === selectedEstadoPrisional)?.label}
                  </span>
                )}
              </div>
              {expandedSections.prisional ? (
                <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
            
            {expandedSections.prisional && (
              <div className="mt-2 px-1 flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                {estadosPrisionais.map((estado) => {
                  const isSelected = selectedEstadoPrisional === estado.value;
                  
                  return (
                    <button
                      key={estado.value}
                      onClick={() => setSelectedEstadoPrisional(isSelected ? null : estado.value)}
                      className={cn(
                        "group/btn flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-150",
                        isSelected
                          ? "bg-secondary text-foreground shadow-sm"
                          : "bg-background text-muted-foreground border border-border hover:border-border hover:text-foreground"
                      )}
                    >
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: estado.color }} 
                      />
                      <span className="capitalize">{estado.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}