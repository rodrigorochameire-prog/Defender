import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { TriagemList } from "@/components/triagem/triagem-list";

export default async function TriagemPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Triagem de demandas</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Demandas pendentes de distribuição ou priorização.
        </p>
      </div>
      <TriagemList currentUserId={user.id} role={user.role} />
    </div>
  );
}
