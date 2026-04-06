"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Check, AlertTriangle, Filter, Eye, EyeOff, FileText, AlertCircle, UserPlus, SquarePen, BarChart3 } from "lucide-react";
import { InlineDropdown } from "@/components/shared/inline-dropdown";
import { InlineDatePicker } from "@/components/shared/inline-date-picker";
import { getAtosPorAtribuicao, getTodosAtosUnicos } from "@/config/atos-por-atribuicao";
import { DEMANDA_STATUS, STATUS_GROUPS } from "@/config/demanda-status";
import { calcularPrazoPorAto, converterISOParaBR } from "@/lib/prazo-calculator";
import { AudienciaInlineForm } from "./audiencia-inline-form";
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
  providencias?: string;

  // Audiência fields (when ato = ciência designação/redesignação)
  audienciaData?: string;      // YYYY-MM-DD
  audienciaHora?: string;      // HH:MM
  audienciaTipo?: string;      // tipo da audiência
  criarEventoAgenda?: boolean; // default true

  // Match
  assistidoMatch: AssistidoMatch;
}

interface PjeReviewTableProps {
  rows: PjeReviewRow[];
  onRowsChange: (rows: PjeReviewRow[]) => void;
  atribuicao: string;
  showTipoProcesso?: boolean; // Mostra badge MPU/Geral para VVD
}

// ============================================================================
// HELPERS
// ============================================================================

const AUDIENCIA_ATOS = [
  "Ciência designação de audiência",
  "Ciência redesignação de audiência",
] as const;

function isAudienciaAto(ato: string): boolean {
  return AUDIENCIA_ATOS.some(a => a === ato);
}

function getConfidenceDot(confidence: "high" | "medium" | "low") {
  switch (confidence) {
    case "high":
      return "bg-emerald-500";
    case "medium":
      return "bg-amber-500";
    case "low":
      return "bg-muted-foreground";
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

    const resultado = calcularPrazoPorAto(date, ato);
    if (!resultado) return "";

    return resultado;
  } catch {
    return "";
  }
}

