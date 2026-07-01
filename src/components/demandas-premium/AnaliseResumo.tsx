"use client";

export type AnaliseStatus = "pendente" | "concluido" | "nao_lido";
export interface AnaliseData {
  objeto?: string; decidido?: string; providencia?: string;
  prazo?: string; recurso?: string; _status?: AnaliseStatus; _fonte?: string;
}

export function AnaliseStatusBadge({ status }: { status?: AnaliseStatus }) {
  if (status === "pendente")
    return <span className="text-[10px] rounded px-1.5 py-0.5 bg-amber-100 text-amber-700">análise IA pendente</span>;
  if (status === "nao_lido")
    return <span className="text-[10px] rounded px-1.5 py-0.5 bg-rose-100 text-rose-700">documento não lido — revisão manual</span>;
  return null;
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <p className="text-xs leading-snug"><span className="font-medium text-zinc-500">{label}: </span>{value}</p>
  );
}

/** Campos rotulados a partir do JSON de contrato; degrada para `resumo` (texto). */
export function AnaliseResumoFields(
  { data, resumo, expanded = false }: { data: AnaliseData | null; resumo: string | null; expanded?: boolean },
) {
  if (!data) {
    return resumo ? <p className="text-xs whitespace-pre-line text-zinc-600">{resumo}</p> : null;
  }
  const oneLiner = [data.objeto, data.providencia].filter(Boolean).join(" → ")
    + (data.prazo ? ` · ${data.prazo}` : "");
  if (!expanded) {
    return (
      <div className="flex items-center gap-1.5">
        <AnaliseStatusBadge status={data._status} />
        <p className="text-xs truncate text-zinc-600">{oneLiner}</p>
      </div>
    );
  }
  return (
    <div className="space-y-0.5">
      <AnaliseStatusBadge status={data._status} />
      <Field label="Objeto" value={data.objeto} />
      <Field label="O que foi decidido" value={data.decidido} />
      <Field label="Providência" value={data.providencia} />
      <Field label="Prazo" value={data.prazo} />
      <Field label="Cabe recurso?" value={data.recurso} />
    </div>
  );
}
