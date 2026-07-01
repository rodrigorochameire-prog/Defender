// src/components/ui/responsive-table.tsx
"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Omit this column from the mobile card body (e.g. redundant/id columns). */
  hideOnCard?: boolean;
};

export function ResponsiveTable<T>({
  columns,
  rows,
  getRowKey,
  renderCard,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  renderCard?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li
            key={getRowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              "rounded-xl border bg-card p-3",
              onRowClick && "active:bg-accent cursor-pointer",
            )}
          >
            {renderCard ? (
              renderCard(row)
            ) : (
              <dl className="flex flex-col gap-1.5">
                {columns
                  .filter((c) => !c.hideOnCard)
                  .map((c) => (
                    <div key={c.key} className="flex items-baseline justify-between gap-3">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {c.header}
                      </dt>
                      <dd className="text-right text-sm text-foreground">{c.cell(row)}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((c) => (
            <TableHead key={c.key}>{c.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={getRowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={onRowClick ? "cursor-pointer" : undefined}
          >
            {columns.map((c) => (
              <TableCell key={c.key}>{c.cell(row)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