// Tipos de filtro
type ConfidenceFilter = "all" | "low" | "medium" | "high";
type MatchFilter = "all" | "exact" | "similar" | "new";

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function PjeReviewTable({
  rows,
  onRowsChange,
  atribuicao,
  showTipoProcesso = false,
}: PjeReviewTableProps) {
  // Filtros
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>("all");
  const [matchFilter, setMatchFilter] = useState<MatchFilter>("all");
  const [showExcluded, setShowExcluded] = useState(true);
  const [bulkAto, setBulkAto] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");

  // Opções de ato baseadas na atribuição
  // Se a atribuição não tem atos configurados, fallback para todos os atos únicos
  const atoOptions = useMemo(() => {
    let atos: Array<{ value: string; label: string }>;
    if (atribuicao) {
      const atosAtrib = getAtosPorAtribuicao(atribuicao).filter((a) => a.value !== "Todos");
      // Fallback: se a atribuição não tem atos configurados, usa todos
      atos = atosAtrib.length > 0 ? atosAtrib : getTodosAtosUnicos().filter((a) => a.value !== "Todos");
    } else {
      atos = getTodosAtosUnicos().filter((a) => a.value !== "Todos");
    }
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

  // Filtrar rows para exibição
  const filteredRows = useMemo(() => {
    return rows.map((row, originalIndex) => ({ row, originalIndex })).filter(({ row }) => {
      if (!showExcluded && row.excluded) return false;
      if (confidenceFilter !== "all" && row.atoConfidence !== confidenceFilter) return false;
      if (matchFilter !== "all" && row.assistidoMatch.type !== matchFilter) return false;
      return true;
    });
  }, [rows, confidenceFilter, matchFilter, showExcluded]);

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

    // Quando o ato é de audiência e criarEventoAgenda ainda não foi definido, default true
    if (isAudienciaAto(novoAto) && row.criarEventoAgenda === undefined) {
      updates.criarEventoAgenda = true;
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

  const handleProvidenciasChange = (index: number, value: string) => {
    updateRow(index, { providencias: value });
  };

  const handleAudienciaChange = (
    index: number,
    fields: { data?: string; hora?: string; tipo?: string; criarEvento?: boolean }
  ) => {
    const updates: Partial<PjeReviewRow> = {};
    if (fields.data !== undefined) updates.audienciaData = fields.data;
    if (fields.hora !== undefined) updates.audienciaHora = fields.hora;
    if (fields.tipo !== undefined) updates.audienciaTipo = fields.tipo;
    if (fields.criarEvento !== undefined) updates.criarEventoAgenda = fields.criarEvento;
    updateRow(index, updates);
  };

  const handleToggleAll = () => {
    const allIncluded = rows.every((r) => !r.excluded);
    onRowsChange(rows.map((r) => ({ ...r, excluded: allIncluded })));
  };

  // Bulk actions — aplicar a todas as rows incluídas (não excluídas)
  const handleBulkAto = (ato: string) => {
    setBulkAto(ato);
    const newRows = rows.map((row) => {
      if (row.excluded) return row;
      const updates: Partial<PjeReviewRow> = { ato };
      if (!row.prazoManual) {
        updates.prazo = calcularPrazoParaAto(row.dataExpedicao, ato);
      }
      return { ...row, ...updates };
    });
    onRowsChange(newRows);
  };

  const handleBulkStatus = (status: string) => {
    setBulkStatus(status);
    const newRows = rows.map((row) => {
      if (row.excluded) return row;
      return { ...row, status };
    });
    onRowsChange(newRows);
  };

  // Marcar todas "Ciência" como excluídas (ação rápida)
  const handleExcludeCiencias = () => {
    const newRows = rows.map((row) => {
      if (row.ato.startsWith("Ciência")) {
        return { ...row, excluded: true };
      }
      return row;
    });
    onRowsChange(newRows);
  };

  // Resumo
  const includedCount = rows.filter((r) => !r.excluded).length;
  const matchExact = rows.filter((r) => r.assistidoMatch.type === "exact").length;
  const matchSimilar = rows.filter((r) => r.assistidoMatch.type === "similar").length;
  const matchNew = rows.filter((r) => r.assistidoMatch.type === "new").length;
  const lowConfCount = rows.filter((r) => r.atoConfidence === "low" && !r.excluded).length;
  const cienciaCount = rows.filter((r) => r.ato.startsWith("Ciência") && !r.excluded).length;

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Stats line + alerta sutil */}
        <div className="flex flex-wrap items-center gap-3 px-1">
          <span className="text-xs font-semibold text-foreground">
            {includedCount}/{rows.length} para importar
          </span>
          <span className="h-3.5 w-px bg-border" />
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {matchExact} encontrados
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {matchSimilar} similares
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {matchNew} novos
          </span>
          <span className="flex-1" />
          {lowConfCount > 0 && (
            <button
              onClick={() => setConfidenceFilter(confidenceFilter === "low" ? "all" : "low")}
              className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 font-medium hover:text-amber-800 dark:hover:text-amber-300 transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {lowConfCount} a conferir
            </button>
          )}
        </div>

        {/* Barra de filtros + ações bulk */}
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/80 rounded-lg">
          <Filter className="w-3 h-3 text-muted-foreground mr-0.5" />
          {/* Filtro: Baixa confiança */}
          <button
            onClick={() => setConfidenceFilter(confidenceFilter === "low" ? "all" : "low")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
              confidenceFilter === "low"
                ? "bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400"
                : "bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600"
            }`}
          >
            <AlertCircle className="w-2.5 h-2.5" />
            Baixa confiança
          </button>
          {/* Filtro: Novos */}
          <button
            onClick={() => setMatchFilter(matchFilter === "new" ? "all" : "new")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
              matchFilter === "new"
                ? "bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400"
                : "bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600"
            }`}
          >
            <UserPlus className="w-2.5 h-2.5" />
            Novos
          </button>
          {/* Filtro: Excluídos */}
          <button
            onClick={() => setShowExcluded(!showExcluded)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
              !showExcluded
                ? "bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-foreground/80"
                : "bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600"
            }`}
          >
            {showExcluded ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
            Excluídos
          </button>
          {/* Reset */}
          {(confidenceFilter !== "all" || matchFilter !== "all" || !showExcluded) && (
            <button
              onClick={() => { setConfidenceFilter("all"); setMatchFilter("all"); setShowExcluded(true); }}
              className="px-2 py-1 rounded-md text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpar
            </button>
          )}

          <span className="h-3.5 w-px bg-neutral-300 dark:bg-neutral-600 mx-0.5" />

          {/* Bulk: Ato p/ todos */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <InlineDropdown
                  value={bulkAto}
                  compact
                  displayValue={
                    <span className="flex items-center justify-center w-7 h-7 rounded-md bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors cursor-pointer">
                      <SquarePen className="w-3.5 h-3.5" />
                    </span>
                  }
                  options={atoOptions}
                  onChange={handleBulkAto}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Ato p/ todos</TooltipContent>
          </Tooltip>
          {/* Bulk: Status p/ todos */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <InlineDropdown
                  value={bulkStatus}
                  compact
                  displayValue={
                    <span className="flex items-center justify-center w-7 h-7 rounded-md bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors cursor-pointer">
                      <BarChart3 className="w-3.5 h-3.5" />
                    </span>
                  }
                  options={statusOptions}
                  onChange={handleBulkStatus}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Status p/ todos</TooltipContent>
          </Tooltip>
          {/* Quick: excluir ciências */}
          {cienciaCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleExcludeCiencias}
                  className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:border-red-700 dark:hover:text-red-400 transition-colors"
                >
                  Excluir {cienciaCount} ciências
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Desmarca todas as intimações de ciência (normalmente não geram trabalho)
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Card rows */}
        <div className="flex flex-col gap-1.5">
          {/* Header - select all */}
          <div className="flex items-center gap-3 px-4 py-1.5">
            <button
              onClick={handleToggleAll}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title={rows.every((r) => !r.excluded) ? "Desmarcar todos" : "Marcar todos"}
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
              {filteredRows.length} intimações
            </span>
          </div>

          {filteredRows.map(({ row, originalIndex }) => (
            <PjeReviewRowComponent
              key={row.ordemOriginal}
              row={row}
              index={originalIndex}
              atoOptions={atoOptions}
              statusOptions={statusOptions}
              estadoPrisionalOptions={estadoPrisionalOptions}
              onAtoChange={handleAtoChange}
              onPrazoChange={handlePrazoChange}
              onStatusChange={(i, v) => updateRow(i, { status: v })}
              onEstadoPrisionalChange={(i, v) => updateRow(i, { estadoPrisional: v })}
              onToggleExclude={handleToggleExclude}
              onProvidenciasChange={handleProvidenciasChange}
              onAudienciaChange={handleAudienciaChange}
              showTipoProcesso={showTipoProcesso}
            />
          ))}

          {filteredRows.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Nenhuma intimação corresponde aos filtros selecionados
            </div>
          )}
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
  onProvidenciasChange: (index: number, value: string) => void;
  onAudienciaChange: (index: number, fields: { data?: string; hora?: string; tipo?: string; criarEvento?: boolean }) => void;
  showTipoProcesso?: boolean;
}

function PjeReviewRowComponent({
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
  onProvidenciasChange,
  onAudienciaChange,
  showTipoProcesso = false,
}: PjeReviewRowProps) {
  const [expandedProv, setExpandedProv] = useState(false);
  const [provDraft, setProvDraft] = useState(row.providencias ?? "");
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!expandedProv) {
      setProvDraft(row.providencias ?? "");
    }
  }, [row.providencias, expandedProv]);

  const matchInfo = getMatchDot(row.assistidoMatch);
  const confidenceClass = getConfidenceDot(row.atoConfidence);

  const statusConfig = DEMANDA_STATUS[row.status as keyof typeof DEMANDA_STATUS];
  const statusGroup = statusConfig?.group || "triagem";
  const statusColor = STATUS_GROUPS[statusGroup]?.color || "#A1A1AA";

  const extraInfo = [row.tipoDocumento, row.crime].filter(Boolean).join(" · ");

  // Match label
  const matchLabel = row.assistidoMatch.type === "new" ? "novo" : row.assistidoMatch.type === "similar" ? "similar" : "";
  const matchLabelColor = row.assistidoMatch.type === "new" ? "text-red-500 dark:text-red-400" : "text-amber-600 dark:text-amber-400";

  // Border color by match
  const borderColor =
    row.assistidoMatch.type === "exact" ? "border-l-emerald-500" :
    row.assistidoMatch.type === "similar" ? "border-l-amber-500" :
    "border-l-red-500";

  // Card background
  const cardBg = row.excluded
    ? "opacity-40"
    : row.assistidoMatch.type === "similar"
    ? "bg-amber-50/30 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-800/40"
    : "bg-white dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800/80";

  return (
    <div className="flex flex-col">
      {/* Card row */}
      <div
        className={`flex items-center gap-3 px-4 py-3 border border-l-2 rounded-lg transition-all duration-150 hover:shadow-sm hover:border-neutral-300 dark:hover:border-neutral-600 ${borderColor} ${cardBg}`}
      >
        {/* Checkbox */}
        <button
          onClick={() => onToggleExclude(index)}
          className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-colors ${
            row.excluded
              ? "border-neutral-300 dark:border-neutral-600"
              : "border-emerald-500 bg-emerald-500 text-white"
          }`}
        >
          {!row.excluded && <Check className="h-3 w-3" />}
        </button>

        {/* Assistido + Processo (two lines) */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-serif font-semibold text-[13px] text-neutral-900 dark:text-neutral-100 truncate" title={row.assistidoNome}>
                  {row.assistidoNome}
                </span>
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
                    <span className="text-amber-600 dark:text-amber-400">Verificar se é a mesma pessoa</span>
                  </span>
                )}
                {row.assistidoMatch.type === "new" && (
                  <span>Assistido novo — será cadastrado na importação</span>
                )}
              </TooltipContent>
            </Tooltip>
            {matchLabel && (
              <span className={`text-[9px] font-medium ${matchLabelColor}`}>{matchLabel}</span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="font-mono text-[10px] text-neutral-400 dark:text-neutral-500 truncate" title={row.numeroProcesso}>
              {row.numeroProcesso || "—"}
            </span>
            {extraInfo && (
              <>
                <span className="text-neutral-300 dark:text-neutral-600">·</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate cursor-help">
                      {extraInfo}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs max-w-[300px]">
                    {row.tipoDocumento && <div><strong>Tipo:</strong> {row.tipoDocumento}</div>}
                    {row.crime && <div><strong>Crime:</strong> {row.crime}</div>}
                    {row.dataExpedicao && <div><strong>Expedição:</strong> {row.dataExpedicao}</div>}
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>

        {/* Tipo Processo badge */}
        {showTipoProcesso && (
          <span
            className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
              row.tipoProcesso === "MPUMPCrim"
                ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
            }`}
          >
            {row.tipoProcesso === "MPUMPCrim" ? "MPU" : "Geral"}
          </span>
        )}

        {/* Data Expedição */}
        <span className="flex-shrink-0 text-[11px] text-neutral-400 dark:text-neutral-500 font-mono whitespace-nowrap">
          {row.dataExpedicao ? row.dataExpedicao.split(" ")[0] : "—"}
        </span>

        {/* Ato (dropdown) */}
        <div className="flex-shrink-0 flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${confidenceClass}`} />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Confiança: {row.atoConfidence === "high" ? "Alta" : row.atoConfidence === "medium" ? "Média" : "Baixa"}
              {row.atoConfidence === "low" && <><br /><span className="text-amber-600 dark:text-amber-400">Confira manualmente</span></>}
            </TooltipContent>
          </Tooltip>
          <InlineDropdown
            value={row.ato}
            compact
            showEditIcon
            displayValue={
              <span className="text-[11px] text-foreground/80 truncate max-w-[120px] block">
                {row.ato || "Selecionar"}
              </span>
            }
            options={atoOptions}
            onChange={(v) => onAtoChange(index, v)}
          />
        </div>

        {/* Prazo */}
        <div className="flex-shrink-0">
          <InlineDatePicker
            value={row.prazo}
            onChange={(isoDate) => onPrazoChange(index, isoDate)}
            showEditIcon
            placeholder="—"
          />
        </div>

        {/* Status */}
        <div className="flex-shrink-0">
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
        </div>

        {/* Estado Prisional */}
        <div className="flex-shrink-0">
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
                  : "text-muted-foreground"
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
        </div>

        {/* Providências toggle */}
        <button
          ref={toggleButtonRef}
          onClick={() => setExpandedProv((v) => !v)}
          aria-expanded={expandedProv}
          title={row.providencias?.trim() ? "Ver/editar providências" : "Adicionar providências"}
          className={`flex-shrink-0 transition-colors rounded p-0.5 ${
            row.providencias?.trim()
              ? "text-emerald-700 dark:text-emerald-400 hover:text-emerald-800"
              : "text-neutral-300 dark:text-neutral-600 hover:text-neutral-500"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expandable: Providências */}
      {expandedProv && (
        <div className={`px-4 pb-3 pt-1 ${row.excluded ? "opacity-40" : ""}`}>
          <div className="flex items-start gap-2 ml-7">
            <FileText className="h-3 w-3 text-muted-foreground mt-1.5 flex-shrink-0" />
            <textarea
              autoFocus
              value={provDraft}
              rows={2}
              onChange={(e) => setProvDraft(e.target.value)}
              onBlur={() => {
                if (provDraft !== (row.providencias ?? "")) {
                  onProvidenciasChange(index, provDraft);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setExpandedProv(false);
                  setProvDraft(row.providencias ?? "");
                  setTimeout(() => toggleButtonRef.current?.focus(), 0);
                }
              }}
              placeholder="Providências para esta demanda..."
              className="flex-1 text-xs bg-background border-l-2 border-emerald-300 dark:border-emerald-700 border-y border-r border-neutral-200 dark:border-neutral-700 rounded-r px-2 py-1 outline-none resize-none w-full"
            />
          </div>
        </div>
      )}

      {/* Expandable: Audiência inline */}
      {isAudienciaAto(row.ato) && (
        <div className="px-4 py-2 ml-7">
          <AudienciaInlineForm
            data={row.audienciaData || ""}
            hora={row.audienciaHora || ""}
            tipo={row.audienciaTipo || ""}
            criarEvento={row.criarEventoAgenda ?? true}
            onChange={(fields) => onAudienciaChange(index, fields)}
          />
        </div>
      )}
    </div>
  );
}
