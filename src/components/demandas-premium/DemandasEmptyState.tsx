"use client";

import { ListTodo, Search, Plus, Archive } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

interface DemandasEmptyStateProps {
  /** Há filtros ativos? Muda a mensagem e oferece "Limpar filtros". */
  hasActiveFilters?: boolean;
  /** Visão de arquivadas (vazia). */
  showArchived?: boolean;
  onClearFilters?: () => void;
  onCreate?: () => void;
}

/**
 * Estado vazio da lista de demandas (Fase 7.2) — ciente de contexto:
 * filtros ativos → oferece limpar; arquivadas → mensagem própria;
 * caso geral → convida a criar. Padroniza sobre o EmptyState compartilhado.
 */
export function DemandasEmptyState({
  hasActiveFilters,
  showArchived,
  onClearFilters,
  onCreate,
}: DemandasEmptyStateProps) {
  if (hasActiveFilters) {
    return (
      <EmptyState
        variant="search"
        icon={Search}
        title="Nenhuma demanda para estes filtros"
        description="Ajuste os critérios ou limpe os filtros para ver mais resultados."
        action={onClearFilters ? { label: "Limpar filtros", onClick: onClearFilters } : undefined}
      />
    );
  }

  if (showArchived) {
    return (
      <EmptyState
        icon={Archive}
        title="Nenhuma demanda arquivada"
        description="As demandas que você arquivar aparecem aqui."
      />
    );
  }

  return (
    <EmptyState
      icon={ListTodo}
      title="Nenhuma demanda ainda"
      description="Crie a primeira demanda ou importe as intimações do PJe."
      action={onCreate ? { label: "Nova demanda", onClick: onCreate, icon: Plus } : undefined}
    />
  );
}
