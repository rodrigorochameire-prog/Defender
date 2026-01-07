import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Se já estiver logado, redirecionar para o dashboard apropriado
  if (session) {
    if (session.role === "admin") {
      redirect("/admin");
    }
    redirect("/tutor");
  }

  return <>{children}</>;
}
