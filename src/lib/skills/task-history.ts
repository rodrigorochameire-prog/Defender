/**
 * Formatter puro do histórico de skill tasks (claude_code_tasks) para a UI.
 * Transforma as linhas cruas de `analise.recentForEntity` em itens de exibição
 * (label da skill via catálogo, status legível + tom de cor, tempo relativo,
 * resumo curto). Sem dependência de React/DOM — testável em isolamento.
 */
import { SKILL_CATALOG } from "./catalog";

export type TaskStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "needs_review";

export interface RawTaskRow {
  id: number;
  skill: string;
  status: TaskStatus | string;
  etapa: string | null;
  erro: string | null;
  resultado: unknown;
  createdAt: Date | string | null;
  completedAt: Date | string | null;
}

export type HistoryTone = "success" | "danger" | "warning" | "running" | "muted";

export interface HistoryItem {
  id: number;
  skillLabel: string;
  status: string;
  statusLabel: string;
  tone: HistoryTone;
  when: string;
  summary: string;
}

const STATUS_META: Record<string, { label: string; tone: HistoryTone }> = {
  pending: { label: "Na fila", tone: "muted" },
  processing: { label: "Processando", tone: "running" },
  completed: { label: "Concluído", tone: "success" },
  failed: { label: "Falhou", tone: "danger" },
  needs_review: { label: "Revisar", tone: "warning" },
};

const LABEL_BY_SLUG = new Map(SKILL_CATALOG.map((s) => [s.slug, s.label]));

const MAX_SUMMARY = 160;

function toDate(value: Date | string | null): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function truncate(text: string): string {
  const t = text.trim();
  return t.length > MAX_SUMMARY ? `${t.slice(0, MAX_SUMMARY - 1)}…` : t;
}

/** Tempo relativo em pt-BR; `agora` / `há N min|h|d`; data curta para >7d. */
export function relativeTime(value: Date | string | null, now: number): string {
  const d = toDate(value);
  if (!d) return "—";
  const diffMs = now - d.getTime();
  if (diffMs < 60_000) return "agora";
  const min = Math.floor(diffMs / 60_000);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.floor(h / 24);
  if (days <= 7) return `há ${days} d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

/** Extrai um resumo curto do campo `resultado` (string, ou objeto com campo conhecido). */
function summaryFromResultado(resultado: unknown): string | null {
  if (resultado == null) return null;
  if (typeof resultado === "string") return resultado || null;
  if (typeof resultado === "object") {
    const obj = resultado as Record<string, unknown>;
    for (const key of ["resumo", "titulo", "summary", "title", "mensagem", "message"]) {
      const v = obj[key];
      if (typeof v === "string" && v.trim()) return v;
    }
    return "Resultado disponível";
  }
  return null;
}

function buildSummary(row: RawTaskRow): string {
  if (row.status === "failed") return truncate(row.erro || "Falha sem detalhe");
  if (row.status === "completed") {
    return truncate(summaryFromResultado(row.resultado) || "Resultado disponível");
  }
  // pending / processing / needs_review
  return truncate(row.etapa || STATUS_META[row.status]?.label || row.status);
}

export function toHistoryItems(rows: RawTaskRow[], now: number): HistoryItem[] {
  return rows.map((row) => {
    const meta = STATUS_META[row.status] ?? { label: row.status, tone: "muted" as HistoryTone };
    return {
      id: row.id,
      skillLabel: LABEL_BY_SLUG.get(row.skill) ?? row.skill,
      status: row.status,
      statusLabel: meta.label,
      tone: meta.tone,
      when: relativeTime(row.createdAt, now),
      summary: buildSummary(row),
    };
  });
}
