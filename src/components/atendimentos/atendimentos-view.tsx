"use client";

// Página Atendimentos — pauta de atendimentos do defensor, agrupada por dia,
// com KPIs, filtros (status, tipo, área, período, busca) e fluxo completo
// (agendar → realizar/cancelar → relato). Integra a agenda: cada atendimento
// agendado aparece também em /admin/agenda (fonte registros) e no feed ICS.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { HeaderSlotTitle } from "@/components/layouts/header-slot-title";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  BarChart3,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Handshake,
  Layers,
  LayoutGrid,
  Link2,
  List,
  ListPlus,
  Loader2,
  Plus,
  RotateCcw,
  Scale,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AREA_OPTIONS,
  STATUS_CONFIG,
  SUBTIPO_CONFIG,
  SUBTIPO_OPTIONS,
  type AtendimentoListItem,
} from "./config";
import { getAtribuicaoColors } from "@/lib/config/atribuicoes";
import { AtendimentoDetailSheet } from "./atendimento-detail-sheet";
import { AtendimentoFormModal, type AtendimentoPrefill } from "./atendimento-form-modal";
import { AtendimentosCards } from "./atendimentos-cards";
import { AtendimentosCalendar } from "./atendimentos-calendar";
import { AtendimentosInsights } from "./atendimentos-insights";

// Visões da pauta de atendimentos — Lista (denso), Cards (grade) e Agenda (mês).
// O alternador fica no header. Insights é um toggle separado (painel sobreposto).
const VISTAS = [
  { key: "lista", label: "Lista", icon: List },
  { key: "cards", label: "Cards", icon: LayoutGrid },
  { key: "calendario", label: "Agenda", icon: CalendarDays },
] as const;
type Vista = (typeof VISTAS)[number]["key"];
import {
  PERIODO_OPTIONS,
  agruparPorDia,
  isPendente,
  rangeFromPreset,
  rotuloDia,
  type PeriodoPreset,
} from "./agenda-helpers";

