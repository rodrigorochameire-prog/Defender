import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { AdminSidebar } from "@/components/layouts/admin-sidebar";

export default async function AdminLayout({
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

  // Verificar se é admin
  if (dbUser.role !== "admin") {
    redirect("/tutor");
  }

  return (
    <AdminSidebar userName={dbUser.name} userEmail={dbUser.email}>
      {children}
    </AdminSidebar>
  );
}
