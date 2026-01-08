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
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600" />
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-white">
          <div className="mb-8">
            <Image
              src="/tetecare-logo.png"
              alt="TeteCare"
              width={120}
              height={120}
              className="rounded-full shadow-2xl ring-4 ring-white/30"
            />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-center">Junte-se ao TeteCare</h1>
          <p className="text-xl text-white/90 mb-12 text-center max-w-md">
            Crie sua conta e comece a cuidar dos seus pets de forma inteligente
          </p>
          <div className="space-y-4 w-full max-w-sm">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="p-2 bg-white/20 rounded-lg">
                  <feature.icon className="h-5 w-5" />
                </div>
                <span className="font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-xl">
          <div className="lg:hidden flex flex-col items-center mb-8">
            <Image src="/tetecare-logo.png" alt="TeteCare" width={80} height={80} className="rounded-full shadow-xl mb-4" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">TeteCare</h1>
          </div>
          <SignUp
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0 w-full",
                formButtonPrimary: "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold shadow-lg transition-all duration-300",
                formFieldInput: "h-12 text-base rounded-[14px] border-border/50 focus:border-primary/60 transition-all duration-300",
                socialButtonsBlockButton: "h-12 text-base rounded-[14px] border-border/50 hover:bg-muted/50 transition-all duration-300",
                footerActionLink: "text-primary font-semibold hover:text-primary/80 transition-colors duration-300",
                formFieldLabel: "text-foreground font-semibold text-sm mb-2",
                identityPreviewText: "text-foreground font-medium",
                formHeaderTitle: "text-foreground text-2xl font-bold",
                formHeaderSubtitle: "text-muted-foreground text-base",
                dividerLine: "bg-border/30",
                dividerText: "text-muted-foreground text-sm",
                footerActionText: "text-muted-foreground text-sm",
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
