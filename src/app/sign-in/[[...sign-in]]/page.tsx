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
    <div className="min-h-screen flex bg-[hsl(210_20%_98%)]">
      {/* Lado Esquerdo - Informações (Design Refinado) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradiente suave coral/pêssego - mais leve */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-orange-300 to-rose-400" />
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_30%_30%,white,transparent_40%)]" />
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-20 py-16 text-white">
          {/* Logo com sombra suave */}
          <div className="mb-10">
            <Image
              src="/tetecare-logo.png"
              alt="TeteCare"
              width={110}
              height={110}
              className="rounded-full shadow-[0_8px_24px_0_rgba(0,0,0,0.15)] border-4 border-white/30"
            />
          </div>
          
          {/* Título e Subtítulo - Hierarquia clara */}
          <div className="space-y-4 mb-14 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-white/80 font-semibold">Cuidar com Carinho</p>
            <h1 className="text-4xl font-bold tracking-tight leading-tight">
              Bem-vindo ao TeteCare
            </h1>
            <p className="text-base text-white/90 max-w-md leading-relaxed font-medium">
              A plataforma completa para gestão de creches e hotéis para pets
            </p>
          </div>
          
          {/* Features - Cards suaves */}
          <div className="space-y-3.5 w-full max-w-lg">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-center gap-4 bg-white/15 backdrop-blur-sm rounded-[14px] p-4 border border-white/20 transition-all duration-300 ease hover:bg-white/20 hover:border-white/30 shadow-[0_2px_8px_0_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.15)] hover:translate-y-[-2px]"
              >
                <div className="p-2.5 bg-white/25 rounded-[14px] flex items-center justify-center">
                  <feature.icon className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-base">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Lado Direito - Formulário de Login (Design Refinado) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-[520px]">
          {/* Header Mobile - Mais equilibrado */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <Image 
              src="/tetecare-logo.png" 
              alt="TeteCare" 
              width={72} 
              height={72} 
              className="rounded-full shadow-[0_4px_12px_0_rgba(0,0,0,0.1)] mb-4" 
            />
            <h1 className="text-2xl font-bold text-foreground">
              TeteCare
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Gestão de Creche para Pets</p>
          </div>
          
          {/* Card de Login - Mais espaçoso */}
          <div className="rounded-[14px] border-0 bg-card shadow-[0_2px_4px_0_rgba(0,0,0,0.03),0_4px_8px_0_rgba(0,0,0,0.05),0_8px_16px_0_rgba(0,0,0,0.04)] p-10 md:p-12 space-y-6">
            {/* Header do Card - Melhor contraste */}
            <div className="space-y-3 text-center">
              <p className="text-xs uppercase tracking-wider font-bold text-orange-600">Acesso Seguro</p>
              <h2 className="text-3xl font-bold text-foreground">Entrar no TeteCare</h2>
              <p className="text-base text-[hsl(220_11%_45%)] leading-relaxed">
                Use sua conta para continuar cuidando dos seus pets
              </p>
            </div>

            {/* Clerk SignIn Component - Estilos refinados */}
            <SignIn
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-none border-0 bg-transparent p-0",
                  formButtonPrimary: "h-11 text-base font-semibold rounded-[14px] bg-primary hover:bg-primary/90 shadow-[0_2px_4px_0_rgba(24,80%,52%,0.2)] hover:shadow-[0_4px_8px_0_rgba(24,80%,52%,0.3)] transition-all duration-300",
                  formFieldInput: "h-11 rounded-[14px] bg-background border border-border/40 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_0_3px_rgba(24,80%,52%,0.1)] transition-all duration-300",
                  formFieldLabel: "text-sm font-semibold text-foreground mb-2",
                  socialButtonsBlockButton: "h-11 rounded-[14px] border border-border/40 bg-background hover:bg-muted/50 hover:border-border/60 transition-all duration-300 shadow-[0_1px_2px_0_rgba(0,0,0,0.03)]",
                  socialButtonsBlockButtonText: "text-sm font-medium text-foreground",
                  dividerLine: "bg-border/40",
                  dividerText: "text-muted-foreground text-xs",
                  footerActionLink: "text-primary hover:text-primary/80 font-semibold transition-colors",
                  footerActionText: "text-muted-foreground text-sm",
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
    </div>
  );
}
