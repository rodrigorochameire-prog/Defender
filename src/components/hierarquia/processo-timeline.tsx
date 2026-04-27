"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Marco {
  id: number;
  tipo: string;
  data: string;
  processoId?: number;
}

interface Prisao {
  id: number;
  tipo: string;
  dataInicio: string;
  dataFim?: string | null;
  situacao: string;
}

interface Props {
  marcos: Marco[];
  prisoes: Prisao[];
}

const TIPO_LABEL: Record<string, string> = {
  fato: "Fato",
  apf: "APF",
  "audiencia-custodia": "Custódia",
  denuncia: "Denúncia",
  "recebimento-denuncia": "Receb.",
  "resposta-acusacao": "Resp.",
  "aij-designada": "AIJ",
  "aij-realizada": "AIJ ✓",
  memoriais: "Memoriais",
  sentenca: "Sentença",
  "transito-julgado": "Trânsito",
};

const TIPO_COR: Record<string, string> = {
  fato: "bg-rose-500",
  apf: "bg-amber-500",
  "audiencia-custodia": "bg-emerald-500",
  denuncia: "bg-blue-500",
  sentenca: "bg-purple-500",
};

export function ProcessoTimeline({ marcos, prisoes }: Props) {
  const eventos = [
    ...marcos.map((m) => ({
      key: `m-${m.id}`,
      data: m.data,
      label: TIPO_LABEL[m.tipo] ?? m.tipo,
      tipo: "marco",
      cor: TIPO_COR[m.tipo] ?? "bg-neutral-400",
    })),
    ...prisoes.map((p) => ({
      key: `p-${p.id}`,
      data: p.dataInicio,
      label: `Prisão ${p.tipo}`,
      tipo: "prisao",
      cor: p.situacao === "ativa" ? "bg-rose-600" : "bg-neutral-400",
    })),
  ].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  if (eventos.length === 0) {
    return <p className="italic text-neutral-400 text-sm p-2">Sem cronologia.</p>;
  }

  return (
    <div className="overflow-x-auto py-3">
      <div className="flex items-center gap-1 min-w-max relative">
        {/* Linha base */}
        <div className="absolute left-0 right-0 h-px bg-neutral-200 dark:bg-neutral-800" style={{ top: "1.25rem" }} />
        {eventos.map((e) => (
          <div key={e.key} className="flex flex-col items-center relative z-10 px-2 min-w-[80px]">
            <div className={`w-2.5 h-2.5 rounded-full ${e.cor} mb-1 ring-4 ring-white dark:ring-neutral-950`} />
            <div className="text-[9px] font-mono text-neutral-500">
              {format(new Date(e.data), "dd/MM/yy", { locale: ptBR })}
            </div>
            <div className="text-[10px] mt-0.5 text-center">{e.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
