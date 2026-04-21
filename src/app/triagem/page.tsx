import { listAtendimentos } from "@/lib/services/triagem";
import { AtendimentoCard } from "@/components/triagem/atendimento-card";
import { TriagemFilters } from "@/components/triagem/triagem-filters";

interface PageProps {
  searchParams: Promise<{ status?: string; area?: string; busca?: string }>;
}

export default async function TriagemPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const atendimentos = await listAtendimentos({
    status: sp.status === "todos" ? undefined : (sp.status ?? "pendente_avaliacao"),
    area: sp.area === "todas" ? undefined : sp.area,
    limit: 100,
  });

  const filtrados = sp.busca
    ? atendimentos.filter(a =>
        a.assistidoNome.toLowerCase().includes(sp.busca!.toLowerCase()) ||
        (a.processoCnj ?? "").includes(sp.busca!)
      )
    : atendimentos;

  return (
    <main className="container mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Triagem Criminal</h1>
        <p className="text-sm text-muted-foreground">
          Atendimentos registrados pela equipe de triagem para sua avaliação
        </p>
      </header>

      <TriagemFilters current={sp} />

      <div className="mt-6 grid gap-3">
        {filtrados.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Nenhum atendimento encontrado.
          </div>
        ) : (
          filtrados.map(a => <AtendimentoCard key={a.id} atendimento={a} />)
        )}
      </div>
    </main>
  );
}
