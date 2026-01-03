import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // O layout apenas verifica autenticação
  // Cada sub-layout (admin/tutor) adiciona sua própria sidebar
  return <>{children}</>;
}
