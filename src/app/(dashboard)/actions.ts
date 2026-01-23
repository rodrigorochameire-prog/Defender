"use server";

import { destroySession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export async function logoutAction() {
  // Limpa a sessão (cookies JWT)
  await destroySession();
  
  // Redireciona para login
  redirect("/login");
}
