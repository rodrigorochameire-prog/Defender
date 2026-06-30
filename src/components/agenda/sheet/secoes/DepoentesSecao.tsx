"use client";

import { cn } from "@/lib/utils";

const TIPO_DEP_LABEL: Record<string, string> = {
  ofendida: "vítima",
  vitima: "vítima",
  testemunha_acusacao: "test. acusação",
  acusacao: "test. acusação",
  testemunha_defesa: "test. defesa",
  defesa: "test. defesa",
  informante: "informante",
  interrogando: "interrogatório",
  perito: "perito",
};

function ladoDepoente(tipo: string | undefined): "acusacao" | "defesa" {
  const t = (tipo ?? "").toLowerCase();
  if (t === "vitima" || t === "ofendida" || t === "acusacao" || t === "testemunha_acusacao") return "acusacao";
  return "defesa"; // defesa, testemunha_defesa, interrogando, informante, perito → defesa block
}

interface DepoenteRow {
  nome?: string;
  tipo?: string;
  [k: string]: unknown;
}

export function DepoentesSecao({ depoentes }: { depoentes: DepoenteRow[] }) {
  if (!depoentes?.length) {
    return <p className="text-xs italic text-neutral-400 dark:text-neutral-500">Rol de testemunhas não disponível.</p>;
  }

  // Sort: within acusação — vitima/ofendida first (art. 400 CPP); within defesa — interrogando last
  const acusacao = depoentes.filter((d) => ladoDepoente(d.tipo) === "acusacao").sort((a, b) => {
    const isVitima = (d: DepoenteRow) => ["vitima", "ofendida"].includes((d.tipo ?? "").toLowerCase());
    return isVitima(b) ? 1 : isVitima(a) ? -1 : 0;
  });
  const defesa = depoentes.filter((d) => ladoDepoente(d.tipo) === "defesa").sort((a, b) => {
    const isInterrog = (d: DepoenteRow) => (d.tipo ?? "").toLowerCase() === "interrogando";
    return isInterrog(a) ? 1 : isInterrog(b) ? -1 : 0;
  });

  function Block({ title, items, color }: { title: string; items: DepoenteRow[]; color: string }) {
    if (!items.length) return null;
    return (
      <div className="flex-1 min-w-0">
        <div className={cn("text-[9px] font-semibold tracking-wide uppercase mb-1.5", color)}>
          {title} ({items.length})
        </div>
        <ul className="space-y-1.5">
          {items.map((d, i) => {
            const tipo = (d.tipo ?? "").toLowerCase();
            const label = TIPO_DEP_LABEL[tipo];
            return (
              <li key={`${i}-${d.nome ?? ""}`}>
                <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-200">{d.nome ?? "—"}</span>
                {label && (
                  <span className="ml-1.5 text-[9.5px] text-neutral-400 dark:text-neutral-500">{label}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex gap-4 flex-wrap">
      <Block title="Acusação" items={acusacao} color="text-rose-600 dark:text-rose-400" />
      <Block title="Defesa" items={defesa} color="text-emerald-600 dark:text-emerald-400" />
    </div>
  );
}
