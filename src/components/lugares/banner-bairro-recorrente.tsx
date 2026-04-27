"use client";

import { Search } from "lucide-react";

interface Props {
  bairro: string | null;
  totalEm12m: number;
}

export function BannerBairroRecorrente({ bairro, totalEm12m }: Props) {
  if (!bairro || totalEm12m < 5) return null;
  return (
    <div className="rounded border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-sm">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
        <Search className="w-3.5 h-3.5" />
        <span className="font-medium">Bairro {bairro} é recorrente</span>
        <span className="text-xs opacity-80">— {totalEm12m} casos em 12 meses</span>
      </div>
    </div>
  );
}
