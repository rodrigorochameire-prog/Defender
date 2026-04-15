"use client";

import { cn } from "@/lib/utils";
import { TIPO_META, type EncaminhamentoTipo } from "./tipo-colors";
import { EncaminhamentoBadge } from "./EncaminhamentoBadge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface EncaminhamentoListItemData {
  id: number;
  tipo: EncaminhamentoTipo;
  remetenteName: string;
  titulo: string | null;
  mensagemPreview: string;
  createdAt: Date | string;
  status: string;
  urgencia: "normal" | "urgente";
  unread: boolean;
}

export function EncaminhamentoListItem({
  item,
  selected,
  onClick,
}: {
  item: EncaminhamentoListItemData;
  selected?: boolean;
  onClick?: () => void;
}) {
  const m = TIPO_META[item.tipo];
  const isPendente = item.status === "pendente";
  const aguardaAceite =
    isPendente && (item.tipo === "transferir" || item.tipo === "acompanhar");
  const created = new Date(item.createdAt);
  const relative = formatDistanceToNow(created, { locale: ptBR, addSuffix: false });

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-stretch rounded-lg overflow-hidden transition-all duration-150 cursor-pointer text-left border",
        selected
          ? "bg-white dark:bg-neutral-900 border-indigo-300/60 dark:border-indigo-600/40 shadow-sm"
          : "bg-neutral-50/50 dark:bg-neutral-800/20 border-transparent hover:bg-white dark:hover:bg-neutral-800/40 hover:border-neutral-200/80 dark:hover:border-neutral-700/60",
      )}
    >
      <div className={cn("w-1 shrink-0", m.colorBar)} />
      <div className="flex-1 min-w-0 px-3 py-2.5">
        <div className="flex items-center gap-2 mb-1">
          <EncaminhamentoBadge tipo={item.tipo} size="xs" withLabel />
          <span className="text-[11px] text-muted-foreground truncate">
            de <span className="font-semibold text-foreground/80">{item.remetenteName}</span>
          </span>
        </div>
        <p className="text-[13px] font-semibold text-foreground truncate">
          {item.titulo || item.mensagemPreview.slice(0, 60)}
        </p>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
          {item.mensagemPreview}
        </p>
      </div>
      <div className="flex flex-col items-end justify-between py-2.5 pr-3 gap-1 shrink-0">
        <span className="text-[10px] text-muted-foreground tabular-nums">{relative}</span>
        {aguardaAceite ? (
          <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Aguarda aceite
          </span>
        ) : item.unread ? (
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
        ) : null}
      </div>
    </button>
  );
}
