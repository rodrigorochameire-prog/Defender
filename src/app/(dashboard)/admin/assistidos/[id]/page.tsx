"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageCircle, CalendarPlus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { RegistrosTimeline } from "@/components/registros/registros-timeline";
import { AtendimentoFormModal } from "@/components/atendimentos/atendimento-form-modal";
import { whatsappUrl } from "@/components/atendimentos/config";

/**
 * Nível 1 (Assistido) — aba "Geral" default.
 * Auto-redireciona pra caso ativo único quando aplicável.
 */
export default function AssistidoHubPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);
  const [agendar, setAgendar] = useState(false);

  const { data: assistido } = trpc.assistidos.getById.useQuery({ id }, { enabled: !isNaN(id) });
  const { data: casos = [], isLoading } = trpc.casos.getCasosDoAssistido.useQuery(
    { assistidoId: id }, { enabled: !isNaN(id) }
  );

  const casosAtivos = casos.filter((c: any) => c.status === "ativo");

  useEffect(() => {
    if (isLoading) return;
    if (casosAtivos.length === 1) {
      router.replace(`/admin/assistidos/${id}/caso/${casosAtivos[0].id}`);
    }
  }, [isLoading, casosAtivos, id, router]);

  if (isLoading) return <p className="p-6 italic text-neutral-400">Carregando…</p>;

  const zap = whatsappUrl(assistido?.telefone);

  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <section>
        <div className="flex items-center justify-between mb-2 gap-3">
          <h2 className="text-base font-semibold">Dados pessoais</h2>
          <div className="flex items-center gap-2">
            {zap && (
              <a
                href={zap}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </a>
            )}
            <button
              onClick={() => setAgendar(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <CalendarPlus className="w-3.5 h-3.5" /> Agendar atendimento
            </button>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div><dt className="text-xs text-neutral-500">Nome</dt><dd>{assistido?.nome ?? "—"}</dd></div>
          <div><dt className="text-xs text-neutral-500">CPF</dt><dd className="font-mono">{assistido?.cpf ?? "—"}</dd></div>
          <div><dt className="text-xs text-neutral-500">Telefone</dt><dd>{assistido?.telefone ?? "—"}</dd></div>
          <div><dt className="text-xs text-neutral-500">Endereço</dt><dd>{(assistido as any)?.endereco ?? "—"}</dd></div>
        </dl>
      </section>
      {casos.length > 0 && (
        <section>
          <p className="text-xs text-neutral-500">
            {casos.length} caso{casos.length !== 1 ? "s" : ""} ·{" "}
            <a href={`/admin/assistidos/${id}/casos`} className="underline hover:text-emerald-600">ver todos</a>
          </p>
        </section>
      )}
      <section>
        <h2 className="text-base font-semibold mb-2">Registros</h2>
        <RegistrosTimeline
          assistidoId={id}
          emptyHint="Nenhum registro deste assistido ainda."
        />
      </section>

      <AtendimentoFormModal
        open={agendar}
        onClose={() => setAgendar(false)}
        prefill={
          assistido
            ? { assistidoId: id, assistidoNome: assistido.nome, subtipo: "inicial" }
            : null
        }
      />
    </div>
  );
}
