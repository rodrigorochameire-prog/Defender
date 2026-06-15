"use client";

import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STATUS_CAUTELAR,
  STATUS_CAUTELAR_LABEL,
  rotuloCautelar,
  artigoCautelar,
} from "@/lib/cautelares/cautelares-taxonomia";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_TONE: Record<string, string> = {
  ativa: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  revogada: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  substituida: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  cumprida: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const ESPECIE_TONE: Record<string, string> = {
  prisao: "bg-rose-600 text-white",
  diversa: "bg-blue-600 text-white",
};

type Parametros = {
  periodicidade?: string;
  valorFianca?: string;
  horario?: string;
  distanciaMetros?: number;
  pessoas?: string[];
  lugares?: string[];
};

function detalhe(p: Parametros | null | undefined): string | null {
  if (!p) return null;
  const partes: string[] = [];
  if (p.periodicidade) partes.push(`periodicidade: ${p.periodicidade}`);
  if (p.valorFianca) partes.push(`valor: ${p.valorFianca}`);
  if (p.horario) partes.push(`horário: ${p.horario}`);
  if (typeof p.distanciaMetros === "number") partes.push(`${p.distanciaMetros} m`);
  if (p.pessoas?.length) partes.push(p.pessoas.join(", "));
  if (p.lugares?.length) partes.push(p.lugares.join(", "));
  return partes.length ? partes.join(" · ") : null;
}

function diasDesde(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export function CautelaresPanel({
  processoId,
  readOnly = false,
  apenasEspecie,
}: {
  processoId: number;
  readOnly?: boolean;
  /** Filtra por espécie (ex.: "diversa" — a preventiva tem painel próprio). */
  apenasEspecie?: "prisao" | "diversa";
}) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.cautelares.listCautelares.useQuery({ processoId });
  const setStatus = trpc.cautelares.setStatus.useMutation({
    onSuccess: () => {
      utils.cautelares.listCautelares.invalidate();
      toast.success("Status atualizado");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-2 text-xs text-neutral-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando cautelares…
      </div>
    );
  }

  const cautelares = (data?.cautelares ?? []).filter(
    (c) => !apenasEspecie || c.especie === apenasEspecie,
  );
  if (cautelares.length === 0) {
    return (
      <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">
        Nenhuma cautelar estruturada. Gere pela Ciência da decisão.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {cautelares.map((c) => {
        const det = detalhe(c.parametros as Parametros | null);
        return (
          <li
            key={c.id}
            className="rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 p-2.5 space-y-1"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <span
                  className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide flex-shrink-0 mt-0.5",
                    ESPECIE_TONE[c.especie] ?? "bg-neutral-500 text-white",
                  )}
                >
                  {c.especie === "prisao" ? "prisão" : "diversa"}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 leading-snug">
                    {rotuloCautelar(c.codigo)}
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    {c.artigo ?? artigoCautelar(c.codigo)}
                    {(() => {
                      const dd = diasDesde(c.dataDecisao);
                      return dd != null && c.status === "ativa" ? ` · vigente há ${dd} dias` : "";
                    })()}
                    {c.origem === "manual" ? " · manual" : ""}
                    {det ? ` · ${det}` : ""}
                  </p>
                </div>
              </div>
              {readOnly ? (
                <span
                  className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded font-medium uppercase flex-shrink-0",
                    STATUS_TONE[c.status ?? "ativa"],
                  )}
                >
                  {STATUS_CAUTELAR_LABEL[c.status ?? "ativa"]}
                </span>
              ) : (
                <Select
                  value={c.status ?? "ativa"}
                  onValueChange={(status) => setStatus.mutate({ id: c.id, status })}
                >
                  <SelectTrigger className="h-7 w-32 text-xs flex-shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(STATUS_CAUTELAR).map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {STATUS_CAUTELAR_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {c.literal && (
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed border-l-2 border-neutral-200 dark:border-neutral-700 pl-2 line-clamp-3">
                {c.literal}
              </p>
            )}
          </li>
        );
      })}
      {readOnly && (
        <p className="flex items-center gap-1 text-[10px] text-neutral-400">
          <Lock className="h-2.5 w-2.5" /> somente leitura — edite na tela do processo
        </p>
      )}
    </ul>
  );
}
