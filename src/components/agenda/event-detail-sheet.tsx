"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle, Check, Copy, Loader2, X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { normalizeAreaToFilter, SOLID_COLOR_MAP } from "@/lib/config/atribuicoes";
import { SheetToC, type ToCSection } from "./sheet/sheet-toc";
import { CollapsibleSection } from "./sheet/collapsible-section";
import { SheetActionFooter } from "./sheet/sheet-action-footer";
import { DepoenteCardV2 } from "./sheet/depoente-card-v2";
import { DocumentosBlock } from "./sheet/documentos-block";
import { MidiaBlock } from "./sheet/midia-block";
import { matchDepoenteAudio } from "@/lib/agenda/match-depoente-audio";
import { useAudienciaStatusActions } from "@/hooks/use-audiencia-status-actions";
import { AnalyzeCTA } from "./sheet/analyze-cta";
import { FreshnessBadge } from "./sheet/freshness-badge";
import { DepoentesStatusBlock } from "./depoentes-status-block";

function EmptyHint({ text }: { text: string }) {
  return <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">{text}</p>;
}

function extractArray(obj: Record<string, any> | null | undefined, ...keys: string[]): any[] {
  if (!obj) return [];
  const nested = (obj as any).vvd_analise_audiencia;
  for (const k of keys) {
    const val = obj[k];
    if (Array.isArray(val) && val.length > 0) return val;
    if (nested && typeof nested === "object") {
      const nv = nested[k];
      if (Array.isArray(nv) && nv.length > 0) return nv;
    }
  }
  return [];
}

function extractString(obj: Record<string, any> | null | undefined, ...keys: string[]): string | null {
  if (!obj) return null;
  const nested = (obj as any).vvd_analise_audiencia;
  for (const k of keys) {
    const val = obj[k];
    if (typeof val === "string" && val.trim().length > 0) return val.trim();
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === "string") return (val as string[]).join(", ");
    if (nested && typeof nested === "object") {
      const nv = nested[k];
      if (typeof nv === "string" && nv.trim().length > 0) return nv.trim();
    }
  }
  return null;
}

interface Props {
  evento: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenRegistro?: () => void;
}

