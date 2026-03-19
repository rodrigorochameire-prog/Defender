import { Building2, Newspaper, FileText, Bell } from "lucide-react";

export default function InstitucionalPage() {
  return (
    <div className="flex flex-col h-full items-center justify-center p-8 text-center">
      <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-4">
        <Building2 className="h-8 w-8 text-zinc-400" />
      </div>
      <h1 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
        Institucional
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-8">
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
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          >
            <Icon className="h-5 w-5 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
            <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
