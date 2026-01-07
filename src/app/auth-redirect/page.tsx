"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function AuthRedirectPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push("/sign-in");
      return;
    }

    // Verificar o role no publicMetadata
    const role = (user.publicMetadata as { role?: string })?.role || "tutor";
    
    console.log("[AuthRedirect] User:", user.emailAddresses[0]?.emailAddress, "Role:", role);

    if (role === "admin") {
      router.push("/admin");
    } else {
      router.push("/tutor");
    }
  }, [user, isLoaded, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  );
}

