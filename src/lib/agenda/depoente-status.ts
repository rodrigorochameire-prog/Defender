// Deriva o status de oitiva de um depoente a partir do dado do dossiê.
// Separa DELEGACIA (depoimento_ip) de JUÍZO (depoimento_juizo / já ouvido) e,
// quando ainda falta ouvir em juízo, o status de intimação + o motivo se não
// intimado. Fonte única usada pelo painel de depoentes.

const MOTIVO_LABEL: Record<string, string> = {
  nao_localizado: "não localizado",
  mandado_nao_cumprido: "mandado não cumprido",
  endereco_invalido: "endereço inválido",
  em_diligencia: "em diligência",
  recusa_recebimento: "recusou ciência",
  precatoria_devolvida: "precatória devolvida",
  precatoria_pendente: "precatória pendente",
  mandado_nao_emitido: "mandado não expedido",
  falta_de_informacoes: "sem informação nos autos",
};

export type IntimacaoStatus =
  | "intimado"
  | "nao_intimado"
  | "pendente"
  | "dispensada"
  | "desconhecido";

export interface StatusOitiva {
  ouvidoDelegacia: boolean;
  ouvidoJuizo: boolean;
  intimacao: IntimacaoStatus;
  motivoLabel: string | null;
  faltaJuizo: boolean;
  /**
   * Síntese booleana da intimação: true (foi intimado), false (explicitamente
   * não intimado / não localizado), null (desconhecido ou indeterminado —
   * pendente/dispensada não afirmam nem negam a ciência). Útil para o painel
   * de depoentes sinalizar cerceamento sem ambiguidade.
   */
  intimado: boolean | null;
  /**
   * Teor da certidão de comunicação processual (mandado/AR/precatória),
   * quando presente. Lido de `certidao_comunicacao` (snake) ou
   * `certidaoComunicacao` (camel). null quando ausente/vazia.
   */
  certidao: string | null;
}

const naoVazio = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

export function derivarStatusOitiva(d: any): StatusOitiva {
  const ouvidoDelegacia = naoVazio(d?.depoimento_ip);
  const ouvidoJuizo =
    naoVazio(d?.depoimento_juizo) ||
    !!d?.ja_ouvido?.sim ||
    d?.comparecimento === "ouvido_anteriormente";
  const intimacao: IntimacaoStatus = (d?.intimacao ?? "desconhecido") as IntimacaoStatus;
  const motivoLabel =
    intimacao === "nao_intimado" && d?.motivo_nao_intimacao
      ? MOTIVO_LABEL[d.motivo_nao_intimacao] ?? d.motivo_nao_intimacao
      : null;
  const intimado =
    intimacao === "intimado" ? true : intimacao === "nao_intimado" ? false : null;
  const certidaoRaw = d?.certidao_comunicacao ?? d?.certidaoComunicacao;
  const certidao = naoVazio(certidaoRaw) ? certidaoRaw.trim() : null;
  return {
    ouvidoDelegacia,
    ouvidoJuizo,
    intimacao,
    motivoLabel,
    faltaJuizo: !ouvidoJuizo,
    intimado,
    certidao,
  };
}

/** Síntese da prova oral para o "console" do modo Prova oral (spec §D). */
export interface ResumoProvaOral {
  total: number;
  /** Já ouvidos em juízo. */
  ouvidos: number;
  /** Ainda a ouvir em juízo (faltaJuizo). */
  aOuvir: number;
  /** Entre os a ouvir: com ciência confirmada (intimado). */
  intimados: number;
  /** Entre os a ouvir: NÃO intimados — risco de cerceamento. */
  semCiencia: number;
}

/**
 * Agrega o status de oitiva de uma lista de depoentes. Base do console de ação
 * do modo Prova oral: total, ouvidos, a ouvir e — sinal de cerceamento — quantos
 * dos pendentes seguem sem ciência (não intimados).
 */
export function resumoProvaOral(depoentes: unknown[]): ResumoProvaOral {
  const r: ResumoProvaOral = { total: 0, ouvidos: 0, aOuvir: 0, intimados: 0, semCiencia: 0 };
  if (!Array.isArray(depoentes)) return r;
  r.total = depoentes.length;
  for (const d of depoentes) {
    const s = derivarStatusOitiva(d);
    if (s.ouvidoJuizo) {
      r.ouvidos++;
      continue;
    }
    r.aOuvir++;
    if (s.intimado === true) r.intimados++;
    else if (s.intimado === false) r.semCiencia++;
  }
  return r;
}
