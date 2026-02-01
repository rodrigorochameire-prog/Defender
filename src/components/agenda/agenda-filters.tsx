import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  CalendarDays,
  CalendarCheck,
  CalendarRange,
  User,
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

// Componente de botão de filtro estilo pill
function FilterButton({
  label,
  icon: Icon,
  isSelected,
  onClick,
  color = "emerald",
}: {
  label: string;
  icon?: React.ElementType;
  isSelected: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
        isSelected
          ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-300 dark:ring-emerald-700"
          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

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
  // Opções fixas de defensores
  const defensorOptions = [
    { value: "def-1", label: "Dr. Rodrigo", icon: User },
    { value: "def-2", label: "Dra. Juliane", icon: User },
  ];

  const hasFilters =
    selectedTipo !== null ||
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

  return (
    <div className="space-y-3">
      {/* Linha 1: Defensor */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider w-16 flex-shrink-0">Defensor</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {defensorOptions.map((option) => (
            <FilterButton
              key={option.value}
              label={option.label}
              icon={option.icon}
              isSelected={selectedDefensor === option.value}
              onClick={() => setSelectedDefensor(selectedDefensor === option.value ? null : option.value)}
            />
          ))}
        </div>
      </div>

      {/* Linha 2: Período */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider w-16 flex-shrink-0">Período</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {periodoOptions.map((option) => (
            <FilterButton
              key={option.value}
              label={option.label}
              icon={Calendar}
              isSelected={selectedPeriodo === option.value}
              onClick={() => setSelectedPeriodo(selectedPeriodo === option.value ? null : option.value)}
            />
          ))}
        </div>
      </div>

      {/* Linha 3: Tipo de Evento */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider w-16 flex-shrink-0">Tipo</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {tipoOptions.map((option) => (
            <FilterButton
              key={option.value}
              label={option.label}
              icon={option.icon}
              isSelected={selectedTipo === option.value}
              onClick={() => setSelectedTipo(selectedTipo === option.value ? null : option.value)}
            />
          ))}
        </div>
      </div>

      {/* Botão Limpar */}
      {hasFilters && (
        <div className="flex justify-end pt-1">
          <button
            onClick={handleClearAllFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
          >
            <X className="w-3.5 h-3.5" />
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}