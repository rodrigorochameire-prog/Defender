"use server";

import { db, users } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";

interface LoginInput {
  email: string;
  password: string;
}

interface LoginResult {
  success: boolean;
  error?: string;
  role?: string;
}

export async function loginAction(input: LoginInput): Promise<LoginResult> {
  try {
    // Buscar usuário por email
    const user = await db.query.users.findFirst({
      where: eq(users.email, input.email.toLowerCase().trim()),
    });

    if (!user) {
      return { success: false, error: "Email ou senha incorretos" };
    }

    // Verificar se tem senha cadastrada
    if (!user.passwordHash) {
      return { success: false, error: "Este usuário não possui senha cadastrada" };
    }

    // Verificar senha
    const isValidPassword = await verifyPassword(input.password, user.passwordHash);

    if (!isValidPassword) {
      return { success: false, error: "Email ou senha incorretos" };
    }

    // Criar sessão
    await createSession(user.id, user.role);

    return { success: true, role: user.role };
  } catch (error) {
    console.error("Erro no login:", error);
    return { success: false, error: "Erro interno. Tente novamente." };
  }
}
