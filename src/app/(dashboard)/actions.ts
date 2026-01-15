"use server";

import { auth } from "@clerk/nextjs/server";
import { destroySession } from "@/lib/auth/session";

export async function logoutAction() {
  // Limpa a sessão customizada (cookies JWT)
  await destroySession();
  
  // O signOut do Clerk será feito no cliente
  // Retorna sucesso para o cliente redirecionar
  return { success: true };
}
