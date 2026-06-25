"use client";

import { Briefcase } from "lucide-react";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { trpc } from "@/lib/trpc/client";

export default function VidaFuncionalPage() {
  const { data: eventos, isLoading } = trpc.vidaFuncional.listEventos.useQuery({});

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <CollapsiblePageHeader title="Vida Funcional" icon={Briefcase}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 rounded-xl bg-[#525252] flex items-center justify-center shrink-0">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-white text-[15px] font-semibold">Vida Funcional</h1>
            <p className="text-[10px] text-white/55 hidden sm:block">
              {isLoading ? "carregando…" : `${eventos?.length ?? 0} evento(s)`}
            </p>
          </div>
        </div>
      </CollapsiblePageHeader>

      <div className="px-5 md:px-8 py-3 md:py-4 space-y-6">
        <p className="text-sm text-muted-foreground">
          Fundação pronta. As telas (Radar, Trajetória, domínios, Produtividade) chegam nos próximos estágios.
        </p>
      </div>
    </div>
  );
}
