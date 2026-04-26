"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc/client";

/**
 * Nível 1 (Assistido) — aba "Geral" default.
 * Auto-redireciona pra caso ativo único quando aplicável.
 */
export default function AssistidoHubPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

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

  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <section>
        <h2 className="text-base font-semibold mb-2">Dados pessoais</h2>
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
    </div>
  );
}
