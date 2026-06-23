"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SHEET_STYLE, statusAudienciaInfo } from "@/lib/config/design-tokens";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle, CalendarClock, Check, ChevronDown, Copy, Edit3, Loader2, Scale, Trash2, X, ArrowUpRight, Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { detectarSubtipo, SUBTIPO_CONFIG, corBadge } from "./registro-audiencia/subtipo-audiencia";
import { Fragment, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { resolverManifesto, type SecaoId } from "@/components/agenda/sheet/secoes-manifest";
import { normalizarMotivo } from "@/components/agenda/sheet/motivo-designacao";
import { useMedidasVigentes } from "@/components/mpu/use-medidas-vigentes";
import { MotivoDesignacaoSecao } from "@/components/agenda/sheet/secoes/MotivoDesignacaoSecao";
import { RequerimentoDefesaSecao } from "@/components/agenda/sheet/secoes/RequerimentoDefesaSecao";
import { ResumoGeralSecao } from "@/components/agenda/sheet/secoes/ResumoGeralSecao";
import { IntimacaoSecao } from "@/components/agenda/sheet/secoes/IntimacaoSecao";
import { MedidasVigentesSecao } from "@/components/agenda/sheet/secoes/MedidasVigentesSecao";
import { CitacaoText } from "@/components/agenda/sheet/CitacaoText";
import { useSheetWidthResize } from "@/hooks/use-sheet-width-resize";
import { toast } from "sonner";
import { normalizeAreaToFilter, SOLID_COLOR_MAP } from "@/lib/config/atribuicoes";
import { SheetToC, type ToCSection } from "./sheet/sheet-toc";
import { CollapsibleSection } from "./sheet/collapsible-section";
import { SheetActionFooter } from "./sheet/sheet-action-footer";
import { DepoenteCardV2 } from "./sheet/depoente-card-v2";
import { DocumentosBlock } from "./sheet/documentos-block";
import { AutosModalViewer } from "./sheet/autos-modal-viewer";
import { MidiaBlock } from "./sheet/midia-block";
import { DossieV2Block } from "./sheet/dossie-v2-block";
import { CautelaresPanel } from "@/components/cautelares/cautelares-panel";
import { PrisaoPreventivaPanel } from "@/components/cautelares/prisao-preventiva-panel";
import { AtaAudienciaBlock } from "@/components/agenda/sheet/ata-audiencia-block";
import { hasDossieV2 } from "@/lib/agenda/dossie-v2";
import { derivarStatusOitiva } from "@/lib/agenda/depoente-status";
import { extrairNumPje } from "@/lib/agenda/extrair-num-pje";
import { matchDepoenteAudio } from "@/lib/agenda/match-depoente-audio";
import { useAudienciaStatusActions } from "@/hooks/use-audiencia-status-actions";
import { AnalyzeCTA } from "./sheet/analyze-cta";
import { FreshnessBadge } from "./sheet/freshness-badge";
import { cn } from "@/lib/utils";
import { nomeVaraExibicao } from "@/lib/format/nome-vara";
import { iniciaisNome } from "@/lib/format/iniciais";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ordenarNotasDesc } from "@/lib/agenda/anotacoes-rapidas";
import { parseAnotacaoAudiencia, type AnotacaoAudienciaParsed } from "@/lib/agenda/parse-anotacao-audiencia";
import { EventoDetectadoBanner } from "./sheet/evento-detectado-banner";
import { AguardandoNovaDataBadge } from "./aguardando-nova-data-badge";
import { PessoaChip, PessoaSheet, BannerInteligencia } from "@/components/pessoas";
import { usePessoaSignals } from "@/hooks/use-pessoa-signals";
import { computeDotLevel } from "@/lib/pessoas/compute-dot-level";

function EmptyHint({ text }: { text: string }) {
  return <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">{text}</p>;
}

const INTIMACAO_TONE: Record<string, string> = {
  intimado: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  dispensada: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  pendente: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  nao_intimado: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  desconhecido: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};
const INTIMACAO_LABEL: Record<string, string> = {
  intimado: "intimado", dispensada: "dispensada", pendente: "pendente",
  nao_intimado: "não intimado", desconhecido: "intimação a verificar",
};
// MOTIVO_LABEL foi para @/lib/agenda/depoente-status (fonte única, testada).
const TIPO_DEP_LABEL: Record<string, string> = {
  ofendida: "ofendida", testemunha_acusacao: "test. acusação",
  testemunha_defesa: "test. defesa", informante: "informante",
  interrogando: "interrogando", perito: "perito",
};

