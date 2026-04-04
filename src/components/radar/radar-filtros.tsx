"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

const CRIME_TYPES = [
  { value: "homicidio", label: "Homicídio", color: "bg-green-700" },
  { value: "tentativa_homicidio", label: "Tentativa", color: "bg-green-700" },
  { value: "feminicidio", label: "Feminicídio", color: "bg-green-700" },
  { value: "trafico", label: "Tráfico", color: "bg-red-600" },
  { value: "roubo", label: "Roubo", color: "bg-orange-700" },
  { value: "violencia_domestica", label: "V. Doméstica", color: "bg-yellow-600" },
  { value: "sexual", label: "Sexual", color: "bg-purple-600" },
  { value: "lesao_corporal", label: "Lesão Corp.", color: "bg-rose-700" },
  { value: "furto", label: "Furto", color: "bg-orange-500" },
  { value: "porte_arma", label: "Porte Arma", color: "bg-pink-600" },
  { value: "estelionato", label: "Estelionato", color: "bg-fuchsia-700" },
  { value: "execucao_penal", label: "Exec. Penal", color: "bg-blue-700" },
  { value: "outros", label: "Outros", color: "bg-neutral-500" },
] as const;

/** Hex fill colors for dots — muted/pastel palette */
export const CRIME_HEX: Record<string, string> = {
  homicidio: "#4ade80",
  tentativa_homicidio: "#4ade80",
  feminicidio: "#4ade80",
  violencia_domestica: "#fbbf24",
  execucao_penal: "#60a5fa",
  trafico: "#f87171",
  roubo: "#fb923c",
  lesao_corporal: "#f472b6",
  sexual: "#c084fc",
  furto: "#fdba74",
  porte_arma: "#e879f9",
  estelionato: "#a78bfa",
  outros: "#a1a1aa",
};

/** Export convenience function */
export function getCrimeHexColor(tipo: string | null | undefined): string {
  return CRIME_HEX[tipo || ""] || CRIME_HEX.outros;
}

export function getCrimeColor(tipo: string | null | undefined): string {
  return CRIME_TYPES.find((c) => c.value === tipo)?.color || "bg-neutral-500";
}

export function getCrimeLabel(tipo: string | null | undefined): string {
  return CRIME_TYPES.find((c) => c.value === tipo)?.label || "Outros";
}

export function getCrimeBorderColor(tipo: string | null | undefined): string {
  const colors: Record<string, string> = {
    homicidio: "border-l-green-400",
    tentativa_homicidio: "border-l-green-400",
    feminicidio: "border-l-green-400",
    trafico: "border-l-red-400",
    roubo: "border-l-orange-400",
    violencia_domestica: "border-l-amber-400",
    sexual: "border-l-purple-400",
    lesao_corporal: "border-l-pink-400",
    furto: "border-l-orange-300",
    porte_arma: "border-l-fuchsia-400",
    estelionato: "border-l-violet-400",
    execucao_penal: "border-l-blue-400",
    outros: "border-l-neutral-300",
  };
  return colors[tipo || ""] || colors.outros;
}

export function getCrimeBadgeColor(_tipo: string | null | undefined): string {
  return "bg-neutral-50 text-neutral-600 border border-neutral-200 dark:bg-neutral-800/60 dark:text-neutral-400 dark:border-neutral-700";
}

export interface FiltrosState {
  tipoCrime?: string;
  bairro?: string;
  fonte?: string;
  search?: string;
  dataInicio?: string;
  dataFim?: string;
  soMatches: boolean;
  circunstancia?: string;
  relevanciaMin?: number;
  sortBy?: "recent" | "oldest" | "relevance";
}

const EMPTY_FILTROS: FiltrosState = {
  tipoCrime: undefined,
  bairro: undefined,
  fonte: undefined,
  search: undefined,
  dataInicio: undefined,
  dataFim: undefined,
  soMatches: false,
  circunstancia: undefined,
  relevanciaMin: 60,
  sortBy: "recent",
};

