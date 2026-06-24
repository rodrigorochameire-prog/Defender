/**
 * Motor de agrupamento de processos em Casos (princípio: 1 principal + associados).
 *
 * Um "Caso" no domínio penal reúne a ação substantiva (ação penal, execução penal
 * ou medida protetiva) com os procedimentos satélites que tratam do MESMO fato:
 * IP (inquérito), APF (flagrante), HC, Cautelar, ANPP. O processo *principal* é
 * marcado em `processos.isReferencia`; os demais ficam vinculados pelo `casoId`.
 *
 * Este módulo é PURO (sem I/O): recebe sementes de processos e devolve grupos
 * sugeridos com principal, associados, confiança e justificativa. A camada tRPC
 * (`casos.sugerirAgrupamento` / `aplicarAgrupamento`) consome estas funções.
 *
 * Heurística deliberadamente conservadora — em contexto jurídico, agrupar errado
 * é pior que não agrupar. Só unimos processos com sinal forte (vínculo de origem
 * explícito) ou discriminante (mesma parte contrária real + mesma comarca).
 */

export type TipoEfetivo =
  | "AP" | "EP" | "MPU" | "ANPP" | "TC" | "APF" | "IP" | "Cautelar" | "PPP" | "HC" | "RC" | "OE" | "OUTRO";

export type Confianca = "alta" | "media" | "baixa";

/** Semente mínima de processo necessária para agrupar. */
export interface ProcessoSeed {
  id: number;
  numeroAutos: string | null;
  tipoProcesso: string | null;
  classeProcessual: string | null;
  processoOrigemId: number | null;
  comarca: string | null;
  parteContraria: string | null;
  area: string | null;
  atribuicao: string | null;
  isJuri: boolean | null;
  casoId: number | null;
  /** Marca de processo principal do caso (isReferencia). Usado na validação. */
  isReferencia?: boolean | null;
}

export interface GrupoSugerido {
  /** Chave estável do grupo (deriva do principal) — útil para React keys. */
  chave: string;
  confianca: Confianca;
  motivos: string[];
  /** id do processo eleito principal (vira isReferencia=true). */
  principalId: number;
  /** ids de todos os processos do grupo (inclui o principal). */
  processoIds: number[];
  tituloSugerido: string;
  atribuicaoSugerida: AtribuicaoCaso;
  prioridadeSugerida: PrioridadeCaso;
}

export type AtribuicaoCaso =
  | "JURI_CAMACARI" | "VVD_CAMACARI" | "EXECUCAO_PENAL"
  | "SUBSTITUICAO" | "SUBSTITUICAO_CIVEL" | "GRUPO_JURI";

export type PrioridadeCaso = "BAIXA" | "NORMAL" | "ALTA" | "URGENTE" | "REU_PRESO";

/* ── Tipo efetivo ──────────────────────────────────────────────────────────
 * `tipoProcesso` tem default "AP" e muitas vezes está impreciso. Quando a classe
 * processual revela outra natureza, ela prevalece sobre o default. */

const CLASSE_HINTS: Array<{ re: RegExp; tipo: TipoEfetivo }> = [
  { re: /inqu[ée]rito/i, tipo: "IP" },
  { re: /flagrante|auto de pris[ãa]o/i, tipo: "APF" },
  { re: /habeas\s*corpus/i, tipo: "HC" },
  { re: /medida\s+protetiva|viol[êe]ncia\s+dom[ée]stica|lei\s+maria/i, tipo: "MPU" },
  { re: /execu[çc][ãa]o\s+(da\s+)?pena|execu[çc][ãa]o\s+penal|agravo\s+em\s+execu/i, tipo: "EP" },
  { re: /n[ãa]o\s+persecu[çc][ãa]o|anpp/i, tipo: "ANPP" },
  { re: /termo\s+circunstanciado/i, tipo: "TC" },
  { re: /revis[ãa]o\s+criminal/i, tipo: "RC" },
  { re: /cautelar/i, tipo: "Cautelar" },
  { re: /a[çc][ãa]o\s+penal|den[úu]ncia|procedimento\s+(comum|ordin[áa]rio|sum[áa]rio)|j[úu]ri/i, tipo: "AP" },
];

