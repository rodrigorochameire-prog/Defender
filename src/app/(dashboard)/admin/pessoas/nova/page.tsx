"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PessoaForm } from "@/components/pessoas";
import { toast } from "sonner";

export default function NovaPessoaPage() {
  const router = useRouter();
  const create = trpc.pessoas.create.useMutation({
    onSuccess: (p) => {
      toast.success("Pessoa criada");
      router.push(`/admin/pessoas/${p.id}`);
    },
    onError: (e) => toast.error(e.message ?? "Erro"),
  });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">Nova pessoa</h1>
      <PessoaForm onSubmit={(data) => create.mutate(data)} submitting={create.isPending} />
    </div>
  );
}
