"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { getSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// Status só aparece em EXCEÇÃO (poss. dup / já importada). "Nova" não vira badge
// (seria ruído — quase tudo é nova). Cor é o orçamento escasso desta tela.
const STATUS_EXC: Record<string, { label: string; cls: string }> = {
  incerta: {
    label: "poss. dup",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  },
  duplicada: {
    label: "duplicada",
    cls: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  },
  ja_importada: {
    label: "já importada",
    cls: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  },
};

const fmtData = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const dt = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T00:00:00") : new Date(d);
  return isNaN(dt.getTime())
    ? "—"
    : dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

// Urgência a partir da data-limite (relativo a hoje). Cor só quando há problema:
// vermelho = vencido/hoje, âmbar = ≤3 dias, neutro = resto.
function prazo(dataLimite: string | null | undefined) {
  if (!dataLimite) return { label: "—", cls: "text-neutral-400", dias: null as number | null };
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dl = new Date(dataLimite + "T00:00:00");
  if (isNaN(dl.getTime())) return { label: "—", cls: "text-neutral-400", dias: null };
  const dias = Math.round((dl.getTime() - hoje.getTime()) / 86_400_000);
  if (dias < 0)
    return { label: `venceu ${fmtData(dataLimite)}`, cls: "text-red-600 dark:text-red-400 font-medium", dias };
  if (dias === 0)
    return { label: "vence hoje", cls: "text-red-600 dark:text-red-400 font-medium", dias };
  if (dias <= 3)
    return { label: `em ${dias} dia${dias > 1 ? "s" : ""}`, cls: "text-amber-600 dark:text-amber-400 font-medium", dias };
  return { label: `em ${dias} dias`, cls: "text-neutral-500 dark:text-neutral-400", dias };
}

type Row = {
  id: number;
  atribuicao: string | null;
  decisao: string;
  processoNumero: string | null;
  assistidoNome: string | null;
  assistidoParsed: string | null;
  ato: string | null;
  crime: string | null;
  tipoProcesso: string | null;
  isMPU: boolean;
  dataExpedicao: string | Date | null;
  dataLimite: string | null;
  conteudo?: string | null;
  // Contrato v3 (preenchido pelo backend em runtime):
  assistidoMatch?: "novo" | "vinculado" | "multiplo";
  matchedAssistidoId?: number | null;
  prazoDefensoria?: string | null;
};

type Edit = { assistidoNome?: string; ato?: string; prazo?: string };

// Preferências de triagem persistidas (ordem + filtros). Seleção/expandido NÃO
// são persistidos (são estado efêmero de cada revisão).
const PREFS_KEY = "intim-review-prefs-v2";
type Prefs = {
  ordenar: "pje" | "recente" | "antigo" | "prazo" | "assistido";
  fDecisao: "todas" | "nova" | "incerta" | "dup";
  fTipo: "todos" | "mpu" | "demais";
  fCrime: string;
};
function loadPrefs(): Partial<Prefs> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as Partial<Prefs>) : {};
  } catch {
    return {};
  }
}