const SIGLAS_VALIDAS = new Set<TipoEfetivo>([
  "AP", "EP", "MPU", "ANPP", "TC", "APF", "IP", "Cautelar", "PPP", "HC", "RC", "OE",
]);

/** Normaliza tipoProcesso/classeProcessual num tipo efetivo do domínio. */
export function tipoEfetivo(p: Pick<ProcessoSeed, "tipoProcesso" | "classeProcessual">): TipoEfetivo {
  const raw = (p.tipoProcesso ?? "").trim();
  const sigla = raw as TipoEfetivo;
  // Se o tipo declarado não é o default genérico e é uma sigla conhecida, respeita.
  if (raw && raw.toUpperCase() !== "AP" && SIGLAS_VALIDAS.has(sigla)) return sigla;

  // Caso contrário, tenta inferir pela classe processual.
  const classe = p.classeProcessual ?? "";
  for (const { re, tipo } of CLASSE_HINTS) {
    if (re.test(classe)) return tipo;
  }
  // Sem pista: mantém o declarado se válido, senão AP (default do domínio penal).
  if (raw && SIGLAS_VALIDAS.has(sigla)) return sigla;
  return "AP";
}

/* ── Ranking de principalidade ─────────────────────────────────────────────
 * Quanto maior, mais "principal". A ação substantiva supera os satélites. */
const RANK_PRINCIPAL: Record<TipoEfetivo, number> = {
  AP: 100,
  EP: 90,
  MPU: 80,
  ANPP: 70,
  RC: 65,
  TC: 55,
  APF: 40,
  IP: 30,
  Cautelar: 25,
  PPP: 24,
  HC: 20,
  OE: 10,
  OUTRO: 5,
};

export function rankPrincipalidade(t: TipoEfetivo): number {
  return RANK_PRINCIPAL[t] ?? 5;
}

/* ── Normalização de parte contrária ───────────────────────────────────────
 * No crime a parte contrária costuma ser o MP/Estado (genérico, NÃO discrimina
 * casos distintos). Só usamos parteContraria como sinal de vínculo quando ela
 * é específica (vítima nominal, p.ex. em VVD). */
const PARTE_GENERICA = /minist[ée]rio\s+p[úu]blico|^mp\b|justi[çc]a\s+p[úu]blica|estado\s+da?|fazenda|delegacia|pol[íi]cia|deam/i;

function normalizarParte(s: string | null): string | null {
  if (!s) return null;
  const t = s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!t) return null;
  if (PARTE_GENERICA.test(s)) return null; // genérica → não discrimina
  return t;
}

