"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Users, Phone, MessageCircle, UserPlus, Home } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { whatsappUrl } from "@/components/atendimentos/config";

const GRAU_LABEL: Record<string, string> = {
  mae: "Mãe",
  pai: "Pai",
  conjuge: "Cônjuge",
  filho: "Filho(a)",
  irmao: "Irmão(ã)",
  contato: "Contato",
  outro: "Outro",
};

function ZapBtn({ telefone, nome }: { telefone: string | null | undefined; nome?: string }) {
  const url = whatsappUrl(telefone, nome ? `Olá, ${nome.split(" ")[0]}. Aqui é da Defensoria Pública.` : undefined);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-1 text-[10px] font-medium hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors cursor-pointer"
    >
      <MessageCircle className="h-3 w-3" /> WhatsApp
    </a>
  );
}

function PessoaRow({ nome, papel, telefone, endereco }: { nome: string; papel: string; telefone: string | null; endereco?: string | null }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-neutral-200/70 dark:border-white/[0.06] bg-neutral-50/60 dark:bg-white/[0.03] px-2.5 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 truncate text-[12px] font-medium text-foreground/90">{nome}</span>
          <span className="shrink-0 rounded px-1.5 py-px text-[9px] font-medium uppercase tracking-wide bg-neutral-100 dark:bg-white/[0.06] text-muted-foreground">{papel}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
          {telefone && (
            <span className="inline-flex items-center gap-1 tabular-nums"><Phone className="h-2.5 w-2.5" />{telefone}</span>
          )}
          {endereco && <span className="inline-flex items-center gap-1 truncate max-w-[280px]"><Home className="h-2.5 w-2.5" />{endereco}</span>}
        </div>
      </div>
      <ZapBtn telefone={telefone} nome={nome} />
    </div>
  );
}

export default function PessoasPage() {
  const params = useParams();
  const id = Number(params?.id);
  const { data: assistido, isLoading: loadingA } = trpc.assistidos.getById.useQuery({ id }, { enabled: !isNaN(id) });
  const { data: fam, isLoading: loadingF } = trpc.pessoas.getFamiliaresByAssistido.useQuery(
    { assistidoId: id },
    { enabled: !isNaN(id) },
  );

  if (loadingA || loadingF) {
    return (
      <div className="p-4 sm:p-6 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
        ))}
      </div>
    );
  }

  const familiares = fam?.familiares ?? [];
  const temContatoPrimario = !!(assistido?.telefone || assistido?.telefoneContato);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        <Users className="h-4 w-4 text-neutral-500" />
        Pessoas
        <span className="text-[11px] font-normal text-neutral-400">
          {familiares.length} parente{familiares.length !== 1 ? "s" : ""}/contato{familiares.length !== 1 ? "s" : ""}
        </span>
      </h2>

      {/* Contato principal — do próprio cadastro do assistido */}
      <section className="rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200/80 dark:ring-neutral-800 shadow-sm">
        <div className="px-4 pt-3 pb-2 text-[12px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Contato principal</div>
        <div className="px-4 pb-4 space-y-1">
          {assistido?.telefone && (
            <PessoaRow nome={assistido.nome ?? "Assistido"} papel="Assistido" telefone={assistido.telefone} />
          )}
          {assistido?.telefoneContato && (
            <PessoaRow
              nome={assistido.nomeContato ?? "Contato"}
              papel={assistido.parentescoContato ?? "Contato"}
              telefone={assistido.telefoneContato}
            />
          )}
          {!temContatoPrimario && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-amber-200 bg-amber-50/40 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/10">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                <Phone className="h-3 w-3" /> Sem telefone cadastrado
              </span>
              <Link
                href={`/admin/assistidos/${id}/editar`}
                className="text-[10px] font-medium text-emerald-600 hover:underline dark:text-emerald-400 cursor-pointer"
              >
                Completar contato
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Familiares / contatos vinculados (pessoa_relacoes) */}
      <section className="rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200/80 dark:ring-neutral-800 shadow-sm">
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 text-[12px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          <UserPlus className="h-3.5 w-3.5" /> Familiares e contatos
          <span className="ml-1 text-[10px] font-normal normal-case text-neutral-400">{familiares.length}</span>
        </div>
        <div className="px-4 pb-4">
          {familiares.length > 0 ? (
            <div className="space-y-1">
              {familiares.map((f) => (
                <PessoaRow
                  key={f.id}
                  nome={f.nome}
                  papel={GRAU_LABEL[f.grau] ?? f.grau}
                  telefone={f.telefone}
                  endereco={f.endereco}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1.5 py-6 text-center">
              <UserPlus className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Sem rede de apoio cadastrada</p>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                Familiares e contatos de referência ajudam a localizar o assistido, confirmar dados e dar
                andamento à defesa. Vincule quem costuma acompanhar o caso.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
