import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Gavel,
  Home,
  Lock,
  Folder,
  RefreshCw,
  Shield,
  Scale,
  ChevronDown,
  ChevronUp,
  X,
  Filter,
  Check,
} from "lucide-react";
import { useState } from "react";

interface AgendaFiltersProps {
  selectedTipo: string | null;
  setSelectedTipo: (tipo: string | null) => void;
  selectedStatus: string | null;
  setSelectedStatus: (status: string | null) => void;
  selectedAtribuicao: string | null;
  setSelectedAtribuicao: (atribuicao: string | null) => void;
  selectedPrioridade: string | null;
  setSelectedPrioridade: (prioridade: string | null) => void;
  selectedPeriodo: string | null;
  setSelectedPeriodo: (periodo: string | null) => void;
  selectedDefensor: string | null;
  setSelectedDefensor: (defensor: string | null) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const tipoOptions = [
  { value: "audiencia", label: "Audiência", icon: Gavel, color: "text-blue-600 dark:text-blue-500" },
  { value: "reuniao", label: "Reunião", icon: Users, color: "text-purple-600 dark:text-purple-500" },
  { value: "prazo", label: "Prazo", icon: Clock, color: "text-amber-600 dark:text-amber-500" },
  { value: "compromisso", label: "Compromisso", icon: Calendar, color: "text-emerald-600 dark:text-emerald-500" },
  { value: "diligencia", label: "Diligência", icon: MapPin, color: "text-cyan-600 dark:text-cyan-500" },
  { value: "atendimento", label: "Atendimento", icon: Users, color: "text-indigo-600 dark:text-indigo-500" },
  { value: "plantao", label: "Plantão", icon: Clock, color: "text-orange-600 dark:text-orange-500" },
];

// Cores e ícones por atribuição - Premium Design
const atribuicaoOptions = [
  { 
    value: "Tribunal do Júri", 
    label: "Júri", 
    icon: Gavel, 
    gradient: "from-emerald-500 to-emerald-600",
    iconColor: "text-emerald-600 dark:text-emerald-500",
  },
  { 
    value: "Violência Doméstica", 
    label: "Violência Doméstica", 
    icon: Home, 
    gradient: "from-amber-500 to-amber-600",
    iconColor: "text-amber-600 dark:text-amber-500",
  },
  { 
    value: "Execução Penal", 
    label: "Execução Penal", 
    icon: Lock, 
    gradient: "from-blue-500 to-blue-600",
    iconColor: "text-blue-600 dark:text-blue-500",
  },
  { 
    value: "Criminal Geral", 
    label: "Criminal Geral", 
    icon: Folder, 
    gradient: "from-rose-500 to-rose-600",
    iconColor: "text-rose-600 dark:text-rose-500",
  },
  { 
    value: "Substituição", 
    label: "Substituição", 
    icon: RefreshCw, 
    gradient: "from-slate-500 to-slate-600",
    iconColor: "text-slate-600 dark:text-slate-500",
  },
  { 
    value: "Curadoria Especial", 
    label: "Curadoria", 
    icon: Shield, 
    gradient: "from-purple-500 to-purple-600",
    iconColor: "text-purple-600 dark:text-purple-500",
  },
  { 
    value: "Geral", 
    label: "Geral", 
    icon: Scale, 
    gradient: "from-zinc-500 to-zinc-600",
    iconColor: "text-zinc-600 dark:text-zinc-500",
  },
];

const periodoOptions = [
  { value: "hoje", label: "Hoje" },
  { value: "amanha", label: "Amanhã" },
  { value: "proximos-7", label: "Próximos 7 dias" },
  { value: "proximos-15", label: "Próximos 15 dias" },
  { value: "proximos-30", label: "Próximos 30 dias" },
  { value: "mes-atual", label: "Mês Atual" },
  { value: "proximo-mes", label: "Próximo Mês" },
];

export function AgendaFilters({
  selectedTipo,
  setSelectedTipo,
  selectedStatus,
  setSelectedStatus,
  selectedAtribuicao,
  setSelectedAtribuicao,
  selectedPrioridade,
  setSelectedPrioridade,
  selectedPeriodo,
  setSelectedPeriodo,
  selectedDefensor,
  setSelectedDefensor,
  isExpanded,
  onToggleExpand,
}: AgendaFiltersProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Opções fixas de defensores (pode ser passado como prop no futuro)
  const defensorOptions = [
    { value: "def-1", label: "Dr. Rodrigo", color: "#3B82F6" },
    { value: "def-2", label: "Dra. Juliane", color: "#10B981" },
  ];

  const hasFilters =
    selectedTipo !== null ||
    selectedAtribuicao !== null ||
    selectedPeriodo !== null ||
    selectedDefensor !== null;

  const handleClearAllFilters = () => {
    setSelectedTipo(null);
    setSelectedAtribuicao(null);
    setSelectedPeriodo(null);
    setSelectedStatus(null);
    setSelectedPrioridade(null);
    setSelectedDefensor(null);
  };

  const activeFiltersCount = [selectedTipo, selectedAtribuicao, selectedPeriodo, selectedDefensor].filter(Boolean).length;

  const selectedPeriodoLabel = periodoOptions.find(p => p.value === selectedPeriodo)?.label;
  const selectedTipoOption = tipoOptions.find(t => t.value === selectedTipo);
  const selectedAtribuicaoOption = atribuicaoOptions.find(a => a.value === selectedAtribuicao);
  const selectedDefensorOption = defensorOptions.find(d => d.value === selectedDefensor);

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800">
      {/* Header Discreto - Sempre visível */}
      <div className="flex items-center gap-4 px-6 py-3">
        <Filter className="w-4 h-4 text-zinc-400 flex-shrink-0" />
        
        {/* Dropdowns - Distribuídos uniformemente */}
        <div className="flex items-center gap-3 flex-1">
          {/* Dropdown Defensor */}
          <div className="relative flex-1 max-w-[200px]">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'defensor' ? null : 'defensor')}
              className={`w-full flex items-center justify-between gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedDefensor
                  ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {selectedDefensorOption ? (
                  <>
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: selectedDefensorOption.color }}
                    />
                    <span className="truncate">{selectedDefensorOption.label}</span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Defensor</span>
                  </>
                )}
              </div>
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
            </button>
            
            {openDropdown === 'defensor' && (
              <>
                <div className="fixed inset-0 z-[90]" onClick={() => setOpenDropdown(null)} />
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-[100] min-w-[200px] py-1">
                  {defensorOptions.map((option) => {
                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedDefensor(selectedDefensor === option.value ? null : option.value);
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2"
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: option.color }}
                        >
                          {option.label.charAt(option.label.indexOf('.') + 2).toUpperCase()}
                        </div>
                        <span className="flex-1">{option.label}</span>
                        {selectedDefensor === option.value && <Check className="w-4 h-4 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Dropdown Período */}
          <div className="relative flex-1 max-w-[240px]">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'periodo' ? null : 'periodo')}
              className={`w-full flex items-center justify-between gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedPeriodo
                  ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{selectedPeriodoLabel || "Período"}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
            </button>
            
            {openDropdown === 'periodo' && (
              <>
                <div className="fixed inset-0 z-[90]" onClick={() => setOpenDropdown(null)} />
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-[100] min-w-[200px] py-1">
                  {periodoOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSelectedPeriodo(selectedPeriodo === option.value ? null : option.value);
                        setOpenDropdown(null);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-between"
                    >
                      <span>{option.label}</span>
                      {selectedPeriodo === option.value && <Check className="w-4 h-4 text-emerald-600" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Dropdown Atribuição */}
          <div className="relative flex-1 max-w-[280px]">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'atribuicao' ? null : 'atribuicao')}
              className={`w-full flex items-center justify-between gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedAtribuicao
                  ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {selectedAtribuicaoOption ? (
                  <>
                    <selectedAtribuicaoOption.icon className={`w-4 h-4 flex-shrink-0 ${selectedAtribuicaoOption.iconColor}`} />
                    <span className="truncate">{selectedAtribuicaoOption.label}</span>
                  </>
                ) : (
                  <>
                    <Scale className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Atribuição</span>
                  </>
                )}
              </div>
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
            </button>
            
            {openDropdown === 'atribuicao' && (
              <>
                <div className="fixed inset-0 z-[90]" onClick={() => setOpenDropdown(null)} />
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-[100] min-w-[240px] py-1">
                  {atribuicaoOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedAtribuicao(selectedAtribuicao === option.value ? null : option.value);
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2"
                      >
                        <div className={`w-6 h-6 rounded bg-gradient-to-br ${option.gradient} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="flex-1">{option.label}</span>
                        {selectedAtribuicao === option.value && <Check className="w-4 h-4 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Dropdown Tipo */}
          <div className="relative flex-1 max-w-[200px]">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'tipo' ? null : 'tipo')}
              className={`w-full flex items-center justify-between gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedTipo
                  ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {selectedTipoOption ? (
                  <>
                    <selectedTipoOption.icon className={`w-4 h-4 flex-shrink-0 ${selectedTipoOption.color}`} />
                    <span className="truncate">{selectedTipoOption.label}</span>
                  </>
                ) : (
                  <>
                    <Gavel className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Tipo</span>
                  </>
                )}
              </div>
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
            </button>
            
            {openDropdown === 'tipo' && (
              <>
                <div className="fixed inset-0 z-[90]" onClick={() => setOpenDropdown(null)} />
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-[100] min-w-[200px] py-1">
                  {tipoOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedTipo(selectedTipo === option.value ? null : option.value);
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2"
                      >
                        <Icon className={`w-4 h-4 ${option.color}`} />
                        <span className="flex-1">{option.label}</span>
                        {selectedTipo === option.value && <Check className="w-4 h-4 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Botão Limpar - Discreto */}
        {hasFilters && (
          <button
            onClick={handleClearAllFilters}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}