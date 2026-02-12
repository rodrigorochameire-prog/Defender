"use client";

/**
 * Painel de Revisão de Sugestões da Extração Inteligente
 *
 * Exibe as sugestões extraídas organizadas por entidade (Assistido, Processo, Caso)
 * com checkboxes para o usuário selecionar quais campos aceitar.
 */

import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  User,
  FileText,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Tipos de sugestões que podem vir do backend
export interface SuggestionField {
  key: string;
  label: string;
  value: unknown;
  confidence?: number;
  source?: string; // Nome do arquivo de onde veio
}

export interface EntitySuggestions {
  assistido?: Record<string, unknown>;
  processo?: Record<string, unknown>;
  caso?: Record<string, unknown>;
}

export interface SuggestionsReviewPanelProps {
  suggestions: EntitySuggestions;
  confidence?: number;
  selectedFields: {
    assistido: Set<string>;
    processo: Set<string>;
    caso: Set<string>;
  };
  onToggleField: (
    entityType: "assistido" | "processo" | "caso",
    fieldKey: string
  ) => void;
  onToggleAll: (
    entityType: "assistido" | "processo" | "caso",
    selected: boolean
  ) => void;
}

// Mapeamento de chaves para labels legíveis
const FIELD_LABELS: Record<string, Record<string, string>> = {
  assistido: {
    nome_completo: "Nome Completo",
    cpf: "CPF",
    rg: "RG",
    data_nascimento: "Data de Nascimento",
    filiacao_mae: "Nome da Mãe",
    filiacao_pai: "Nome do Pai",
    endereco: "Endereço",
    telefone: "Telefone",
    naturalidade: "Naturalidade",
    status_prisional: "Status Prisional",
    local_prisao: "Local de Prisão",
    data_prisao: "Data da Prisão",
  },
  processo: {
    numero: "Número do Processo",
    vara: "Vara",
    comarca: "Comarca",
    juiz: "Juiz",
    promotor: "Promotor",
    fase_processual: "Fase Processual",
    crimes: "Crimes/Tipificação",
    partes: "Partes",
    data_distribuicao: "Data de Distribuição",
  },
  caso: {
    titulo: "Título",
    codigo: "Código",
    crimes: "Crimes",
    data_fato: "Data do Fato",
    local_fato: "Local do Fato",
    narrativa_acusacao: "Narrativa da Acusação",
    narrativa_defesa: "Narrativa da Defesa",
    tese_principal: "Tese Principal",
    teses_subsidiarias: "Teses Subsidiárias",
    testemunhas: "Testemunhas",
    pontos_fortes: "Pontos Fortes",
    pontos_fracos: "Pontos Fracos",
    status: "Status",
    fase: "Fase",
  },
};

// Ícone por tipo de entidade
function getEntityIcon(entityType: string) {
  switch (entityType) {
    case "assistido":
      return <User className="h-5 w-5 text-blue-500" />;
    case "processo":
      return <FileText className="h-5 w-5 text-amber-500" />;
    case "caso":
      return <Briefcase className="h-5 w-5 text-purple-500" />;
    default:
      return <Info className="h-5 w-5 text-zinc-400" />;
  }
}

// Formatar valor para exibição
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Badge de confiança
function ConfidenceBadge({ confidence }: { confidence?: number }) {
  if (!confidence) return null;

  const level =
    confidence >= 0.8 ? "high" : confidence >= 0.5 ? "medium" : "low";
  const colors = {
    high: "bg-emerald-100 text-emerald-700 border-emerald-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <Badge variant="outline" className={cn("text-xs", colors[level])}>
      {Math.round(confidence * 100)}%
    </Badge>
  );
}

// Componente de campo individual
function FieldRow({
  fieldKey,
  value,
  label,
  isSelected,
  onToggle,
}: {
  fieldKey: string;
  value: unknown;
  label: string;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const formattedValue = formatValue(value);
  const isLongValue = formattedValue.length > 100;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border p-3 transition-colors",
        isSelected
          ? "border-emerald-200 bg-emerald-50"
          : "border-zinc-200 bg-white hover:bg-zinc-50"
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-700">{label}</p>
        <p
          className={cn(
            "text-sm text-zinc-600",
            isLongValue ? "line-clamp-3" : ""
          )}
          title={isLongValue ? formattedValue : undefined}
        >
          {formattedValue}
        </p>
      </div>
    </div>
  );
}

