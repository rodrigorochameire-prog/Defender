"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { GlassHeaderShell } from "@/components/layouts/header/glass-header-shell";
import { HeaderActionsBar, type HeaderAction } from "@/components/layouts/header/header-actions-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { format, parseISO } from "date-fns";

const PAGE_SIZE = 50;

// ─── Status badge styles (DB enum → label/cores) ────────────────────────
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  "ARQUIVADO":     { bg: "bg-neutral-100 dark:bg-neutral-800/40", text: "text-neutral-500 dark:text-neutral-400", label: "Arquivado" },
  "CONCLUIDO":     { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", label: "Concluído" },
  "7_PROTOCOLADO": { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", label: "Protocolado" },
  "7_CIENCIA":     { bg: "bg-sky-100 dark:bg-sky-900/30", text: "text-sky-700 dark:text-sky-300", label: "Ciência" },
  "7_SEM_ATUACAO": { bg: "bg-neutral-100 dark:bg-neutral-800/50", text: "text-neutral-500 dark:text-neutral-500", label: "Sem Atuação" },
};

const ATRIBUICAO_LABELS: Record<string, string> = {
  "JURI_CAMACARI": "Júri",
  "GRUPO_JURI": "Grupo do Júri",
  "VVD_CAMACARI": "Violência Doméstica",
  "EXECUCAO_PENAL": "Execução Penal",
  "SUBSTITUICAO": "Substituição",
  "SUBSTITUICAO_CIVEL": "Curadoria Especial",
};

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  try {
    const d = typeof value === "string" ? parseISO(value) : value;
    if (isNaN(d.getTime())) return "—";
    return format(d, "dd/MM/yyyy");
  } catch {
    return "—";
  }
}

export default function ArquivoDemandasPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [incluirConcluidas, setIncluirConcluidas] = useState(false);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading } = trpc.demandas.arquivo.useQuery({
    search: search || undefined,
    incluirConcluidas,
    de: de || undefined,
    ate: ate || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const applySearch = () => {
    setSearch(searchInput.trim());
    setPage(0);
  };

  // ── Header rico (GlassHeaderShell) ──────────────────────────────────────
  // collapsedStats duplicava o texto já exibido nos children ("X no
  // histórico") — dedupe: só o texto completo vai para `stats`. O botão
  // "Voltar ao Kanban" vira HeaderAction (back = onSelect + router.push).
  const headerActions: HeaderAction[] = [
    {
      id: "back",
      label: "Voltar ao Kanban",
      icon: ArrowLeft,
      priority: 40,
      onSelect: () => router.push("/admin/demandas"),
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <GlassHeaderShell
        title="Arquivo de Demandas"
        icon={Archive}
        stats={
          <span className="text-[11px] text-white/55 tabular-nums leading-none ml-1.5">
            {total} {total === 1 ? "demanda" : "demandas"} no histórico
          </span>
        }
        actions={<HeaderActionsBar actions={headerActions} />}
      />

      <div className="p-4 space-y-4">

      {/* ─── Filtros ─── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500 mb-1 block">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                placeholder="Assistido, nº dos autos ou ato..."
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500 mb-1 block">
              Concluída de
            </label>
            <Input
              type="date"
              value={de}
              onChange={(e) => { setDe(e.target.value); setPage(0); }}
              className="h-9 text-sm w-[150px]"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500 mb-1 block">
              Até
            </label>
            <Input
              type="date"
              value={ate}
              onChange={(e) => { setAte(e.target.value); setPage(0); }}
              className="h-9 text-sm w-[150px]"
            />
          </div>
          <Button onClick={applySearch} size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white">
            Buscar
          </Button>
          <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 cursor-pointer select-none pb-2">
            <input
              type="checkbox"
              checked={incluirConcluidas}
              onChange={(e) => { setIncluirConcluidas(e.target.checked); setPage(0); }}
              className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700 accent-emerald-600 cursor-pointer"
            />
            Incluir concluídas ainda não arquivadas
          </label>
        </div>
      </div>

      {/* ─── Tabela do histórico ─── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox className="h-8 w-8 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Nenhuma demanda no arquivo
              {search && <> para &ldquo;{search}&rdquo;</>}
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
              Demandas concluídas são arquivadas automaticamente após 30 dias.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200/80 dark:border-neutral-800/80 text-left">
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Assistido</th>
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Autos</th>
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Ato</th>
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Atribuição</th>
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Status</th>
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Concluída em</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => {
                const st = STATUS_STYLES[d.status ?? ""] ?? {
                  bg: "bg-neutral-100 dark:bg-neutral-800/50",
                  text: "text-neutral-500",
                  label: d.status ?? "—",
                };
                return (
                  <tr
                    key={d.id}
                    onClick={() => router.push(`/admin/demandas/${d.id}`)}
                    className="border-b border-neutral-100 dark:border-neutral-800/50 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 font-medium text-neutral-800 dark:text-neutral-200">
                      {d.assistidoNome ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-xs text-neutral-500 dark:text-neutral-400">
                      {d.numeroAutos ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400">
                      {d.ato ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {ATRIBUICAO_LABELS[d.atribuicao ?? ""] ?? d.atribuicao ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge className={`${st.bg} ${st.text} border-0 text-[11px] font-medium`}>
                        {st.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-xs text-neutral-500 dark:text-neutral-400">
                      {formatDate(d.dataConclusao ?? d.updatedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* ─── Paginação ─── */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200/80 dark:border-neutral-800/80">
            <span className="text-xs text-neutral-400 dark:text-neutral-500 tabular-nums">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="h-7 px-2 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Anterior
              </Button>
              <span className="text-xs text-neutral-400 tabular-nums px-1.5">
                {page + 1}/{totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 px-2 text-xs"
              >
                Próxima
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
