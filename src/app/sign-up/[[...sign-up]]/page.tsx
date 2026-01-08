"use client";

import { SignUp } from "@clerk/nextjs";
import { Dog, Heart, Shield, Calendar } from "lucide-react";
import Image from "next/image";

const features = [
  { icon: Dog, text: "Gestão completa de pets" },
  { icon: Shield, text: "Controle de vacinas e saúde" },
  { icon: Calendar, text: "Calendário inteligente" },
  { icon: Heart, text: "Cuidado personalizado" },
];

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex">
      {/* Lado Esquerdo - Informações */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600" />
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-16 py-12 text-white">
          {/* Logo */}
          <div className="mb-10">
            <Image
              src="/tetecare-logo.png"
              alt="TeteCare"
              width={120}
              height={120}
              className="rounded-full shadow-2xl border-4 border-white/20"
            />
          </div>
          
          {/* Título e Subtítulo */}
          <div className="space-y-3 mb-12 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Junte-se ao TeteCare</h1>
            <p className="text-lg text-white/90 max-w-md leading-relaxed">
              Crie sua conta e comece a cuidar dos seus pets de forma inteligente
            </p>
          </div>
          
          {/* Features */}
          <div className="space-y-3 w-full max-w-md">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 transition-all hover:bg-white/15 hover:border-white/30"
              >
                <div className="p-2.5 bg-white/20 rounded-lg">
                  <feature.icon className="h-5 w-5" />
                </div>
                <span className="font-medium text-base">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Lado Direito - Formulário de Registro */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Header Mobile */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <Image 
              src="/tetecare-logo.png" 
              alt="TeteCare" 
              width={80} 
              height={80} 
              className="rounded-full shadow-xl mb-4" 
            />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
              TeteCare
            </h1>
          </div>
          
          {/* Clerk SignUp Component */}
          <SignUp
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0 w-full",
                formButtonPrimary: "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-lg hover:shadow-xl transition-all",
                formFieldInput: "focus:ring-2 focus:ring-cyan-500/20 transition-all",
                footerActionLink: "text-cyan-500 hover:text-cyan-600 transition-colors",
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
  );
}
