"use client";

import { trpc } from "@/lib/trpc/client";
import { Loader2, AlertTriangle, Clock, MapPin, HeartPulse, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const REQUISITO_LABEL: Record<string, string> = {
  ordem_publica: "Garantia da ordem pública",
  ordem_economica: "Garantia da ordem econômica",
  instrucao_criminal: "Conveniência da instrução criminal",
  aplicacao_lei_penal: "Assegurar a aplicação da lei penal",
};

function diasDesde(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function fmtData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export function PrisaoPreventivaPanel({ processoId }: { processoId: number }) {
  const { data, isLoading } = trpc.cautelares.getPreventiva.useQuery({ processoId });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-2 text-xs text-neutral-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando preventiva…
      </div>
    );
  }
  if (!data) {
    return (
      <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">
        Sem decreto de preventiva estruturado. Gere pela Ciência da decisão.
      </p>
    );
  }

  const requisitos = (data.requisitos ?? []).filter((r) => r.presente);
  const dias = diasDesde(data.dataSoltura ?? null) === null ? diasDesde(data.dataDecreto) : null;
  const preso = data.situacao === "preso";
  const hist = data.historicoCustodia ?? [];
  const saude = data.saude ?? [];
  const visitas = data.visitas ?? null;
  const ex = data.excessoPrazo ?? null;

  return (
    <div className="space-y-3">
      {/* Cabeçalho: situação + tempo */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wide",
            preso
              ? "bg-rose-600 text-white"
              : data.situacao === "domiciliar"
                ? "bg-amber-500 text-white"
                : "bg-emerald-600 text-white",
          )}
        >
          {data.situacao ?? "preso"}
        </span>
        {dias != null && preso && (
          <span className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300">
            <Clock className="h-3 w-3" /> {dias} dias desde o decreto ({fmtData(data.dataDecreto)})
          </span>
        )}
        {data.orgaoDecisor && (
          <span className="text-[10px] text-neutral-400">{data.orgaoDecisor}</span>
        )}
      </div>

      {/* Excesso de prazo */}
      {ex?.ha_excesso && (
        <div className="flex items-start gap-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 p-2 ring-1 ring-rose-200 dark:ring-rose-900/40">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-rose-500 flex-shrink-0" />
          <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
            Demora injustificada{ex.fase ? ` (${ex.fase})` : ""}
            {ex.dias != null ? ` — ${ex.dias} dias` : ""}
            {ex.nota ? `: ${ex.nota}` : ""}
          </p>
        </div>
      )}

      {/* Requisitos do art. 312 com fundamentação verbatim */}
      <div className="space-y-1.5">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          Requisitos (art. 312 CPP)
        </h4>
        {requisitos.length === 0 ? (
          <p className="text-xs text-neutral-400 italic">Requisitos não extraídos.</p>
        ) : (
          requisitos.map((r) => (
            <div
              key={r.tipo}
              className="rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 p-2 space-y-1"
            >
              <p className="text-xs font-medium text-rose-700 dark:text-rose-400">
                {REQUISITO_LABEL[r.tipo] ?? r.tipo}
              </p>
              {r.fundamentacao && (
                <blockquote className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed border-l-2 border-rose-300 dark:border-rose-800 pl-2 italic">
                  {r.fundamentacao}
                  {r.idFl ? <span className="not-italic text-neutral-400"> ({r.idFl})</span> : null}
                </blockquote>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pressupostos */}
      {(data.pressupostos?.materialidade || data.pressupostos?.indiciosAutoria) && (
        <div className="space-y-1">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Pressupostos
          </h4>
          {data.pressupostos?.materialidade && (
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
              <span className="font-semibold">Materialidade:</span> {data.pressupostos.materialidade}
            </p>
          )}
          {data.pressupostos?.indiciosAutoria && (
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
              <span className="font-semibold">Indícios de autoria:</span>{" "}
              {data.pressupostos.indiciosAutoria}
            </p>
          )}
        </div>
      )}

      {/* Local de custódia + histórico */}
      {(data.localCustodia || hist.length > 0) && (
        <div className="space-y-1">
          <h4 className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            <MapPin className="h-3 w-3" /> Local de custódia
          </h4>
          {data.localCustodia && (
            <p className="text-xs text-neutral-700 dark:text-neutral-300">{data.localCustodia}</p>
          )}
          {hist.length > 0 && (
            <ul className="space-y-0.5 list-disc pl-4">
              {hist.map((h, i) => (
                <li key={i} className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {h.local} — {fmtData(h.de)}{h.ate ? ` a ${fmtData(h.ate)}` : " (atual)"}
                  {h.motivo ? ` · ${h.motivo}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Saúde / segurança */}
      {saude.length > 0 && (
        <div className="space-y-1">
          <h4 className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            <HeartPulse className="h-3 w-3" /> Saúde / segurança
          </h4>
          <ul className="space-y-0.5 list-disc pl-4">
            {saude.map((s, i) => (
              <li key={i} className="text-[11px] text-neutral-600 dark:text-neutral-400">
                {s.data ? `${fmtData(s.data)}: ` : ""}{s.descricao}
                {s.gravidade ? ` (${s.gravidade})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Visitas */}
      {visitas && (visitas.social || visitas.intima || visitas.observacao) && (
        <div className="space-y-1">
          <h4 className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            <Users className="h-3 w-3" /> Visitas
          </h4>
          {visitas.social && (
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400">Social: {visitas.social}</p>
          )}
          {visitas.intima && (
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400">Íntima: {visitas.intima}</p>
          )}
          {visitas.observacao && (
            <p className="text-[11px] text-neutral-500 italic">{visitas.observacao}</p>
          )}
        </div>
      )}
    </div>
  );
}
