"use server";

import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { createClient } from "@supabase/supabase-js";

interface ForgotPasswordResult {
  success: boolean;
  message: string;
}

// Mensagem genérica para não revelar se o email existe ou não
const GENERIC_SUCCESS = "Se o email estiver cadastrado, você receberá as instruções de recuperação.";

export async function forgotPasswordAction(email: string): Promise<ForgotPasswordResult> {
  try {
    if (!email || !email.includes("@")) {
      return {
        success: false,
        message: "Por favor, forneça um email válido",
      };
    }

    const emailNormalized = email.toLowerCase().trim();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[Forgot Password] Supabase não configurado");
      return {
        success: false,
        message: "Serviço de email não configurado. Entre em contato com o suporte.",
      };
    }

    // Verificar se o usuário existe no banco do app
    // (evita enviar email para endereços não cadastrados E garante criação no Supabase Auth)
    const appUser = await db.query.users.findFirst({
      where: eq(users.email, emailNormalized),
    });

    if (!appUser) {
      // Retornar mensagem genérica para não revelar se email existe
      console.log("[Forgot Password] Email não encontrado no banco:", emailNormalized);
      return { success: true, message: GENERIC_SUCCESS };
    }

    // Garantir que o usuário existe no Supabase Auth.
    // Usuários criados via convite (registerAction) só existem na tabela 'users' do app,
    // não no Supabase Auth. O resetPasswordForEmail silenciosamente não envia nada
    // se o email não estiver cadastrado lá.
    try {
      const adminSupabase = getSupabaseAdmin();
      await adminSupabase.auth.admin.createUser({
        email: emailNormalized,
        email_confirm: true, // Pular confirmação de email
      });
      console.log("[Forgot Password] Usuário criado no Supabase Auth:", emailNormalized);
    } catch {
      // Ignorar erro — significa que o usuário já existe no Supabase Auth
      console.log("[Forgot Password] Usuário já existe no Supabase Auth:", emailNormalized);
    }

    // URL de redirecionamento para reset de senha
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      "https://ombuds.vercel.app";
    const redirectTo = `${baseUrl}/reset-password`;

    // Enviar email de recuperação via Supabase Auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { error } = await supabase.auth.resetPasswordForEmail(emailNormalized, {
      redirectTo,
    });

    if (error) {
      console.error("[Forgot Password] Supabase error:", error.message);
    }

    return { success: true, message: GENERIC_SUCCESS };
  } catch (error) {
    console.error("[Forgot Password] Erro:", error);
    return {
      success: false,
      message: "Erro ao processar solicitação. Tente novamente.",
    };
  }
}
