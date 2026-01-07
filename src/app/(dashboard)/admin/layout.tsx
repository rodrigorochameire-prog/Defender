import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/layouts/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Verificar se é admin
  if (!session || session.role !== "admin") {
    redirect("/tutor");
  }

  return (
    <AdminSidebar userName={session.name} userEmail={session.email}>
      {children}
    </AdminSidebar>
  );
}
