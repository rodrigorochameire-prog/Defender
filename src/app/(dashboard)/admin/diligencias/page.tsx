"use client";

import { Badge } from "@/components/ui/badge";
import { Radar } from "lucide-react";
import { DiligenciasPainel } from "@/components/diligencias";

export default function DiligenciasPage() {
  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header Padrão Defender */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <Radar className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                Investigação
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Painel de diligências e pesquisa OSINT
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
          >
            Beta
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        <DiligenciasPainel />
      </div>
    </div>
  );
}
