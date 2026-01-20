import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { TutorSidebar } from "@/components/layouts/tutor-sidebar";
import { Clock, AlertCircle, Mail } from "lucide-react";

export default async function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect("/sign-in");
  }

  // Buscar usuário no banco de dados pelo email do Clerk
  const dbUser = await db.query.users.findFirst({
    where: eq(users.email, clerkUser.emailAddresses[0]?.emailAddress || ""),
  });

  if (!dbUser) {
    // Usuário existe no Clerk mas não no banco - redirecionar para sincronizar
    redirect("/auth-redirect");
  }

  // Verificar se o tutor está aprovado
  if (dbUser.approvalStatus === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Clock className="h-10 w-10 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Aguardando Aprovação</h1>
            <p className="text-muted-foreground mt-2">
              Seu cadastro está sendo analisado pela equipe do Tetê Care. 
              Você receberá um email quando for aprovado.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50 border text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{dbUser.email}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Em caso de dúvidas, entre em contato conosco.
          </p>
        </div>
      </div>
    );
  }

  if (dbUser.approvalStatus === "rejected") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
            <p className="text-muted-foreground mt-2">
              Infelizmente seu cadastro não foi aprovado. 
              Entre em contato conosco para mais informações.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50 border text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{dbUser.email}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TutorSidebar userName={dbUser.name} userEmail={dbUser.email}>
      {children}
    </TutorSidebar>
  );
}
