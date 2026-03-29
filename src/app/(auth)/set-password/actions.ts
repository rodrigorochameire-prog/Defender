"use server";

import { getSession, invalidateUserCache } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function setPasswordAction(formData: FormData) {
  const session = await getSession();
  if (!session?.id) redirect("/login");

  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!password || password.length < 6) {
    return { error: "Senha deve ter no mínimo 6 caracteres" };
  }
  if (password !== confirm) {
    return { error: "Senhas não conferem" };
  }

  const hash = await hashPassword(password);
  await db.update(users)
    .set({ passwordHash: hash, mustChangePassword: false })
    .where(eq(users.id, session.id));

  // Invalidar cache para que a sessão reflita a mudança
  invalidateUserCache(session.id);

  redirect("/admin/dashboard");
}
