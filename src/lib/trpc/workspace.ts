import { TRPCError } from "@trpc/server";
import type { User } from "@/lib/db/schema";

export function getWorkspaceScope(user: User) {
  const isAdmin = user.role === "admin";

  if (isAdmin) {
    return {
      isAdmin,
      workspaceId: user.workspaceId ?? null,
    };
  }

  if (!user.workspaceId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Usuário sem workspace atribuído. Fale com o administrador.",
    });
  }

  return {
    isAdmin,
    workspaceId: user.workspaceId,
  };
}

export function resolveWorkspaceId(user: User, workspaceId?: number | null) {
  if (user.role === "admin") {
    return workspaceId ?? user.workspaceId ?? null;
  }

  if (!user.workspaceId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Usuário sem workspace atribuído. Fale com o administrador.",
    });
  }

  if (workspaceId && workspaceId !== user.workspaceId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Você não tem acesso ao workspace informado.",
    });
  }

  return user.workspaceId;
}
