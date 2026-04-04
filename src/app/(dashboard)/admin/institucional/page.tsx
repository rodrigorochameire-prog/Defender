import { Building2, Newspaper, FileText, Bell } from "lucide-react";

export default function InstitucionalPage() {
  return (
    <div className="flex flex-col h-full items-center justify-center p-8 text-center">
      <div className="p-4 bg-neutral-100 dark:bg-muted rounded-2xl mb-4">
        <Building2 className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold text-foreground mb-2">
        Institucional
      </h1>
      <p className="text-sm text-muted-foreground max-w-sm mb-8">
        Acompanhe publicações oficiais, diário da justiça e comunicados institucionais da DPE-BA em um só lugar.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-md">
        {[
          { icon: Newspaper, label: "Diário Oficial", desc: "Em breve" },
          { icon: FileText, label: "Diário da Justiça", desc: "Em breve" },
          { icon: Bell, label: "Comunicados DPE-BA", desc: "Em breve" },
        ].map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-neutral-200 dark:border-border bg-white dark:bg-card"
          >
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground/80">{label}</span>
            <span className="text-[10px] text-muted-foreground bg-neutral-100 dark:bg-muted px-2 py-0.5 rounded-full">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
