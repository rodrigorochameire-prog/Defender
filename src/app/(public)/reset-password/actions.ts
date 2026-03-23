"use server";

import { createClient } from "@supabase/supabase-js";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";

export async function updatePasswordInDb(
  accessToken: string,
  refreshToken: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, error: "Serviço não configurado" };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Validar a sessão server-side para confirmar quem está fazendo o reset
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error || !data.user?.email) {
      console.error("[UpdatePasswordInDb] Sessão inválida:", error?.message);
      return { success: false, error: "Sessão inválida ou expirada" };
    }

    const email = data.user.email.toLowerCase();

    // Hash da nova senha
    const passwordHash = await hashPassword(newPassword);

    // Atualizar na tabela de usuários do app
    const result = await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.email, email))
      .returning({ id: users.id });

    if (result.length === 0) {
      console.error("[UpdatePasswordInDb] Usuário não encontrado no banco:", email);
      return { success: false, error: "Usuário não encontrado" };
    }

    console.log("[UpdatePasswordInDb] Senha atualizada para:", email);
    return { success: true };
  } catch (err) {
    console.error("[UpdatePasswordInDb] Erro:", err);
    return { success: false, error: "Erro ao salvar nova senha" };
  }
}
