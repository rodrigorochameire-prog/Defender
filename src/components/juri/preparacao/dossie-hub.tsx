"use client";

import { Users } from "lucide-react";
import { SwissCard, SwissCardContent, SwissCardHeader, SwissCardTitle } from "@/components/ui/swiss-card";

interface DossieHubProps {
  sessaoId: string;
  casoId: string | null;
}

export function DossieHub({ sessaoId, casoId }: DossieHubProps) {
  return (
    <SwissCard className="p-6 min-h-[400px]">
      <SwissCardHeader className="p-0 mb-4">
        <SwissCardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Dossie dos Personagens
        </SwissCardTitle>
      </SwissCardHeader>
      <SwissCardContent className="p-0">
        <div className="text-stone-400 dark:text-zinc-500 text-sm text-center py-10 border-2 border-dashed border-stone-200 dark:border-zinc-800 rounded-lg">
          <Users className="w-12 h-12 mx-auto mb-3 text-stone-300 dark:text-zinc-700" />
          <p>Modulo de Dossie dos Personagens</p>
          <p className="text-xs mt-2 text-stone-400 dark:text-zinc-500">
            Perfis de reus, vitimas, testemunhas e peritos
          </p>
        </div>
      </SwissCardContent>
    </SwissCard>
  );
}
