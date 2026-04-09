"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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
        "bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4",
        className
      )}
    >
      <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
        {label}
      </p>
      {children}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">{text}</p>
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
  // Merge: DB testemunhas + analysis testemunhas
  const allDepoentes = [
    ...testemunhasDB.map((t: any) => ({ ...t, _source: "db" })),
    ...testemunhasAcusacao.map((t: any) => ({ ...t, lado: "acusacao", _source: "analysis" })),
    ...testemunhasDefesa.map((t: any) => ({ ...t, lado: "defesa", _source: "analysis" })),
  ];
  // Deduplicate by name
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
        className="w-full sm:w-[480px] p-0 flex flex-col gap-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 [&>button:first-of-type]:hidden"
      >
        <SheetTitle className="sr-only">Detalhes do evento</SheetTitle>

        {/* ── HEADER (sticky) ── */}
        <div className="px-5 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-10">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {assistidoNome && (
                <p className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                  {assistidoNome}
                </p>
              )}
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                {processoNum && (
                  <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    {processoNum}
                    <button onClick={() => copyProcesso(processoNum)} className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </span>
                )}
                {crime && (
                  <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 border-zinc-300 dark:border-zinc-700">
                    {crime}
                  </Badge>
                )}
                {dataHora && (
                  <span className="text-xs text-zinc-400">
                    {format(dataHora, "HH:mm", { locale: ptBR })}
                  </span>
                )}
              </div>
              {(juiz || vara) && (
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                  {juiz && <>Juiz: {juiz}</>}
                  {juiz && vara && " · "}
                  {vara && <>{vara}</>}
                </p>
              )}
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100/80 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
            </div>
          )}

          {!isLoading && (
            <>
              {/* 1. IMPUTACAO */}
              <SectionCard label="Imputacao">
                {imputacao ? (
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
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
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
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
                      <p className="text-[10px] uppercase tracking-wider font-medium text-zinc-400 mb-1">
                        Laudos
                      </p>
                      <ul className="space-y-1">
                        {laudos.map((l: any, i: number) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                            <ClipboardList className="w-3 h-3 text-zinc-400 mt-0.5 flex-shrink-0" />
                            <span>{typeof l === "string" ? l : l.nome ?? l.titulo ?? l.descricao ?? JSON.stringify(l)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {lacunas.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-medium text-zinc-400 mb-1">
                        Lacunas / Vulnerabilidades
                      </p>
                      <ul className="space-y-1">
                        {lacunas.map((l: any, i: number) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
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
                  {/* Delegacia */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-500">
                        Delegacia
                      </span>
                    </div>
                    {versaoDelegacia ? (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed pl-3.5">
                        {versaoDelegacia}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-400 italic pl-3.5">
                        Versao na delegacia nao extraida.
                      </p>
                    )}
                  </div>
                  {/* Atendimento Defensoria */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-500">
                        Atendimento Defensoria
                      </span>
                      {atendimento?.data && (
                        <span className="text-[10px] text-zinc-400 ml-auto">
                          {format(new Date(String(atendimento.data)), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                    {versaoAtendimento ? (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed pl-3.5">
                        {typeof versaoAtendimento === "string" ? versaoAtendimento : JSON.stringify(versaoAtendimento)}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-400 italic pl-3.5">
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
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : d.status === "em_andamento" || d.status === "em andamento"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                            : d.status === "frustrada" || d.status === "cancelada"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
                      return (
                        <li key={d.id} className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-700 dark:text-zinc-300 font-medium flex-1 min-w-0 truncate">
                              {d.titulo}
                            </span>
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0", statusColor)}>
                              {d.status ?? "pendente"}
                            </span>
                          </div>
                          {d.resultado && (
                            <p className="text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
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
                        ? "border-l-rose-300"
                        : isDefesa
                          ? "border-l-emerald-300"
                          : "border-l-zinc-300";
                      const bgColor = isAcusacao
                        ? "bg-rose-50/40 dark:bg-rose-950/10"
                        : isDefesa
                          ? "bg-emerald-50/40 dark:bg-emerald-950/10"
                          : "";
                      const nome = d.nome ?? d.name ?? "Sem nome";
                      const resumo = d.resumo ?? d.versao_delegacia ?? d.versao ?? null;
                      const statusLabel = d.status ?? d.situacao ?? null;

                      return (
                        <li
                          key={i}
                          className={cn(
                            "rounded-lg border border-zinc-200/80 dark:border-zinc-700/60 border-l-[3px] px-3 py-2",
                            borderColor,
                            bgColor
                          )}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">
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
                              <span className="text-[10px] text-zinc-400">{statusLabel}</span>
                            )}
                          </div>
                          {resumo && (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed line-clamp-2">
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
                          <span className={cn("mt-0.5 flex-shrink-0", isBom ? "text-emerald-500" : "text-rose-500")}>
                            {isBom ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          </span>
                          <span className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
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
                        <li key={i} className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
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
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300"
                          : viabilidade === "media" || viabilidade === "moderada"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700";
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
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {teoriaDireito}
                  </p>
                ) : (
                  <EmptyHint text="Nenhuma tese identificada." />
                )}
              </SectionCard>
            </>
          )}
        </div>

        {/* ── FOOTER (sticky) ── */}
        <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-2">
          {/* Anotacao rapida */}
          <div className="flex gap-2">
            <Input
              placeholder="Anotacao rapida..."
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              className="text-xs h-8 rounded-lg border-zinc-200 dark:border-zinc-700"
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
              className="h-8 px-2"
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
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9"
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
