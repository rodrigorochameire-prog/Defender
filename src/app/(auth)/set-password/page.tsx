import { SetPasswordForm } from "./set-password-form";
import Image from "next/image";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SetPasswordPage() {
  const session = await getSession();

  // Se não estiver logado, redirecionar para login
  if (!session) {
    redirect("/login");
  }

  // Se não precisa trocar senha, redirecionar para dashboard
  if (!session.mustChangePassword) {
    redirect("/admin/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f11] relative overflow-hidden py-10">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-emerald-500/[0.02] rounded-full blur-[100px] pointer-events-none" />

      {/* Conteudo centralizado */}
      <div className="relative z-10 w-full max-w-sm mx-auto px-6">
        {/* Logo + Identidade */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo-dark.png"
              alt="OMBUDS"
              width={52}
              height={52}
              priority
              className="object-contain drop-shadow-[0_0_12px_rgba(16,185,129,0.2)]"
            />
          </div>
          <h1 className="font-serif text-xl font-semibold text-foreground tracking-tight">
            OMBUDS
          </h1>
          <p className="text-[10px] font-light tracking-[0.2em] uppercase text-neutral-500 mt-1">
            Gestao para Defesa Criminal
          </p>
        </div>

        {/* Separador sutil */}
        <div className="w-8 h-px bg-border mx-auto mb-6" />

        {/* Mensagem de boas-vindas */}
        <div className="text-center mb-6">
          <p className="text-sm text-foreground/80">
            Bem-vindo ao OMBUDS!
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Defina sua senha para continuar.
          </p>
        </div>

        {/* Formulario */}
        <SetPasswordForm />

        {/* Footer institucional */}
        <div className="mt-10 pt-5 border-t border-border/50">
          <p className="text-center text-[10px] text-neutral-700 tracking-wide">
            Defensoria Publica do Estado da Bahia
          </p>
        </div>
      </div>
    </div>
  );
}
