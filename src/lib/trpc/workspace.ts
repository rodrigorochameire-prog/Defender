import { TRPCError } from "@trpc/server";
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
 * - Assistidos, Processos, Casos: COMPARTILHADOS (todos têm acesso com filtro opcional)
 * - Audiências/Júris: filtrados pela atribuição do defensor
 * 
 * Defensores:
 * - Dr. Rodrigo (id=1): compartilha com Emilly (supervisorId=1)
 * - Dra. Juliane (id=2): compartilha com Taíssa (supervisorId=2)
 * - Dr. Danilo (id=X): pode ter estagiário vinculado
 * - Dra. Cristiane (id=Y): pode ter estagiário vinculado
 */

export function getWorkspaceScope(user: User) {
  const isAdmin = user.role === "admin";

  // Workspace agora é opcional - não bloqueia mais se não tiver
  return {
    isAdmin,
    workspaceId: user.workspaceId ?? null,
    userId: user.id,
  };
}

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

  // Admin e servidor veem todos
  if (isAdmin || isServidor) {
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

export function resolveWorkspaceId(user: User, workspaceId?: number | null) {
  // Admin pode acessar qualquer workspace
  if (user.role === "admin") {
    return workspaceId ?? user.workspaceId ?? null;
  }

  // Se informou um workspace específico, verifica se tem acesso
  if (workspaceId && user.workspaceId && workspaceId !== user.workspaceId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Você não tem acesso ao workspace informado.",
    });
  }

  // Retorna o workspace do usuário ou o informado (pode ser null)
  return workspaceId ?? user.workspaceId ?? null;
}

/**
 * Verifica se os dados são compartilhados (Assistidos, Processos, Casos)
 * Esses dados são sempre acessíveis por todos os defensores
 */
export function isSharedData(entityType: "assistido" | "processo" | "caso" | "demanda" | "juri" | "audiencia") {
  const sharedEntities = ["assistido", "processo", "caso"];
  return sharedEntities.includes(entityType);
}

/**
 * Verifica se os dados são individuais (Demandas)
 * Esses dados são filtrados por quem criou/é responsável
 */
export function isIndividualData(entityType: "assistido" | "processo" | "caso" | "demanda" | "juri" | "audiencia") {
  return entityType === "demanda";
}
