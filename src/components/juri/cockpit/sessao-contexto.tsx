"use client";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { normalizeDefensor } from "@/lib/juri/normalize-defensor";
import {
  Users2,
  MapPin,
  Scale,
  ShieldQuestion,
  Mic,
  FileText,
  Info,
} from "lucide-react";

/**
 * Barra de contexto da sessão do júri, lida do banco (sessoes_juri + avaliacao).
 *
 * Diferencia claramente a atuação no GRUPO DO JÚRI (substituição) da titularidade,
 * e lista os depoentes do processo carregados na análise — para o cockpit ficar
 * útil mesmo antes de qualquer registro manual.
 */

function credColor(c: number | null | undefined) {
  if (c == null) return "bg-neutral-200 text-neutral-600";
  if (c >= 7) return "bg-emerald-100 text-emerald-700";
  if (c >= 5) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

export function SessaoContexto({
  sessaoJuriId,
  isDarkMode = false,
}: {
  sessaoJuriId: number | null;
  isDarkMode?: boolean;
}) {
  const enabled = sessaoJuriId != null;
  const { data: sessao } = trpc.juri.getById.useQuery(
    { id: sessaoJuriId as number },
    { enabled }
  );
  const { data: avaliacao } = trpc.avaliacaoJuri.getBySessaoId.useQuery(
    { sessaoJuriId: sessaoJuriId as number },
    { enabled }
  );

  if (!enabled || !sessao) return null;

  const isGrupo = normalizeDefensor(sessao.defensorNome) === "Grupo do Júri";
  const comarca = sessao.processo?.comarca ?? null;
  const foraCamacari = comarca != null && !/cama[cç]ari/i.test(comarca);
  const depoentes = (avaliacao?.avaliacaoTestemunhas ?? []).slice().sort(
    (a: { ordem: number | null }, b: { ordem: number | null }) =>
      (a.ordem ?? 99) - (b.ordem ?? 99)
  );

  const card = isDarkMode
    ? "bg-neutral-900 ring-neutral-800"
    : "bg-white ring-neutral-200/70";
  const muted = isDarkMode ? "text-neutral-400" : "text-neutral-500";
  const strong = isDarkMode ? "text-neutral-100" : "text-neutral-800";

  return (
    <div className={cn("rounded-2xl ring-1 shadow-sm overflow-hidden", card)}>
      {/* Faixa de identificação */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-dashed border-neutral-200/70 dark:border-neutral-800">
        <div className="flex items-center gap-2 min-w-0">
          <Users2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className={cn("text-sm font-semibold truncate", strong)}>
            {sessao.assistidoNome ?? "Defendido(a)"}
          </span>
        </div>

        {isGrupo && (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-violet-200">
            <ShieldQuestion className="w-3 h-3" />
            GRUPO DO JÚRI · substituição
          </span>
        )}

        {sessao.processo?.numeroAutos && (
          <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium", muted)}>
            <FileText className="w-3 h-3" />
            {sessao.processo.numeroAutos}
          </span>
        )}

        {comarca && (
          <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium", muted)}>
            <MapPin className="w-3 h-3" />
            {comarca}
            {sessao.processo?.vara ? ` · ${sessao.processo.vara}` : ""}
          </span>
        )}
      </div>

      {/* Tese principal */}
      {sessao.tesePrincipal && (
        <div className="px-4 py-2.5 flex items-start gap-2 bg-emerald-50/60 dark:bg-emerald-950/20">
          <Scale className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
          <p className={cn("text-[12px] leading-snug", strong)}>
            <span className="font-semibold">Tese: </span>
            {sessao.tesePrincipal}
          </p>
        </div>
      )}

      {/* Aviso de jurados quando fora da titularidade */}
      {isGrupo && foraCamacari && (
        <div className="px-4 py-2 flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-100 dark:border-amber-900/40">
          <Info className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[11px] leading-snug text-amber-800 dark:text-amber-300">
            Comarca de <span className="font-semibold">{comarca}</span> — os jurados
            são sorteados nesta sessão. O acervo de jurados exibido abaixo é o de
            Camaçari e <span className="font-semibold">não se aplica</span> a esta
            substituição; cadastre os sorteados no dia.
          </p>
        </div>
      )}

      {/* Depoentes do processo (carregados do banco) */}
      {depoentes.length > 0 && (
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Mic className="w-3.5 h-3.5 text-indigo-500" />
            <span className={cn("text-[11px] font-semibold uppercase tracking-wide", muted)}>
              Depoentes do processo
            </span>
            <span className={cn("text-[11px]", muted)}>· {depoentes.length}</span>
          </div>
          <ul className="space-y-1.5">
            {depoentes.map((d: {
              id: number;
              nome: string;
              resumoDepoimento: string | null;
              credibilidade: number | null;
            }) => (
              <li
                key={d.id}
                className={cn(
                  "rounded-lg px-3 py-2 ring-1",
                  isDarkMode ? "bg-neutral-800/50 ring-neutral-800" : "bg-neutral-50 ring-neutral-200/70"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("text-[12px] font-semibold", strong)}>{d.nome}</span>
                  {d.credibilidade != null && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                        credColor(d.credibilidade)
                      )}
                      title="Credibilidade estimada (1–10)"
                    >
                      cred. {d.credibilidade}/10
                    </span>
                  )}
                </div>
                {d.resumoDepoimento && (
                  <p className={cn("mt-0.5 text-[11px] leading-snug", muted)}>
                    {d.resumoDepoimento}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
