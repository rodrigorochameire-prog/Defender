/**
 * Estado canônico do assistido — fonte única da lógica de cadastro/urgência/ação.
 *
 * Funções puras (sem React, sem I/O) que respondem às perguntas centrais da reforma
 * do módulo Assistidos:
 *   - quão confiável está o cadastro?  → completudeFicha()
 *   - o que está urgente agora?        → attentionSignals()
 *   - qual a próxima ação recomendada? → contextualCTA()
 *
 * Consumidores (lista, overview, preview) montam um AssistidoSnapshot a partir dos
 * dados disponíveis e derivam tudo daqui — em vez de recalcular completude/urgência
 * inline em cada tela.
 */

import { differenceInDays, parseISO } from "date-fns";

// ============================================
// COMPLETUDE DA FICHA
// ============================================

/** Campos que compõem uma ficha "completa o suficiente para peticionar". */
export const CAMPOS_FICHA = [
  { key: "cpf", label: "CPF" },
  { key: "rg", label: "RG" },
  { key: "dataNascimento", label: "nascimento" },
  { key: "nomeMae", label: "mãe" },
  { key: "endereco", label: "endereço" },
  { key: "telefone", label: "telefone" },
  { key: "naturalidade", label: "naturalidade" },
] as const;

export type CampoFichaKey = (typeof CAMPOS_FICHA)[number]["key"];

export type CompletudeTone = "complete" | "good" | "warn" | "critical";

export interface CompletudeResult {
  /** 0–100 */
  pct: number;
  preenchidos: CampoFichaKey[];
  faltam: { key: CampoFichaKey; label: string }[];
  tone: CompletudeTone;
}

function preenchido(v: unknown): boolean {
  return v !== null && v !== undefined && String(v).trim() !== "";
}

/** Mede a completude da ficha (identidade/peticionamento) a partir dos campos-chave. */
export function completudeFicha(
  dados: Partial<Record<CampoFichaKey, unknown>>,
): CompletudeResult {
  const cheios = CAMPOS_FICHA.filter((c) => preenchido(dados[c.key]));
  const faltam = CAMPOS_FICHA.filter((c) => !cheios.includes(c)).map((c) => ({
    key: c.key,
    label: c.label,
  }));
  const pct = Math.round((cheios.length / CAMPOS_FICHA.length) * 100);
  const tone: CompletudeTone =
    pct === 100 ? "complete" : pct >= 70 ? "good" : pct >= 40 ? "warn" : "critical";
  return { pct, preenchidos: cheios.map((c) => c.key), faltam, tone };
}

// ============================================
// SINAIS DE ATENÇÃO + AÇÃO CONTEXTUAL
// ============================================

export type AttentionKind =
  | "demanda-atrasada"
  | "preso-sem-audiencia"
  | "audiencia-proxima"
  | "processo-orfao"
  | "cadastro-critico"
  | "sem-contato";

export type Severity = "critical" | "warning" | "info";

export interface ContextualAction {
  /** Estado que originou a ação ("ver" = fallback sem urgência). */
  kind: AttentionKind | "ver";
  label: string;
}

export interface AttentionSignal {
  kind: AttentionKind;
  severity: Severity;
  /** Rótulo curto para chip/badge (ex.: "Audiência em 2d"). */
  label: string;
  /** Ação primária associada a este sinal. */
  cta: ContextualAction;
}

/**
 * Snapshot normalizado do assistido. Cada superfície monta o que conseguir;
 * campos ausentes são tratados como "não sei" (não disparam sinal).
 */
export interface AssistidoSnapshot {
  // identidade (alimenta completudeFicha)
  cpf?: string | null;
  rg?: string | null;
  dataNascimento?: string | null;
  nomeMae?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  telefoneContato?: string | null;
  naturalidade?: string | null;

  // operacional
  /** Status prisional bruto — alimenta o sinal de custódia. */
  statusPrisional?: string | null;
  /** Quantidade de processos ativos sem caso vinculado. */
  processosSemCaso?: number;
  /** Há ao menos uma demanda vencida? (se omitido, deriva de `proximoPrazo`). */
  demandaAtrasada?: boolean;
  /** ISO do prazo de demanda mais próximo. */
  proximoPrazo?: string | null;
  /** ISO da próxima audiência agendada. */
  proximaAudiencia?: string | null;
}

/** Janela (em dias) a partir da qual uma audiência futura vira sinal de atenção. */
export const DIAS_AUDIENCIA_PROXIMA = 7;

/** Precedência entre sinais — define ordenação e qual vira o CTA primário. */
const PRECEDENCE: Record<AttentionKind, number> = {
  "demanda-atrasada": 0,
  "preso-sem-audiencia": 1,
  "audiencia-proxima": 2,
  "processo-orfao": 3,
  "cadastro-critico": 4,
  "sem-contato": 5,
};

