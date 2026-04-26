"use client";

import { trpc } from "@/lib/trpc/client";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props { casoId: number; }

export function SituacaoAtualBlock({ casoId }: Props) {
  const { data } = trpc.cronologia.getCronologiaDoCaso.useQuery({ casoId });
  const prisaoAtiva = (data?.prisoes as any[] | undefined)?.find((p: any) => p.situacao === "ativa");
  const cautelaresAtivas = ((data?.cautelares as any[] | undefined) ?? []).filter((c: any) => c.status === "ativa");

  if (!prisaoAtiva && cautelaresAtivas.length === 0) return null;

  return (
    <div className="border-l-4 border-rose-500 bg-rose-50 dark:bg-rose-950/20 px-4 py-2 text-sm">
      {prisaoAtiva && (
        <div className="font-medium text-rose-700 dark:text-rose-300">
          Preso desde {format(new Date(prisaoAtiva.dataInicio), "dd/MM/yyyy", { locale: ptBR })}
          {" ("}{differenceInDays(new Date(), new Date(prisaoAtiva.dataInicio))} dias)
          {" · "}{prisaoAtiva.tipo}
        </div>
      )}
      {cautelaresAtivas.length > 0 && (
        <div className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
          {cautelaresAtivas.length} cautelar{cautelaresAtivas.length !== 1 ? "es" : ""} ativa{cautelaresAtivas.length !== 1 ? "s" : ""}:
          {" "}{cautelaresAtivas.map((c: any) => String(c.tipo).replace(/-/g, " ")).join(", ")}
        </div>
      )}
    </div>
  );
}