/** Painel de status dos depoentes — quem será ouvido, intimação e motivo. */
function PainelDepoentesStatus({ depoentes, onAbrirDepoimento }: { depoentes: any[]; onAbrirDepoimento?: (d: any) => void }) {
  if (!depoentes?.length) return null;
  const stats = depoentes.map(derivarStatusOitiva);
  const ouvidosJuizo = stats.filter((s) => s.ouvidoJuizo).length;
  const faltamJuizo = stats.filter((s) => s.faltaJuizo).length;
  const naoIntimados = stats.filter((s) => s.faltaJuizo && s.intimacao === "nao_intimado").length;
  const aVerificar = stats.filter((s) => s.faltaJuizo && s.intimacao === "desconhecido").length;
  return (
    <div className="rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 overflow-hidden mb-2">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-900/60 text-[10px] font-medium text-neutral-500 flex-wrap">
        <span>{depoentes.length} depoentes</span>
        {ouvidosJuizo > 0 && <span className="text-emerald-600 dark:text-emerald-400">· {ouvidosJuizo} ouvido(s) em juízo</span>}
        {faltamJuizo > 0 && <span>· {faltamJuizo} a ouvir</span>}
        {naoIntimados > 0 && <span className="text-rose-600 dark:text-rose-400">· {naoIntimados} não intimado(s)</span>}
        {aVerificar > 0 && <span className="text-amber-600 dark:text-amber-400">· {aVerificar} a verificar</span>}
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
        {depoentes.map((d, i) => {
          const st = stats[i];
          const temPonto = !!(onAbrirDepoimento && (d.depoimento_ip || d.depoimento_juizo));
          return (
            <div
              key={`${i}-${d.nome}`}
              onClick={temPonto ? () => onAbrirDepoimento!(d) : undefined}
              title={temPonto ? "Abrir o depoimento no PDF dos autos" : undefined}
              className={cn(
                "flex items-start gap-2 px-2.5 py-1.5",
                temPonto && "cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors",
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-200 truncate">{d.nome}</span>
                  {temPonto && <span className="text-[9px] text-emerald-500" aria-hidden>↗</span>}
                  {TIPO_DEP_LABEL[d.tipo] && (
                    <span className="text-[9px] text-neutral-400">{TIPO_DEP_LABEL[d.tipo]}</span>
                  )}
                </div>
                {(st.motivoLabel || d.observacao) && (
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-snug mt-0.5">
                    {st.motivoLabel ?? d.observacao}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                {/* Delegacia */}
                <span className={cn(
                  "text-[8.5px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap",
                  st.ouvidoDelegacia
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500",
                )}>
                  Delegacia {st.ouvidoDelegacia ? "✓" : "—"}
                </span>
                {/* Juízo: ouvido, ou status de intimação */}
                {st.ouvidoJuizo ? (
                  <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 whitespace-nowrap">
                    Juízo ✓{d.ja_ouvido?.data ? ` ${d.ja_ouvido.data}` : ""}
                  </span>
                ) : (
                  <span className={cn(
                    "text-[8.5px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap",
                    INTIMACAO_TONE[st.intimacao] ?? INTIMACAO_TONE.desconhecido,
                  )}>
                    Juízo: {INTIMACAO_LABEL[st.intimacao] ?? st.intimacao}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Banner do rito — foco + lembretes específicos do subtipo da audiência. */
function SubtipoBanner({ subtipo, processoNum }: { subtipo: ReturnType<typeof detectarSubtipo>; processoNum?: string | null }) {
  const cfg = SUBTIPO_CONFIG[subtipo];
  const [open, setOpen] = useState(false);
  if (!cfg || subtipo === "indefinido") return null;
  const cores = corBadge(cfg.cor);
  const Icon = cfg.icon;

  // Sessão do Júri → direciona ao Cockpit em vez da preparação padrão.
  if (cfg.direcionaCockpit) {
    return (
      <div className={cn("rounded-xl border p-3 mb-3", cores.border, cores.bgSubtle)}>
        <div className="flex items-start gap-2.5">
          <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", cores.text)} />
          <div className="flex-1 min-w-0">
            <div className={cn("text-xs font-semibold", cores.text)}>{cfg.label}</div>
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-snug mt-0.5">
              Esta é uma sessão de plenário — a preparação e o acompanhamento ao vivo ficam no Cockpit do Júri.
            </p>
            <Link
              href={`/admin/juri/cockpit${processoNum ? `?processo=${encodeURIComponent(processoNum)}` : ""}`}
              className={cn("inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white transition-opacity hover:opacity-90", cores.bg)}
            >
              Abrir Cockpit do Júri
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border p-3 mb-3", cores.border, cores.bgSubtle)}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-start gap-2.5 text-left cursor-pointer">
        <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", cores.text)} />
        <div className="flex-1 min-w-0">
          <div className={cn("text-xs font-semibold", cores.text)}>{cfg.label}</div>
          <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-snug mt-0.5">{cfg.foco}</p>
        </div>
        {cfg.lembretes.length > 0 && (
          <span className={cn("flex items-center gap-0.5 text-[9px] font-medium shrink-0 mt-0.5 tabular-nums transition-colors", open ? cores.text : "text-neutral-400")}>
            {cfg.lembretes.length} lembrete{cfg.lembretes.length > 1 ? "s" : ""}
            <ChevronDown className={cn("w-2.5 h-2.5 transition-transform", open && "rotate-180")} />
          </span>
        )}
      </button>
      {open && cfg.lembretes.length > 0 && (
        <ul className="mt-2 pl-1 space-y-1 border-t border-dashed border-neutral-200 dark:border-neutral-700 pt-2">
          {cfg.lembretes.map((l, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[10.5px] text-neutral-600 dark:text-neutral-400 leading-snug">
              <Lightbulb className={cn("w-2.5 h-2.5 mt-0.5 shrink-0", cores.text)} />
              <span>{l}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Síntese processual — linha do tempo ato + data. */
function SinteseProcessual({ eventos }: { eventos: any[] }) {
  if (!eventos?.length) return null;
  return (
    <ol className="relative border-l border-neutral-200 dark:border-neutral-800 ml-1 space-y-2.5 pl-3">
      {eventos.map((e, i) => (
        <li key={`${i}-${e.data}`} className="relative">
          <span className="absolute -left-[15px] top-1 text-[10px] leading-none">{e.marcador ?? "⚪"}</span>
          <div className="text-[10px] font-mono tabular-nums text-neutral-400">{e.data ?? "—"}</div>
          <div className="text-[11px] text-neutral-700 dark:text-neutral-300 leading-snug">{e.evento}</div>
        </li>
      ))}
    </ol>
  );
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
  onDuplicate?: (evento: any) => void;
}

export function EventDetailSheet({ evento, open, onOpenChange, onOpenRegistro, onDuplicate }: Props) {
  const [copied, setCopied] = useState(false);
  // Modal de autos encaixado à esquerda do sheet (não altera a largura do sheet).
  const [autosModalId, setAutosModalId] = useState<string | null>(null);
  // Termo de busca ao abrir a doca (deep-link de um depoimento ao seu ponto).
  const [docaSearch, setDocaSearch] = useState<string | null>(null);
  // Largura (px) que o sheet assume enquanto o modal está aberto. O modal ocupa
  // todo o espaço à esquerda até a borda do sheet (right = sheetW → encaixe perfeito).
  // Ajustável pela alça de arraste e persistida — hook compartilhado com o sheet
  // de Atendimentos (useSheetWidthResize).
  const {
    sheetW,
    dragging: draggingDivider,
    startDrag: startDividerDrag,
    reset: resetSheetW,
    pct: pctSheetW,
    isMobile: sheetIsMobile,
  } = useSheetWidthResize({ storageKey: "ombuds_autos_modal_split_v2" });
  const [verFatosLiteral, setVerFatosLiteral] = useState(false);
  const [activeSection, setActiveSection] = useState<string | undefined>();
  const [openDepoenteIdx, setOpenDepoenteIdx] = useState<number | null>(null);
  const [deteccaoPendente, setDeteccaoPendente] = useState<AnotacaoAudienciaParsed | null>(null);
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

  const utils = trpc.useUtils();
  const setPatrocinio = trpc.processos.setPatrocinio.useMutation({
    onSuccess: () => {
      if (audienciaIdNum) utils.audiencias.getAudienciaContext.invalidate({ audienciaId: audienciaIdNum });
    },
    onError: (e) => toast.error(e.message),
  });

  // Ajuste manual da pendência "aguardando nova data" (clique no badge).
  const resolverPendencia = trpc.audiencias.update.useMutation({
    onSuccess: () => {
      toast.success("Pendência resolvida manualmente");
      if (audienciaIdNum) utils.audiencias.getAudienciaContext.invalidate({ audienciaId: audienciaIdNum });
    },
    onError: (e) => toast.error(e.message),
  });

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

  // Subtipo do rito — define o foco/lembretes do banner e quais seções de
  // instrução fazem sentido (AIJ/PAP/plenário = completas; justificação/
  // admonitória/ANPP = enxutas, sem ordem do art. 400).
  const subtipo = useMemo(
    () => detectarSubtipo(
      evento?.tipoAudiencia ?? evento?.tipo,
      (ctx?.processo as any)?.classeProcessual ?? evento?.classeProcessual,
      evento?.atribuicaoKey ?? evento?.atribuicao ?? (ctx?.processo as any)?.atribuicao,
    ),
    [evento, ctx],
  );
  const subtipoCfg = SUBTIPO_CONFIG[subtipo];

  const dataHora = useMemo(() => {
    if (!evento) return null;
    if (evento.data && evento.horarioInicio) {
      try { return new Date(`${evento.data}T${evento.horarioInicio}`); } catch { return null; }
    }
    return evento.dataHora ? new Date(evento.dataHora) : null;
  }, [evento]);

  const processoNum = (ctx?.processo as any)?.numeroAutos ?? evento?.processo ?? null;
  const assistidoNome = ctx?.assistido?.nome ?? evento?.assistido ?? null;
  const varaRaw = (ctx?.processo as any)?.vara ?? evento?.local ?? null;
  const vara = nomeVaraExibicao(varaRaw);

  // Cor sólida da atribuição — fonte única de identidade visual (avatar, faixa
  // do header, rótulo). Calculada aqui para o header e o card compartilharem.
  const atribFilterKey = normalizeAreaToFilter(evento?.atribuicaoKey || evento?.atribuicao || "");
  const atribColor = SOLID_COLOR_MAP[atribFilterKey] || "#a1a1aa";

  const ad = ctx?.analysisData;
  const dossieV2 = hasDossieV2(ad) ? (ad as any).dossie : null;
  const anotacoesRapidas = ordenarNotasDesc((ctx as any)?.audiencia?.anotacoesRapidas);
  const autoresAnotacoes: Record<number, string> = (ctx as any)?.autoresAnotacoes ?? {};
  const caso = ctx?.caso;
  const assistidoId = (ctx?.assistido as any)?.id ?? evento?.assistidoId ?? null;
  const processoId = (ctx?.processo as any)?.id ?? evento?.processoId ?? null;

  // Autos do processo (p/ o deep-link do depoente abrir a doca no ponto).
  const autosDeeplinkQuery = trpc.drive.autosDoProcesso.useQuery(
    { processoId: typeof processoId === "number" ? processoId : 0, assistidoId: typeof assistidoId === "number" ? assistidoId : undefined },
    { enabled: typeof processoId === "number" && open },
  );
  const primaryAutosDriveId = useMemo(() => {
    const d = autosDeeplinkQuery.data as any;
    const cand = [...(d?.desteProcesso ?? []), ...((d?.correlacionados ?? []).flatMap((g: any) => g.files ?? []))];
    return cand.find((f: any) => f?.driveFileId && f?.mimeType === "application/pdf")?.driveFileId
      ?? cand.find((f: any) => f?.driveFileId)?.driveFileId ?? null;
  }, [autosDeeplinkQuery.data]);

  // Abre a doca do PDF buscando o "Num. X" do depoimento (cai no ponto do documento).
  const abrirDepoimentoNoPonto = (d: any) => {
    if (!primaryAutosDriveId) return;
    const num = extrairNumPje(d?.depoimento_ip || d?.depoimento_juizo);
    setAutosModalId(primaryAutosDriveId);
    setDocaSearch(num ? `Num. ${num}` : null);
  };
  const jaConcluida = (ctx as any)?.audiencia?.status === "concluida" || evento?.status === "concluida";
  const analysisStatus = (ctx?.processo as any)?.analysisStatus ?? null;
  const analyzedAt = (ctx?.processo as any)?.analyzedAt ?? null;
  const tipoPatrocinio: "DEFENSORIA" | "PARTICULAR" =
    ((ctx?.processo as any)?.tipoPatrocinio as "DEFENSORIA" | "PARTICULAR") ?? "DEFENSORIA";
  const advogadoParticular: string | null =
    (ctx?.processo as any)?.advogadoParticular ?? null;

  const imputacao = extractString(ad, "imputacao", "crimes_imputados") ?? extractString(caso, "foco") ?? null;
  const fatos = caso?.narrativaDenuncia ?? extractString(ad, "resumo_executivo", "narrativa_denuncia") ?? null;
  const fatosLiteral = extractString(ad, "narrativa_denuncia_literal");
  const laudos = extractArray(ad, "laudos", "laudos_mencionados", "laudos_periciais");
  const lacunas = extractArray(ad, "vulnerabilidades_acusacao", "lacunas_probatorias", "lacunas");
  const versaoDelegacia = extractString(ad, "versao_delegacia", "versao_reu_delegacia");
  const versaoJuizo = extractString(ad, "versao_juizo", "versao_audiencia");
  const diligencias = ctx?.diligencias ?? [];
  const cronologia = extractArray(ad, "cronologia");
  const depoentesDetalhe = extractArray(ad, "depoentes_detalhe");
  const testemunhasDB = ctx?.testemunhas ?? [];
  const testemunhasAcusacao = extractArray(ad, "testemunhas_acusacao");
  const testemunhasDefesa = extractArray(ad, "testemunhas_defesa");
  // Campos por subtipo
  const relatoVitima = extractString(ad, "relato_vitima", "representacao_resumo");
  const relatoAssistido = (ad as any)?.relato_assistido ?? null;
  const relatoAtendimento = relatoAssistido?.atendimento ?? extractString(ad, "relato_atendimento");
  const medidasProtetivas = extractArray(ad, "medidas_protetivas");
  const medidasVigentesArr = extractArray(ad, "medidas_protetivas_vigentes");
  // Campos do manifesto por subtipo (Justificação e novas seções)
  const motivo = normalizarMotivo((ad as any)?.motivo_designacao);
  const resumoAudiencia = extractString(ad, "resumo_audiencia");
  const requerimentoDefesa = extractString(ad, "requerimento_defesa");
  const intimacaoTexto = dossieV2?.intimacao ?? null;
  const { qtd: qtdMedidasBanco } = useMedidasVigentes({ processoId: typeof processoId === "number" ? processoId : null });
  const medidasAnalysis = medidasProtetivas.length ? medidasProtetivas : medidasVigentesArr;

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

  const participacoesQuery = trpc.pessoas.getParticipacoesDoProcesso.useQuery(
    { processoId: processoId ?? 0 },
    { enabled: !!processoId && open, retry: false },
  );

  const participacoesDoProcesso = participacoesQuery.data ?? [];
  const pessoaIdsDoProcesso = participacoesDoProcesso.map((p: any) => p.pessoaId);

  const participacaoByPessoaId = useMemo(() => {
    const m = new Map<number, any>();
    for (const p of participacoesDoProcesso) m.set(p.pessoaId, p);
    return m;
  }, [participacoesDoProcesso]);

  const pessoaIdByTestemunhaId = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of participacoesDoProcesso) {
      if (p.testemunhaId) m.set(p.testemunhaId, p.pessoaId);
    }
    return m;
  }, [participacoesDoProcesso]);

  const { getSignal } = usePessoaSignals(pessoaIdsDoProcesso);

  // Avatares (rostos) das pessoas do processo → para os cards de depoentes.
  const avataresQuery = trpc.pessoas.getAvatares.useQuery(
    { pessoaIds: pessoaIdsDoProcesso },
    { enabled: pessoaIdsDoProcesso.length > 0 && open },
  );
  const avatarByPessoaId = useMemo(() => {
    const m = new Map<number, string>();
    for (const a of (avataresQuery.data ?? [])) {
      if (a.avatarDataUrl) m.set(a.pessoaId, a.avatarDataUrl);
    }
    return m;
  }, [avataresQuery.data]);

  const signalsComNome = useMemo(() => {
    return pessoaIdsDoProcesso
      .map((id: number) => getSignal(id))
      .filter((s): s is NonNullable<typeof s> => !!s);
  }, [pessoaIdsDoProcesso, getSignal]);

  const [pessoaSheetId, setPessoaSheetId] = useState<number | null>(null);
  const [advogadoDraft, setAdvogadoDraft] = useState("");

  const getNome = (pessoaId: number) => {
    const t = depoentes.find((d: any) => {
      const tid = d.id;
      return pessoaIdByTestemunhaId.get(tid) === pessoaId;
    });
    return t?.nome ?? `Pessoa #${pessoaId}`;
  };

  useEffect(() => {
    const firstPending = depoentes.findIndex((d: any) => d.status !== "OUVIDA");
    setOpenDepoenteIdx(firstPending >= 0 ? firstPending : (depoentes.length > 0 ? 0 : null));
  }, [audienciaIdNum, depoentes.length]);

  // Fecha o modal de autos ao trocar de evento ou fechar o sheet.
  useEffect(() => { setAutosModalId(null); setDocaSearch(null); }, [audienciaIdNum, open]);

  useEffect(() => {
    setAdvogadoDraft(advogadoParticular ?? "");
  }, [advogadoParticular, processoId]);

  const resumoExecutivo = extractString(ad, "resumo_executivo");
  const contradicoes = extractArray(ad, "contradicoes", "vulnerabilidades_acusacao");
  const pendencias = extractArray(ad, "pendencias_diligencia_pre_aij", "pendencias");
  const teses = extractArray(ad, "teses_defesa", "teses").filter(Boolean);

  // Manifesto de seções por subtipo: a ordem/conjunto vem daqui (Justificação
  // usa SECOES_JUSTIFICACAO; demais ritos = SECOES_DEFAULT). O corpo e o ToC
  // iteram a MESMA fonte, garantindo paridade visual.
  const manifesto = resolverManifesto(SUBTIPO_CONFIG[subtipo]);

  const secoesMap: Record<SecaoId, { label: string; temDado: boolean; count?: number; node: ReactNode }> = {
    "resumo": {
      label: "Resumo Executivo",
      temDado: !!resumoExecutivo,
      node: (
        <CollapsibleSection id="resumo" label="Resumo Executivo" defaultOpen>
          <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">{resumoExecutivo}</p>
        </CollapsibleSection>
      ),
    },
    "resumo-audiencia": {
      label: "Resumo geral",
      temDado: !!resumoAudiencia,
      node: (
        <CollapsibleSection id="resumo-audiencia" label="Resumo geral" defaultOpen>
          <ResumoGeralSecao texto={resumoAudiencia!} />
        </CollapsibleSection>
      ),
    },
    "dossie": {
      label: "Roteiro da defesa",
      temDado: !!dossieV2,
      node: (
        <CollapsibleSection id="dossie" label="Roteiro da defesa" defaultOpen={false}>
          <DossieV2Block dossie={dossieV2} ocultarIntimacao={manifesto.includes("intimacao")} />
        </CollapsibleSection>
      ),
    },
    "medidas": {
      label: "Medidas protetivas vigentes",
      temDado: typeof processoId === "number" || medidasAnalysis.length > 0,
      node: (
        <CollapsibleSection id="medidas" label="Medidas protetivas vigentes" defaultOpen>
          <MedidasVigentesSecao
            processoId={typeof processoId === "number" ? processoId : null}
            qtdBanco={qtdMedidasBanco}
            medidasAnalysis={medidasAnalysis}
          />
        </CollapsibleSection>
      ),
    },
    "preventiva": {
      label: "Prisão preventiva (art. 312)",
      temDado: typeof processoId === "number",
      node: (
        <CollapsibleSection id="preventiva" label="Prisão preventiva (art. 312)" defaultOpen>
          <PrisaoPreventivaPanel processoId={processoId} />
        </CollapsibleSection>
      ),
    },
    "cautelares": {
      label: "Cautelares diversas da prisão",
      temDado: typeof processoId === "number",
      node: (
        <CollapsibleSection id="cautelares" label="Cautelares diversas da prisão" defaultOpen>
          <CautelaresPanel processoId={processoId} readOnly apenasEspecie="diversa" />
        </CollapsibleSection>
      ),
    },
    "ata": {
      label: "Ata e gravações",
      temDado: !!audienciaIdNum,
      node: audienciaIdNum ? (
        <CollapsibleSection id="ata" label="Ata e gravações" defaultOpen>
          <AtaAudienciaBlock
            audienciaId={audienciaIdNum}
            processoId={typeof processoId === "number" ? processoId : null}
          />
        </CollapsibleSection>
      ) : null,
    },
    "anotacoes-rapidas": {
      label: "Anotações rápidas",
      temDado: true,
      count: anotacoesRapidas.length,
      node: (
        <CollapsibleSection
          id="anotacoes-rapidas"
          label="Anotações rápidas"
          count={anotacoesRapidas.length}
          defaultOpen
        >
          {deteccaoPendente && audienciaIdNum && (
            <div className="mb-2">
              <EventoDetectadoBanner
                deteccao={deteccaoPendente}
                isPending={actions.aplicarEvento.isPending}
                onDescartar={() => setDeteccaoPendente(null)}
                onAplicar={(d) =>
                  actions.aplicarEvento.mutate(
                    {
                      audienciaId: audienciaIdNum,
                      evento: d.evento,
                      motivo: d.motivo,
                      motivoDetalhe: d.motivoDetalhe,
                      ...(d.novaData
                        ? { novaData: d.novaData, novaHora: d.novaHora ?? "00:00" }
                        : {}),
                    },
                    { onSuccess: () => setDeteccaoPendente(null) }
                  )
                }
              />
            </div>
          )}
          {anotacoesRapidas.length === 0 ? (
            <EmptyHint text="Nenhuma anotação ainda" />
          ) : (
            <ul className="space-y-2">
              {anotacoesRapidas.map((n) => (
                <li
                  key={n.timestamp}
                  className="group flex items-start gap-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-800 dark:text-neutral-100 whitespace-pre-wrap break-words">
                      {n.texto}
                    </p>
                    <p className="mt-0.5 text-[10px] text-neutral-400">
                      {autoresAnotacoes[n.autorId] ?? "—"} ·{" "}
                      {formatDistanceToNow(new Date(n.timestamp), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Estruturar anotação"
                    title="Detectar evento de audiência (redesignação/suspensão)"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-amber-600 cursor-pointer p-1"
                    onClick={() => {
                      const d = parseAnotacaoAudiencia(n.texto);
                      if (d) setDeteccaoPendente(d);
                      else toast.info("Nenhum evento de audiência detectado nesta anotação");
                    }}
                  >
                    <CalendarClock className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Apagar anotação"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-red-500 cursor-pointer p-1"
                    disabled={actions.removeNote.isPending || !audienciaIdNum}
                    onClick={() =>
                      audienciaIdNum &&
                      actions.removeNote.mutate({
                        audienciaId: audienciaIdNum,
                        timestamp: n.timestamp,
                      })
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleSection>
      ),
    },
    "analise-ia": {
      label: "Análise IA",
      temDado: !imputacao && !fatos && laudos.length === 0 && contradicoes.length === 0,
      node: (
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
      ),
    },
    "imputacao": {
      label: "Imputação",
      temDado: true,
      node: (
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
      ),
    },
    "fatos": {
      label: "Fatos (Denúncia)",
      temDado: true,
      node: (
        <CollapsibleSection id="fatos" label="Fatos (Denúncia)" defaultOpen>
          {analyzedAt && (
            <div className="flex justify-end mb-1">
              <FreshnessBadge analyzedAt={analyzedAt} />
            </div>
          )}
          {fatos || fatosLiteral ? (
            <div className="space-y-2">
              {fatosLiteral && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setVerFatosLiteral((v) => !v)}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-md ring-1 ring-inset ring-neutral-200 dark:ring-neutral-700 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    {verFatosLiteral ? "ver resumo" : "ver trecho literal"}
                  </button>
                </div>
              )}
              {verFatosLiteral && fatosLiteral ? (
                <blockquote className="text-[13px] text-neutral-700 dark:text-neutral-300 leading-relaxed border-l-2 border-neutral-300 dark:border-neutral-700 pl-3 italic whitespace-pre-wrap">
                  {fatosLiteral}
                </blockquote>
              ) : (
                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{fatos ?? fatosLiteral}</p>
              )}
            </div>
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
      ),
    },
    "motivo-designacao": {
      label: "Motivo da designação",
      temDado: !!motivo,
      node: (
        <CollapsibleSection id="motivo-designacao" label="Motivo da designação" defaultOpen>
          <MotivoDesignacaoSecao motivo={motivo!} />
        </CollapsibleSection>
      ),
    },
    "requerimento-defesa": {
      label: "Requerimento da defesa",
      temDado: !!requerimentoDefesa,
      node: (
        <CollapsibleSection id="requerimento-defesa" label="Requerimento da defesa" defaultOpen>
          <RequerimentoDefesaSecao texto={requerimentoDefesa!} vinculadoAoMotivo={motivo?.origem === "requerimento_defesa"} />
        </CollapsibleSection>
      ),
    },
    "intimacao": {
      label: "Intimação",
      temDado: !!intimacaoTexto,
      node: (
        <CollapsibleSection id="intimacao" label="Intimação" defaultOpen>
          <IntimacaoSecao texto={intimacaoTexto!} />
        </CollapsibleSection>
      ),
    },
    "relato-vitima": {
      label: "Relato da ofendida / representação",
      temDado: !!relatoVitima,
      node: (
        <CollapsibleSection id="relato-vitima" label="Relato da ofendida / representação" defaultOpen>
          <CitacaoText texto={relatoVitima!} />
        </CollapsibleSection>
      ),
    },
    "sintese": {
      label: "Síntese Processual",
      temDado: cronologia.length > 0,
      node: (
        <CollapsibleSection id="sintese" label="Síntese Processual">
          <SinteseProcessual eventos={cronologia} />
        </CollapsibleSection>
      ),
    },
    "versao": {
      label: "Relato do assistido",
      temDado: !!(versaoDelegacia || versaoJuizo || relatoAtendimento),
      node: (
        <CollapsibleSection id="versao" label="Relato do assistido" defaultOpen>
          {analyzedAt && (
            <div className="flex justify-end mb-1">
              <FreshnessBadge analyzedAt={analyzedAt} />
            </div>
          )}
          {relatoAtendimento && (
            <div className="mb-2">
              <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Atendimento (DPE)</div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-wrap">{relatoAtendimento}</p>
            </div>
          )}
          {versaoDelegacia && (
            <div className="mb-2">
              <div className="text-[10px] font-semibold text-neutral-500 mb-1">Interrogatório policial</div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{versaoDelegacia}</p>
            </div>
          )}
          {versaoJuizo && (
            <div>
              <div className="text-[10px] font-semibold text-neutral-500 mb-1">Interrogatório judicial</div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{versaoJuizo}</p>
            </div>
          )}
        </CollapsibleSection>
      ),
    },
    "depoentes": {
      label: "Depoentes",
      temDado: !!(depoentesDetalhe.length || depoentes.length),
      count: depoentesDetalhe.length || depoentes.length,
      node: (
        <CollapsibleSection id="depoentes" label="Depoentes" count={depoentesDetalhe.length || depoentes.length} defaultOpen>
          {depoentesDetalhe.length > 0 ? (
            <PainelDepoentesStatus depoentes={depoentesDetalhe} onAbrirDepoimento={abrirDepoimentoNoPonto} />
          ) : (
            <EmptyHint text="Status dos depoentes não disponível." />
          )}
        </CollapsibleSection>
      ),
    },
    "depoimentos": {
      label: "Depoimentos",
      temDado: depoentes.length > 0,
      count: depoentes.length,
      node: (
        <CollapsibleSection id="depoimentos" label="Depoimentos" count={depoentes.length} defaultOpen>
          {depoentes.length > 0 ? (
            <div className="space-y-2">
              {depoentes.map((d: any, i: number) => {
                const pessoaId = pessoaIdByTestemunhaId.get(d.id);
                const signal = pessoaId ? getSignal(pessoaId) : null;
                const dotLevel = signal ? computeDotLevel(signal) : "none";
                return (
                  <div key={d.id ?? `${i}-${d.nome}`} className="relative">
                    <DepoenteCardV2
                      depoente={{
                        ...d,
                        audioDriveFileId: matchDepoenteAudio(d.nome ?? "", allMediaCandidates, (d as any).audioDriveFileId ?? null),
                      }}
                      avatarUrl={pessoaId ? avatarByPessoaId.get(pessoaId) ?? null : null}
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
                    {pessoaId && dotLevel !== "none" && (
                      <button
                        type="button"
                        onClick={() => setPessoaSheetId(pessoaId)}
                        aria-label={`Abrir dossiê de ${d.nome}`}
                        className="absolute top-2 right-2 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-1 hover:border-emerald-400 cursor-pointer"
                      >
                        <PessoaChip
                          pessoaId={pessoaId}
                          nome=""
                          papel={signal?.papelPrimario ?? undefined}
                          size="xs"
                          clickable={false}
                          dotLevel={dotLevel}
                        />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyHint text="Sem síntese de depoimentos (IP/juízo) nos autos." />
          )}
        </CollapsibleSection>
      ),
    },
    "contradicoes": {
      label: "Contradições",
      temDado: contradicoes.length > 0,
      count: contradicoes.length,
      node: (
        <CollapsibleSection id="contradicoes" label="Contradições" count={contradicoes.length}>
          {analyzedAt && (
            <div className="flex justify-end mb-1">
              <FreshnessBadge analyzedAt={analyzedAt} />
            </div>
          )}
          <ul className="space-y-2">
            {contradicoes.map((c: any, i: number) => {
              if (typeof c === "string") {
                return (
                  <li key={i} className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                    <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-400/70" />
                    <span>{c}</span>
                  </li>
                );
              }
              const ponto = c.ponto ?? c.descricao ?? c.contradicao ?? c.vulnerabilidade;
              const impacto = c.impacto;
              const vDeleg = c.versao_delegacia ?? c.versaoDelegacia;
              const vJuizo = c.versao_juizo_hoje ?? c.versao_juizo ?? c.versaoJuizo;
              if (!ponto && !impacto && !vDeleg && !vJuizo) {
                return (
                  <li key={i} className="text-xs text-neutral-500 italic">{JSON.stringify(c)}</li>
                );
              }
              const impactoClass =
                typeof impacto === "string" && /essencial|alta|forte/i.test(impacto)
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                  : typeof impacto === "string" && /media|moderad/i.test(impacto)
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
              return (
                <li key={i} className="rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 bg-white dark:bg-neutral-900 p-2.5 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-400/70" />
                    <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed flex-1">{ponto}</p>
                    {impacto && (
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide flex-shrink-0", impactoClass)}>
                        {impacto.split(/\s—\s/)[0]}
                      </span>
                    )}
                  </div>
                  {typeof impacto === "string" && impacto.includes("—") && (
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed pl-5">
                      {impacto.split(/\s—\s/).slice(1).join(" — ")}
                    </p>
                  )}
                  {(vDeleg || vJuizo) && (
                    <div className="grid grid-cols-1 gap-1 pl-5 pt-1">
                      {vDeleg && (
                        <div className="text-[11px] leading-relaxed">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">Delegacia:</span>{" "}
                          <span className="text-neutral-600 dark:text-neutral-400">{vDeleg}</span>
                        </div>
                      )}
                      {vJuizo && (
                        <div className="text-[11px] leading-relaxed">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Em juízo:</span>{" "}
                          <span className="text-neutral-600 dark:text-neutral-400">{vJuizo}</span>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </CollapsibleSection>
      ),
    },
    "laudos": {
      label: "Laudos e Perícias",
      temDado: laudos.length > 0,
      count: laudos.length,
      node: (
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
      ),
    },
    "investigacao": {
      label: "Investigação Defensiva",
      temDado: diligencias.length > 0,
      count: diligencias.length,
      node: (
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
      ),
    },
    "pendencias": {
      label: "Pendências",
      temDado: pendencias.length > 0,
      count: pendencias.length,
      node: (
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
      ),
    },
    "teses": {
      label: "Teses",
      temDado: teses.length > 0,
      count: teses.length,
      node: (
        <CollapsibleSection id="teses" label="Teses" count={teses.length}>
          {analyzedAt && (
            <div className="flex justify-end mb-1">
              <FreshnessBadge analyzedAt={analyzedAt} />
            </div>
          )}
          <div className="space-y-2">
            {teses.map((t: any, i: number) => {
              if (typeof t === "string") {
                return (
                  <div key={i} className="rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 bg-white dark:bg-neutral-900 p-2.5">
                    <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200">{t}</p>
                  </div>
                );
              }
              const nome = t.nome ?? t.tese ?? t.titulo ?? t.descricao;
              const forca = t.forca ?? t.força ?? t.viabilidade;
              const baseLegal = t.base_legal ?? t.baseLegal;
              const fundamentacao = t.fundamentacao ?? t.fundamentos ?? t.justificativa;
              if (!nome && !forca && !baseLegal && !fundamentacao) {
                return (
                  <div key={i} className="text-xs text-neutral-500 italic">{JSON.stringify(t)}</div>
                );
              }
              const forcaClass =
                typeof forca === "string" && /alta|forte/i.test(forca)
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : typeof forca === "string" && /media|moderad/i.test(forca)
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
              return (
                <div key={i} className="rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 bg-white dark:bg-neutral-900 p-2.5 space-y-1.5">
                  <div className="flex items-start gap-2">
                    {nome && <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed flex-1">{nome}</p>}
                    {forca && (
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide flex-shrink-0", forcaClass)}>
                        {forca}
                      </span>
                    )}
                  </div>
                  {baseLegal && (
                    <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      {baseLegal}
                    </p>
                  )}
                  {fundamentacao && (
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      {fundamentacao}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      ),
    },
    "documentos": {
      label: "Documentos",
      temDado: true,
      node: (
        <CollapsibleSection id="documentos" label="Documentos" defaultOpen>
          <DocumentosBlock
            processoId={typeof processoId === "number" ? processoId : null}
            assistidoId={typeof assistidoId === "number" ? assistidoId : null}
            onExpandLeft={setAutosModalId}
          />
        </CollapsibleSection>
      ),
    },
    "midia": {
      label: "Mídia",
      temDado: true,
      node: (
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
      ),
    },
  };

  const secoesVisiveis = manifesto.filter((id) => secoesMap[id]?.temDado);
  const tocSections: ToCSection[] = secoesVisiveis.map((id) => ({
    id,
    label: secoesMap[id]!.label,
    ...(secoesMap[id]!.count !== undefined ? { count: secoesMap[id]!.count } : {}),
  }));

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
        className={cn(
          "p-0 flex flex-col gap-0 border-l-0 outline-none rounded-l-2xl sm:rounded-l-none [&>button:first-of-type]:hidden bg-white dark:bg-neutral-950 shadow-2xl max-w-none sm:max-w-none",
          !draggingDivider && "transition-[width] duration-300 ease-out",
          // Mobile (< sm): full-screen — a largura vem das classes (w-full +
          // max-w-none + h-full/inset-y-0/right-0), sem o sheetW inline (que num
          // celular geraria uma largura minúscula via clamp do leftGutter).
          // Desktop: largura ajustável pela alça (sheetW inline).
          "w-full",
        )}
        style={sheetIsMobile ? undefined : { width: sheetW }}
      >
        <SheetTitle className="sr-only">Detalhes do evento</SheetTitle>

        {/* Modal de autos ENCAIXADO à esquerda do sheet: painel fixo da borda esquerda
            até onde o sheet começa. O sheet mantém sua largura (1040px) e segue funcional. */}
        {autosModalId && (
          <div
            className="hidden sm:flex flex-col fixed inset-y-0 left-0 z-50 overflow-hidden bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 shadow-2xl animate-in fade-in slide-in-from-left-6 duration-300 ease-out"
            style={{ right: sheetW }}
          >
            <AutosModalViewer
              driveFileId={autosModalId}
              processoId={typeof processoId === "number" ? processoId : null}
              initialSearch={docaSearch}
              onClose={() => { setAutosModalId(null); setDocaSearch(null); }}
            />
          </div>
        )}

        {/* Alça de largura — sempre na borda esquerda do sheet (vale p/ normal e modal).
            Arraste para ajustar; duplo-clique reseta; o valor é salvo. */}
        <div
          onPointerDown={startDividerDrag}
          onDoubleClick={resetSheetW}
          title="Arraste para ajustar a largura · duplo-clique reseta · fica salvo"
          className="hidden sm:flex absolute inset-y-0 left-0 -ml-1.5 w-3 z-[60] cursor-col-resize items-center justify-center group"
        >
          <div
            className={cn(
              "h-14 w-1 rounded-full transition-all",
              draggingDivider
                ? "bg-emerald-500 w-1.5"
                : "bg-neutral-300/70 dark:bg-neutral-700 group-hover:bg-emerald-400 group-hover:h-20",
            )}
          />
        </div>
        {draggingDivider && (
          <div className="hidden sm:block absolute top-3 left-3 z-[61] px-2 py-1 rounded-md bg-neutral-900 text-white text-[10px] font-semibold tabular-nums shadow-lg pointer-events-none">
            {Math.round(sheetW)}px · {pctSheetW}%
          </div>
        )}

        <div className="flex-1 flex min-h-0">
          <div className="flex flex-col min-h-0 min-w-0 flex-1">

        {/* Faixa fina da atribuição — substitui o header preto sólido por um
            acento leve, alinhado à cor do avatar/rótulo (paleta por atribuição). */}
        <div className="h-1 w-full shrink-0 transition-colors duration-300" style={{ backgroundColor: atribColor }} aria-hidden />
        {/* Header adaptativo — identidade do rito (badge + cor) + data + status.
            Sempre visível: dá contexto instantâneo de QUE audiência é esta. */}
        {(() => {
          const RitoIcon = subtipoCfg.icon;
          const ritoCores = corBadge(subtipoCfg.cor);
          const st = statusAudienciaInfo((ctx as any)?.audiencia?.status ?? evento.status);
          return (
            <div className={cn(SHEET_STYLE.topBar, "px-3 py-2 flex items-center justify-between gap-2")}>
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn(SHEET_STYLE.ritoBadge, ritoCores.border, ritoCores.bgSubtle, ritoCores.text)}>
                  <RitoIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-[210px]">{subtipoCfg.label}</span>
                </span>
                {dataHora && (
                  <span className="hidden sm:inline text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums shrink-0">
                    {format(dataHora, "dd/MM · HH:mm", { locale: ptBR })}
                  </span>
                )}
                <span className={cn(SHEET_STYLE.statusPill, st.cls)}>{st.label}</span>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className={SHEET_STYLE.iconBtn}
                title="Fechar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })()}

        <SheetToC sections={tocSections} activeId={activeSection} onJump={handleJump} />

        <div className="px-3 pt-2">
          <BannerInteligencia
            contextType="audiencia"
            contextId={audienciaIdNum ?? 0}
            signals={signalsComNome}
            getNome={getNome}
            onPessoaClick={(id) => setPessoaSheetId(id)}
          />
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          <div className="mx-3 mt-3 mb-3 px-4 py-3.5 rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200/80 dark:ring-neutral-800 shadow-sm">
                <div className="flex items-start gap-3.5">
                  {/* Avatar colorido — única fonte de identidade visual da atribuição. */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300"
                    style={{
                      backgroundColor: `${atribColor}14`,
                      boxShadow: `inset 0 0 0 1px ${atribColor}40`,
                    }}
                  >
                    <span
                      className="text-sm font-semibold"
                      style={{ color: atribColor }}
                    >
                      {iniciaisNome(assistidoNome || evento.titulo || "")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    {assistidoNome && (
                      <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100 leading-tight truncate">
                        {assistidoNome}
                      </h2>
                    )}
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {processoNum && (
                        <button
                          onClick={(e) => { e.stopPropagation(); copyProcesso(processoNum); }}
                          className="inline-flex items-center gap-1 px-1 -mx-1 rounded-md text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          title="Copiar número"
                        >
                          <span className="font-mono text-[11px] tabular-nums">{processoNum}</span>
                          {copied ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5 opacity-60" />}
                        </button>
                      )}
                      {dataHora && (
                        <span className="text-[11px] text-neutral-600 dark:text-neutral-500 tabular-nums">
                          {format(dataHora, "HH:mm", { locale: ptBR })}
                        </span>
                      )}
                      {(ctx as any)?.audiencia?.aguardandoNovaData && (
                        <button
                          type="button"
                          title="Clique para resolver a pendência manualmente"
                          className="cursor-pointer"
                          disabled={resolverPendencia.isPending}
                          onClick={() => {
                            if (
                              audienciaIdNum &&
                              confirm("Limpar a pendência 'aguardando nova data' desta audiência?")
                            ) {
                              resolverPendencia.mutate({ id: audienciaIdNum, aguardandoNovaData: false });
                            }
                          }}
                        >
                          <AguardandoNovaDataBadge
                            motivo={(ctx as any)?.audiencia?.motivoNaoRealizacao}
                          />
                        </button>
                      )}
                    </div>
                    {(vara || evento.atribuicao) && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-[10.5px] text-neutral-500 dark:text-neutral-400 flex-wrap">
                        {vara && <span>{vara}</span>}
                        {vara && evento.atribuicao && (
                          <span className="text-neutral-300 dark:text-neutral-600 shrink-0" aria-hidden>·</span>
                        )}
                        {evento.atribuicao && (
                          <span style={{ color: atribColor }} className="font-medium">
                            {evento.atribuicao}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Patrocínio — 1 clique alterna DPE ↔ advogado constituído;
                        lápis (só quando Particular) edita nome/OAB. */}
                    {processoId && (
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          type="button"
                          disabled={setPatrocinio.isPending}
                          aria-pressed={tipoPatrocinio === "PARTICULAR"}
                          onClick={(e) => {
                            e.stopPropagation();
                            const novo = tipoPatrocinio === "PARTICULAR" ? "DEFENSORIA" : "PARTICULAR";
                            setPatrocinio.mutate({
                              processoId,
                              tipoPatrocinio: novo,
                              advogadoParticular: novo === "PARTICULAR" ? (advogadoDraft.trim() || null) : null,
                            });
                          }}
                          title={
                            tipoPatrocinio === "PARTICULAR"
                              ? "Advogado constituído — clique para voltar à Defensoria"
                              : "Patrocínio da Defensoria — clique se apareceu advogado constituído"
                          }
                          className={cn(
                            "inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[10px] font-medium transition-colors cursor-pointer ring-1 ring-inset disabled:opacity-60",
                            tipoPatrocinio === "PARTICULAR"
                              ? "bg-red-50 text-red-700 ring-red-200 hover:bg-red-100 dark:bg-red-900/25 dark:text-red-300 dark:ring-red-800/60 dark:hover:bg-red-900/40"
                              : "bg-neutral-50 text-neutral-400 ring-neutral-200 hover:bg-neutral-100 hover:text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-500 dark:ring-neutral-700 dark:hover:text-neutral-300",
                          )}
                        >
                          <Scale className="w-3 h-3" />
                          <span className="truncate max-w-[190px]">
                            {tipoPatrocinio === "PARTICULAR"
                              ? (advogadoParticular || "Advogado constituído")
                              : "Defensoria"}
                          </span>
                        </button>
                        {tipoPatrocinio === "PARTICULAR" && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                title="Nome/OAB do advogado"
                                onClick={(e) => e.stopPropagation()}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-neutral-300 hover:text-red-600 hover:bg-red-50 dark:text-neutral-600 dark:hover:text-red-400 dark:hover:bg-red-900/25 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" sideOffset={6} className="w-64 p-2.5 rounded-xl">
                              <label className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400">
                                Advogado (nome / OAB)
                              </label>
                              <Input
                                value={advogadoDraft}
                                onChange={(e) => setAdvogadoDraft(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                }}
                                onBlur={() => {
                                  const atual = advogadoParticular ?? "";
                                  if (advogadoDraft.trim() !== atual.trim()) {
                                    setPatrocinio.mutate({
                                      processoId,
                                      tipoPatrocinio: "PARTICULAR",
                                      advogadoParticular: advogadoDraft.trim() || null,
                                    });
                                  }
                                }}
                                placeholder="Ex.: João Silva (OAB/BA 12.345)"
                                className="h-7 text-xs rounded-lg mt-1"
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    )}
                  </div>
                </div>
          </div>

          <div className="px-3 pb-4 space-y-3">
            {!isLoading && <SubtipoBanner subtipo={subtipo} processoNum={processoNum} />}

            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
              </div>
            )}

            {!isLoading && secoesVisiveis.map((id) => (
              <Fragment key={id}>{secoesMap[id]!.node}</Fragment>
            ))}
          </div>
        </div>

        <SheetActionFooter
          audienciaId={audienciaIdNum}
          jaConcluida={jaConcluida}
          onAbrirRegistroCompleto={() => onOpenRegistro?.()}
          onDuplicar={onDuplicate ? () => onDuplicate(evento) : undefined}
          onDeteccao={setDeteccaoPendente}
        />
        <PessoaSheet
          pessoaId={pessoaSheetId}
          open={pessoaSheetId !== null}
          onOpenChange={(o) => !o && setPessoaSheetId(null)}
        />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