function normalizarComarca(s: string | null): string {
  return (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Sequencial (7 primeiros dígitos) do número CNJ — NNNNNNN-DD.AAAA.J.TR.OOOO. */
export function sequencialCNJ(numeroAutos: string | null): string | null {
  if (!numeroAutos) return null;
  const m = numeroAutos.replace(/\D/g, "");
  if (m.length < 7) return null;
  return m.slice(0, 7);
}

/* ── Union-Find ────────────────────────────────────────────────────────────*/
class UnionFind {
  private parent = new Map<number, number>();
  find(x: number): number {
    if (!this.parent.has(x)) this.parent.set(x, x);
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    // path compression
    let cur = x;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

/* ── Mapeamento de atribuição / prioridade ─────────────────────────────────*/
export function atribuicaoCasoDoProcesso(p: ProcessoSeed, tipo: TipoEfetivo): AtribuicaoCaso {
  if (p.isJuri) return "JURI_CAMACARI";
  if (tipo === "EP") return "EXECUCAO_PENAL";
  if (tipo === "MPU") return "VVD_CAMACARI";
  const area = (p.area ?? "").toUpperCase();
  const atrib = (p.atribuicao ?? "").toUpperCase();
  if (area === "JURI" || atrib.includes("JURI")) return "JURI_CAMACARI";
  if (area === "EXECUCAO_PENAL" || atrib.includes("EXECUCAO")) return "EXECUCAO_PENAL";
  if (area === "VIOLENCIA_DOMESTICA" || atrib.includes("VVD")) return "VVD_CAMACARI";
  if (area === "CIVEL" || area === "FAMILIA" || area === "FAZENDA_PUBLICA" || atrib.includes("CIVEL")) {
    return "SUBSTITUICAO_CIVEL";
  }
  return "SUBSTITUICAO";
}

/* ── Título sugerido ───────────────────────────────────────────────────────*/
const TIPO_LABEL: Record<TipoEfetivo, string> = {
  AP: "Ação Penal", EP: "Execução Penal", MPU: "Medida Protetiva", ANPP: "ANPP",
  TC: "Termo Circ.", APF: "Flagrante", IP: "Inquérito", Cautelar: "Cautelar",
  PPP: "PPP", HC: "Habeas Corpus", RC: "Revisão Criminal", OE: "Dep. Especial", OUTRO: "Processo",
};

export function tipoEfetivoLabel(t: TipoEfetivo): string {
  return TIPO_LABEL[t] ?? "Processo";
}

function tituloSugerido(principal: ProcessoSeed, tipo: TipoEfetivo): string {
  const parte = normalizarParte(principal.parteContraria);
  const seq = sequencialCNJ(principal.numeroAutos);
  // VVD: o nome da vítima dá o melhor rótulo.
  if (tipo === "MPU" && parte && principal.parteContraria) {
    return `Medida Protetiva — ${principal.parteContraria.trim()}`;
  }
  const base = TIPO_LABEL[tipo] ?? "Caso";
  return seq ? `${base} ${seq}` : base;
}

/* ── Agrupamento ───────────────────────────────────────────────────────────*/

export interface OpcoesAgrupamento {
  /** Inclui processos já vinculados a um caso (para revalidação). Default: false. */
  incluirJaVinculados?: boolean;
}

/**
 * Recebe os processos de um assistido e devolve os grupos sugeridos.
 * Por padrão considera apenas processos SOLTOS (casoId == null).
 */
export function agruparProcessos(
  processos: ProcessoSeed[],
  opts: OpcoesAgrupamento = {},
): GrupoSugerido[] {
  const elegiveis = opts.incluirJaVinculados
    ? processos
    : processos.filter((p) => p.casoId == null);
  if (elegiveis.length === 0) return [];

  const byId = new Map(elegiveis.map((p) => [p.id, p]));
  const uf = new UnionFind();
  for (const p of elegiveis) uf.find(p.id); // garante nó

  // Razões de vínculo acumuladas por par de raízes (para justificar a confiança).
  const motivosPorRaiz = new Map<number, Set<string>>();
  const addMotivo = (id: number, m: string) => {
    const r = uf.find(id);
    if (!motivosPorRaiz.has(r)) motivosPorRaiz.set(r, new Set());
    motivosPorRaiz.get(r)!.add(m);
  };

  // Aresta 1 — vínculo de origem explícito (forte).
  for (const p of elegiveis) {
    if (p.processoOrigemId != null && byId.has(p.processoOrigemId)) {
      uf.union(p.id, p.processoOrigemId);
      addMotivo(p.id, "vínculo de origem explícito");
    }
  }

  // Aresta 2 — mesma parte contrária discriminante + mesma comarca (médio-forte).
  // Útil sobretudo para VVD (vítima nominal une MPU + IP + AP).
  for (let i = 0; i < elegiveis.length; i++) {
    for (let j = i + 1; j < elegiveis.length; j++) {
      const a = elegiveis[i];
      const b = elegiveis[j];
      const pa = normalizarParte(a.parteContraria);
      const pb = normalizarParte(b.parteContraria);
      if (pa && pb && pa === pb && normalizarComarca(a.comarca) === normalizarComarca(b.comarca)) {
        uf.union(a.id, b.id);
        addMotivo(a.id, "mesma parte contrária e comarca");
      }
    }
  }

  // Coletar clusters.
  const clusters = new Map<number, ProcessoSeed[]>();
  for (const p of elegiveis) {
    const r = uf.find(p.id);
    if (!clusters.has(r)) clusters.set(r, []);
    clusters.get(r)!.push(p);
  }

  const grupos: GrupoSugerido[] = [];
  for (const [raiz, membros] of clusters) {
    // Principal = maior rank; desempate por menor id (mais antigo).
    const ordenados = [...membros].sort((x, y) => {
      const rx = rankPrincipalidade(tipoEfetivo(x));
      const ry = rankPrincipalidade(tipoEfetivo(y));
      if (ry !== rx) return ry - rx;
      return x.id - y.id;
    });
    const principal = ordenados[0];
    const tipoP = tipoEfetivo(principal);

    const motivos = [...(motivosPorRaiz.get(raiz) ?? [])];
    const confianca: Confianca =
      membros.length === 1
        ? "alta" // singleton: 1 processo = 1 caso, trivialmente correto
        : motivos.includes("vínculo de origem explícito")
          ? "alta"
          : "media";

    if (membros.length === 1) {
      motivos.push("processo isolado");
    }

    grupos.push({
      chave: `g-${principal.id}`,
      confianca,
      motivos,
      principalId: principal.id,
      processoIds: ordenados.map((m) => m.id),
      tituloSugerido: tituloSugerido(principal, tipoP),
      atribuicaoSugerida: atribuicaoCasoDoProcesso(principal, tipoP),
      prioridadeSugerida: "NORMAL",
    });
  }

  // Estável: grupos maiores primeiro, depois por id do principal.
  grupos.sort((a, b) => b.processoIds.length - a.processoIds.length || a.principalId - b.principalId);
  return grupos;
}

/* ── Validação de casos existentes ─────────────────────────────────────────*/

export type TipoInconsistencia =
  | "caso_sem_principal"
  | "caso_multiplos_principais"
  | "processo_solto"
  | "tipo_impreciso";

export interface Inconsistencia {
  tipo: TipoInconsistencia;
  casoId: number | null;
  processoIds: number[];
  descricao: string;
  /** Correção automática proposta (quando aplicável). */
  fix?: { principalId?: number; tipoEfetivoSugerido?: Record<number, TipoEfetivo> };
}

export interface CasoComProcessos {
  casoId: number;
  processos: ProcessoSeed[];
  /** ids marcados como isReferencia=true atualmente. */
  referenciaIds: number[];
}

/**
 * Valida os casos de um assistido e devolve inconsistências com correção sugerida.
 * Pura — a camada tRPC decide aplicar ou só reportar.
 */
export function validarCasos(
  casos: CasoComProcessos[],
  processosSoltos: ProcessoSeed[],
): Inconsistencia[] {
  const out: Inconsistencia[] = [];

  for (const c of casos) {
    if (c.processos.length === 0) continue;
    const escolherPrincipal = () =>
      [...c.processos].sort((x, y) => {
        const r = rankPrincipalidade(tipoEfetivo(y)) - rankPrincipalidade(tipoEfetivo(x));
        return r !== 0 ? r : x.id - y.id;
      })[0].id;

    if (c.referenciaIds.length === 0) {
      out.push({
        tipo: "caso_sem_principal",
        casoId: c.casoId,
        processoIds: c.processos.map((p) => p.id),
        descricao: "Caso sem processo principal definido.",
        fix: { principalId: escolherPrincipal() },
      });
    } else if (c.referenciaIds.length > 1) {
      out.push({
        tipo: "caso_multiplos_principais",
        casoId: c.casoId,
        processoIds: c.referenciaIds,
        descricao: `Caso com ${c.referenciaIds.length} processos marcados como principal.`,
        fix: { principalId: escolherPrincipal() },
      });
    }

    // Tipo impreciso: declarado AP mas classe sugere outra natureza.
    const tipoFix: Record<number, TipoEfetivo> = {};
    for (const p of c.processos) {
      const efetivo = tipoEfetivo(p);
      const declarado = (p.tipoProcesso ?? "AP").trim() || "AP";
      if (efetivo !== declarado && declarado.toUpperCase() === "AP") {
        tipoFix[p.id] = efetivo;
      }
    }
    if (Object.keys(tipoFix).length > 0) {
      out.push({
        tipo: "tipo_impreciso",
        casoId: c.casoId,
        processoIds: Object.keys(tipoFix).map(Number),
        descricao: "Processos com tipo possivelmente impreciso (classe processual diverge).",
        fix: { tipoEfetivoSugerido: tipoFix },
      });
    }
  }

  if (processosSoltos.length > 0) {
    out.push({
      tipo: "processo_solto",
      casoId: null,
      processoIds: processosSoltos.map((p) => p.id),
      descricao: `${processosSoltos.length} processo(s) sem caso vinculado.`,
    });
  }

  return out;
}
