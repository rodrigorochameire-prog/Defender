import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LandingPage } from "@/components/landing-page";

export default async function HomePage() {
  const session = await getSession();

  // Se não estiver autenticado, mostra a landing page
  if (!session) {
    return <LandingPage />;
  }

  // Se autenticado, redireciona baseado no role
  if (session.role === "admin") {
    redirect("/admin");
  }

  redirect("/tutor");
}
