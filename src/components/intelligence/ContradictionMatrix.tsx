"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  FileText,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface DepoimentoRef {
  sourceFileId: number;
  depoente: string;
  afirmacao: string;
  timestampRef?: string;
}

interface ContradictionItem {
  fato: string;
  depoimentos: DepoimentoRef[];
  tipo: "contradicao" | "corroboracao" | "lacuna";
  analise: string;
}

interface ContradictionMatrixProps {
  items: ContradictionItem[];
  onFileClick?: (fileId: number) => void;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const TIPO_CONFIG = {
  contradicao: {
    label: "Contradição",
    icon: AlertTriangle,
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    dot: "bg-red-500",
  },
  corroboracao: {
    label: "Corroboração",
    icon: CheckCircle2,
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  lacuna: {
    label: "Lacuna",
    icon: HelpCircle,
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    dot: "bg-amber-500",
  },
} as const;

// ─────────────────────────────────────────────────────────────
// Item Row
// ─────────────────────────────────────────────────────────────

function ContradictionRow({
  item,
  onFileClick,
}: {
  item: ContradictionItem;
  onFileClick?: (fileId: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = TIPO_CONFIG[item.tipo] || TIPO_CONFIG.lacuna;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        config.border,
        expanded ? config.bg : "bg-card",
      )}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2 p-3 text-left hover:bg-muted/50 rounded-lg transition-colors"
      >
        <div className="mt-0.5 shrink-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", `text-${item.tipo === "contradicao" ? "red" : item.tipo === "corroboracao" ? "emerald" : "amber"}-500`)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground line-clamp-2">
            {item.fato}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", config.badge)}>
              {config.label}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {item.depoimentos.length} depoente{item.depoimentos.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Depoimentos */}
          <div className="space-y-1.5 ml-6">
            {item.depoimentos.map((dep, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-2 rounded-md bg-card border border-border"
              >
                <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", config.dot)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground/80">
                      {dep.depoente || "Depoente"}
                    </span>
                    {dep.timestampRef && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        [{dep.timestampRef}]
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {dep.afirmacao}
                  </p>
                  {onFileClick && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFileClick(dep.sourceFileId);
                      }}
                      className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline mt-1"
                    >
                      <FileText className="h-3 w-3" />
                      Ver depoimento
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Análise */}
          <div className="ml-6 p-2 rounded-md bg-muted/50 border border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Análise
            </p>
            <p className="text-xs text-foreground/80">
              {item.analise}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export function ContradictionMatrix({ items, onFileClick }: ContradictionMatrixProps) {
  const [filter, setFilter] = useState<"all" | "contradicao" | "corroboracao" | "lacuna">("all");

  const counts = {
    contradicao: items.filter((i) => i.tipo === "contradicao").length,
    corroboracao: items.filter((i) => i.tipo === "corroboracao").length,
    lacuna: items.filter((i) => i.tipo === "lacuna").length,
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.tipo === filter);

  // Sort: contradições first (most valuable), then lacunas, then corroborações
  const sorted = [...filtered].sort((a, b) => {
    const order = { contradicao: 0, lacuna: 1, corroboracao: 2 };
    return (order[a.tipo] ?? 2) - (order[b.tipo] ?? 2);
  });

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <HelpCircle className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Nenhuma análise cruzada disponível
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          São necessários pelo menos 2 depoimentos analisados
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "text-xs px-2.5 py-1 rounded-full border transition-colors",
            filter === "all"
              ? "bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-50 dark:text-neutral-900 dark:border-neutral-50"
              : "border-border text-muted-foreground/50 hover:bg-muted/50",
          )}
        >
          Todos ({items.length})
        </button>
        {counts.contradicao > 0 && (
          <button
            onClick={() => setFilter("contradicao")}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              filter === "contradicao"
                ? "bg-red-600 text-white border-red-600"
                : "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30",
            )}
          >
            Contradições ({counts.contradicao})
          </button>
        )}
        {counts.corroboracao > 0 && (
          <button
            onClick={() => setFilter("corroboracao")}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              filter === "corroboracao"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30",
            )}
          >
            Corroborações ({counts.corroboracao})
          </button>
        )}
        {counts.lacuna > 0 && (
          <button
            onClick={() => setFilter("lacuna")}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              filter === "lacuna"
                ? "bg-amber-600 text-white border-amber-600"
                : "border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30",
            )}
          >
            Lacunas ({counts.lacuna})
          </button>
        )}
      </div>

      {/* Items */}
      <div className="space-y-2">
        {sorted.map((item, i) => (
          <ContradictionRow key={i} item={item} onFileClick={onFileClick} />
        ))}
      </div>
    </div>
  );
}
