"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Users, Trash2, UserCheck, UserX, Mail } from "lucide-react";
import { tipoDepoenteOptions, getDepoenteStyle } from "../constants";
import { TabDepoenteForm } from "./tab-depoente-form";
import type { Depoente } from "../types";

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
}: TabDepoentesProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3 h-auto md:h-[calc(98vh-165px)] overflow-hidden">
      {/* Left panel - List */}
      <div className="w-full md:w-[220px] flex flex-col gap-2 shrink-0 md:max-h-full max-h-[40vh]">
        {/* Add form */}
        <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <Plus className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Novo Depoente</h3>
              <p className="text-[9px] text-zinc-500">Adicione participantes</p>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 block">Nome completo</Label>
            <Input
              value={novoDepoenteNome}
              onChange={(e) => setNovoDepoenteNome(e.target.value)}
              placeholder="Digite o nome..."
              className="text-sm h-8 bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700"
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
              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 block">Tipo</Label>
              <select
                value={novoDepoenteTipo}
                onChange={(e) => setNovoDepoenteTipo(e.target.value as Depoente["tipo"])}
                className="w-full px-2.5 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 font-medium h-8"
              >
                {tipoDepoenteOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              onClick={handleAddDepoente}
              className="h-8 w-8 p-0 bg-zinc-700 hover:bg-zinc-800 dark:bg-zinc-600 dark:hover:bg-zinc-700 cursor-pointer"
              size="sm"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Depoente list */}
        <div className="flex-1 space-y-1.5 overflow-y-auto pr-0.5">
          {depoentes.map((depoente) => {
            const isActive = editandoDepoente?.id === depoente.id;
            const style = getDepoenteStyle(depoente.tipo);

            return (
              <div
                key={depoente.id}
                className={cn(
                  "relative group rounded-lg border-l-4 border border-zinc-200 dark:border-zinc-800 p-2 cursor-pointer transition-all",
                  style.borderCard,
                  isActive ? "shadow-sm bg-zinc-50/50 dark:bg-zinc-900/30" : "hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                )}
                onClick={() => setEditandoDepoente(depoente)}
              >
                <div className="absolute -top-1 -right-1 flex gap-0.5">
                  {depoente.presente ? (
                    <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center">
                      <UserCheck className="w-2.5 h-2.5 text-white" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-rose-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center">
                      <UserX className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  {depoente.intimado && (
                    <div className="w-4 h-4 rounded-full bg-zinc-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center">
                      <Mail className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>

                <div className="pr-5">
                  <p className="font-semibold text-xs truncate leading-tight">{depoente.nome}</p>
                  <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">{style.label}</p>
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
            <div className="text-center py-8 md:py-16 px-2">
              <Users className="w-8 md:w-10 h-8 md:h-10 text-zinc-300 mx-auto mb-2" />
              <p className="text-[10px] text-zinc-400 leading-tight">Nenhum depoente</p>
            </div>
          )}
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-[50vh] md:min-h-0">
        {editandoDepoente ? (
          <TabDepoenteForm
            depoente={editandoDepoente}
            onUpdate={handleUpdateDepoente}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            expandedDepoenteDetails={expandedDepoenteDetails}
            toggleDepoenteDetails={toggleDepoenteDetails}
            evento={evento}
          />
        ) : (
          <div className="h-full flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Users className="w-8 h-8 md:w-12 md:h-12 text-zinc-400" />
              </div>
              <p className="text-sm md:text-base font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Selecione um depoente</p>
              <p className="text-xs text-zinc-500">Clique em um depoente à esquerda</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
