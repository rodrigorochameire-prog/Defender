"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  initial?: {
    nome?: string;
    cpf?: string;
    rg?: string;
    telefone?: string;
    endereco?: string;
    observacoes?: string;
    categoriaPrimaria?: string;
  };
  onSubmit: (data: any) => void;
  submitting?: boolean;
}

export function PessoaForm({ initial, onSubmit, submitting }: Props) {
  const [form, setForm] = useState({
    nome: initial?.nome ?? "",
    cpf: initial?.cpf ?? "",
    rg: initial?.rg ?? "",
    telefone: initial?.telefone ?? "",
    endereco: initial?.endereco ?? "",
    observacoes: initial?.observacoes ?? "",
    categoriaPrimaria: initial?.categoriaPrimaria ?? "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      cpf: form.cpf || undefined,
      rg: form.rg || undefined,
      telefone: form.telefone || undefined,
      endereco: form.endereco || undefined,
      observacoes: form.observacoes || undefined,
      categoriaPrimaria: form.categoriaPrimaria || undefined,
      fonteCriacao: "manual",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div>
        <Label htmlFor="nome">Nome *</Label>
        <Input id="nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="cpf">CPF</Label>
          <Input id="cpf" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="rg">RG</Label>
          <Input id="rg" value={form.rg} onChange={(e) => setForm({ ...form, rg: e.target.value })} />
        </div>
      </div>
      <div>
        <Label htmlFor="categoria">Categoria primária</Label>
        <Input
          id="categoria"
          value={form.categoriaPrimaria}
          onChange={(e) => setForm({ ...form, categoriaPrimaria: e.target.value })}
          placeholder="ex: testemunha, policial-militar, perito-criminal"
        />
      </div>
      <div>
        <Label htmlFor="telefone">Telefone</Label>
        <Input id="telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="endereco">Endereço</Label>
        <Input id="endereco" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="obs">Observações</Label>
        <Textarea id="obs" rows={3} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
      </div>
      <Button type="submit" disabled={submitting || !form.nome.trim()}>
        {submitting ? "Salvando…" : "Criar pessoa"}
      </Button>
    </form>
  );
}
