import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // O layout apenas verifica autenticação
  // Cada sub-layout (admin/tutor) adiciona sua própria sidebar
  return <>{children}</>;
}
