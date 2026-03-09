"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Workspaces foram removidos do sistema.
 * O controle de acesso agora usa defensorId.
 * Esta página redireciona para equipe.
 */
export default function AdminWorkspacesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/equipe");
  }, [router]);

  return null;
}
