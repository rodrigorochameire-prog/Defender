"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  CheckCircle2,
  Clock,
  XCircle,
  Mail,
  Ban,
  UserMinus,
} from "lucide-react";
import { getDepoenteStyle } from "./registro-audiencia/constants";
import {
  STATUS_INTIMACAO_MAP,
  resolveStatusIntimacao,
} from "./registro-audiencia/shared/depoente-status";
import type { Depoente } from "./registro-audiencia/types";

export type StatusIntimacao = NonNullable<Depoente["statusIntimacao"]>;

type BucketKey =
  | "intimado"
  | "pendente"
  | "frustrada"
  | "nao-intimado"
  | "dispensado"
  | "mp-desistiu"
  | "desconhecido";

// Agrupa os status granulares em buckets visuais
const STATUS_TO_BUCKET: Record<string, BucketKey> = {
  intimado: "intimado",
  "intimado-pessoalmente": "intimado",
  "intimado-advogado": "intimado",
  "intimado-edital": "intimado",
  pendente: "pendente",
  "sem-diligencia": "pendente",
  frustrada: "frustrada",
  "frustrada-nao-localizado": "frustrada",
  "frustrada-endereco-incorreto": "frustrada",
  "frustrada-mudou": "frustrada",
  "nao-intimado": "nao-intimado",
  dispensado: "dispensado",
  "mp-desistiu": "mp-desistiu",
};

const BUCKET_META: Record<
  BucketKey,
  { label: string; dot: string; chip: string; icon: typeof CheckCircle2 }
> = {
  intimado: {
    label: "Intimados",
    dot: "bg-emerald-500",
    chip:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
    icon: CheckCircle2,
  },
  pendente: {
    label: "Pendentes",
    dot: "bg-amber-500",
    chip:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
    icon: Clock,
  },
  frustrada: {
    label: "Frustradas",
    dot: "bg-rose-500",
    chip:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900",
    icon: XCircle,
  },
  "nao-intimado": {
    label: "Não intimados",
    dot: "bg-neutral-400",
    chip:
      "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800",
    icon: Mail,
  },
  dispensado: {
    label: "Dispensados",
    dot: "bg-sky-500",
    chip:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
    icon: Ban,
  },
  "mp-desistiu": {
    label: "MP desistiu",
    dot: "bg-slate-500",
    chip:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800",
    icon: UserMinus,
  },
  desconhecido: {
    label: "Sem status",
    dot: "bg-neutral-300",
    chip:
      "bg-neutral-50 text-neutral-500 border-neutral-200 dark:bg-neutral-900/30 dark:text-neutral-500 dark:border-neutral-800",
    icon: Mail,
  },
};

const BUCKET_ORDER: BucketKey[] = [
  "intimado",
  "pendente",
  "frustrada",
  "nao-intimado",
  "dispensado",
  "mp-desistiu",
  "desconhecido",
];

// Buckets que contam como "resolvidos" para o progresso
const RESOLVED_BUCKETS: BucketKey[] = ["intimado", "dispensado", "mp-desistiu"];

// Opções granulares expostas no popover, agrupadas por bucket
const INTERACTIVE_OPTIONS: {
  bucket: BucketKey;
  status: StatusIntimacao;
  label: string;
}[] = [
  { bucket: "intimado", status: "intimado-pessoalmente", label: "Intimado pessoalmente" },
  { bucket: "intimado", status: "intimado-advogado", label: "Intimado via advogado" },
  { bucket: "intimado", status: "intimado-edital", label: "Intimado por edital" },
  { bucket: "pendente", status: "pendente", label: "Pendente" },
  { bucket: "pendente", status: "sem-diligencia", label: "Sem diligência" },
  { bucket: "frustrada", status: "frustrada-nao-localizado", label: "Não localizado" },
  { bucket: "frustrada", status: "frustrada-endereco-incorreto", label: "Endereço incorreto" },
  { bucket: "frustrada", status: "frustrada-mudou", label: "Mudou-se" },
  { bucket: "nao-intimado", status: "nao-intimado", label: "Não intimado" },
  { bucket: "dispensado", status: "dispensado", label: "Dispensado" },
  { bucket: "mp-desistiu", status: "mp-desistiu", label: "MP desistiu" },
];

type DepoenteLike = Partial<Depoente> & {
  id?: string | number;
  nome?: string;
  name?: string;
  tipo?: string;
};

type BaseProps = {
  depoentes: DepoenteLike[];
  className?: string;
};

type ReadonlyProps = BaseProps & {
  mode: "readonly";
  onStatusChange?: never;
};

type InteractiveProps = BaseProps & {
  mode: "interactive";
  onStatusChange: (id: string, novo: StatusIntimacao) => void;
};

export type DepoentesStatusBlockProps = ReadonlyProps | InteractiveProps;

function getBucket(dep: DepoenteLike): BucketKey {
  const resolved = resolveStatusIntimacao(dep);
  if (!resolved) return "desconhecido";
  return STATUS_TO_BUCKET[resolved] ?? "desconhecido";
}

function normalizeTipoForStyle(tipo: unknown): string {
  const t = String(tipo ?? "").toLowerCase();
  if (t === "vitima" || t === "vítima") return "vitima";
  if (t === "reu" || t === "réu") return "reu";
  if (t === "perito") return "perito";
  if (t === "informante") return "informante";
  if (t === "policial") return "policial";
  return "testemunha";
}

