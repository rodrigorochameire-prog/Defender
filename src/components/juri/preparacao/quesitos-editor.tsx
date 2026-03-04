"use client";

import { ListChecks } from "lucide-react";
import { SwissCard, SwissCardContent, SwissCardHeader, SwissCardTitle } from "@/components/ui/swiss-card";

interface QuesitosEditorProps {
  sessaoId: string;
  casoId: string | null;
}

export function QuesitosEditor({ sessaoId, casoId }: QuesitosEditorProps) {
  return (
    <SwissCard className="p-6 min-h-[400px]">
      <SwissCardHeader className="p-0 mb-4">
        <SwissCardTitle className="flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-primary" />
          Editor de Quesitos
        </SwissCardTitle>
      </SwissCardHeader>
      <SwissCardContent className="p-0">
        <div className="text-stone-400 dark:text-zinc-500 text-sm text-center py-10 border-2 border-dashed border-stone-200 dark:border-zinc-800 rounded-lg">
          <ListChecks className="w-12 h-12 mx-auto mb-3 text-stone-300 dark:text-zinc-700" />
          <p>Editor de Quesitos da Defesa</p>
          <p className="text-xs mt-2 text-stone-400 dark:text-zinc-500">
            Criacao e organizacao dos quesitos para o plenario
          </p>
        </div>
      </SwissCardContent>
    </SwissCard>
  );
}
