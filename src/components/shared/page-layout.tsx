"use client";

import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * ========================================
 * SISTEMA DE LAYOUT UNIFICADO
 * Minimalismo Institucional
 * 
 * Todas as páginas seguem o mesmo esqueleto:
 * 1. Cabeçalho Unificado (título + ações)
 * 2. Área de Filtros (opcional)
 * 3. Conteúdo Principal
 * ========================================
 */

interface PageLayoutProps {
  children: ReactNode;
  /** Título da página (h1) */
  header?: string;
  /** Descrição opcional abaixo do título */
  description?: string;
  /** Botões de ação no canto superior direito */
  actions?: ReactNode;
  /** Área de filtros abaixo do header */
  filters?: ReactNode;
  /** Classe adicional para customização */
  className?: string;
  /** Largura máxima do conteúdo (default: 1600px) */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

const maxWidthClasses = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  "2xl": "max-w-[1600px]",
  full: "max-w-full",
};

/**
 * PageLayout - Layout Principal Unificado
 * 
 * Garante que todas as páginas tenham a mesma estrutura visual,
 * criando a sensação de "estar no mesmo aplicativo".
 */
export function PageLayout({ 
  children, 
  header, 
  description,
  actions, 
  filters,
  className,
  maxWidth = "2xl",
}: PageLayoutProps) {
  return (
    <div 
      className={cn(
        "flex flex-col h-full space-y-6",
        "p-4 sm:p-6 md:p-8",
        maxWidthClasses[maxWidth],
        "mx-auto w-full",
        className
      )}
    >
      {/* 1. Cabeçalho Unificado */}
      {(header || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-zinc-800 pb-5">
          <div>
            {header && (
              <h1 className="text-2xl font-serif font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                {header}
              </h1>
            )}
            {description && (
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-2xl">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* 2. Área de Filtros (Contexto) */}
      {filters && (
        <div className="w-full bg-stone-100/50 dark:bg-zinc-800/50 p-2 rounded-lg border border-stone-200 dark:border-zinc-700 flex flex-wrap items-center gap-2">
          {filters}
        </div>
      )}

      {/* 3. Conteúdo Principal */}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}

interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
}

interface StatCardProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  variant?: "orange" | "blue" | "warning" | "neutral";
  alert?: boolean;
}

interface SectionCardProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    href: string;
  };
  children: ReactNode;
}

interface ListItemProps {
  icon: LucideIcon;
  iconVariant?: "orange" | "blue";
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant: "orange" | "blue" | "success" | "warning" | "error" | "default";
  };
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
}

interface ActionCardProps {
  icon: LucideIcon;
  label: string;
  href: string;
}

// Header da página (componente alternativo)
export function PageHeader({ icon: Icon, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-zinc-800 pb-5">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-serif font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

// Grid de stats
export function StatsGrid({ children }: { children: ReactNode }) {
  return <div className="stats-grid">{children}</div>;
}

// Card de estatística
export function StatCard({ icon: Icon, value, label, variant = "neutral", alert }: StatCardProps) {
  return (
    <div className={`stat-card ${variant} ${alert ? "alert" : ""}`}>
      <div className="stat-icon">
        <Icon />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// Card de seção
export function SectionCard({ icon: Icon, title, subtitle, action, children }: SectionCardProps) {
  return (
    <div className="section-card">
      <div className="section-card-header">
        <div>
          <div className="section-card-title">
            {Icon && <Icon />}
            {title}
          </div>
          {subtitle && <div className="section-card-subtitle">{subtitle}</div>}
        </div>
        {action && (
          <Link href={action.href} className="link-primary">
            {action.label}
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="17" x2="17" y2="7"></line>
              <polyline points="7,7 17,7 17,17"></polyline>
            </svg>
          </Link>
        )}
      </div>
      <div className="section-card-content">{children}</div>
    </div>
  );
}

// Container de lista
export function ListContainer({ children }: { children: ReactNode }) {
  return <div className="list-container">{children}</div>;
}

// Item de lista
export function ListItem({ icon: Icon, iconVariant, title, subtitle, badge, href, onClick }: ListItemProps) {
  const content = (
    <div className="list-item" onClick={onClick}>
      <div className={`list-item-icon ${iconVariant || ""}`}>
        <Icon />
      </div>
      <div className="list-item-content">
        <div className="list-item-title">{title}</div>
        {subtitle && <div className="list-item-subtitle">{subtitle}</div>}
      </div>
      {badge && (
        <span className={`badge badge-${badge.variant}`}>
          {badge.text}
        </span>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

// Estado vazio
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon />
      </div>
      <div className="empty-state-title">{title}</div>
      {description && <div className="empty-state-description">{description}</div>}
      {action && (
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}

// Grid de ações
export function ActionGrid({ children }: { children: ReactNode }) {
  return <div className="action-grid">{children}</div>;
}

// Card de ação
export function ActionCard({ icon: Icon, label, href }: ActionCardProps) {
  return (
    <Link href={href} className="action-card">
      <div className="action-card-icon">
        <Icon />
      </div>
      <span className="action-card-label">{label}</span>
    </Link>
  );
}

// Content Grid (2 colunas em desktop)
export function ContentGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 lg:grid-cols-2">{children}</div>;
}

// Filtros
export function FiltersBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2 items-center">{children}</div>;
}