export function IntimacoesStagingView({ jobId }: { jobId: number }) {
  const utils = trpc.useUtils();
  const query = trpc.intimacoes.listStaging.useQuery({ jobId }, { refetchInterval: 0 });

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<number, Edit>>({});
  const [busca, setBusca] = useState("");
  const [fDecisao, setFDecisao] = useState<"todas" | "nova" | "incerta" | "dup">("todas");
  const [fCrime, setFCrime] = useState<string>("");
  const [fTipo, setFTipo] = useState<"todos" | "mpu" | "demais">("todos");
  const [ordenar, setOrdenar] = useState<"pje" | "recente" | "antigo" | "prazo" | "assistido">("recente");
  const seeded = useRef(false);
  const lastClicked = useRef<number | null>(null);
  const prefsLoaded = useRef(false);

  // Restaura preferências do client após o mount (evita mismatch de hidratação:
  // o 1º render no server/client usa os defaults; só então aplicamos o localStorage).
  useEffect(() => {
    const p = loadPrefs();
    if (p.ordenar) setOrdenar(p.ordenar);
    if (p.fDecisao) setFDecisao(p.fDecisao);
    if (p.fTipo) setFTipo(p.fTipo);
    if (p.fCrime != null) setFCrime(p.fCrime);
    prefsLoaded.current = true;
  }, []);

  // Persiste preferências quando mudam (só depois de restaurar, p/ não sobrescrever).
  useEffect(() => {
    if (!prefsLoaded.current || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({ ordenar, fDecisao, fTipo, fCrime } satisfies Prefs),
      );
    } catch {
      /* localStorage indisponível (modo privado/quota) — ignora */
    }
  }, [ordenar, fDecisao, fTipo, fCrime]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`import-job-${jobId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "claude_code_tasks" },
        (payload) => {
          const row = payload.new as { id?: number } | null;
          if (row?.id === jobId) void utils.intimacoes.listStaging.invalidate({ jobId });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [jobId, utils]);

  const allRows = useMemo(
    () => (query.data?.rows ?? []) as unknown as Row[],
    [query.data],
  );

  useEffect(() => {
    if (!seeded.current && allRows.length) {
      seeded.current = true;
      setSelected(new Set(allRows.filter((r) => r.decisao === "nova").map((r) => r.id)));
    }
  }, [allRows]);

  const confirmar = trpc.intimacoes.confirmarImport.useMutation({
    onSuccess: (res) => toast.success(`${res.imported} importadas, ${res.skipped} puladas`),
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const status = query.data?.status ?? "pending";
  const running = status === "pending" || status === "processing";

  const crimes = useMemo(() => {
    const s = new Set<string>();
    for (const r of allRows) if (r.crime) s.add(r.crime);
    return [...s].sort();
  }, [allRows]);

  // Quantos expedientes por processo (sobre TODAS as rows). Usado para alertar
  // discretamente quando o mesmo caso aparece em várias linhas.
  const processoCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of allRows) {
      const k = r.processoNumero?.trim();
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [allRows]);

  const atribuicoes = useMemo(
    () => [...new Set(allRows.map((r) => r.atribuicao ?? "—"))],
    [allRows],
  );
  const multiAtrib = atribuicoes.length > 1;

  // Resumo de urgência (sobre novas/incertas — o que se importa).
  const resumo = useMemo(() => {
    let nova = 0, incerta = 0, dup = 0, vencidas = 0, breve = 0;
    for (const r of allRows) {
      if (r.decisao === "nova") nova++;
      else if (r.decisao === "incerta") incerta++;
      else dup++;
      if (r.decisao === "duplicada" || r.decisao === "ja_importada") continue;
      const d = prazo(r.dataLimite).dias;
      if (d != null && d < 0) vencidas++;
      else if (d != null && d <= 3) breve++;
    }
    return { nova, incerta, dup, vencidas, breve };
  }, [allRows]);

  const visible = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const rows = allRows.filter((r) => {
      if (fDecisao === "nova" && r.decisao !== "nova") return false;
      if (fDecisao === "incerta" && r.decisao !== "incerta") return false;
      if (fDecisao === "dup" && !(r.decisao === "duplicada" || r.decisao === "ja_importada"))
        return false;
      if (fTipo === "mpu" && !r.isMPU) return false;
      if (fTipo === "demais" && r.isMPU) return false;
      if (fCrime && r.crime !== fCrime) return false;
      if (q) {
        const nome = (r.assistidoParsed ?? r.assistidoNome ?? "").toLowerCase();
        const proc = (r.processoNumero ?? "").toLowerCase();
        if (!nome.includes(q) && !proc.includes(q)) return false;
      }
      return true;
    });
    // "Ordem do PJe" = ordem de raspagem (id asc, já vinda do backend) — não reordena.
    if (ordenar === "pje") return rows;
    const dias = (r: Row) => {
      const d = prazo(r.dataLimite).dias;
      return d == null ? Number.POSITIVE_INFINITY : d;
    };
    const exped = (r: Row) => (r.dataExpedicao ? new Date(r.dataExpedicao).getTime() : 0);
    return [...rows].sort((a, b) => {
      if (ordenar === "prazo") return dias(a) - dias(b);
      if (ordenar === "recente") return exped(b) - exped(a);
      if (ordenar === "antigo") return exped(a) - exped(b);
      return (a.assistidoParsed ?? a.assistidoNome ?? "").localeCompare(
        b.assistidoParsed ?? b.assistidoNome ?? "",
      );
    });
  }, [allRows, busca, fDecisao, fTipo, fCrime, ordenar]);

  const isSelectable = (d: string) => d !== "ja_importada" && d !== "duplicada";
  const visibleSelectableIds = useMemo(
    () => visible.filter((r) => isSelectable(r.decisao)).map((r) => r.id),
    [visible],
  );

  // Importáveis com prazo vencido ou ≤3 dias (varre TODAS as rows, não só as visíveis,
  // para não deixar passar urgência escondida por filtro).
  const urgenteIds = useMemo(
    () =>
      allRows
        .filter((r) => {
          if (!isSelectable(r.decisao)) return false;
          const d = prazo(r.dataLimite).dias;
          return d != null && d <= 3;
        })
        .map((r) => r.id),
    [allRows],
  );

  if (query.error) {
    const isNotFound =
      query.error.data?.code === "NOT_FOUND" ||
      query.error.message?.toLowerCase().includes("não encontrado");
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4 text-center">
          <p className="text-neutral-500 text-sm">
            {isNotFound
              ? "Job não encontrado. O import pode ter sido removido ou o link está incorreto."
              : `Erro ao carregar: ${query.error.message}`}
          </p>
          <Link href="/admin/demandas" className="text-sm text-emerald-600 hover:text-emerald-700 underline underline-offset-2">
            Voltar para Demandas
          </Link>
        </div>
      </div>
    );
  }

  // Seleção: clique no checkbox (shift = intervalo na ordem visível).
  const handleSelect = (id: number, shiftKey: boolean, disabled: boolean) => {
    if (disabled) return;
    setSelected((prev) => {
      const n = new Set(prev);
      const ids = visible.map((r) => r.id);
      if (shiftKey && lastClicked.current != null) {
        const a = ids.indexOf(lastClicked.current);
        const b = ids.indexOf(id);
        if (a !== -1 && b !== -1) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          for (let i = lo; i <= hi; i++) {
            const r = visible[i];
            if (r && isSelectable(r.decisao)) n.add(r.id);
          }
          lastClicked.current = id;
          return n;
        }
      }
      n.has(id) ? n.delete(id) : n.add(id);
      lastClicked.current = id;
      return n;
    });
  };

  const setEditField = (id: number, field: keyof Edit, value: string) =>
    setEdits((e) => ({ ...e, [id]: { ...e[id], [field]: value } }));

  const onConfirm = () => {
    const payload: Record<string, Record<string, unknown>> = {};
    for (const [id, e] of Object.entries(edits)) {
      if (!selected.has(Number(id))) continue;
      const clean = Object.fromEntries(Object.entries(e).filter(([, v]) => v != null && v !== ""));
      if (Object.keys(clean).length) payload[id] = clean;
    }
    confirmar.mutate({ jobId, selectedIds: [...selected], edits: payload });
  };

  const Seg = ({ id, label, n }: { id: typeof fDecisao; label: string; n: number }) => (
    <button
      onClick={() => setFDecisao(id)}
      className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
        fDecisao === id
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
          : "border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
      }`}
    >
      {label} {n}
    </button>
  );

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl pb-24">
        {/* Header escuro (Padrão Defender) */}
        <div className="rounded-xl bg-[#414144] px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-[15px] font-semibold tracking-tight text-white">
                Importação de intimações
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-white/55 tabular-nums">
                {running ? (
                  <span className="flex items-center gap-1.5">
                    <span className="animate-pulse text-emerald-400">●</span>
                    {query.data?.etapa ?? "Processando…"}
                  </span>
                ) : (
                  <>
                    <span>{allRows.length} raspadas</span>
                    <span className="text-white/25">·</span>
                    <span>{resumo.nova} novas</span>
                    {resumo.vencidas > 0 && (
                      <>
                        <span className="text-white/25">·</span>
                        <span className="text-red-300">{resumo.vencidas} vencidas</span>
                      </>
                    )}
                    {resumo.breve > 0 && (
                      <>
                        <span className="text-white/25">·</span>
                        <span className="text-amber-300">{resumo.breve} vencem ≤3d</span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            <Link href="/admin/demandas" className="text-[11px] text-white/50 hover:text-white/90 transition-colors">
              ← Voltar
            </Link>
          </div>
        </div>

        {/* Toolbar de triagem */}
        {allRows.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px] max-w-[280px]">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar assistido ou processo…"
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] text-neutral-700 placeholder:text-neutral-400 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/30 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
              />
            </div>
            <Seg id="todas" label="Todas" n={allRows.length} />
            <Seg id="nova" label="Novas" n={resumo.nova} />
            {resumo.incerta > 0 && <Seg id="incerta" label="Poss. dup" n={resumo.incerta} />}
            {resumo.dup > 0 && <Seg id="dup" label="Duplicadas" n={resumo.dup} />}
            {allRows.some((r) => r.isMPU) && (
              <select
                value={fTipo}
                onChange={(e) => setFTipo(e.target.value as typeof fTipo)}
                className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-[11px] text-neutral-600 outline-none focus:border-violet-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
              >
                <option value="todos">MPU + demais</option>
                <option value="mpu">Só MPU</option>
                <option value="demais">Só demais</option>
              </select>
            )}
            {crimes.length > 1 && (
              <select
                value={fCrime}
                onChange={(e) => setFCrime(e.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-[11px] text-neutral-600 outline-none focus:border-emerald-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
              >
                <option value="">Crime: todos</option>
                {crimes.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
            <select
              value={ordenar}
              onChange={(e) => setOrdenar(e.target.value as typeof ordenar)}
              className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-[11px] text-neutral-600 outline-none focus:border-emerald-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
            >
              <option value="recente">Mais recente → antigo</option>
              <option value="antigo">Mais antigo → recente</option>
              <option value="pje">Como no painel do PJe</option>
              <option value="prazo">Prazo (urgência)</option>
              <option value="assistido">Assistido (A→Z)</option>
            </select>
            <div className="ml-auto flex items-center gap-2 text-[11px] text-neutral-500">
              {urgenteIds.length > 0 && (
                <button
                  onClick={() => setSelected(new Set(urgenteIds))}
                  className="rounded-md px-2 py-1 font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30 cursor-pointer"
                >
                  Selecionar urgentes ({urgenteIds.length})
                </button>
              )}
              <button onClick={() => setSelected(new Set(visibleSelectableIds))} className="rounded-md px-2 py-1 font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 cursor-pointer">
                Selecionar visíveis ({visibleSelectableIds.length})
              </button>
              <button onClick={() => setSelected(new Set())} className="rounded-md px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer">
                Limpar
              </button>
            </div>
          </div>
        )}

        {/* Empty / loading */}
        {running && allRows.length === 0 && (
          <div className="mt-10 text-center text-sm text-neutral-400">Aguardando resultados da raspagem…</div>
        )}
        {!running && allRows.length === 0 && (
          <div className="mt-10 text-center text-sm text-neutral-400">Nenhuma intimação encontrada.</div>
        )}

        {/* Tabela */}
        {allRows.length > 0 && (
          // Sem overflow-hidden: um ancestral com overflow!=visible vira scroll
          // container e quebra o `sticky` do thead relativo à viewport.
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white shadow-sm shadow-black/[0.03] dark:border-neutral-800 dark:bg-neutral-900">
            <table className="w-full text-[12px]">
              <thead>
                {/* Cabeçalho fixo: cada th é sticky (mais compatível que thead sticky),
                    com fundo sólido + borda/sombra sutil ao rolar as 80+ linhas. */}
                <tr className="text-left text-[10px] font-medium text-neutral-400 [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:border-b [&>th]:border-neutral-200 [&>th]:bg-neutral-50 [&>th]:shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:[&>th]:border-neutral-700 dark:[&>th]:bg-neutral-900">
                  <th className="w-9 px-3 py-2"></th>
                  <th className="px-3 py-2">Assistido</th>
                  {multiAtrib && <th className="px-3 py-2">Atribuição</th>}
                  <th className="px-3 py-2">Crime</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2 whitespace-nowrap">Exped.</th>
                  <th className="px-3 py-2">Prazo</th>
                  <th className="w-16 px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/60">
                {visible.map((r) => {
                  const disabled = !isSelectable(r.decisao);
                  const checked = selected.has(r.id);
                  const isOpen = expanded === r.id;
                  const p = prazo(r.dataLimite);
                  const exc = STATUS_EXC[r.decisao];
                  const ed = edits[r.id] ?? {};
                  const colSpan = multiAtrib ? 7 : 6;
                  return (
                    <Fragment key={r.id}>
                      <tr
                        onClick={() => setExpanded(isOpen ? null : r.id)}
                        className={`cursor-pointer transition-colors ${
                          disabled ? "opacity-50" : "hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30"
                        } ${checked ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""}`}
                      >
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => {}}
                            onClick={(e) => handleSelect(r.id, e.shiftKey, disabled)}
                            aria-label={`Selecionar ${r.processoNumero ?? r.id}`}
                            className="h-3.5 w-3.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-neutral-800 dark:text-neutral-100">
                              {ed.assistidoNome ?? r.assistidoParsed ?? r.assistidoNome ?? "—"}
                            </span>
                            {r.isMPU && (
                              <span className="rounded bg-violet-100 px-1 text-[9px] font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                                MPU
                              </span>
                            )}
                            {/* Marca só a EXCEÇÃO: "novo" (caso comum) não exibe nada. */}
                            {r.assistidoMatch === "vinculado" && r.matchedAssistidoId != null && (
                              <Link
                                href={`/admin/assistidos/${r.matchedAssistidoId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded px-1 text-[9px] font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400 cursor-pointer"
                              >
                                já cadastrado
                              </Link>
                            )}
                            {r.assistidoMatch === "multiplo" && (
                              <span className="rounded bg-amber-50 px-1 text-[9px] font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                                homônimos
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-neutral-400">
                              {r.processoNumero ?? "—"}
                            </span>
                            {r.processoNumero && (processoCount.get(r.processoNumero.trim()) ?? 0) > 1 && (
                              <span className="rounded bg-neutral-100 px-1 text-[9px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                {processoCount.get(r.processoNumero.trim())} no mesmo processo
                              </span>
                            )}
                          </div>
                        </td>
                        {multiAtrib && (
                          <td className="px-3 py-2.5 text-[11px] text-neutral-500">{r.atribuicao}</td>
                        )}
                        <td className="px-3 py-2.5 text-neutral-600 dark:text-neutral-400">{r.crime ?? "—"}</td>
                        <td className="px-3 py-2.5 text-[11px] text-neutral-400 whitespace-nowrap">{r.tipoProcesso ?? "—"}</td>
                        <td className="px-3 py-2.5 text-[11px] tabular-nums text-neutral-400 whitespace-nowrap">{fmtData(r.dataExpedicao)}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                          <div className={p.cls}>{p.label}</div>
                          {r.prazoDefensoria && (
                            <div className="text-[10px] font-normal text-neutral-400 dark:text-neutral-500">
                              Defensoria: {fmtData(r.prazoDefensoria)}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {exc ? (
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${exc.cls}`}>{exc.label}</span>
                          ) : (
                            <span className="text-[10px] text-neutral-300 dark:text-neutral-600">{isOpen ? "▲" : "▾"}</span>
                          )}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-neutral-50/60 dark:bg-neutral-900/40">
                          <td></td>
                          <td colSpan={colSpan} className="px-3 pb-3 pt-1">
                            <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-md border border-neutral-100 bg-white p-2 font-mono text-[10px] leading-relaxed text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950">
                              {r.conteudo ?? "—"}
                            </pre>
                            <div className="mt-2 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <label className="flex items-center gap-1 text-[10px] text-neutral-400">
                                Assistido
                                <input
                                  value={ed.assistidoNome ?? r.assistidoParsed ?? r.assistidoNome ?? ""}
                                  onChange={(e) => setEditField(r.id, "assistidoNome", e.target.value)}
                                  className="w-44 rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[11px] text-neutral-700 outline-none focus:border-emerald-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                                />
                              </label>
                              <label className="flex items-center gap-1 text-[10px] text-neutral-400">
                                Ato
                                <input
                                  value={ed.ato ?? r.ato ?? ""}
                                  onChange={(e) => setEditField(r.id, "ato", e.target.value)}
                                  className="w-32 rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[11px] text-neutral-700 outline-none focus:border-emerald-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                                />
                              </label>
                              <label className="flex items-center gap-1 text-[10px] text-neutral-400">
                                Prazo
                                <input
                                  type="date"
                                  value={ed.prazo ?? r.dataLimite ?? ""}
                                  onChange={(e) => setEditField(r.id, "prazo", e.target.value)}
                                  className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[11px] text-neutral-700 outline-none focus:border-emerald-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                                />
                              </label>
                              <button
                                onClick={() => {
                                  void navigator.clipboard?.writeText(r.processoNumero ?? "");
                                  toast.success("Nº do processo copiado");
                                }}
                                className="text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
                              >
                                copiar nº
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={multiAtrib ? 8 : 7} className="px-3 py-8 text-center text-sm text-neutral-400">
                      Nada corresponde aos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Barra de confirmar fixa */}
      {allRows.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.05)] dark:border-neutral-800 dark:bg-neutral-900/95">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <span className="text-[12px] text-neutral-500">
              <b className="text-neutral-700 dark:text-neutral-200">{selected.size}</b> selecionada{selected.size === 1 ? "" : "s"} de {resumo.nova + resumo.incerta} importáveis
            </span>
            <button
              disabled={selected.size === 0 || confirmar.isPending || running}
              onClick={onConfirm}
              className="ml-auto rounded-lg bg-emerald-600 px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {confirmar.isPending ? "Importando…" : `Confirmar importação (${selected.size})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
