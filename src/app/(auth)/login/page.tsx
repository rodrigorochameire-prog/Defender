import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { Dog, ShieldCheck, Calendar, Heart } from "lucide-react";

export default function LoginPage() {
  const features = [
    { icon: Dog, text: "Gestão completa de pets" },
    { icon: ShieldCheck, text: "Controle de vacinas e saúde" },
    { icon: Calendar, text: "Calendário inteligente" },
    { icon: Heart, text: "Cuidado personalizado" },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-blue-500/5">
        {/* Subtle decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12">
          {/* Logo */}
          <div className="mb-6 relative">
            <Image
              src="/tetecare-logo.png"
              alt="Tetê Care"
              width={88}
              height={88}
              className="relative rounded-2xl shadow-lg ring-1 ring-border/50"
            />
          </div>
          
          <h1 className="text-2xl font-semibold text-foreground mb-2 text-center">
            Tetê Care
          </h1>
          <p className="text-muted-foreground text-sm text-center mb-10 max-w-xs leading-relaxed">
            A plataforma completa para gestão de creches e daycare para pets
          </p>

          {/* Features */}
          <div className="grid grid-cols-2 gap-2.5 w-full max-w-sm">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-2.5 bg-card/60 backdrop-blur-sm rounded-xl p-3.5 border border-border/50 hover:border-border transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-foreground/80 text-xs font-medium">
                  {feature.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <Image
              src="/tetecare-logo.png"
              alt="Tetê Care"
              width={64}
              height={64}
              className="rounded-xl shadow-md ring-1 ring-border/50 mb-3"
            />
            <h1 className="text-lg font-semibold text-foreground">
              Tetê Care
            </h1>
          </div>

          <div className="space-y-6">
            <div className="text-center lg:text-left space-y-1">
              <h2 className="text-xl font-semibold text-foreground">
                Bem-vindo de volta
              </h2>
              <p className="text-muted-foreground text-sm">
                Entre com sua conta para continuar
              </p>
            </div>

            <LoginForm />

            <div className="space-y-4 pt-2">
              <div className="text-center">
                <Link
                  href="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Esqueci minha senha
                </Link>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-3 text-muted-foreground/60">ou</span>
                </div>
              </div>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Não tem uma conta? </span>
                <Link
                  href="/register"
                  className="text-primary font-medium hover:underline underline-offset-4"
                >
                  Cadastre-se
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
