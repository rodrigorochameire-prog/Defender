"use client";

import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProcessoTimeline } from "@/components/hierarquia";

interface Props { casoId: number; }

export function TabCronologia({ casoId }: Props) {
  const { data, isLoading } = trpc.cronologia.getCronologiaDoCaso.useQuery({ casoId });
  if (isLoading) return <p className="p-4 italic text-neutral-400">Carregando…</p>;
  const marcos = (data?.marcos ?? []) as any[];
  const prisoesData = (data?.prisoes ?? []) as any[];
  const cautelares = (data?.cautelares ?? []) as any[];

  return (
    <div className="p-4 space-y-6">
      {(marcos.length > 0 || prisoesData.length > 0) && (
        <section className="border-b pb-3">
          <h3 className="text-base font-semibold mb-2">Timeline</h3>
          <ProcessoTimeline marcos={marcos as any} prisoes={prisoesData as any} />
        </section>
      )}

      <section>
        <h3 className="text-base font-semibold mb-2">Marcos ({marcos.length})</h3>
        {marcos.length === 0 ? (
          <p className="italic text-neutral-400 text-sm">Nenhum marco.</p>
        ) : (
          <div className="space-y-1">
            {marcos.map((m) => (
              <div key={m.id} className="text-sm">
                <strong>{format(new Date(m.data), "dd/MM/yyyy", { locale: ptBR })}</strong>
                {" · "}{String(m.tipo).replace(/-/g, " ")}
                <span className="text-[10px] text-neutral-400 ml-2">(processo #{m.processoId})</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">Prisões ({prisoesData.length})</h3>
        {prisoesData.length === 0 ? (
          <p className="italic text-neutral-400 text-sm">Nenhuma.</p>
        ) : (
          <div className="space-y-1 text-sm">
            {prisoesData.map((p) => (
              <div key={p.id}>
                <strong>{format(new Date(p.dataInicio), "dd/MM/yyyy", { locale: ptBR })}</strong>
                {p.dataFim && <> — {format(new Date(p.dataFim), "dd/MM/yyyy", { locale: ptBR })}</>}
                {" · "}{p.tipo} <em>({p.situacao})</em>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">Cautelares ({cautelares.length})</h3>
        {cautelares.length === 0 ? (
          <p className="italic text-neutral-400 text-sm">Nenhuma.</p>
        ) : (
          <div className="space-y-1 text-sm">
            {cautelares.map((c) => (
              <div key={c.id}>
                <strong>{format(new Date(c.dataInicio), "dd/MM/yyyy", { locale: ptBR })}</strong>
                {" · "}{String(c.tipo).replace(/-/g, " ")} <em>({c.status})</em>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-[11px] italic text-neutral-400 pt-2 border-t">
        Read-only. Edit no Nível 3 do processo (`?raw=1` ou via /admin/processos/[id]).
      </p>
    </div>
  );
}