// Seção de entidade
function EntitySection({
  entityType,
  suggestions,
  selectedFields,
  onToggleField,
  onToggleAll,
}: {
  entityType: "assistido" | "processo" | "caso";
  suggestions: Record<string, unknown>;
  selectedFields: Set<string>;
  onToggleField: (key: string) => void;
  onToggleAll: (selected: boolean) => void;
}) {
  const fields = Object.entries(suggestions).filter(
    ([, value]) => value !== null && value !== undefined && value !== ""
  );

  if (fields.length === 0) return null;

  const allSelected = fields.every(([key]) => selectedFields.has(key));
  const someSelected = fields.some(([key]) => selectedFields.has(key));

  const entityNames = {
    assistido: "Assistido",
    processo: "Processo",
    caso: "Caso",
  };

  return (
    <AccordionItem value={entityType} className="border rounded-lg">
      <AccordionTrigger className="px-4 hover:no-underline">
        <div className="flex items-center gap-3">
          {getEntityIcon(entityType)}
          <span className="font-medium">{entityNames[entityType]}</span>
          <Badge variant="secondary" className="ml-2">
            {selectedFields.size}/{fields.length} campos
          </Badge>
          {allSelected && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-2" />
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        {/* Toggle All */}
        <div
          className="flex items-center gap-2 mb-4 cursor-pointer"
          onClick={() => onToggleAll(!allSelected)}
        >
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected && !allSelected}
            onCheckedChange={(checked) => onToggleAll(checked as boolean)}
          />
          <span className="text-sm text-zinc-600">
            {allSelected ? "Desmarcar todos" : "Selecionar todos"}
          </span>
        </div>

        {/* Lista de campos */}
        <div className="space-y-2">
          {fields.map(([key, value]) => (
            <FieldRow
              key={key}
              fieldKey={key}
              value={value}
              label={FIELD_LABELS[entityType]?.[key] || key}
              isSelected={selectedFields.has(key)}
              onToggle={() => onToggleField(key)}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function SuggestionsReviewPanel({
  suggestions,
  confidence,
  selectedFields,
  onToggleField,
  onToggleAll,
}: SuggestionsReviewPanelProps) {
  // Verificar se há sugestões
  const hasAssistido =
    suggestions.assistido && Object.keys(suggestions.assistido).length > 0;
  const hasProcesso =
    suggestions.processo && Object.keys(suggestions.processo).length > 0;
  const hasCaso = suggestions.caso && Object.keys(suggestions.caso).length > 0;

  const hasSuggestions = hasAssistido || hasProcesso || hasCaso;

  // Contar total de campos selecionados
  const totalSelected =
    selectedFields.assistido.size +
    selectedFields.processo.size +
    selectedFields.caso.size;

  const totalFields =
    (hasAssistido ? Object.keys(suggestions.assistido!).length : 0) +
    (hasProcesso ? Object.keys(suggestions.processo!).length : 0) +
    (hasCaso ? Object.keys(suggestions.caso!).length : 0);

  if (!hasSuggestions) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-amber-400 mb-4" />
        <p className="text-lg font-medium text-zinc-700">
          Nenhuma sugestão encontrada
        </p>
        <p className="text-sm text-zinc-500 mt-1">
          Não foi possível extrair dados dos arquivos selecionados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com resumo */}
      <div className="flex items-center justify-between bg-zinc-50 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <span className="text-sm font-medium">
            {totalSelected} de {totalFields} campos selecionados
          </span>
        </div>
        {confidence && <ConfidenceBadge confidence={confidence} />}
      </div>

      {/* Accordion com entidades */}
      <ScrollArea className="h-[400px]">
        <Accordion
          type="multiple"
          defaultValue={["assistido", "processo", "caso"]}
          className="space-y-2"
        >
          {hasAssistido && (
            <EntitySection
              entityType="assistido"
              suggestions={suggestions.assistido!}
              selectedFields={selectedFields.assistido}
              onToggleField={(key) => onToggleField("assistido", key)}
              onToggleAll={(selected) => onToggleAll("assistido", selected)}
            />
          )}

          {hasProcesso && (
            <EntitySection
              entityType="processo"
              suggestions={suggestions.processo!}
              selectedFields={selectedFields.processo}
              onToggleField={(key) => onToggleField("processo", key)}
              onToggleAll={(selected) => onToggleAll("processo", selected)}
            />
          )}

          {hasCaso && (
            <EntitySection
              entityType="caso"
              suggestions={suggestions.caso!}
              selectedFields={selectedFields.caso}
              onToggleField={(key) => onToggleField("caso", key)}
              onToggleAll={(selected) => onToggleAll("caso", selected)}
            />
          )}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
