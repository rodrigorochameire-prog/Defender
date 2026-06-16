// @ts-nocheck
"use client";

import React, { useState } from "react";
import { User, FileText, Lock, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { InlineDropdown } from "@/components/shared/inline-dropdown";
import { TIPO_PROCESSO_OPTIONS } from "@/config/tipos-processo";
import {
  STATUS_PRISIONAL_CONFIG,
  STATUS_PRISIONAL_OPTIONS,
  type StatusPrisional,
} from "@/components/demandas-premium/status-prisional-config";
import type { Demanda } from "../types";

// Atribuição options — kept local (same values as the parent constant).
const ATRIBUICAO_OPTIONS = [
  { value: "Tribunal do Júri", label: "Tribunal do Júri" },
  { value: "Grupo Especial do Júri", label: "Grupo Especial do Júri" },
  { value: "Violência Doméstica", label: "Violência Doméstica" },
  { value: "Execução Penal", label: "Execução Penal" },
  { value: "Substituição Criminal", label: "Substituição Criminal" },
  { value: "Curadoria Especial", label: "Curadoria Especial" },
];

const ATRIBUICAO_BORDER_COLORS: Record<string, string> = {
  "Tribunal do Júri": "#22c55e",
  "Grupo Especial do Júri": "#f97316",
  "Violência Doméstica": "#f59e0b",
  "Execução Penal": "#3b82f6",
  "Substituição Criminal": "#8b5cf6",
  "Curadoria Especial": "#71717a",
};

interface Props {
  demanda: Demanda;
  onAtribuicaoChange: (id: string, atribuicao: string) => void;
  onTipoProcessoChange?: (id: string, tipo: string) => void;
  onAssistidoNomeChange?: (id: string, nome: string) => void;
  onStatusPrisionalChange?: (assistidoId: number, status: string) => void;
  /** Icon component keyed by atribuição name. */
  atribuicaoIcons?: Record<string, React.ComponentType<{ className?: string }>>;
}

export function IdentificacaoSecao({
  demanda,
  onAtribuicaoChange,
  onTipoProcessoChange,
  onAssistidoNomeChange,
  onStatusPrisionalChange,
  atribuicaoIcons,
}: Props) {
  // Local edit state for assistido name inline editing
  const [editingAssistidoNome, setEditingAssistidoNome] = useState(false);
  const [assistidoDraft, setAssistidoDraft] = useState("");

  const atribuicaoColor = ATRIBUICAO_BORDER_COLORS[demanda.atribuicao] || "#71717a";
  const AtribuicaoIcon = atribuicaoIcons?.[demanda.atribuicao];
  const processo = demanda.processos?.[0];

  return (
    // -mx-4 cancela o px-4 de conteúdo do CollapsibleSection p/ as rows ficarem
    // flush nas bordas. Se aquele padding mudar, ajustar este valor aqui.
    <div className="-mx-4 divide-y divide-neutral-200/40 dark:divide-neutral-800/40">
      {/* Assistido row — editável inline. Útil pra corrigir
          placeholders ("⚠ A identificar — <cnj>") gerados pelo
          importer quando o polo passivo veio em sigilo, e pra
          ajustar typos. Click → input → Enter/blur salva, Esc
          cancela. */}
      {demanda.assistidoId && onAssistidoNomeChange && (
        <div className="flex items-center px-4 py-2.5 gap-3">
          <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
            <User className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Assistido</span>
          <div className="flex-1 flex items-center justify-end min-w-0">
            {editingAssistidoNome ? (
              <input
                autoFocus
                type="text"
                value={assistidoDraft}
                onChange={(e) => setAssistidoDraft(e.target.value)}
                onBlur={() => {
                  const trimmed = assistidoDraft.trim();
                  if (trimmed && trimmed !== demanda.assistido && demanda.assistidoId) {
                    onAssistidoNomeChange(String(demanda.assistidoId), trimmed);
                  }
                  setEditingAssistidoNome(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") {
                    setAssistidoDraft(demanda.assistido || "");
                    setEditingAssistidoNome(false);
                  }
                }}
                className="text-xs text-right text-neutral-700 dark:text-neutral-200 bg-transparent border-b border-neutral-300 dark:border-neutral-700 focus:border-neutral-500 outline-none w-full px-1"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAssistidoDraft(demanda.assistido || "");
                  setEditingAssistidoNome(true);
                }}
                className={cn(
                  "text-xs hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors text-right truncate cursor-pointer",
                  (demanda.assistido || "").startsWith("⚠")
                    ? "text-amber-600 dark:text-amber-400 italic"
                    : "text-neutral-700 dark:text-neutral-300"
                )}
                title="Clique para editar"
              >
                {demanda.assistido || "—"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Atribuição row — editável via dropdown. Migrou do header
          pra cá pra deixar a hero card mais limpa, mantendo a edição
          acessível e a área visível em metadata. */}
      <div className="flex items-center px-4 py-2.5 gap-3">
        <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
          {AtribuicaoIcon ? (
            <AtribuicaoIcon className="w-3 h-3" style={{ color: atribuicaoColor }} />
          ) : null}
        </div>
        <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Atribuição</span>
        <div className="flex-1 flex items-center justify-end">
          <InlineDropdown
            value={demanda.atribuicao}
            compact
            displayValue={
              <span className="text-xs text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                {demanda.atribuicao}
              </span>
            }
            options={ATRIBUICAO_OPTIONS}
            onChange={(v) => onAtribuicaoChange(demanda.id, v)}
          />
        </div>
      </div>

      {/* Tipo do processo (AP/MPU/APF/...) — editável via
          dropdown. Útil pra corrigir importações que vieram com
          tipo errado (ex.: APF inserido como MPU pelo importer
          VVD legacy). Update vai direto no processo, não na
          demanda. */}
      {processo && onTipoProcessoChange && demanda.processoId && (
        <div className="flex items-center px-4 py-2.5 gap-3">
          <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
            <FileText className="w-3 h-3 text-neutral-400" />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Tipo</span>
          <div className="flex-1 flex items-center justify-end">
            <InlineDropdown
              value={processo.tipo || ""}
              compact
              displayValue={
                <span className="text-xs text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                  {processo.tipo || "—"}
                </span>
              }
              options={TIPO_PROCESSO_OPTIONS}
              onChange={(v) => onTipoProcessoChange(String(demanda.processoId), v)}
            />
          </div>
        </div>
      )}
      {/* Fallback read-only se a view não passar o handler */}
      {processo?.tipo && !onTipoProcessoChange && (
        <div className="flex items-center px-4 py-2.5 gap-3">
          <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
            <FileText className="w-3 h-3 text-neutral-400" />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Tipo</span>
          <span className="flex-1 text-right text-xs text-neutral-500 dark:text-neutral-400">{processo.tipo}</span>
        </div>
      )}

      {/* Status prisional — editável via InlineDropdown.
          Atualiza assistidos.statusPrisional via mutation. */}
      {demanda.assistidoId && onStatusPrisionalChange && (
        <div className="flex items-center px-4 py-2.5 gap-3">
          <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
            <Lock className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Prisional</span>
          <div className="flex-1 flex items-center justify-end">
            <InlineDropdown
              value={demanda.estadoPrisional?.toUpperCase() || "SOLTO"}
              compact
              displayValue={
                <span className={cn(
                  "text-xs font-medium px-1.5 py-0.5 rounded transition-colors",
                  STATUS_PRISIONAL_CONFIG[(demanda.estadoPrisional?.toUpperCase() || "SOLTO") as StatusPrisional]?.bg,
                  STATUS_PRISIONAL_CONFIG[(demanda.estadoPrisional?.toUpperCase() || "SOLTO") as StatusPrisional]?.color,
                )}>
                  {STATUS_PRISIONAL_CONFIG[(demanda.estadoPrisional?.toUpperCase() || "SOLTO") as StatusPrisional]?.label || "Solto"}
                </span>
              }
              options={STATUS_PRISIONAL_OPTIONS}
              onChange={(v) => onStatusPrisionalChange(demanda.assistidoId!, v)}
            />
          </div>
        </div>
      )}

      {/* Vara/órgão julgador — novo */}
      {processo?.vara && (
        <div className="flex items-center px-4 py-2.5 gap-3">
          <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
            <Building2 className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Vara</span>
          <span className="flex-1 text-right text-xs text-neutral-500 dark:text-neutral-400">
            {processo.vara}
          </span>
        </div>
      )}
    </div>
  );
}
