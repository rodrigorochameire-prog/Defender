"use client";

import { useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
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
      <CollapsiblePageHeader title="Auditoria" icon={ShieldCheck}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#525252] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-white text-[15px] font-semibold tracking-tight leading-tight">
              Auditoria
            </h1>
            <p className="text-[10px] text-white/55 hidden sm:block">
              Execuções de varredura e importação — histórico e alterações
            </p>
          </div>
        </div>
      </CollapsiblePageHeader>

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
