"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownUp, ListFilter, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { REGISTRO_TIPOS, type TipoRegistro } from "./registro-tipo-config";

export type RegistrosToolbarProps = {
  busca: string;
  onBusca: (v: string) => void;
  filtroTipo: TipoRegistro | null;
  onFiltroTipo: (t: TipoRegistro | null) => void;
  /** Tipos present in the current context, with their counts. */
  tiposComContagem: { tipo: TipoRegistro; count: number }[];
  ordem: "recente" | "antigo";
  onOrdem: (o: "recente" | "antigo") => void;
};

/**
 * RegistrosToolbar — controlled, presentational.
 * Three icon-buttons: Search (expand inline input), ListFilter (tipo dropdown),
 * ArrowDownUp (toggle sort order). No data fetching — all state lives in parent.
 *
 * Tipo filter uses a plain state-driven popover (no Radix portal) so it is
 * deterministic under happy-dom in tests.
 */
export function RegistrosToolbar({
  busca,
  onBusca,
  filtroTipo,
  onFiltroTipo,
  tiposComContagem,
  ordem,
  onOrdem,
}: RegistrosToolbarProps) {
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [filtroOpen, setFiltroOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filtroRef = useRef<HTMLDivElement>(null);

  // Focus the search input whenever it becomes visible.
  useEffect(() => {
    if (searchExpanded) searchInputRef.current?.focus();
  }, [searchExpanded]);

  // Close the tipo dropdown when clicking outside.
  useEffect(() => {
    if (!filtroOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (filtroRef.current && !filtroRef.current.contains(e.target as Node)) {
        setFiltroOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [filtroOpen]);

  const iconBtn = (active: boolean) =>
    cn(
      "p-1 rounded-md transition-colors cursor-pointer",
      active
        ? "text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800"
        : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800",
    );

  return (
    <div className="flex items-center gap-1">
      {/* ── Search ── */}
      <button
        type="button"
        onClick={() => setSearchExpanded((v) => !v)}
        aria-label="Buscar"
        title="Buscar (⌘K)"
        className={iconBtn(!!busca || searchExpanded)}
      >
        <Search className="w-3.5 h-3.5" />
      </button>

      {searchExpanded && (
        <input
          ref={searchInputRef}
          type="text"
          value={busca}
          onChange={(e) => onBusca(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onBusca("");
              setSearchExpanded(false);
            }
          }}
          placeholder="Buscar registros…"
          aria-label="Buscar registros"
          className={cn(
            "flex-1 bg-neutral-50 dark:bg-neutral-800/40",
            "border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700",
            "rounded-md text-[12px] px-2 py-1 outline-none",
            "placeholder:text-neutral-400 transition-colors",
          )}
        />
      )}

      {/* ── Tipo filter ── */}
      <div ref={filtroRef} className="relative">
        <button
          type="button"
          onClick={() => setFiltroOpen((v) => !v)}
          aria-label="Filtrar por tipo"
          title="Filtrar por tipo"
          className={iconBtn(!!filtroTipo || filtroOpen)}
        >
          <ListFilter className="w-3.5 h-3.5" />
        </button>

        {/* Plain div popover — no Radix portal, deterministic in happy-dom tests */}
        {filtroOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[11rem] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1">
            {/* "Todos" resets the filter */}
            <button
              type="button"
              onClick={() => {
                onFiltroTipo(null);
                setFiltroOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-[12px] transition-colors",
                "hover:bg-neutral-50 dark:hover:bg-neutral-800",
                !filtroTipo
                  ? "font-medium text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-600 dark:text-neutral-400",
              )}
            >
              Todos
            </button>

            {tiposComContagem.map(({ tipo, count }) => {
              const cfg = REGISTRO_TIPOS[tipo];
              const Icon = cfg.Icon;
              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => {
                    onFiltroTipo(tipo);
                    setFiltroOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 transition-colors",
                    "hover:bg-neutral-50 dark:hover:bg-neutral-800",
                    filtroTipo === tipo
                      ? "font-medium text-neutral-900 dark:text-neutral-100"
                      : "text-neutral-600 dark:text-neutral-400",
                  )}
                >
                  <Icon
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: cfg.color }}
                  />
                  <span>
                    {cfg.label} ({count})
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Sort order ── */}
      <button
        type="button"
        onClick={() => onOrdem(ordem === "recente" ? "antigo" : "recente")}
        aria-label="Ordenar"
        title={
          ordem === "recente" ? "Mais recente primeiro" : "Mais antigo primeiro"
        }
        className={iconBtn(ordem === "antigo")}
      >
        <ArrowDownUp className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
