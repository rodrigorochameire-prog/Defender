import { CalendarClock, MessageSquare, FileText, NotebookPen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export type EventoLine = {
  id: number;
  tipo: "atendimento" | "diligencia" | "observacao";
  subtipo?: string | null;
  status?: "pendente" | "feita" | "cancelada" | null;
  resumo: string;
  prazo?: string | null; // ISO date "YYYY-MM-DD"
  createdAt: string | Date;
};

const TIPO_ICON = {
  atendimento: MessageSquare,
  diligencia: FileText,
  observacao: NotebookPen,
} as const;

export function EventLine({
  evento,
  variant = "default",
}: {
  evento: EventoLine;
  variant?: "default" | "pendente";
}) {
  const Icon = TIPO_ICON[evento.tipo];

  if (variant === "pendente") {
    const tone = prazoTone(evento.prazo);
    return (
      <span className={`flex items-center gap-1.5 text-[10px] ${tone.className}`}>
        <CalendarClock className="size-3 shrink-0" />
        <span className="truncate">
          Pendente: {evento.resumo}
          {evento.prazo && <> · prazo {formatPrazoLabel(evento.prazo)}</>}
        </span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400">
      <Icon className="size-3 shrink-0 opacity-60" />
      <span className="truncate">
        <span className="opacity-60 mr-1">{relativeTime(evento.createdAt)}</span>
        {evento.resumo}
      </span>
    </span>
  );
}

function relativeTime(input: string | Date): string {
  const d = new Date(input);
  return formatDistanceToNow(d, { locale: ptBR, addSuffix: false });
}

function prazoTone(prazo?: string | null) {
  if (!prazo) return { className: "text-neutral-500 dark:text-neutral-400" };
  const days = Math.floor((new Date(prazo).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { className: "text-red-600 dark:text-red-400 font-medium" };
  if (days <= 7) return { className: "text-amber-600 dark:text-amber-400" };
  return { className: "text-neutral-500 dark:text-neutral-400" };
}

function formatPrazoLabel(prazo: string): string {
  const days = Math.floor((new Date(prazo).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return `vencido há ${-days}d`;
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  return `em ${days}d`;
}
