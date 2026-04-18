"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { PessoaChip } from "@/components/pessoas";
import { ArrowLeft, Edit2, GitMerge } from "lucide-react";
import Link from "next/link";

export default function PessoaDetalhePage() {
  const params = useParams();
  const id = Number(params.id);
  const { data, isLoading } = trpc.pessoas.getById.useQuery({ id }, { enabled: !isNaN(id) });

  if (isLoading) return <div className="p-6 text-sm text-neutral-500">Carregando…</div>;
  if (!data) return <div className="p-6 text-sm text-neutral-500">Pessoa não encontrada</div>;

  const { pessoa, participacoes } = data;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/admin/pessoas" className="text-xs text-neutral-500 hover:text-neutral-700 inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-3 h-3" /> Voltar ao catálogo
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{pessoa.nome}</h1>
          <p className="text-sm text-neutral-500 mt-1">{pessoa.categoriaPrimaria ?? "sem categoria"}</p>
          <div className="flex gap-2 mt-3 items-center">
            <PessoaChip nome={pessoa.nome} papel={pessoa.categoriaPrimaria ?? undefined} clickable={false} />
            <span className="text-xs text-neutral-400 tabular-nums">confidence {pessoa.confidence}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline"><Edit2 className="w-3.5 h-3.5 mr-1.5" /> Editar</Button>
          <Link href="/admin/pessoas/merge-queue">
            <Button size="sm" variant="outline"><GitMerge className="w-3.5 h-3.5 mr-1.5" /> Fila de mesclagem</Button>
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-semibold mb-2">Participações ({participacoes.length})</h2>
          {participacoes.length === 0 && <p className="text-xs text-neutral-400 italic">Nenhuma participação.</p>}
          <ul className="space-y-1">
            {participacoes.map((p: any) => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <PessoaChip nome={pessoa.nome} papel={p.papel} clickable={false} size="xs" />
                <Link href={`/admin/processos/${p.processoId}`} className="text-xs text-blue-600 hover:underline">
                  Processo #{p.processoId}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-2">Dados</h2>
          <dl className="text-xs space-y-1">
            {pessoa.cpf && <div><dt className="text-neutral-400 inline">CPF:</dt> <dd className="inline ml-1">{pessoa.cpf}</dd></div>}
            {pessoa.rg && <div><dt className="text-neutral-400 inline">RG:</dt> <dd className="inline ml-1">{pessoa.rg}</dd></div>}
            {pessoa.telefone && <div><dt className="text-neutral-400 inline">Tel:</dt> <dd className="inline ml-1">{pessoa.telefone}</dd></div>}
            {pessoa.endereco && <div><dt className="text-neutral-400 inline">End:</dt> <dd className="inline ml-1">{pessoa.endereco}</dd></div>}
            {pessoa.observacoes && <div><dt className="text-neutral-400 inline">Obs:</dt> <dd className="inline ml-1">{pessoa.observacoes}</dd></div>}
          </dl>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-2">Proveniência</h2>
          <dl className="text-xs space-y-1">
            <div><dt className="text-neutral-400 inline">Fonte:</dt> <dd className="inline ml-1">{pessoa.fonteCriacao}</dd></div>
            <div><dt className="text-neutral-400 inline">Criada em:</dt> <dd className="inline ml-1">{new Date(pessoa.createdAt as any).toLocaleString("pt-BR")}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  );
}
