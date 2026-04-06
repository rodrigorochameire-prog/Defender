"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Check, AlertTriangle, Filter, Wand2, Eye, EyeOff, FileText } from "lucide-react";
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
        {/* Barra de resumo */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground px-1">
          <span className="font-medium text-foreground/80">
            {includedCount}/{rows.length} para importar
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
          {lowConfCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              {lowConfCount} a conferir
            </span>
          )}
        </div>

        {/* Barra de filtros + ações em massa */}
        <div className="flex flex-wrap items-center gap-2 px-1">
          {/* Filtros rápidos */}
          <div className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium mr-0.5">Filtros:</span>
            {/* Confiança */}
            <button
              onClick={() => setConfidenceFilter(confidenceFilter === "low" ? "all" : "low")}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                confidenceFilter === "low"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Baixa confiança
            </button>
            {/* Match novos */}
            <button
              onClick={() => setMatchFilter(matchFilter === "new" ? "all" : "new")}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                matchFilter === "new"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Novos
            </button>
            {/* Toggle excluídos */}
            <button
              onClick={() => setShowExcluded(!showExcluded)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors flex items-center gap-0.5 ${
                !showExcluded
                  ? "bg-secondary text-foreground/80"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {showExcluded ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
              Excluídos
            </button>
            {/* Reset */}
            {(confidenceFilter !== "all" || matchFilter !== "all" || !showExcluded) && (
              <button
                onClick={() => { setConfidenceFilter("all"); setMatchFilter("all"); setShowExcluded(true); }}
                className="px-1.5 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground"
              >
                Limpar
              </button>
            )}
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Ações em massa */}
          <div className="flex items-center gap-1">
            <Wand2 className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium mr-0.5">Lote:</span>
            {/* Bulk Ato — via InlineDropdown */}
            <InlineDropdown
              value={bulkAto}
              compact
              displayValue={
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 font-medium">
                  Ato p/ todos
                </span>
              }
              options={atoOptions}
              onChange={handleBulkAto}
            />
            {/* Bulk Status */}
            <InlineDropdown
              value={bulkStatus}
              compact
              displayValue={
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 font-medium">
                  Status p/ todos
                </span>
              }
              options={statusOptions}
              onChange={handleBulkStatus}
            />
            {/* Quick: excluir ciências */}
            {cienciaCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleExcludeCiencias}
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
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
        </div>

        {/* Tabela */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="w-8 px-2 py-2 text-center">
                    <button
                      onClick={handleToggleAll}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title={rows.every((r) => !r.excluded) ? "Desmarcar todos" : "Marcar todos"}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </th>
                  <th className="w-8 px-1 py-2 text-center text-muted-foreground font-medium">
                    #
                  </th>
                  <th className="px-2 py-2 text-left text-muted-foreground font-medium min-w-[160px]">
                    Assistido
                  </th>
                  <th className="px-2 py-2 text-left text-muted-foreground font-medium min-w-[140px]">
                    Processo
                  </th>
                  {showTipoProcesso && (
                    <th className="px-2 py-2 text-left text-muted-foreground font-medium min-w-[60px]">
                      Tipo
                    </th>
                  )}
                  <th className="px-2 py-2 text-left text-muted-foreground font-medium min-w-[75px]">
                    Expedição
                  </th>
                  <th className="px-2 py-2 text-left text-muted-foreground font-medium min-w-[150px]">
                    Ato
                  </th>
                  <th className="px-2 py-2 text-left text-muted-foreground font-medium min-w-[90px]">
                    Prazo
                  </th>
                  <th className="px-2 py-2 text-left text-muted-foreground font-medium min-w-[100px]">
                    Status
                  </th>
                  <th className="px-2 py-2 text-left text-muted-foreground font-medium min-w-[80px]">
                    Preso
                  </th>
                  <th className="w-8 px-2 py-2 text-center text-muted-foreground font-medium">
                    <FileText className="h-3 w-3 inline" />
                  </th>
                </tr>
              </thead>
              <tbody>
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
              </tbody>
            </table>
          </div>
          {filteredRows.length === 0 && (
            <div className="py-6 text-center text-xs text-muted-foreground">
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

  // Sync draft when row.providencias changes externally (e.g., bulk actions)
  // Only when panel is closed, so we don't clobber an in-flight edit
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

  // Info extra (crime + tipoDocumento) para tooltip do processo
  const extraInfo = [row.tipoDocumento, row.crime].filter(Boolean).join(" · ");

  return (
    <>
    <tr
      className={`border-b border-border transition-colors ${
        row.excluded
          ? "opacity-40 bg-muted/50"
          : row.atoConfidence === "low"
          ? "bg-amber-50/40 dark:bg-amber-950/10"
          : "hover:bg-muted/50"
      }`}
    >
      {/* Checkbox */}
      <td className="px-2 py-1.5 text-center">
        <button
          onClick={() => onToggleExclude(index)}
          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
            row.excluded
              ? "border-border"
              : "border-emerald-500 bg-emerald-500 text-white"
          }`}
        >
          {!row.excluded && <Check className="h-3 w-3" />}
        </button>
      </td>

      {/* Ordem */}
      <td className="px-1 py-1.5 text-center text-muted-foreground font-mono text-[10px]">
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
                  <span className="text-amber-600 dark:text-amber-400">Verificar se é a mesma pessoa</span>
                </span>
              )}
              {row.assistidoMatch.type === "new" && (
                <span>Assistido novo — será cadastrado na importação</span>
              )}
            </TooltipContent>
          </Tooltip>
          <span className="text-foreground truncate max-w-[150px]" title={row.assistidoNome}>
            {row.assistidoNome}
          </span>
        </div>
      </td>

      {/* Processo + crime/tipoDoc como subtexto */}
      <td className="px-2 py-1.5">
        <div className="flex flex-col gap-0">
          <span className="text-muted-foreground font-mono text-[10px] truncate max-w-[130px] block" title={row.numeroProcesso}>
            {row.numeroProcesso || "—"}
          </span>
          {extraInfo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[9px] text-muted-foreground truncate max-w-[130px] block cursor-help flex items-center gap-0.5">
                  <FileText className="w-2.5 h-2.5 inline flex-shrink-0" />
                  {extraInfo}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-[300px]">
                {row.tipoDocumento && <div><strong>Tipo:</strong> {row.tipoDocumento}</div>}
                {row.crime && <div><strong>Crime:</strong> {row.crime}</div>}
                {row.dataExpedicao && <div><strong>Expedição:</strong> {row.dataExpedicao}</div>}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </td>

      {/* Tipo Processo (VVD) */}
      {showTipoProcesso && (
        <td className="px-2 py-1.5">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
              row.tipoProcesso === "MPUMPCrim"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {row.tipoProcesso === "MPUMPCrim" ? "MPU" : "Geral"}
          </span>
        </td>
      )}

      {/* Data Expedição */}
      <td className="px-2 py-1.5">
        <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
          {row.dataExpedicao ? row.dataExpedicao.split(" ")[0] : "—"}
        </span>
      </td>

      {/* Ato (dropdown) */}
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1">
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
      </td>

      {/* Providências — botão de toggle */}
      <td className="px-2 py-1.5 text-center">
        <button
          ref={toggleButtonRef}
          onClick={() => setExpandedProv((v) => !v)}
          aria-expanded={expandedProv}
          title={row.providencias?.trim() ? "Ver/editar providências" : "Adicionar providências"}
          className={`transition-colors rounded p-0.5 ${
            row.providencias?.trim()
              ? "text-emerald-700 dark:text-emerald-400 hover:text-emerald-700"
              : "text-muted-foreground/50 hover:text-muted-foreground"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>

    {expandedProv && (
      <tr className={row.excluded ? "opacity-40" : ""}>
        <td
          colSpan={showTipoProcesso ? 11 : 10}
          className="px-3 pb-2 pt-0 bg-muted/50"
        >
          <div className="flex items-start gap-2">
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
                  // Return focus to toggle button
                  setTimeout(() => toggleButtonRef.current?.focus(), 0);
                }
              }}
              placeholder="Providências para esta demanda..."
              className="flex-1 text-xs bg-background border border-emerald-300 dark:border-emerald-700 rounded px-2 py-1 outline-none resize-none w-full"
            />
          </div>
        </td>
      </tr>
    )}

    {isAudienciaAto(row.ato) && (
      <tr className="border-b border-emerald-100">
        <td colSpan={99} className="px-4 py-2">
          <AudienciaInlineForm
            data={row.audienciaData || ""}
            hora={row.audienciaHora || ""}
            tipo={row.audienciaTipo || ""}
            criarEvento={row.criarEventoAgenda ?? true}
            onChange={(fields) => onAudienciaChange(index, fields)}
          />
        </td>
      </tr>
    )}
    </>
  );
}
