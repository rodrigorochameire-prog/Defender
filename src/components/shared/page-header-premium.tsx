import { LucideIcon } from "lucide-react";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  breadcrumbs: Breadcrumb[];
}

export function PageHeader({ icon: Icon, title, subtitle, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-neutral-50 via-white to-neutral-50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-900/80 border-b border-neutral-200 dark:border-neutral-800 px-6 py-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 flex-shrink-0">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 text-xs text-neutral-500 dark:text-neutral-400">
            {breadcrumbs.map((breadcrumb, index) => (
              <span key={index}>{breadcrumb.label}</span>
            ))}
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{title}</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
