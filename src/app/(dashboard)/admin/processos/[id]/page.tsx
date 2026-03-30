"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

// New redesigned components
import { ProcessoHeader } from "@/components/processo/processo-header";
import { ProcessoTabs, type MainTab } from "@/components/processo/processo-tabs";
import { AnaliseHub } from "@/components/processo/analise-hub";
import { VinculadosCards } from "@/components/processo/vinculados-cards";

// Existing components to keep
import { DriveTabEnhanced } from "@/components/drive/DriveTabEnhanced";

// Area-specific tabs
import { DelitosTab } from "@/components/processo/delitos-tab";
import { InstitutosTab } from "@/components/processo/institutos-tab";
import { AtosInfracionaisTab } from "@/components/processo/atos-infracionais-tab";
import { MedidasTab } from "@/components/processo/medidas-tab";

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
      <div className="p-6 text-center text-zinc-500">
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
      />

      {/* 5 main tabs */}
      <ProcessoTabs
        active={tab}
        onChange={setTab}
        counts={{
          demandas: data.demandas?.length,
          documentos: data.driveFiles?.length,
          vinculados: data.processosVinculados?.length,
          agenda: data.audiencias?.length,
        }}
      />

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

        {/* DEMANDAS */}
        {tab === "demandas" && (
          <div className="px-6 py-4 space-y-1.5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Demandas ({data.demandas.length})
              </h3>
              <Link
                href={`/admin/demandas/nova?processoId=${data.id}`}
                className="h-6 w-6 flex items-center justify-center rounded text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                title="Nova Demanda"
              >
                <Plus className="h-4 w-4" />
              </Link>
            </div>
            {data.demandas.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">Nenhuma demanda</p>
            ) : (
              data.demandas.map((d) => (
                <Link
                  key={d.id}
                  href={`/admin/demandas/${d.id}`}
                  className="flex items-center gap-2 border border-zinc-100 dark:border-zinc-700 rounded px-3 py-2 hover:border-emerald-300 hover:bg-emerald-50/30 cursor-pointer transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                      {d.ato ?? d.tipoAto ?? "Demanda"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {d.defensorNome && (
                        <span className="text-xs px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded-full">
                          {d.defensorNome}
                        </span>
                      )}
                      {d.assistidoNome && (
                        <span className="text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                          {d.assistidoNome}
                        </span>
                      )}
                      {d.prazo && (
                        <span className="text-xs text-zinc-400">
                          {format(new Date(d.prazo), "dd/MM/yy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* AGENDA */}
        {tab === "agenda" && (
          <div className="px-6 py-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Audiencias ({data.audiencias.length})
              </h3>
              <Link
                href={`/admin/agenda?processoId=${data.id}`}
                className="h-6 w-6 flex items-center justify-center rounded text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                title="Agendar Audiencia"
              >
                <Plus className="h-4 w-4" />
              </Link>
            </div>
            {data.audiencias.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">
                Nenhuma audiencia registrada
              </p>
            ) : (
              data.audiencias.map((a) => (
                <div key={a.id} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {a.tipo ?? "Audiencia"}
                    </span>
                    <span
                      className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full",
                        a.dataAudiencia && new Date(a.dataAudiencia) < new Date()
                          ? "bg-zinc-100 text-zinc-500"
                          : "bg-emerald-100 text-emerald-700"
                      )}
                    >
                      {a.dataAudiencia && new Date(a.dataAudiencia) < new Date()
                        ? "Realizada"
                        : "Futura"}
                    </span>
                  </div>
                  {a.dataAudiencia && (
                    <p className="text-sm text-zinc-400 mt-0.5">
                      {format(
                        new Date(a.dataAudiencia),
                        "dd/MM/yyyy 'as' HH'h'mm",
                        { locale: ptBR }
                      )}
                    </p>
                  )}
                  {a.local && <p className="text-sm text-zinc-400">{a.local}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {/* DOCUMENTOS */}
        {tab === "documentos" && (
          <div className="px-6 py-4">
            <DriveTabEnhanced files={data.driveFiles} processoId={Number(id)} />
          </div>
        )}

        {/* VINCULADOS */}
        {tab === "vinculados" && (
          <VinculadosCards processos={(data.processosVinculados ?? []).map((p: any) => ({
            id: p.id,
            numeroAutos: p.numeroAutos ?? "",
            classeProcessual: p.classeProcessual ?? null,
            atribuicao: p.atribuicao ?? "",
          }))} />
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
      </div>
    </div>
  );
}
