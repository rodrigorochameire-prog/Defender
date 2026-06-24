"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo } from "react";
import { Microscope, Users, MapPin, Scale, Fingerprint, AlertTriangle, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// ── Tipologia de persona (testemunha/réu/vítima…) ───────────────────
function corPersona(tipo: string): string {
  const t = tipo.toUpperCase();
  if (t.includes("TESTEMUNH")) return "#3b82f6";
  if (t.includes("VITIM") || t.includes("OFENDID")) return "#f43f5e";
  if (t.includes("REU") || t.includes("ACUSAD") || t.includes("INDICIAD")) return "#f59e0b";
  if (t.includes("JURADO")) return "#a855f7";
  if (t.includes("POLICIAL") || t.includes("AGENTE")) return "#06b6d4";
  if (t.includes("PERIT")) return "#8b5cf6";
  return "#737373";
}

function corSeveridade(sev: string | null): string {
  const s = (sev ?? "").toLowerCase();
  if (s.includes("alta") || s.includes("critic") || s.includes("grave")) return "text-rose-600 dark:text-rose-400";
  if (s.includes("media") || s.includes("média")) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

// ── Rótulos do modus operandi ───────────────────────────────────────
const MODUS_LABELS: Record<string, { label: string; valores?: Record<string, string> }> = {
  abordagem: {
    label: "Abordagem",
    valores: {
      "denuncia-anonima": "Denúncia anônima", "flagrante-ronda": "Flagrante em ronda",
      bloqueio: "Bloqueio/blitz", "investigacao-previa": "Investigação prévia",
      mandado: "Mandado", "apresentacao-espontanea": "Apresentação espontânea", outro: "Outro",
    },
  },
  armaUsada: {
    label: "Arma",
    valores: { fogo: "De fogo", branca: "Branca", impropriada: "Imprópria", nenhuma: "Nenhuma", simulada: "Simulada" },
  },
  relacaoAutorVitima: {
    label: "Relação autor-vítima",
    valores: {
      desconhecido: "Desconhecido", "conhecido-esporadico": "Conhecido esporádico", familiar: "Familiar",
      "conjugal-atual": "Conjugal atual", "conjugal-ex": "Conjugal (ex)", laboral: "Laboral", vizinho: "Vizinho",
    },
  },
  horarioFato: { label: "Horário", valores: { madrugada: "Madrugada", manha: "Manhã", tarde: "Tarde", noite: "Noite" } },
  contexto: {
    label: "Contexto",
    valores: {
      domicilio: "Domicílio", "via-publica": "Via pública", "estabelecimento-comercial": "Comércio",
      escolar: "Escolar", transito: "Trânsito", virtual: "Virtual", outro: "Outro",
    },
  },
};

function ChipModus({ chave, valor }: { chave: string; valor: string }) {
  const cfg = MODUS_LABELS[chave];
  if (!cfg) return null;
  const v = cfg.valores?.[valor] ?? valor;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 dark:bg-white/[0.05] px-2 py-0.5 text-[10px]">
      <span className="text-neutral-400">{cfg.label}:</span>
      <span className="font-medium text-foreground/80">{v}</span>
    </span>
  );
}

function Secao({ icon: Icon, titulo, count, children }: { icon: typeof Users; titulo: string; count: number; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200/80 dark:ring-neutral-800 shadow-sm">
      <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 text-[12px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        <Icon className="w-3.5 h-3.5" />
        {titulo}
        <span className="ml-1 text-[10px] font-normal normal-case text-neutral-400">{count}</span>
      </div>
      <div className="px-4 pb-4">{children}</div>
    </section>
  );
}

export default function InvestigacaoPage() {
  const params = useParams();
  const id = Number(params?.id);
  const { data, isLoading } = trpc.assistidos.getInvestigacao.useQuery(
    { assistidoId: id },
    { enabled: !isNaN(id) },
  );
  const { data: assistido } = trpc.assistidos.getById.useQuery({ id }, { enabled: !isNaN(id) });
  const procNumeros = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of assistido?.processos ?? []) if (p.numeroAutos) m.set(p.id, p.numeroAutos);
    return m;
  }, [assistido?.processos]);

  const personasPorTipo = useMemo(() => {
    const g = new Map<string, NonNullable<typeof data>["personas"]>();
    for (const p of data?.personas ?? []) {
      const k = p.tipo || "OUTRO";
      const arr = g.get(k) ?? [];
      arr.push(p);
      g.set(k, arr);
    }
    return [...g.entries()];
  }, [data?.personas]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-900" />
        ))}
      </div>
    );
  }

  const personas = data?.personas ?? [];
  const fatos = data?.fatos ?? [];
  const modus = data?.modus ?? [];
  const vazio = personas.length === 0 && fatos.length === 0 && modus.length === 0;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        <Microscope className="h-4 w-4 text-neutral-500" />
        Investigação
        <span className="text-[11px] font-normal text-neutral-400">
          {personas.length} pessoa{personas.length !== 1 ? "s" : ""} · {fatos.length} fato{fatos.length !== 1 ? "s" : ""} · {modus.length} modus
        </span>
      </h2>

      {vazio && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 dark:border-white/10 py-12 text-center">
          <Fingerprint className="h-5 w-5 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">Sem sinais investigativos ainda — personas, fatos e modus aparecem da análise dos casos.</p>
        </div>
      )}

      {/* Pessoas */}
      {personas.length > 0 && (
        <Secao icon={Users} titulo="Pessoas do caso" count={personas.length}>
          <div className="space-y-3">
            {personasPorTipo.map(([tipo, lista]) => (
              <div key={tipo} className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: corPersona(tipo) }}>
                  {tipo} · {lista.length}
                </p>
                <div className="space-y-1">
                  {lista.map((p) => (
                    <div key={p.id} className="flex flex-col gap-0.5 rounded-lg border border-neutral-200/70 dark:border-white/[0.06] bg-neutral-50/60 dark:bg-white/[0.03] px-2.5 py-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: corPersona(tipo) }} />
                        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground/90">{p.nome}</span>
                        {p.status && <span className="shrink-0 text-[9px] uppercase tracking-wide text-muted-foreground">{p.status}</span>}
                        {p.processoId && procNumeros.get(p.processoId) && (
                          <Link href={`/admin/processos/${p.processoId}`} className="shrink-0 inline-flex items-center gap-0.5 font-mono text-[9px] text-emerald-700 dark:text-emerald-400 hover:underline">
                            <Scale className="h-2.5 w-2.5" />{procNumeros.get(p.processoId)!.split(".")[0]}
                          </Link>
                        )}
                      </div>
                      {p.observacoes && <p className="truncate pl-4 text-[10.5px] text-muted-foreground">{p.observacoes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Secao>
      )}

      {/* Fatos */}
      {fatos.length > 0 && (
        <Secao icon={MapPin} titulo="Mapa dos fatos" count={fatos.length}>
          <div className="space-y-1.5">
            {fatos.map((f) => (
              <div key={f.id} className="flex flex-col gap-1 rounded-lg border border-neutral-200/70 dark:border-white/[0.06] bg-neutral-50/60 dark:bg-white/[0.03] px-2.5 py-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={cn("h-3 w-3 shrink-0", corSeveridade(f.severidade))} />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground/90">{f.titulo}</span>
                  {f.tipo && <span className="shrink-0 text-[9px] uppercase tracking-wide text-muted-foreground">{f.tipo}</span>}
                  {f.dataFato && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[9.5px] tabular-nums text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(`${f.dataFato}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }).replace(".", "")}
                    </span>
                  )}
                </div>
                {f.descricao && <p className="line-clamp-2 pl-5 text-[10.5px] leading-snug text-muted-foreground">{f.descricao}</p>}
                {f.tags && f.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pl-5">
                    {f.tags.slice(0, 6).map((t, i) => (
                      <span key={i} className="rounded bg-neutral-100 dark:bg-white/[0.05] px-1.5 py-px text-[9px] text-muted-foreground">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Secao>
      )}

      {/* Modus operandi */}
      {modus.length > 0 && (
        <Secao icon={Fingerprint} titulo="Modus operandi" count={modus.length}>
          <div className="space-y-2">
            {modus.map((m) => {
              const mo = (m.modus ?? {}) as Record<string, unknown>;
              const chips = Object.keys(MODUS_LABELS).filter((k) => mo[k]);
              const tagsAd = Array.isArray(mo.tagsAdicionais) ? (mo.tagsAdicionais as string[]) : [];
              return (
                <div key={m.processoId} className="rounded-lg border border-neutral-200/70 dark:border-white/[0.06] bg-neutral-50/60 dark:bg-white/[0.03] px-2.5 py-2">
                  <Link href={`/admin/processos/${m.processoId}`} className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-700 dark:text-emerald-400 hover:underline">
                    <Scale className="h-2.5 w-2.5" />{(m.numeroAutos ?? `#${m.processoId}`).split(".")[0]}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {chips.map((k) => <ChipModus key={k} chave={k} valor={String(mo[k])} />)}
                    {tagsAd.slice(0, 6).map((t, i) => (
                      <span key={i} className="rounded-md bg-neutral-100 dark:bg-white/[0.05] px-2 py-0.5 text-[10px] text-muted-foreground">{t}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Secao>
      )}
    </div>
  );
}
