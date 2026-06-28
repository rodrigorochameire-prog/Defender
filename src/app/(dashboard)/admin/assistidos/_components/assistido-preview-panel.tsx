"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Phone,
  MessageCircle,
  FileText,
  Calendar,
  HardDrive,
  AlertCircle,
  CheckCircle2,
  IdCard,
  Pencil,
  Plus,
  ChevronRight,
  ExternalLink,
  Shield,
  MessageSquare,
  Briefcase,
  Users,
  History,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import { AssistidoAvatar } from "@/components/shared/assistido-avatar";
import { ATRIBUICAO_OPTIONS, SOLID_COLOR_MAP, normalizeAreaToFilter, getAtribuicaoColors } from "@/lib/config/atribuicoes";
import { statusPrisionalInfo } from "@/lib/config/tipologia";
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
import { AttentionSignalRow, ctaHref } from "@/components/ds/attention";
import { tipoEfetivo, tipoEfetivoLabel } from "@/lib/casos/agrupamento";
import { Tag } from "@/components/ds/tag";
import { CollapsibleSection } from "@/components/ds/collapsible-section";

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
  return (
    <span
      className="inline-flex items-center gap-1 text-[10.5px] text-neutral-500 dark:text-neutral-400"
      title={ultimo.toLocaleString("pt-BR")}
    >
      <MessageSquare className="h-3 w-3 text-neutral-400" />
      último contato {relativoContato(ultimo)}
    </span>
  );
}

