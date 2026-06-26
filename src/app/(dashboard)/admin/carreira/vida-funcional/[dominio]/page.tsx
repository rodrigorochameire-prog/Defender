"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { getDominio } from "@/lib/vida-funcional/dominios";
import { vfIcon } from "../_components/icon-map";
import { DrivePanel } from "./_components/drive-panel";

export default function DominioPage({ params }: { params: Promise<{ dominio: string }> }) {
  const { dominio } = use(params);
  const cfg = getDominio(dominio);
  const [openId, setOpenId] = useState<number | null>(null);

  const { data: eventos = [], isLoading } = trpc.vidaFuncional.listEventos.useQuery(
    { tipos: cfg?.tipos as any },
    { enabled: !!cfg },
  );

  if (!cfg) {
    return (
      <div className="p-8">
        <Link href="/admin/carreira/vida-funcional" className="text-sm text-emerald-600 hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <p className="mt-4 text-muted-foreground">Domínio &quot;{dominio}&quot; não encontrado.</p>
      </div>
    );
  }

  const Icon = vfIcon(cfg.icon);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <div className="px-5 md:px-8 py-4 border-b border-border/60 bg-white dark:bg-neutral-900/50">
        <Link href="/admin/carreira/vida-funcional" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Vida Funcional
        </Link>
        <div className="flex items-center gap-2 mt-1">
          <Icon className="w-5 h-5 text-emerald-500" />
          <h1 className="text-lg font-semibold">{cfg.label}</h1>
          <span className="text-sm text-muted-foreground tabular-nums">({eventos.length})</span>
        </div>
      </div>

      <div className="px-5 md:px-8 py-4 space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : eventos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento neste domínio ainda.</p>
        ) : (
          eventos.map((e) => {
            const open = openId === e.id;
            return (
              <div key={e.id} className="rounded-xl border border-neutral-200 dark:border-neutral-700/30 bg-white dark:bg-neutral-900/50">
                <button
                  onClick={() => setOpenId(open ? null : e.id)}
                  className="w-full text-left p-4 flex items-center gap-3 cursor-pointer"
                >
                  {e.driveFolderId ? (open ? <ChevronDown className="w-4 h-4 text-neutral-400" /> : <ChevronRight className="w-4 h-4 text-neutral-400" />) : <span className="w-4" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{e.titulo}</p>
                    <p className="text-xs text-muted-foreground font-mono">{e.dataEvento} · {e.status}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wide text-neutral-400">{e.tipo}</span>
                </button>
                {open && e.driveFolderId && (
                  <div className="px-4 pb-4">
                    <DrivePanel folderId={e.driveFolderId} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
