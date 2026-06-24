"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const KBD = "px-1.5 py-0.5 bg-blue-200 dark:bg-blue-800 rounded font-mono text-xs";

/**
 * Ajuda "Como copiar do PJe" recolhível (Fase 5.2). Recolhida por padrão para que
 * a textarea seja a protagonista da etapa — antes o passo-a-passo ocupava um bloco
 * alto e fixo acima do campo, empurrando-o para baixo da dobra.
 */
export function PjeCopyHelp({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-blue-900 dark:text-blue-100 hover:bg-blue-100/60 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
      >
        <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <span className="flex-1 text-left">Como copiar do PJe</span>
        <ChevronDown className={cn("w-4 h-4 text-blue-500 transition-transform flex-shrink-0", open && "rotate-180")} />
      </button>
      {open && (
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-blue-800 dark:text-blue-200 px-4 pb-4 pt-1">
          <li>Acesse o <strong>PJe</strong> e vá para <strong>Intimações Pendentes</strong></li>
          <li>Selecione todo o texto das intimações <span className={KBD}>Ctrl+A</span></li>
          <li>Copie o texto <span className={KBD}>Ctrl+C</span></li>
          <li>Cole no campo abaixo <span className={KBD}>Ctrl+V</span></li>
          <li>Clique em <strong>&ldquo;Analisar Intimações&rdquo;</strong></li>
        </ol>
      )}
    </div>
  );
}
