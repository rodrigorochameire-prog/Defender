"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { TIPO_PROCESSO_LABEL } from "@/lib/utils/processo-classification";

interface ProcessoChip {
  id: number;
  numeroAutos: string | null;
  tipoProcesso: string | null;
  isReferencia: boolean | null;
  /** Is the current assistido active in this process? null = not a party / viewing from processo page */
  ativo?: boolean | null;
  /** Names of assistidos in this process (for siblings) */
  assistidosNomes?: string[];
}

interface CasoBarProps {
  casoTitulo: string;
  currentProcessoId: number;
  processos: ProcessoChip[];
  /** Stats to show at the right side */
  stats?: { demandas?: number; audiencias?: number; arquivos?: number };
}

export function CasoBar({ casoTitulo, currentProcessoId, processos, stats }: CasoBarProps) {
  if (processos.length === 0) return null;

  // Separate current process out — only show siblings as chips
  const siblings = processos.filter((p) => p.id !== currentProcessoId);

  if (siblings.length === 0) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap mt-3 px-3.5 py-2.5 rounded-lg bg-white/[0.12]">
      {/* Case title */}
      <span className="text-[10px] text-white/30 uppercase tracking-wider shrink-0">
        {casoTitulo}
      </span>

      <span className="w-px h-3 bg-white/10" />

      {/* Sibling process chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {siblings.map((p) => {
          const tipoLabel = TIPO_PROCESSO_LABEL[p.tipoProcesso ?? "AP"] ?? p.tipoProcesso ?? "AP";
          const isInactive = p.ativo === false;
          const shortAutos = p.numeroAutos
            ? (p.numeroAutos ?? "").replace(/^0+/, "").slice(0, 15)
            : "s/n";

          return (
            <Link
              key={p.id}
              href={`/admin/processos/${p.id}`}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors",
                isInactive
                  ? "bg-white/5 text-white/25 hover:text-white/50"
                  : "bg-white/10 text-white/60 hover:text-white hover:bg-white/20",
              )}
              title={`${tipoLabel} ${p.numeroAutos ?? ""}${p.assistidosNomes?.length ? ` (${p.assistidosNomes.join(", ")})` : ""}`}
            >
              <span className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                isInactive ? "bg-white/20" : p.isReferencia ? "bg-emerald-400" : "bg-white/40",
              )} />
              <span>{p.tipoProcesso ?? "AP"}</span>
              <span className="text-white/30 font-mono">{shortAutos}</span>
            </Link>
          );
        })}
      </div>

      {/* Stats */}
      {stats && (
        <>
          <span className="w-px h-3 bg-white/10 ml-auto" />
          <div className="flex items-center gap-3 text-[11px] text-white/30">
            {stats.demandas !== undefined && (
              <span><span className="font-semibold text-white/60">{stats.demandas}</span> dem</span>
            )}
            {stats.audiencias !== undefined && (
              <span><span className="font-semibold text-white/60">{stats.audiencias}</span> aud</span>
            )}
            {stats.arquivos !== undefined && (
              <span><span className="font-semibold text-white/60">{stats.arquivos}</span> arq</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
