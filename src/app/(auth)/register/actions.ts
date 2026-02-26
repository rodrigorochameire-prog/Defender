"use server";

import { db, users, userInvitations } from "@/lib/db";
import { createSession, hashPassword, validatePassword } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  inviteToken?: string;
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

    // Verificar convite, se fornecido
    let invitation: typeof userInvitations.$inferSelect | null = null;
    if (input.inviteToken) {
      const foundInvite = await db.query.userInvitations.findFirst({
        where: and(
          eq(userInvitations.token, input.inviteToken),
          eq(userInvitations.status, "pending")
        ),
      });

      if (!foundInvite) {
        return { success: false, error: "Convite inválido ou expirado" };
      }

      if (new Date() > foundInvite.expiresAt) {
        await db
          .update(userInvitations)
          .set({ status: "expired" })
          .where(eq(userInvitations.id, foundInvite.id));
        return { success: false, error: "Este convite expirou. Solicite um novo convite ao administrador." };
      }

      // Verificar se o email do convite corresponde
      if (foundInvite.email.toLowerCase() !== input.email.toLowerCase().trim()) {
        return { success: false, error: "O email informado não corresponde ao convite" };
      }

      invitation = foundInvite;
    }

    // Criar hash da senha
    const passwordHash = await hashPassword(input.password);

    // Criar usuário com dados do convite (se existir)
    const [newUser] = await db
      .insert(users)
      .values({
        name: input.name.trim(),
        email: input.email.toLowerCase().trim(),
        passwordHash,
        role: "defensor",
        // Se tem convite, já vem aprovado e com configurações
        ...(invitation && {
          approvalStatus: "approved",
          emailVerified: true,
          nucleo: invitation.nucleo,
          funcao: invitation.funcao,
          oab: invitation.oab,
          podeVerTodosAssistidos: invitation.podeVerTodosAssistidos ?? true,
          podeVerTodosProcessos: invitation.podeVerTodosProcessos ?? true,
        }),
      })
      .returning();

    // Se tinha convite, marcar como aceito
    if (invitation) {
      await db
        .update(userInvitations)
        .set({
          status: "accepted",
          acceptedAt: new Date(),
          acceptedUserId: newUser.id,
        })
        .where(eq(userInvitations.id, invitation.id));
    }

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

/**
 * Valida um token de convite (server action, sem autenticação)
 */
export async function validateInviteAction(token: string): Promise<{
  valid: boolean;
  email?: string;
  nome?: string;
  nucleo?: string | null;
  reason?: string;
}> {
  try {
    const invitation = await db.query.userInvitations.findFirst({
      where: and(
        eq(userInvitations.token, token),
        eq(userInvitations.status, "pending")
      ),
    });

    if (!invitation) {
      return { valid: false, reason: "Convite não encontrado ou já utilizado" };
    }

    if (new Date() > invitation.expiresAt) {
      await db
        .update(userInvitations)
        .set({ status: "expired" })
        .where(eq(userInvitations.id, invitation.id));
      return { valid: false, reason: "Convite expirado" };
    }

    return {
      valid: true,
      email: invitation.email,
      nome: invitation.nome,
      nucleo: invitation.nucleo,
    };
  } catch (error) {
    console.error("Erro ao validar convite:", error);
    return { valid: false, reason: "Erro ao validar convite" };
  }
}
