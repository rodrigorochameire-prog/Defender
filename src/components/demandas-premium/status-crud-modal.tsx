"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Save, Plus, Pencil, icons } from "lucide-react";
import { STATUS_GROUPS, type StatusGroup, type StatusConfig } from "@/config/demanda-status";
import { createPortal } from "react-dom";

interface StatusCrudModalProps {
  isOpen?: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  status?: StatusConfig | null;
  onSave?: (statusData: Partial<StatusConfig>) => void;
}

// Lista de todos os ícones Lucide disponíveis
const AVAILABLE_ICONS = [
  "AlertCircle", "Archive", "Briefcase", "Calendar", "Check", "CheckCircle2",
  "Clipboard", "ClipboardList", "Clock", "Eye", "FileCheck", "FileEdit",
  "FileSearch", "FileSignature", "FileText", "FolderOpen", "Glasses",
  "Inbox", "PenTool", "Scale", "ScrollText", "Search", "Send",
  "ShieldCheck", "Target", "ThumbsUp", "UserCheck", "UserCog", "Users",
  "XCircle", "Rocket"
];

export function StatusCrudModal({
  isOpen,
  onClose,
  mode,
  status,
  onSave,
}: StatusCrudModalProps) {
  const [label, setLabel] = useState(status?.label || "");
  const [selectedGroup, setSelectedGroup] = useState<StatusGroup>(
    status?.group || "preparacao"
  );
  const [selectedIcon, setSelectedIcon] = useState(
    status?.icon.name || "FileText"
  );

  const handleSave = () => {
    if (!label.trim()) {
      alert("Por favor, preencha o nome do status");
      return;
    }

    const statusData: Partial<StatusConfig> = {
      label: label.trim(),
      group: selectedGroup,
      // O ícone será tratado pelo componente pai
    };

    onSave?.(statusData);
    handleClose();
  };

  const handleClose = () => {
    setLabel("");
    setSelectedGroup("preparacao");
    setSelectedIcon("FileText");
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000]"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border-2 border-zinc-200 dark:border-zinc-700 z-[10001] overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b-2 border-zinc-200 dark:border-zinc-700 bg-gradient-to-br from-emerald-50 to-zinc-50 dark:from-emerald-950/20 dark:to-zinc-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {mode === "add" ? (
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                      <Pencil className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {mode === "add" ? "Adicionar Novo Status" : "Editar Status"}
                    </h2>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                      {mode === "add"
                        ? "Crie um novo status personalizado"
                        : "Modifique as informações do status"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Nome do Status */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Nome do Status *
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex: Em análise, Aguardando..."
                  className="w-full px-4 py-2.5 rounded-lg border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Grupo */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Categoria *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(STATUS_GROUPS) as StatusGroup[]).map((groupKey) => {
                    const group = STATUS_GROUPS[groupKey];
                    const isSelected = selectedGroup === groupKey;

                    return (
                      <button
                        key={groupKey}
                        type="button"
                        onClick={() => setSelectedGroup(groupKey)}
                        className={`
                          p-3 rounded-lg border-2 transition-all text-left
                          ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                              : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                          }
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: group.color }}
                          />
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {group.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ícone (Preview simples - a funcionalidade completa seria mais complexa) */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Ícone
                </label>
                <div className="px-4 py-3 rounded-lg border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    O ícone será atribuído automaticamente com base no nome do status
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30 flex gap-3 justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg font-medium text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {mode === "add" ? "Adicionar" : "Salvar Alterações"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}