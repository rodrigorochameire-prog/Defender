"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Phone,
  MessageCircle,
  Scale,
  FileText,
  Calendar,
  Clock,
  Timer,
  HardDrive,
  AlertCircle,
  CheckCircle2,
  IdCard,
  Pencil,
  Plus,
  ChevronRight,
  Copy,
  ExternalLink,
  Lock,
  Shield,
  MessageSquare,
  Briefcase,
  Users,
  History,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { AssistidoAvatar } from "@/components/shared/assistido-avatar";
import { ATRIBUICAO_OPTIONS, SOLID_COLOR_MAP, normalizeAreaToFilter } from "@/lib/config/atribuicoes";
import { statusPrisionalInfo } from "@/lib/config/tipologia";
import { TYPO } from "@/lib/config/design-tokens";
import { trpc } from "@/lib/trpc/client";
import type { AssistidoUI } from "./assistido-types";
import { getPrazoInfo, calcularIdade, calcularTempoPreso } from "./assistido-utils";
import {
  toSnapshot,
  countProcessosSemCaso,
  completudeFicha,
  attentionSignals,
  contextualCTA,
} from "@/lib/assistidos/state";
import { AttentionSignalRow, ctaHref, SEV_TONE, KIND_ICON } from "@/components/ds/attention";
import { tipoEfetivo, tipoEfetivoLabel } from "@/lib/casos/agrupamento";

// Formata datas com segurança — date-fns lança em datas inválidas (causava blank screen).
function safeFmt(v: unknown, pattern: string): string {
  if (!v) return "";
  const d = new Date(v as string | number | Date);
  return Number.isNaN(d.getTime()) ? "" : format(d, pattern);
}

// Chip "último contato" — inline (evita import cross-route que quebrava no Turbopack dev).
const MS_DIA = 86_400_000;
function relativoContato(d: Date): string {
  const dias = Math.floor((Date.now() - d.getTime()) / MS_DIA);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias <= 30) return `há ${dias}d`;
  return `há ${Math.floor(dias / 30)}m`;
}
function UltimoContato({ assistidoId }: { assistidoId: number }) {
  const { data } = trpc.atendimentos.list.useQuery({ assistidoId, limit: 5 }, { staleTime: 60_000 });
  const ultimo = useMemo(() => {
    const items = (data?.items ?? []) as Array<{ atendimento?: { dataRegistro?: string | Date | null } }>;
    let melhor: Date | null = null;
    for (const it of items) {
      const raw = it.atendimento?.dataRegistro;
      if (!raw) continue;
      const dt = new Date(raw);
      if (Number.isNaN(dt.getTime())) continue;
      if (!melhor || dt > melhor) melhor = dt;
    }
    return melhor;
  }, [data]);
  if (!ultimo) return null;
  const frio = Math.floor((Date.now() - ultimo.getTime()) / MS_DIA) > 30;
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-[10.5px]", frio ? "text-amber-600 dark:text-amber-400" : "text-neutral-500 dark:text-neutral-400")}
      title={ultimo.toLocaleString("pt-BR")}
    >
      <MessageSquare className="h-3 w-3" />
      último contato {relativoContato(ultimo)}
    </span>
  );
}

// ── Subcomponentes locais (StatCell/BlockHeader; sinais de atenção vêm do DS) ──

function BlockHeader({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <p className={cn(TYPO.label, "flex items-center gap-1.5 mb-2.5")}>
      <Icon className="w-3 h-3" />
      {children}
    </p>
  );
}

// ── Painel principal: 4 blocos (Resumo / Atividade / Pendências / Ações) ──

