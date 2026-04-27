"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function NovoObjetoPage() {
  const router = useRouter();
  const [form, setForm] = useState({ tipo: "outro", descricao: "", marca: "", modelo: "" });
  const createMut = trpc.objetos.create.useMutation({
    onSuccess: () => { toast.success("Objeto criado"); router.push("/admin/objetos"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-lg font-semibold mb-4">Novo objeto apreendido</h1>
      <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} className="space-y-3">
        <label className="block">
          <span className="text-xs text-neutral-500">Tipo</span>
          <select className="w-full px-2 py-1.5 border rounded text-sm" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="arma-fogo">Arma de fogo</option>
            <option value="munição">Munição</option>
            <option value="droga">Droga</option>
            <option value="celular">Celular</option>
            <option value="veiculo">Veículo</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="outro">Outro</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-neutral-500">Descrição</span>
          <input required className="w-full px-2 py-1.5 border rounded text-sm" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-xs text-neutral-500">Marca</span>
          <input className="w-full px-2 py-1.5 border rounded text-sm" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-xs text-neutral-500">Modelo</span>
          <input className="w-full px-2 py-1.5 border rounded text-sm" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
        </label>
        <button type="submit" disabled={createMut.isPending} className="px-4 py-2 rounded border cursor-pointer hover:border-emerald-400 text-sm">
          {createMut.isPending ? "Criando…" : "Criar"}
        </button>
      </form>
    </div>
  );
}