const PERIOD_PRESETS = [
  { label: "Hoje", days: 0 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

interface RadarFiltrosProps {
  filtros: FiltrosState;
  onChange: React.Dispatch<React.SetStateAction<FiltrosState>>;
}

export function RadarFiltros({ filtros, onChange }: RadarFiltrosProps) {
  const [open, setOpen] = useState(false);
  const { data: bairros } = trpc.radar.bairros.useQuery();
  const { data: fontesDistintas } = trpc.radar.fontesDistintas.useQuery();

  // Count active advanced filters (excludes search and period quick-select)
  const activeCount = [
    filtros.tipoCrime,
    filtros.bairro,
    filtros.fonte,
    filtros.circunstancia,
    filtros.dataInicio || filtros.dataFim,
    filtros.soMatches || undefined,
    filtros.relevanciaMin != null && filtros.relevanciaMin !== 60 ? String(filtros.relevanciaMin) : undefined,
  ].filter(Boolean).length;

  const applyPeriod = (days: number) => {
    const hoje = new Date();
    const inicio = days === 0 ? hoje : new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    onChange((prev) => ({
      ...prev,
      dataInicio: inicio.toISOString().split("T")[0],
      dataFim: hoje.toISOString().split("T")[0],
    }));
  };

  const isActivePeriod = (days: number) => {
    const hoje = new Date().toISOString().split("T")[0];
    const inicio = days === 0
      ? hoje
      : new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    return filtros.dataInicio === inicio && filtros.dataFim === hoje;
  };

  return (
    <>
      {/* Compact inline bar */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <Input
            placeholder="Buscar..."
            value={filtros.search || ""}
            onChange={(e) => onChange((prev) => ({ ...prev, search: e.target.value || undefined }))}
            className="pl-8 h-8 text-sm"
          />
          {filtros.search && (
            <button
              onClick={() => onChange((prev) => ({ ...prev, search: undefined }))}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Period chips */}
        <div className="flex items-center gap-1 shrink-0">
          {PERIOD_PRESETS.map(({ label, days }) => (
            <button
              key={label}
              onClick={() => applyPeriod(days)}
              className={cn(
                "text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer",
                isActivePeriod(days)
                  ? "bg-emerald-600 text-white"
                  : "bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Active crime chip (if set) */}
        {filtros.tipoCrime && (
          <button
            onClick={() => onChange((prev) => ({ ...prev, tipoCrime: undefined }))}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium shrink-0 cursor-pointer",
              getCrimeBadgeColor(filtros.tipoCrime)
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", getCrimeColor(filtros.tipoCrime))} />
            {getCrimeLabel(filtros.tipoCrime)}
            <X className="h-2.5 w-2.5 ml-0.5" />
          </button>
        )}

        {/* Filters button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="h-8 gap-1.5 shrink-0 cursor-pointer relative"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="text-xs">Filtros</span>
          {activeCount > 0 && (
            <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-emerald-600 text-white border-0">
              {activeCount}
            </Badge>
          )}
        </Button>

        {/* Clear all */}
        {(activeCount > 0 || filtros.search) && (
          <button
            onClick={() => onChange(EMPTY_FILTROS)}
            className="text-neutral-400 hover:text-neutral-600 cursor-pointer shrink-0"
            title="Limpar filtros"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Advanced filters drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-80 overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-base flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros avançados
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5">
            {/* Tipo de crime */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Tipo de Crime</p>
              <div className="flex flex-wrap gap-1.5">
                {CRIME_TYPES.map((crime) => (
                  <button
                    key={crime.value}
                    onClick={() =>
                      onChange((prev) => ({
                        ...prev,
                        tipoCrime: prev.tipoCrime === crime.value ? undefined : crime.value,
                      }))
                    }
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                      filtros.tipoCrime === crime.value
                        ? getCrimeBadgeColor(crime.value)
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", crime.color)} />
                    {crime.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bairro */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Bairro</p>
              <select
                value={filtros.bairro || ""}
                onChange={(e) => onChange((prev) => ({ ...prev, bairro: e.target.value || undefined }))}
                className="w-full h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 cursor-pointer"
              >
                <option value="">Todos</option>
                {bairros?.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Fonte */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Fonte</p>
              <select
                value={filtros.fonte || ""}
                onChange={(e) => onChange((prev) => ({ ...prev, fonte: e.target.value || undefined }))}
                className="w-full h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 cursor-pointer"
              >
                <option value="">Todas</option>
                {fontesDistintas?.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Circunstância */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Circunstância</p>
              <select
                value={filtros.circunstancia || ""}
                onChange={(e) => onChange((prev) => ({ ...prev, circunstancia: e.target.value || undefined }))}
                className="w-full h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 cursor-pointer"
              >
                <option value="">Todas</option>
                <option value="flagrante">Flagrante</option>
                <option value="mandado">Mandado</option>
                <option value="denuncia">Denúncia</option>
                <option value="operacao">Operação</option>
                <option value="investigacao">Investigação</option>
              </select>
            </div>

            {/* Período personalizado */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Período</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-neutral-400 mb-1 block">De</Label>
                  <Input
                    type="date"
                    value={filtros.dataInicio || ""}
                    onChange={(e) => onChange((prev) => ({ ...prev, dataInicio: e.target.value || undefined }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-neutral-400 mb-1 block">Até</Label>
                  <Input
                    type="date"
                    value={filtros.dataFim || ""}
                    onChange={(e) => onChange((prev) => ({ ...prev, dataFim: e.target.value || undefined }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Só matches DPE */}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Só Casos DPE</p>
                <p className="text-[11px] text-neutral-400">Apenas ocorrências com assistidos</p>
              </div>
              <Switch
                checked={filtros.soMatches}
                onCheckedChange={(checked) => onChange((prev) => ({ ...prev, soMatches: checked }))}
                className="cursor-pointer"
              />
            </div>

            {/* Filtro de relevância */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Relevância IA</p>
              <Select
                value={filtros.relevanciaMin?.toString() ?? "60"}
                onValueChange={(val) => onChange((prev) => ({ ...prev, relevanciaMin: val ? Number(val) : undefined }))}
              >
                <SelectTrigger className="h-8 text-xs cursor-pointer">
                  <SelectValue placeholder="Relevância" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0" className="cursor-pointer text-xs">Todas (0+)</SelectItem>
                  <SelectItem value="60" className="cursor-pointer text-xs">Prováveis (60+) — padrão</SelectItem>
                  <SelectItem value="85" className="cursor-pointer text-xs">Confirmadas (85+)</SelectItem>
                  <SelectItem value="35" className="cursor-pointer text-xs">Possíveis (35+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <SheetFooter className="pt-6 flex-col gap-2">
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full cursor-pointer text-neutral-500"
                onClick={() => {
                  onChange(EMPTY_FILTROS);
                  setOpen(false);
                }}
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Limpar filtros
              </Button>
            )}
            <Button
              size="sm"
              className="w-full cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setOpen(false)}
            >
              Aplicar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
