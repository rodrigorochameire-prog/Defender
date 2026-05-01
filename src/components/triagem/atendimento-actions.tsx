"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AtendimentoActions({ atendimentoId }: { atendimentoId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function call(path: string, body: object) {
    setLoading(true);
    try {
      const res = await fetch(path, {
        method: path.includes("promover") ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Falhou");
      toast.success("OK");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading}>Ações</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() =>
          // defensorId is resolved server-side from the cookie session in the promover route
          call(`/api/triagem/atendimento/${atendimentoId}/promover`, {})
        }>
          Promover a demanda
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => call(`/api/triagem/atendimento/${atendimentoId}`, { acao: "resolver" })}>
          Resolver na triagem
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          const motivo = window.prompt("Motivo da devolução à Dil:");
          if (motivo) call(`/api/triagem/atendimento/${atendimentoId}`, { acao: "devolver", motivo });
        }}>
          Devolver à Dil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => call(`/api/triagem/atendimento/${atendimentoId}`, { acao: "arquivar" })}>
          Arquivar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
