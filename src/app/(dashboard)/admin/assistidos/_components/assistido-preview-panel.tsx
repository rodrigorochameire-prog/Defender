"use client";

import React from "react";
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
  type LucideIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { AssistidoAvatar } from "@/components/shared/assistido-avatar";
import { ATRIBUICAO_OPTIONS, SOLID_COLOR_MAP } from "@/lib/config/atribuicoes";
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
import { AttentionSignalRow, ctaHref } from "@/components/ds/attention";

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

  const ultimasDemandas = (detalhe?.demandas ?? []).slice(0, 3);
  const processosSemCaso = detalhe?.processos
    ? countProcessosSemCaso(detalhe.processos as ReadonlyArray<{ casoId?: number | null }>)
    : undefined;

  const snap = toSnapshot(assistido, { processosSemCaso });
  const comp = completudeFicha(snap);
  const sinais = attentionSignals(snap);
  const cta = contextualCTA(snap);

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
  const primaryAttr = atribuicoes.length ? resolveAttr(atribuicoes[0])?.value ?? null : null;

  const prazoInfo = getPrazoInfo(assistido.proximoPrazo);
  const completudeTone =
    comp.tone === "complete" || comp.tone === "good"
      ? "bg-emerald-500"
      : comp.tone === "warn"
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <div className="flex flex-col h-full">
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
              Cadastro {comp.pct}%
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
          {/* últimas demandas */}
          {ultimasDemandas.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {ultimasDemandas.map((d: { id: number; ato?: string | null; tipoAto?: string | null; prazo?: string | null; status?: string }) => {
                const prazoD = d.prazo ? getPrazoInfo(d.prazo) : null;
                const done = d.status === "7_CONCLUIDO" || d.status === "8_ARQUIVADO";
                return (
                  <div key={d.id} className="flex items-center gap-2 py-0.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", done ? "bg-emerald-400" : "bg-amber-400")} />
                    <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate flex-1">
                      {d.ato || d.tipoAto || "Demanda"}
                    </span>
                    {prazoD && <span className={cn("text-[10px] font-medium shrink-0", prazoD.color)}>{prazoD.text}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </section>

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
          <button className="w-full h-9 flex items-center justify-center gap-1.5 bg-neutral-900 hover:bg-emerald-600 dark:bg-neutral-700 dark:hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer">
            {cta.label}
            <ChevronRight className="w-4 h-4" />
          </button>
        </Link>
        <div className="flex items-center gap-2 mt-2">
          <Link href={`/admin/assistidos/${assistido.id}`} className="flex-1">
            <button className="w-full h-8 flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-300 hover:border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer">
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir perfil
            </button>
          </Link>
          <Link href={`/admin/assistidos/${assistido.id}/editar`}>
            <button className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer" title="Editar">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </Link>
          <Link href={`/admin/demandas/nova?assistido=${assistido.id}`}>
            <button className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer" title="Nova demanda">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </Link>
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <button className="h-8 w-8 flex items-center justify-center rounded-lg border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer" title="WhatsApp">
                <MessageCircle className="w-3.5 h-3.5" />
              </button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
