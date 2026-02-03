"use client";

import DashboardJuriPage from "./dashboard/page";

/**
 * Página principal do admin que renderiza o dashboard unificado
 * para TODOS os defensores (especializados e criminal geral).
 * O DashboardJuriPage já trata internamente perfis alternativos
 * (estagiário, servidor, triagem) via DashboardPorPerfil.
 */
export default function AdminPage() {
  return <DashboardJuriPage />;
}
