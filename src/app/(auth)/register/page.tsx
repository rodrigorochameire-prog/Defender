import { RegisterForm } from "./register-form";
import Link from "next/link";
import Image from "next/image";

// Forçar renderização dinâmica
export const dynamic = "force-dynamic";

export default function RegisterPage() {
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
