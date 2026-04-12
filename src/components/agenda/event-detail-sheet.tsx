"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Scale,
  FileText,
  Search,
  Shield,
  Users,
  AlertTriangle,
  ClipboardList,
  Lightbulb,
  Send,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Clock,
  Phone,
  Printer,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  normalizeAreaToFilter,
  SOLID_COLOR_MAP,
} from "@/lib/config/atribuicoes";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function SectionCard({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl bg-white dark:bg-neutral-900 shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60 p-4 hover:shadow-md transition-shadow duration-200",
        className
      )}
    >
      <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 mb-2 tracking-wide">
        {label}
      </p>
      {children}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">{text}</p>
  );
}

function extractArray(obj: Record<string, any> | null | undefined, ...keys: string[]): any[] {
  if (!obj) return [];
  for (const k of keys) {
    const val = obj[k];
    if (Array.isArray(val) && val.length > 0) return val;
  }
  return [];
}

function extractString(obj: Record<string, any> | null | undefined, ...keys: string[]): string | null {
  if (!obj) return null;
  for (const k of keys) {
    const val = obj[k];
    if (typeof val === "string" && val.trim().length > 0) return val.trim();
  }
  return null;
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface EventDetailSheetProps {
  evento: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenRegistro?: () => void;
}

export function EventDetailSheet({
  evento,
  open,
  onOpenChange,
  onOpenRegistro,
}: EventDetailSheetProps) {
  const [copied, setCopied] = useState(false);
  const [quickNote, setQuickNote] = useState("");

  // Resolve numeric audiencia id
  const audienciaIdNum = (() => {
    if (evento?.fonte === "audiencias" && typeof evento.rawId === "number") return evento.rawId;
    if (evento?.fonte === "calendar") return null;
    const raw = evento?.id;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string") {
      const match = raw.match(/^audiencia-(\d+)$/);
      if (match) return parseInt(match[1], 10);
      if (/^\d+$/.test(raw)) return parseInt(raw, 10);
    }
    return null;
  })();

  const { data: ctx, isLoading, error: ctxError } = trpc.audiencias.getAudienciaContext.useQuery(
    { audienciaId: audienciaIdNum ?? 0 },
    { enabled: !!audienciaIdNum && open, retry: false }
  );

  const copyProcesso = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!evento) return null;

  // Derived data
  const dataHora = evento.data && evento.horarioInicio
    ? (() => { try { return new Date(`${evento.data}T${evento.horarioInicio}`); } catch { return null; } })()
    : evento.dataHora ? new Date(evento.dataHora) : null;

  const processoNum = (ctx?.processo as any)?.numeroAutos ?? evento.processo ?? evento.processoNumero ?? null;
  const assistidoNome = ctx?.assistido?.nome ?? evento.assistido ?? evento.assistidoNome ?? null;
  const crime = evento.crime ?? evento.assunto ?? null;
  const juiz = (ctx?.processo as any)?.juiz ?? null;
  const vara = (ctx?.processo as any)?.vara ?? evento.local ?? null;

  // Analysis data shortcuts
  const ad = ctx?.analysisData;
  const caso = ctx?.caso;

  // 1. Imputacao
  const imputacao = extractString(ad, "imputacao", "crimes_imputados")
    ?? extractString(caso, "foco")
    ?? null;

  // 2. Fatos
  const fatos = caso?.narrativaDenuncia
    ?? extractString(ad, "resumo_executivo", "narrativa_denuncia")
    ?? null;

  // 3. Elementos
  const laudos = extractArray(ad, "laudos", "laudos_mencionados", "laudos_periciais");
  const lacunas = extractArray(ad, "vulnerabilidades_acusacao", "lacunas_probatorias", "lacunas");

  // 4. Versao do acusado
  const versaoDelegacia = extractString(ad, "versao_delegacia", "versao_reu_delegacia");
  const atendimento = ctx?.atendimentos?.[0];
  const versaoAtendimento = atendimento?.resumo
    ?? atendimento?.transcricaoResumo
    ?? (atendimento?.pontosChave as any)
    ?? null;

  // 5. Diligencias
  const diligencias = ctx?.diligencias ?? [];

  // 6. Depoentes / testemunhas
  const testemunhasDB = ctx?.testemunhas ?? [];
  const testemunhasAcusacao = extractArray(ad, "testemunhas_acusacao");
  const testemunhasDefesa = extractArray(ad, "testemunhas_defesa");
  const allDepoentes = [
    ...testemunhasDB.map((t: any) => ({ ...t, _source: "db" })),
    ...testemunhasAcusacao.map((t: any) => ({ ...t, lado: "acusacao", _source: "analysis" })),
    ...testemunhasDefesa.map((t: any) => ({ ...t, lado: "defesa", _source: "analysis" })),
  ];
  const seen = new Set<string>();
  const depoentes = allDepoentes.filter((d) => {
    const key = (d.nome ?? d.name ?? "").toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 7. Contradicoes
  const contradicoes = extractArray(ad, "contradicoes", "vulnerabilidades_acusacao")
    .filter((item: any) => {
      if (typeof item === "string") return true;
      return item?.tipo === "contradicao" || item?.contradicao;
    });

  // 8. Pendencias
  const pendencias = extractArray(ad, "pendencias_diligencia_pre_aij", "pendencias", "pendencias_operacionais");

  // 9. Teses
  const teses = extractArray(ad, "teses_defesa", "teses")
    .filter(Boolean);
  const teoriaDireito = caso?.teoriaDireito;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[480px] md:w-[560px] p-0 flex flex-col gap-0 border-l-0 outline-none bg-[#f7f7f7] dark:bg-neutral-950 rounded-l-2xl sm:rounded-l-none shadow-2xl [&>button:first-of-type]:hidden"
      >
        <SheetTitle className="sr-only">Detalhes do evento</SheetTitle>

        {/* ===== STICKY NAV HEADER — Padrão Defender sheet bar ===== */}
        <div className="sticky top-0 z-10 bg-neutral-50/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/40 dark:border-neutral-800/60 px-4 py-2.5 flex items-center justify-between">
          <SheetHeader className="p-0 space-y-0">
            <SheetTitle className="text-[13px] font-semibold text-foreground tracking-tight">
              Evento
            </SheetTitle>
          </SheetHeader>
          <button
            onClick={() => onOpenChange(false)}
            className="w-7 h-7 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-all duration-150 cursor-pointer flex items-center justify-center"
            title="Fechar (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ===== SCROLLABLE CONTENT ===== */}
        <div className="flex-1 overflow-y-auto">
          {/* ===== HERO HEADER — cinza claro com texto escuro ===== */}
          <div className="mx-3 mt-3 mb-4 px-4 py-4 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/40 shadow-sm shadow-black/[0.03]">
            <div className="flex items-start gap-3.5">
              {/* Avatar com ring de atribuição */}
              {(() => {
                const filterKey = normalizeAreaToFilter(evento.atribuicaoKey || evento.atribuicao || "");
                const atribColor = SOLID_COLOR_MAP[filterKey] || "#a1a1aa";
                return (
                  <div
                    className="w-11 h-11 rounded-xl bg-white dark:bg-neutral-700 flex items-center justify-center shrink-0"
                    style={{ boxShadow: `0 0 0 2.5px ${atribColor}` }}
                  >
                    <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-300">
                      {(assistidoNome || evento.titulo || "").split(" ").filter(Boolean).slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()}
                    </span>
                  </div>
                );
              })()}
              <div className="flex-1 min-w-0 pt-0.5">
                {assistidoNome && (
                  <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 leading-tight truncate">
                    {assistidoNome}
                  </h2>
                )}
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {processoNum && (
                    <button
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-neutral-200/60 dark:bg-neutral-700/60 hover:bg-neutral-200 dark:hover:bg-neutral-700 group/proc cursor-pointer transition-all duration-150"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyProcesso(processoNum);
                      }}
                      title="Copiar número do processo"
                    >
                      <span className="font-mono text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400 group-hover/proc:text-neutral-700 dark:group-hover/proc:text-neutral-200 transition-colors">{processoNum}</span>
                      {copied ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5 text-neutral-400 group-hover/proc:text-neutral-600 transition-colors" />}
                    </button>
                  )}
                  {dataHora && (
                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums">
                      {format(dataHora, "HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </div>
                {(vara) && (
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1.5 leading-snug">
                    {vara}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ===== SECTION CARDS ===== */}
          <div className="px-3 pb-4 space-y-2.5">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
              </div>
            )}

            {!isLoading && (
              <>
                {/* 1. IMPUTACAO */}
                <SectionCard label="Imputacao">
                  {imputacao ? (
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      {typeof imputacao === "string"
                        ? imputacao
                        : Array.isArray(imputacao)
                          ? (imputacao as string[]).join(", ")
                          : String(imputacao)}
                    </p>
                  ) : (
                    <EmptyHint text="Imputacao nao extraida — rode a analise IA." />
                  )}
                </SectionCard>

                {/* 2. FATOS (DENUNCIA) */}
                <SectionCard label="Fatos (Denuncia)">
                  {fatos ? (
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      {fatos}
                    </p>
                  ) : (
                    <EmptyHint text="Narrativa da denuncia nao disponivel." />
                  )}
                </SectionCard>

                {/* 3. ELEMENTOS */}
                {(laudos.length > 0 || lacunas.length > 0) && (
                  <SectionCard label="Elementos">
                    {laudos.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] tracking-wide font-medium text-neutral-400 mb-1">
                          Laudos
                        </p>
                        <ul className="space-y-1">
                          {laudos.map((l: any, i: number) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                              <ClipboardList className="w-3 h-3 text-neutral-400 mt-0.5 flex-shrink-0" />
                              <span>{typeof l === "string" ? l : l.nome ?? l.titulo ?? l.descricao ?? JSON.stringify(l)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {lacunas.length > 0 && (
                      <div>
                        <p className="text-[10px] tracking-wide font-medium text-neutral-400 mb-1">
                          Lacunas
                        </p>
                        <ul className="space-y-1">
                          {lacunas.map((l: any, i: number) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-400/70" />
                              <span>{typeof l === "string" ? l : l.descricao ?? l.vulnerabilidade ?? JSON.stringify(l)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </SectionCard>
                )}

                {/* 4. VERSAO DO ACUSADO */}
                <SectionCard label="Versao do Acusado">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400/70" />
                        <span className="text-[10px] tracking-wide font-semibold text-neutral-500 dark:text-neutral-400">
                          Delegacia
                        </span>
                      </div>
                      {versaoDelegacia ? (
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed pl-3.5">
                          {versaoDelegacia}
                        </p>
                      ) : (
                        <p className="text-xs text-neutral-400 italic pl-3.5">
                          Versao na delegacia nao extraida.
                        </p>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
                        <span className="text-[10px] tracking-wide font-semibold text-neutral-500 dark:text-neutral-400">
                          Atendimento Defensoria
                        </span>
                        {atendimento?.data && (
                          <span className="text-[10px] text-neutral-400 ml-auto">
                            {format(new Date(String(atendimento.data)), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                      {versaoAtendimento ? (
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed pl-3.5">
                          {typeof versaoAtendimento === "string" ? versaoAtendimento : JSON.stringify(versaoAtendimento)}
                        </p>
                      ) : (
                        <p className="text-xs text-neutral-400 italic pl-3.5">
                          Nenhum atendimento registrado — agende entrevista.
                        </p>
                      )}
                    </div>
                  </div>
                </SectionCard>

                {/* 5. INVESTIGACAO DEFENSIVA */}
                <SectionCard label="Investigacao Defensiva">
                  {diligencias.length > 0 ? (
                    <ul className="space-y-2">
                      {diligencias.map((d: any) => {
                        const statusColor =
                          d.status === "concluida" || d.status === "concluída"
                            ? "bg-emerald-50 text-emerald-600/80 dark:bg-emerald-900/20 dark:text-emerald-400"
                            : d.status === "em_andamento" || d.status === "em andamento"
                              ? "bg-amber-50 text-amber-600/80 dark:bg-amber-900/20 dark:text-amber-400"
                              : d.status === "frustrada" || d.status === "cancelada"
                                ? "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                                : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400";
                        return (
                          <li key={d.id} className="text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-neutral-700 dark:text-neutral-300 font-medium flex-1 min-w-0 truncate">
                                {d.titulo}
                              </span>
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0", statusColor)}>
                                {d.status ?? "pendente"}
                              </span>
                            </div>
                            {d.resultado && (
                              <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                                {d.resultado}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <EmptyHint text="Nenhuma diligencia registrada." />
                  )}
                </SectionCard>

                {/* 6. DEPOENTES */}
                <SectionCard label={`Depoentes${depoentes.length > 0 ? ` (${depoentes.length})` : ""}`}>
                  {depoentes.length > 0 ? (
                    <ul className="space-y-1.5">
                      {depoentes.map((d: any, i: number) => {
                        const isAcusacao = d.lado === "acusacao" || d.tipo === "ACUSACAO" || d.tipo === "vitima" || d.tipo === "VITIMA";
                        const isDefesa = d.lado === "defesa" || d.tipo === "DEFESA";
                        const borderColor = isAcusacao
                          ? "border-l-rose-300/60"
                          : isDefesa
                            ? "border-l-emerald-300/60"
                            : "border-l-neutral-200";
                        const bgColor = isAcusacao
                          ? "bg-rose-50/30 dark:bg-rose-950/10"
                          : isDefesa
                            ? "bg-emerald-50/30 dark:bg-emerald-950/10"
                            : "";
                        const nome = d.nome ?? d.name ?? "Sem nome";
                        const resumo = d.resumo ?? d.versao_delegacia ?? d.versao ?? null;
                        const statusLabel = d.status ?? d.situacao ?? null;

                        return (
                          <li
                            key={i}
                            className={cn(
                              "rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 border-l-[3px] px-3 py-2",
                              borderColor,
                              bgColor
                            )}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">
                                {nome}
                              </span>
                              {(d.lado || d.tipo) && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] py-0 px-1",
                                    isAcusacao ? "border-rose-300 text-rose-600" : isDefesa ? "border-emerald-300 text-emerald-600" : ""
                                  )}
                                >
                                  {isAcusacao ? "ACUS" : isDefesa ? "DEF" : (d.tipo ?? "")}
                                </Badge>
                              )}
                              {statusLabel && (
                                <span className="text-[10px] text-neutral-400">{statusLabel}</span>
                              )}
                            </div>
                            {resumo && (
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed line-clamp-2">
                                {resumo}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <EmptyHint text="Nenhum depoente cadastrado." />
                  )}
                </SectionCard>

                {/* 7. CONTRADICOES */}
                {contradicoes.length > 0 && (
                  <SectionCard label="Contradicoes">
                    <ul className="space-y-1.5">
                      {contradicoes.map((c: any, i: number) => {
                        const text = typeof c === "string" ? c : c.descricao ?? c.contradicao ?? c.vulnerabilidade ?? JSON.stringify(c);
                        const isBom = typeof c === "object" && (c.favoravel === true || c.tipo === "favoravel");
                        return (
                          <li key={i} className="flex items-start gap-2 text-xs">
                            <span className={cn("mt-0.5 flex-shrink-0", isBom ? "text-emerald-400/70" : "text-amber-400/70")}>
                              {isBom ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                            </span>
                            <span className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                              {text}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </SectionCard>
                )}

                {/* 8. PENDENCIAS */}
                {pendencias.length > 0 && (
                  <SectionCard label="Pendencias">
                    <ul className="space-y-1">
                      {pendencias.map((p: any, i: number) => {
                        const text = typeof p === "string" ? p : p.descricao ?? p.pendencia ?? p.titulo ?? JSON.stringify(p);
                        return (
                          <li key={i} className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-400/70" />
                            <span>{text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </SectionCard>
                )}

                {/* 9. TESES */}
                <SectionCard label="Teses">
                  {teses.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {teses.map((t: any, i: number) => {
                        const text = typeof t === "string" ? t : t.tese ?? t.descricao ?? t.nome ?? JSON.stringify(t);
                        const viabilidade = typeof t === "object" ? t.viabilidade ?? t.probabilidade : null;
                        const color =
                          viabilidade === "alta" || viabilidade === "forte"
                            ? "bg-emerald-50 text-emerald-600/80 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200/60"
                            : viabilidade === "media" || viabilidade === "moderada"
                              ? "bg-amber-50 text-amber-600/80 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200/60"
                              : "bg-neutral-50 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200/60 dark:border-neutral-700";
                        return (
                          <span
                            key={i}
                            className={cn(
                              "text-[11px] px-2 py-0.5 rounded-full border font-medium",
                              color
                            )}
                          >
                            {text}
                          </span>
                        );
                      })}
                    </div>
                  ) : teoriaDireito ? (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      {teoriaDireito}
                    </p>
                  ) : (
                    <EmptyHint text="Nenhuma tese identificada." />
                  )}
                </SectionCard>
              </>
            )}
          </div>
        </div>

        {/* ===== STICKY FOOTER — Padrão Defender ===== */}
        <div className="sticky bottom-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200/40 dark:border-neutral-800/60 px-4 py-3 space-y-2">
          {/* Anotacao rapida */}
          <div className="flex gap-2">
            <Input
              placeholder="Anotacao rapida..."
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              className="text-xs h-8 rounded-lg bg-white dark:bg-neutral-900 border-neutral-200/60 dark:border-neutral-700 focus:ring-emerald-500/30"
              onKeyDown={(e) => {
                if (e.key === "Enter" && quickNote.trim()) {
                  toast.success("Anotacao salva (em breve persistida).");
                  setQuickNote("");
                }
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-neutral-400 hover:text-neutral-600"
              disabled={!quickNote.trim()}
              onClick={() => {
                toast.success("Anotacao salva (em breve persistida).");
                setQuickNote("");
              }}
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Abrir Registro Completo */}
          {onOpenRegistro && (
            <Button
              onClick={onOpenRegistro}
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold h-9 shadow-sm cursor-pointer transition-all duration-150"
            >
              <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
              Abrir Registro Completo
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
