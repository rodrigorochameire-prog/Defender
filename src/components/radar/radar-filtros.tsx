"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  { value: "homicidio", label: "Homicídio", color: "bg-red-500" },
  { value: "tentativa_homicidio", label: "Tentativa", color: "bg-orange-500" },
  { value: "trafico", label: "Tráfico", color: "bg-purple-500" },
  { value: "roubo", label: "Roubo", color: "bg-blue-500" },
  { value: "furto", label: "Furto", color: "bg-yellow-500" },
  { value: "violencia_domestica", label: "V. Doméstica", color: "bg-pink-500" },
  { value: "sexual", label: "Sexual", color: "bg-fuchsia-500" },
  { value: "lesao_corporal", label: "Lesão Corp.", color: "bg-amber-500" },
  { value: "porte_arma", label: "Porte Arma", color: "bg-slate-500" },
  { value: "estelionato", label: "Estelionato", color: "bg-teal-500" },
  { value: "outros", label: "Outros", color: "bg-zinc-500" },
] as const;

export function getCrimeColor(tipo: string | null | undefined): string {
  return CRIME_TYPES.find((c) => c.value === tipo)?.color || "bg-zinc-500";
}

export function getCrimeLabel(tipo: string | null | undefined): string {
  return CRIME_TYPES.find((c) => c.value === tipo)?.label || "Outros";
}

export function getCrimeBadgeColor(tipo: string | null | undefined): string {
  const colors: Record<string, string> = {
    homicidio: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    tentativa_homicidio: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    trafico: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    roubo: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    furto: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    violencia_domestica: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    sexual: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400",
    lesao_corporal: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    porte_arma: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
    estelionato: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    outros: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400",
  };
  return colors[tipo || ""] || colors.outros;
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
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <Input
            placeholder="Buscar..."
            value={filtros.search || ""}
            onChange={(e) => onChange((prev) => ({ ...prev, search: e.target.value || undefined }))}
            className="pl-8 h-8 text-sm"
          />
          {filtros.search && (
            <button
              onClick={() => onChange((prev) => ({ ...prev, search: undefined }))}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
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
                  : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
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
            className="text-zinc-400 hover:text-zinc-600 cursor-pointer shrink-0"
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
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Tipo de Crime</p>
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
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
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
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Bairro</p>
              <select
                value={filtros.bairro || ""}
                onChange={(e) => onChange((prev) => ({ ...prev, bairro: e.target.value || undefined }))}
                className="w-full h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                <option value="">Todos</option>
                {bairros?.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Fonte */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Fonte</p>
              <select
                value={filtros.fonte || ""}
                onChange={(e) => onChange((prev) => ({ ...prev, fonte: e.target.value || undefined }))}
                className="w-full h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                <option value="">Todas</option>
                {fontesDistintas?.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Circunstância */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Circunstância</p>
              <select
                value={filtros.circunstancia || ""}
                onChange={(e) => onChange((prev) => ({ ...prev, circunstancia: e.target.value || undefined }))}
                className="w-full h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 cursor-pointer"
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
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Período</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-zinc-400 mb-1 block">De</Label>
                  <Input
                    type="date"
                    value={filtros.dataInicio || ""}
                    onChange={(e) => onChange((prev) => ({ ...prev, dataInicio: e.target.value || undefined }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-zinc-400 mb-1 block">Até</Label>
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
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Só Casos DPE</p>
                <p className="text-[11px] text-zinc-400">Apenas ocorrências com assistidos</p>
              </div>
              <Switch
                checked={filtros.soMatches}
                onCheckedChange={(checked) => onChange((prev) => ({ ...prev, soMatches: checked }))}
                className="cursor-pointer"
              />
            </div>
          </div>

          <SheetFooter className="pt-6 flex-col gap-2">
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full cursor-pointer text-zinc-500"
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
