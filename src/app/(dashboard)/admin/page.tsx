"use client";

import { useProfissional } from "@/contexts/profissional-context";
import DashboardJuriPage from "./dashboard/page";
import DashboardVarasCriminaisPage from "./dashboard/varas-criminais/page";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Página principal do admin que renderiza o dashboard correto
 * baseado no grupo do profissional ativo
 */
export default function AdminPage() {
  const { profissionalAtivo, isLoading } = useProfissional();

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-xl" />
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-96 col-span-2 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  // Renderiza dashboard específico baseado no grupo
  const grupoAtivo = profissionalAtivo.grupo;

  // Varas Criminais (Cristiane e Danilo) - Dashboard separado
  if (grupoAtivo === "varas_criminais") {
    return <DashboardVarasCriminaisPage />;
  }

  // Júri/EP/VVD (Rodrigo e Juliane) e Visão Geral - Dashboard principal
  return <DashboardJuriPage />;
}
