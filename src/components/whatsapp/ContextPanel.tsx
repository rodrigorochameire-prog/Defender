"use client";

import { useState } from "react";
import { X, Link as LinkIcon, Loader2, Scale } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ContextPanelProcesso } from "./ContextPanelProcesso";
import { ContextPanelDrive } from "./ContextPanelDrive";
import { ContextPanelMidia } from "./ContextPanelMidia";

// =============================================================================
// TYPES
// =============================================================================

interface ContextPanelProps {
  contactId: number;
  configId: number;
  onClose: () => void;
}

type TabKey = "processo" | "drive" | "midia";

const TABS: { key: TabKey; label: string }[] = [
  { key: "processo", label: "Processo" },
  { key: "drive", label: "Drive" },
  { key: "midia", label: "Mídia" },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function ContextPanel({ contactId, configId, onClose }: ContextPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("processo");

  const { data, isLoading } = trpc.whatsappChat.getContactContext.useQuery(
    { contactId, configId },
    { enabled: !!contactId && !!configId }
  );

  return (
    <div className="hidden md:flex w-[280px] flex-shrink-0 border-l border-neutral-200 dark:border-border bg-white dark:bg-card flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200 dark:border-border">
        <div className="flex items-center gap-1.5 min-w-0">
          <Scale className="h-3.5 w-3.5 text-neutral-500 flex-shrink-0" />
          {isLoading ? (
            <div className="h-3 w-24 bg-neutral-200 dark:bg-muted rounded animate-pulse" />
          ) : data?.assistido ? (
            <span className="text-xs font-medium text-neutral-900 dark:text-foreground truncate">
              {data.assistido.nome}
            </span>
          ) : (
            <span className="text-xs text-neutral-500">Contexto</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-neutral-100 dark:hover:bg-muted transition-colors text-neutral-500 hover:text-neutral-700 dark:hover:text-foreground/80 cursor-pointer flex-shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Assistido info strip */}
      {!isLoading && data?.assistido && (
        <div className="px-3 py-1.5 border-b border-neutral-200/50 dark:border-border/50 bg-neutral-100 dark:bg-muted/20">
          <p className="text-[10px] text-neutral-500 font-mono">
            {data.assistido.cpf ?? "CPF não informado"}
          </p>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex border-b border-neutral-200 dark:border-border px-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex-1 py-2 text-[11px] font-medium transition-colors cursor-pointer",
              activeTab === key
                ? "text-neutral-900 dark:text-foreground border-b-2 border-emerald-500"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-foreground/80 border-b-2 border-transparent"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
          </div>
        ) : !data?.assistido ? (
          /* No linked assistido */
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-muted/60 border border-neutral-300 dark:border-border flex items-center justify-center">
              <LinkIcon className="h-5 w-5 text-neutral-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-700 dark:text-foreground/80">Contato não vinculado</p>
              <p className="text-xs text-neutral-500 mt-1">
                Vincule este contato a um assistido para ver o contexto jurídico
              </p>
            </div>
            <button className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium cursor-pointer">
              Vincular a assistido
            </button>
          </div>
        ) : (
          /* Tabs content */
          <>
            {activeTab === "processo" && (
              <ContextPanelProcesso
                assistidoId={data.assistido.id}
                processoAtivo={data.processoAtivo ? {
                  id: data.processoAtivo.id,
                  numeroAutos: data.processoAtivo.numeroAutos,
                  vara: data.processoAtivo.vara ?? null,
                  assunto: data.processoAtivo.assunto ?? null,
                } : null}
              />
            )}
            {activeTab === "drive" && <ContextPanelDrive />}
            {activeTab === "midia" && (
              <ContextPanelMidia contactId={contactId} configId={configId} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
