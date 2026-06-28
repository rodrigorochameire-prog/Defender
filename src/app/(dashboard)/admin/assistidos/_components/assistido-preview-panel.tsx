"use client";

import React, { useState } from "react";
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
import { UltimoContato } from "../[id]/_components/ultimo-contato";

// ── Subcomponentes locais (StatCell/BlockHeader; sinais de atenção vêm do DS) ──

function BlockHeader({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <p className={cn(TYPO.label, "flex items-center gap-1.5 mb-2.5")}>
      <Icon className="w-3 h-3" />
      {children}
    </p>
  );
}

function StatCell({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  href: string;
}) {
  const external = href.startsWith("http");
  const Wrapper: any = external ? "a" : Link;
  const props = external ? { href, target: "_blank", rel: "noopener noreferrer" } : { href };
  return (
    <Wrapper
      {...props}
      className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 transition-all cursor-pointer group"
    >
      <Icon className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-500 transition-colors" />
      <span className="text-base font-bold text-neutral-800 dark:text-neutral-100 tabular-nums">{value}</span>
      <span className="text-[10px] text-neutral-400">{label}</span>
    </Wrapper>
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

  // Acordeão: um item expandido por vez (processo/demanda/documento) mostra prévia inline.
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const toggle = (k: string) => setExpandedKey((prev) => (prev === k ? null : k));

  const ultimasDemandas = (detalhe?.demandas ?? []).slice(0, 3);
  const processosLista = (detalhe?.processos ?? []).slice(0, 4);
  const totalProcessos = detalhe?.processos?.length ?? 0;
  const documentosRecentes = (detalhe?.driveFiles ?? []).filter((f) => !f.isFolder).slice(0, 4);
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
          {/* completude — fonte canônica */}
          <div className="mt-3.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", completudeTone)}
                style={{ width: `${comp.pct}%` }}
              />
            </div>
            <span className="text-[10px] text-neutral-400 tabular-nums font-medium">
              Ficha {comp.pct}%
            </span>
          </div>
          {comp.faltam.length > 0 && (
            <p className="mt-1 text-[10px] text-neutral-400">
              falta: {comp.faltam.map((f) => f.label).join(", ")}
            </p>
          )}
        </section>

        {/* ───────── 2. ATIVIDADE ───────── */}
        <section className="px-5 py-4">
          <BlockHeader icon={Clock}>Atividade</BlockHeader>
          <div className="grid grid-cols-4 gap-2 mb-3">
            <StatCell icon={Scale} label="Processos" value={assistido.processosAtivos || 0} href={`/admin/assistidos/${assistido.id}/casos`} />
            <StatCell icon={FileText} label="Demandas" value={assistido.demandasAbertas || 0} href={`/admin/assistidos/${assistido.id}/demandas`} />
            <StatCell icon={Calendar} label="Agenda" value={assistido.proximaAudiencia ? 1 : 0} href={`/admin/assistidos/${assistido.id}/audiencias`} />
            <StatCell
              icon={HardDrive}
              label="Arquivos"
              value={assistido.driveFilesCount || 0}
              href={
                assistido.driveFolderId
                  ? `https://drive.google.com/drive/folders/${assistido.driveFolderId}`
                  : `/admin/assistidos/${assistido.id}/documentos`
              }
            />
          </div>
          {/* eventos próximos */}
          {(assistido.proximaAudiencia || assistido.proximoPrazo) && (
            <div className="space-y-1.5">
              {assistido.proximaAudiencia && (
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="w-3 h-3 text-violet-500 shrink-0" />
                  <span className="text-neutral-600 dark:text-neutral-300 flex-1">
                    {assistido.tipoProximaAudiencia || "Audiência"}
                  </span>
                  <span className="font-mono tabular-nums text-neutral-500">
                    {format(parseISO(assistido.proximaAudiencia), "dd/MM HH:mm")}
                  </span>
                </div>
              )}
              {assistido.proximoPrazo && (
                <div className="flex items-center gap-2 text-xs">
                  <Timer className={cn("w-3 h-3 shrink-0", prazoInfo?.color)} />
                  <span className="text-neutral-600 dark:text-neutral-300 flex-1 truncate">
                    {assistido.atoProximoPrazo || "Prazo"}
                  </span>
                  {prazoInfo && (
                    <span className={cn("font-medium", prazoInfo.color)}>{prazoInfo.text}</span>
                  )}
                </div>
              )}
            </div>
          )}
          {/* últimas demandas — expansíveis */}
          {ultimasDemandas.length > 0 && (
            <div className="mt-3 space-y-1">
              {ultimasDemandas.map((d) => {
                const prazoD = d.prazo ? getPrazoInfo(d.prazo) : null;
                const done = d.status === "CONCLUIDO" || d.status === "ARQUIVADO";
                const k = `dem-${d.id}`;
                const open = expandedKey === k;
                const procNum = d.processoId ? detalhe?.processos?.find((p) => p.id === d.processoId)?.numeroAutos : null;
                return (
                  <div key={d.id} className="rounded-lg border border-transparent hover:border-neutral-200/70 dark:hover:border-neutral-800 transition-colors">
                    <button onClick={() => toggle(k)} className="w-full flex items-center gap-2 px-1.5 py-1 text-left cursor-pointer">
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", done ? "bg-emerald-400" : "bg-amber-400")} />
                      <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate flex-1">
                        {d.ato || d.tipoAto || "Demanda"}
                      </span>
                      {prazoD && <span className={cn("text-[10px] font-medium shrink-0", prazoD.color)}>{prazoD.text}</span>}
                      <ChevronRight className={cn("w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 shrink-0 transition-transform", open && "rotate-90")} />
                    </button>
                    {open && (
                      <div className="mx-1.5 mb-1.5 px-2.5 py-2 rounded-md bg-neutral-50 dark:bg-neutral-800/30 space-y-1">
                        {d.status && <p className="text-[11px] text-neutral-600 dark:text-neutral-300"><span className="text-neutral-400">Status: </span>{d.status}</p>}
                        {d.defensorNome && <p className="text-[11px] text-neutral-600 dark:text-neutral-300"><span className="text-neutral-400">Defensor: </span>{d.defensorNome}</p>}
                        {procNum && <p className="text-[11px] text-neutral-600 dark:text-neutral-300 font-mono tabular-nums truncate"><span className="text-neutral-400 font-sans">Processo: </span>{procNum}</p>}
                        <Link href={`/admin/demandas?assistidoId=${assistido.id}`} className="inline-flex items-center gap-1 text-[10.5px] text-emerald-600 hover:text-emerald-700">
                          Abrir demanda <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
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
                      {m.dataVencimento ? `vence ${format(new Date(m.dataVencimento), "dd/MM/yyyy")}` : "sem vencimento"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ───────── PROCESSOS ───────── */}
        {processosLista.length > 0 && (
          <section className="px-5 py-4">
            <BlockHeader icon={Scale}>Processos</BlockHeader>
            <div className="space-y-1.5">
              {processosLista.map((p) => {
                const k = `proc-${p.id}`;
                const open = expandedKey === k;
                const auds = (detalhe?.audiencias ?? []).filter((a) => a.processoId === p.id);
                const dems = (detalhe?.demandas ?? []).filter((d) => d.processoId === p.id);
                const proxAud = auds
                  .filter((a) => new Date(a.dataAudiencia).getTime() >= Date.now())
                  .sort((a, b) => new Date(a.dataAudiencia).getTime() - new Date(b.dataAudiencia).getTime())[0];
                return (
                  <div key={p.id} className="rounded-lg border border-neutral-100 dark:border-neutral-800 overflow-hidden">
                    <button onClick={() => toggle(k)} className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer">
                      <Scale className="w-3 h-3 text-neutral-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono tabular-nums text-neutral-700 dark:text-neutral-300 truncate">{p.numeroAutos || "—"}</p>
                        {(p.vara || p.assunto) && <p className="text-[10px] text-neutral-400 truncate">{p.vara || p.assunto}</p>}
                      </div>
                      {p.fase && <span className="text-[9px] text-neutral-400 shrink-0 uppercase">{p.fase}</span>}
                      <ChevronRight className={cn("w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 shrink-0 transition-transform", open && "rotate-90")} />
                    </button>
                    {open && (
                      <div className="px-2.5 pb-2.5 pt-1.5 space-y-1.5 bg-neutral-50/60 dark:bg-neutral-800/20 border-t border-neutral-100 dark:border-neutral-800">
                        {p.situacao && <p className="text-[11px] text-neutral-600 dark:text-neutral-300"><span className="text-neutral-400">Situação: </span>{p.situacao}</p>}
                        {p.papel && <p className="text-[11px] text-neutral-600 dark:text-neutral-300"><span className="text-neutral-400">Papel: </span>{p.papel}</p>}
                        {proxAud && (
                          <p className="text-[11px] flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                            <Calendar className="w-3 h-3 text-violet-500 shrink-0" />
                            {format(new Date(proxAud.dataAudiencia), "dd/MM HH:mm")} · {proxAud.tipo || "Audiência"}
                          </p>
                        )}
                        <p className="text-[10px] text-neutral-400">{dems.length} demanda(s) · {auds.length} audiência(s)</p>
                        <Link href={`/admin/processos/${p.id}`} className="inline-flex items-center gap-1 text-[10.5px] text-emerald-600 hover:text-emerald-700">
                          Abrir processo <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
              {totalProcessos > 4 && (
                <Link href={`/admin/assistidos/${assistido.id}/casos`} className="block text-[10px] text-emerald-600 hover:text-emerald-700 pt-0.5">
                  +{totalProcessos - 4} processo(s) →
                </Link>
              )}
            </div>
          </section>
        )}

        {/* ───────── DOCUMENTOS RECENTES ───────── */}
        {documentosRecentes.length > 0 && (
          <section className="px-5 py-4">
            <BlockHeader icon={FileText}>Documentos recentes</BlockHeader>
            <div className="space-y-1.5">
              {documentosRecentes.map((f) => {
                const k = `doc-${f.id}`;
                const open = expandedKey === k;
                const isImg = (f.mimeType ?? "").startsWith("image/");
                const openUrl = f.webViewLink || `https://drive.google.com/file/d/${f.driveFileId}/view`;
                return (
                  <div key={f.id} className="rounded-lg border border-neutral-100 dark:border-neutral-800 overflow-hidden">
                    <button onClick={() => toggle(k)} className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer">
                      <FileText className="w-3 h-3 text-neutral-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 truncate">{f.name}</p>
                        {(f.documentType || f.categoria) && <p className="text-[10px] text-neutral-400 truncate">{f.documentType || f.categoria}</p>}
                      </div>
                      <span className="text-[9px] text-neutral-400 tabular-nums shrink-0">
                        {f.lastModifiedTime && format(new Date(f.lastModifiedTime), "dd/MM")}
                      </span>
                      <ChevronRight className={cn("w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 shrink-0 transition-transform", open && "rotate-90")} />
                    </button>
                    {open && (
                      <div className="px-2.5 pb-2.5 pt-1.5 space-y-2 bg-neutral-50/60 dark:bg-neutral-800/20 border-t border-neutral-100 dark:border-neutral-800">
                        {isImg && f.driveFileId && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`https://drive.google.com/thumbnail?id=${f.driveFileId}&sz=w400`}
                            alt={f.name ?? "documento"}
                            loading="lazy"
                            className="w-full max-h-44 object-contain rounded-md border border-neutral-200 dark:border-neutral-700 bg-white"
                          />
                        )}
                        <p className="text-[10px] text-neutral-400">
                          {f.mimeType || "arquivo"}
                          {f.lastModifiedTime ? ` · ${format(new Date(f.lastModifiedTime), "dd/MM/yyyy HH:mm")}` : ""}
                        </p>
                        <a href={openUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10.5px] text-emerald-600 hover:text-emerald-700">
                          Abrir no Drive <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
              <Link href={`/admin/assistidos/${assistido.id}/documentos`} className="block text-[10px] text-emerald-600 hover:text-emerald-700 pt-0.5">
                Ver todos os documentos →
              </Link>
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
