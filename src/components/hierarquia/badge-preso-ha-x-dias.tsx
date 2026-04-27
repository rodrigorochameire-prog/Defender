"use client";

import { trpc } from "@/lib/trpc/client";
import { computePrisaoStatus } from "@/lib/cronologia/flags";

interface Props { casoId: number; }

export function BadgePresoHaXDias({ casoId }: Props) {
  const { data } = trpc.cronologia.getCronologiaDoCaso.useQuery({ casoId });
  const prisoes = (data?.prisoes as any[] | undefined) ?? [];
  const status = computePrisaoStatus(prisoes);
  if (!status) return null;
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-medium">
      preso há {status.diasPreso}d
    </span>
  );
}
