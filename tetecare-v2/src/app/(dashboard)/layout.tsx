import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardLayout
      userRole={session.role as "admin" | "user"}
      userName={session.name}
    >
      {children}
    </DashboardLayout>
  );
}
