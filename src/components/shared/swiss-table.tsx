"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Container para tabela com scroll e sticky header
interface SwissTableContainerProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
  stickyHeader?: boolean;
}

export function SwissTableContainer({ 
  children, 
  className,
  maxHeight = "600px",
  stickyHeader = true,
}: SwissTableContainerProps) {
  return (
    <div 
      className={cn(
        "table-container custom-scrollbar",
        className
      )}
    >
      <div 
        className={cn(
          "overflow-auto custom-scrollbar",
          stickyHeader && "[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10"
        )}
        style={{ maxHeight }}
      >
        {children}
      </div>
    </div>
  );
}

export function SwissTable({
  className,
  ...props
}: React.ComponentProps<typeof Table>) {
  return (
    <Table
      className={cn(
        "text-sm w-full",
        className
      )}
      {...props}
    />
  );
}

export function SwissTableHeader({
  className,
  ...props
}: React.ComponentProps<typeof TableHeader>) {
  return (
    <TableHeader 
      className={cn(
        "table-header-enhanced",
        className
      )} 
      {...props} 
    />
  );
}

export function SwissTableHead({
  className,
  ...props
}: React.ComponentProps<typeof TableHead>) {
  return (
    <TableHead
      className={cn(
        "text-xs uppercase tracking-[0.08em] font-semibold",
        "text-zinc-600 dark:text-zinc-300", // Melhor contraste
        "py-3.5 px-4 first:pl-6 last:pr-6",
        "bg-muted/80 dark:bg-muted/60",
        "font-sans whitespace-nowrap",
        className
      )}
      {...props}
    />
  );
}

export function SwissTableBody({
  className,
  ...props
}: React.ComponentProps<typeof TableBody>) {
  return (
    <TableBody 
      className={cn(
        "divide-y divide-border/50",
        "[&_tr:last-child]:border-0",
        className
      )} 
      {...props} 
    />
  );
}

export function SwissTableRow({
  className,
  ...props
}: React.ComponentProps<typeof TableRow>) {
  return (
    <TableRow
      className={cn(
        "table-row-enhanced",
        "data-[state=selected]:bg-muted dark:data-[state=selected]:bg-muted/40",
        className
      )}
      {...props}
    />
  );
}

export function SwissTableCell({
  className,
  ...props
}: React.ComponentProps<typeof TableCell>) {
  return (
    <TableCell 
      className={cn(
        "table-cell-enhanced",
        "text-zinc-700 dark:text-zinc-300", // Melhor contraste
        className
      )} 
      {...props} 
    />
  );
}

// Empty state para tabelas
interface SwissTableEmptyProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function SwissTableEmpty({
  icon,
  title = "Nenhum resultado encontrado",
  description = "Não há dados para exibir no momento.",
  action,
}: SwissTableEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="w-12 h-12 text-muted-foreground/50 dark:text-muted-foreground/70 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-medium text-foreground dark:text-zinc-200 mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground dark:text-zinc-400 max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}

export {
  TableBody as BaseTableBody,
  TableCell as BaseTableCell,
  TableHead as BaseTableHead,
  TableHeader as BaseTableHeader,
  TableRow as BaseTableRow,
};
