import { redirect } from "next/navigation";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

// Lista de emails que são admin
const ADMIN_EMAILS = ["rodrigorochameire@gmail.com"];

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default async function AuthRedirectPage() {
  // Importar Clerk dinamicamente
  let clerkUser = null;
  try {
    const { currentUser } = await import("@clerk/nextjs/server");
    clerkUser = await currentUser();
  } catch (error) {
    // Clerk não disponível
    console.error("[AuthRedirect] Erro ao obter usuário Clerk:", error);
    redirect("/sign-in");
  }

  if (!clerkUser) {
    console.log("[AuthRedirect] Usuário Clerk não encontrado, redirecionando para sign-in");
    redirect("/sign-in");
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  const name = clerkUser.firstName && clerkUser.lastName 
    ? `${clerkUser.firstName} ${clerkUser.lastName}` 
    : clerkUser.firstName || email?.split("@")[0] || "Usuário";
  
  if (!email) {
    console.log("[AuthRedirect] Email não encontrado no usuário Clerk");
    redirect("/sign-in");
  }

  // Verificar/sincronizar usuário no banco de dados
  let dbUser;
  try {
    dbUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
  } catch (error) {
    console.error("[AuthRedirect] Erro ao buscar usuário no banco:", error);
    // Se falhar a conexão com o banco, redirecionar para tutor como fallback
    redirect("/tutor");
  }

  const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

  if (!dbUser) {
    // Criar novo usuário no banco
    try {
      const [newUser] = await db
        .insert(users)
        .values({
          name,
          email,
          role: isAdmin ? "admin" : "user",
          emailVerified: true,
        })
        .returning();
      dbUser = newUser;
      console.log("[AuthRedirect] Novo usuário criado:", email, "Role:", dbUser.role);
    } catch (error) {
      console.error("[AuthRedirect] Erro ao criar usuário:", error);
      // Se o email foi checado e é admin, redireciona para admin
      if (isAdmin) {
        redirect("/admin");
      }
      redirect("/tutor");
    }
  } else if (isAdmin && dbUser.role !== "admin") {
    // Corrigir role de admin se necessário
    try {
      const [updated] = await db
        .update(users)
        .set({ role: "admin", updatedAt: new Date() })
        .where(eq(users.email, email))
        .returning();
      dbUser = updated;
      console.log("[AuthRedirect] Admin corrigido:", email);
    } catch (error) {
      console.error("[AuthRedirect] Erro ao atualizar role:", error);
    }
  }

  console.log("[AuthRedirect] Email:", email, "Role:", dbUser?.role);

  // Redirecionar baseado no role DO BANCO DE DADOS
  if (dbUser?.role === "admin" || isAdmin) {
    redirect("/admin");
  } else {
    redirect("/tutor");
  }
}

