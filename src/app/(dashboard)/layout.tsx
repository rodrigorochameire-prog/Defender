import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  // O layout apenas verifica autenticação
  // Cada sub-layout adiciona sua própria sidebar
  return <>{children}</>;
}
