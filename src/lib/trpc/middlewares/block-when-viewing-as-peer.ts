import { TRPCError } from "@trpc/server";
import type { User } from "@/lib/db/schema";

/**
 * Função pura testável: decide se a chamada deve ser bloqueada.
 * Separada do middleware tRPC para facilitar testes unitários.
 */
export function blockWhenViewingAsPeerCheck(params: {
  type: "query" | "mutation" | "subscription";
  user: User;
  selectedDefensorScopeId: number | null;
}): void {
  // Queries e subscriptions nunca são bloqueadas — só leituras.
  if (params.type !== "mutation") return;

  // Sem scope ou scope apontando para o próprio user → permitido.
  if (
    params.selectedDefensorScopeId === null ||
    params.selectedDefensorScopeId === params.user.id
  ) {
    return;
  }

  // Scope aponta para outro user → modo "ver como peer", bloqueado.
  throw new TRPCError({
    code: "FORBIDDEN",
    message:
      "Modo somente-leitura: você está visualizando como outro defensor. Volte ao seu perfil para editar.",
  });
}
