"use client";

import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
}

interface PageHeaderProps {
  icon: LucideIcon;
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

// Layout principal da página
export function PageLayout({ children }: PageLayoutProps) {
  return <div className="page-container">{children}</div>;
}

// Header da página
export function PageHeader({ icon: Icon, title, description, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-content">
        <div className="page-header-icon">
          <Icon />
        </div>
        <div className="page-header-info">
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
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

