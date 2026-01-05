"use client";

import { SignIn } from "@clerk/nextjs";
import { Dog, Heart, Shield, Calendar } from "lucide-react";
import Image from "next/image";

const features = [
  { icon: Dog, text: "Gestão completa de pets" },
  { icon: Shield, text: "Controle de vacinas e saúde" },
  { icon: Calendar, text: "Calendário inteligente" },
  { icon: Heart, text: "Cuidado personalizado" },
];

export default function SignInPage() {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-red-500 to-rose-600" />
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
          <h1 className="text-4xl font-bold mb-4 text-center">Bem-vindo ao TeteCare</h1>
          <p className="text-xl text-white/90 mb-12 text-center max-w-md">
            A plataforma completa para gestão de creches e hotéis para pets
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
        <div className="w-full max-w-md">
          <div className="lg:hidden flex flex-col items-center mb-8">
            <Image src="/tetecare-logo.png" alt="TeteCare" width={80} height={80} className="rounded-full shadow-xl mb-4" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">TeteCare</h1>
          </div>
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0 w-full",
                formButtonPrimary: "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg",
              },
            }}
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/auth-redirect"
          />
        </div>
      </div>
    </div>
  );
}
