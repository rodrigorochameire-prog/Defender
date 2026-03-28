import { Badge } from "@/components/ui/badge";
import { Handshake } from "lucide-react";

interface InstitutoBadgeProps {
  enrichmentData: {
    instituto_possivel?: string | null;
    motivo_instituto?: string | null;
  } | null;
}

export function InstitutoBadge({ enrichmentData }: InstitutoBadgeProps) {
  if (!enrichmentData?.instituto_possivel) return null;

  const labels: Record<string, string> = {
    ANPP: "ANPP possível",
    SURSIS_PROCESSUAL: "Sursis possível",
    TRANSACAO_PENAL: "Transação possível",
  };

  const label = labels[enrichmentData.instituto_possivel] ?? enrichmentData.instituto_possivel;

  return (
    <Badge
      variant="outline"
      className="border-emerald-600 text-emerald-400 text-[10px] gap-1"
      title={enrichmentData.motivo_instituto ?? undefined}
    >
      <Handshake className="h-3 w-3" />
      {label}
    </Badge>
  );
}
