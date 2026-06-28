export type Cluster = "progressao" | "ausencias" | "contraprestacao" | "administrativo";

export type EventoLite = {
  id: number;
  tipo: string;
  cluster: Cluster;
  titulo: string;
  status: string;
  dataEvento: string;      // YYYY-MM-DD
  dataFim: string | null;
  prazo: string | null;
  valorCents: number | null;
};

export type SubLite = { id: number; status: string };

export type ClusterSummary = {
  total: number;
  emCurso: number;
  pendentes: number;
  itens: Array<Pick<EventoLite, "id" | "tipo" | "titulo" | "status" | "dataEvento" | "prazo" | "valorCents">>;
};

export type MeuPanorama = {
  kpis: {
    proximoPrazo: { titulo: string; prazo: string; tipo: string } | null;
    substituicoesAtivas: number;
    pedidosPendentes: number;
    feriasAgendadas: number;
  };
  agoraProximos: Array<Pick<EventoLite, "id" | "tipo" | "cluster" | "titulo" | "status" | "dataEvento" | "dataFim" | "prazo">>;
  clusters: Record<Cluster, ClusterSummary>;
};

const UPCOMING_WINDOW_DAYS = 90;
const CLUSTERS: Cluster[] = ["progressao", "ausencias", "contraprestacao", "administrativo"];

/** Add days to a YYYY-MM-DD string in UTC; returns YYYY-MM-DD. */
export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function emptyCluster(): ClusterSummary {
  return { total: 0, emCurso: 0, pendentes: 0, itens: [] };
}

export function buildMeuPanorama(
  input: { eventos: EventoLite[]; substituicoes: SubLite[] },
  today: string,
): MeuPanorama {
  const { eventos, substituicoes } = input;
  const cutoff = addDaysISO(today, UPCOMING_WINDOW_DAYS);

  // KPIs
  const substituicoesAtivas = substituicoes.filter((s) => s.status !== "paga").length;

  const pedidosPendentes = eventos.filter(
    (e) => e.tipo === "SOLICITACAO_ADM" && (e.status === "pendente" || e.status === "em_curso"),
  ).length;

  const feriasAgendadas = eventos.filter(
    (e) =>
      e.tipo === "FERIAS" &&
      (e.status === "previsto" || e.status === "em_curso") &&
      (e.dataFim === null || e.dataFim >= today),
  ).length;

  const comPrazo = eventos
    .filter((e) => e.prazo !== null && e.prazo >= today && e.status !== "concluido" && e.status !== "arquivado")
    .sort((a, b) => (a.prazo! < b.prazo! ? -1 : a.prazo! > b.prazo! ? 1 : 0));
  const proximoPrazo = comPrazo.length
    ? { titulo: comPrazo[0].titulo, prazo: comPrazo[0].prazo!, tipo: comPrazo[0].tipo }
    : null;

  // Agora & próximos: em_curso now, OR upcoming dataEvento within window
  const agoraProximos = eventos
    .filter(
      (e) =>
        e.status === "em_curso" ||
        (e.dataEvento >= today && e.dataEvento <= cutoff) ||
        (e.prazo !== null && e.prazo >= today && e.prazo <= cutoff),
    )
    .sort((a, b) => (a.dataEvento < b.dataEvento ? -1 : a.dataEvento > b.dataEvento ? 1 : 0))
    .map((e) => ({
      id: e.id, tipo: e.tipo, cluster: e.cluster, titulo: e.titulo,
      status: e.status, dataEvento: e.dataEvento, dataFim: e.dataFim, prazo: e.prazo,
    }));

  // Cluster summaries
  const clusters = Object.fromEntries(CLUSTERS.map((c) => [c, emptyCluster()])) as Record<Cluster, ClusterSummary>;
  for (const e of eventos) {
    const c = clusters[e.cluster];
    if (!c) continue;
    c.total += 1;
    if (e.status === "em_curso") c.emCurso += 1;
    if (e.status === "pendente") c.pendentes += 1;
    c.itens.push({ id: e.id, tipo: e.tipo, titulo: e.titulo, status: e.status, dataEvento: e.dataEvento, prazo: e.prazo, valorCents: e.valorCents });
  }
  for (const c of CLUSTERS) {
    clusters[c].itens.sort((a, b) => (a.dataEvento < b.dataEvento ? 1 : a.dataEvento > b.dataEvento ? -1 : 0));
  }

  return { kpis: { proximoPrazo, substituicoesAtivas, pedidosPendentes, feriasAgendadas }, agoraProximos, clusters };
}
