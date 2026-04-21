"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { User, Briefcase, Clock, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

const NIVEL_1_TABS = [
  { key: "geral",    label: "Geral",    icon: User,       path: "" },
  { key: "casos",    label: "Casos",    icon: Briefcase,  path: "casos" },
  { key: "timeline", label: "Timeline", icon: Clock,      path: "timeline" },
  { key: "radar",    label: "Radar",    icon: Newspaper,  path: "radar" },
] as const;

export default function AssistidoLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const id = Number(params?.id);

  const { data: assistido } = trpc.assistidos.getById.useQuery({ id }, { enabled: !isNaN(id) });

  const base = `/admin/assistidos/${id}`;
  const sub = pathname.replace(base, "").replace(/^\//, "").split("/")[0];
  const activeKey = sub === "" || sub === "caso" ? "geral" : sub;

  return (
    <div className="flex flex-col h-full">
      <header className="border-b px-6 py-3 bg-white dark:bg-neutral-950">
        <h1 className="text-lg font-semibold truncate">{assistido?.nome ?? "Carregando…"}</h1>
        <div className="text-xs text-neutral-500 mt-0.5">
          {assistido?.cpf && <span className="font-mono">{assistido.cpf}</span>}
          {assistido?.telefone && <span className="ml-3">{assistido.telefone}</span>}
        </div>
      </header>

      <nav className="border-b px-6 flex gap-1 bg-white dark:bg-neutral-950">
        {NIVEL_1_TABS.map((t) => {
          const Icon = t.icon;
          const href = t.path ? `${base}/${t.path}` : base;
          const isActive = activeKey === t.key;
          return (
            <Link
              key={t.key}
              href={href}
              className={cn(
                "flex items-center gap-1 px-3 py-2 text-xs border-b-2",
                isActive ? "border-emerald-500 text-emerald-700 font-medium" : "border-transparent text-neutral-500 hover:text-neutral-700",
              )}
            >
              <Icon className="w-3 h-3" />
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
