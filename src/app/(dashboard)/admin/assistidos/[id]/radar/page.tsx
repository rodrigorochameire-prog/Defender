"use client";

import { useParams } from "next/navigation";
import { RadarAssistidoCard } from "@/components/radar/radar-assistido-card";

export default function AssistidoRadarPage() {
  const params = useParams();
  const assistidoId = Number(params?.id);

  if (!assistidoId) {
    return <p className="p-4 italic text-neutral-400">Assistido inválido.</p>;
  }

  return (
    <div className="p-1">
      <RadarAssistidoCard assistidoId={assistidoId} />
    </div>
  );
}