// ── Painel principal: Resumo (hero) + seções em cards (padrão dos sheets) ──

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
  // Hero "próxima ação" no topo: só urgência crítica (evita duplicar o CTA do rodapé).
  const topSignal = sinais[0] ?? null;
  const showActionBanner = !!topSignal && topSignal.severity === "critical";
  // Pendências exclui o sinal já exibido no banner do topo (sem duplicar).
  const restSignals = showActionBanner ? sinais.filter((s) => s.kind !== topSignal.kind) : sinais;

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
  // Status colorido só para custódia relevante (preso/monitorado); "Solto" fica neutro.
  const isMonit = /MONITOR|TORNOZEL|DOMICILIAR/.test(String(assistido.statusPrisional ?? "").toUpperCase());
  // Classe de texto na cor da atribuição (700/400 — legível), p/ links de ação por área.
  const atribTextCls = primaryAttr ? getAtribuicaoColors(primaryAttr).text : null;

  const prazoInfo = getPrazoInfo(assistido.proximoPrazo);
  // Completude não é urgência — só emerald (ok) ou amber (a completar).
  // Vermelho fica reservado para prazos/audiências (urgência real) abaixo.
  const completudeTone =
    comp.tone === "complete" || comp.tone === "good"
      ? "bg-emerald-400"
      : "bg-amber-400";

  return (
    <div className="flex flex-col h-full">
      {/* Banner fixo no topo: próxima ação (sinal mais urgente). Mesmo visual das pendências. */}
      {showActionBanner && topSignal && (
        <div className="px-4 pt-3 shrink-0">
          <AttentionSignalRow signal={topSignal} href={ctaHref(topSignal.kind, assistido.id)} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-neutral-50/70 dark:bg-neutral-950/30 p-3 space-y-2.5">
        {/* ───────── 1. RESUMO (hero) ───────── */}
        <section className="rounded-xl bg-white dark:bg-neutral-900 shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60 px-4 py-4">
          <div className="flex items-start gap-3.5">
            <AssistidoAvatar
              nome={assistido.nome}
              photoUrl={assistido.photoUrl}
              size="lg"
              atribuicao={primaryAttr}
              statusPrisional={assistido.statusPrisional}
              showStatusDot
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 leading-tight">
                {assistido.nome}
              </h2>
              {assistido.vulgo && (
                <p className="text-xs text-neutral-400 italic mt-0.5">&ldquo;{assistido.vulgo}&rdquo;</p>
              )}
              {/* status (custódia) — único indicador, semântico, com tempo + unidade */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {custodia && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                      isPreso || isMonit
                        ? cn(custodia.bg, custodia.color)
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400",
                    )}
                  >
                    {custodia.label}
                    {isPreso && tempoPreso && <span className="font-mono tabular-nums opacity-80">· {tempoPreso}</span>}
                  </span>
                )}
                {isPreso && assistido.unidadePrisional && (
                  <span className="text-[10px] text-rose-500/80 dark:text-rose-400/70 truncate max-w-[150px]">{assistido.unidadePrisional}</span>
                )}
                {atribuicoes.slice(0, 2).map((attr, idx) => {
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
                        className="text-emerald-600 hover:text-emerald-700 transition-colors"
                        title="WhatsApp Web"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
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
                  className={cn("inline-flex items-center gap-1 text-[10.5px] font-medium transition-opacity hover:opacity-80", atribTextCls ?? "text-emerald-600")}
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
                  <span key={f.label} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                    {f.label}
                  </span>
                ))}
              </div>
              <Link href={`/admin/assistidos/${assistido.id}/editar`} className={cn("inline-flex items-center gap-1 text-[10.5px] hover:opacity-80", atribTextCls ?? "text-emerald-600")}>
                Completar cadastro <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </section>

        {/* ───────── 2. CASOS (processos agrupados) ───────── */}
        <CollapsibleSection id="casos" label="Casos" icon={Briefcase} defaultOpen storageKey="assistido-preview-sections">
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
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: hex }}>{atribLabel}</span>
                            <span className="text-[10px] text-neutral-400">{c.processos.length} proc.</span>
                            {c.analyzedAt && (
                              <Tag tone="accent"><Layers className="w-2.5 h-2.5" /> Análise {safeFmt(c.analyzedAt, "dd/MM")}</Tag>
                            )}
                            {proxAud && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] text-neutral-500 dark:text-neutral-400"><Calendar className="w-2.5 h-2.5 text-neutral-400" /> {safeFmt(proxAud, "dd/MM")}</span>
                            )}
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
                              <Tag>{tlabel}</Tag>
                              <span className="font-mono tabular-nums text-[10px] text-neutral-600 dark:text-neutral-300 truncate flex-1 group-hover:text-emerald-600">{p.numeroAutos || "—"}</span>
                              {p.proximaAudiencia && <span className="inline-flex items-center gap-0.5 text-[9px] text-neutral-500 shrink-0"><Calendar className="w-2.5 h-2.5 text-neutral-400" />{safeFmt(p.proximaAudiencia.data, "dd/MM")}</span>}
                            </Link>
                          );
                        })}
                        <Link href={`/admin/assistidos/${assistido.id}/caso/${c.id}`} className={cn("inline-flex items-center gap-1 text-[10.5px] pt-0.5 hover:opacity-80", atribTextCls ?? "text-emerald-600")}>
                          Abrir caso <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}

              {casosData.semCaso.length > 0 && (
                <div className="rounded-xl border border-neutral-200/70 dark:border-neutral-800 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                      {casosData.semCaso.length} a agrupar
                    </span>
                    <Link href={`/admin/assistidos/${assistido.id}/casos`} className={cn("inline-flex items-center gap-0.5 text-[10.5px] hover:opacity-80", atribTextCls ?? "text-emerald-600")}>
                      Agrupar <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="space-y-0.5">
                    {casosData.semCaso.slice(0, 4).map((p) => {
                      const tlabel = tipoEfetivoLabel(tipoEfetivo({ tipoProcesso: p.tipoProcesso, classeProcessual: p.classeProcessual }));
                      return (
                        <Link key={p.id} href={`/admin/processos/${p.id}`} className="flex items-center gap-2 py-0.5 group">
                          <Tag>{tlabel}</Tag>
                          <span className="font-mono tabular-nums text-[10px] text-neutral-600 dark:text-neutral-300 truncate flex-1 group-hover:text-emerald-600">{p.numeroAutos || "—"}</span>
                        </Link>
                      );
                    })}
                    {casosData.semCaso.length > 4 && (
                      <p className="text-[10px] text-neutral-400 pt-0.5">+{casosData.semCaso.length - 4} processo(s)</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CollapsibleSection>

        {/* ───────── MEDIDAS PROTETIVAS (VVD) ───────── */}
        {medidasVigentes.length > 0 && (
          <CollapsibleSection id="medidas" label="Medidas protetivas" icon={Shield} count={medidasVigentes.length} defaultOpen storageKey="assistido-preview-sections">
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
          </CollapsibleSection>
        )}

        {/* ───────── DOCUMENTOS (colapsável) ───────── */}
        {docsAll.length > 0 && (
          <CollapsibleSection id="documentos" label="Documentos" icon={FileText} count={docsAll.length} storageKey="assistido-preview-sections">
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
                  ? { label: "Análise", tone: "accent" as const }
                  : isAutos
                    ? { label: "Autos", tone: "neutral" as const }
                    : null;
                return (
                  <div key={f.id} className="rounded-lg border border-neutral-100 dark:border-neutral-800 overflow-hidden">
                    <button onClick={() => toggle(k)} className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer">
                      <FileText className="w-3 h-3 text-neutral-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 truncate">{f.name}</p>
                        {selo ? (
                          <Tag tone={selo.tone}>{selo.label}</Tag>
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
                        <a href={openUrl} target="_blank" rel="noopener noreferrer" className={cn("inline-flex items-center gap-1 text-[10.5px] hover:opacity-80", atribTextCls ?? "text-emerald-600")}>Abrir no Drive <ExternalLink className="w-3 h-3" /></a>
                      </div>
                    )}
                  </div>
                );
              })}
              <Link href={`/admin/assistidos/${assistido.id}/documentos`} className={cn("block text-[10px] pt-0.5 hover:opacity-80", atribTextCls ?? "text-emerald-600")}>Ver todos os documentos →</Link>
            </div>
          </CollapsibleSection>
        )}

        {/* ───────── FAMÍLIA / REDE (colapsável) ───────── */}
        {familiaData && familiaData.familiares.length > 0 && (
          <CollapsibleSection id="familia" label="Família e rede" icon={Users} count={familiaData.familiares.length} storageKey="assistido-preview-sections">
            <div className="space-y-0.5">
              {familiaData.familiares.map((f) => {
                const tel = f.telefone ? f.telefone.replace(/\D/g, "") : null;
                return (
                  <div key={f.id} className="flex items-center gap-2 px-1 py-1">
                    <Tag>{f.grau || "—"}</Tag>
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
          </CollapsibleSection>
        )}

        {/* ───────── LINHA DO TEMPO (colapsável) ───────── */}
        {feed.length > 0 && (
          <CollapsibleSection id="timeline" label="Linha do tempo" icon={History} count={feed.length} storageKey="assistido-preview-sections">
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
          </CollapsibleSection>
        )}

        {/* ───────── 3. PENDÊNCIAS (exclui o sinal crítico já no banner) ───────── */}
        {(restSignals.length > 0 || sinais.length === 0) && (
          <CollapsibleSection id="pendencias" label="Pendências" icon={AlertCircle} count={restSignals.length} defaultOpen storageKey="assistido-preview-sections">
            {sinais.length === 0 ? (
              <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/10 border border-emerald-200/60 dark:border-emerald-900/40">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/70 dark:bg-neutral-900/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </span>
                <span className="text-xs text-emerald-700 dark:text-emerald-400">Sem pendências — cadastro e operação em ordem</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {restSignals.map((s) => (
                  <AttentionSignalRow key={s.kind} signal={s} href={ctaHref(s.kind, assistido.id)} />
                ))}
              </div>
            )}
          </CollapsibleSection>
        )}

      </div>

      {/* ───────── 4. AÇÕES (sticky footer) ───────── */}
      <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80 backdrop-blur-sm">
        {cta.kind !== "ver" && !showActionBanner && (
          <Link href={ctaHref(cta.kind, assistido.id)} className="block">
            <button className="w-full h-11 sm:h-9 flex items-center justify-center gap-1.5 bg-neutral-900 hover:bg-emerald-600 dark:bg-neutral-700 dark:hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
              {cta.label}
              <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        )}
        <div className={cn("flex items-center gap-2", cta.kind !== "ver" && !showActionBanner && "mt-2")}>
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
