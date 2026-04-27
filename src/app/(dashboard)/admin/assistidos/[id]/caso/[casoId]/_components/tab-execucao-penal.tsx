"use client";

import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  detectProgressaoIminente,
  detectLivramentoIminente,
  detectIndultoAplicavel,
} from "@/lib/execucao-penal/flags";

interface Props { casoId: number; }

export function TabExecucaoPenal({ casoId }: Props) {
  const { data, isLoading } = trpc.execucaoPenal.getByCaso.useQuery({ casoId });

  if (isLoading) return <p className="p-4 italic text-neutral-400">Carregando…</p>;
  if (!data) {
    return (
      <div className="p-4">
        <h3 className="text-base font-semibold mb-3">Execução Penal</h3>
        <p className="text-sm italic text-neutral-400">
          Nenhuma execução cadastrada. Edição inicial via vista técnica do processo (Nível 3).
        </p>
      </div>
    );
  }

  const ex = data.execucao;
  const eventos = data.eventos as any[];
  const progressao = detectProgressaoIminente(ex);
  const livramento = detectLivramentoIminente(ex);
  const indulto = detectIndultoAplicavel(ex);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-base font-semibold">Execução Penal</h3>

      {/* Flags */}
      {(progressao || livramento || indulto) && (
        <div className="rounded border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 space-y-1 text-sm">
          {progressao && (
            <div className={progressao.vencida ? "text-rose-700 font-medium" : "text-amber-700"}>
              {progressao.vencida ? "Progressão vencida há " : "Progressão em "}
              {Math.abs(progressao.diasParaProgressao)} dias
            </div>
          )}
          {livramento && (
            <div className={livramento.vencido ? "text-rose-700 font-medium" : "text-amber-700"}>
              {livramento.vencido ? "Livramento vencido há " : "Livramento em "}
              {Math.abs(livramento.diasParaLivramento)} dias
            </div>
          )}
          {indulto && (
            <div className="text-emerald-700">
              Possível indulto: {indulto.motivo}
            </div>
          )}
        </div>
      )}

      {/* Dados */}
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-neutral-500">Início pena</dt><dd>{ex.dataInicioPena ? format(new Date(ex.dataInicioPena), "dd/MM/yyyy", { locale: ptBR }) : "—"}</dd></div>
        <div><dt className="text-xs text-neutral-500">Término previsto</dt><dd>{ex.dataTerminoPrevisto ? format(new Date(ex.dataTerminoPrevisto), "dd/MM/yyyy", { locale: ptBR }) : "—"}</dd></div>
        <div><dt className="text-xs text-neutral-500">Progressão prevista</dt><dd>{ex.dataProgressaoPrevista ? format(new Date(ex.dataProgressaoPrevista), "dd/MM/yyyy", { locale: ptBR }) : "—"}</dd></div>
        <div><dt className="text-xs text-neutral-500">Livramento previsto</dt><dd>{ex.dataLivramentoPrevisto ? format(new Date(ex.dataLivramentoPrevisto), "dd/MM/yyyy", { locale: ptBR }) : "—"}</dd></div>
        <div><dt className="text-xs text-neutral-500">Regime</dt><dd>{ex.regimeAtual ?? "—"}</dd></div>
        <div><dt className="text-xs text-neutral-500">Unidade</dt><dd>{ex.unidadeAtual ?? "—"}</dd></div>
        <div><dt className="text-xs text-neutral-500">Pena total</dt><dd>{ex.penaTotalDias ? `${ex.penaTotalDias} dias` : "—"}</dd></div>
        <div><dt className="text-xs text-neutral-500">Cumprido + remido</dt><dd>{(ex.jaCumpridoDias ?? 0) + (ex.jaRemidoDias ?? 0)} dias</dd></div>
      </dl>

      {/* Eventos */}
      {eventos.length > 0 && (
        <section>
          <h4 className="text-sm font-medium mb-2">Eventos ({eventos.length})</h4>
          <div className="space-y-1">
            {eventos.map((e) => (
              <div key={e.id} className="text-sm flex items-baseline gap-2">
                <strong>{format(new Date(e.data), "dd/MM/yyyy", { locale: ptBR })}</strong>
                <span>{String(e.tipo).replace(/-/g, " ")}</span>
                {e.detalhes && <span className="text-xs text-neutral-500">— {e.detalhes}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-[11px] italic text-neutral-400 pt-2 border-t">
        Edit em vista técnica do processo (referência) ou via API.
      </p>
    </div>
  );
}
