"use client";

import { useState } from "react";
import { Users, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { EncaminhamentosInbox } from "@/components/cowork/encaminhamentos/EncaminhamentosInbox";
import { NovoEncaminhamentoModal } from "@/components/cowork/encaminhamentos/NovoEncaminhamentoModal";

type Tab = "encaminhamentos" | "pareceres" | "mural" | "coberturas";

export default function CoworkPage() {
  const [activeTab, setActiveTab] = useState<Tab>("encaminhamentos");
  const [modalOpen, setModalOpen] = useState(false);
  const { data: contadores } = trpc.encaminhamentos.contadores.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      {/* Header */}
      <div className="bg-[#414144] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#525252] flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-white text-[15px] font-semibold tracking-tight leading-tight">
                Cowork
              </h1>
              <p className="text-[10px] text-white/55 tabular-nums mt-0.5">
                {contadores?.recebidosPendentes ?? 0} pendentes
                <span className="text-white/25 mx-1">·</span>
                {contadores?.aguardaAceite ?? 0} aguardando aceite
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-xl bg-white/90 text-neutral-700 text-[12px] font-semibold shadow-sm ring-1 ring-white/[0.1] hover:bg-white hover:text-neutral-900 transition-all duration-150 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-3 flex items-center gap-1.5">
          <TabPill
            active={activeTab === "encaminhamentos"}
            onClick={() => setActiveTab("encaminhamentos")}
            count={contadores?.recebidosPendentes}
          >
            Encaminhamentos
          </TabPill>
          <TabPill
            active={activeTab === "pareceres"}
            onClick={() => setActiveTab("pareceres")}
          >
            Pareceres
          </TabPill>
          <TabPill active={activeTab === "mural"} onClick={() => setActiveTab("mural")}>
            Mural
          </TabPill>
          <TabPill
            active={activeTab === "coberturas"}
            onClick={() => setActiveTab("coberturas")}
          >
            Coberturas
          </TabPill>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        {activeTab === "encaminhamentos" && <EncaminhamentosInbox />}
        {activeTab === "pareceres" && (
          <LegacyRedirect
            href="/admin/pareceres"
            label="Pareceres (página legada)"
            hint="Pareceres serão migrados para Encaminhamentos tipo Parecer."
          />
        )}
        {activeTab === "mural" && (
          <LegacyRedirect href="/admin/mural" label="Mural (página dedicada)" />
        )}
        {activeTab === "coberturas" && (
          <LegacyRedirect href="/admin/coberturas" label="Coberturas (página dedicada)" />
        )}
      </div>

      <NovoEncaminhamentoModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}

function TabPill({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-[11px] font-medium cursor-pointer transition-all whitespace-nowrap",
        active
          ? "bg-white/[0.12] text-white"
          : "text-white/45 hover:text-white/80 hover:bg-white/[0.05]",
      )}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className="ml-1.5 text-[9px] opacity-70">{count}</span>
      )}
    </button>
  );
}

function LegacyRedirect({
  href,
  label,
  hint,
}: {
  href: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm p-8 text-center">
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
      <a
        href={href}
        className="inline-block mt-4 text-[12px] text-indigo-600 hover:text-indigo-700 font-medium"
      >
        Abrir →
      </a>
    </div>
  );
}
