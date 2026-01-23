"use server";

import { db, users } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

interface LoginInput {
  email: string;
  password: string;
}

interface LoginResult {
  success: boolean;
  error?: string;
  role?: string;
}

// Credenciais hardcoded para fallback (desenvolvimento)
const FALLBACK_USER = {
  id: 1,
  email: "rodrigorochameire@gmail.com",
  passwordHash: "$2a$10$Hy9MfkPeH.PL75ttDLpOteoxyQRzQr4WhLXwCWdwsZI2ixoLsH1M6", // Defesa9dp*
  role: "admin" as const,
  name: "Rodrigo Rocha Meire",
};

export async function loginAction(input: LoginInput): Promise<LoginResult> {
  try {
    // Validar entrada
    if (!input.email || !input.password) {
      return { success: false, error: "Email e senha são obrigatórios" };
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      return { success: false, error: "Formato de email inválido" };
    }

    const emailLower = input.email.toLowerCase().trim();

    // FALLBACK: Verificar credenciais hardcoded primeiro
    if (emailLower === FALLBACK_USER.email) {
      const isValidFallback = await bcrypt.compare(input.password, FALLBACK_USER.passwordHash);
      if (isValidFallback) {
        await createSession(FALLBACK_USER.id, FALLBACK_USER.role);
        return { success: true, role: FALLBACK_USER.role };
      }
    }

    // Tentar buscar no banco de dados
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.email, emailLower),
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
    } catch (dbError) {
      // Se erro de banco e é o usuário fallback, já tentamos acima
      if (emailLower === FALLBACK_USER.email) {
        return { success: false, error: "Email ou senha incorretos" };
      }
      throw dbError; // Propagar erro para tratamento abaixo
    }
  } catch (error) {
    console.error("Erro no login:", error);

    // Tratar erros específicos
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ENETUNREACH") || errorMessage.includes("EAI_AGAIN")) {
      return { success: false, error: "Não foi possível conectar ao banco de dados. Use as credenciais de fallback ou verifique sua conexão." };
    }

    if (errorMessage.includes("Tenant or user not found")) {
      return { success: false, error: "Erro de autenticação com o banco de dados. Verifique as credenciais." };
    }

    if (errorMessage.includes("DATABASE_URL")) {
      return { success: false, error: "Configuração do banco de dados não encontrada." };
    }

    if (errorMessage.includes("AUTH_SECRET")) {
      return { success: false, error: "Configuração de autenticação não encontrada." };
    }

    if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT")) {
      return { success: false, error: "Tempo de conexão esgotado. Tente novamente." };
    }

    // Em desenvolvimento, mostrar erro real
    if (process.env.NODE_ENV === "development") {
      return { success: false, error: `Erro: ${errorMessage}` };
    }

    return { success: false, error: "Erro interno. Tente novamente mais tarde." };
  }
}
