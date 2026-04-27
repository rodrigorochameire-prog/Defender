"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  mode: "create" | "edit";
  initial?: {
    id?: number;
    logradouro?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    uf?: string | null;
    cep?: string | null;
    observacoes?: string | null;
  };
}

export function LugarForm({ mode, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    logradouro: initial?.logradouro ?? "",
    numero: initial?.numero ?? "",
    complemento: initial?.complemento ?? "",
    bairro: initial?.bairro ?? "",
    cidade: initial?.cidade ?? "Camaçari",
    uf: initial?.uf ?? "BA",
    cep: initial?.cep ?? "",
    observacoes: initial?.observacoes ?? "",
  });

  const createMut = trpc.lugares.create.useMutation({
    onSuccess: (row) => {
      toast.success("Lugar criado");
      router.push(`/admin/lugares/${row.id}`);
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.lugares.update.useMutation({
    onSuccess: () => {
      toast.success("Atualizado");
      router.refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "create") {
      createMut.mutate({ ...form, fonte: "manual" });
    } else if (initial?.id) {
      updateMut.mutate({ id: initial.id, patch: form });
    }
  };

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <form onSubmit={submit} className="space-y-3 max-w-xl">
      <div className="grid grid-cols-3 gap-2">
        <label className="col-span-2 block">
          <span className="text-xs text-neutral-500">Logradouro</span>
          <input
            className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.logradouro}
            onChange={(e) => setForm((f) => ({ ...f, logradouro: e.target.value }))}
          />
        </label>
        <label className="block">
          <span className="text-xs text-neutral-500">Número</span>
          <input
            className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.numero}
            onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
          />
        </label>
      </div>
      <label className="block">
        <span className="text-xs text-neutral-500">Complemento</span>
        <input
          className="w-full px-2 py-1.5 border rounded text-sm"
          value={form.complemento}
          onChange={(e) => setForm((f) => ({ ...f, complemento: e.target.value }))}
        />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="text-xs text-neutral-500">Bairro</span>
          <input
            className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.bairro}
            onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))}
          />
        </label>
        <label className="block">
          <span className="text-xs text-neutral-500">Cidade</span>
          <input
            className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.cidade}
            onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
          />
        </label>
        <label className="block">
          <span className="text-xs text-neutral-500">UF</span>
          <input
            className="w-full px-2 py-1.5 border rounded text-sm"
            maxLength={2}
            value={form.uf}
            onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase() }))}
          />
        </label>
      </div>
      <label className="block">
        <span className="text-xs text-neutral-500">CEP</span>
        <input
          className="w-40 px-2 py-1.5 border rounded text-sm"
          value={form.cep}
          onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value }))}
        />
      </label>
      <label className="block">
        <span className="text-xs text-neutral-500">Observações</span>
        <textarea
          className="w-full px-2 py-1.5 border rounded text-sm"
          rows={3}
          value={form.observacoes}
          onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded border cursor-pointer hover:border-emerald-400 text-sm"
      >
        {pending ? "Salvando…" : mode === "create" ? "Criar" : "Salvar"}
      </button>
    </form>
  );
}
