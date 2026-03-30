"use client";

import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-zinc-950 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <WifiOff className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            Sem conexão
          </h1>
          <p className="text-sm text-muted-foreground">
            Você está offline. Verifique sua conexão com a internet e tente
            novamente.
          </p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </button>

        <p className="text-xs text-muted-foreground/50">
          Páginas visitadas anteriormente podem estar disponíveis no cache.
        </p>
      </div>
    </div>
  );
}
