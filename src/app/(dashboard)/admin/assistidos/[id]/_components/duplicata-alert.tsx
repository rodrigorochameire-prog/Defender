"use client";

import Link from "next/link";
import { Copy, ArrowRight } from "lucide-react";

type Duplicata = { assistidoId: number; nome: string; confidence: number } | null | undefined;

/**
 * Alerta de possível duplicata — surfacea `assistidos.duplicataSugerida`
 * (detectado no cadastro). Linka para o assistido suspeito para conferência/merge
 * manual. Não renderiza nada se não houver sugestão.
 */
export function DuplicataAlert({ duplicata }: { duplicata: Duplicata }) {
  if (!duplicata) return null;
  const pct = Math.round((duplicata.confidence ?? 0) * (duplicata.confidence > 1 ? 1 : 100));

  return (
    <Link
      href={`/admin/assistidos/${duplicata.assistidoId}`}
      className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20 px-2.5 py-2 hover:bg-amber-100/70 dark:hover:bg-amber-900/30 transition-colors cursor-pointer"
    >
      <Copy className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-medium text-amber-800 dark:text-amber-300">
          Possível duplicata{pct ? ` (${pct}%)` : ""}
        </p>
        <p className="truncate text-[10.5px] text-amber-700/80 dark:text-amber-400/70">{duplicata.nome}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-amber-500" />
    </Link>
  );
}
