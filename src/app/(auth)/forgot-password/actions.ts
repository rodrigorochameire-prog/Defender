"use server";

import { createClient } from "@supabase/supabase-js";

interface ForgotPasswordResult {
  success: boolean;
  message: string;
}

export async function forgotPasswordAction(email: string): Promise<ForgotPasswordResult> {
  try {
    if (!email || !email.includes("@")) {
      return {
        success: false,
        message: "Por favor, forneça um email válido",
      };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[Forgot Password] Supabase não configurado");
      return {
        success: false,
        message: "Serviço de email não configurado. Entre em contato com o suporte.",
      };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // URL de redirecionamento para reset de senha
    // Prioriza: NEXT_PUBLIC_APP_URL > VERCEL_URL > fallback
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                   "https://tetecare-v2.vercel.app";
    const redirectTo = `${baseUrl}/reset-password`;
    
    console.log(`[Forgot Password] Redirect URL: ${redirectTo}`);

    // Enviar email de recuperação via Supabase Auth
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.toLowerCase().trim(),
      {
        redirectTo,
      }
    );

    if (error) {
      console.error("[Forgot Password] Supabase error:", error.message);
      // Não revelar detalhes do erro para o usuário
      return {
        success: true,
        message: "Se o email existir, você receberá as instruções de recuperação",
      };
    }

    console.log(`[Forgot Password] Email de recuperação enviado para: ${email}`);

    return {
      success: true,
      message: "Se o email existir, você receberá as instruções de recuperação",
    };
  } catch (error) {
    console.error("[Forgot Password] Erro:", error);
    return {
      success: false,
      message: "Erro ao processar solicitação. Tente novamente.",
    };
  }
}
