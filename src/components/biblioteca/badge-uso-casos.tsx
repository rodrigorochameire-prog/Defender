"use client";
import { trpc } from "@/lib/trpc/client";
import { Briefcase } from "lucide-react";

interface Props {
  tipo: "tese" | "artigo" | "lei";
  referenciaId: string;
}

export function BadgeUsoCasos({ tipo, referenciaId }: Props) {
  const { data: total } = trpc.biblioteca.contarUsos.useQuery(
    { tipo, referenciaId },
    { staleTime: 60_000 }
  );
  if (!total) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
      <Briefcase className="w-3 h-3" />
      Aplicada em {total} {total === 1 ? "caso" : "casos"}
    </span>
  );
}
