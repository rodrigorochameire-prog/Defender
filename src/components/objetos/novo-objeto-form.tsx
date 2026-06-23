"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { TIPO_OPTIONS, type ObjetoTipo } from "./objeto-icon";

interface NovoObjetoFormProps {
  onClose: () => void;
  onCreated?: () => void;
}

/**
 * Formulário mínimo para criar um objeto apreendido e vinculá-lo a um processo.
 * Mantém o processoId como input numérico (sem busca dedicada) — Padrão Defender.
 */
export function NovoObjetoForm({ onClose, onCreated }: NovoObjetoFormProps) {
  const utils = trpc.useUtils();
  const [tipo, setTipo] = useState<ObjetoTipo>("arma-fogo");
  const [descricaoLivre, setDescricaoLivre] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [placa, setPlaca] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [calibre, setCalibre] = useState("");
  const [tipoDroga, setTipoDroga] = useState("");
  const [valorEstimado, setValorEstimado] = useState("");
  const [processoId, setProcessoId] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const create = trpc.objetos.create.useMutation({
    onSuccess: () => {
      utils.objetos.listCatalogo.invalidate();
      utils.objetos.emMultiplosCasos.invalidate();
      onCreated?.();
      onClose();
    },
    onError: (e) => setErro(e.message),
  });

  const procId = parseInt(processoId, 10);
  const valor = valorEstimado ? parseFloat(valorEstimado.replace(",", ".")) : undefined;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!Number.isFinite(procId) || procId <= 0) {
      setErro("Informe um ID de processo válido.");
      return;
    }
    create.mutate({
      tipo,
      descricaoLivre: descricaoLivre || undefined,
      numeroSerie: numeroSerie || undefined,
      placa: placa || undefined,
      marca: marca || undefined,
      modelo: modelo || undefined,
      calibre: calibre || undefined,
      tipoDroga: tipoDroga || undefined,
      valorEstimado: valor != null && Number.isFinite(valor) ? valor : undefined,
      processoId: procId,
      papel: "apreendido",
      destino: "pendente",
    });
  }

  const isArma = tipo === "arma-fogo" || tipo === "arma-branca";
  const isVeiculo = tipo === "veiculo";
  const isDroga = tipo === "droga";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b dark:border-neutral-800 px-4 py-3">
          <h2 className="text-sm font-semibold">Novo objeto</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-xs text-neutral-500 mb-1 block">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as ObjetoTipo)}
              className="w-full px-2 py-1.5 border rounded text-sm bg-transparent dark:border-neutral-700 cursor-pointer"
            >
              {TIPO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="text-neutral-900">
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {(isArma || isDroga) && (
            <div className="grid grid-cols-2 gap-2">
              {isArma && (
                <>
                  <Field label="Nº de série" value={numeroSerie} onChange={setNumeroSerie} mono />
                  <Field label="Calibre" value={calibre} onChange={setCalibre} />
                </>
              )}
              {isDroga && (
                <Field label="Tipo de droga" value={tipoDroga} onChange={setTipoDroga} />
              )}
            </div>
          )}

          {isVeiculo && (
            <Field label="Placa" value={placa} onChange={setPlaca} mono />
          )}

          <div className="grid grid-cols-2 gap-2">
            <Field label="Marca" value={marca} onChange={setMarca} />
            <Field label="Modelo" value={modelo} onChange={setModelo} />
          </div>

          <div>
            <label className="text-xs text-neutral-500 mb-1 block">Descrição</label>
            <textarea
              value={descricaoLivre}
              onChange={(e) => setDescricaoLivre(e.target.value)}
              rows={2}
              className="w-full px-2 py-1.5 border rounded text-sm bg-transparent dark:border-neutral-700 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Valor estimado (R$)"
              value={valorEstimado}
              onChange={setValorEstimado}
              placeholder="0,00"
            />
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">ID do processo</label>
              <input
                value={processoId}
                onChange={(e) => setProcessoId(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                className="w-full px-2 py-1.5 border rounded text-sm bg-transparent dark:border-neutral-700 font-mono"
                placeholder="ex.: 1234"
              />
            </div>
          </div>

          {erro && <p className="text-xs text-red-500">{erro}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border text-sm cursor-pointer dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="px-3 py-1.5 rounded border text-sm cursor-pointer hover:border-emerald-400 disabled:opacity-50 dark:border-neutral-700"
            >
              {create.isPending ? "Salvando..." : "Criar objeto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  mono,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-neutral-500 mb-1 block">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-2 py-1.5 border rounded text-sm bg-transparent dark:border-neutral-700 ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}
