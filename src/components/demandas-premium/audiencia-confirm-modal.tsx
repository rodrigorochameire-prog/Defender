"use client";

/**
 * Modal de confirmação de audiência — dispara após o usuário marcar o ato
 * de uma demanda como "Ciência designação/redesignação de audiência".
 *
 * Pré-preenche com dados extraídos de `providencias` (ou outro texto) via
 * `parseAudienciaFromText`; o usuário confirma/ajusta antes de salvar.
 */

import { useEffect, useState } from "react";
import { Calendar, Clock, Save, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseAudienciaFromText } from "@/lib/audiencia-parser";

const TIPOS_AUDIENCIA = [
  "Instrução e Julgamento",
  "Instrução",
  "Julgamento",
  "Conciliação",
  "Justificação",
  "Custódia",
  "Admoestação",
  "Una",
  "Outra",
];

export interface AudienciaConfirmData {
  data: string;
  hora: string;
  tipo: string;
}

interface AudienciaConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: AudienciaConfirmData) => void;
  /** Contexto do assistido/processo — mostrado no header do modal */
  assistidoNome?: string;
  numeroAutos?: string;
  /** Fontes de texto para parsing automático (providencias, ato, etc.) */
  sources: Array<string | null | undefined>;
  saving?: boolean;
}

export function AudienciaConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  assistidoNome,
  numeroAutos,
  sources,
  saving = false,
}: AudienciaConfirmModalProps) {
  const [form, setForm] = useState<AudienciaConfirmData>({ data: "", hora: "", tipo: "" });
  const [autoFilled, setAutoFilled] = useState<{ data: boolean; hora: boolean; tipo: boolean }>({
    data: false,
    hora: false,
    tipo: false,
  });

  // Ao abrir, pré-popula a partir do parser
  useEffect(() => {
    if (!isOpen) return;
    const parsed = parseAudienciaFromText(...sources);
    setForm({
      data: parsed.data ?? "",
      hora: parsed.hora ?? "",
      tipo: parsed.tipo ?? "",
    });
    setAutoFilled({
      data: !!parsed.data,
      hora: !!parsed.hora,
      tipo: !!parsed.tipo,
    });
  }, [isOpen, sources]);

  // Bloquear scroll do body
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const canSubmit = form.data !== "" && form.hora !== "" && form.tipo !== "" && !saving;

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
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-[440px] max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header — Padrão Defender v5 */}
          <div className="px-5 py-4 border-l-[4px] border-l-emerald-400 dark:border-l-emerald-600 border-b border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-[13px] font-semibold text-foreground tracking-tight">
                  Registrar Audiência
                </h2>
                <p className="text-[10px] text-muted-foreground truncate max-w-[280px]">
                  {assistidoNome ? `${assistidoNome}` : ""}
                  {assistidoNome && numeroAutos ? " · " : ""}
                  {numeroAutos ? numeroAutos : ""}
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

          {/* Body */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) onConfirm(form);
            }}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Hint de autopreenchimento */}
              {(autoFilled.data || autoFilled.hora || autoFilled.tipo) && (
                <div className="px-3 py-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40 text-[11px] text-emerald-700 dark:text-emerald-300">
                  Campos pré-preenchidos a partir das providências. Ajuste se necessário.
                </div>
              )}

              {/* Data + Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-500" />
                    Data
                  </Label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                    className="w-full h-9 text-xs rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-900 text-foreground/80 px-3 focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-400 dark:focus:border-emerald-600 transition-all"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-500" />
                    Hora
                  </Label>
                  <input
                    type="time"
                    value={form.hora}
                    onChange={(e) => setForm({ ...form, hora: e.target.value })}
                    className="w-full h-9 text-xs rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-900 text-foreground/80 px-3 focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-400 dark:focus:border-emerald-600 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Tipo */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                  Tipo da audiência
                </Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger className="w-full h-9 text-xs rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-900 text-foreground/80 focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-400 dark:focus:border-emerald-600">
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent className="z-[100000]">
                    {TIPOS_AUDIENCIA.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Footer */}
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
                className="flex-1 h-9 rounded-xl bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 text-[11px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
