"use client";

import { MessageSquare } from "lucide-react";

interface ChatEmptyStateProps {
  variant?: "select" | "empty";
}

export function ChatEmptyState({ variant = "select" }: ChatEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-50/50 dark:bg-background/50">
      {/* SVG Illustration */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
          <MessageSquare className="h-10 w-10 text-emerald-500/60 dark:text-emerald-400/40" />
        </div>
        {/* Decorative circles */}
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 animate-pulse-soft" />
        <div className="absolute -bottom-1 -left-3 w-4 h-4 rounded-full bg-zinc-200 dark:bg-border animate-pulse-soft" style={{ animationDelay: "0.5s" }} />
      </div>

      {variant === "select" ? (
        <>
          <h3 className="text-lg font-semibold text-zinc-700 dark:text-foreground/80 mb-1">
            WhatsApp Defender
          </h3>
          <p className="text-sm text-zinc-500 dark:text-muted-foreground text-center max-w-xs">
            Selecione uma conversa ao lado para visualizar as mensagens
          </p>
        </>
      ) : (
        <>
          <h3 className="text-lg font-semibold text-zinc-700 dark:text-foreground/80 mb-1">
            Nenhuma conversa
          </h3>
          <p className="text-sm text-zinc-500 dark:text-muted-foreground text-center max-w-xs">
            As conversas do WhatsApp aparecerao aqui quando o dispositivo estiver conectado
          </p>
        </>
      )}

      {/* Subtle pattern background */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
