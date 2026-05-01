import DashboardJuriPage from "./dashboard/page";
import { PrepararAudienciasModal } from "@/components/agenda/preparar-audiencias-modal";

/**
 * Página principal do admin que renderiza o dashboard unificado
 * para TODOS os defensores (especializados e criminal geral).
 * O DashboardJuriPage já trata internamente perfis alternativos
 * (estagiário, servidor, triagem) via DashboardPorPerfil.
 */
export default async function AdminPage() {
  return (
    <>
      <DashboardJuriPage />
      <PrepararAudienciasModal />
    </>
  );
}
