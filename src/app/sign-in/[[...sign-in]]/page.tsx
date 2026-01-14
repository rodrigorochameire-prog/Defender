import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
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

export default async function SignInPage() {
  // Tentar verificar se já está logado usando Clerk
  try {
    const { auth, currentUser } = await import("@clerk/nextjs/server");
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
  } catch {
    // Clerk não disponível, continuar para renderizar a página
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Lado Esquerdo - Informações */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-orange-50 via-rose-50 to-orange-100">
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
            <p className="text-xs uppercase tracking-[0.2em] text-orange-600 font-bold">Cuidar com Carinho</p>
            <h1 className="text-5xl font-bold text-[hsl(220_22%_18%)] leading-tight">
              Bem-vindo ao<br />TeteCare
            </h1>
            <p className="text-lg text-[hsl(220_11%_40%)] leading-relaxed font-medium">
              A plataforma completa para gestão de creches e hotéis para pets
            </p>
          </div>
          
          {/* Features */}
          <div className="space-y-4 w-full max-w-lg">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-center gap-4 bg-white rounded-[14px] p-5 border-0 shadow-[0_1px_2px_0_rgba(0,0,0,0.03),0_1px_3px_0_rgba(0,0,0,0.05)] hover:shadow-[0_4px_8px_0_rgba(0,0,0,0.06)] transition-all duration-300 ease hover:translate-y-[-2px]"
              >
                <div className="p-3 bg-primary/10 rounded-[14px] flex items-center justify-center">
                  <feature.icon className="h-6 w-6 text-primary" strokeWidth={2} />
                </div>
                <span className="font-semibold text-base text-foreground">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Lado Direito - Formulário de Login */}
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
          
          {/* Card de Login */}
          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.15em] font-bold text-primary">Acesso Seguro</p>
              <h2 className="text-3xl font-bold text-foreground leading-tight">
                Entrar no TeteCare
              </h2>
              <p className="text-base text-[hsl(220_13%_45%)] leading-relaxed">
                Use sua conta para continuar cuidando dos seus pets
              </p>
            </div>

            {/* Clerk SignIn Component */}
            <SignIn
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-none border-0 bg-transparent p-0 w-full",
                  formButtonPrimary: "h-12 text-base font-semibold rounded-[14px] bg-primary hover:bg-primary/90 shadow-[0_2px_4px_0_rgba(24,80%,52%,0.15)] hover:shadow-[0_4px_8px_0_rgba(24,80%,52%,0.25)] transition-all duration-300",
                  formFieldInput: "h-12 text-base rounded-[14px] bg-background border border-border/40 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_0_3px_rgba(24,80%,52%,0.08)] transition-all duration-300",
                  formFieldLabel: "text-sm font-bold text-foreground mb-2.5",
                  socialButtonsBlockButton: "h-12 rounded-[14px] border border-border/40 bg-background hover:bg-muted/50 hover:border-border/60 transition-all duration-300 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]",
                  socialButtonsBlockButtonText: "text-base font-medium text-foreground",
                  dividerLine: "bg-border/30",
                  dividerText: "text-muted-foreground text-sm px-4",
                  footerActionLink: "text-primary hover:text-primary/80 font-bold transition-colors text-base",
                  footerActionText: "text-[hsl(220_13%_45%)] text-base",
                  identityPreviewText: "text-base font-semibold text-foreground",
                  identityPreviewEditButton: "text-primary hover:text-primary/80 text-sm font-semibold",
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
