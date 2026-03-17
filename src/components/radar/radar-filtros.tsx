"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter } from "lucide-react";
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

interface RadarFiltrosProps {
  filtros: FiltrosState;
  onChange: React.Dispatch<React.SetStateAction<FiltrosState>>;
}

export function RadarFiltros({ filtros, onChange }: RadarFiltrosProps) {
  const { data: bairros } = trpc.radar.bairros.useQuery();
  const { data: fontesDistintas } = trpc.radar.fontesDistintas.useQuery();

  const hasFilters = filtros.tipoCrime || filtros.bairro || filtros.fonte || filtros.search || filtros.dataInicio || filtros.dataFim || filtros.soMatches || filtros.circunstancia;

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs cursor-pointer"
              onClick={() =>
                onChange({
                  tipoCrime: undefined,
                  bairro: undefined,
                  fonte: undefined,
                  search: undefined,
                  dataInicio: undefined,
                  dataFim: undefined,
                  soMatches: false,
                  circunstancia: undefined,
                })
              }
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Buscar..."
            value={filtros.search || ""}
            onChange={(e) => onChange({ ...filtros, search: e.target.value || undefined })}
            className="pl-9 h-9"
          />
        </div>

        {/* Quick date presets */}
        <div className="flex flex-wrap gap-1">
          {[
            { label: "Hoje", days: 0 },
            { label: "7d", days: 7 },
            { label: "30d", days: 30 },
            { label: "90d", days: 90 },
          ].map(({ label, days }) => (
            <button
              key={label}
              onClick={() => {
                const hoje = new Date();
                const inicio = days === 0 ? hoje : new Date(Date.now() - days * 24 * 60 * 60 * 1000);
                onChange({
                  ...filtros,
                  dataInicio: inicio.toISOString().split("T")[0],
                  dataFim: hoje.toISOString().split("T")[0],
                });
              }}
              className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tipo de crime */}
        <div className="space-y-2">
          <Label className="text-xs text-zinc-500">Tipo de Crime</Label>
          <div className="flex flex-wrap gap-1.5">
            {CRIME_TYPES.map((crime) => (
              <button
                key={crime.value}
                onClick={() =>
                  onChange({
                    ...filtros,
                    tipoCrime: filtros.tipoCrime === crime.value ? undefined : crime.value,
                  })
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
          <Label className="text-xs text-zinc-500">Bairro</Label>
          <select
            value={filtros.bairro || ""}
            onChange={(e) => onChange({ ...filtros, bairro: e.target.value || undefined })}
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
          <Label className="text-xs text-zinc-500">Fonte</Label>
          <select
            value={filtros.fonte || ""}
            onChange={(e) => onChange({ ...filtros, fonte: e.target.value || undefined })}
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
          <Label className="text-xs text-zinc-500">Circunstância</Label>
          <select
            value={filtros.circunstancia || ""}
            onChange={(e) => onChange({ ...filtros, circunstancia: e.target.value || undefined })}
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

        {/* Período */}
        <div className="space-y-2">
          <Label className="text-xs text-zinc-500">Período</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={filtros.dataInicio || ""}
              onChange={(e) => onChange({ ...filtros, dataInicio: e.target.value || undefined })}
              className="h-8 text-xs"
            />
            <Input
              type="date"
              value={filtros.dataFim || ""}
              onChange={(e) => onChange({ ...filtros, dataFim: e.target.value || undefined })}
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* Só matches DPE */}
        <div className="flex items-center justify-between">
          <Label className="text-xs text-zinc-500">Só Casos DPE</Label>
          <Switch
            checked={filtros.soMatches}
            onCheckedChange={(checked) => onChange({ ...filtros, soMatches: checked })}
            className="cursor-pointer"
          />
        </div>
      </CardContent>
    </Card>
  );
}
