import Image from "next/image";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/tetecare-logo.png"
            alt="Tetê Care"
            width={80}
            height={80}
            className="rounded-2xl shadow-lg mb-4"
          />
          <h1 className="text-2xl font-bold text-foreground">Tetê Care</h1>
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">
              Esqueceu sua senha?
            </h2>
            <p className="text-muted-foreground mt-2">
              Digite seu email e enviaremos instruções para recuperar sua senha
            </p>
          </div>

          <ForgotPasswordForm />

          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

