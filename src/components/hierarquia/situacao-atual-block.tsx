"use client";

import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  computePrisaoStatus,
  detectExcessoPrazoPreventiva,
  detectFlagranteSemCustodia,
  detectTempoFatoDenunciaExcessivo,
} from "@/lib/cronologia/flags";

interface Props { casoId: number; }

export function SituacaoAtualBlock({ casoId }: Props) {
  const { data } = trpc.cronologia.getCronologiaDoCaso.useQuery({ casoId });
  const prisoes = (data?.prisoes as any[] | undefined) ?? [];
  const marcos = (data?.marcos as any[] | undefined) ?? [];
  const cautelaresAtivas = ((data?.cautelares as any[] | undefined) ?? []).filter((c: any) => c.status === "ativa");

  const status = computePrisaoStatus(prisoes);
  const excesso = detectExcessoPrazoPreventiva(prisoes, marcos);
  const flagranteSemCustodia = detectFlagranteSemCustodia(prisoes, marcos);
  const tempoFatoDenuncia = detectTempoFatoDenunciaExcessivo(marcos);

  const temCustodia = Boolean(status || excesso || flagranteSemCustodia || cautelaresAtivas.length > 0);
  if (!temCustodia && !tempoFatoDenuncia) return null;

  // Custódia → vermelho; só sinal de timeline → âmbar (não dramatizar prescrição como prisão).
  const tema = temCustodia
    ? "border-rose-500 bg-rose-50 dark:bg-rose-950/20"
    : "border-amber-500 bg-amber-50 dark:bg-amber-950/20";

  return (
    <div className={`border-l-4 ${tema} px-4 py-2 text-sm space-y-1`}>
      {status && (
        <div className="font-medium text-rose-700 dark:text-rose-300">
          Preso desde {format(new Date(status.dataInicio), "dd/MM/yyyy", { locale: ptBR })}
          {" ("}{status.diasPreso} dias){" · "}{status.tipo}
        </div>
      )}
      {excesso && (
        <div
          className={`text-xs font-medium ${
            excesso.nivel === "red"
              ? "text-rose-600 dark:text-rose-400"
              : "text-amber-600 dark:text-amber-400"
          }`}
        >
          Excesso de prazo: {excesso.motivo}
        </div>
      )}
      {flagranteSemCustodia && (
        <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">
          Flagrante há {flagranteSemCustodia.diasDesdeFlagrante}d sem audiência de custódia documentada (nulidade — art. 310 CPP)
        </div>
      )}
      {tempoFatoDenuncia && (
        <div
          className={`text-xs font-medium ${
            tempoFatoDenuncia.nivel === "red"
              ? "text-rose-600 dark:text-rose-400"
              : "text-amber-600 dark:text-amber-400"
          }`}
        >
          {tempoFatoDenuncia.motivo}
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
