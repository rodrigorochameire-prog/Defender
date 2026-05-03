"use client";

import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Users, Trash2, UserCheck, UserX, Mail, ChevronDown } from "lucide-react";
import { tipoDepoenteOptions, getDepoenteStyle } from "../constants";
import { TabDepoenteForm } from "./tab-depoente-form";
import type { Depoente } from "../types";
import type { SubtipoAudiencia } from "../subtipo-audiencia";
import { DepoenteStatusBadges } from "../shared/depoente-status";
import {
  DepoentesStatusBlock,
  type StatusIntimacao,
} from "../../depoentes-status-block";

interface TabDepoentesProps {
  depoentes: Depoente[];
  editandoDepoente: Depoente | null;
  setEditandoDepoente: (d: Depoente | null) => void;
  novoDepoenteNome: string;
  setNovoDepoenteNome: (v: string) => void;
  novoDepoenteTipo: Depoente["tipo"];
  setNovoDepoenteTipo: (v: Depoente["tipo"]) => void;
  handleAddDepoente: () => void;
  handleRemoveDepoente: (id: string) => void;
  handleUpdateDepoente: (d: Depoente) => void;
  expandedSections: Record<string, boolean>;
  toggleSection: (s: string) => void;
  expandedDepoenteDetails: Record<string, boolean>;
  toggleDepoenteDetails: (id: string) => void;
  evento: any;
  /** Quando informado, filtra os tipos de depoente disponíveis (por subtipo de audiência). */
  tiposPermitidos?: Array<Depoente["tipo"]>;
  /** Subtipo da audiência — usado para filtrar templates de perguntas. */
  subtipoAudiencia?: SubtipoAudiencia;
}

