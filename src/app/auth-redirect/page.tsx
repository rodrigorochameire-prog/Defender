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
  } catch {
    // Clerk não disponível
    redirect("/sign-in");
  }

  if (!clerkUser) {
    redirect("/sign-in");
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  const name = clerkUser.firstName && clerkUser.lastName 
    ? `${clerkUser.firstName} ${clerkUser.lastName}` 
    : clerkUser.firstName || email?.split("@")[0] || "Usuário";
  
  if (!email) {
    redirect("/sign-in");
  }

  // Verificar/sincronizar usuário no banco de dados
  let dbUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

  if (!dbUser) {
    // Criar novo usuário no banco
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        role: isAdmin ? "admin" : "defensor",
        emailVerified: true,
      })
      .returning();
    dbUser = newUser;
    console.log("[AuthRedirect] Novo usuário criado:", email, "Role:", dbUser.role);
  } else if (isAdmin && dbUser.role !== "admin") {
    // Corrigir role de admin se necessário
    const [updated] = await db
      .update(users)
      .set({ role: "admin", updatedAt: new Date() })
      .where(eq(users.email, email))
      .returning();
    dbUser = updated;
    console.log("[AuthRedirect] Admin corrigido:", email);
  }

  console.log("[AuthRedirect] Email:", email, "Role:", dbUser.role);

  // Redirecionar baseado no role DO BANCO DE DADOS
  redirect("/admin");
}

