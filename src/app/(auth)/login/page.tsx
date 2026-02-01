import { LoginForm } from "./login-form";
import Link from "next/link";
import { AuthLogo } from "@/components/shared/logo";
import { Shield } from "lucide-react";

// Forçar renderização dinâmica
export const dynamic = "force-dynamic";

export default function LoginPage() {
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
            Sistema completo para gestão de processos, assistidos e demandas da Defensoria Pública.
          </p>
          
          <div className="mt-12 grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-400">100%</div>
              <div className="text-xs text-zinc-500 mt-1">Seguro</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-400">24/7</div>
              <div className="text-xs text-zinc-500 mt-1">Disponível</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-400">IA</div>
              <div className="text-xs text-zinc-500 mt-1">Integrada</div>
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
              Bem-vindo de volta
            </h2>
            <p className="text-zinc-500 text-sm">
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>

          {/* Card de Login */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
            <LoginForm />

            {/* Links */}
            <div className="mt-6 space-y-3">
              <Link
                href="/forgot-password"
                className="block text-center text-sm text-zinc-500 hover:text-teal-400 transition-colors"
              >
                Esqueceu sua senha?
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
