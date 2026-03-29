"use server";

import { db } from "@/lib/db";
import { users, notifications } from "@/lib/db/schema";
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

  // Notify admin (id=1) via in-app notification
  await db.insert(notifications).values({
    userId: 1, // admin
    type: "success",
    title: "Novo defensor ativou conta",
    message: `${user.name} ativou sua conta no OMBUDS.`,
    actionUrl: "/admin/defensoria/convites",
  });

  // WhatsApp notification to admin (best-effort)
  try {
    const { WhatsAppService } = await import("@/lib/services/whatsapp");
    const whatsapp = WhatsAppService.fromEnv();
    await whatsapp.sendText(
      "5584994113298",
      `✅ *Nova ativação*\n\n${user.name} ativou sua conta no OMBUDS.\nComarca: ${user.comarca || "N/A"}`
    );
  } catch (e) {
    console.log("WhatsApp notification skipped:", (e as Error).message);
  }

  // Auto-login
  await createSession(user.id, user.role);
  redirect("/admin/dashboard");
}
