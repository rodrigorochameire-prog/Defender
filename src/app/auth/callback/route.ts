import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const type = searchParams.get("type");

  // Se tiver um código, trocar por sessão
  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Se for recovery (reset password), redirecionar para a página de reset
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Se tiver token no hash (recovery via email magic link)
  const hash = request.nextUrl.hash;
  if (hash && hash.includes("access_token")) {
    // Redirecionar para reset-password mantendo o hash
    return NextResponse.redirect(`${origin}/reset-password${hash}`);
  }

  // Retornar erro
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
