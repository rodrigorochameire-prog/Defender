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
    <div className="min-h-screen flex bg-gradient-to-br from-background via-background to-muted/30">
      {/* Lado Esquerdo - Informações */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-red-500 to-rose-600" />
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_30%),radial-gradient(circle_at_80%_10%,white,transparent_25%),radial-gradient(circle_at_50%_80%,white,transparent_28%)]" />
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-16 py-14 text-white">
          {/* Logo */}
          <div className="mb-12">
            <Image
              src="/tetecare-logo.png"
              alt="TeteCare"
              width={124}
              height={124}
              className="rounded-full shadow-2xl border-4 border-white/25"
            />
          </div>
          
          {/* Título e Subtítulo */}
          <div className="space-y-3 mb-12 text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-white/70">Cuidar com carinho</p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Bem-vindo ao TeteCare</h1>
            <p className="text-lg text-white/90 max-w-xl leading-relaxed">
              A plataforma completa para gestão de creches e hotéis para pets
            </p>
          </div>
          
          {/* Features */}
          <div className="space-y-3 w-full max-w-xl">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-center gap-4 bg-white/12 backdrop-blur-md rounded-2xl p-4 border border-white/25 transition-all hover:bg-white/18 hover:border-white/35 shadow-lg shadow-black/10"
              >
                <div className="p-3 bg-white/20 rounded-xl">
                  <feature.icon className="h-6 w-6" />
                </div>
                <span className="font-medium text-base">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Lado Direito - Formulário de Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          {/* Header Mobile */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <Image 
              src="/tetecare-logo.png" 
              alt="TeteCare" 
              width={82} 
              height={82} 
              className="rounded-full shadow-xl mb-4" 
            />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              TeteCare
            </h1>
          </div>
          
          <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm shadow-xl shadow-orange-500/10 p-6 md:p-8 space-y-6">
            <div className="space-y-2 text-center">
              <p className="text-sm font-medium text-orange-600/90">Acesso seguro</p>
              <h2 className="text-2xl font-semibold text-foreground">Entrar no TeteCare</h2>
              <p className="text-sm text-muted-foreground">
                Use sua conta para continuar cuidando dos seus pets
              </p>
            </div>

            {/* Clerk SignIn Component */}
            <SignIn
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-none border-0 bg-transparent p-0",
                  formButtonPrimary: "h-11 text-base font-semibold rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl transition-all",
                  formFieldInput: "h-11 rounded-xl bg-muted/40 border-border/60 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all",
                  socialButtonsBlockButton: "h-11 rounded-xl border border-border/60 bg-background hover:bg-muted/70 transition-all",
                  socialButtonsBlockButtonText: "text-sm font-medium",
                  dividerLine: "bg-border/60",
                  footerActionLink: "text-orange-600 hover:text-orange-700 transition-colors",
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