/** Regex de status prisional "preso" — alinhado com o perfil/layout. */
const PRESO_RE = /CADEIA|PENITENC|PRESO|FECHADO|SEMIABERTO|REGIME|COP|HOSPITAL/;

function diffDays(iso: string, now: Date): number {
  return differenceInDays(parseISO(iso), now);
}

/**
 * Deriva os sinais de atenção ativos, ordenados por precedência (mais crítico
 * primeiro). `now` é injetável para testes determinísticos.
 */
export function attentionSignals(
  s: AssistidoSnapshot,
  now: Date = new Date(),
): AttentionSignal[] {
  const signals: AttentionSignal[] = [];

  const atrasada =
    s.demandaAtrasada ?? (s.proximoPrazo ? diffDays(s.proximoPrazo, now) < 0 : false);
  if (atrasada) {
    signals.push({
      kind: "demanda-atrasada",
      severity: "critical",
      label: "Demanda atrasada",
      cta: { kind: "demanda-atrasada", label: "Tratar demanda atrasada" },
    });
  }

  const ehPreso = PRESO_RE.test(String(s.statusPrisional ?? "").toUpperCase());
  if (ehPreso && !s.proximaAudiencia) {
    signals.push({
      kind: "preso-sem-audiencia",
      severity: "critical",
      label: "Preso sem audiência marcada",
      cta: { kind: "preso-sem-audiencia", label: "Verificar audiência / excesso de prazo" },
    });
  }

  if (s.proximaAudiencia) {
    const d = diffDays(s.proximaAudiencia, now);
    if (d >= 0 && d <= DIAS_AUDIENCIA_PROXIMA) {
      signals.push({
        kind: "audiencia-proxima",
        severity: d <= 3 ? "critical" : "warning",
        label: d === 0 ? "Audiência hoje" : d === 1 ? "Audiência amanhã" : `Audiência em ${d}d`,
        cta: { kind: "audiencia-proxima", label: "Preparar audiência" },
      });
    }
  }

  if ((s.processosSemCaso ?? 0) > 0) {
    signals.push({
      kind: "processo-orfao",
      severity: "warning",
      label: "Processo sem caso",
      cta: { kind: "processo-orfao", label: "Criar caso" },
    });
  }

  const comp = completudeFicha(s);
  if (comp.tone === "critical") {
    signals.push({
      kind: "cadastro-critico",
      severity: "warning",
      label: `Ficha ${comp.pct}%`,
      cta: { kind: "cadastro-critico", label: "Completar cadastro" },
    });
  }

  if (!preenchido(s.telefone) && !preenchido(s.telefoneContato)) {
    signals.push({
      kind: "sem-contato",
      severity: "info",
      label: "Sem telefone",
      cta: { kind: "sem-contato", label: "Adicionar contato" },
    });
  }

  return signals.sort((a, b) => PRECEDENCE[a.kind] - PRECEDENCE[b.kind]);
}

/**
 * Resolve a melhor ação primária para o estado atual do assistido.
 * Sem urgências → fallback "Ver assistido".
 */
export function contextualCTA(
  s: AssistidoSnapshot,
  now: Date = new Date(),
): ContextualAction {
  const [primeiro] = attentionSignals(s, now);
  return primeiro?.cta ?? { kind: "ver", label: "Ver assistido" };
}

// ============================================
// ADAPTERS
// ============================================

/**
 * Normaliza a entrada (item de lista ou payload de detalhe) num snapshot limpo,
 * descartando propriedades fora do contrato. `extra` permite enriquecer com sinais
 * que só o detalhe conhece (ex.: `processosSemCaso` derivado de `processos[]`).
 */
export function toSnapshot(
  a: AssistidoSnapshot,
  extra?: Pick<AssistidoSnapshot, "processosSemCaso" | "demandaAtrasada">,
): AssistidoSnapshot {
  return {
    cpf: a.cpf,
    rg: a.rg,
    dataNascimento: a.dataNascimento,
    nomeMae: a.nomeMae,
    endereco: a.endereco,
    telefone: a.telefone,
    telefoneContato: a.telefoneContato,
    naturalidade: a.naturalidade,
    statusPrisional: a.statusPrisional,
    processosSemCaso: a.processosSemCaso,
    demandaAtrasada: a.demandaAtrasada,
    proximoPrazo: a.proximoPrazo,
    proximaAudiencia: a.proximaAudiencia,
    ...extra,
  };
}

/** Conta processos ativos sem caso vinculado — base do callout de processo órfão. */
export function countProcessosSemCaso(
  processos: ReadonlyArray<{ casoId?: number | null }>,
): number {
  return processos.filter((p) => p.casoId == null).length;
}
