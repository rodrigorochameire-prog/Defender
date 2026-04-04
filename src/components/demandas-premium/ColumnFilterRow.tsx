"use client";

import React from "react";

interface ColumnDef {
  id: string;
  header: string;
  editable: boolean;
  colIndex: number;
  width?: string;
  align?: string;
}

interface ColumnFilterRowProps {
  columns: ColumnDef[];
  filters: Record<string, string>;
  onFilterChange: (columnId: string, value: string) => void;
  hasReorder: boolean;
  hasSelectMode: boolean;
  columnWidths?: Record<string, number>;
}

export function ColumnFilterRow({
  columns, filters, onFilterChange, hasReorder, hasSelectMode, columnWidths
}: ColumnFilterRowProps) {
  // Don't render if no filters are active and user hasn't interacted
  return (
    <tr className="bg-neutral-50/80 dark:bg-neutral-800/40 border-b border-neutral-200/60 dark:border-neutral-700/60">
      {hasReorder && <td className="w-6" />}
      {hasSelectMode && <td className="w-8" />}
      {columns.map(col => {
        if (col.id === "index" || col.id === "acoes") {
          return <td key={col.id} style={columnWidths?.[col.id] ? { width: columnWidths[col.id] } : undefined} />;
        }
        return (
          <td key={col.id} className="px-1 py-0.5" style={columnWidths?.[col.id] ? { width: columnWidths[col.id] } : undefined}>
            <input
              type="text"
              value={filters[col.id] || ""}
              onChange={(e) => onFilterChange(col.id, e.target.value)}
              placeholder={col.header}
              className="w-full text-[10px] px-1.5 py-0.5 rounded border border-neutral-200/80 dark:border-neutral-700/60 bg-white/80 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 placeholder-neutral-300 dark:placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-colors"
            />
          </td>
        );
      })}
    </tr>
  );
}
