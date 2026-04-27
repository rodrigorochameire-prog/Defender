import type { AtendimentoTriagem } from "@/lib/db/schema";
import { AtendimentoActions } from "./atendimento-actions";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pendente_avaliacao: { label: "Aguardando", className: "bg-amber-100 text-amber-900" },
  promovido: { label: "Promovido", className: "bg-blue-100 text-blue-900" },
  resolvido: { label: "Resolvido", className: "bg-green-100 text-green-900" },
  devolvido: { label: "Devolvido", className: "bg-orange-100 text-orange-900" },
  arquivado: { label: "Arquivado", className: "bg-zinc-200 text-zinc-700" },
};

const AREA_LABELS: Record<string, string> = {
  Juri: "Júri",
  VVD: "VVD",
  EP: "EP",
  Crime1: "1ª Crime",
  Crime2: "2ª Crime",
};

export function AtendimentoCard({ atendimento: a }: { atendimento: AtendimentoTriagem }) {
  const status = STATUS_LABELS[a.status] ?? STATUS_LABELS.pendente_avaliacao;
  return (
    <article className={`rounded-lg border p-4 ${a.urgencia ? "bg-rose-50 border-rose-200" : "bg-card"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{a.tccRef}</span>
            <span>·</span>
            <span>{AREA_LABELS[a.area] ?? a.area}</span>
            <span>·</span>
            <span>{formatDistanceToNow(new Date(a.createdAt), { locale: ptBR, addSuffix: true })}</span>
            {a.urgencia && <span className="text-rose-700 font-semibold">⚡ {a.urgenciaMotivo}</span>}
          </div>
          <h3 className="mt-1 font-medium">{a.assistidoNome}</h3>
          {a.processoCnj && (
            <p className="text-xs text-muted-foreground font-mono">{a.processoCnj}</p>
          )}
          {a.situacao && <p className="text-sm mt-1">{a.situacao}</p>}
          {a.demandaLivre && <p className="text-sm mt-1 italic">&quot;{a.demandaLivre}&quot;</p>}
          {a.compareceu === "familiar" && a.familiarNome && (
            <p className="text-xs mt-1 text-muted-foreground">
              Compareceu: {a.familiarNome} ({a.familiarGrau ?? "familiar"})
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs ${status.className}`}>
            {status.label}
          </span>
          {a.status === "pendente_avaliacao" && <AtendimentoActions atendimentoId={a.id} />}
        </div>
      </div>
    </article>
  );
}