export function AssistidoPreviewPanel({ assistido }: { assistido: AssistidoUI }) {
  const { data: detalhe } = trpc.assistidos.getById.useQuery(
    { id: assistido.id },
    { enabled: !!assistido.id, staleTime: 30_000 },
  );
  const { data: medidasVigentes = [] } = trpc.assistidos.getMedidasVigentes.useQuery(
    { assistidoId: assistido.id },
    { enabled: !!assistido.id, staleTime: 60_000 },
  );
  const { data: casosData } = trpc.casos.getCasosComProcessos.useQuery(
    { assistidoId: assistido.id },
    { enabled: !!assistido.id, staleTime: 30_000 },
  );
  const { data: familiaData } = trpc.pessoas.getFamiliaresByAssistido.useQuery(
    { assistidoId: assistido.id },
    { enabled: !!assistido.id, staleTime: 60_000 },
  );
  const { data: feed = [] } = trpc.registros.feedUnificado.useQuery(
    { assistidoId: assistido.id, limit: 25 },
    { enabled: !!assistido.id, staleTime: 30_000 },
  );

  // Acordeão: um item expandido por vez (caso/documento) mostra prévia inline.
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const toggle = (k: string) => setExpandedKey((prev) => (prev === k ? null : k));
  const [fichaOpen, setFichaOpen] = useState(false);

  const docsAll = (detalhe?.driveFiles ?? []).filter((f) => !f.isFolder);
  const processosSemCaso = detalhe?.processos
    ? countProcessosSemCaso(detalhe.processos as ReadonlyArray<{ casoId?: number | null }>)
    : undefined;

  const snap = toSnapshot(assistido, { processosSemCaso });
  const comp = completudeFicha(snap);
  const sinais = attentionSignals(snap);
  const cta = contextualCTA(snap);
  // Hero "próxima ação": o sinal mais urgente (crítico/aviso) fixado no topo.
  const topSignal = sinais[0] ?? null;
  const showActionBanner = !!topSignal && (topSignal.severity === "critical" || topSignal.severity === "warning");

  // ── Identidade / derivações visuais ──
  const custodia = statusPrisionalInfo(assistido.statusPrisional);
  const idade = calcularIdade(assistido.dataNascimento);
  const isPreso = (custodia?.priority ?? 7) <= 4;
  const tempoPreso = isPreso ? calcularTempoPreso(assistido.dataPrisao ?? null) : null;
  const telefoneDisplay = assistido.telefone || assistido.telefoneContato;
  const whatsappUrl = telefoneDisplay ? `https://wa.me/55${telefoneDisplay.replace(/\D/g, "")}` : null;
  const maskedCpf = assistido.cpf
    ? assistido.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4")
    : null;

  const atribuicoes = assistido.atribuicoes || assistido.areas || [];
  const resolveAttr = (attr: string) => {
    const norm = attr.toUpperCase().replace(/_/g, " ");
    return ATRIBUICAO_OPTIONS.find(
      (o) =>
        o.value.toUpperCase() === norm ||
        o.label.toUpperCase().includes(norm) ||
        norm.includes(o.value.toUpperCase()),
    );
  };
  // Identidade estável: atribuição primária (não a do processo mais recente).
  const primaryAttr = normalizeAreaToFilter(assistido.atribuicaoPrimaria) !== "all"
    ? normalizeAreaToFilter(assistido.atribuicaoPrimaria)
    : (atribuicoes.length ? resolveAttr(atribuicoes[0])?.value ?? null : null);
  const primaryAttrHex = primaryAttr ? SOLID_COLOR_MAP[primaryAttr] || null : null;

  const prazoInfo = getPrazoInfo(assistido.proximoPrazo);
  // Completude não é urgência — só emerald (ok) ou amber (a completar).
  // Vermelho fica reservado para prazos/audiências (urgência real) abaixo.
  const completudeTone =
    comp.tone === "complete" || comp.tone === "good"
      ? "bg-emerald-500"
      : "bg-amber-500";

  return (
    <div className="flex flex-col h-full">
      {/* Acento de identidade — única cor de área, hairline sutil */}
      {primaryAttrHex && (
        <div
          className="h-[3px] shrink-0"
          style={{ background: `linear-gradient(to right, ${primaryAttrHex}, transparent)` }}
        />
      )}

      {/* Banners fixos no topo: custódia + próxima ação */}
      {(isPreso || showActionBanner) && (
        <div className="px-4 pt-3 space-y-2 shrink-0">
          {isPreso && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 border-l-[3px] border-rose-400 dark:border-rose-700">
              <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                Preso{tempoPreso ? ` há ${tempoPreso}` : ""}
              </span>
              {assistido.unidadePrisional && (
                <span className="text-[10px] text-rose-600/80 dark:text-rose-400/70 truncate">· {assistido.unidadePrisional}</span>
              )}
            </div>
          )}
          {showActionBanner && topSignal && (() => {
            const tone = SEV_TONE[topSignal.severity];
            const Icon = KIND_ICON[topSignal.kind];
            return (
              <Link
                href={ctaHref(topSignal.cta.kind, assistido.id)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-l-[3px] transition-colors hover:brightness-[0.98] dark:hover:brightness-125",
                  tone.border,
                  tone.bg,
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", tone.text)} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-xs font-semibold truncate", tone.text)}>{topSignal.label}</p>
                  <p className="text-[10px] text-muted-foreground">{topSignal.cta.label}</p>
                </div>
                <ChevronRight className={cn("w-4 h-4 shrink-0", tone.text)} />
              </Link>
            );
          })()}
        </div>
      )}

      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
        {/* ───────── 1. RESUMO ───────── */}
        <section className="px-5 py-4">
          <div className="flex items-start gap-4">
            <AssistidoAvatar
              nome={assistido.nome}
              photoUrl={assistido.photoUrl}
              size="xl"
              atribuicao={primaryAttr}
              statusPrisional={assistido.statusPrisional}
              showStatusDot
            />
            <div className="flex-1 min-w-0">
              <h2 className="font-serif text-xl font-semibold text-neutral-900 dark:text-neutral-50 leading-tight">
                {assistido.nome}
              </h2>
              {assistido.vulgo && (
                <p className="text-xs text-neutral-400 italic mt-0.5">&ldquo;{assistido.vulgo}&rdquo;</p>
              )}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {custodia && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                      custodia.bg,
                      custodia.color,
                    )}
                  >
                    {custodia.label}
                  </span>
                )}
                {atribuicoes.slice(0, 3).map((attr, idx) => {
                  const opt = resolveAttr(attr);
                  const color = opt ? SOLID_COLOR_MAP[opt.value] || "#6b7280" : "#6b7280";
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                      {opt?.shortLabel || attr.substring(0, 4)}
                    </span>
                  );
                })}
                {idade && <span className="text-[10px] text-neutral-400">{idade}a</span>}
                {tempoPreso && (
                  <span className="text-[10px] text-rose-400 font-mono tabular-nums">{tempoPreso}</span>
                )}
              </div>
              {/* contato + CPF */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {telefoneDisplay && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
                    <Phone className="w-3 h-3 text-neutral-400" />
                    {telefoneDisplay}
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-medium transition-colors"
                      >
                        <MessageCircle className="w-2.5 h-2.5" />
                        Zap
                      </a>
                    )}
                  </span>
                )}
                {maskedCpf && (
                  <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums text-neutral-500">
                    <IdCard className="w-3 h-3 text-neutral-400" />
                    {maskedCpf}
                  </span>
                )}
              </div>
              {/* último contato + registrar atendimento */}
              <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                <UltimoContato assistidoId={assistido.id} />
                <Link
                  href={`/admin/atendimentos/novo?assistido=${assistido.id}`}
                  className="inline-flex items-center gap-1 text-[10.5px] text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <Plus className="w-3 h-3" /> registrar atendimento
                </Link>
              </div>
            </div>
          </div>
          {/* completude — clicável: expande os campos faltantes */}
          <button
            onClick={() => setFichaOpen((v) => !v)}
            className="mt-3.5 w-full flex items-center gap-2 cursor-pointer group"
          >
            <div className="flex-1 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", completudeTone)}
                style={{ width: `${comp.pct}%` }}
              />
            </div>
            <span className="text-[10px] text-neutral-400 tabular-nums font-medium">Ficha {comp.pct}%</span>
            {comp.faltam.length > 0 && (
              <ChevronRight className={cn("w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 transition-transform", fichaOpen && "rotate-90")} />
            )}
          </button>
          {fichaOpen && comp.faltam.length > 0 && (
            <div className="mt-2 px-2.5 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/30 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Faltam {comp.faltam.length} campos</p>
              <div className="flex flex-wrap gap-1">
                {comp.faltam.map((f) => (
                  <span key={f.label} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400">
                    {f.label}
                  </span>
                ))}
              </div>
              <Link href={`/admin/assistidos/${assistido.id}/editar`} className="inline-flex items-center gap-1 text-[10.5px] text-emerald-600 hover:text-emerald-700">
                Completar cadastro <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          )}
          {!fichaOpen && comp.faltam.length > 0 && (
            <p className="mt-1 text-[10px] text-neutral-400 truncate">
              falta: {comp.faltam.map((f) => f.label).join(", ")}
            </p>
          )}
        </section>

        {/* ───────── 2. CASOS (processos agrupados) ───────── */}
        <section className="px-5 py-4">
          <BlockHeader icon={Briefcase}>Casos</BlockHeader>
          {!casosData ? (
            <p className="text-[11px] text-neutral-400 px-1">Carregando…</p>
          ) : (casosData.casos.length === 0 && casosData.semCaso.length === 0) ? (
            <p className="text-[11px] text-neutral-400 px-1">Nenhum processo cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {casosData.casos.map((c) => {
                const k = `caso-${c.id}`;
                const open = expandedKey === k;
                const hex = SOLID_COLOR_MAP[c.atribuicao] || "#a1a1aa";
                const atribLabel = resolveAttr(c.atribuicao)?.shortLabel ?? c.atribuicao;
                const proxAud = c.processos
                  .map((p) => p.proximaAudiencia?.data)
                  .filter((d): d is Date => !!d)
                  .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
                return (
                  <div key={c.id} className="rounded-xl border border-neutral-200/70 dark:border-neutral-800 overflow-hidden">
                    <button onClick={() => toggle(k)} className="w-full text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer" style={{ borderLeft: `3px solid ${hex}` }}>
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-foreground truncate">{c.titulo}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: hex }}>{atribLabel}</span>
                            <span className="text-[10px] text-neutral-400">· {c.processos.length} proc.</span>
                            {c.analyzedAt ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 dark:text-emerald-400"><Layers className="w-2.5 h-2.5" /> Análise {safeFmt(c.analyzedAt, "dd/MM")}</span>
                            ) : (
                              <span className="text-[9px] text-neutral-300 dark:text-neutral-600">sem análise</span>
                            )}
                            {proxAud && <span className="inline-flex items-center gap-0.5 text-[9px] text-violet-500"><Calendar className="w-2.5 h-2.5" /> {safeFmt(proxAud, "dd/MM")}</span>}
                          </div>
                        </div>
                        <ChevronRight className={cn("w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 shrink-0 transition-transform", open && "rotate-90")} />
                      </div>
                    </button>
                    {open && (
                      <div className="px-3 pb-2.5 pt-1 space-y-1 border-t border-neutral-100 dark:border-neutral-800">
                        {c.processos.map((p) => {
                          const tlabel = tipoEfetivoLabel(tipoEfetivo({ tipoProcesso: p.tipoProcesso, classeProcessual: p.classeProcessual }));
                          return (
                            <Link key={p.id} href={`/admin/processos/${p.id}`} className="flex items-center gap-2 py-1 group">
                              <span className="text-[8.5px] font-bold uppercase tracking-wide px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 shrink-0">{tlabel}</span>
                              <span className="font-mono tabular-nums text-[10px] text-neutral-600 dark:text-neutral-300 truncate flex-1 group-hover:text-emerald-600">{p.numeroAutos || "—"}</span>
                              {p.proximaAudiencia && <span className="text-[9px] text-violet-500 shrink-0">{safeFmt(p.proximaAudiencia.data, "dd/MM")}</span>}
                            </Link>
                          );
                        })}
                        <Link href={`/admin/assistidos/${assistido.id}/caso/${c.id}`} className="inline-flex items-center gap-1 text-[10.5px] text-emerald-600 hover:text-emerald-700 pt-0.5">
                          Abrir caso <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}

              {casosData.semCaso.length > 0 && (
                <div className="rounded-xl border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/10 px-3 py-2.5">
                  <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 mb-1">{casosData.semCaso.length} processo(s) sem caso</p>
                  <div className="space-y-0.5">
                    {casosData.semCaso.slice(0, 4).map((p) => {
                      const tlabel = tipoEfetivoLabel(tipoEfetivo({ tipoProcesso: p.tipoProcesso, classeProcessual: p.classeProcessual }));
                      return (
                        <Link key={p.id} href={`/admin/processos/${p.id}`} className="flex items-center gap-2 py-0.5 group">
                          <span className="text-[8.5px] font-bold uppercase tracking-wide px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shrink-0">{tlabel}</span>
                          <span className="font-mono tabular-nums text-[10px] text-neutral-600 dark:text-neutral-300 truncate flex-1 group-hover:text-emerald-600">{p.numeroAutos || "—"}</span>
                        </Link>
                      );
                    })}
                  </div>
                  <Link href={`/admin/assistidos/${assistido.id}/casos`} className="inline-flex items-center gap-1 text-[10.5px] text-emerald-600 hover:text-emerald-700 pt-1">
                    Agrupar em casos <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ───────── MEDIDAS PROTETIVAS (VVD) ───────── */}
        {medidasVigentes.length > 0 && (
          <section className="px-5 py-4">
            <BlockHeader icon={Shield}>Medidas protetivas vigentes</BlockHeader>
            <div className="space-y-1.5">
              {medidasVigentes.map((m, i) => (
                <div key={i} className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/10 border-l-2 border-amber-300 dark:border-amber-800">
                  <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300 leading-snug">
                      {m.literal || m.codigo || m.artigo || "Medida protetiva"}
                    </p>
                    <p className="text-[10px] text-amber-700/80 dark:text-amber-400/70">
                      {m.distanciaMetros ? `${m.distanciaMetros}m · ` : ""}
                      {m.dataVencimento ? `vence ${safeFmt(m.dataVencimento, "dd/MM/yyyy")}` : "sem vencimento"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ───────── DOCUMENTOS ───────── */}
        {docsAll.length > 0 && (
          <section className="px-5 py-4">
            <BlockHeader icon={FileText}>Documentos</BlockHeader>
            <div className="space-y-1.5">
              {docsAll.slice(0, 8).map((f) => {
                const k = `doc-${f.id}`;
                const open = expandedKey === k;
                const tipoTxt = `${f.documentType || ""} ${f.categoria || ""} ${f.name || ""}`.toLowerCase();
                const isAnalise = /analise|análise|relat[óo]rio/.test(tipoTxt);
                const isAutos = !isAnalise && /autos|processo/.test(tipoTxt);
                const isImg = (f.mimeType ?? "").startsWith("image/");
                const openUrl = f.webViewLink || `https://drive.google.com/file/d/${f.driveFileId}/view`;
                const selo = isAnalise
                  ? { label: "Análise", cls: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" }
                  : isAutos
                    ? { label: "Autos", cls: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" }
                    : null;
                return (
                  <div key={f.id} className="rounded-lg border border-neutral-100 dark:border-neutral-800 overflow-hidden">
                    <button onClick={() => toggle(k)} className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer">
                      <FileText className="w-3 h-3 text-neutral-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 truncate">{f.name}</p>
                        {selo ? (
                          <span className={cn("inline-block text-[8.5px] font-bold uppercase tracking-wide px-1 rounded", selo.cls)}>{selo.label}</span>
                        ) : (f.documentType || f.categoria) ? (
                          <p className="text-[10px] text-neutral-400 truncate">{f.documentType || f.categoria}</p>
                        ) : null}
                      </div>
                      <span className="text-[9px] text-neutral-400 tabular-nums shrink-0">{f.lastModifiedTime && safeFmt(f.lastModifiedTime, "dd/MM")}</span>
                      <ChevronRight className={cn("w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 shrink-0 transition-transform", open && "rotate-90")} />
                    </button>
                    {open && (
                      <div className="px-2.5 pb-2.5 pt-1.5 space-y-2 bg-neutral-50/60 dark:bg-neutral-800/20 border-t border-neutral-100 dark:border-neutral-800">
                        {isImg && f.driveFileId && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`https://drive.google.com/thumbnail?id=${f.driveFileId}&sz=w400`} alt={f.name ?? "documento"} loading="lazy" className="w-full max-h-44 object-contain rounded-md border border-neutral-200 dark:border-neutral-700 bg-white" />
                        )}
                        <p className="text-[10px] text-neutral-400">{f.mimeType || "arquivo"}{f.lastModifiedTime ? ` · ${safeFmt(f.lastModifiedTime, "dd/MM/yyyy HH:mm")}` : ""}</p>
                        <a href={openUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10.5px] text-emerald-600 hover:text-emerald-700">Abrir no Drive <ExternalLink className="w-3 h-3" /></a>
                      </div>
                    )}
                  </div>
                );
              })}
              <Link href={`/admin/assistidos/${assistido.id}/documentos`} className="block text-[10px] text-emerald-600 hover:text-emerald-700 pt-0.5">Ver todos os documentos →</Link>
            </div>
          </section>
        )}

        {/* ───────── FAMÍLIA / REDE ───────── */}
        {familiaData && familiaData.familiares.length > 0 && (
          <section className="px-5 py-4">
            <BlockHeader icon={Users}>Família e rede</BlockHeader>
            <div className="space-y-0.5">
              {familiaData.familiares.map((f) => {
                const tel = f.telefone ? f.telefone.replace(/\D/g, "") : null;
                return (
                  <div key={f.id} className="flex items-center gap-2 px-1 py-1">
                    <span className="text-[8.5px] font-bold uppercase tracking-wide px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 shrink-0">{f.grau || "—"}</span>
                    <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate flex-1">{f.nome}</span>
                    {tel && (
                      <Link href={`/admin/whatsapp?phone=${tel}`} className="text-neutral-400 hover:text-emerald-600 transition-colors" title="Conversa no OMBUDS">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ───────── LINHA DO TEMPO ───────── */}
        {feed.length > 0 && (
          <section className="px-5 py-4">
            <BlockHeader icon={History}>Linha do tempo</BlockHeader>
            <div className="relative pl-3 space-y-2 border-l border-neutral-200 dark:border-neutral-800">
              {feed.slice(0, 8).map((it) => (
                <div key={it.id} className="relative">
                  <span className="absolute -left-[15px] top-1.5 w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                  <div className="flex items-baseline gap-2">
                    <span className="text-[9px] tabular-nums text-neutral-400 shrink-0">{safeFmt(it.data, "dd/MM/yy")}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] text-neutral-700 dark:text-neutral-300 truncate">{it.titulo || it.rotulo}</p>
                      {it.rotulo && it.titulo && <p className="text-[9px] text-neutral-400 truncate">{it.rotulo}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ───────── 3. PENDÊNCIAS ───────── */}
        <section className="px-5 py-4">
          <BlockHeader icon={AlertCircle}>Pendências</BlockHeader>
          {sinais.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/10 border-l-2 border-emerald-300 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-xs text-emerald-700 dark:text-emerald-400">Sem pendências — cadastro e operação em ordem</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {sinais.map((s) => (
                <AttentionSignalRow key={s.kind} signal={s} href={ctaHref(s.kind, assistido.id)} />
              ))}
            </div>
          )}
        </section>

        {/* número de processo (cópia rápida) */}
        {assistido.numeroProcesso && (
          <section className="px-5 py-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
              <Scale className="w-3 h-3 text-neutral-400 shrink-0" />
              <span className="font-mono tabular-nums text-xs text-neutral-600 dark:text-neutral-400 flex-1 truncate">
                {assistido.numeroProcesso}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(assistido.numeroProcesso!);
                  toast.success("Copiado!");
                }}
                className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                title="Copiar número"
              >
                <Copy className="w-3 h-3 text-neutral-400" />
              </button>
            </div>
          </section>
        )}
      </div>

      {/* ───────── 4. AÇÕES (sticky footer) ───────── */}
      <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80 backdrop-blur-sm">
        <Link href={ctaHref(cta.kind, assistido.id)} className="block">
          <button className="w-full h-11 sm:h-9 flex items-center justify-center gap-1.5 bg-neutral-900 hover:bg-emerald-600 dark:bg-neutral-700 dark:hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
            {cta.label}
            <ChevronRight className="w-4 h-4" />
          </button>
        </Link>
        <div className="flex items-center gap-2 mt-2">
          <Link href={`/admin/assistidos/${assistido.id}`} className="flex-1">
            <button className="w-full h-11 sm:h-8 flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-300 hover:border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer">
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir perfil
            </button>
          </Link>
          <Link href={`/admin/assistidos/${assistido.id}/editar`}>
            <button className="h-11 w-11 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer" title="Editar">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </Link>
          <Link href={`/admin/demandas/nova?assistido=${assistido.id}`}>
            <button className="h-11 w-11 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer" title="Nova demanda">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </Link>
          {telefoneDisplay && (
            <Link href={`/admin/whatsapp?phone=${telefoneDisplay.replace(/\D/g, "")}`}>
              <button className="h-11 w-11 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer" title="Conversa no OMBUDS">
                <MessageCircle className="w-3.5 h-3.5" />
              </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
