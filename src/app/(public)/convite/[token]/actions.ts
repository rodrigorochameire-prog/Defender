"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export async function activateAccountAction(token: string, formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!email || !email.includes("@")) return { error: "Email invalido" };
  if (!password || password.length < 6) return { error: "Senha deve ter no minimo 6 caracteres" };
  if (password !== confirm) return { error: "Senhas nao conferem" };

  // Verificar token
  const user = await db.query.users.findFirst({
    where: eq(users.inviteToken, token),
  });

  if (!user || !user.mustChangePassword) {
    return { error: "Link invalido ou ja utilizado" };
  }

  // Verificar se email nao esta em uso por outro usuario
  const existingEmail = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existingEmail && existingEmail.id !== user.id) {
    return { error: "Este email ja esta em uso por outro usuario" };
  }

  // Ativar conta
  const hash = await hashPassword(password);
  await db.update(users).set({
    email: email,
    passwordHash: hash,
    mustChangePassword: false,
    inviteToken: null,
    emailVerified: true,
  }).where(eq(users.id, user.id));

  // Auto-login
  await createSession(user.id, user.role);
  redirect("/admin/dashboard");
}
