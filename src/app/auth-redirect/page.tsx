"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function AuthRedirectPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [status, setStatus] = useState("Carregando...");
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push("/sign-in");
      return;
    }

    const email = user.emailAddresses[0]?.emailAddress;
    const name = user.fullName || user.firstName || email?.split("@")[0] || "Usuário";
    
    setStatus("Verificando sua conta...");

    // Verificar/criar usuário no banco de dados
    async function syncUser() {
      try {
        console.log("[AuthRedirect] Syncing user:", email);
        
        const response = await fetch("/api/auth/sync-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name }),
        });

        const data = await response.json();
        
        console.log("[AuthRedirect] Response:", JSON.stringify(data));
        setDebugInfo(data);
        
        if (data.error) {
          console.error("[AuthRedirect] Error:", data.error);
          setStatus(`Erro: ${data.error}`);
          return;
        }

        // SEMPRE usar o role do banco de dados (fonte de verdade)
        const role = data.role || "user";
        
        console.log("[AuthRedirect] User synced - Email:", email, "Role:", role);
        setStatus(`Role: ${role} - Redirecionando para /${role === "admin" ? "admin" : "tutor"}...`);

        // Delay para ver o status
        setTimeout(() => {
          if (role === "admin") {
            window.location.href = "/admin";
          } else {
            window.location.href = "/tutor";
          }
        }, 1000);
      } catch (error: any) {
        console.error("[AuthRedirect] Sync error:", error);
        setStatus(`Erro de conexão: ${error.message}`);
      }
    }

    syncUser();
  }, [user, isLoaded, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
        <p className="text-foreground font-medium">{status}</p>
        {debugInfo && (
          <div className="text-left text-xs bg-muted p-4 rounded-lg max-w-md mx-auto">
            <p><strong>Email:</strong> {debugInfo.email}</p>
            <p><strong>Role:</strong> {debugInfo.role}</p>
            <p><strong>Status:</strong> {debugInfo.approvalStatus}</p>
          </div>
        )}
      </div>
    </div>
  );
}
