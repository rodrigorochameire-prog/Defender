import { RegisterForm } from "./register-form";
import Link from "next/link";
import { Shield } from "lucide-react";

// Forçar renderização dinâmica
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex bg-zinc-950">
      {/* Lado esquerdo - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 items-center justify-center p-12">
        {/* Pattern sutil de fundo */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} />
        </div>
        
        {/* Glow effect */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-md text-center">
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-teal-500/20">
              <Shield className="w-12 h-12 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            OMBUDS
          </h1>
          <p className="text-xs font-light tracking-[0.25em] uppercase text-zinc-500 mb-8">
            Gestão para Defesa Criminal
          </p>
          
          <p className="text-zinc-400 text-lg leading-relaxed">
            Crie sua conta para ter acesso completo ao sistema de gestão da Defensoria.
          </p>
          
          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-3 text-left">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
                <span className="text-teal-400 text-sm font-bold">1</span>
              </div>
              <span className="text-zinc-400 text-sm">Crie sua conta com email</span>
            </div>
            <div className="flex items-center gap-3 text-left">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
                <span className="text-teal-400 text-sm font-bold">2</span>
              </div>
              <span className="text-zinc-400 text-sm">Aguarde aprovação do administrador</span>
            </div>
            <div className="flex items-center gap-3 text-left">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
                <span className="text-teal-400 text-sm font-bold">3</span>
              </div>
              <span className="text-zinc-400 text-sm">Acesse o sistema completo</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Lado direito - Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-zinc-950">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-10">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">OMBUDS</h1>
            <p className="text-[10px] font-light tracking-[0.2em] uppercase text-zinc-500 mt-1">
              Gestão para Defesa Criminal
            </p>
          </div>
          
          {/* Título */}
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Criar Conta
            </h2>
            <p className="text-zinc-500 text-sm">
              Preencha os dados abaixo para solicitar acesso
            </p>
          </div>

          {/* Card de Registro */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
            <RegisterForm />

            {/* Link para Login */}
            <div className="mt-6 text-center text-sm text-zinc-500">
              Já tem uma conta?{" "}
              <Link
                href="/login"
                className="text-teal-400 hover:text-teal-300 font-medium transition-colors"
              >
                Fazer login
              </Link>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-zinc-600 mt-8">
            © 2026 OMBUDS | Gestão para Defesa Criminal
          </p>
        </div>
      </div>
    </div>
  );
}
