"use client";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import { montarMensagemRevisao } from "./revisao-message";

export function CopiarRevisaoButton({
  consideracoes,
  destinatarioNome,
}: {
  consideracoes: string;
  destinatarioNome: string;
}) {
  async function handleCopiar() {
    const hora = new Date().getHours();
    const msg = montarMensagemRevisao(destinatarioNome, consideracoes, hora);
    await copyToClipboard(msg, "Orientação copiada para o WhatsApp");
  }
  return (
    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleCopiar}>
      <Send className="h-3.5 w-3.5" />
      Copiar para WhatsApp
    </Button>
  );
}
