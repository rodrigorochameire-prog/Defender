"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { PessoaChip } from "@/components/pessoas";
import { ArrowLeft, Edit2, GitMerge } from "lucide-react";
import Link from "next/link";
import { DemografiaCard } from "./_components/demografia-card";
import { EnvolvimentoCard } from "./_components/envolvimento-card";
import { FamiliaresCard } from "./_components/familiares-card";
import { MapaCard } from "./_components/mapa-card";

export default function PessoaDetalhePage() {
  const params = useParams();
  const id = Number(params.id);
  const enabled = !isNaN(id);

  const { data, isLoading } = trpc.pessoas.getById.useQuery({ id }, { enabled });
  const envolvimentoQ = trpc.pessoas.getEnvolvimento.useQuery({ pessoaId: id }, { enabled });
  const familiaresQ = trpc.pessoas.getFamiliares.useQuery({ pessoaId: id }, { enabled });

  if (isLoading) return <div className="p-6 text-sm text-neutral-500">Carregando…</div>;
  if (!data) return <div className="p-6 text-sm text-neutral-500">Pessoa não encontrada</div>;

  const { pessoa } = data;
  const envolvimento = envolvimentoQ.data?.envolvimento ?? [];
  const totalProcessos = envolvimentoQ.data?.totalProcessos ?? 0;
  const enderecos = envolvimentoQ.data?.enderecos ?? [];
  const familiares = (familiaresQ.data ?? []) as Parameters<typeof FamiliaresCard>[0]["familiares"];

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link
        href="/admin/pessoas"
        className="mb-4 inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700"
      >
        <ArrowLeft className="h-3 w-3" /> Voltar ao catálogo
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{pessoa.nome}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {pessoa.categoriaPrimaria ?? "sem categoria"}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <PessoaChip
              nome={pessoa.nome}
              papel={pessoa.categoriaPrimaria ?? undefined}
              clickable={false}
            />
            <span className="text-xs tabular-nums text-neutral-400">
              confidence {pessoa.confidence}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <Edit2 className="mr-1.5 h-3.5 w-3.5" /> Editar
          </Button>
          <Link href="/admin/pessoas/merge-queue">
            <Button size="sm" variant="outline">
              <GitMerge className="mr-1.5 h-3.5 w-3.5" /> Fila de mesclagem
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-5">
        {/* Ficha 360° */}
        <DemografiaCard pessoa={pessoa} />

        <EnvolvimentoCard
          envolvimento={envolvimento}
          total={totalProcessos}
          isLoading={envolvimentoQ.isLoading}
        />

        <FamiliaresCard familiares={familiares} isLoading={familiaresQ.isLoading} />

        <MapaCard enderecos={enderecos} isLoading={envolvimentoQ.isLoading} />

        {/* Proveniência */}
        <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
          <h2 className="mb-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Proveniência
          </h2>
          <dl className="space-y-1 text-xs">
            {pessoa.cpf && (
              <div>
                <dt className="inline text-neutral-400">CPF:</dt>{" "}
                <dd className="ml-1 inline font-mono">{pessoa.cpf}</dd>
              </div>
            )}
            {pessoa.rg && (
              <div>
                <dt className="inline text-neutral-400">RG:</dt>{" "}
                <dd className="ml-1 inline">{pessoa.rg}</dd>
              </div>
            )}
            {pessoa.observacoes && (
              <div>
                <dt className="inline text-neutral-400">Obs:</dt>{" "}
                <dd className="ml-1 inline">{pessoa.observacoes}</dd>
              </div>
            )}
            <div>
              <dt className="inline text-neutral-400">Fonte:</dt>{" "}
              <dd className="ml-1 inline">{pessoa.fonteCriacao}</dd>
            </div>
            <div>
              <dt className="inline text-neutral-400">Criada em:</dt>{" "}
              <dd className="ml-1 inline">
                {new Date(pessoa.createdAt as unknown as string).toLocaleString("pt-BR")}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
