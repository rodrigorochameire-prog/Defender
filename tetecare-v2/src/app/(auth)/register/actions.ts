"use server";

import { db, users } from "@/lib/db";
import { createSession, hashPassword, validatePassword } from "@/lib/auth";
import { eq } from "drizzle-orm";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface RegisterResult {
  success: boolean;
  error?: string;
}

export async function registerAction(input: RegisterInput): Promise<RegisterResult> {
  try {
    // Validar senha
    const passwordValidation = validatePassword(input.password);
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.errors[0] };
    }

    // Verificar se email já existe
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, input.email.toLowerCase().trim()),
    });

    if (existingUser) {
      return { success: false, error: "Este email já está cadastrado" };
    }

    // Criar hash da senha
    const passwordHash = await hashPassword(input.password);

    // Criar usuário
    const [newUser] = await db
      .insert(users)
      .values({
        name: input.name.trim(),
        email: input.email.toLowerCase().trim(),
        passwordHash,
        role: "user", // Novos usuários são sempre tutores
      })
      .returning();

    // Criar sessão
    await createSession(newUser.id, newUser.role);

    return { success: true };
  } catch (error) {
    console.error("Erro no registro:", error);
    return { success: false, error: "Erro interno. Tente novamente." };
  }
}
