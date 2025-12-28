"use client";

import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { logoutAction } from "@/app/(dashboard)/actions";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole: "admin" | "user";
  userName: string;
}

export function DashboardLayout({
  children,
  userRole,
  userName,
}: DashboardLayoutProps) {
  const router = useRouter();

  async function handleLogout() {
    await logoutAction();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <Sidebar
        userRole={userRole}
        userName={userName}
        onLogout={handleLogout}
      />

      {/* Mobile navigation */}
      <MobileNav
        userRole={userRole}
        userName={userName}
        onLogout={handleLogout}
      />

      {/* Main content */}
      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
