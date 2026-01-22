import { LoginForm } from "./login-form";
import Link from "next/link";
import { Shield } from "lucide-react";

// Forçar renderização dinâmica
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Bem-vindo de volta
          </h1>
          <p className="text-muted-foreground text-sm">
            Entre com suas credenciais para acessar o sistema
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-card border border-border/50 rounded-2xl shadow-xl p-8">
          <LoginForm />

          {/* Links */}
          <div className="mt-6 space-y-3">
            <Link
              href="/forgot-password"
              className="block text-center text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Esqueceu sua senha?
            </Link>
            <div className="text-center text-sm text-muted-foreground">
              Não tem uma conta?{" "}
              <Link
                href="/register"
                className="text-primary hover:underline font-medium"
              >
                Criar conta
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          © 2026 INTELEX | Defesa Inteligente
        </p>
      </div>
    </div>
  );
}
