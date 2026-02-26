"use client";

import { useState, useMemo } from "react";
import { Check, X, HelpCircle, User, AlertTriangle } from "lucide-react";
import { InlineDropdown } from "@/components/shared/inline-dropdown";
import { InlineDatePicker } from "@/components/shared/inline-date-picker";
import { getAtosPorAtribuicao, getTodosAtosUnicos } from "@/config/atos-por-atribuicao";
import { DEMANDA_STATUS, STATUS_GROUPS } from "@/config/demanda-status";
import { calcularPrazoPorAto, converterISOParaBR } from "@/lib/prazo-calculator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// TIPOS
// ============================================================================

export interface AssistidoMatch {
  type: "exact" | "similar" | "new";
  matchedId?: number;
  matchedNome?: string;
  matchedCpf?: string | null;
  statusPrisional?: string | null;
  similarity?: number;
}

export interface PjeReviewRow {
  // Imutáveis (do parser)
  assistidoNome: string;
  numeroProcesso: string;
  dataExpedicao: string;
  tipoDocumento?: string;
  tipoProcesso?: string;
  crime?: string;
  ordemOriginal: number;

  // Editáveis
  ato: string;
  atoConfidence: "high" | "medium" | "low";
  status: string;
  prazo: string;
  estadoPrisional: string;
  excluded: boolean;
  prazoManual: boolean;

  // Match
  assistidoMatch: AssistidoMatch;
}

