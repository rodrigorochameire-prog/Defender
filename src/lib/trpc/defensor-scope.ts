import type { User } from "@/lib/db/schema";

/**
 * Sistema de Isolamento de Dados por Defensor
 *
 * Arquitetura:
 * - Demandas: PRIVADAS por defensor (cada defensor tem seu "banco")
 *   - Defensor vê suas demandas
 *   - Estagiário vê demandas do seu supervisor (defensor vinculado)
 *   - Servidor vê demandas de todos os defensores (administrativa)
 *   - Admin vê tudo
 * - Assistidos, Processos, Casos: COMPARTILHADOS (todos têm acesso)
 * - Audiências/Júris: filtrados pela atribuição do defensor
 *
 * Defensores:
 * - Dr. Rodrigo (id=1): compartilha com Emilly (supervisorId=1)
 * - Dra. Juliane (id=2): compartilha com Taíssa (supervisorId=2)
 * - Dr. Danilo (id=X): pode ter estagiário vinculado
 * - Dra. Cristiane (id=Y): pode ter estagiário vinculado
 */

/**
 * Retorna o ID do defensor responsável pelas demandas
 * - Para defensores: retorna o próprio ID
 * - Para estagiários: retorna o ID do supervisor (defensor vinculado)
 * - Para servidores: retorna null (podem ver de vários defensores)
 * - Para admin: retorna null (vê tudo)
 */
export function getDefensorResponsavel(user: User): number | null {
  const isAdmin = user.role === "admin";
  const isServidor = user.role === "servidor";
  const isEstagiario = user.role === "estagiario";
  const isDefensor = user.role === "defensor";

  // Admin e servidor podem ver demandas de qualquer defensor
  if (isAdmin || isServidor) {
    return null;
  }

  // Estagiário vê demandas do seu supervisor (defensor vinculado)
  if (isEstagiario) {
    return (user as any).supervisorId ?? user.id;
  }

  // Defensor vê suas próprias demandas
  if (isDefensor) {
    return user.id;
  }

  // Fallback: usa o próprio ID
  return user.id;
}

/**
 * Retorna os IDs de defensores que o usuário pode visualizar
 * Útil para queries que precisam mostrar demandas de múltiplos defensores
 */
export function getDefensoresVisiveis(user: User): number[] | "all" {
  const isAdmin = user.role === "admin";
  const isServidor = user.role === "servidor";
  const isEstagiario = user.role === "estagiario";
  const isDefensor = user.role === "defensor";

  // Admin vê todos
  if (isAdmin) {
    return "all";
  }

  // Servidor: vê apenas dos defensores vinculados (se houver), ou todos
  if (isServidor) {
    const vinculados = (user as any).defensoresVinculados as number[] | null | undefined;
    if (vinculados && vinculados.length > 0) {
      return vinculados;
    }
    return "all";
  }

  // Estagiário vê apenas do seu supervisor
  if (isEstagiario) {
    const supervisorId = (user as any).supervisorId;
    return supervisorId ? [supervisorId] : [user.id];
  }

  // Defensor vê apenas as suas
  if (isDefensor) {
    return [user.id];
  }

  return [user.id];
}
