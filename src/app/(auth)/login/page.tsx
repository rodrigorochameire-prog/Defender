"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OldLoginRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/sign-in");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecionando para nova página de login...</p>
      </div>
    </div>
  );
}
