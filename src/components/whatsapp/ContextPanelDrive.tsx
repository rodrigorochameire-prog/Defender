"use client";

import { FolderOpen } from "lucide-react";

// =============================================================================
// COMPONENT — Placeholder for Drive integration
// =============================================================================

export function ContextPanelDrive() {
  return (
    <div className="flex flex-col h-full items-center justify-center px-4 text-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/40 flex items-center justify-center">
        <FolderOpen className="h-5 w-5 text-indigo-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Integração com Drive</p>
        <p className="text-xs text-zinc-500 mt-1">Em breve — arquivos do assistido aparecerão aqui</p>
      </div>
    </div>
  );
}