interface PjeReviewTableProps {
  rows: PjeReviewRow[];
  onRowsChange: (rows: PjeReviewRow[]) => void;
  atribuicao: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getConfidenceDot(confidence: "high" | "medium" | "low") {
  switch (confidence) {
    case "high":
      return "bg-emerald-500";
    case "medium":
      return "bg-amber-500";
    case "low":
      return "bg-zinc-400";
  }
}

function getMatchDot(match: AssistidoMatch) {
  switch (match.type) {
    case "exact":
      return { color: "bg-emerald-500", label: "Encontrado" };
    case "similar":
      return { color: "bg-amber-500", label: "Similar" };
    case "new":
      return { color: "bg-red-500", label: "Novo" };
  }
}

function calcularPrazoParaAto(dataExpedicao: string, ato: string): string {
  if (!dataExpedicao || !ato) return "";

  try {
    // Converter data de expedição para Date
    // Formatos possíveis: "DD/MM/YYYY", "DD/MM/YYYY HH:mm", "YYYY-MM-DD"
    let date: Date;
    if (dataExpedicao.includes("-")) {
      // ISO format
      date = new Date(dataExpedicao + "T12:00:00");
    } else {
      const parts = dataExpedicao.split(/[\s/]/);
      const dia = parseInt(parts[0]);
      const mes = parseInt(parts[1]) - 1;
      const ano = parseInt(parts[2]);
      const fullYear = ano < 100 ? 2000 + ano : ano;
      date = new Date(fullYear, mes, dia);
    }

    if (isNaN(date.getTime())) return "";

    const isoResult = calcularPrazoPorAto(date, ato);
    if (!isoResult) return "";

    return converterISOParaBR(isoResult);
  } catch {
    return "";
  }
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function PjeReviewTable({
  rows,
  onRowsChange,
  atribuicao,
}: PjeReviewTableProps) {
  // Opções de ato baseadas na atribuição
  const atoOptions = useMemo(() => {
    const atos = atribuicao
      ? getAtosPorAtribuicao(atribuicao).filter((a) => a.value !== "Todos")
      : getTodosAtosUnicos();
    return atos.map((a) => ({
      value: a.value,
      label: a.label,
    }));
  }, [atribuicao]);

  // Opções de status
  const statusOptions = useMemo(() => {
    return Object.entries(DEMANDA_STATUS).map(([key, config]) => ({
      value: key,
      label: config.label,
      group: STATUS_GROUPS[config.group]?.label || "Outro",
      color: STATUS_GROUPS[config.group]?.color,
    }));
  }, []);

  // Opções de estado prisional
  const estadoPrisionalOptions = [
    { value: "Solto", label: "Solto" },
    { value: "preso", label: "Preso" },
    { value: "monitorado", label: "Monitorado" },
  ];

  // Handlers
  const updateRow = (index: number, updates: Partial<PjeReviewRow>) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], ...updates };
    onRowsChange(newRows);
  };

  const handleAtoChange = (index: number, novoAto: string) => {
    const row = rows[index];
    const updates: Partial<PjeReviewRow> = { ato: novoAto };

    // Se o prazo não foi editado manualmente, recalcular
    if (!row.prazoManual) {
      const novoPrazo = calcularPrazoParaAto(row.dataExpedicao, novoAto);
      updates.prazo = novoPrazo;
    }

    updateRow(index, updates);
  };

  const handlePrazoChange = (index: number, isoDate: string) => {
    // Converter ISO para BR format para display
    const brDate = converterISOParaBR(isoDate);
    updateRow(index, { prazo: brDate, prazoManual: true });
  };

  const handleToggleExclude = (index: number) => {
    updateRow(index, { excluded: !rows[index].excluded });
  };

  const handleToggleAll = () => {
    const allIncluded = rows.every((r) => !r.excluded);
    onRowsChange(rows.map((r) => ({ ...r, excluded: allIncluded })));
  };

  // Resumo
  const includedCount = rows.filter((r) => !r.excluded).length;
  const matchExact = rows.filter((r) => r.assistidoMatch.type === "exact").length;
  const matchSimilar = rows.filter((r) => r.assistidoMatch.type === "similar").length;
  const matchNew = rows.filter((r) => r.assistidoMatch.type === "new").length;

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Barra de resumo */}
        <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 px-1">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {includedCount} para importar
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {matchExact} encontrados
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {matchSimilar} similares
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {matchNew} novos
          </span>
        </div>

        {/* Tabela */}
        <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
                  <th className="w-8 px-2 py-2 text-center">
                    <button
                      onClick={handleToggleAll}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                      title={rows.every((r) => !r.excluded) ? "Desmarcar todos" : "Marcar todos"}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </th>
                  <th className="w-8 px-1 py-2 text-center text-zinc-500 dark:text-zinc-400 font-medium">
                    #
                  </th>
                  <th className="px-2 py-2 text-left text-zinc-500 dark:text-zinc-400 font-medium min-w-[160px]">
                    Assistido
                  </th>
                  <th className="px-2 py-2 text-left text-zinc-500 dark:text-zinc-400 font-medium min-w-[140px]">
                    Processo
                  </th>
                  <th className="px-2 py-2 text-left text-zinc-500 dark:text-zinc-400 font-medium min-w-[150px]">
                    Ato
                  </th>
                  <th className="px-2 py-2 text-left text-zinc-500 dark:text-zinc-400 font-medium min-w-[90px]">
                    Prazo
                  </th>
                  <th className="px-2 py-2 text-left text-zinc-500 dark:text-zinc-400 font-medium min-w-[100px]">
                    Status
                  </th>
                  <th className="px-2 py-2 text-left text-zinc-500 dark:text-zinc-400 font-medium min-w-[80px]">
                    Preso
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <PjeReviewRow
                    key={row.ordemOriginal}
                    row={row}
                    index={index}
                    atoOptions={atoOptions}
                    statusOptions={statusOptions}
                    estadoPrisionalOptions={estadoPrisionalOptions}
                    onAtoChange={handleAtoChange}
                    onPrazoChange={handlePrazoChange}
                    onStatusChange={(i, v) => updateRow(i, { status: v })}
                    onEstadoPrisionalChange={(i, v) => updateRow(i, { estadoPrisional: v })}
                    onToggleExclude={handleToggleExclude}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// ROW COMPONENT
// ============================================================================

interface PjeReviewRowProps {
  row: PjeReviewRow;
  index: number;
  atoOptions: Array<{ value: string; label: string }>;
  statusOptions: Array<{ value: string; label: string; group?: string; color?: string }>;
  estadoPrisionalOptions: Array<{ value: string; label: string }>;
  onAtoChange: (index: number, value: string) => void;
  onPrazoChange: (index: number, isoDate: string) => void;
  onStatusChange: (index: number, value: string) => void;
  onEstadoPrisionalChange: (index: number, value: string) => void;
  onToggleExclude: (index: number) => void;
}