export function DepoentesStatusBlock(props: DepoentesStatusBlockProps) {
  const { depoentes, mode, className } = props;

  const { counts, progress, total } = useMemo(() => {
    const c: Record<BucketKey, number> = {
      intimado: 0,
      pendente: 0,
      frustrada: 0,
      "nao-intimado": 0,
      dispensado: 0,
      "mp-desistiu": 0,
      desconhecido: 0,
    };
    for (const d of depoentes) c[getBucket(d)] += 1;
    const resolvedCount = RESOLVED_BUCKETS.reduce((s, k) => s + c[k], 0);
    return {
      counts: c,
      progress:
        depoentes.length > 0
          ? Math.round((resolvedCount / depoentes.length) * 100)
          : 0,
      total: depoentes.length,
    };
  }, [depoentes]);

  const [open, setOpen] = useState(() => total > 0 && total <= 4);

  if (total === 0) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-neutral-200/70 dark:border-neutral-800/70 bg-neutral-50/40 dark:bg-neutral-900/40",
        className
      )}
    >
      {/* Header agregado */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 tracking-wide uppercase">
              Status dos Depoentes
            </span>
            <span className="text-[10px] text-neutral-500">· {total}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-16 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 tabular-nums">
              {progress}%
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BUCKET_ORDER.filter((k) => counts[k] > 0).map((k) => {
            const meta = BUCKET_META[k];
            const Icon = meta.icon;
            return (
              <span
                key={k}
                className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-medium",
                  meta.chip
                )}
              >
                <Icon className="w-2.5 h-2.5" />
                <span className="tabular-nums font-semibold">{counts[k]}</span>
                <span>{meta.label}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Lista compacta colapsável */}
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-1.5 border-t border-neutral-200/60 dark:border-neutral-800/60 text-[10px] font-medium text-neutral-500 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30 transition-colors cursor-pointer">
          <span>{open ? "Ocultar lista" : "Ver lista"}</span>
          <ChevronDown
            className={cn(
              "w-3 h-3 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60 border-t border-neutral-200/60 dark:border-neutral-800/60">
            {depoentes.map((d, idx) => {
              const id = String(d.id ?? `${d.nome ?? d.name ?? "d"}-${idx}`);
              const tipoStyle = getDepoenteStyle(normalizeTipoForStyle(d.tipo));
              const resolved = resolveStatusIntimacao(d);
              return (
                <li
                  key={id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-950/40"
                >
                  <span
                    className={cn("w-1.5 h-1.5 rounded-full shrink-0", tipoStyle.dotColor)}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                        {d.nome ?? d.name ?? "Sem nome"}
                      </span>
                      <span className="text-[9px] text-neutral-400 shrink-0">
                        {tipoStyle.label}
                      </span>
                    </div>
                  </div>
                  {mode === "interactive" ? (
                    <StatusPopover
                      current={resolved}
                      onChange={(novo) => props.onStatusChange(id, novo)}
                    />
                  ) : (
                    <StatusBadge status={resolved} />
                  )}
                </li>
              );
            })}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status || !STATUS_INTIMACAO_MAP[status]) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-medium bg-neutral-50 text-neutral-500 border-neutral-200 dark:bg-neutral-900/30 dark:text-neutral-500 dark:border-neutral-800 shrink-0">
        <Mail className="w-2.5 h-2.5" />
        Sem status
      </span>
    );
  }
  const meta = STATUS_INTIMACAO_MAP[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium shrink-0",
        meta.class
      )}
    >
      <Mail className="w-2.5 h-2.5" />
      {meta.label}
    </span>
  );
}

function StatusPopover({
  current,
  onChange,
}: {
  current: string | null;
  onChange: (novo: StatusIntimacao) => void;
}) {
  const [open, setOpen] = useState(false);
  const meta = current && STATUS_INTIMACAO_MAP[current] ? STATUS_INTIMACAO_MAP[current] : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium shrink-0 cursor-pointer hover:opacity-80 transition-opacity",
          meta?.class ??
            "border bg-neutral-50 text-neutral-500 border-neutral-200 dark:bg-neutral-900/30 dark:text-neutral-500 dark:border-neutral-800"
        )}
      >
        <Mail className="w-2.5 h-2.5" />
        {meta?.label ?? "Sem status"}
        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1.5 max-h-[320px] overflow-y-auto">
        <div className="flex flex-col">
          {BUCKET_ORDER.filter((b) => b !== "desconhecido").map((bucket) => {
            const opts = INTERACTIVE_OPTIONS.filter((o) => o.bucket === bucket);
            if (opts.length === 0) return null;
            const bucketMeta = BUCKET_META[bucket];
            return (
              <div key={bucket} className="px-1.5 py-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={cn("w-1.5 h-1.5 rounded-full", bucketMeta.dot)} />
                  <span className="text-[9px] uppercase tracking-wide text-neutral-500 font-semibold">
                    {bucketMeta.label}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {opts.map((opt) => {
                    const isActive = opt.status === current;
                    return (
                      <button
                        key={opt.status}
                        type="button"
                        onClick={() => {
                          onChange(opt.status);
                          setOpen(false);
                        }}
                        className={cn(
                          "text-[11px] text-left px-2 py-1 rounded-md cursor-pointer transition-colors",
                          isActive
                            ? "bg-neutral-100 dark:bg-neutral-800 font-semibold text-neutral-900 dark:text-neutral-100"
                            : "hover:bg-neutral-100/70 dark:hover:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300"
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
