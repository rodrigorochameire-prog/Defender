"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";

// Tipos de roles da aplicação
export type UserRole = "admin" | "defensor" | "servidor" | "estagiario" | "triagem";

// Hierarquia de roles (maior número = mais permissões)
const ROLE_HIERARCHY: Record<UserRole, number> = {
  triagem: 1,
  estagiario: 2,
  servidor: 3,
  defensor: 4,
  admin: 5,
};

// Mapeamento de páginas por role
export const PAGE_ACCESS: Record<string, UserRole[]> = {
  // Acesso total para defensores e admin
  "/admin/dashboard": ["admin", "defensor", "servidor", "estagiario"],
  "/admin/demandas": ["admin", "defensor", "servidor", "estagiario"],
  "/admin/assistidos": ["admin", "defensor", "servidor", "estagiario", "triagem"],
  "/admin/processos": ["admin", "defensor", "servidor", "estagiario"],
  "/admin/drive": ["admin", "defensor", "servidor", "estagiario"],
  "/admin/agenda": ["admin", "defensor", "servidor", "estagiario"],
  
  // Júri - apenas defensores e estagiários
  "/admin/juri": ["admin", "defensor", "estagiario"],
  "/admin/juri/jurados": ["admin", "defensor", "estagiario"],
  "/admin/juri/cockpit": ["admin", "defensor", "estagiario"],
  "/admin/juri/historico": ["admin", "defensor", "estagiario"],
  "/admin/juri/avaliacao": ["admin", "defensor", "estagiario"],
  
  // WhatsApp Hub - defensores e servidora
  "/admin/whatsapp": ["admin", "defensor", "servidor"],
  
  // Equipe - defensores podem gerenciar, servidores podem visualizar
  "/admin/equipe": ["admin", "defensor", "servidor"],
  
  // Configurações - apenas admin e defensores
  "/admin/settings": ["admin", "defensor"],
  "/admin/usuarios": ["admin"],
  "/admin/workspaces": ["admin"],
  
  // Casos
  "/admin/casos": ["admin", "defensor", "servidor", "estagiario"],
  
  // Medidas Protetivas
  "/admin/medidas": ["admin", "defensor", "servidor"],
  
  // Execução Penal
  "/admin/execucao": ["admin", "defensor", "servidor"],
  
  // Relatórios
  "/admin/relatorios": ["admin", "defensor"],
};

// Interface do usuário da sessão
interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  supervisorId?: number | null;
  funcao?: string | null;
}

// Interface para membros da equipe
interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  funcao?: string | null;
  supervisorId?: number | null;
}

export function usePermissions() {
  const [user, setUser] = useState<SessionUser | null>(null);
  
  // Buscar dados do usuário da sessão
  const { data: sessionData } = trpc.users.me.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: false,
  });

  useEffect(() => {
    if (sessionData) {
      setUser({
        id: sessionData.id,
        name: sessionData.name,
        email: sessionData.email,
        role: sessionData.role as UserRole,
        supervisorId: (sessionData as any).supervisorId,
        funcao: (sessionData as any).funcao,
      });
    }
  }, [sessionData]);

  // Verificar se usuário pode acessar uma página
  const canAccess = (page: string): boolean => {
    if (!user) return false;
    
    // Admin tem acesso a tudo
    if (user.role === "admin") return true;
    
    // Verificar se a página existe no mapeamento
    const allowedRoles = PAGE_ACCESS[page];
    if (!allowedRoles) {
      // Se não está mapeado, assume que precisa ser defensor ou admin
      return ["admin", "defensor"].includes(user.role);
    }
    
    return allowedRoles.includes(user.role);
  };

  // Verificar se usuário pode delegar tarefas
  const canDelegate = (): boolean => {
    if (!user) return false;
    return ["admin", "defensor"].includes(user.role);
  };

  // Verificar se usuário pode gerenciar a equipe
  const canManageTeam = (): boolean => {
    if (!user) return false;
    return ["admin", "defensor"].includes(user.role);
  };

  // Verificar se usuário pode visualizar a equipe
  const canViewTeam = (): boolean => {
    if (!user) return false;
    return ["admin", "defensor", "servidor"].includes(user.role);
  };

  // Verificar se tem role igual ou superior
  const hasMinRole = (minRole: UserRole): boolean => {
    if (!user) return false;
    return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[minRole];
  };

  // Verificar se é o supervisor de um usuário específico
  const isSupervisorOf = (userId: number, userSupervisorId?: number | null): boolean => {
    if (!user) return false;
    return userSupervisorId === user.id;
  };

  // Obter label amigável da role
  const getRoleLabel = (role: UserRole): string => {
    const labels: Record<UserRole, string> = {
      admin: "Administrador",
      defensor: "Defensor(a)",
      servidor: "Servidor(a)",
      estagiario: "Estagiário(a)",
      triagem: "Triagem",
    };
    return labels[role] || role;
  };

  // Obter cor da role
  const getRoleColor = (role: UserRole): string => {
    const colors: Record<UserRole, string> = {
      admin: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
      defensor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      servidor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      estagiario: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      triagem: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
    };
    return colors[role] || colors.triagem;
  };

  return {
    user,
    canAccess,
    canDelegate,
    canManageTeam,
    canViewTeam,
    hasMinRole,
    isSupervisorOf,
    getRoleLabel,
    getRoleColor,
    isLoading: !sessionData,
  };
}

// Hook para obter membros da equipe visíveis para o usuário atual
export function useTeamMembers() {
  const { user, canManageTeam } = usePermissions();
  
  const { data: allUsers, isLoading } = trpc.users.list.useQuery(undefined, {
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Filtrar membros baseado nas permissões
  const visibleMembers: TeamMember[] = (allUsers || []).map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as UserRole,
    funcao: u.funcao,
    supervisorId: u.supervisorId,
  }));

  // Membros para delegação (servidores e estagiários supervisionados)
  const delegationTargets: TeamMember[] = visibleMembers.filter((member) => {
    if (!user) return false;
    
    // Defensores podem delegar para servidores
    if (member.role === "servidor") return true;
    
    // Defensores podem delegar para seus estagiários supervisionados
    if (member.role === "estagiario" && member.supervisorId === user.id) return true;
    
    return false;
  });

  // Estagiários supervisionados pelo usuário atual
  const supervisedInterns = visibleMembers.filter(
    (member) => member.role === "estagiario" && member.supervisorId === user?.id
  );

  return {
    members: visibleMembers,
    delegationTargets,
    supervisedInterns,
    isLoading,
  };
}
