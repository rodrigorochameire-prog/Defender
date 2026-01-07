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
}

export function PageHeader({
  title,
  description,
  backHref,
  actions,
  icon,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8", className)}>
      <div className="flex items-center gap-4">
        {backHref && (
          <Button variant="ghost" size="icon" className="rounded-xl" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        )}
        {icon && <PageIcon icon={icon} size="md" />}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
