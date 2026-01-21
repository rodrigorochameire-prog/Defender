"use client";

import { cn } from "@/lib/utils";

interface DonutChartProps {
  value: number; // Porcentagem (0-100)
  color: string; // Cor do stroke (ex: "#059669")
  label: string; // Label abaixo do gráfico
  size?: "sm" | "md" | "lg"; // Tamanho
  className?: string;
}

const sizeConfig = {
  sm: {
    svg: "w-20 h-20",
    radius: 30,
    strokeWidth: 6,
    fontSize: "text-base",
  },
  md: {
    svg: "w-24 h-24",
    radius: 35,
    strokeWidth: 8,
    fontSize: "text-lg",
  },
  lg: {
    svg: "w-32 h-32",
    radius: 45,
    strokeWidth: 10,
    fontSize: "text-2xl",
  },
};

/**
 * DonutChart - Gráfico de Rosquinha SVG Puro
 * 
 * Implementação minimalista sem dependências externas.
 * Usado para visualizar estatísticas e métricas de forma elegante.
 */
export function DonutChart({ 
  value, 
  color, 
  label, 
  size = "md",
  className 
}: DonutChartProps) {
  const config = sizeConfig[size];
  const radius = config.radius;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const center = radius + config.strokeWidth;

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="relative" style={{ width: center * 2, height: center * 2 }}>
        <svg 
          className={cn(config.svg, "transform -rotate-90")} 
          viewBox={`0 0 ${center * 2} ${center * 2}`}
        >
          {/* Background Circle */}
          <circle 
            cx={center} 
            cy={center} 
            r={radius} 
            stroke="currentColor" 
            strokeWidth={config.strokeWidth} 
            fill="transparent" 
            className="text-stone-200 dark:text-zinc-800" 
          />
          
          {/* Progress Circle */}
          <circle 
            cx={center} 
            cy={center} 
            r={radius} 
            stroke={color} 
            strokeWidth={config.strokeWidth} 
            fill="transparent" 
            strokeDasharray={circumference} 
            strokeDashoffset={offset} 
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        
        {/* Percentage in Center */}
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
          <span className={cn(
            "font-bold text-stone-800 dark:text-stone-200",
            config.fontSize
          )}>
            {value}%
          </span>
        </div>
      </div>
      
      {/* Label */}
      <span className="mt-2 text-xs font-medium text-stone-500 dark:text-zinc-400 uppercase tracking-wide text-center">
        {label}
      </span>
    </div>
  );
}

/**
 * DonutChartGroup - Agrupa múltiplos gráficos
 */
export function DonutChartGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-8", className)}>
      {children}
    </div>
  );
}
