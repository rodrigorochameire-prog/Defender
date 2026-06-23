"use client";

import { useParams } from "next/navigation";
import { TimelineVivaAssistido } from "@/components/processos/TimelineViva";

export default function AssistidoTimelinePage() {
  const params = useParams();
  const assistidoId = Number(params?.id);

  if (!assistidoId) {
    return <p className="p-4 italic text-neutral-400">Assistido inválido.</p>;
  }

  return <TimelineVivaAssistido assistidoId={assistidoId} />;
}