export function TabDepoentes({
  depoentes,
  editandoDepoente,
  setEditandoDepoente,
  novoDepoenteNome,
  setNovoDepoenteNome,
  novoDepoenteTipo,
  setNovoDepoenteTipo,
  handleAddDepoente,
  handleRemoveDepoente,
  handleUpdateDepoente,
  expandedSections,
  toggleSection,
  expandedDepoenteDetails,
  toggleDepoenteDetails,
  evento,
  tiposPermitidos,
  subtipoAudiencia,
}: TabDepoentesProps) {
  const handleStatusChange = (id: string, novo: StatusIntimacao) => {
    const alvo = depoentes.find((d) => d.id === id);
    if (!alvo) return;
    handleUpdateDepoente({ ...alvo, statusIntimacao: novo });
  };

  // Filtra os tipos disponíveis quando o subtipo de audiência define uma lista restrita
  const tipoOpts = tiposPermitidos && tiposPermitidos.length > 0
    ? tipoDepoenteOptions.filter((opt) => tiposPermitidos.includes(opt.value as Depoente["tipo"]))
    : tipoDepoenteOptions;

  // Se o tipo selecionado não está na lista permitida, troca para o primeiro permitido
  useEffect(() => {
    if (tipoOpts.length > 0 && !tipoOpts.some((opt) => opt.value === novoDepoenteTipo)) {
      setNovoDepoenteTipo(tipoOpts[0].value as Depoente["tipo"]);
    }
  }, [tiposPermitidos, novoDepoenteTipo]);

  return (
    <>
      {depoentes.length > 0 && (
        <DepoentesStatusBlock
          depoentes={depoentes}
          mode="interactive"
          onStatusChange={handleStatusChange}
          className="mb-2"
        />
      )}

      {/* ========== DESKTOP: dual-panel layout (unchanged) ========== */}
      <div className="hidden md:flex gap-3 h-[calc(98vh-245px)] overflow-hidden">
        {/* Left panel - List */}
        <div className="w-[220px] flex flex-col gap-2 shrink-0 max-h-full">
          {/* Add form - desktop */}
          <div className="bg-neutral-50/50 dark:bg-neutral-900/30 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 p-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <Plus className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">Novo Depoente</h3>
                <p className="text-[9px] text-neutral-500">Adicione participantes</p>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 block">Nome completo</Label>
              <Input
                value={novoDepoenteNome}
                onChange={(e) => setNovoDepoenteNome(e.target.value)}
                placeholder="Digite o nome..."
                className="text-sm h-8 bg-white dark:bg-neutral-950 border-neutral-300 dark:border-neutral-700"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddDepoente();
                  }
                }}
              />
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 block">Tipo</Label>
                <select
                  value={novoDepoenteTipo}
                  onChange={(e) => setNovoDepoenteTipo(e.target.value as Depoente["tipo"])}
                  className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 font-medium h-8"
                >
                  {tipoOpts.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                onClick={handleAddDepoente}
                className="h-8 w-8 p-0 bg-neutral-700 hover:bg-neutral-800 dark:bg-neutral-600 dark:hover:bg-neutral-700 cursor-pointer"
                size="sm"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Depoente list - desktop */}
          <div className="flex-1 space-y-1.5 overflow-y-auto pr-0.5">
            {depoentes.map((depoente) => {
              const isActive = editandoDepoente?.id === depoente.id;
              const style = getDepoenteStyle(depoente.tipo);

              return (
                <div
                  key={depoente.id}
                  className={cn(
                    "relative group rounded-lg border-l-4 border border-neutral-200 dark:border-neutral-800 p-2 cursor-pointer transition-all",
                    style.borderCard,
                    isActive ? "shadow-sm bg-neutral-50/50 dark:bg-neutral-900/30" : "hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  )}
                  onClick={() => setEditandoDepoente(depoente)}
                >
                  <div className="pr-5">
                    <p className="font-semibold text-xs truncate leading-tight">{depoente.nome}</p>
                    <p className="text-[10px] text-neutral-500 leading-tight mt-0.5">{style.label}</p>
                    <DepoenteStatusBadges dep={depoente} variant="compact" className="mt-1" />
                  </div>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemoveDepoente(depoente.id); }}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-rose-600 hover:text-rose-700 transition-opacity cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {depoentes.length === 0 && (
              <div className="text-center py-16 px-2">
                <Users className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                <p className="text-[10px] text-neutral-400 leading-tight">Nenhum depoente</p>
              </div>
            )}
          </div>
        </div>

        {/* Right panel - Form (desktop) */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {editandoDepoente ? (
            <TabDepoenteForm
              depoente={editandoDepoente}
              onUpdate={handleUpdateDepoente}
              expandedSections={expandedSections}
              toggleSection={toggleSection}
              expandedDepoenteDetails={expandedDepoenteDetails}
              toggleDepoenteDetails={toggleDepoenteDetails}
              evento={evento}
              subtipoAudiencia={subtipoAudiencia}
            />
          ) : (
            <div className="h-full flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-12 h-12 text-neutral-400" />
                </div>
                <p className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Selecione um depoente</p>
                <p className="text-xs text-neutral-500">Clique em um depoente à esquerda</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== MOBILE: accordion layout ========== */}
      <div className="flex md:hidden flex-col gap-2 overflow-y-auto">
        {/* Add form - mobile: compact single row */}
        <div className="bg-neutral-50/50 dark:bg-neutral-900/30 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 p-2.5">
          <div className="flex items-center gap-2">
            <Input
              value={novoDepoenteNome}
              onChange={(e) => setNovoDepoenteNome(e.target.value)}
              placeholder="Nome do depoente..."
              className="text-sm h-8 bg-white dark:bg-neutral-950 border-neutral-300 dark:border-neutral-700 flex-1 min-w-0"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddDepoente();
                }
              }}
            />
            <select
              value={novoDepoenteTipo}
              onChange={(e) => setNovoDepoenteTipo(e.target.value as Depoente["tipo"])}
              className="px-2 py-1.5 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 font-medium h-8 w-[110px] shrink-0"
            >
              {tipoDepoenteOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Button
              type="button"
              onClick={handleAddDepoente}
              className="h-8 w-8 p-0 bg-neutral-700 hover:bg-neutral-800 dark:bg-neutral-600 dark:hover:bg-neutral-700 cursor-pointer shrink-0"
              size="sm"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Depoente accordion list - mobile */}
        {depoentes.map((depoente) => {
          const isExpanded = editandoDepoente?.id === depoente.id;
          const style = getDepoenteStyle(depoente.tipo);

          return (
            <div
              key={depoente.id}
              className={cn(
                "rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden transition-all",
                isExpanded && "shadow-sm"
              )}
            >
              {/* Accordion header (collapsed card) */}
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors border-l-4",
                  style.borderCard,
                  isExpanded
                    ? "bg-neutral-50/80 dark:bg-neutral-900/50"
                    : "bg-white dark:bg-neutral-950 active:bg-neutral-50 dark:active:bg-neutral-900"
                )}
                onClick={() => {
                  if (isExpanded) {
                    setEditandoDepoente(null);
                  } else {
                    setEditandoDepoente(depoente);
                  }
                }}
              >
                {/* Name + type */}
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <p className="font-semibold text-sm truncate text-neutral-900 dark:text-neutral-100">
                    {depoente.nome}
                  </p>
                  <span className="text-[10px] text-neutral-400 shrink-0">
                    {style.label}
                  </span>
                </div>

                {/* Status badges */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {depoente.intimado && (
                    <div className="w-4 h-4 rounded-full bg-neutral-500 flex items-center justify-center">
                      <Mail className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  {depoente.presente ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      <UserCheck className="w-2.5 h-2.5" />
                      Presente
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                      <UserX className="w-2.5 h-2.5" />
                      Ausente
                    </span>
                  )}

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemoveDepoente(depoente.id); }}
                    className="p-1 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Chevron */}
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-neutral-400 transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )}
                  />
                </div>
              </div>

              {/* Accordion body (expanded form) */}
              {isExpanded && (
                <div className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                  <TabDepoenteForm
                    depoente={editandoDepoente!}
                    onUpdate={handleUpdateDepoente}
                    expandedSections={expandedSections}
                    toggleSection={toggleSection}
                    expandedDepoenteDetails={expandedDepoenteDetails}
                    toggleDepoenteDetails={toggleDepoenteDetails}
                    evento={evento}
                    subtipoAudiencia={subtipoAudiencia}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state - mobile */}
        {depoentes.length === 0 && (
          <div className="text-center py-8 px-2">
            <Users className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-[10px] text-neutral-400 leading-tight">Nenhum depoente adicionado</p>
          </div>
        )}
      </div>
    </>
  );
}
