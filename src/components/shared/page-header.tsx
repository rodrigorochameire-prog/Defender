import { Button } from "@/components/ui/button";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { PageIcon } from "./page-icon";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  actions?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
  variant?: "default" | "compact";
}

export function PageHeader({
  title,
  description,
  backHref,
  actions,
  icon,
  className,
  variant = "default",
}: PageHeaderProps) {
  if (variant === "compact") {
    return (
      <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6", className)}>
        <div className="flex items-center gap-3">
          {backHref && (
            <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" asChild>
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          )}
          {icon && <PageIcon icon={icon} size="sm" />}
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">{title}</h1>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    );
  }

  return (
    <div className={cn("page-header", className)}>
      <div className="page-header-content">
        {backHref && (
          <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 -ml-2" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        )}
        {icon && <PageIcon icon={icon} size="md" variant="primary" />}
        <div className="page-header-info">
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}

/**
 * PageHeaderPremium - Versão premium com mais opções
 */
interface PageHeaderPremiumProps {
  title: string;
  description?: string;
  backHref?: string;
  actions?: React.ReactNode;
  icon?: LucideIcon;
  iconVariant?: "primary" | "secondary" | "success" | "fatal" | "muted";
  badge?: React.ReactNode;
  className?: string;
}

export function PageHeaderPremium({
  title,
  description,
  backHref,
  actions,
  icon: Icon,
  iconVariant = "primary",
  badge,
  className,
}: PageHeaderPremiumProps) {
  const iconClasses = {
    primary: "icon-primary",
    secondary: "icon-secondary",
    success: "icon-success",
    fatal: "icon-fatal",
    muted: "icon-muted",
  };

  return (
    <div className={cn("page-header", className)}>
      <div className="page-header-content">
        {backHref && (
          <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 -ml-2" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        )}
        {Icon && (
          <div className={iconClasses[iconVariant]}>
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div className="page-header-info">
          <div className="flex items-center gap-3">
            <h1>{title}</h1>
            {badge}
          </div>
          {description && <p>{description}</p>}
        </div>
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}
