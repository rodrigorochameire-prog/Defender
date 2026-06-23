"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Plus, Layers } from "lucide-react";
import {
  objetoIconFor,
  objetoLabelFor,
  TIPO_OPTIONS,
  type ObjetoTipo,
} from "@/components/objetos/objeto-icon";
import { NovoObjetoForm } from "@/components/objetos/novo-objeto-form";

/** Formata um numeric (string da API) como moeda BRL. */
function formatValor(v: string | null): string | null {
  if (v == null) return null;
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ObjetosCatalogoPage() {
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState<ObjetoTipo | "">("");
  const [showForm, setShowForm] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data: items = [], isLoading } = trpc.objetos.listCatalogo.useQuery({
    search: search || undefined,
    tipo: tipo || undefined,
    limit,
    offset,
  });

  const { data: multiplos = [] } = trpc.objetos.emMultiplosCasos.useQuery();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Objetos apreendidos</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 rounded border text-sm flex items-center gap-1 cursor-pointer hover:border-emerald-400 dark:border-neutral-700"
        >
          <Plus className="w-3 h-3" /> Novo objeto
        </button>
      </div>

      {/* Cruzamento entre casos — sinal de alto valor */}
      {multiplos.length > 0 && (
        <div className="mb-5 rounded-lg border border-amber-300/60 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/[0.06] px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1.5 text-amber-700 dark:text-amber-400">
            <Layers className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Em múltiplos casos
            </span>
          </div>
          <ul className="space-y-1">
            {multiplos.map((m) => {
              const Icon = objetoIconFor(m.tipo);
              const ident = m.numeroSerie || m.placa || m.descricao || objetoLabelFor(m.tipo);
              return (
                <li
                  key={m.objetoId}
                  className="flex items-center gap-2 text-[13px] text-amber-800 dark:text-amber-300/90"
                >
                  <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <span className="truncate">
                    {objetoLabelFor(m.tipo)}
                    {ident && (m.numeroSerie || m.placa) ? (
                      <>
                        {" — "}
                        <span className="font-mono">{m.numeroSerie || m.placa}</span>
                      </>
                    ) : ident ? (
                      <> — {ident}</>
                    ) : null}
                  </span>
                  <span className="ml-auto shrink-0 text-xs font-medium text-amber-700 dark:text-amber-400">
                    {m.n} casos
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <input
          placeholder="Buscar (série, placa, marca, descrição)..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
          className="px-2 py-1.5 border rounded text-sm w-72 bg-transparent dark:border-neutral-700"
        />
        <select
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value as ObjetoTipo | "");
            setOffset(0);
          }}
          className="px-2 py-1.5 border rounded text-sm bg-transparent dark:border-neutral-700 cursor-pointer"
        >
          <option value="" className="text-neutral-900">Todos os tipos</option>
          {TIPO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="text-neutral-900">
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && (
        <p className="text-sm text-neutral-400 italic">Carregando...</p>
      )}
      {!isLoading && items.length === 0 && (
        <p className="text-sm text-neutral-400 italic">Nenhum objeto encontrado.</p>
      )}

      <div className="space-y-1.5">
        {items.map((o) => {
          const Icon = objetoIconFor(o.tipo);
          const valor = formatValor(o.valorEstimado);
          return (
            <div
              key={o.id}
              className="rounded-lg border dark:border-neutral-800 px-3 py-2.5 flex items-center gap-3 hover:border-emerald-400/60 transition-colors"
            >
              <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {objetoLabelFor(o.tipo)}
                    {o.subtipo ? ` · ${o.subtipo}` : ""}
                  </span>
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate flex items-center gap-x-2 gap-y-0.5 flex-wrap">
                  {o.numeroSerie && (
                    <span>
                      série <span className="font-mono">{o.numeroSerie}</span>
                    </span>
                  )}
                  {o.placa && (
                    <span>
                      placa <span className="font-mono">{o.placa}</span>
                    </span>
                  )}
                  {(o.marca || o.modelo) && (
                    <span>{[o.marca, o.modelo].filter(Boolean).join(" ")}</span>
                  )}
                  {o.calibre && <span>cal. {o.calibre}</span>}
                  {o.tipoDroga && <span>{o.tipoDroga}</span>}
                  {o.quantidade && (
                    <span>
                      {o.quantidade}
                      {o.unidade ? ` ${o.unidade}` : ""}
                    </span>
                  )}
                  {!o.numeroSerie &&
                    !o.placa &&
                    !o.marca &&
                    !o.modelo &&
                    o.descricaoLivre && (
                      <span className="truncate">{o.descricaoLivre}</span>
                    )}
                </div>
              </div>
              {valor && (
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300 shrink-0 tabular-nums">
                  {valor}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {(offset > 0 || items.length === limit) && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <button
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
            className="px-3 py-1 border rounded cursor-pointer disabled:opacity-40 dark:border-neutral-700"
          >
            ← Anterior
          </button>
          <button
            disabled={items.length < limit}
            onClick={() => setOffset((o) => o + limit)}
            className="px-3 py-1 border rounded cursor-pointer disabled:opacity-40 dark:border-neutral-700"
          >
            Próxima →
          </button>
        </div>
      )}

      {showForm && <NovoObjetoForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
