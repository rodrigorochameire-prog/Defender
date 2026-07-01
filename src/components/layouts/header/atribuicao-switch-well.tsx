"use client";

import { ChevronDown, LayoutGrid, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getAtribuicaoHex } from "@/lib/config/atribuicoes";
import { HEADER_GLASS } from "@/lib/config/design-tokens";
import {
  AtribuicaoPills,
  ATRIBUICAO_PILL_ICONS,
} from "@/components/demandas-premium/AtribuicaoPills";

interface AtribuicaoSwitchWellProps {
  options: Array<{ value: string; label: string }>;
  selectedValues: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  counts?: Record<string, number>;
  singleSelect?: boolean;
  /** true = dropdown compacto (ícone ativo + chevron) em vez do poço. */
  collapsed?: boolean;
}

export function AtribuicaoSwitchWell({
  options,
  selectedValues,
  onToggle,
  onClear,
  counts,
  singleSelect = false,
  collapsed = false,
}: AtribuicaoSwitchWellProps) {
  if (!collapsed) {
    return (
      <AtribuicaoPills
        variant="dark"
        iconOnly
        options={options}
        selectedValues={selectedValues}
        onToggle={onToggle}
        onClear={onClear}
        counts={counts}
        singleSelect={singleSelect}
      />
    );
  }

  const specific = options.filter(
    (o) => o.value !== "all" && o.value !== "Todas" && o.label !== "Todas",
  );
  const active = specific.filter((o) => selectedValues.includes(o.value));
  const isAll = active.length === 0;
  const first = active[0];
  const ActiveIcon = first ? (ATRIBUICAO_PILL_ICONS[first.label] ?? LayoutGrid) : LayoutGrid;
  const activeHex = first ? getAtribuicaoHex(first.label) : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={isAll ? "Todas as atribuições" : active.map((a) => a.label).join(", ")}
          aria-label="Trocar atribuição"
          className={cn(HEADER_GLASS.ghostBtn, "px-2 gap-1")}
          style={
            activeHex
              ? {
                  backgroundColor: `${activeHex}26`,
                  boxShadow: `inset 0 0 0 1.5px ${activeHex}cc`,
                }
              : undefined
          }
        >
          <ActiveIcon className="w-[17px] h-[17px]" style={activeHex ? { color: activeHex } : undefined} />
          {active.length > 1 && (
            <span className="text-[11px] font-bold tabular-nums text-white/80">
              +{active.length - 1}
            </span>
          )}
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {!singleSelect && (
          <>
            <DropdownMenuItem onClick={onClear}>
              <LayoutGrid className="w-4 h-4 mr-2" />
              Todas
              {isAll && <Check className="w-3.5 h-3.5 ml-auto text-emerald-500" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {specific.map((opt) => {
          const Icon = ATRIBUICAO_PILL_ICONS[opt.label];
          const hex = getAtribuicaoHex(opt.label);
          const isActive = selectedValues.includes(opt.value);
          return (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => onToggle(opt.value)}
              // Multi-select: mantém o menu aberto para alternar várias atribuições
              onSelect={singleSelect ? undefined : (e) => e.preventDefault()}
            >
              {Icon && <Icon className="w-4 h-4 mr-2" style={{ color: hex }} />}
              {opt.label}
              {counts?.[opt.label] !== undefined && (
                <span className="ml-2 text-[11px] tabular-nums text-muted-foreground">
                  {counts[opt.label]}
                </span>
              )}
              {isActive && <Check className="w-3.5 h-3.5 ml-auto text-emerald-500" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
