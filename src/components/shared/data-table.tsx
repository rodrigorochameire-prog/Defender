"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ==========================================
// DATA TABLE - Estilo Linear/Attio
// Tabela híbrida (table + spreadsheet)
// Bordas sutis, hover states precisos
// ==========================================

interface DataTableProps {
  children: ReactNode;
  className?: string;
}

export function DataTable({ children, className }: DataTableProps) {
  return (
    <div className={cn(
      "relative rounded-lg border border-border/50 bg-card overflow-hidden",
      "shadow-card",
      className
    )}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          {children}
        </table>
      </div>
    </div>
  );
}

interface DataTableHeaderProps {
  children: ReactNode;
  className?: string;
}

export function DataTableHeader({ children, className }: DataTableHeaderProps) {
  return (
    <thead
      className={cn(
        "bg-muted/40 border-b border-border/50",
        "sticky top-0 z-10 backdrop-blur-sm",
        className
      )}
    >
      {children}
    </thead>
  );
}

interface DataTableBodyProps {
  children: ReactNode;
  className?: string;
}

export function DataTableBody({ children, className }: DataTableBodyProps) {
  return (
    <tbody className={cn("divide-y divide-border/30", className)}>
      {children}
    </tbody>
  );
}

interface DataTableRowProps {
  children: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export function DataTableRow({ 
  children, 
  onClick, 
  selected,
  className 
}: DataTableRowProps) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "group transition-colors duration-100",
        onClick && "cursor-pointer",
        selected 
          ? "bg-primary/5 hover:bg-primary/8" 
          : "hover:bg-muted/40",
        "border-l-2 border-l-transparent",
        selected && "border-l-primary",
        className
      )}
    >
      {children}
    </tr>
  );
}

interface DataTableCellProps {
  children: ReactNode;
  header?: boolean;
  align?: "left" | "center" | "right";
  className?: string;
}

export function DataTableCell({ 
  children, 
  header = false,
  align = "left",
  className 
}: DataTableCellProps) {
  const Component = header ? "th" : "td";
  
  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  return (
    <Component
      className={cn(
        "px-4 py-3 first:pl-5 last:pr-5",
        header 
          ? "text-xs font-semibold text-muted-foreground uppercase tracking-wider" 
          : "text-sm text-foreground",
        alignClass[align],
        className
      )}
    >
      {children}
    </Component>
  );
}

// ==========================================
// TABLE ACTIONS - Ações que aparecem no hover
// ==========================================

export function DataTableActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
      {children}
    </div>
  );
}

// ==========================================
// TABLE CELL VARIANTS - Células especiais
// ==========================================

export function DataTableCellMono({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <DataTableCell className={cn("font-mono text-xs text-muted-foreground", className)}>
      {children}
    </DataTableCell>
  );
}

export function DataTableCellBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <DataTableCell className={cn("", className)}>
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-xs font-medium">
        {children}
      </span>
    </DataTableCell>
  );
}
