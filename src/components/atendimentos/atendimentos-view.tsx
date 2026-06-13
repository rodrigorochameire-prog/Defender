"use client";

// Página Atendimentos — pauta de atendimentos do defensor, agrupada por dia,
// com KPIs, filtros (status, tipo, área, período, busca) e fluxo completo
// (agendar → realizar/cancelar → relato). Integra a agenda: cada atendimento
// agendado aparece também em /admin/agenda (fonte registros) e no feed ICS.

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  Clock,
  FileText,
  Handshake,
  History,
  Link2,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AREA_CONFIG,
  AREA_OPTIONS,
  STATUS_CONFIG,
  SUBTIPO_CONFIG,
  SUBTIPO_OPTIONS,
  type AtendimentoListItem,
} from "./config";
import { AtendimentoDetailSheet } from "./atendimento-detail-sheet";
import { AtendimentoFormModal } from "./atendimento-form-modal";
import {
  PERIODO_OPTIONS,
  agruparPorDia,
  isPendente,
  rangeFromPreset,
  rotuloDia,
  type PeriodoPreset,
} from "./agenda-helpers";

const STATUS_FILTROS = [
  { value: "todos", label: "Todos" },
  { value: "agendado", label: "Agendados" },
  { value: "realizado", label: "Realizados" },
  { value: "cancelado", label: "Cancelados" },
];

