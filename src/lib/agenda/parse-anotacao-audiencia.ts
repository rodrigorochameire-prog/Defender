/**
 * Parser determinístico de anotações rápidas: detecta evento de NÃO realização
 * de audiência (redesignada/suspensa/adiada/cancelada), motivo pelo catálogo e
 * nova data/hora quando presentes. Padrão do parseDecisaoMPU: catálogo de
 * regex + gate de polaridade — na dúvida retorna null (falso negativo seguro).
 * Nunca aplica nada: quem aplica é audiencias.aplicarEventoAudiencia, após
 * confirmação do usuário.
 *
 * Spec: docs/superpowers/specs/2026-06-11-eventos-audiencia-anotacoes-design.md
 */
import { parseAudienciaFromText } from "@/lib/audiencia-parser";

export type EventoAudiencia = "redesignada" | "suspensa" | "adiada" | "cancelada";

export type MotivoNaoRealizacao =
  | "ausencia_vitima"
  | "ausencia_testemunha"
  | "ausencia_reu"
  | "reu_nao_conduzido"
  | "pauta_juizo"
  | "problema_tecnico"
  | "outro";

export interface AnotacaoAudienciaParsed {
  evento: EventoAudiencia;
  motivo: MotivoNaoRealizacao;
  motivoDetalhe: string;
  novaData: string | null; // "YYYY-MM-DD"
  novaHora: string | null; // "HH:MM"
}

const EVENTOS: Array<{ needle: RegExp; evento: EventoAudiencia }> = [
  { needle: /redesignad/i, evento: "redesignada" },
  { needle: /suspens[aã]o|suspensa/i, evento: "suspensa" },
  { needle: /adiad/i, evento: "adiada" },
  { needle: /cancelad|n[aã]o\s+(?:foi\s+)?realizad|n[aã]o\s+se\s+realizou/i, evento: "cancelada" },
];

// Termos que afirmam realização/manutenção. Se presentes sem negação imediata
// ("não foi realizada"), a anotação relata audiência que ACONTECEU — mesmo que
// cite redesignação de algo acessório (ex.: depoente) — e o parser se cala.
const POLARIDADE_POSITIVA = /\b(realizada|mantida|confirmada|ocorreu)\b/i;

// Ordem importa: motivos mais específicos primeiro (réu não conduzido antes de
// réu ausente). Primeira ocorrência vence; sem match cai em "outro".
const MOTIVOS: Array<{ needle: RegExp; motivo: MotivoNaoRealizacao }> = [
  { needle: /v[ií]tima/i, motivo: "ausencia_vitima" },
  { needle: /testemunha/i, motivo: "ausencia_testemunha" },
  { needle: /n[aã]o\s+(?:foi\s+)?conduzid|sem\s+escolta/i, motivo: "reu_nao_conduzido" },
  { needle: /aus[êe]ncia\s+do\s+(?:r[ée]u|acusad)|(?:r[ée]u|acusad[oa])\s+(?:ausente|n[aã]o\s+compareceu)/i, motivo: "ausencia_reu" },
  { needle: /excesso\s+de\s+pauta|pauta\s+do\s+ju[ií]zo|pelo\s+ju[ií]zo|magistrad|ju[ií]z[ao]?\s+ausente|de\s+of[ií]cio/i, motivo: "pauta_juizo" },
  { needle: /videoconfer|v[ií]deo\s*confer|sistema|\blink\b|t[ée]cnic|internet|balc[aã]o\s+virtual/i, motivo: "problema_tecnico" },
];

export function parseAnotacaoAudiencia(
  texto: string | null | undefined
): AnotacaoAudienciaParsed | null {
  if (!texto || !texto.trim()) return null;

  const evento = EVENTOS.find((e) => e.needle.test(texto))?.evento ?? null;
  if (!evento) return null;

  // Gate de polaridade: termo positivo não negado nas ~16 posições anteriores
  // ("não foi realizada" passa; "audiência realizada, ..." bloqueia).
  const positivo = texto.match(POLARIDADE_POSITIVA);
  if (positivo && positivo.index !== undefined) {
    const antes = texto.slice(Math.max(0, positivo.index - 16), positivo.index);
    const negada = /n[aã]o\s+(?:foi\s+|se\s+)?$/i.test(antes);
    if (!negada) return null;
  }

  const motivo = MOTIVOS.find((m) => m.needle.test(texto))?.motivo ?? "outro";
  const { data, hora } = parseAudienciaFromText(texto);

  return {
    evento,
    motivo,
    motivoDetalhe: texto.trim(),
    novaData: data,
    novaHora: data ? hora ?? "00:00" : null,
  };
}

/** Rótulos para UI (banner, badge, selects). */
export const MOTIVO_LABELS: Record<MotivoNaoRealizacao, string> = {
  ausencia_vitima: "Ausência da vítima",
  ausencia_testemunha: "Ausência de testemunha",
  ausencia_reu: "Ausência do réu",
  reu_nao_conduzido: "Réu não conduzido",
  pauta_juizo: "Pauta/juízo",
  problema_tecnico: "Problema técnico",
  outro: "Outro",
};

export const EVENTO_LABELS: Record<EventoAudiencia, string> = {
  redesignada: "Redesignação",
  suspensa: "Suspensão",
  adiada: "Adiamento",
  cancelada: "Cancelamento",
};
