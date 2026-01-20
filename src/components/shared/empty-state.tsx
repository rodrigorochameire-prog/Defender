"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LucideIcon, FolderOpen, Search, Plus } from "lucide-react";

// ==========================================
// EMPTY STATE - Estado vazio padronizado
// ==========================================

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "search" | "error";
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
  className,
  size = "md",
}: EmptyStateProps) {
  const sizeStyles = {
    sm: {
      container: "py-8",
      icon: "w-10 h-10",
      iconWrapper: "w-14 h-14",
      title: "text-sm",
      description: "text-xs",
    },
    md: {
      container: "py-12",
      icon: "w-12 h-12",
      iconWrapper: "w-20 h-20",
      title: "text-base",
      description: "text-sm",
    },
    lg: {
      container: "py-16",
      icon: "w-16 h-16",
      iconWrapper: "w-24 h-24",
      title: "text-lg",
      description: "text-base",
    },
  };

  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        styles.container,
        className
      )}
    >
      <div
        className={cn(
          "rounded-full flex items-center justify-center mb-4",
          styles.iconWrapper,
          variant === "default" && "bg-muted",
          variant === "search" && "bg-blue-50 dark:bg-blue-950/30",
          variant === "error" && "bg-rose-50 dark:bg-rose-950/30"
        )}
      >
        <Icon
          className={cn(
            styles.icon,
            variant === "default" && "text-muted-foreground",
            variant === "search" && "text-blue-500",
            variant === "error" && "text-rose-500"
          )}
        />
      </div>

      <h3
        className={cn(
          "font-semibold text-foreground mb-1",
          styles.title
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            "text-muted-foreground max-w-sm mx-auto mb-4",
            styles.description
          )}
        >
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-2">
          {action && (
            <Button onClick={action.onClick} className="gap-2">
              {action.icon && <action.icon className="w-4 h-4" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// SEARCH EMPTY - Para resultados de busca vazios
// ==========================================

interface SearchEmptyProps {
  searchTerm: string;
  onClear?: () => void;
  className?: string;
}

export function SearchEmpty({ searchTerm, onClear, className }: SearchEmptyProps) {
  return (
    <EmptyState
      icon={Search}
      variant="search"
      title={`Nenhum resultado para "${searchTerm}"`}
      description="Tente ajustar os termos de busca ou remover alguns filtros"
      action={onClear ? { label: "Limpar busca", onClick: onClear } : undefined}
      className={className}
    />
  );
}

// ==========================================
// LIST EMPTY - Para listas vazias
// ==========================================

interface ListEmptyProps {
  entityName: string;
  onCreate?: () => void;
  className?: string;
}

export function ListEmpty({ entityName, onCreate, className }: ListEmptyProps) {
  return (
    <EmptyState
      icon={FolderOpen}
      title={`Nenhum ${entityName} encontrado`}
      description={`Crie um novo ${entityName} ou ajuste os filtros de busca.`}
      action={
        onCreate
          ? { label: `Criar ${entityName}`, onClick: onCreate, icon: Plus }
          : undefined
      }
      className={className}
    />
  );
}
