"use client";

import { useState } from "react";
import { X, Save, Calendar, FileText, Scale, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DemandaFormData } from "@/components/demandas-premium/demanda-create-modal";

interface QuickEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DemandaFormData) => void;
  demanda: DemandaFormData;
  atoOptions: Array<{ value: string; label: string }>;
  statusOptions: Array<{ value: string; label: string }>;
  atribuicaoOptions: Array<{ value: string; label: string }>;
}

export function QuickEditModal({
  isOpen,
  onClose,
  onSave,
  demanda,
  atoOptions,
  statusOptions,
  atribuicaoOptions,
}: QuickEditModalProps) {
  const [formData, setFormData] = useState<DemandaFormData>(demanda);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  Edição Rápida
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formData.assistido}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
          {/* Grid de 2 colunas */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
                  <AlertCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Ato */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                Tipo de Ato
              </label>
              <select
                value={formData.ato}
                onChange={(e) => setFormData({ ...formData, ato: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                {atoOptions
                  .filter(ato => ato.value !== "Todos")
                  .map((ato) => (
                    <option key={ato.value} value={ato.value}>
                      {ato.label}
                    </option>
                  ))}
              </select>
            </div>

            {/* Atribuição */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center">
                  <Scale className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                </div>
                Atribuição
              </label>
              <select
                value={formData.atribuicao}
                onChange={(e) => setFormData({ ...formData, atribuicao: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                {atribuicaoOptions
                  .filter(attr => attr.value !== "Todas")
                  .map((attr) => (
                    <option key={attr.value} value={attr.value}>
                      {attr.label}
                    </option>
                  ))}
              </select>
            </div>

            {/* Prazo */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                Prazo (dd/mm/aa)
              </label>
              <Input
                type="text"
                placeholder="29/01/26"
                value={formData.prazo}
                onChange={(e) => setFormData({ ...formData, prazo: e.target.value })}
                className="h-10 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Assistido */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-cyan-100 dark:bg-cyan-950/30 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              </div>
              Nome do Assistido
            </label>
            <Input
              type="text"
              placeholder="Nome completo"
              value={formData.assistido}
              onChange={(e) => setFormData({ ...formData, assistido: e.target.value })}
              className="h-10 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Providências */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Providências
            </label>
            <textarea
              placeholder="Descreva as providências necessárias..."
              value={formData.providencias}
              onChange={(e) => setFormData({ ...formData, providencias: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Alterações serão salvas imediatamente
          </p>
          <div className="flex gap-2">
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-zinc-600 dark:text-zinc-400"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
