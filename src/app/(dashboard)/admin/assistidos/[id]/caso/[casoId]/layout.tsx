"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { CaseSwitcher } from "@/components/hierarquia/caso-switcher";
import { useVisibleCasoTabs } from "@/hooks/use-visible-caso-tabs";
import { cn } from "@/lib/utils";

export default function CasoLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const assistidoId = Number(params?.id);
  const casoId = Number(params?.casoId);

  const { data: caso } = trpc.casos.getCasoById.useQuery({ id: casoId }, { enabled: !isNaN(casoId) });
  const { data: processosDoCaso = [] } = trpc.processos.listByCaso.useQuery(
    { casoId }, { enabled: !isNaN(casoId) }
  );

  const tabs = useVisibleCasoTabs(processosDoCaso);

  const base = `/admin/assistidos/${assistidoId}/caso/${casoId}`;
  const sub = pathname.replace(base, "").replace(/^\//, "").split("/")[0];
  const activeKey = sub === "" ? "geral" : sub;

  return (
    <div className="flex flex-col">
      <div className="border-b px-6 py-2 bg-neutral-50 dark:bg-neutral-900/50 flex items-center gap-3">
        <CaseSwitcher assistidoId={assistidoId} activeCasoId={casoId} />
        {caso && (
          <>
            <span className="text-xs text-neutral-500">·</span>
            <span className="text-xs">{caso.status ?? "—"}</span>
            {caso.fase && <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800">{caso.fase}</span>}
          </>
        )}
      </div>

      <nav className="border-b px-6 flex gap-1 bg-white dark:bg-neutral-950 overflow-x-auto">
        {tabs.map((t) => {
          const href = t.key === "geral" ? base : `${base}/${t.key}`;
          const isActive = activeKey === t.key;
          return (
            <Link
              key={t.key}
              href={href}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 text-xs border-b-2 whitespace-nowrap",
                isActive ? "border-emerald-500 text-emerald-700 font-medium" : "border-transparent text-neutral-500 hover:text-neutral-700",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