function PjeReviewRow({
  row,
  index,
  atoOptions,
  statusOptions,
  estadoPrisionalOptions,
  onAtoChange,
  onPrazoChange,
  onStatusChange,
  onEstadoPrisionalChange,
  onToggleExclude,
}: PjeReviewRowProps) {
  const matchInfo = getMatchDot(row.assistidoMatch);
  const confidenceClass = getConfidenceDot(row.atoConfidence);

  const statusConfig = DEMANDA_STATUS[row.status as keyof typeof DEMANDA_STATUS];
  const statusGroup = statusConfig?.group || "fila";
  const statusColor = STATUS_GROUPS[statusGroup]?.color || "#A1A1AA";

  return (
    <tr
      className={`border-b border-zinc-100 dark:border-zinc-800 transition-colors ${
        row.excluded
          ? "opacity-40 bg-zinc-50 dark:bg-zinc-900"
          : "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
      }`}
    >
      {/* Checkbox */}
      <td className="px-2 py-1.5 text-center">
        <button
          onClick={() => onToggleExclude(index)}
          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
            row.excluded
              ? "border-zinc-300 dark:border-zinc-600"
              : "border-emerald-500 bg-emerald-500 text-white"
          }`}
        >
          {!row.excluded && <Check className="h-3 w-3" />}
        </button>
      </td>

      {/* Ordem */}
      <td className="px-1 py-1.5 text-center text-zinc-400 dark:text-zinc-500 font-mono text-[10px]">
        {row.ordemOriginal + 1}
      </td>

      {/* Assistido */}
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${matchInfo.color}`} />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-[250px]">
              {row.assistidoMatch.type === "exact" && (
                <span>
                  Encontrado: <strong>{row.assistidoMatch.matchedNome}</strong>
                  {row.assistidoMatch.matchedCpf && ` (${row.assistidoMatch.matchedCpf})`}
                  {row.assistidoMatch.similarity && ` — ${Math.round(row.assistidoMatch.similarity * 100)}%`}
                </span>
              )}
              {row.assistidoMatch.type === "similar" && (
                <span>
                  Similar: <strong>{row.assistidoMatch.matchedNome}</strong>
                  {row.assistidoMatch.similarity && ` — ${Math.round(row.assistidoMatch.similarity * 100)}%`}
                  <br />
                  <span className="text-amber-400">Verificar se é a mesma pessoa</span>
                </span>
              )}
              {row.assistidoMatch.type === "new" && (
                <span>Assistido novo — será cadastrado na importação</span>
              )}
            </TooltipContent>
          </Tooltip>
          <span className="text-zinc-800 dark:text-zinc-200 truncate max-w-[150px]" title={row.assistidoNome}>
            {row.assistidoNome}
          </span>
        </div>
      </td>

      {/* Processo */}
      <td className="px-2 py-1.5">
        <span className="text-zinc-600 dark:text-zinc-400 font-mono text-[10px] truncate max-w-[130px] block" title={row.numeroProcesso}>
          {row.numeroProcesso || "—"}
        </span>
      </td>

      {/* Ato (dropdown) */}
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${confidenceClass}`} title={`Confiança: ${row.atoConfidence}`} />
          <InlineDropdown
            value={row.ato}
            compact
            showEditIcon
            displayValue={
              <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate max-w-[120px] block">
                {row.ato || "Selecionar"}
              </span>
            }
            options={atoOptions}
            onChange={(v) => onAtoChange(index, v)}
          />
        </div>
      </td>

      {/* Prazo */}
      <td className="px-2 py-1.5">
        <InlineDatePicker
          value={row.prazo}
          onChange={(isoDate) => onPrazoChange(index, isoDate)}
          showEditIcon
          placeholder="—"
        />
      </td>

      {/* Status (dropdown) */}
      <td className="px-2 py-1.5">
        <InlineDropdown
          value={row.status}
          compact
          showEditIcon
          displayValue={
            <div
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
              style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: statusColor }}
              />
              <span className="truncate max-w-[70px]">
                {statusConfig?.label || row.status}
              </span>
            </div>
          }
          options={statusOptions}
          onChange={(v) => onStatusChange(index, v)}
        />
      </td>

      {/* Estado Prisional */}
      <td className="px-2 py-1.5">
        <InlineDropdown
          value={row.estadoPrisional}
          compact
          showEditIcon
          displayValue={
            <span className={`text-[10px] font-medium ${
              row.estadoPrisional === "preso"
                ? "text-red-600 dark:text-red-400"
                : row.estadoPrisional === "monitorado"
                ? "text-amber-600 dark:text-amber-400"
                : "text-zinc-500 dark:text-zinc-400"
            }`}>
              {row.estadoPrisional === "preso"
                ? "Preso"
                : row.estadoPrisional === "monitorado"
                ? "Monitor."
                : "Solto"}
            </span>
          }
          options={estadoPrisionalOptions}
          onChange={(v) => onEstadoPrisionalChange(index, v)}
        />
      </td>
    </tr>
  );
}
