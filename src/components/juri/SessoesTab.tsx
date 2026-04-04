"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  User,
  Copy,
  Gavel,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

interface SessoesTabProps {
  // no props needed — queries are internal
}

const STATUS_STYLE = {
  agendada:   { icon: Calendar,     color: "bg-blue-500",    badge: "bg-blue-500/10 text-blue-600 ring-blue-500/20",    label: "Agendada" },
  realizada:  { icon: CheckCircle2, color: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20", label: "Realizada" },
  adiada:     { icon: Clock,        color: "bg-amber-500",   badge: "bg-amber-500/10 text-amber-600 ring-amber-500/20",  label: "Adiada" },
  cancelada:  { icon: XCircle,      color: "bg-neutral-400",    badge: "bg-neutral-400/10 text-muted-foreground ring-neutral-400/20",     label: "Cancelada" },
} as const;

type StatusKey = keyof typeof STATUS_STYLE;

const RESULTADO_BADGE: Record<string, { label: string; cls: string }> = {
  absolvicao:        { label: "Absolvido",         cls: "bg-emerald-600 text-white" },
  ABSOLVICAO:        { label: "Absolvido",         cls: "bg-emerald-600 text-white" },
  condenacao:        { label: "Condenado",         cls: "bg-rose-600 text-white" },
  CONDENACAO:        { label: "Condenado",         cls: "bg-rose-600 text-white" },
  desclassificacao:  { label: "Desclassificado",   cls: "bg-amber-500 text-white" },
  DESCLASSIFICACAO:  { label: "Desclassificado",   cls: "bg-amber-500 text-white" },
};

function normaliseStatus(raw: string | null | undefined): StatusKey {
  const lower = (raw ?? "agendada").toLowerCase() as StatusKey;
  return lower in STATUS_STYLE ? lower : "agendada";
}

function formatDateParts(date: Date) {
  const diaSemana = date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  const dia = date.getDate();
  const mes = date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return { diaSemana, dia, mes };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SessoesTab(_props: SessoesTabProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: sessoes, isLoading } = trpc.juri.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 50,
  });

  const filtered = useMemo(() => {
    if (!sessoes) return [];
    if (!search.trim()) return sessoes;
    const q = search.toLowerCase();
    return sessoes.filter(
      (s) =>
        s.assistidoNome?.toLowerCase().includes(q) ||
        s.defensorNome?.toLowerCase().includes(q) ||
        s.processo?.numeroAutos?.includes(q),
    );
  }, [sessoes, search]);

  // --- copy helper ---
  function copyNumero(e: React.MouseEvent, numero: string) {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(numero);
    toast.success("Numero copiado");
  }

  // --- loading skeleton ---
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ---------- search + filter bar ---------- */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar reu, processo, defensor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-8 text-xs shrink-0">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="AGENDADA">Agendadas</SelectItem>
            <SelectItem value="REALIZADA">Realizadas</SelectItem>
            <SelectItem value="ADIADA">Adiadas</SelectItem>
            <SelectItem value="CANCELADA">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ---------- empty state ---------- */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Gavel className="w-10 h-10 mb-3 text-muted-foreground/30" />
          <p className="text-[13px] text-muted-foreground">Nenhuma sessao encontrada</p>
          <p className="text-[10px] text-muted-foreground mt-1">Ajuste os filtros ou cadastre uma nova sessao</p>
        </div>
      )}

      {/* ---------- session list ---------- */}
      <div className="space-y-1.5">
        {filtered.map((sessao) => {
          const status = normaliseStatus(sessao.status);
          const cfg = STATUS_STYLE[status];
          const StatusIcon = cfg.icon;
          const resultado = sessao.resultado ? RESULTADO_BADGE[sessao.resultado] : null;
          const dataSessao = sessao.dataSessao ? new Date(sessao.dataSessao) : null;
          const dp = dataSessao ? formatDateParts(dataSessao) : null;

          return (
            <div
              key={sessao.id}
              onClick={() => router.push(`/admin/juri/${sessao.id}`)}
              className="group relative flex items-center gap-3 rounded-xl border border-border bg-card hover:border-emerald-300/60 dark:hover:border-emerald-700/40 transition-all cursor-pointer overflow-hidden"
            >
              {/* left color bar */}
              <div className={cn("absolute left-0 inset-y-0 w-1 rounded-l-xl", cfg.color)} />

              {/* date block */}
              <div className="pl-4 pr-1 py-3 text-center w-16 shrink-0">
                {dp ? (
                  <>
                    <p className="text-[9px] uppercase font-medium text-muted-foreground leading-none">{dp.diaSemana}</p>
                    <p className="text-lg font-bold text-foreground leading-tight">{dp.dia}</p>
                    <p className="text-[9px] uppercase text-muted-foreground leading-none">{dp.mes}</p>
                  </>
                ) : (
                  <span className="text-[10px] text-muted-foreground">--</span>
                )}
              </div>

              {/* main info */}
              <div className="flex-1 min-w-0 py-2.5">
                <Link
                  href={`/admin/assistidos?q=${encodeURIComponent(sessao.assistidoNome ?? "")}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[13px] font-medium text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 truncate block transition-colors"
                >
                  {sessao.assistidoNome || "Reu nao informado"}
                </Link>

                <div className="flex items-center gap-1.5 mt-0.5">
                  {sessao.processo?.numeroAutos && (
                    <>
                      <Link
                        href={`/admin/processos?q=${encodeURIComponent(sessao.processo.numeroAutos)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] font-mono text-muted-foreground hover:text-emerald-600 transition-colors truncate"
                      >
                        {sessao.processo.numeroAutos}
                      </Link>
                      <button
                        onClick={(e) => copyNumero(e, sessao.processo!.numeroAutos!)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
                        title="Copiar numero"
                      >
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </>
                  )}
                  {sessao.defensorNome && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground ml-1">
                      <User className="w-3 h-3" />
                      {sessao.defensorNome.split(" ")[0]}
                    </span>
                  )}
                </div>
              </div>

              {/* badges */}
              <div className="flex items-center gap-1.5 pr-4 shrink-0">
                {resultado && (
                  <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-md", resultado.cls)}>
                    {resultado.label}
                  </span>
                )}
                <span className={cn("inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-md ring-1 ring-inset", cfg.badge)}>
                  <StatusIcon className="w-3 h-3" />
                  {cfg.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
