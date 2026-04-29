"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// New redesigned components
import { ProcessoHeader } from "@/components/processo/processo-header";
import { ProcessoTabs, type MainTab } from "@/components/processo/processo-tabs";
import { AnaliseHub } from "@/components/processo/analise-hub";

// Area-specific tabs
import { DelitosTab } from "@/components/processo/delitos-tab";
import { InstitutosTab } from "@/components/processo/institutos-tab";
import { AtosInfracionaisTab } from "@/components/processo/atos-infracionais-tab";
import { MedidasTab } from "@/components/processo/medidas-tab";
import { PessoasTab } from "./_components/pessoas-tab";
import { CronologiaTab } from "./_components/cronologia-tab";
import { ProcessoHistoricoView } from "@/components/processo/processo-historico-view";
import { RegistrosTimeline } from "@/components/registros/registros-timeline";
import { NovoRegistroButton } from "@/components/registros/novo-registro-button";

export default function ProcessoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [tab, setTab] = useState<MainTab>("analise");

  // --- Mutations ---
  const importPjeMutation = trpc.enrichment.importFromPje.useMutation({
    onSuccess: (result) => {
      const msgs: string[] = [];
      if (result.scrape?.scraped) msgs.push("Dados extraidos do PJe");
      if (result.download?.downloaded) msgs.push("Autos baixados para o Drive");
      if (result.scrape?.error) msgs.push(`Scrape: ${result.scrape.error}`);
      if (result.download?.error) msgs.push(`Download: ${result.download.error}`);
      if (result.scrape?.scraped || result.download?.downloaded) {
        toast.success("Importacao do PJe concluida", { description: msgs.join(" · ") });
      } else {
        toast.error("Importacao falhou", { description: msgs.join(" · ") });
      }
    },
    onError: (err) => toast.error(`Erro PJe: ${err.message}`),
  });

  const enrichDatajudMutation = trpc.processos.enrichFromDatajud.useMutation({
    onSuccess: (result) => {
      if (!result.found) {
        toast.info("Processo nao encontrado no DataJud", {
          description: "Os dados podem levar alguns dias para aparecer no CNJ.",
        });
        return;
      }
      if (result.updated.length === 0) {
        toast.success("DataJud consultado", {
          description: `Classe: ${result.data?.classe ?? "—"} | Movimentos: ${result.data?.totalMovimentos ?? 0}`,
        });
      } else {
        toast.success("Processo enriquecido pelo DataJud", {
          description: `Campos atualizados: ${result.updated.join(", ")}`,
        });
      }
    },
    onError: (err) => toast.error(`Erro DataJud: ${err.message}`),
  });

  const cadastrarMutation = trpc.solar.cadastrarNoSolar.useMutation({
    onSuccess: (data) => {
      if (data.ja_existia) {
        toast.info("Processo ja esta cadastrado no Solar");
      } else if (data.cadastrado) {
        toast.success("Processo cadastrado no Solar!");
      } else {
        toast.error("Nao foi possivel cadastrar no Solar");
      }
    },
    onError: (err) => toast.error(`Erro Solar: ${err.message}`),
  });

  // --- Query ---
  const { data, isLoading, error } = trpc.processos.getById.useQuery(
    { id: Number(id) },
    { staleTime: 60_000 }
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-neutral-500">
        <p className="text-sm">Processo nao encontrado.</p>
        <button onClick={() => router.back()} className="mt-2 text-xs text-emerald-600 hover:underline">
          &larr; Voltar
        </button>
      </div>
    );
  }

  // --- Derived data ---
  const ad = (data as any).analysisData ?? {};
  const payload = ad.payload ?? {};

  const futureAudiencias = (data.audiencias ?? [])
    .filter((a: any) => a.dataAudiencia && new Date(a.dataAudiencia) > new Date())
    .sort((a: any, b: any) => String(a.dataAudiencia).localeCompare(String(b.dataAudiencia)));
  const proximaAudiencia = futureAudiencias[0]
    ? { id: futureAudiencias[0].id, tipo: futureAudiencias[0].tipo ?? "Audiencia", data: String(futureAudiencias[0].dataAudiencia) }
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <ProcessoHeader
        id={data.id}
        numeroAutos={data.numeroAutos ?? "Sem numero"}
        assistidos={data.assistidos?.map((a: any) => ({
          id: a.id,
          nome: a.nome,
          statusPrisional: a.statusPrisional,
        })) ?? []}
        atribuicao={data.atribuicao}
        vara={data.vara}
        comarca={data.comarca}
        proximaAudiencia={proximaAudiencia}
        classeProcessual={(data as any).classeProcessual}
        casoInfo={(data as any).casoInfo}
        processosVinculados={(data as any).processosVinculados}
      />

      {/* Content container — unified card for tabs + content */}
      <div className="mx-4 lg:mx-6 mt-2 bg-white dark:bg-neutral-900/50 rounded-xl border border-neutral-200/60 dark:border-neutral-800/40 overflow-hidden flex-1 flex flex-col min-h-0">

      {/* Tabs */}
      <ProcessoTabs active={tab} onChange={setTab} />

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {/* ANALISE */}
        {tab === "analise" && (
          <AnaliseHub
            analysisData={ad}
            pessoas={payload.pessoas ?? ad.pessoas ?? []}
            depoimentos={payload.depoimentos ?? ad.depoimentos ?? []}
            cronologia={payload.cronologia ?? ad.cronologia ?? []}
            teses={ad.tesesCompleto ?? ad.teses ?? null}
            nulidades={ad.nulidades ?? []}
            matrizGuerra={ad.matrizGuerra ?? payload.matriz_guerra ?? []}
            locais={payload.locais ?? ad.locais ?? []}
            radarLiberdade={ad.radarLiberdade ?? null}
            saneamento={ad.saneamento ?? null}
            kpis={ad.painelControle ?? ad.kpis ?? null}
            resumo={ad.resumo ?? ""}
            crimePrincipal={ad.crimePrincipal ?? ad.kpis?.crimePrincipal ?? ""}
            estrategia={ad.estrategia ?? ""}
            achados={ad.achadosChave ?? []}
            recomendacoes={ad.recomendacoes ?? []}
            alertas={payload.alertas_operacionais ?? ad.alertasOperacionais ?? ad.alertas ?? []}
            checklistTatico={payload.checklist_tatico ?? ad.checklistTatico ?? []}
            orientacaoAssistido={payload.orientacao_ao_assistido ?? ad.orientacaoAssistido ?? ""}
            perspectivaPlenaria={payload.perspectiva_plenaria ?? ad.perspectivaPlenaria ?? ""}
            perguntasEstrategicas={payload.perguntas_por_testemunha ?? ad.perguntasEstrategicas ?? []}
            inconsistencias={ad.inconsistencias ?? []}
            // v7 fields
            inventarioProvas={ad.inventarioProvas ?? payload.inventario_provas ?? []}
            mapaDocumental={ad.mapaDocumental ?? payload.mapa_documental ?? []}
            laudos={ad.laudos ?? payload.laudos ?? []}
            imputacoes={ad.imputacoes ?? payload.imputacoes ?? []}
            acusacaoRadiografia={ad.acusacaoRadiografia ?? payload.acusacao_radiografia ?? null}
            ritoBifasico={ad.ritoBifasico ?? payload.rito_bifasico ?? null}
            preparacaoPlenario={ad.preparacaoPlenario ?? payload.preparacao_plenario ?? null}
            cadeiaCustodia={ad.cadeiaCustodia ?? payload.cadeia_custodia ?? null}
            licitudeProva={ad.licitudeProva ?? payload.licitude_prova ?? null}
            calculoPena={ad.calculoPena ?? payload.calculo_pena ?? null}
            cronogramaBeneficios={ad.cronogramaBeneficios ?? payload.cronograma_beneficios ?? null}
            mpu={ad.mpu ?? payload.mpu ?? null}
            contextoRelacional={ad.contextoRelacional ?? payload.contexto_relacional ?? null}
          />
        )}

        {/* DELITOS (Criminal areas) */}
        {tab === "delitos" && (
          <div className="px-6 py-4">
            <DelitosTab processoId={data.id} />
          </div>
        )}

        {/* INSTITUTOS (Criminal areas) */}
        {tab === "institutos" && (
          <div className="px-6 py-4">
            <InstitutosTab
              processoId={data.id}
              assistidos={data.assistidos?.map((a: any) => ({ id: a.id, nome: a.nome })) ?? []}
            />
          </div>
        )}

        {/* ATOS INFRACIONAIS (Infancia) */}
        {tab === "atos_infracionais" && (
          <div className="px-6 py-4">
            <AtosInfracionaisTab processoId={data.id} />
          </div>
        )}

        {/* MEDIDAS (Infancia) */}
        {tab === "medidas" && (
          <div className="px-6 py-4">
            <MedidasTab
              processoId={data.id}
              assistidos={data.assistidos?.map((a: any) => ({ id: a.id, nome: a.nome })) ?? []}
            />
          </div>
        )}

        {/* PESSOAS */}
        {tab === "pessoas" && (
          <PessoasTab processoId={data.id} />
        )}

        {/* CRONOLOGIA */}
        {tab === "cronologia" && (
          <CronologiaTab processoId={data.id} />
        )}

        {/* HISTORICO (demanda eventos) */}
        {tab === "historico" && (
          <div className="px-6 py-4">
            <ProcessoHistoricoView processoId={data.id} />
          </div>
        )}

        {/* REGISTROS (timeline tipada) */}
        {tab === "registros" && (
          <div className="px-6 py-4 space-y-3">
            {data.assistidos?.[0]?.id ? (
              <NovoRegistroButton
                assistidoId={data.assistidos[0].id as number}
                processoId={data.id}
                tipoDefault="atendimento"
              />
            ) : (
              <p className="text-[12px] text-neutral-500 italic">
                Vincule um assistido ao processo para criar registros.
              </p>
            )}
            <RegistrosTimeline
              processoId={data.id}
              emptyHint="Sem registros neste processo."
            />
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
