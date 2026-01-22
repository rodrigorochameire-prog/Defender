import { RegisterForm } from "./register-form";
import Link from "next/link";
import { Shield } from "lucide-react";

// Forçar renderização dinâmica
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Criar Conta
          </h1>
          <p className="text-muted-foreground text-sm">
            Preencha os dados abaixo para criar sua conta
          </p>
        </div>

        {/* Card de Registro */}
        <div className="bg-card border border-border/50 rounded-2xl shadow-xl p-8">
          <RegisterForm />

          {/* Link para Login */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link
              href="/login"
              className="text-primary hover:underline font-medium"
            >
              Fazer login
            </Link>
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
