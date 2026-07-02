"use client";

import { useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { GlassHeaderShell } from "@/components/layouts/header/glass-header-shell";
import { trpc } from "@/lib/trpc/client";
import { RunsList } from "@/components/auditoria/RunsList";
import { RunDetail, type AuditChangeRow } from "@/components/auditoria/RunDetail";

export default function AuditoriaPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: runs, isLoading: runsLoading } = trpc.auditoria.listRuns.useQuery({
    limit: 50,
    offset: 0,
  });

  const { data: detail, isLoading: detailLoading } = trpc.auditoria.runDetail.useQuery(
    { taskId: selectedId ?? 0 },
    { enabled: selectedId !== null }
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <GlassHeaderShell
        title="Auditoria"
        icon={ShieldCheck}
        stats={
          <span className="text-[11px] text-white/55 leading-none hidden sm:inline">
            Execuções de varredura e importação — histórico e alterações
          </span>
        }
      />

      <div className="px-5 md:px-8 py-3 md:py-4 space-y-6">
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700/30 bg-white dark:bg-neutral-900/50 p-4">
          {selectedId === null ? (
            runsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <RunsList runs={runs ?? []} onOpen={(id) => setSelectedId(id)} />
            )
          ) : detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <RunDetail
              run={detail?.run ?? null}
              changes={(detail?.changes ?? []) as AuditChangeRow[]}
              onBack={() => setSelectedId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
