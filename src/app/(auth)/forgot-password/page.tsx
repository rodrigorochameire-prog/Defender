import Image from "next/image";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";
import { ChevronLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 via-white to-orange-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Subtle background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-orange-200/20 dark:bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-rose-200/15 dark:bg-rose-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card container */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/5 shadow-xl shadow-black/5 dark:shadow-black/20 p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-rose-400/20 blur-xl rounded-full scale-150" />
              <Image
                src="/tetecare-logo.png"
                alt="Tetê Care"
                width={64}
                height={64}
                className="relative rounded-xl shadow-md ring-1 ring-black/5"
              />
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-rose-500 bg-clip-text text-transparent">
              Tetê Care
            </h1>
          </div>

          <div className="space-y-6">
            {/* Icon header */}
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-orange-100/50 dark:bg-orange-900/20">
                <Mail className="h-8 w-8 text-orange-500" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Esqueceu sua senha?
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Sem problemas! Digite seu email e enviaremos instruções para recuperar sua senha.
              </p>
            </div>

            <ForgotPasswordForm />

            <div className="pt-2">
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar para o login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
