import { LoginForm } from "./login-form";
import Link from "next/link";
import Image from "next/image";

// Forçar renderização dinâmica
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Image
              src="/logo-intelex-full.svg"
              alt="INTELEX - Defesa Inteligente"
              width={300}
              height={100}
              priority
              className="object-contain"
            />
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
          © 2026 OMBUDS | Gestão para Defesa Criminal
        </p>
      </div>
    </div>
  );
}
