import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/layouts/admin-sidebar";
import { Suspense } from "react";
import { TriagemBadge } from "@/components/triagem/triagem-badge";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  const headerExtra = (
    <Suspense fallback={null}>
      <TriagemBadge defensorId={user.id} />
    </Suspense>
  );

  return (
    <AdminSidebar userName={user.name} userEmail={user.email} headerExtra={headerExtra}>
      {children}
    </AdminSidebar>
  );
}
