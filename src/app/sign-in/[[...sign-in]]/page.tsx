import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Dog, Heart, Shield, Calendar } from "lucide-react";
import Image from "next/image";

const features = [
  { icon: Dog, text: "Gestão completa de pets" },
  { icon: Shield, text: "Controle de vacinas e saúde" },
  { icon: Calendar, text: "Calendário inteligente" },
  { icon: Heart, text: "Cuidado personalizado" },
];

export default async function SignInPage() {
  const { userId } = await auth();
  
  // Se já está logado, redirecionar
  if (userId) {
    const user = await currentUser();
    const role = (user?.publicMetadata as { role?: string })?.role || "tutor";
    
    if (role === "admin") {
      redirect("/admin");
    }
    redirect("/tutor");
  }

  return (
    <div className="min-h-screen flex">
      {/* Lado Esquerdo - Informações */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-red-500 to-rose-600" />
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
            <h1 className="text-3xl font-bold tracking-tight">Bem-vindo ao TeteCare</h1>
            <p className="text-lg text-white/90 max-w-md leading-relaxed">
              A plataforma completa para gestão de creches e hotéis para pets
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
      
      {/* Lado Direito - Formulário de Login */}
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
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              TeteCare
            </h1>
          </div>
          
          {/* Clerk SignIn Component */}
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0 w-full",
                formButtonPrimary: "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl transition-all",
                formFieldInput: "focus:ring-2 focus:ring-orange-500/20 transition-all",
                footerActionLink: "text-orange-500 hover:text-orange-600 transition-colors",
              },
            }}
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            forceRedirectUrl="/auth-redirect"
          />
        </div>
      </div>
    </div>
  );
}
