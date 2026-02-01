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
    <div className="bg-gradient-to-r from-zinc-50 via-white to-zinc-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 px-6 py-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 flex-shrink-0">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 text-xs text-zinc-500 dark:text-zinc-400">
            {breadcrumbs.map((breadcrumb, index) => (
              <span key={index}>{breadcrumb.label}</span>
            ))}
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{title}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