export function EventDetailSheet({ evento, open, onOpenChange, onOpenRegistro }: Props) {
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<string | undefined>();
  const [openDepoenteIdx, setOpenDepoenteIdx] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const audienciaIdNum = useMemo(() => {
    if (!evento) return null;
    if (evento.fonte === "audiencias" && typeof evento.rawId === "number") return evento.rawId;
    if (evento.fonte === "calendar") return null;
    const raw = evento.id;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string") {
      const m = raw.match(/^audiencia-(\d+)$/);
      if (m) return parseInt(m[1], 10);
      if (/^\d+$/.test(raw)) return parseInt(raw, 10);
    }
    return null;
  }, [evento]);

  const { data: ctx, isLoading } = trpc.audiencias.getAudienciaContext.useQuery(
    { audienciaId: audienciaIdNum ?? 0 },
    {
      enabled: !!audienciaIdNum && open,
      retry: false,
      refetchInterval: (query: any) => {
        const data = query.state?.data ?? query.data;
        const status = (data as any)?.processo?.analysisStatus;
        return (status === "queued" || status === "processing") ? 5000 : false;
      },
    }
  );

  const actions = useAudienciaStatusActions(audienciaIdNum);

  const midiasQuery = trpc.drive.midiasByAssistido.useQuery(
    { assistidoId: (ctx?.assistido as any)?.id ?? 0 },
    { enabled: !!(ctx?.assistido as any)?.id && open, retry: false }
  );

  const allMediaCandidates = useMemo(() => {
    const data: any = midiasQuery.data;
    return [
      ...(data?.processos ?? []).flatMap((p: any) => p.files ?? []),
      ...(data?.ungrouped ?? []),
    ].map((f: any) => ({
      driveFileId: f.driveFileId,
      name: f.name,
      mimeType: f.mimeType,
    }));
  }, [midiasQuery.data]);

  const copyProcesso = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const dataHora = useMemo(() => {
    if (!evento) return null;
    if (evento.data && evento.horarioInicio) {
      try { return new Date(`${evento.data}T${evento.horarioInicio}`); } catch { return null; }
    }
    return evento.dataHora ? new Date(evento.dataHora) : null;
  }, [evento]);

  const processoNum = (ctx?.processo as any)?.numeroAutos ?? evento?.processo ?? null;
  const assistidoNome = ctx?.assistido?.nome ?? evento?.assistido ?? null;
  const vara = (ctx?.processo as any)?.vara ?? evento?.local ?? null;

  const ad = ctx?.analysisData;
  const caso = ctx?.caso;
  const assistidoId = (ctx?.assistido as any)?.id ?? evento?.assistidoId ?? null;
  const processoId = (ctx?.processo as any)?.id ?? evento?.processoId ?? null;
  const jaConcluida = (ctx as any)?.audiencia?.status === "concluida" || evento?.status === "concluida";
  const analysisStatus = (ctx?.processo as any)?.analysisStatus ?? null;
  const analyzedAt = (ctx?.processo as any)?.analyzedAt ?? null;

  const imputacao = extractString(ad, "imputacao", "crimes_imputados") ?? extractString(caso, "foco") ?? null;
  const fatos = caso?.narrativaDenuncia ?? extractString(ad, "resumo_executivo", "narrativa_denuncia") ?? null;
  const laudos = extractArray(ad, "laudos", "laudos_mencionados", "laudos_periciais");
  const lacunas = extractArray(ad, "vulnerabilidades_acusacao", "lacunas_probatorias", "lacunas");
  const versaoDelegacia = extractString(ad, "versao_delegacia", "versao_reu_delegacia");
  const versaoJuizo = extractString(ad, "versao_juizo", "versao_audiencia");
  const diligencias = ctx?.diligencias ?? [];
  const testemunhasDB = ctx?.testemunhas ?? [];
  const testemunhasAcusacao = extractArray(ad, "testemunhas_acusacao");
  const testemunhasDefesa = extractArray(ad, "testemunhas_defesa");

  const depoentes = useMemo(() => {
    const all = [
      ...testemunhasDB.map((t: any) => ({ ...t, _source: "db" })),
      ...testemunhasAcusacao.map((t: any) => ({ ...t, lado: "acusacao", tipo: "ACUSACAO" })),
      ...testemunhasDefesa.map((t: any) => ({ ...t, lado: "defesa", tipo: "DEFESA" })),
    ];
    const seen = new Set<string>();
    return all.filter((d) => {
      const key = (d.nome ?? "").toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [testemunhasDB, testemunhasAcusacao, testemunhasDefesa]);

  useEffect(() => {
    const firstPending = depoentes.findIndex((d: any) => d.status !== "OUVIDA");
    setOpenDepoenteIdx(firstPending >= 0 ? firstPending : (depoentes.length > 0 ? 0 : null));
  }, [audienciaIdNum, depoentes.length]);

  const resumoExecutivo = extractString(ad, "resumo_executivo");
  const contradicoes = extractArray(ad, "contradicoes", "vulnerabilidades_acusacao");
  const pendencias = extractArray(ad, "pendencias_diligencia_pre_aij", "pendencias");
  const teses = extractArray(ad, "teses_defesa", "teses").filter(Boolean);

  const tocSections: ToCSection[] = useMemo(() => {
    const s: ToCSection[] = [];
    if (imputacao) s.push({ id: "imputacao", label: "Imputação" });
    if (fatos) s.push({ id: "fatos", label: "Fatos" });
    if (versaoDelegacia || versaoJuizo) s.push({ id: "versao", label: "Versão" });
    if (depoentes.length) s.push({ id: "depoentes", label: "Depoentes", count: depoentes.length });
    if (contradicoes.length) s.push({ id: "contradicoes", label: "Contradições" });
    if (laudos.length) s.push({ id: "laudos", label: "Laudos" });
    if (diligencias.length) s.push({ id: "investigacao", label: "Investigação" });
    if (pendencias.length) s.push({ id: "pendencias", label: "Pendências" });
    if (teses.length) s.push({ id: "teses", label: "Teses" });
    s.push({ id: "documentos", label: "Docs" });
    s.push({ id: "midia", label: "Mídia" });
    return s;
  }, [imputacao, fatos, versaoDelegacia, versaoJuizo, depoentes.length, contradicoes.length,
      laudos.length, diligencias.length, pendencias.length, teses.length]);

  useEffect(() => {
    if (!open || !scrollContainerRef.current) return;
    const root = scrollContainerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.getAttribute("data-section-id") ?? undefined);
      },
      { root, rootMargin: "-10% 0px -70% 0px", threshold: 0 }
    );
    const nodes = root.querySelectorAll("[data-section-id]");
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [open, tocSections]);

  const handleJump = (id: string) => {
    const root = scrollContainerRef.current;
    if (!root) return;
    const target = root.querySelector(`[data-section-id="${id}"]`) as HTMLElement | null;
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!evento) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[480px] md:w-[560px] p-0 flex flex-col gap-0 border-l-0 outline-none bg-white dark:bg-neutral-950 rounded-l-2xl sm:rounded-l-none shadow-2xl [&>button:first-of-type]:hidden"
      >
        <SheetTitle className="sr-only">Detalhes do evento</SheetTitle>

        <div className="bg-neutral-900 dark:bg-neutral-950 text-white backdrop-blur-md px-4 py-2.5 flex items-center justify-between">
          <SheetHeader className="p-0">
            <SheetTitle className="text-[13px] font-semibold tracking-tight text-white">Evento</SheetTitle>
          </SheetHeader>
          <button
            onClick={() => onOpenChange(false)}
            className="w-7 h-7 rounded-lg hover:bg-neutral-800 flex items-center justify-center cursor-pointer"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          <SheetToC sections={tocSections} activeId={activeSection} onJump={handleJump} />
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          {(() => {
            const filterKey = normalizeAreaToFilter(evento.atribuicaoKey || evento.atribuicao || "");
            const atribColor = SOLID_COLOR_MAP[filterKey] || "#a1a1aa";
            return (
              <div
                className="mx-3 mt-3 mb-3 px-4 py-4 rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800 border-l-[3px]"
                style={{ borderLeftColor: atribColor }}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                      {(assistidoNome || evento.titulo || "").split(" ").filter(Boolean).slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    {assistidoNome && (
                      <h2 className="text-[15px] font-semibold text-neutral-800 dark:text-neutral-100 leading-tight truncate">
                        {assistidoNome}
                      </h2>
                    )}
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {processoNum && (
                        <button
                          onClick={(e) => { e.stopPropagation(); copyProcesso(processoNum); }}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/50 dark:bg-neutral-700/60 hover:bg-white/80 dark:hover:bg-neutral-700 cursor-pointer"
                          title="Copiar número"
                        >
                          <span className="font-mono text-[11px] tabular-nums text-neutral-600 dark:text-neutral-400">{processoNum}</span>
                          {copied ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5 text-neutral-500" />}
                        </button>
                      )}
                      {dataHora && (
                        <span className="text-[11px] text-neutral-600 dark:text-neutral-500 tabular-nums">
                          {format(dataHora, "HH:mm", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                    {vara && (
                      <p className="text-[10px] text-neutral-500 mt-1.5">
                        {vara}
                        {evento.atribuicao && ` · ${evento.atribuicao}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="px-3 pb-4 space-y-2.5">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
              </div>
            )}

            {!isLoading && resumoExecutivo && (
              <CollapsibleSection id="resumo" label="Resumo Executivo" defaultOpen>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">{resumoExecutivo}</p>
              </CollapsibleSection>
            )}

            {!isLoading && (
              <>
                {!imputacao && !fatos && laudos.length === 0 && contradicoes.length === 0 && (
                  <CollapsibleSection id="analise-ia" label="Análise IA" defaultOpen>
                    <div className="space-y-2">
                      <EmptyHint text="Nenhuma análise IA executada ainda." />
                      <AnalyzeCTA
                        assistidoId={typeof assistidoId === "number" ? assistidoId : null}
                        processoId={typeof processoId === "number" ? processoId : null}
                        analysisStatus={analysisStatus}
                      />
                    </div>
                  </CollapsibleSection>
                )}

                <CollapsibleSection id="imputacao" label="Imputação" defaultOpen>
                  {analyzedAt && (
                    <div className="flex justify-end mb-1">
                      <FreshnessBadge analyzedAt={analyzedAt} />
                    </div>
                  )}
                  {imputacao ? (
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{imputacao}</p>
                  ) : (
                    <div className="space-y-2">
                      <EmptyHint text="Imputação não extraída — rode a análise IA." />
                      <AnalyzeCTA
                        assistidoId={typeof assistidoId === "number" ? assistidoId : null}
                        processoId={typeof processoId === "number" ? processoId : null}
                        analysisStatus={analysisStatus}
                      />
                    </div>
                  )}
                </CollapsibleSection>

                <CollapsibleSection id="fatos" label="Fatos (Denúncia)" defaultOpen>
                  {analyzedAt && (
                    <div className="flex justify-end mb-1">
                      <FreshnessBadge analyzedAt={analyzedAt} />
                    </div>
                  )}
                  {fatos ? (
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{fatos}</p>
                  ) : (
                    <div className="space-y-2">
                      <EmptyHint text="Narrativa da denúncia não disponível." />
                      <AnalyzeCTA
                        assistidoId={typeof assistidoId === "number" ? assistidoId : null}
                        processoId={typeof processoId === "number" ? processoId : null}
                        analysisStatus={analysisStatus}
                      />
                    </div>
                  )}
                </CollapsibleSection>

                {(versaoDelegacia || versaoJuizo) && (
                  <CollapsibleSection id="versao" label="Versão do Acusado">
                    {analyzedAt && (
                      <div className="flex justify-end mb-1">
                        <FreshnessBadge analyzedAt={analyzedAt} />
                      </div>
                    )}
                    {versaoDelegacia && (
                      <div className="mb-2">
                        <div className="text-[10px] font-semibold text-neutral-500 mb-1">Delegacia</div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{versaoDelegacia}</p>
                      </div>
                    )}
                    {versaoJuizo && (
                      <div>
                        <div className="text-[10px] font-semibold text-neutral-500 mb-1">Em Juízo</div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{versaoJuizo}</p>
                      </div>
                    )}
                  </CollapsibleSection>
                )}

                <CollapsibleSection id="depoentes" label="Depoentes" count={depoentes.length} defaultOpen>
                  {depoentes.length > 0 && (
                    <DepoentesStatusBlock
                      depoentes={depoentes.map((d: any, i: number) => ({
                        id: d.id ?? `${d.nome ?? d.name ?? "d"}-${i}`,
                        nome: d.nome ?? d.name,
                        tipo:
                          d.tipo === "ACUSACAO" ||
                          d.tipo === "DEFESA" ||
                          d.tipo === "COMUM"
                            ? "testemunha"
                            : d.tipo,
                        statusIntimacao: d.statusIntimacao,
                        intimado: d.intimado,
                        jaOuvido: d.jaOuvido,
                      }))}
                      mode="readonly"
                      className="mb-2"
                    />
                  )}
                  {depoentes.length > 0 ? (
                    <div className="space-y-2">
                      {depoentes.map((d: any, i: number) => (
                        <DepoenteCardV2
                          key={d.id ?? `${i}-${d.nome}`}
                          depoente={{
                            ...d,
                            audioDriveFileId: matchDepoenteAudio(d.nome ?? "", allMediaCandidates, (d as any).audioDriveFileId ?? null),
                          }}
                          isOpen={openDepoenteIdx === i}
                          onToggle={() => setOpenDepoenteIdx(openDepoenteIdx === i ? null : i)}
                          variant="sheet"
                          onMarcarOuvido={(id, sintese) => actions.marcarOuvido.mutate({ depoenteId: id, sinteseJuizo: sintese })}
                          onRedesignar={(id) => actions.redesignarDep.mutate({ depoenteId: id })}
                          onAdicionarPergunta={() => toast.info("Em breve: abrir modal de perguntas")}
                          onAbrirAudio={() => {
                            const audioId = matchDepoenteAudio(d.nome ?? "", allMediaCandidates, (d as any).audioDriveFileId ?? null);
                            if (!audioId) {
                              toast.info("Áudio não encontrado para este depoente");
                              return;
                            }
                            const root = scrollContainerRef.current;
                            const target = root?.querySelector('[data-section-id="midia"]');
                            if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
                            toast.success("Rolando para o áudio…");
                          }}
                          assistidoId={typeof assistidoId === "number" ? assistidoId : null}
                        />
                      ))}
                    </div>
                  ) : <EmptyHint text="Nenhum depoente cadastrado." />}
                </CollapsibleSection>

                {contradicoes.length > 0 && (
                  <CollapsibleSection id="contradicoes" label="Contradições" count={contradicoes.length}>
                    {analyzedAt && (
                      <div className="flex justify-end mb-1">
                        <FreshnessBadge analyzedAt={analyzedAt} />
                      </div>
                    )}
                    <ul className="space-y-1.5">
                      {contradicoes.map((c: any, i: number) => {
                        const text = typeof c === "string" ? c : c.descricao ?? c.contradicao ?? JSON.stringify(c);
                        return (
                          <li key={i} className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-400/70" />
                            <span>{text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </CollapsibleSection>
                )}

                {laudos.length > 0 && (
                  <CollapsibleSection id="laudos" label="Laudos e Perícias" count={laudos.length}>
                    {analyzedAt && (
                      <div className="flex justify-end mb-1">
                        <FreshnessBadge analyzedAt={analyzedAt} />
                      </div>
                    )}
                    <ul className="space-y-1">
                      {laudos.map((l: any, i: number) => (
                        <li key={i} className="text-xs text-neutral-600 dark:text-neutral-400">
                          • {typeof l === "string" ? l : l.nome ?? l.titulo ?? JSON.stringify(l)}
                        </li>
                      ))}
                    </ul>
                    {lacunas.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800/40">
                        <p className="text-[10px] font-medium text-neutral-400 mb-1">Lacunas probatórias</p>
                        <ul className="space-y-1">
                          {lacunas.map((l: any, i: number) => (
                            <li key={i} className="text-xs text-neutral-600 dark:text-neutral-400">
                              • {typeof l === "string" ? l : l.descricao ?? JSON.stringify(l)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CollapsibleSection>
                )}

                {diligencias.length > 0 && (
                  <CollapsibleSection id="investigacao" label="Investigação Defensiva" count={diligencias.length}>
                    <ul className="space-y-2">
                      {diligencias.map((d: any) => (
                        <li key={d.id} className="text-xs text-neutral-700 dark:text-neutral-300">
                          <span className="font-medium">{d.titulo}</span>
                          {d.resultado && <p className="text-neutral-500 mt-0.5">{d.resultado}</p>}
                        </li>
                      ))}
                    </ul>
                  </CollapsibleSection>
                )}

                {pendencias.length > 0 && (
                  <CollapsibleSection id="pendencias" label="Pendências" count={pendencias.length}>
                    {analyzedAt && (
                      <div className="flex justify-end mb-1">
                        <FreshnessBadge analyzedAt={analyzedAt} />
                      </div>
                    )}
                    <ul className="space-y-1">
                      {pendencias.map((p: any, i: number) => {
                        const text = typeof p === "string" ? p : p.descricao ?? p.pendencia ?? JSON.stringify(p);
                        return (
                          <li key={i} className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-400/70" />
                            <span>{text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </CollapsibleSection>
                )}

                {teses.length > 0 && (
                  <CollapsibleSection id="teses" label="Teses" count={teses.length}>
                    {analyzedAt && (
                      <div className="flex justify-end mb-1">
                        <FreshnessBadge analyzedAt={analyzedAt} />
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {teses.map((t: any, i: number) => {
                        const text = typeof t === "string" ? t : t.tese ?? t.descricao ?? JSON.stringify(t);
                        return <Badge key={i} variant="outline" className="text-[11px]">{text}</Badge>;
                      })}
                    </div>
                  </CollapsibleSection>
                )}

                <CollapsibleSection id="documentos" label="Documentos" defaultOpen>
                  <DocumentosBlock
                    processoId={typeof processoId === "number" ? processoId : null}
                    assistidoId={typeof assistidoId === "number" ? assistidoId : null}
                  />
                </CollapsibleSection>

                {/* Mídia */}
                <CollapsibleSection id="midia" label="Mídia">
                  <MidiaBlock
                    assistidoId={typeof assistidoId === "number" ? assistidoId : null}
                    atendimentosComAudio={
                      ((ctx?.atendimentos as any[]) ?? [])
                        .filter((a: any) => !!a.audioDriveFileId)
                        .map((a: any) => ({
                          id: a.id,
                          data: a.dataAtendimento ?? a.data ?? new Date(),
                          audioDriveFileId: a.audioDriveFileId,
                          transcricaoResumo: a.transcricaoResumo,
                        }))
                    }
                  />
                </CollapsibleSection>
              </>
            )}
          </div>
        </div>

        <SheetActionFooter
          audienciaId={audienciaIdNum}
          jaConcluida={jaConcluida}
          onAbrirRegistroCompleto={() => onOpenRegistro?.()}
        />
      </SheetContent>
    </Sheet>
  );
}