export default function AtendimentosView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [subtipoFiltro, setSubtipoFiltro] = useState("todos");
  const [areaFiltro, setAreaFiltro] = useState("todas");
  const [periodo, setPeriodo] = useState<PeriodoPreset>("recentes");
  // Isola os atendimentos que já aconteceram e seguem sem registro (a registrar).
  const [apenasPendentes, setApenasPendentes] = useState(false);
  const [detalhe, setDetalhe] = useState<AtendimentoListItem | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<AtendimentoListItem | null>(null);

  // ?novo=1 abre o modal de criação (rota /admin/atendimentos/novo redireciona pra cá)
  useEffect(() => {
    if (searchParams.get("novo") === "1") {
      setModalAberto(true);
      router.replace(pathname);
    }
  }, [searchParams, router, pathname]);

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca.trim()), 300);
    return () => clearTimeout(t);
  }, [busca]);

  const { data: kpis } = trpc.registros.atendimentosKpis.useQuery();

  // Quando "a registrar" está ativo, a janela vira ampla (passado) para varrer
  // todos os agendados vencidos — o filtro fino é client-side por horário.
  const range = useMemo(
    () => rangeFromPreset(apenasPendentes ? "passados" : periodo),
    [periodo, apenasPendentes]
  );
  const { data: atendimentos = [], isLoading } = trpc.registros.listAtendimentos.useQuery({
    ...(statusFiltro !== "todos" ? { status: [statusFiltro as "agendado" | "realizado" | "cancelado"] } : {}),
    ...(subtipoFiltro !== "todos" ? { subtipo: subtipoFiltro as "inicial" | "retorno" } : {}),
    ...(areaFiltro !== "todas"
      ? { area: areaFiltro as "CRIMINAL" | "VIOLENCIA_DOMESTICA" | "JURI" | "EXECUCAO_PENAL" | "CIVEL" | "FAMILIA" | "OUTRA" }
      : {}),
    ...(buscaDebounced ? { search: buscaDebounced } : {}),
    ...range,
  });

  const visiveis = useMemo(() => {
    const lista = atendimentos as AtendimentoListItem[];
    return apenasPendentes ? lista.filter((a) => isPendente(a)) : lista;
  }, [atendimentos, apenasPendentes]);

  // Agrupa por dia, ordenação centrada em hoje (hoje → próximos → anteriores).
  const porDia = useMemo(() => agruparPorDia(visiveis), [visiveis]);

  // Mantém o sheet em sincronia após mutações (lista re-busca → item atualizado)
  useEffect(() => {
    if (!detalhe) return;
    const atualizado = (atendimentos as AtendimentoListItem[]).find((a) => a.id === detalhe.id);
    if (atualizado && atualizado !== detalhe) setDetalhe(atualizado);
  }, [atendimentos, detalhe]);

  const abrirEdicao = (item: AtendimentoListItem) => {
    setEditando(item);
    setModalAberto(true);
  };

  const kpiCards = [
    {
      key: "aRegistrar",
      label: "A registrar",
      value: kpis?.aRegistrar ?? 0,
      icon: AlertCircle,
      border: "border-l-amber-500",
      text: "text-amber-600 dark:text-amber-400",
      action: () => setApenasPendentes((v) => !v),
      active: apenasPendentes,
    },
    { key: "hoje", label: "Hoje", value: kpis?.hoje ?? 0, icon: CalendarDays, border: "border-l-rose-500", text: "text-rose-600 dark:text-rose-400" },
    { key: "semana", label: "Próximos 7 dias", value: kpis?.semana ?? 0, icon: CalendarRange, border: "border-l-sky-500", text: "text-sky-600 dark:text-sky-400" },
    { key: "mes", label: "Realizados no mês", value: kpis?.realizadosMes ?? 0, icon: CalendarCheck, border: "border-l-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  ];

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-[#0f0f11]">
      <CollapsiblePageHeader
        title="Atendimentos"
        icon={Handshake}
        collapsedStats={
          <span className="text-[11px] text-white/60">{visiveis.length} na lista</span>
        }
        bottomRow={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar assistido, nº SOLAR ou CNJ…"
                className="w-full h-8 rounded-lg bg-white/10 border border-white/10 pl-8 pr-3 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
              />
            </div>
            <div className="flex items-center rounded-lg bg-white/10 border border-white/10 p-0.5">
              {STATUS_FILTROS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStatusFiltro(s.value)}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    statusFiltro === s.value
                      ? "bg-white text-neutral-900"
                      : "text-white/65 hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <FiltroSelect
              value={subtipoFiltro}
              onChange={setSubtipoFiltro}
              options={[{ value: "todos", label: "Tipo: todos" }, ...SUBTIPO_OPTIONS.map((o) => ({ value: o.value, label: o.label }))]}
            />
            <FiltroSelect
              value={areaFiltro}
              onChange={setAreaFiltro}
              options={[{ value: "todas", label: "Área: todas" }, ...AREA_OPTIONS]}
            />
            <FiltroSelect
              value={periodo}
              onChange={(v) => setPeriodo(v as PeriodoPreset)}
              options={PERIODO_OPTIONS}
            />
          </div>
        }
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#525252] flex items-center justify-center shrink-0">
              <Handshake className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-white text-[15px] font-semibold tracking-tight leading-tight">
                Atendimentos
              </h1>
              <p className="text-[10px] text-white/55">
                Pauta de atendimentos aos assistidos — integrada à agenda
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditando(null);
              setModalAberto(true);
            }}
            className="h-8 px-3 rounded-xl bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition-all duration-150 cursor-pointer flex items-center gap-1.5 text-[11px] font-semibold shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Novo Atendimento</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </CollapsiblePageHeader>

      <div className="px-5 md:px-8 py-3 md:py-4 space-y-4">
        {/* KPIs — "A registrar" é clicável e isola os pendentes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {kpiCards.map((s) => {
            const Icon = s.icon;
            const clicavel = !!s.action;
            return (
              <Card
                key={s.key}
                onClick={s.action}
                className={cn(
                  "border-l-2 transition-all",
                  s.border,
                  clicavel && "cursor-pointer hover:shadow-md",
                  s.active && "ring-2 ring-amber-400/60 shadow-md"
                )}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-muted shadow-sm">
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${s.text}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xl sm:text-2xl font-bold ${s.text}`}>{s.value}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {apenasPendentes && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300/70 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-900/15 px-4 py-2.5">
            <p className="text-[12px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Mostrando só atendimentos que já aconteceram e seguem sem registro.
            </p>
            <button
              onClick={() => setApenasPendentes(false)}
              className="text-[11px] font-medium text-amber-700 dark:text-amber-400 hover:underline cursor-pointer shrink-0"
            >
              Ver todos
            </button>
          </div>
        )}

        {/* Lista agrupada por dia */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : porDia.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="text-center py-16">
              <div className="mx-auto w-14 h-14 rounded-full bg-neutral-200/60 dark:bg-neutral-800 flex items-center justify-center mb-4">
                <Handshake className="w-7 h-7 text-neutral-400" />
              </div>
              <h3 className="text-base font-medium text-foreground/80 mb-1">
                {apenasPendentes ? "Nada a registrar" : "Nenhum atendimento no período"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {apenasPendentes
                  ? "Todos os atendimentos que já aconteceram foram registrados. Bom trabalho."
                  : "Ajuste os filtros ou agende um novo atendimento."}
              </p>
            </CardContent>
          </Card>
        ) : (
          porDia.map(({ dia, itens }) => {
            const rotulo = rotuloDia(dia);
            return (
              <section key={dia}>
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {rotulo ?? format(new Date(`${dia}T12:00:00`), "EEEE, d 'de' MMMM", { locale: ptBR })}
                  <span className="ml-2 font-normal normal-case">
                    · {itens.length} atendimento{itens.length > 1 ? "s" : ""}
                  </span>
                </h2>
                <div className="space-y-1.5">
                  {itens.map((a) => (
                    <AtendimentoCard key={a.id} atendimento={a} onClick={() => setDetalhe(a)} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>

      <AtendimentoDetailSheet
        atendimento={detalhe}
        open={!!detalhe}
        onClose={() => setDetalhe(null)}
        onEdit={abrirEdicao}
      />

      <AtendimentoFormModal
        open={modalAberto}
        onClose={() => {
          setModalAberto(false);
          setEditando(null);
        }}
        editing={editando}
      />
    </div>
  );
}

// ─── Card de atendimento na pauta ──────────────────────────────────────────

function AtendimentoCard({
  atendimento: a,
  onClick,
}: {
  atendimento: AtendimentoListItem;
  onClick: () => void;
}) {
  const dt = new Date(a.dataRegistro);
  const status = STATUS_CONFIG[a.status ?? "agendado"] ?? STATUS_CONFIG.agendado;
  const subtipo = a.subtipo ? SUBTIPO_CONFIG[a.subtipo] : null;
  const area = a.area ? AREA_CONFIG[a.area] : null;
  const cancelado = a.status === "cancelado";
  const pendente = isPendente(a);
  const citados = (a.processosCitados ?? []).length;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border bg-white dark:bg-neutral-900 border-neutral-200/70 dark:border-neutral-800 border-l-2 px-3 py-2.5 hover:shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-150 cursor-pointer",
        pendente
          ? "border-l-amber-500 bg-amber-50/40 dark:bg-amber-900/10"
          : area?.border ?? "border-l-neutral-300",
        cancelado && "opacity-55"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-14 text-center">
          <p className="font-mono text-sm font-semibold text-foreground/90">
            {format(dt, "HH:mm")}
          </p>
          {pendente ? (
            <span className="inline-flex items-center gap-0.5 mt-0.5 rounded px-1.5 py-px text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <Clock className="w-2.5 h-2.5" /> registrar
            </span>
          ) : (
            <span className={`inline-block mt-0.5 rounded px-1.5 py-px text-[10px] font-medium ${status.badge}`}>
              {status.label}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-semibold text-foreground/90 truncate ${cancelado ? "line-through" : ""}`}>
              {a.assistido?.nome ?? "Assistido não identificado"}
            </p>
            {subtipo && (
              <span className={`rounded px-1.5 py-px text-[10px] font-medium ${subtipo.badge}`}>
                {subtipo.label}
              </span>
            )}
            {area && (
              <span className={`rounded px-1.5 py-px text-[10px] font-medium ${area.badge}`}>
                {area.shortLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
            {a.numeroSolar && (
              <span className="font-mono inline-flex items-center gap-1">
                <FileText className="w-3 h-3" /> {a.numeroSolar}
              </span>
            )}
            {a.processo?.numeroAutos && (
              <span className="font-mono inline-flex items-center gap-1">
                <Link2 className="w-3 h-3" /> {a.processo.numeroAutos}
              </span>
            )}
            {!a.processo && citados > 0 && (
              <span className="inline-flex items-center gap-1">
                <Link2 className="w-3 h-3" /> {citados} processo{citados > 1 ? "s" : ""} citado{citados > 1 ? "s" : ""}
              </span>
            )}
            {a.historicoSolar && a.historicoSolar.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <History className="w-3 h-3" /> histórico
              </span>
            )}
            {a.dossieAtendimento && (
              <span className="inline-flex items-center gap-1 text-violet-500 dark:text-violet-400">
                <Sparkles className="w-3 h-3" />
                {a.dossieAtendimento.fonte === "skill" ? "dossiê" : "contexto"}
              </span>
            )}
            {a.pedido && <span className="truncate">{a.pedido}</span>}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 shrink-0" />
      </div>
    </button>
  );
}

// ─── Select compacto para a linha de filtros do header (charcoal) ──────────

function FiltroSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-auto min-w-[110px] rounded-lg bg-white/10 border-white/10 text-[11px] text-white [&>svg]:text-white/50">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
