import { listAtendimentos } from "@/lib/services/triagem";
import Link from "next/link";

export async function AtendimentosPendentesCard({ defensorId }: { defensorId: number }) {
  const atendimentos = await listAtendimentos({
    defensorId,
    status: "pendente_avaliacao",
    limit: 5,
  });

  return (
    <section className="rounded-lg border bg-card p-4">
      <header className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Triagem — pendentes</h3>
        <Link href="/triagem" className="text-xs text-muted-foreground hover:underline">
          Ver todos →
        </Link>
      </header>
      {atendimentos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum atendimento aguardando.</p>
      ) : (
        <ul className="space-y-2">
          {atendimentos.map(a => (
            <li key={a.id} className="text-sm">
              <Link href={`/triagem?id=${a.id}`} className="hover:underline">
                <span className="font-mono text-xs text-muted-foreground">{a.tccRef}</span>{" "}
                <span className="font-medium">{a.assistidoNome}</span>
                {a.urgencia && <span className="ml-1 text-rose-600">⚡</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
