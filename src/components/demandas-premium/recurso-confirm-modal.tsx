"use client";

/**
 * Modal disparado ao alterar status para "Protocolado" em demandas cujo ato
 * é recurso de instância superior (HC, Apelação, RSE, Agravo em Execução).
 * Registra em `recursos` vinculado ao processo de origem. Para HC o número
 * do recurso é obrigatório (autos em 2º grau).
 */

import { useEffect, useState } from "react";
import { Scale, Hash, Calendar, Gavel, Save, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import type { TipoRecurso } from "@/lib/recurso-helpers";

export interface RecursoConfirmData {
  numeroRecurso: string;
  dataInterposicao: string; // YYYY-MM-DD
  camara: string;
  turma: string;
  relatorNome: string;
}

interface RecursoConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: RecursoConfirmData) => void;
  assistidoNome?: string;
  numeroAutosOrigem?: string;
  tipo: TipoRecurso | null;
  rotulo: string;
  /** Se true (p.ex. HC), o campo "número do recurso" é obrigatório. */
  exigeNumero: boolean;
  saving?: boolean;
}

export function RecursoConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  assistidoNome,
  numeroAutosOrigem,
  tipo,
  rotulo,
  exigeNumero,
  saving = false,
}: RecursoConfirmModalProps) {
  const [form, setForm] = useState<RecursoConfirmData>({
    numeroRecurso: "",
    dataInterposicao: new Date().toISOString().slice(0, 10),
    camara: "",
    turma: "",
    relatorNome: "",
  });

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      numeroRecurso: "",
      dataInterposicao: new Date().toISOString().slice(0, 10),
      camara: "",
      turma: "",
      relatorNome: "",
    });
  }, [isOpen, tipo]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen || !tipo) return null;

  const canSubmit = !saving && form.dataInterposicao !== "" && (!exigeNumero || form.numeroRecurso.trim() !== "");

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.6)", zIndex: 99998 }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        <div
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-[480px] max-h-[88vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header — Padrão Defender v5 com barra lateral sky (instância superior) */}
          <div className="px-5 py-4 border-l-[4px] border-l-sky-400 dark:border-l-sky-600 border-b border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
                <Scale className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <h2 className="text-[13px] font-semibold text-foreground tracking-tight">
                  Registrar {rotulo} — 2º grau
                </h2>
                <p className="text-[10px] text-muted-foreground truncate max-w-[320px]">
                  {assistidoNome ? assistidoNome : ""}
                  {assistidoNome && numeroAutosOrigem ? " · " : ""}
                  {numeroAutosOrigem ? `origem ${numeroAutosOrigem}` : ""}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              type="button"
              title="Fechar"
            >
              <X className="h-4 w-4 text-neutral-500" />
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) onConfirm(form);
            }}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Número do recurso */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                  <Hash className="w-3 h-3 text-sky-500" />
                  Número dos autos em 2º grau
                  {exigeNumero ? (
                    <span className="text-[10px] font-normal text-rose-500">(obrigatório)</span>
                  ) : (
                    <span className="text-[10px] font-normal text-neutral-400">(opcional)</span>
                  )}
                </Label>
                <input
                  value={form.numeroRecurso}
                  onChange={(e) => setForm({ ...form, numeroRecurso: e.target.value })}
                  placeholder="0000000-00.0000.8.05.0000"
                  className="w-full h-9 text-xs rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-900 text-foreground/80 px-3 focus:ring-1 focus:ring-sky-500/30 focus:border-sky-400 dark:focus:border-sky-600 transition-all font-mono tabular-nums"
                  required={exigeNumero}
                />
              </div>

              {/* Data de interposição */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-sky-500" />
                  Data de interposição
                </Label>
                <input
                  type="date"
                  value={form.dataInterposicao}
                  onChange={(e) => setForm({ ...form, dataInterposicao: e.target.value })}
                  className="w-full h-9 text-xs rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-900 text-foreground/80 px-3 focus:ring-1 focus:ring-sky-500/30 focus:border-sky-400 dark:focus:border-sky-600 transition-all"
                  required
                />
              </div>

              {/* Câmara + Turma */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                    Câmara
                  </Label>
                  <input
                    value={form.camara}
                    onChange={(e) => setForm({ ...form, camara: e.target.value })}
                    placeholder="2ª Câmara Criminal"
                    className="w-full h-9 text-xs rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-900 text-foreground/80 px-3 focus:ring-1 focus:ring-sky-500/30 focus:border-sky-400 dark:focus:border-sky-600 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                    Turma
                  </Label>
                  <input
                    value={form.turma}
                    onChange={(e) => setForm({ ...form, turma: e.target.value })}
                    placeholder="1ª Turma"
                    className="w-full h-9 text-xs rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-900 text-foreground/80 px-3 focus:ring-1 focus:ring-sky-500/30 focus:border-sky-400 dark:focus:border-sky-600 transition-all"
                  />
                </div>
              </div>

              {/* Relator */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                  <Gavel className="w-3 h-3 text-sky-500" />
                  Relator
                </Label>
                <input
                  value={form.relatorNome}
                  onChange={(e) => setForm({ ...form, relatorNome: e.target.value })}
                  placeholder="Des. Nome do Relator"
                  className="w-full h-9 text-xs rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-900 text-foreground/80 px-3 focus:ring-1 focus:ring-sky-500/30 focus:border-sky-400 dark:focus:border-sky-600 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-2 px-5 py-3 border-t border-neutral-200/60 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-900/50 rounded-b-2xl">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-9 rounded-lg border border-neutral-200/80 dark:border-neutral-800/60 bg-white dark:bg-neutral-900 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all duration-150 cursor-pointer"
              >
                Pular
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex-1 h-9 rounded-xl bg-sky-500 text-white shadow-sm hover:bg-sky-600 transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 text-[11px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Salvando..." : "Registrar recurso"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
