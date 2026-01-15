"use client";

import { SignUp } from "@clerk/nextjs";
import { Dog, Heart, Shield, Calendar } from "lucide-react";
import Image from "next/image";

// Forçar renderização dinâmica para evitar problemas de build
export const dynamic = "force-dynamic";

const features = [
  { icon: Dog, text: "Gestão completa de pets" },
  { icon: Shield, text: "Controle de vacinas e saúde" },
  { icon: Calendar, text: "Calendário inteligente" },
  { icon: Heart, text: "Cuidado personalizado" },
];

export default function SignUpPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Lado Esquerdo - Informações */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50">
        {/* Padrão de textura sutil */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_50%_50%,hsl(220_13%_18%),transparent_50%)]" />
        
        <div className="relative z-10 flex flex-col justify-center items-start w-full px-16 xl:px-20 py-20">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-24 h-24 rounded-full bg-white shadow-[0_4px_12px_0_rgba(0,0,0,0.08)] flex items-center justify-center">
            <Image
              src="/tetecare-logo.png"
              alt="TeteCare"
                width={96}
                height={96}
                className="rounded-full"
            />
            </div>
          </div>
          
          {/* Título e Subtítulo */}
          <div className="space-y-4 mb-12 max-w-lg">
            <p className="text-xs uppercase tracking-[0.2em] text-blue-600 font-bold">Nova Conta</p>
            <h1 className="text-5xl font-bold text-[hsl(220_22%_18%)] leading-tight">
              Junte-se ao<br />TeteCare
            </h1>
            <p className="text-lg text-[hsl(220_11%_40%)] leading-relaxed font-medium">
            Crie sua conta e comece a cuidar dos seus pets de forma inteligente
          </p>
          </div>
          
          {/* Features */}
          <div className="space-y-4 w-full max-w-lg">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-center gap-4 bg-white rounded-[14px] p-5 border-0 shadow-[0_1px_2px_0_rgba(0,0,0,0.03),0_1px_3px_0_rgba(0,0,0,0.05)] hover:shadow-[0_4px_8px_0_rgba(0,0,0,0.06)] transition-all duration-300 ease hover:translate-y-[-2px]"
              >
                <div className="p-3 bg-blue-600/10 rounded-[14px] flex items-center justify-center">
                  <feature.icon className="h-6 w-6 text-blue-600" strokeWidth={2} />
                </div>
                <span className="font-semibold text-base text-foreground">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Lado Direito - Formulário de Registro */}
      <div className="flex items-center justify-center p-6 md:p-8 lg:p-12 bg-background">
        <div className="w-full max-w-[480px]">
          {/* Header Mobile */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="w-20 h-20 rounded-full bg-white shadow-[0_4px_12px_0_rgba(0,0,0,0.08)] flex items-center justify-center mb-4">
              <Image 
                src="/tetecare-logo.png" 
                alt="TeteCare" 
                width={80} 
                height={80} 
                className="rounded-full" 
              />
            </div>
            <h1 className="text-2xl font-bold text-foreground">TeteCare</h1>
            <p className="text-sm text-muted-foreground mt-1">Gestão de Creche para Pets</p>
          </div>
          
          {/* Card de Registro */}
          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.15em] font-bold text-blue-600">Nova Conta</p>
              <h2 className="text-3xl font-bold text-foreground leading-tight">
                Criar Conta
              </h2>
              <p className="text-base text-[hsl(220_13%_45%)] leading-relaxed">
                Preencha seus dados para começar a usar o TeteCare
              </p>
            </div>

            {/* Clerk SignUp Component */}
          <SignUp
            appearance={{
              elements: {
                rootBox: "w-full",
                  card: "shadow-none border-0 bg-transparent p-0 w-full",
                  formButtonPrimary: "h-12 text-base font-semibold rounded-[14px] bg-blue-600 hover:bg-blue-700 shadow-[0_2px_4px_0_rgba(37,99,235,0.15)] hover:shadow-[0_4px_8px_0_rgba(37,99,235,0.25)] transition-all duration-300",
                  formFieldInput: "h-12 text-base rounded-[14px] bg-background border border-border/40 text-foreground placeholder:text-muted-foreground focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)] transition-all duration-300",
                  formFieldLabel: "text-sm font-bold text-foreground mb-2.5",
                  socialButtonsBlockButton: "h-12 rounded-[14px] border border-border/40 bg-background hover:bg-muted/50 hover:border-border/60 transition-all duration-300 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]",
                  socialButtonsBlockButtonText: "text-base font-medium text-foreground",
                  dividerLine: "bg-border/30",
                  dividerText: "text-muted-foreground text-sm px-4",
                  footerActionLink: "text-blue-600 hover:text-blue-700 font-bold transition-colors text-base",
                  footerActionText: "text-[hsl(220_13%_45%)] text-base",
                  identityPreviewText: "text-base font-semibold text-foreground",
                  identityPreviewEditButton: "text-blue-600 hover:text-blue-700 text-sm font-semibold",
              },
            }}
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/auth-redirect"
          />
          </div>
        </div>
      </div>
    </div>
  );
}
