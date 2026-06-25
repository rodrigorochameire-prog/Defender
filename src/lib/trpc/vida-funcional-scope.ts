import type { User } from "@/lib/db/schema";

/**
 * Escopo de acesso da Vida Funcional — PRIVADO ao defensor.
 *
 * Diferente de `getDefensoresVisiveis` (demandas), aqui NÃO existe "all":
 * admin não recebe god-view dos dados funcionais alheios (caráter sensível).
 * Retorna sempre um array não-vazio de defensorIds visíveis ao usuário.
 */
export function getVidaFuncionalScope(user: User): number[] {
  const supervisorId = (user as any).supervisorId as number | null | undefined;
  const vinculados = (user as any).defensoresVinculados as number[] | null | undefined;

  if (user.role === "estagiario") {
    return supervisorId ? [supervisorId] : [user.id];
  }
  if (user.role === "servidor") {
    return vinculados && vinculados.length > 0 ? vinculados : [user.id];
  }
  // defensor, admin, triagem: só o próprio (admin sem god-view)
  return [user.id];
}
