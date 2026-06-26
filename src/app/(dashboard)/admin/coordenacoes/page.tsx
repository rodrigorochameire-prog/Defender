"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Landmark, Plus, Power, Save, X } from "lucide-react";

// Catálogo de Coordenações (IN 01/2026-CGD) — destino dos encaminhamentos ao
// defensor natural. Preencher com os e-mails do Anexo Único da Instrução.

type Regime = "interno" | "integrado";
type Nivel = "regional" | "especializada";

interface FormState {
  id?: number;
  regime: Regime;
  nivel: Nivel;
  nome: string;
  comarca: string;
  uf: string;
  email: string;
  telefone: string;
  observacao: string;
}

const EMPTY: FormState = {
  regime: "interno", nivel: "regional", nome: "", comarca: "", uf: "BA",
  email: "", telefone: "", observacao: "",
};

export default function CoordenacoesPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.coordenacoes.listar.useQuery({ apenasAtivos: false });
  const items = data?.items ?? [];

  const [form, setForm] = useState<FormState | null>(null);

  const criar = trpc.coordenacoes.criar.useMutation({
    onSuccess: () => { utils.coordenacoes.invalidate(); setForm(null); },
  });
  const atualizar = trpc.coordenacoes.atualizar.useMutation({
    onSuccess: () => { utils.coordenacoes.invalidate(); setForm(null); },
  });
  const desativar = trpc.coordenacoes.desativar.useMutation({
    onSuccess: () => utils.coordenacoes.invalidate(),
  });

  const salvar = () => {
    if (!form) return;
    const payload = {
      regime: form.regime, nivel: form.nivel, nome: form.nome,
      comarca: form.comarca || null, uf: form.uf || "BA", email: form.email,
      telefone: form.telefone || null, observacao: form.observacao || null,
    };
    if (form.id) atualizar.mutate({ id: form.id, ...payload });
    else criar.mutate(payload);
  };

  const podeSalvar = !!form && form.nome.trim().length >= 2 && /.+@.+\..+/.test(form.email);

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Landmark className="w-5 h-5 text-sky-600" /> Coordenações (IN 01/2026)
          </h1>
          <Button onClick={() => setForm({ ...EMPTY })} className="bg-sky-600 hover:bg-sky-700 text-white">
            <Plus className="w-4 h-4 mr-1" /> Nova Coordenação
          </Button>
        </div>
        <p className="text-[12px] text-muted-foreground mb-5">
          Destino dos encaminhamentos ao defensor natural. E-mails do Anexo Único da Instrução Normativa.
          Interno = outra comarca (mesma UF); Integrado = outra UF (canal pet.ba.integrado).
        </p>

        {form && (
          <div className="mb-5 p-4 rounded-xl border border-sky-200 dark:border-sky-900 bg-white dark:bg-neutral-900 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[12px]">Regime
                <select value={form.regime} onChange={(e) => setForm({ ...form, regime: e.target.value as Regime })}
                  className="mt-1 w-full px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-[13px]">
                  <option value="interno">Interno (outra comarca, mesma UF)</option>
                  <option value="integrado">Integrado (outra UF)</option>
                </select>
              </label>
              <label className="text-[12px]">Nível
                <select value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value as Nivel })}
                  className="mt-1 w-full px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-[13px]">
                  <option value="regional">Regional</option>
                  <option value="especializada">Especializada</option>
                </select>
              </label>
              <label className="text-[12px] col-span-2">Nome
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Coordenação da Especializada de VDFM de Salvador"
                  className="mt-1 w-full px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-[13px]" />
              </label>
              <label className="text-[12px]">Comarca
                <input value={form.comarca} onChange={(e) => setForm({ ...form, comarca: e.target.value })}
                  className="mt-1 w-full px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-[13px]" />
              </label>
              <label className="text-[12px]">UF
                <input value={form.uf} maxLength={2} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}
                  className="mt-1 w-full px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-[13px]" />
              </label>
              <label className="text-[12px]">E-mail
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="coordenacao@defensoria.ba.def.br"
                  className="mt-1 w-full px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-[13px]" />
              </label>
              <label className="text-[12px]">Telefone
                <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className="mt-1 w-full px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-[13px]" />
              </label>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" onClick={() => setForm(null)}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
              <Button onClick={salvar} disabled={!podeSalvar || criar.isPending || atualizar.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Save className="w-4 h-4 mr-1" /> Salvar
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-[13px] text-muted-foreground">Carregando…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-[13px] text-muted-foreground">Nenhuma Coordenação cadastrada.</div>
          ) : (
            <table className="w-full text-[12px]">
              <thead className="bg-neutral-50 dark:bg-neutral-800/40 text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Regime</th>
                  <th className="text-left px-3 py-2 font-medium">Nome</th>
                  <th className="text-left px-3 py-2 font-medium">Comarca/UF</th>
                  <th className="text-left px-3 py-2 font-medium">E-mail</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className={`border-t border-neutral-100 dark:border-neutral-800 ${!c.ativo ? "opacity-50" : ""}`}>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${c.regime === "integrado" ? "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300" : "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"}`}>
                        {c.regime}
                      </span>
                    </td>
                    <td className="px-3 py-2">{c.nome}</td>
                    <td className="px-3 py-2">{[c.comarca, c.uf].filter(Boolean).join(" / ")}</td>
                    <td className="px-3 py-2 font-mono">{c.email}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button onClick={() => setForm({
                        id: c.id, regime: c.regime as Regime, nivel: c.nivel as Nivel, nome: c.nome,
                        comarca: c.comarca ?? "", uf: c.uf, email: c.email,
                        telefone: c.telefone ?? "", observacao: c.observacao ?? "",
                      })} className="text-sky-600 hover:underline mr-3">Editar</button>
                      {c.ativo && (
                        <button onClick={() => desativar.mutate({ id: c.id })} className="text-rose-600 hover:underline inline-flex items-center">
                          <Power className="w-3 h-3 mr-0.5" /> Desativar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
