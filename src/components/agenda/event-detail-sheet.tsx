"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  User,
  FileText,
  MapPin,
  StickyNote,
  History,
  CheckCircle2,
  X,
  ExternalLink,
  Copy,
  Check,
  Users,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface EventDetailSheetProps {
  evento: any | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (evento: any) => void;
}

export function EventDetailSheet({ evento, open, onClose, onEdit }: EventDetailSheetProps) {
  const [copied, setCopied] = useState(false);

  // Buscar registro da audiência (contém depoentes via registroAudiencia JSONB)
  const { data: registro } = trpc.audiencias.buscarRegistro.useQuery(
    { audienciaId: evento?.id ?? 0 },
    { enabled: !!evento?.id && open }
  );

  // Buscar histórico de audiências do processo
  const { data: historico } = trpc.audiencias.buscarHistoricoRegistros.useQuery(
    { processoId: evento?.processoId },
    { enabled: !!evento?.processoId && open }
  );

  const depoentes: any[] = (registro as any)?.depoentes ?? [];
  const historicoRecente = (historico ?? []).slice(0, 3);

  const copyProcesso = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!evento) return null;

  // Montar data/hora a partir dos campos do evento do calendário
  const dataHora = evento.data && evento.horarioInicio
    ? (() => { try { return new Date(`${evento.data}T${evento.horarioInicio}`); } catch { return null; } })()
    : evento.dataHora
      ? new Date(evento.dataHora)
      : null;

  const processoNum = evento.processo ?? evento.processoNumero ?? null;
  const assistidoNome = evento.assistido ?? evento.assistidoNome ?? null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[480px] md:w-[560px] p-0 flex flex-col gap-0 border-l border-zinc-200 dark:border-zinc-800 [&>button:first-of-type]:hidden"
      >
        <SheetTitle className="sr-only">Detalhes do evento</SheetTitle>

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">
              {evento.titulo ?? evento.tipo ?? "Evento"}
            </p>
            {dataHora && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {format(dataHora, "EEEE, dd 'de' MMMM · HH:mm", { locale: ptBR })}
                {evento.horarioFim ? ` — ${evento.horarioFim}` : ""}
              </p>
            )}
            {evento.local && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {evento.local}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            {onEdit && (
              <button
                onClick={() => onEdit(evento)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Editar evento"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">

          {/* Assistido + Processo */}
          {(assistidoNome || processoNum) && (
            <div className="px-4 py-3 space-y-2.5">
              {assistidoNome && (
                <div className="flex items-center gap-2.5">
                  <User className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">Assistido</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                        {assistidoNome}
                      </p>
                      {evento.assistidoId && (
                        <Link href={`/admin/assistidos/${evento.assistidoId}`} onClick={onClose}>
                          <ExternalLink className="w-3 h-3 text-zinc-400 hover:text-emerald-600 flex-shrink-0" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {processoNum && (
                <div className="flex items-center gap-2.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">Processo</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-mono text-zinc-700 dark:text-zinc-300 truncate">
                        {processoNum}
                      </p>
                      <button onClick={() => copyProcesso(processoNum)} title="Copiar número">
                        {copied
                          ? <Check className="w-3 h-3 text-emerald-500" />
                          : <Copy className="w-3 h-3 text-zinc-400 hover:text-zinc-600 cursor-pointer" />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Depoentes */}
          {depoentes.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium flex items-center gap-1.5 mb-2.5">
                <Users className="w-3 h-3" />
                Depoentes
              </p>
              <div className="space-y-1.5">
                {depoentes.map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 flex-shrink-0" />
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">{d.nome}</span>
                    {d.tipo && (
                      <span className="text-zinc-400 dark:text-zinc-500 truncate">— {d.tipo}</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-zinc-400 mt-2 italic">
                · via análise do processo (Drive)
              </p>
            </div>
          )}

          {/* Observações */}
          <div className="px-4 py-3">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium flex items-center gap-1.5 mb-2">
              <StickyNote className="w-3 h-3" />
              Observações
            </p>
            {evento.descricao ? (
              <p className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">
                {evento.descricao}
              </p>
            ) : (
              <p className="text-xs text-zinc-400 dark:text-zinc-600 italic">Sem observações</p>
            )}
          </div>

          {/* Histórico */}
          {historicoRecente.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium flex items-center gap-1.5 mb-2.5">
                <History className="w-3 h-3" />
                Histórico do Processo
              </p>
              <div className="space-y-2">
                {historicoRecente.map((h: any, i: number) => (
                  <div key={i} className="flex gap-2.5 text-xs">
                    <span className="text-zinc-400 flex-shrink-0 tabular-nums w-10">
                      {h.dataAudiencia
                        ? format(new Date(h.dataAudiencia), "dd/MM")
                        : "—"}
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400 truncate">
                      {h.resultado ?? h.status ?? "Sem registro"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Registro */}
          <div className="px-4 py-3">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="w-3 h-3" />
              Registro
            </p>
            {evento.status === "realizada" || evento.status === "concluida" ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Realizada
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">● Pendente</span>
                {evento.id && (
                  <Link
                    href={`/admin/audiencias/${evento.id}/registro`}
                    className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
                    onClick={onClose}
                  >
                    Registrar agora <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
