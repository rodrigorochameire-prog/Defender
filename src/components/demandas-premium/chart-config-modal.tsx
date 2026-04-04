"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PieChart, BarChart3, TrendingUp, Network, Check } from "lucide-react";

interface ChartConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartTypes: Record<string, string>;
  onChartTypeChange: (key: string, type: string) => void;
  selectedCharts: string[];
  onToggleChart: (key: string) => void;
}

const chartTypeOptions = [
  { value: "pizza", label: "Pizza", icon: PieChart },
  { value: "donut", label: "Donut", icon: PieChart },
  { value: "barras", label: "Barras", icon: BarChart3 },
  { value: "radar", label: "Radar", icon: Network },
  { value: "area", label: "Área", icon: TrendingUp },
];

const chartKeys = [
  { key: "atribuicoes", label: "Atribuições" },
  { key: "status", label: "Status" },
  { key: "atos", label: "Tipos de Atos" },
  { key: "situacao-prisional", label: "Situação Prisional" },
];

export function ChartConfigModal({
  isOpen,
  onClose,
  chartTypes,
  onChartTypeChange,
  selectedCharts = [],
  onToggleChart,
}: ChartConfigModalProps) {
  // Garantir que selectedCharts seja sempre um array
  const charts = Array.isArray(selectedCharts) ? selectedCharts : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto w-[95vw] md:w-full">
        <DialogHeader className="pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <DialogTitle className="text-base font-semibold text-neutral-800 dark:text-neutral-200">Configurar Gráficos</DialogTitle>
          <DialogDescription className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
            Escolha o tipo de visualização para cada categoria
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {chartKeys.map((chart) => (
            <div
              key={chart.key}
              className="space-y-2"
            >
              <h3 className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                {chart.label}
              </h3>
              <div className="grid grid-cols-5 gap-1.5">
                {chartTypeOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = chartTypes[chart.key] === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => onChartTypeChange(chart.key, option.value)}
                      className={`flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-lg text-[10px] font-medium transition-all ${
                        isSelected
                          ? "bg-neutral-700 dark:bg-neutral-300 text-white dark:text-neutral-900 shadow-sm"
                          : "bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-700 dark:hover:text-neutral-300"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <Button variant="ghost" onClick={onClose} className="h-9 text-xs text-neutral-500 hover:text-neutral-700">
            Cancelar
          </Button>
          <Button className="bg-neutral-800 hover:bg-neutral-700 dark:bg-neutral-200 dark:hover:bg-neutral-300 dark:text-neutral-900 h-9 text-xs" onClick={onClose}>
            Aplicar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}