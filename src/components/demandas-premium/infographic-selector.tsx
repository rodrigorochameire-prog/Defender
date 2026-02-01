"use client";

import { Button } from "@/components/ui/button";
import { Settings, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";

interface InfographicSelectorProps {
  chartOptions: Array<{
    value: string;
    label: string;
    icon: any;
    color: string;
  }>;
  selectedCharts: string[];
  toggleChart: (chartValue: string) => void;
  onOpenConfig: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function InfographicSelector({
  chartOptions,
  selectedCharts,
  toggleChart,
  onOpenConfig,
  isExpanded,
  onToggleExpand,
}: InfographicSelectorProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleExpand}
            className="h-8 w-8 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all flex items-center justify-center"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            )}
          </button>
          <div className="flex flex-col justify-center">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 leading-none">Infográficos</h3>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-none mt-1">
              {selectedCharts.length > 0
                ? `${selectedCharts.length} selecionado${selectedCharts.length > 1 ? "s" : ""}`
                : "Até 4 gráficos"}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onOpenConfig}
          className="h-7 w-7 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <Settings className="w-3 h-3" />
        </Button>
      </div>

      {/* Chart Options */}
      {isExpanded && (
        <div className="mt-4 grid grid-cols-4 gap-3 flex-1">
          {chartOptions.map((chart) => {
            const ChartIcon = chart.icon;
            const isSelected = selectedCharts.includes(chart.value);

            return (
              <button
                key={chart.value}
                onClick={() => toggleChart(chart.value)}
                className={`group relative flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                  isSelected
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm ring-1 ring-zinc-300 dark:ring-zinc-600"
                    : "bg-white dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 ring-1 ring-zinc-200 dark:ring-zinc-700 hover:ring-zinc-300 dark:hover:ring-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:shadow-sm"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  isSelected 
                    ? 'bg-zinc-200 dark:bg-zinc-700' 
                    : 'bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-150 dark:group-hover:bg-zinc-700'
                }`}>
                  <ChartIcon className={`w-5 h-5 transition-all ${
                    isSelected 
                      ? 'text-zinc-600 dark:text-zinc-300' 
                      : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-500 dark:group-hover:text-zinc-400'
                  }`} />
                </div>
                <span className="text-center leading-tight text-[10px]">{chart.label}</span>
                {isSelected && (
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-zinc-500 dark:text-zinc-400 absolute top-2 right-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}