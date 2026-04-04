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
            className="h-8 w-8 p-0 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all flex items-center justify-center"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            )}
          </button>
          <div className="flex flex-col justify-center">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-50 leading-none">Infográficos</h3>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-none mt-1">
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
          className="h-7 w-7 p-0 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <Settings className="w-3 h-3" />
        </Button>
      </div>

      {/* Chart Options */}
      {isExpanded && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
          {chartOptions.map((chart) => {
            const ChartIcon = chart.icon;
            const isSelected = selectedCharts.includes(chart.value);

            return (
              <button
                key={chart.value}
                onClick={() => toggleChart(chart.value)}
                className={`group relative flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                  isSelected
                    ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 shadow-sm ring-1 ring-neutral-300 dark:ring-neutral-600"
                    : "bg-white dark:bg-neutral-900/50 text-neutral-500 dark:text-neutral-400 ring-1 ring-neutral-200 dark:ring-neutral-700 hover:ring-neutral-300 dark:hover:ring-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:shadow-sm"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  isSelected 
                    ? 'bg-neutral-200 dark:bg-neutral-700' 
                    : 'bg-neutral-100 dark:bg-neutral-800 group-hover:bg-neutral-150 dark:group-hover:bg-neutral-700'
                }`}>
                  <ChartIcon className={`w-5 h-5 transition-all ${
                    isSelected 
                      ? 'text-neutral-600 dark:text-neutral-300' 
                      : 'text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-500 dark:group-hover:text-neutral-400'
                  }`} />
                </div>
                <span className="text-center leading-tight text-[10px]">{chart.label}</span>
                {isSelected && (
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-neutral-500 dark:text-neutral-400 absolute top-2 right-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}