"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { useState } from "react";
import { ArrowLeft, Brain, Calendar, ExternalLink, FileText, FolderOpen, Loader2, Lock, Pencil, Plus, Scale, Sun, User, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { IntelligenceTab } from "@/components/intelligence/IntelligenceTab";
import { DriveStatusBar } from "@/components/drive/DriveStatusBar";
import { DriveTabEnhanced } from "@/components/drive/DriveTabEnhanced";
import { ProcessoTimeline } from "@/components/processos/ProcessoTimeline";

type Tab = "partes" | "demandas" | "drive" | "audiencias" | "timeline" | "vinculados" | "inteligencia";

const PRESOS = [
  "CADEIA_PUBLICA",
  "PENITENCIARIA",
  "COP",
  "HOSPITAL_CUSTODIA",
  "DOMICILIAR",
  "MONITORADO",
];

export default function ProcessoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("partes");
  const [isAnalyzingProcesso, setIsAnalyzingProcesso] = useState(false);

  const [solarResult, setSolarResult] = useState<{
    cadastrado: boolean;
    ja_existia: boolean;
    atendimento_id?: string | null;
  } | null>(null);

  const cadastrarMutation = trpc.solar.cadastrarNoSolar.useMutation({
    onSuccess: (data) => {
      setSolarResult(data);
      if (data.ja_existia) {
        toast.info("Processo já está cadastrado no Solar");
      } else if (data.cadastrado) {
        toast.success("Processo cadastrado no Solar!");
      } else {
        toast.error("Não foi possível cadastrar no Solar");
      }
    },
    onError: (err) => {
      toast.error(`Erro Solar: ${err.message}`);
    },
  });

  const { data, isLoading, error } = trpc.processos.getById.useQuery(
    { id: Number(id) },
    { staleTime: 60_000 }
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-6 bg-zinc-200 rounded w-64" />
        <div className="h-4 bg-zinc-100 rounded w-40" />
        <div className="h-32 bg-zinc-100 rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-zinc-500">
        <p className="text-sm">Processo não encontrado.</p>
        <button onClick={() => router.back()} className="mt-2 text-xs text-emerald-600 hover:underline">
          &larr; Voltar
        </button>
      </div>
    );
  }

  const showVinculados = data.processosVinculados.length > 0;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "partes", label: "Partes", count: data.assistidos.length },
    { key: "demandas", label: "Demandas", count: data.demandas.length },
    { key: "drive", label: "Drive", count: data.driveFiles.length },
    { key: "audiencias", label: "Audiências", count: data.audiencias.length },
    { key: "timeline", label: "Timeline" },
    ...(showVinculados
      ? [{ key: "vinculados" as Tab, label: "Vinculados", count: data.processosVinculados.length }]
      : []),
    { key: "inteligencia", label: "Inteligência" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header Premium */}
      <div className="px-6 pt-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 mb-3 transition-colors uppercase tracking-wide font-medium"
        >
          <ArrowLeft className="h-3 w-3" /> Voltar
        </button>
        <div className="flex items-center gap-4">
          {/* Icon grande com cor por situação */}
          <div className={cn(
            "h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md",
            data.situacao === "ARQUIVADO" ? "bg-zinc-400" :
            data.situacao === "SUSPENSO" ? "bg-amber-500" :
            "bg-emerald-500"
          )}>
            <Scale className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-mono truncate">
                {data.numeroAutos ?? "Sem número"}
              </h1>
              {data.situacao && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-md font-semibold shrink-0",
                  data.situacao === "ARQUIVADO" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400" :
                  data.situacao === "SUSPENSO" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                  "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                )}>
                  {data.situacao.toLowerCase()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {data.vara && <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{data.vara}</span>}
              {data.assunto && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-600">·</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{data.assunto}</span>
                </>
              )}
            </div>
          </div>
          {/* Editar button */}
          <Link
            href={`/admin/processos/${data.id}/editar`}
            className="h-8 w-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors shrink-0"
            title="Editar processo"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Link>
          {/* Mini KPIs inline — desktop only */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-bold text-zinc-700 dark:text-zinc-300">{data.assistidos.length}</span>
              <span className="text-zinc-400">partes</span>
            </div>
            <span className="text-zinc-200 dark:text-zinc-700">|</span>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-bold text-zinc-700 dark:text-zinc-300">{data.demandas.length}</span>
              <span className="text-zinc-400">dem.</span>
            </div>
            <span className="text-zinc-200 dark:text-zinc-700">|</span>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-bold text-zinc-700 dark:text-zinc-300">{data.audiencias.length}</span>
              <span className="text-zinc-400">aud.</span>
            </div>
            <span className="text-zinc-200 dark:text-zinc-700">|</span>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-bold text-zinc-700 dark:text-zinc-300">{data.driveFiles.length}</span>
              <span className="text-zinc-400">arq.</span>
            </div>
          </div>
        </div>
        {/* Mini KPIs — mobile/tablet compact row */}
        <div className="flex lg:hidden items-center gap-3 mt-3 px-1">
          <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <Users className="w-3 h-3" />
            <span className="font-bold text-zinc-700 dark:text-zinc-300">{data.assistidos.length}</span>
            <span>partes</span>
          </div>
          <span className="text-zinc-300 dark:text-zinc-600">·</span>
          <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <FileText className="w-3 h-3" />
            <span className="font-bold text-zinc-700 dark:text-zinc-300">{data.demandas.length}</span>
            <span>dem.</span>
          </div>
          <span className="text-zinc-300 dark:text-zinc-600">·</span>
          <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <Calendar className="w-3 h-3" />
            <span className="font-bold text-zinc-700 dark:text-zinc-300">{data.audiencias.length}</span>
            <span>aud.</span>
          </div>
          <span className="text-zinc-300 dark:text-zinc-600">·</span>
          <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <FolderOpen className="w-3 h-3" />
            <span className="font-bold text-zinc-700 dark:text-zinc-300">{data.driveFiles.length}</span>
            <span>arq.</span>
          </div>
        </div>
      </div>

      {/* Solar Action */}
      <div className="px-6 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
        <Sun className="h-4 w-4 text-amber-500 shrink-0" />
        <span className="text-[11px] text-zinc-500">Solar DPEBA:</span>
        {solarResult?.ja_existia ? (
          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            Cadastrado
            {solarResult.atendimento_id && (
              <a
                href={`https://solar.defensoria.ba.def.br/atendimento/${solarResult.atendimento_id}/`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-emerald-600 hover:text-emerald-700"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </span>
        ) : solarResult?.cadastrado ? (
          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            Cadastrado agora!
            {solarResult.atendimento_id && (
              <a
                href={`https://solar.defensoria.ba.def.br/atendimento/${solarResult.atendimento_id}/`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-emerald-600 hover:text-emerald-700"
              >
                #{solarResult.atendimento_id}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </span>
        ) : (
          <button
            onClick={() => cadastrarMutation.mutate({ processoId: Number(id) })}
            disabled={cadastrarMutation.isPending}
            className="text-[11px] px-2 py-1 rounded border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
          >
            {cadastrarMutation.isPending ? "Verificando..." : "Cadastrar no Solar"}
          </button>
        )}
        {data.driveFolderId && (
          <button
            onClick={async () => {
              setIsAnalyzingProcesso(true);
              try {
                const res = await fetch("/api/ai/analyze-folder", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ processoId: Number(id) }),
                });
                if (!res.ok) {
                  const err = (await res.json().catch(() => ({}))) as { error?: string };
                  throw new Error(err?.error ?? "Falha na análise");
                }
                const json = (await res.json()) as { summary?: string };
                toast.success(json.summary ?? "Análise concluída");
              } catch (err) {
                const message = err instanceof Error ? err.message : "Erro ao analisar";
                toast.error(message);
              } finally {
                setIsAnalyzingProcesso(false);
              }
            }}
            disabled={isAnalyzingProcesso}
            className="text-[11px] px-2 py-1 rounded border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {isAnalyzingProcesso ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Brain className="h-3 w-3" />
            )}
            {isAnalyzingProcesso ? "Analisando..." : "Análise IA"}
          </button>
        )}
        <button
          onClick={() => router.push(`/admin/processos/${id}/sistematizacao`)}
          className="text-[11px] px-2 py-1 rounded border border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors flex items-center gap-1"
        >
          <Sparkles className="h-3 w-3" />
          Sistematização
        </button>
      </div>

      {/* Drive Status Bar */}
      <DriveStatusBar processoId={Number(id)} />

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-zinc-100 dark:border-zinc-800 px-6">
        {tabs.map((t) => (
          <div key={t.key} className="flex items-center">
            <button
              onClick={() => setTab(t.key)}
              className={cn(
                "px-3 py-2.5 text-[11px] font-medium border-b-2 transition-colors",
                tab === t.key
                  ? "border-emerald-500 text-emerald-700 dark:text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              )}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-1.5 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-full">
                  {t.count}
                </span>
              )}
            </button>
            {t.key === "demandas" && tab === "demandas" && (
              <Link
                href={`/admin/demandas/nova?processoId=${data.id}`}
                className="h-5 w-5 flex items-center justify-center rounded text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors -ml-1"
                title="Nova Demanda"
              >
                <Plus className="h-3 w-3" />
              </Link>
            )}
            {t.key === "audiencias" && tab === "audiencias" && (
              <Link
                href={`/admin/agenda?processoId=${data.id}`}
                className="h-5 w-5 flex items-center justify-center rounded text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors -ml-1"
                title="Agendar Audiência"
              >
                <Plus className="h-3 w-3" />
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "partes" && (
          <div className="space-y-2">
            {data.assistidos.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">Nenhuma parte vinculada</p>
            ) : (
              data.assistidos.map((a) => (
                <div
                  key={a.id}
                  onClick={() => router.push(`/admin/assistidos/${a.id}`)}
                  className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 hover:border-emerald-300 hover:bg-emerald-50/30 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-zinc-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                          {a.nome}
                        </span>
                        {a.statusPrisional && PRESOS.includes(a.statusPrisional) && (
                          <Lock className="h-3 w-3 text-rose-500 shrink-0" />
                        )}
                      </div>
                      {a.cpf && (
                        <p className="text-[10px] font-mono text-zinc-400">{a.cpf}</p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                        a.papel === "REU"
                          ? "bg-rose-100 text-rose-700"
                          : a.papel === "CORREU"
                          ? "bg-amber-100 text-amber-700"
                          : a.papel === "VITIMA"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-zinc-100 text-zinc-600"
                      )}
                    >
                      {a.papel?.toLowerCase() ?? "réu"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "demandas" && (
          <div className="space-y-1.5">
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
                    <p className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate">
                      {d.ato ?? d.tipoAto ?? "Demanda"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {d.defensorNome && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded-full">
                          {d.defensorNome}
                        </span>
                      )}
                      {d.assistidoNome && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                          {d.assistidoNome}
                        </span>
                      )}
                      {d.prazo && (
                        <span className="text-[9px] text-zinc-400">
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

        {tab === "drive" && (
          <DriveTabEnhanced
            files={data.driveFiles}
            processoId={Number(id)}
          />
        )}

        {tab === "audiencias" && (
          <div className="space-y-2">
            {data.audiencias.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">
                Nenhuma audiência registrada
              </p>
            ) : (
              data.audiencias.map((a) => (
                <div key={a.id} className="border border-zinc-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-zinc-700">
                      {a.tipo ?? "Audiência"}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full",
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
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {format(
                        new Date(a.dataAudiencia),
                        "dd/MM/yyyy 'às' HH'h'mm",
                        { locale: ptBR }
                      )}
                    </p>
                  )}
                  {a.local && <p className="text-[11px] text-zinc-400">{a.local}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "timeline" && (
          <div className="py-4">
            <ProcessoTimeline processoId={data.id} />
          </div>
        )}

        {tab === "vinculados" && (
          <div className="space-y-2">
            {data.processosVinculados.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/admin/processos/${p.id}`)}
                className="border border-zinc-200 rounded-lg p-3 hover:border-emerald-300 hover:bg-emerald-50/30 cursor-pointer transition-all"
              >
                <p className="text-[11px] font-mono text-zinc-700">
                  {p.numeroAutos ?? "Sem número"}
                </p>
                {p.vara && <p className="text-[11px] text-zinc-400 mt-0.5">{p.vara}</p>}
                {p.assunto && (
                  <p className="text-[10px] text-zinc-400 truncate">{p.assunto}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "inteligencia" && (
          <div className="space-y-4">
            <IntelligenceTab
              processoId={Number(id)}
              casoId={data.casoId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
