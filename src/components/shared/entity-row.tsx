"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eye, Edit, MoreHorizontal, ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ==========================================
// ENTITY ROW - Linha padronizada para tabelas/listas
// Design System: altura consistente, tipografia legível
// ==========================================

interface EntityRowProps {
  // Identificação
  title: string;
  subtitle?: string;
  code?: string;
  avatar?: {
    src?: string | null;
    fallback: string;
    indicator?: "online" | "offline" | "warning" | "danger";
  };
  
  // Badges
  badges?: Array<{
    label: string;
    variant?: "default" | "secondary" | "success" | "warning" | "danger" | "info" | "neutral" | "urgent";
    icon?: React.ReactNode;
  }>;
  
  // Colunas de dados
  columns?: Array<{
    label?: string;
    value: string | number | React.ReactNode;
    icon?: React.ReactNode;
    className?: string;
    align?: "left" | "center" | "right";
  }>;
  
  // Actions
  href?: string;
  onView?: () => void;
  onEdit?: () => void;
  moreActions?: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    destructive?: boolean;
  }>;
  
  // Styling
  accentColor?: string;
  className?: string;
  selected?: boolean;
  onClick?: () => void;
}

export function EntityRow({
  title,
  subtitle,
  code,
  avatar,
  badges,
  columns,
  href,
  onView,
  onEdit,
  moreActions,
  accentColor,
  className,
  selected,
  onClick,
}: EntityRowProps) {
  const hasActions = onView || onEdit || (moreActions && moreActions.length > 0);
  
  return (
    <div
      className={cn(
        "group flex items-center gap-4 px-4 py-3 border-b last:border-b-0",
        "bg-card hover:bg-muted/50 transition-colors",
        selected && "bg-primary/5 border-l-2 border-l-primary",
        accentColor && `border-l-4 ${accentColor}`,
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Avatar */}
      {avatar && (
        <div className="relative flex-shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatar.src || undefined} alt={title} />
            <AvatarFallback className="bg-muted text-muted-foreground font-medium text-sm">
              {avatar.fallback}
            </AvatarFallback>
          </Avatar>
          {avatar.indicator && (
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                avatar.indicator === "online" && "bg-emerald-500",
                avatar.indicator === "offline" && "bg-zinc-400",
                avatar.indicator === "warning" && "bg-amber-500",
                avatar.indicator === "danger" && "bg-rose-500"
              )}
            />
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
        {/* Title Section */}
        <div className="min-w-0 sm:w-[280px] lg:w-[320px] flex-shrink-0">
          <div className="flex items-center gap-2">
            {href ? (
              <Link
                href={href}
                className="font-medium text-sm text-foreground hover:text-primary hover:underline truncate"
              >
                {title}
              </Link>
            ) : (
              <span className="font-medium text-sm text-foreground truncate">{title}</span>
            )}
          </div>
          {(subtitle || code) && (
            <div className="flex items-center gap-2 mt-0.5">
              {subtitle && (
                <span className="text-xs text-muted-foreground truncate">{subtitle}</span>
              )}
              {code && (
                <code className="text-xs text-muted-foreground font-mono bg-muted px-1 py-0.5 rounded">
                  {code}
                </code>
              )}
            </div>
          )}
        </div>

        {/* Badges */}
        {badges && badges.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap sm:w-auto">
            {badges.map((badge, idx) => (
              <Badge
                key={idx}
                variant={badge.variant as any || "secondary"}
                className="text-xs"
              >
                {badge.icon && <span className="mr-1">{badge.icon}</span>}
                {badge.label}
              </Badge>
            ))}
          </div>
        )}

        {/* Columns */}
        {columns && columns.length > 0 && (
          <div className="flex items-center gap-6 flex-1">
            {columns.map((col, idx) => (
              <div
                key={idx}
                className={cn(
                  "min-w-0",
                  col.align === "center" && "text-center",
                  col.align === "right" && "text-right ml-auto",
                  col.className
                )}
              >
                <div className="flex items-center gap-1.5">
                  {col.icon && (
                    <span className="text-muted-foreground flex-shrink-0">{col.icon}</span>
                  )}
                  <span className="text-sm text-foreground font-medium">{col.value}</span>
                </div>
                {col.label && (
                  <span className="text-xs text-muted-foreground">{col.label}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {hasActions && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {onView && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onView(); }}>
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {onEdit && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {moreActions && moreActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {moreActions.map((action, idx) => (
                  <React.Fragment key={idx}>
                    {action.destructive && idx > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); action.onClick(); }}
                      className={cn(action.destructive && "text-destructive")}
                    >
                      {action.icon}
                      {action.label}
                    </DropdownMenuItem>
                  </React.Fragment>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Navigate Arrow */}
      {href && (
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}

// ==========================================
// ENTITY TABLE - Container para rows
// ==========================================

interface EntityTableProps {
  children: React.ReactNode;
  headers?: string[];
  className?: string;
  emptyState?: React.ReactNode;
  stickyHeader?: boolean;
}

export function EntityTable({
  children,
  headers,
  className,
  emptyState,
  stickyHeader = true,
}: EntityTableProps) {
  const childCount = React.Children.count(children);
  
  if (childCount === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={cn("bg-card rounded-xl border shadow-sm overflow-hidden", className)}>
      {headers && headers.length > 0 && (
        <div
          className={cn(
            "flex items-center gap-4 px-4 py-2 border-b bg-muted/50",
            stickyHeader && "sticky top-0 z-10"
          )}
        >
          {headers.map((header, idx) => (
            <span key={idx} className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {header}
            </span>
          ))}
        </div>
      )}
      <div className="divide-y">{children}</div>
    </div>
  );
}

// ==========================================
// SIMPLE LIST ITEM - Para listas simples
// ==========================================

interface SimpleListItemProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  value?: string | number;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function SimpleListItem({
  icon,
  title,
  subtitle,
  value,
  href,
  onClick,
  className,
}: SimpleListItemProps) {
  const content = (
    <>
      {icon && (
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      {value && (
        <span className="text-sm font-semibold text-foreground">{value}</span>
      )}
      {(href || onClick) && (
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      )}
    </>
  );

  const baseClassName = cn(
    "flex items-center gap-3 px-4 py-3 border-b last:border-b-0",
    "hover:bg-muted/50 transition-colors",
    (href || onClick) && "cursor-pointer",
    className
  );

  if (href) {
    return (
      <Link href={href} className={baseClassName}>
        {content}
      </Link>
    );
  }

  return (
    <div onClick={onClick} className={baseClassName}>
      {content}
    </div>
  );
}
