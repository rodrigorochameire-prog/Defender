"use client";

import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { derivarStatusOitiva, type StatusOitiva } from "@/lib/agenda/depoente-status";

/**
 * DepoentesSecao — painel de status dos depoentes do AIJ (F3).
 *
 * Evolui o antigo `PainelDepoentesStatus` (inline no event-detail-sheet) para
 * um componente próprio e "bem elaborado". Por depoente exibe:
 *   - tipo (badge);
 *   - situação de oitiva: ouvido em juízo / só no IP / não ouvido;
 *   - intimação: intimado / não intimado (+ motivo) / a verificar;
 *   - teor da certidão de comunicação (expansível) — só quando presente.
 *
 * A certidão vem de `certidao_comunicacao`/`certidaoComunicacao` no próprio
 * objeto do depoente (lida por `derivarStatusOitiva`). Quando ausente, nada é
 * exibido — sem ruído de vazio.
 */

const TIPO_DEP_LABEL: Record<string, string> = {
  ofendida: "ofendida",
  vitima: "vítima",
  testemunha_acusacao: "test. acusação",
  acusacao: "test. acusação",
  testemunha_defesa: "test. defesa",
  defesa: "test. defesa",
  informante: "informante",
  interrogando: "interrogando",
  perito: "perito",
};

const TIPO_DEP_TONE: Record<string, string> = {
  ofendida: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  vitima: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  testemunha_acusacao: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  acusacao: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  testemunha_defesa: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  defesa: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  informante: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  interrogando: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  perito: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
};

/** Situação de oitiva — uma linha clara por depoente. */
function situacao(st: StatusOitiva): { label: string; tone: string } {
  if (st.ouvidoJuizo) {
    return { label: "Ouvido em juízo", tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" };
  }
  if (st.ouvidoDelegacia) {
    return { label: "Ouvido só no IP", tone: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" };
  }
  return { label: "Não ouvido", tone: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400" };
}

/** Intimação — frase pronta para o defensor. */
function intimacaoLabel(st: StatusOitiva): { label: string; tone: string } {
  if (st.intimado === true) {
    return { label: "Intimado", tone: "text-emerald-600 dark:text-emerald-400" };
  }
  if (st.intimado === false) {
    return {
      label: st.motivoLabel ? `Não intimado — ${st.motivoLabel}` : "Não intimado",
      tone: "text-rose-600 dark:text-rose-400",
    };
  }
  return { label: "Intimação a verificar", tone: "text-neutral-400 dark:text-neutral-500" };
}

function CertidaoExpander({ teor }: { teor: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[10px] font-medium text-neutral-500 hover:text-emerald-600 dark:text-neutral-400 cursor-pointer"
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform motion-reduce:transition-none", open && "rotate-180")} />
        <FileText className="h-3 w-3" />
        {open ? "Ocultar certidão de comunicação" : "Ver certidão de comunicação"}
      </button>
      {open && (
        <p className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md ring-1 ring-neutral-200 p-2 text-[10.5px] leading-relaxed text-neutral-600 dark:text-neutral-400 dark:ring-neutral-800">
          {teor}
        </p>
      )}
    </div>
  );
}

interface DepoenteRow {
  nome?: string;
  tipo?: string;
  observacao?: string;
  observacoes?: string;
  ja_ouvido?: { sim?: boolean; data?: string } | null;
  [k: string]: unknown;
}

export function DepoentesSecao({
  depoentes,
  onAbrirDepoimento,
}: {
  depoentes: DepoenteRow[];
  onAbrirDepoimento?: (d: DepoenteRow) => void;
}) {
  if (!depoentes?.length) {
    return <p className="text-xs italic text-neutral-400 dark:text-neutral-500">Status dos depoentes não disponível.</p>;
  }

  const stats = depoentes.map(derivarStatusOitiva);
  const ouvidosJuizo = stats.filter((s) => s.ouvidoJuizo).length;
  const faltamJuizo = stats.filter((s) => s.faltaJuizo).length;
  const naoIntimados = stats.filter((s) => s.faltaJuizo && s.intimado === false).length;
  const aVerificar = stats.filter((s) => s.faltaJuizo && s.intimado === null).length;

  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800">
      <div className="flex flex-wrap items-center gap-1.5 bg-neutral-50 px-2.5 py-1.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-900/60">
        <span>{depoentes.length} depoentes</span>
        {ouvidosJuizo > 0 && <span className="text-emerald-600 dark:text-emerald-400">· {ouvidosJuizo} ouvido(s) em juízo</span>}
        {faltamJuizo > 0 && <span>· {faltamJuizo} a ouvir</span>}
        {naoIntimados > 0 && <span className="text-rose-600 dark:text-rose-400">· {naoIntimados} não intimado(s)</span>}
        {aVerificar > 0 && <span className="text-amber-600 dark:text-amber-400">· {aVerificar} a verificar</span>}
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
        {depoentes.map((d, i) => {
          const st = stats[i];
          const tipo = (d.tipo ?? "").toLowerCase();
          const sit = situacao(st);
          const intim = intimacaoLabel(st);
          const temPonto = !!(onAbrirDepoimento && (d.depoimento_ip || d.depoimento_juizo));
          return (
            <div key={`${i}-${d.nome ?? ""}`} className="px-2.5 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={!temPonto}
                      onClick={temPonto ? () => onAbrirDepoimento!(d) : undefined}
                      title={temPonto ? "Abrir o depoimento no PDF dos autos" : undefined}
                      className={cn(
                        "truncate text-left text-[11px] font-medium text-neutral-700 dark:text-neutral-200",
                        temPonto && "hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer",
                      )}
                    >
                      {d.nome ?? "—"}
                      {temPonto && <span className="ml-0.5 text-[9px] text-emerald-500" aria-hidden>↗</span>}
                    </button>
                    {TIPO_DEP_LABEL[tipo] && (
                      <span className={cn("rounded px-1.5 py-0.5 text-[8.5px] font-medium", TIPO_DEP_TONE[tipo] ?? "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400")}>
                        {TIPO_DEP_LABEL[tipo]}
                      </span>
                    )}
                  </div>
                  {/* Intimação — linha-frase */}
                  <p className={cn("mt-0.5 text-[10px] leading-snug", intim.tone)}>{intim.label}</p>
                  {(d.observacao || d.observacoes) && (
                    <p className="mt-0.5 text-[10px] leading-snug text-neutral-400 dark:text-neutral-500">
                      {d.observacao ?? d.observacoes}
                    </p>
                  )}
                </div>
                {/* Situação — badge à direita */}
                <span className={cn("shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[8.5px] font-medium", sit.tone)}>
                  {sit.label}
                  {st.ouvidoJuizo && d.ja_ouvido?.data ? ` · ${d.ja_ouvido.data}` : ""}
                </span>
              </div>
              {/* Certidão de comunicação — só quando há teor */}
              {st.certidao && <CertidaoExpander teor={st.certidao} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
