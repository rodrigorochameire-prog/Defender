import DashboardJuriPage from "./dashboard/page";
import { PrepararAudienciasModal } from "@/components/agenda/preparar-audiencias-modal";
import { getSession } from "@/lib/auth/session";
import { Suspense } from "react";
import { AtendimentosPendentesCard } from "@/components/dashboard/atendimentos-pendentes-card";

/**
 * Página principal do admin que renderiza o dashboard unificado
 * para TODOS os defensores (especializados e criminal geral).
 * O DashboardJuriPage já trata internamente perfis alternativos
 * (estagiário, servidor, triagem) via DashboardPorPerfil.
 */
export default async function AdminPage() {
  const user = await getSession();

  return (
    <>
      {user && (
        <div className="px-4 pt-4">
          <Suspense fallback={null}>
            <AtendimentosPendentesCard defensorId={user.id} workspaceId={user.workspaceId} />
          </Suspense>
        </div>
      )}
      <DashboardJuriPage />
      <PrepararAudienciasModal />
    </>
  );
}
