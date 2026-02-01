import { TRPCError } from "@trpc/server";
import type { User } from "@/lib/db/schema";

/**
 * Sistema de Workspace Simplificado
 * 
 * O novo modelo funciona assim:
 * - Demandas: individuais (filtradas por quem criou/é responsável)
 * - Assistidos, Processos, Casos: compartilhados (todos têm acesso)
 * - Audiências/Júris: filtrados pela atribuição do mês do defensor
 * - Workspace: usado apenas para substituições (Criminal/Não Penal)
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
