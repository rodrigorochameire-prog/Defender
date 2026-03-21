"use client";

import { trpc } from "@/lib/trpc/client";
import { Wifi, Brain } from "lucide-react";

function StatusDot({ ultimoAcesso }: { ultimoAcesso: string | null }) {
  if (!ultimoAcesso) return <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" title="Nunca acessou" />;
  const days = Math.floor((Date.now() - new Date(ultimoAcesso).getTime()) / 86400000);
  if (days <= 3) return <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" title="Ativo" />;
  if (days <= 7) return <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" title="Morno" />;
  return <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" title="Inativo" />;
}

function OnboardingBar({ steps }: { steps: [boolean, boolean, boolean, boolean] }) {
  const labels = ["Convite aceito", "Primeiro login", "Primeiro atendimento", "Primeira demanda"];
  return (
    <div className="flex gap-0.5">
      {steps.map((done, i) => (
        <div
          key={i}
          className={`h-1.5 w-5 rounded-sm ${done ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-700"}`}
          title={labels[i]}
        />
      ))}
    </div>
  );
}

function UltimoAcesso({ ts }: { ts: string | null }) {
  if (!ts) return <span className="text-zinc-400">nunca</span>;
  const days = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
  if (days === 0) return <span className="text-emerald-600 dark:text-emerald-400">hoje</span>;
  if (days === 1) return <span className="text-zinc-600 dark:text-zinc-300">ontem</span>;
  return <span className="text-zinc-500">{days}d atrás</span>;
}

interface AdocaoDefensoresProps {
  inicio?: string;
  fim?: string;
}

export function AdocaoDefensores({ inicio, fim }: AdocaoDefensoresProps) {
  const { data, isLoading } = trpc.observatory.getAdocao.useQuery(
    inicio && fim ? { inicio, fim } : undefined
  );

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />;
  }

  if (!data?.length) {
    return <p className="text-sm text-zinc-400">Nenhum defensor cadastrado.</p>;
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Adoção por Defensor
      </h2>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-2.5 font-medium text-zinc-500">Defensor</th>
              <th className="px-4 py-2.5 font-medium text-zinc-500">Comarca</th>
              <th className="px-4 py-2.5 font-medium text-zinc-500">Último acesso</th>
              <th className="px-4 py-2.5 text-right font-medium text-zinc-500">Aten.</th>
              <th className="px-4 py-2.5 text-right font-medium text-zinc-500">Dem.</th>
              <th className="px-4 py-2.5 text-right font-medium text-zinc-500">Proc.</th>
              <th className="px-4 py-2.5 font-medium text-zinc-500">Onboarding</th>
              <th className="px-4 py-2.5 font-medium text-zinc-500">WA</th>
              <th className="px-4 py-2.5 font-medium text-zinc-500">IA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.map((d) => (
              <tr key={d.id} className="bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <StatusDot ultimoAcesso={d.ultimo_acesso} />
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{d.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-500">{d.comarca_nome ?? "—"}</td>
                <td className="px-4 py-3">
                  <UltimoAcesso ts={d.ultimo_acesso} />
                </td>
                <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">{Number(d.atendimentos)}</td>
                <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">{Number(d.demandas)}</td>
                <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">{Number(d.processos)}</td>
                <td className="px-4 py-3">
                  <OnboardingBar steps={[d.convite_aceito, d.primeiro_login, d.primeiro_atendimento, d.primeira_demanda]} />
                </td>
                <td className="px-4 py-3">
                  <Wifi className={`h-4 w-4 ${d.tem_whatsapp ? "text-emerald-500" : "text-zinc-300 dark:text-zinc-700"}`} />
                </td>
                <td className="px-4 py-3">
                  <Brain className={`h-4 w-4 ${d.usou_ia ? "text-emerald-500" : "text-zinc-300 dark:text-zinc-700"}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
