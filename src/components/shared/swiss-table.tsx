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

export function SwissTable({
  className,
  ...props
}: React.ComponentProps<typeof Table>) {
  return (
    <Table
      className={cn(
        "border border-slate-200 dark:border-slate-800 text-sm",
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
  return <TableHeader className={cn("bg-slate-50/70 dark:bg-slate-900/40", className)} {...props} />;
}

export function SwissTableHead({
  className,
  ...props
}: React.ComponentProps<typeof TableHead>) {
  return (
    <TableHead
      className={cn(
        "text-[11px] uppercase tracking-[0.2em] font-semibold text-slate-500",
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
  return <TableBody className={cn("divide-y divide-slate-100 dark:divide-slate-800", className)} {...props} />;
}

export function SwissTableRow({
  className,
  ...props
}: React.ComponentProps<typeof TableRow>) {
  return (
    <TableRow
      className={cn(
        "hover:bg-slate-50/60 dark:hover:bg-slate-900/40",
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
  return <TableCell className={cn("py-3", className)} {...props} />;
}

export {
  TableBody as BaseTableBody,
  TableCell as BaseTableCell,
  TableHead as BaseTableHead,
  TableHeader as BaseTableHeader,
  TableRow as BaseTableRow,
};
