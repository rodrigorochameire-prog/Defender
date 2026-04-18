"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { PessoaChip, PessoaSheet } from "@/components/pessoas";
import { usePessoaSignals } from "@/hooks/use-pessoa-signals";
import { computeDotLevel } from "@/lib/pessoas/compute-dot-level";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  processoId: number;
}

const GRUPO_ORDEM = [
  {
    key: "policial",
    label: "Policial / Investigação",
    papeis: ["policial-militar", "policial-civil", "policial-federal", "autoridade-policial", "guarda-municipal", "agente-penitenciario"],
  },
  {
    key: "pericial",
    label: "Peritos / Técnicos",
    papeis: ["perito-criminal", "perito-medico", "medico-legista", "medico-assistente", "psicologo-forense", "psiquiatra-forense", "assistente-social", "tradutor-interprete"],
  },
  {
    key: "depoentes",
    label: "Depoentes",
    papeis: ["testemunha", "testemunha-defesa", "vitima", "informante"],
  },
  {
    key: "defesa",
    label: "Defesa / Contraparte",
    papeis: ["co-reu", "advogado-parte-contraria"],
  },
  {
    key: "judicial",
    label: "Judicial",
    papeis: ["juiz", "desembargador", "promotor", "procurador", "oficial-justica", "servidor-cartorio", "analista-judiciario"],
    estavel: true,
  },
] as const;

export function PessoasTab({ processoId }: Props) {
  const { data: participacoes = [], isLoading } = trpc.pessoas.getParticipacoesDoProcesso.useQuery({ processoId });
  const [openGroup, setOpenGroup] = useState<string | null>("depoentes");
  const [sheetId, setSheetId] = useState<number | null>(null);

  const pessoaIds = useMemo(() => participacoes.map((p: any) => p.pessoaId), [participacoes]);
  const { getSignal } = usePessoaSignals(pessoaIds);

  const pessoaNomesQuery = trpc.pessoas.list.useQuery({ limit: 200 });
  const getNome = (pessoaId: number) =>
    pessoaNomesQuery.data?.items.find((p) => p.id === pessoaId)?.nome ?? `#${pessoaId}`;

  const pessoasByGroup = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const g of GRUPO_ORDEM) map[g.key] = [];
    for (const p of participacoes) {
      const grupo = GRUPO_ORDEM.find((g) => (g.papeis as readonly string[]).includes(p.papel))?.key ?? "depoentes";
      map[grupo].push(p);
    }
    return map;
  }, [participacoes]);

  if (isLoading) return <p className="p-4 text-sm text-neutral-500">Carregando…</p>;

  return (
    <div className="p-4 space-y-2">
      <div className="text-xs text-neutral-500 mb-3">{participacoes.length} pessoas neste processo</div>

      {GRUPO_ORDEM.map((g) => {
        const items = pessoasByGroup[g.key] ?? [];
        if (items.length === 0) return null;
        const isOpen = openGroup === g.key;
        const estavel = "estavel" in g && g.estavel === true;

        return (
          <div
            key={g.key}
            className={cn(
              "rounded-lg border",
              estavel
                ? "opacity-75 border-neutral-200 dark:border-neutral-800"
                : "border-neutral-200 dark:border-neutral-700",
            )}
          >
            <button
              type="button"
              onClick={() => setOpenGroup(isOpen ? null : g.key)}
              className="w-full flex items-center justify-between px-3 py-2 cursor-pointer"
            >
              <span className={cn("text-xs font-semibold", estavel && "font-medium text-neutral-500")}>
                {g.label} ({items.length})
                {estavel && (
                  <span className="text-[9px] text-neutral-400 ml-2 font-normal">· titulares estáveis</span>
                )}
              </span>
              {isOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
              )}
            </button>

            {isOpen && (
              <div className="px-3 pb-3 space-y-1.5">
                {items.map((p: any) => {
                  const signal = getSignal(p.pessoaId);
                  const nome = getNome(p.pessoaId);
                  const level = signal && !estavel ? computeDotLevel(signal) : "none";

                  return (
                    <div key={p.id} className="flex items-center gap-2 text-xs">
                      <button type="button" onClick={() => setSheetId(p.pessoaId)}>
                        <PessoaChip
                          pessoaId={p.pessoaId}
                          nome={nome}
                          papel={p.papel}
                          dotLevel={level}
                          size="sm"
                          clickable={false}
                        />
                      </button>
                      {!estavel && signal && level !== "none" && (
                        <span className="text-[10px] text-neutral-500">
                          {signal.totalCasos} casos
                          {signal.contradicoesConhecidas > 0 && ` · ${signal.contradicoesConhecidas} contradições`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <PessoaSheet
        pessoaId={sheetId}
        open={sheetId !== null}
        onOpenChange={(o) => { if (!o) setSheetId(null); }}
      />
    </div>
  );
}
