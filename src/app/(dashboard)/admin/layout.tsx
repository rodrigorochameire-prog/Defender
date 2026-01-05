import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { AdminSidebar } from "@/components/layouts/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const role = (user?.publicMetadata as { role?: string })?.role || "tutor";

  // Verificar se é admin
  if (role !== "admin") {
    redirect("/tutor");
  }

  const userName = user?.firstName || user?.emailAddresses[0]?.emailAddress?.split("@")[0] || "Admin";
  const userEmail = user?.emailAddresses[0]?.emailAddress || "";

  return (
    <AdminSidebar userName={userName} userEmail={userEmail}>
      {children}
    </AdminSidebar>
  );
}