const STATUS_FILTROS = [
  { value: "todos", label: "Todos", icon: Layers },
  { value: "agendado", label: "Agendados", icon: Clock },
  { value: "realizado", label: "Realizados", icon: Check },
  { value: "cancelado", label: "Cancelados", icon: X },
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
  const [retornoPrefill, setRetornoPrefill] = useState<AtendimentoPrefill | null>(null);
  // Deep-link vindo do dashboard: ?abrir=<id> abre o atendimento assim que carregar.
  const [abrirId, setAbrirId] = useState<number | null>(null);
  const [vista, setVista] = useState<Vista>("lista");
  // Insights deixou de ser uma vista: agora é um painel sobreposto, ativado por
  // um toggle no header, que aparece acima de qualquer vista ativa.
  const [mostrarInsights, setMostrarInsights] = useState(false);
  const [novoInicialDate, setNovoInicialDate] = useState<string | null>(null);

  // Deep-links: ?novo=1 (criar), ?pendentes=1 (filtro a registrar), ?abrir=<id> (sheet)
  useEffect(() => {
    const novo = searchParams.get("novo") === "1";
    const pendentes = searchParams.get("pendentes") === "1";
    const abrir = searchParams.get("abrir");
    if (novo) setModalAberto(true);
    if (pendentes) setApenasPendentes(true);
    if (abrir) setAbrirId(Number(abrir));
    if (novo || pendentes || abrir) router.replace(pathname);
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

  // Abre o atendimento do deep-link assim que ele aparecer na lista carregada.
  useEffect(() => {
    if (abrirId == null) return;
    const alvo = (atendimentos as AtendimentoListItem[]).find((a) => a.id === abrirId);
    if (alvo) {
      setDetalhe(alvo);
      setAbrirId(null);
    }
  }, [abrirId, atendimentos]);

  const abrirEdicao = (item: AtendimentoListItem) => {
    setRetornoPrefill(null);
    setEditando(item);
    setModalAberto(true);
  };

  const agendarRetorno = (item: AtendimentoListItem) => {
    setEditando(null);
    setRetornoPrefill({
      assistidoId: item.assistidoId,
      assistidoNome: item.assistido?.nome ?? "",
      processoId: item.processoId,
      area: item.area,
      subtipo: "retorno",
      pedido: item.pedido,
    });
    setModalAberto(true);
  };

  const kpiCards = [
    {
      key: "aRegistrar",
      label: "A registrar",
      value: kpis?.aRegistrar ?? 0,
      icon: AlertCircle,
      text: "text-amber-500",
      action: () => setApenasPendentes((v) => !v),
      active: apenasPendentes,
    },
    { key: "hoje", label: "Hoje", value: kpis?.hoje ?? 0, icon: CalendarDays, text: "text-rose-500" },
    { key: "semana", label: "Próximos 7 dias", value: kpis?.semana ?? 0, icon: CalendarRange, text: "text-sky-500" },
    { key: "mes", label: "Realizados no mês", value: kpis?.realizadosMes ?? 0, icon: CalendarCheck, text: "text-emerald-500" },
  ];

  // Quantidade de filtros secundários ativos (subtipo/área) — alimenta o badge
  // do botão "Filtros", que agrupa os selects e tira ruído do header.
  const filtrosAtivos =
    (subtipoFiltro !== "todos" ? 1 : 0) + (areaFiltro !== "todas" ? 1 : 0);

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-[#0f0f11]">
      {/* Título + contagem portados para a utility row (padrão Demandas) */}
      <HeaderSlotTitle
        icon={Handshake}
        title="Atendimentos"
        accentHex="#10b981"
        stats={
          <>
            <span className="text-white/85 font-semibold">{visiveis.length}</span>
            {(kpis?.aRegistrar ?? 0) > 0 && (
              <span
                className="flex items-center gap-1"
                title={`${kpis?.aRegistrar} a registrar`}
              >
                <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                <span className="font-medium text-amber-300/90">{kpis?.aRegistrar}</span>
              </span>
            )}
          </>
        }
      />

      <CollapsiblePageHeader
        title="Atendimentos"
        icon={Handshake}
        collapsedStats={
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#464649] dark:bg-white/[0.10] text-white/90 tabular-nums">
            {visiveis.length} na lista
          </span>
        }
        collapsedSearch={
          <div className="relative w-[140px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-[#3a3a3c] border border-[#505052] rounded-md py-1 pl-6 pr-2 text-[9px] text-white/90 placeholder:text-white/40 outline-none focus:ring-1 focus:ring-emerald-400/40"
            />
          </div>
        }
        bottomRow={
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar assistido, nº SOLAR ou CNJ…"
                className="w-full h-8 rounded-lg bg-white/10 border border-white/10 pl-8 pr-3 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
              />
            </div>
            {/* Filtro de status — pills icon-only (label no tooltip/aria) */}
            <div className="flex items-center rounded-lg bg-white/10 border border-white/10 p-0.5 shrink-0">
              {STATUS_FILTROS.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.value}
                    onClick={() => setStatusFiltro(s.value)}
                    title={s.label}
                    aria-label={s.label}
                    aria-pressed={statusFiltro === s.value}
                    className={cn(
                      "h-7 w-7 rounded-md inline-flex items-center justify-center transition-colors cursor-pointer",
                      statusFiltro === s.value
                        ? "bg-white text-neutral-900"
                        : "text-white/65 hover:text-white"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>

            {/* Alternador de vista — Lista / Cards / Agenda (relocado para o header) */}
            <div className="flex items-center rounded-lg bg-white/10 border border-white/10 p-0.5 shrink-0">
              {VISTAS.map((v) => {
                const Icon = v.icon;
                const ativa = vista === v.key;
                return (
                  <button
                    key={v.key}
                    onClick={() => setVista(v.key)}
                    title={v.label}
                    aria-label={v.label}
                    aria-pressed={ativa}
                    className={cn(
                      "h-7 w-7 rounded-md inline-flex items-center justify-center transition-colors cursor-pointer",
                      ativa
                        ? "bg-white text-neutral-900"
                        : "text-white/65 hover:text-white"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>

            {/* Filtros secundários agrupados num popover — tira ruído do header */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  title="Filtros"
                  className={cn(
                    "relative h-8 px-2.5 rounded-lg border inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer shrink-0",
                    filtrosAtivos > 0
                      ? "bg-white/20 border-white/20 text-white"
                      : "bg-white/10 border-white/10 text-white/70 hover:text-white"
                  )}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Filtros</span>
                  {filtrosAtivos > 0 && (
                    <span className="ml-0.5 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-emerald-500 text-white text-[9px] font-semibold">
                      {filtrosAtivos}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={6} className="w-60 p-3 rounded-xl space-y-2.5">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tipo</p>
                  <FiltroSelect
                    variant="light"
                    value={subtipoFiltro}
                    onChange={setSubtipoFiltro}
                    options={[{ value: "todos", label: "Todos" }, ...SUBTIPO_OPTIONS.map((o) => ({ value: o.value, label: o.label }))]}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Área</p>
                  <FiltroSelect
                    variant="light"
                    value={areaFiltro}
                    onChange={setAreaFiltro}
                    options={[{ value: "todas", label: "Todas" }, ...AREA_OPTIONS]}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Período</p>
                  <FiltroSelect
                    variant="light"
                    value={periodo}
                    onChange={(v) => setPeriodo(v as PeriodoPreset)}
                    options={PERIODO_OPTIONS}
                  />
                </div>
                {filtrosAtivos > 0 && (
                  <button
                    onClick={() => {
                      setSubtipoFiltro("todos");
                      setAreaFiltro("todas");
                    }}
                    className="w-full h-7 rounded-lg text-[11px] font-medium text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Limpar filtros
                  </button>
                )}
              </PopoverContent>
            </Popover>

            {/* Toggle Insights — painel sobreposto, independente da vista ativa */}
            <button
              onClick={() => setMostrarInsights((v) => !v)}
              title="Insights"
              aria-label="Insights"
              aria-pressed={mostrarInsights}
              className={cn(
                "h-8 w-8 rounded-lg border inline-flex items-center justify-center transition-colors cursor-pointer shrink-0",
                mostrarInsights
                  ? "bg-emerald-500 border-emerald-400 text-white"
                  : "bg-white/10 border-white/10 text-white/70 hover:text-white"
              )}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                setEditando(null);
                setModalAberto(true);
              }}
              title="Novo atendimento"
              aria-label="Novo atendimento"
              className="h-8 w-8 rounded-lg bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition-colors duration-150 cursor-pointer inline-flex items-center justify-center shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        }
        seamless
      />

      <div className="px-5 md:px-8 py-3 md:py-4 space-y-4">
        {/* Stats — barra inline enxuta; "A registrar" alterna o filtro de pendentes */}
        <div className="flex items-stretch rounded-xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 divide-x divide-neutral-200/70 dark:divide-neutral-800 overflow-hidden shadow-sm">
          {kpiCards.map((s) => {
            const Icon = s.icon;
            const clicavel = !!s.action;
            const Comp = clicavel ? "button" : "div";
            return (
              <Comp
                key={s.key}
                onClick={s.action}
                className={cn(
                  "flex items-center gap-2.5 px-3.5 sm:px-4 py-2.5 flex-1 min-w-0 text-left transition-colors outline-none",
                  clicavel && "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40 focus-visible:bg-neutral-50 dark:focus-visible:bg-neutral-800/40",
                  s.active && "bg-amber-50/70 dark:bg-amber-900/15"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", s.text)} />
                <span className="text-lg sm:text-xl font-semibold tabular-nums text-foreground leading-none">
                  {s.value}
                </span>
                <span className="text-[11px] text-muted-foreground leading-tight truncate hidden xs:block sm:block">
                  {s.label}
                </span>
              </Comp>
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

        {/* Painel de Insights — sobreposto, visível em qualquer vista quando ativo */}
        {mostrarInsights && <AtendimentosInsights />}

        {/* Conteúdo conforme a visão */}
        {vista === "calendario" ? (
          <AtendimentosCalendar
            itens={visiveis}
            onOpen={setDetalhe}
            onNovoNoDia={(dia) => {
              setEditando(null);
              setRetornoPrefill(null);
              setNovoInicialDate(format(dia, "yyyy-MM-dd"));
              setModalAberto(true);
            }}
          />
        ) : isLoading ? (
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
        ) : vista === "cards" ? (
          <AtendimentosCards porDia={porDia} onOpen={setDetalhe} />
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
        onAgendarRetorno={agendarRetorno}
      />

      <AtendimentoFormModal
        open={modalAberto}
        onClose={() => {
          setModalAberto(false);
          setEditando(null);
          setRetornoPrefill(null);
          setNovoInicialDate(null);
        }}
        editing={editando}
        prefill={retornoPrefill}
        initialDate={novoInicialDate}
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
  // Cor/badge da área derivam da atribuição do PROCESSO vinculado (mais fiel que
  // a.area, que costuma vir genérica "CRIMINAL"). Fallback: area do atendimento.
  const areaKey = a.processo?.atribuicao || a.processo?.area || a.area || null;
  const areaColors = areaKey ? getAtribuicaoColors(areaKey) : null;
  const areaHexColor = areaColors?.color ?? getAtribuicaoColors(null).color;
  const cancelado = a.status === "cancelado";
  const agendado = a.status === "agendado";
  const pendente = isPendente(a);
  const citados = (a.processosCitados ?? []).length;

  return (
    <div
      data-atendimento-card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group/card relative overflow-hidden w-full text-left rounded-xl border bg-white dark:bg-neutral-900 border-neutral-200/70 dark:border-neutral-800 pl-4 pr-3 py-2.5 hover:shadow-md hover:-translate-y-px hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50",
        cancelado && "opacity-55"
      )}
    >
      {/* Acento da área — pill arredondado que cresce e ganha brilho no hover */}
      <span
        aria-hidden
        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full opacity-70 transition-all duration-300 group-hover/card:top-1 group-hover/card:bottom-1 group-hover/card:w-1 group-hover/card:opacity-100"
        style={{ backgroundColor: areaHexColor }}
      />
      {/* Wash sutil da cor da área no hover — profundidade sem poluir */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-24 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
        style={{ backgroundImage: `linear-gradient(to right, ${areaHexColor}1f, transparent)` }}
      />
      <div className="relative flex items-center gap-3">
        <div className="shrink-0 w-14 text-center">
          <p className="font-mono text-sm font-semibold text-foreground/90">
            {format(dt, "HH:mm")}
          </p>
          {pendente ? (
            <span className="inline-flex items-center gap-0.5 mt-0.5 rounded px-1.5 py-px text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <Clock className="w-2.5 h-2.5" /> registrar
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 mt-0.5 rounded px-1.5 py-px text-[10px] font-medium bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              <span className={cn("w-1 h-1 rounded-full", status.dot)} />
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
              <span className="rounded px-1.5 py-px text-[10px] font-medium bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                {subtipo.label}
              </span>
            )}
            {areaColors && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: areaHexColor }} />
                {areaColors.shortLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
            {/* Processo primeiro — copiável, com tooltip */}
            {a.processo?.numeroAutos && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard?.writeText(a.processo!.numeroAutos!);
                  toast.success("Nº do processo copiado");
                }}
                className="font-mono inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                title="Processo vinculado — clique para copiar o nº"
                aria-label={`Copiar processo ${a.processo.numeroAutos}`}
              >
                <Scale className="w-3 h-3" /> {a.processo.numeroAutos}
                <Copy className="w-2.5 h-2.5 opacity-40" />
              </button>
            )}
            {!a.processo && citados > 0 && (
              <span className="inline-flex items-center gap-1" title="Processos citados nas anotações da recepção">
                <Link2 className="w-3 h-3" /> {citados} citado{citados > 1 ? "s" : ""}
              </span>
            )}
            {/* SOLAR depois do processo */}
            {a.numeroSolar && (
              <span className="font-mono inline-flex items-center gap-1" title="Número SOLAR">
                <FileText className="w-3 h-3" /> {a.numeroSolar}
              </span>
            )}
            {a.dossieAtendimento && (
              <span
                className="inline-flex items-center text-muted-foreground"
                title={a.dossieAtendimento.fonte === "skill" ? "Dossiê preparado" : "Contexto preparado"}
                aria-label={a.dossieAtendimento.fonte === "skill" ? "Dossiê preparado" : "Contexto preparado"}
              >
                <Sparkles className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        {/* Ações rápidas — aparecem no hover da linha; cada uma isola o clique */}
        <QuickAcoes atendimento={a} onAbrir={onClick} />
        {agendado && <QuickRegistrar atendimento={a} destaque={pendente} />}
        {cancelado && <QuickReativar atendimento={a} />}
        <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 shrink-0" />
      </div>
    </div>
  );
}

// ─── Ações rápidas da linha — cluster que surge no hover, sem abrir o sheet ──

function QuickAcoes({
  atendimento: a,
  onAbrir,
}: {
  atendimento: AtendimentoListItem;
  onAbrir: () => void;
}) {
  const utils = trpc.useUtils();
  const agendado = a.status === "agendado";
  const assistidoId = a.assistido?.id ?? a.assistidoId;

  const marcarRealizado = trpc.registros.update.useMutation({
    onSuccess: () => {
      utils.registros.listAtendimentos.invalidate();
      utils.registros.atendimentosKpis.invalidate();
      utils.registros.listAgendados.invalidate();
      toast.success("Atendimento marcado como realizado");
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  return (
    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/card:opacity-100 focus-within:opacity-100 transition-opacity">
      {agendado && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            marcarRealizado.mutate({ id: a.id, status: "realizado" });
          }}
          disabled={marcarRealizado.isPending}
          title="Marcar realizado"
          aria-label="Marcar realizado"
          className="w-6 h-6 rounded-md inline-flex items-center justify-center text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/20 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
        >
          {marcarRealizado.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
        </button>
      )}
      <Link
        href={`/admin/demandas/nova?assistidoId=${assistidoId}`}
        onClick={(e) => e.stopPropagation()}
        title="Gerar demanda"
        aria-label="Gerar demanda"
        className="w-6 h-6 rounded-md inline-flex items-center justify-center text-neutral-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:text-sky-400 dark:hover:bg-sky-900/20 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
      >
        <ListPlus className="w-3.5 h-3.5" />
      </Link>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAbrir();
        }}
        title="Registrar / abrir"
        aria-label="Registrar / abrir"
        className="w-6 h-6 rounded-md inline-flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Ação rápida: registrar realização (ou cancelar) sem abrir o sheet ──────

function QuickRegistrar({
  atendimento: a,
  destaque,
}: {
  atendimento: AtendimentoListItem;
  destaque: boolean;
}) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [relato, setRelato] = useState("");

  const invalidate = () => {
    utils.registros.listAtendimentos.invalidate();
    utils.registros.atendimentosKpis.invalidate();
    utils.registros.listAgendados.invalidate();
  };

  const atualizar = trpc.registros.update.useMutation({
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setRelato("");
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          title="Registrar realização"
          className={cn(
            "shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
            destaque
              ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
              : "text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/20 opacity-0 group-hover/card:opacity-100 focus:opacity-100"
          )}
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        onClick={(e) => e.stopPropagation()}
        className="w-72 p-3 rounded-xl"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Registrar atendimento
        </p>
        <Textarea
          value={relato}
          onChange={(e) => setRelato(e.target.value)}
          placeholder="Relato — o que foi tratado, orientações, providências (opcional)"
          rows={3}
          autoFocus
          className="text-sm"
        />
        <div className="flex items-center gap-2 mt-2">
          <Button
            size="sm"
            onClick={() =>
              atualizar.mutate(
                { id: a.id, status: "realizado", ...(relato.trim() ? { conteudo: relato.trim() } : {}) },
                { onSuccess: () => toast.success("Atendimento registrado") }
              )
            }
            disabled={atualizar.isPending}
            className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 h-8 text-[12px]"
          >
            {atualizar.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CalendarCheck className="w-3.5 h-3.5" />
            )}
            Realizado
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              atualizar.mutate(
                { id: a.id, status: "cancelado" },
                { onSuccess: () => toast.success("Atendimento cancelado") }
              )
            }
            disabled={atualizar.isPending}
            className="gap-1.5 h-8 text-[12px] text-neutral-500"
          >
            <XCircle className="w-3.5 h-3.5" />
            Cancelar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Ação rápida: reativar atendimento cancelado (volta a "agendado") ───────

function QuickReativar({ atendimento: a }: { atendimento: AtendimentoListItem }) {
  const utils = trpc.useUtils();

  const atualizar = trpc.registros.update.useMutation({
    onSuccess: () => {
      utils.registros.listAtendimentos.invalidate();
      utils.registros.atendimentosKpis.invalidate();
      utils.registros.listAgendados.invalidate();
      toast.success("Atendimento reativado");
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        atualizar.mutate({ id: a.id, status: "agendado" });
      }}
      disabled={atualizar.isPending}
      title="Reativar atendimento"
      className="shrink-0 inline-flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] font-medium text-neutral-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:text-sky-400 dark:hover:bg-sky-900/20 transition-colors cursor-pointer opacity-0 group-hover/card:opacity-100 focus:opacity-100 focus-visible:ring-2 focus-visible:ring-sky-400/50 outline-none"
    >
      {atualizar.isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <RotateCcw className="w-3.5 h-3.5" />
      )}
      Reativar
    </button>
  );
}

// ─── Select compacto para a linha de filtros do header (charcoal) ──────────

function FiltroSelect({
  value,
  onChange,
  options,
  variant = "dark",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  /** "dark" para o header charcoal; "light" para dentro de popovers claros. */
  variant?: "dark" | "light";
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "h-8 text-[11px] rounded-lg",
          variant === "dark"
            ? "w-auto min-w-[110px] bg-white/10 border-white/10 text-white [&>svg]:text-white/50"
            : "w-full"
        )}
      >
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
