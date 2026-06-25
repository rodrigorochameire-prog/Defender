"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { RegistrosTimeline } from "@/components/registros/registros-timeline";
import { ProcessosVinculadosList } from "@/components/processo/processos-vinculados-list";
import { ProcessoCockpitHeader } from "@/components/processo/processo-cockpit-header";
import { AnaliseProcessoCard } from "@/components/processo/analise-processo-card";
import { CriarCasoFromProcessoButton } from "@/components/processo/criar-caso-from-processo-button";

export default function ProcessoPage() {
  const params = useParams();
  const router = useRouter();
  const sp = useSearchParams();
  const raw = sp?.get("raw") === "1";
  const id = Number(params?.id);

  const { data: processo, isLoading: loadingProc, error } = trpc.processos.getById.useQuery(
    { id }, { enabled: !isNaN(id), retry: false }
  );

  const { data: caso } = trpc.casos.getCasoById.useQuery(
    { id: processo?.casoId ?? 0 },
    { enabled: !!processo?.casoId && !raw },
  );

  // Standalone (processo órfão): só busca análise/audiência quando não vai redirecionar.
  const standalone = !!processo && (raw || !processo.casoId);

  const { data: analiseCowork, isLoading: loadingAnalise } =
    trpc.analise.getAnaliseCoworkDoProcesso.useQuery(
      { processoId: id },
      { enabled: standalone && !isNaN(id) },
    );

  const { data: proxima } = trpc.audiencias.proximaAgendada.useQuery(
    { processoId: id },
    { enabled: standalone && !isNaN(id) },
  );

  useEffect(() => {
    if (raw || loadingProc || !processo) return;
    if (caso?.assistidoId && processo.casoId) {
      router.replace(`/admin/assistidos/${caso.assistidoId}/caso/${processo.casoId}/processo/${id}`);
    }
  }, [raw, loadingProc, processo, caso, id, router]);

  if (loadingProc) return <p className="p-6 italic text-neutral-400">Carregando…</p>;
  if (error || !processo) return <p className="p-6">Processo não encontrado.</p>;

  // Assistido dono do processo (principal da relação M2M) — alimenta o CTA "Criar caso".
  const assistidoId =
    processo.assistidos?.find((a) => a.isPrincipal)?.id ??
    processo.assistidos?.[0]?.id ??
    processo.assistidoId ??
    null;

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-5xl">
      <ProcessoCockpitHeader
        numeroAutos={processo.numeroAutos}
        area={processo.area}
        vara={processo.vara}
        fase={processo.fase}
        proximaAudiencia={
          proxima
            ? { dataAudiencia: proxima.dataAudiencia, tipo: proxima.tipo, local: proxima.local }
            : null
        }
        actions={
          !processo.casoId ? (
            <CriarCasoFromProcessoButton assistidoId={assistidoId} processoId={id} />
          ) : undefined
        }
      />

      {!raw && !processo.casoId && (
        <p className="text-xs italic text-amber-600 dark:text-amber-400">
          Processo sem caso vinculado — vista standalone.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,22rem)] gap-4 items-start">
        {/* Coluna esquerda — estrutura e histórico */}
        <div className="space-y-4 min-w-0">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
              Processos vinculados
            </h2>
            <ProcessosVinculadosList processoId={id} currentId={id} showCreateButton />
          </section>
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
              Registros
            </h2>
            <RegistrosTimeline processoId={id} emptyHint="Nenhum registro neste processo ainda." />
          </section>
        </div>

        {/* Coluna direita — análise IA (antes, branco desperdiçado) */}
        <aside className="lg:sticky lg:top-4">
          <AnaliseProcessoCard
            analise={analiseCowork ?? null}
            analysisData={(processo.analysisData as Record<string, unknown> | null) ?? null}
            analyzedAt={processo.analyzedAt}
            isLoading={loadingAnalise}
          />
        </aside>
      </div>
    </div>
  );
}
