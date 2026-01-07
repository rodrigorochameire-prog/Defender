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
    // Validar entrada
    if (!input.name || !input.email || !input.password) {
      return { success: false, error: "Todos os campos são obrigatórios" };
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      return { success: false, error: "Formato de email inválido" };
    }

    // Validar nome
    if (input.name.trim().length < 2) {
      return { success: false, error: "Nome deve ter pelo menos 2 caracteres" };
    }

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
    
    // Tratar erros específicos
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ENETUNREACH")) {
      return { success: false, error: "Não foi possível conectar ao banco de dados. Verifique sua conexão." };
    }
    
    if (errorMessage.includes("Tenant or user not found")) {
      return { success: false, error: "Erro de autenticação com o banco de dados. Verifique as credenciais." };
    }
    
    if (errorMessage.includes("DATABASE_URL")) {
      return { success: false, error: "Configuração do banco de dados não encontrada." };
    }
    
    if (errorMessage.includes("duplicate key") || errorMessage.includes("unique constraint")) {
      return { success: false, error: "Este email já está cadastrado." };
    }
    
    return { success: false, error: "Erro interno. Tente novamente mais tarde." };
  }
}
