"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronRight, MoreHorizontal, Eye, Edit, ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ==========================================
// ENTITY CARD - Card padronizado para entidades (grid view)
// Usado em: Casos, Processos, Assistidos
// ==========================================

interface EntityCardProps {
  // Header
  title: string;
  subtitle?: string;
  badge?: {
    label: string;
    variant?: "default" | "secondary" | "success" | "warning" | "danger" | "info" | "neutral" | "urgent";
  };
  avatar?: {
    src?: string | null;
    fallback: string;
    indicator?: "online" | "offline" | "warning" | "danger";
  };
  
  // Content
  children?: React.ReactNode;
  
  // Metadata (grid inferior)
  metadata?: Array<{
    icon?: React.ReactNode;
    label: string;
    value: string | number;
    highlight?: boolean;
  }>;
  
  // Footer
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
  
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
  compact?: boolean;
  interactive?: boolean;
}

export function EntityCard({
  title,
  subtitle,
  badge,
  avatar,
  children,
  metadata,
  footerLeft,
  footerRight,
  href,
  onView,
  onEdit,
  moreActions,
  accentColor,
  className,
  compact = false,
  interactive = true,
}: EntityCardProps) {
  return (
    <div
      className={cn(
        "group relative bg-card rounded-xl border shadow-sm transition-all duration-200",
        interactive && "hover:shadow-md hover:border-primary/20",
        accentColor && `border-l-4 ${accentColor}`,
        className
      )}
    >
      {/* Header */}
      <div className={cn("p-4", compact && "p-3")}>
        <div className="flex items-start gap-3">
          {avatar && (
            <div className="relative flex-shrink-0">
              <Avatar className={cn("h-10 w-10", compact && "h-8 w-8")}>
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
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {href ? (
                  <Link href={href}>
                    <h3 className={cn(
                      "font-semibold text-foreground leading-tight truncate",
                      compact ? "text-sm" : "text-base",
                      "hover:text-primary hover:underline cursor-pointer"
                    )}>
                      {title}
                    </h3>
                  </Link>
                ) : (
                  <h3 className={cn(
                    "font-semibold text-foreground leading-tight truncate",
                    compact ? "text-sm" : "text-base"
                  )}>
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className={cn(
                    "text-muted-foreground mt-0.5 truncate",
                    compact ? "text-xs" : "text-sm"
                  )}>
                    {subtitle}
                  </p>
                )}
              </div>
              
              {badge && (
                <Badge
                  variant={badge.variant as any || "default"}
                  className="flex-shrink-0 text-xs"
                >
                  {badge.label}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Actions */}
          {(onView || onEdit || moreActions) && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onView && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onView}>
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {onEdit && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {moreActions && moreActions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {moreActions.map((action, idx) => (
                      <React.Fragment key={idx}>
                        {action.destructive && idx > 0 && <DropdownMenuSeparator />}
                        <DropdownMenuItem
                          onClick={action.onClick}
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
        </div>
      </div>

      {/* Content */}
      {children && (
        <div className={cn("px-4 pb-3", compact && "px-3 pb-2")}>
          {children}
        </div>
      )}

      {/* Metadata Grid */}
      {metadata && metadata.length > 0 && (
        <div className={cn(
          "px-4 py-3 border-t bg-muted/30 grid gap-3",
          compact && "px-3 py-2",
          metadata.length <= 2 && "grid-cols-2",
          metadata.length === 3 && "grid-cols-3",
          metadata.length >= 4 && "grid-cols-2 sm:grid-cols-4"
        )}>
          {metadata.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 min-w-0">
              {item.icon && (
                <span className={cn(
                  "flex-shrink-0",
                  item.highlight ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.icon}
                </span>
              )}
              <div className="min-w-0">
                <p className={cn(
                  "font-medium truncate",
                  compact ? "text-xs" : "text-sm",
                  item.highlight ? "text-primary" : "text-foreground"
                )}>
                  {item.value}
                </p>
                <p className="text-xs text-muted-foreground truncate">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {(footerLeft || footerRight) && (
        <div className={cn(
          "px-4 py-3 border-t flex items-center justify-between gap-2",
          compact && "px-3 py-2"
        )}>
          <div className="flex items-center gap-2 min-w-0">
            {footerLeft}
          </div>
          <div className="flex items-center gap-2">
            {footerRight}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// ENTITY CARD GRID - Container para cards
// ==========================================

interface EntityCardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function EntityCardGrid({ children, columns = 3, className }: EntityCardGridProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 lg:grid-cols-2",
    3: "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  );
}

// ==========================================
// ENTITY CARD COMPACT - Versão menor para listas densas
// ==========================================

interface EntityCardCompactProps {
  title: string;
  subtitle?: string;
  badges?: Array<{ label: string; variant?: string }>;
  rightContent?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function EntityCardCompact({
  title,
  subtitle,
  badges,
  rightContent,
  href,
  onClick,
  className,
}: EntityCardCompactProps) {
  const cardContent = (
    <>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-foreground truncate">{title}</h4>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
        )}
        {badges && badges.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            {badges.map((badge, idx) => (
              <Badge key={idx} variant={badge.variant as any || "secondary"} className="text-xs">
                {badge.label}
              </Badge>
            ))}
          </div>
        )}
      </div>
      {rightContent}
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </>
  );

  const baseClassName = cn(
    "flex items-center gap-4 p-3 rounded-lg border bg-card transition-all",
    "hover:shadow-sm hover:border-primary/20 cursor-pointer",
    className
  );

  if (href) {
    return (
      <Link href={href} className={baseClassName}>
        {cardContent}
      </Link>
    );
  }

  return (
    <div onClick={onClick} className={baseClassName}>
      {cardContent}
    </div>
  );
}
