"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MessageCircle, ExternalLink, Loader2, Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const MS_DIA = 86_400_000;
function relativo(d: Date): string {
  const dias = Math.floor((Date.now() - d.getTime()) / MS_DIA);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias <= 30) return `há ${dias}d`;
  return `há ${Math.floor(dias / 30)}m`;
}

/**
 * Card de WhatsApp no cockpit do assistido. Resolve o contato vinculado
 * (whatsappChat.listContacts por assistidoId), mostra não-lidas + última
 * mensagem, deep-linka para a conversa existente (/admin/whatsapp/chat) e
 * permite **registrar o contato como atendimento** (vai pra timeline via
 * registros.create — preenche a ponte WhatsApp→registro). Não rebuilda o chat.
 */
export function WhatsappCockpitCard({
  assistidoId,
  telefone,
}: {
  assistidoId: number;
  telefone: string | null | undefined;
}) {
  const utils = trpc.useUtils();
  const [registrado, setRegistrado] = useState(false);

  const { data: configs } = trpc.whatsappChat.listConfigs.useQuery(undefined, { staleTime: 300_000 });
  const configId = configs?.[0]?.id;

  const { data: contatos } = trpc.whatsappChat.listContacts.useQuery(
    { configId: configId!, assistidoId, limit: 1 },
    { enabled: !!configId, staleTime: 30_000 },
  );
  const contato = useMemo(() => contatos?.contacts?.[0] ?? null, [contatos]);

  const registrar = trpc.registros.create.useMutation({
    onSuccess: () => {
      setRegistrado(true);
      toast.success("Atendimento registrado na timeline.");
      utils.registros.feedUnificado.invalidate({ assistidoId });
    },
    onError: (e) => toast.error(e.message),
  });

  // WhatsApp não configurado no workspace → não polui o cockpit.
  if (!configId) return null;

  // Sem contato vinculado: oferece vincular (quando há telefone).
  if (!contato) {
    if (!telefone) return null;
    return (
      <section className="rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200/80 dark:ring-neutral-800 shadow-sm">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            <MessageCircle className="w-3.5 h-3.5 text-green-500" /> WhatsApp
          </span>
          <Link
            href="/admin/whatsapp"
            className="inline-flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 hover:underline cursor-pointer"
          >
            <Link2 className="w-3 h-3" /> vincular conversa
          </Link>
        </div>
      </section>
    );
  }

  const unread = Number((contato as { unreadCount?: number }).unreadCount ?? 0);
  const lastAt = (contato as { lastMessageAt?: string | Date | null }).lastMessageAt;
  const lastContent = (contato as { lastMessageContent?: string | null }).lastMessageContent ?? null;
  const lastDir = (contato as { lastMessageDirection?: string | null }).lastMessageDirection ?? null;
  const lastDate = lastAt ? new Date(lastAt) : null;

  return (
    <section className="rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200/80 dark:ring-neutral-800 shadow-sm">
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          <MessageCircle className="w-3.5 h-3.5 text-green-500" /> WhatsApp
          {unread > 0 && (
            <span className="ml-0.5 rounded-full bg-green-600 px-1.5 text-[9px] font-bold text-white tabular-nums">
              {unread}
            </span>
          )}
        </span>
        <Link
          href={`/admin/whatsapp/chat?contactId=${(contato as { id: number }).id}`}
          className="inline-flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 hover:underline cursor-pointer"
        >
          abrir conversa <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="px-4 pb-4">
        {lastContent ? (
          <div className="rounded-lg bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200/70 dark:border-white/[0.06] px-3 py-2">
            <p className="line-clamp-2 text-[12px] text-neutral-700 dark:text-neutral-300">
              {lastDir === "inbound" ? "" : "Você: "}
              {lastContent}
            </p>
            {lastDate && (
              <p className="mt-0.5 text-[10px] tabular-nums text-neutral-400">{relativo(lastDate)}</p>
            )}
          </div>
        ) : (
          <p className="text-[12px] italic text-neutral-400">Conversa vinculada, sem mensagens recentes.</p>
        )}

        <div className="mt-2 flex items-center gap-2">
          {registrado ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="w-3 h-3" /> registrado
            </span>
          ) : (
            <button
              type="button"
              onClick={() =>
                registrar.mutate({
                  assistidoId,
                  tipo: "atendimento",
                  interlocutor: "assistido",
                  conteudo: `Contato via WhatsApp${lastContent ? `: ${lastContent}` : ""}`,
                })
              }
              disabled={registrar.isPending}
              className={cn(
                "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-medium cursor-pointer transition-colors disabled:opacity-50",
                "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700",
              )}
            >
              {registrar.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
              Registrar atendimento
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
