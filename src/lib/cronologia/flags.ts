import { differenceInDays } from "date-fns";

interface PrisaoMin {
  tipo: string;
  dataInicio: string;
  dataFim?: string | null;
  situacao: string;
}

interface MarcoMin {
  tipo: string;
  data: string;
}

export interface PrisaoStatus {
  tipo: string;
  dataInicio: string;
  diasPreso: number;
}

export function computePrisaoStatus(prisoes: PrisaoMin[]): PrisaoStatus | null {
  const ativa = prisoes.find((p) => p.situacao === "ativa" && !p.dataFim);
  if (!ativa) return null;
  const ini = new Date(ativa.dataInicio);
  if (isNaN(ini.getTime())) return null;
  return {
    tipo: ativa.tipo,
    dataInicio: ativa.dataInicio,
    diasPreso: Math.max(0, differenceInDays(new Date(), ini)),
  };
}

/**
 * Fases relevantes para a razoabilidade da prisão preventiva.
 * O STJ analisa o excesso de prazo de forma GLOBAL (não puramente aritmética),
 * mas a fase processual baliza a expectativa de duração razoável.
 */
export type FasePreventiva = "pre-denuncia" | "instrucao" | "pos-sentenca";

/**
 * Limites de razoabilidade em dias, contados desde o INÍCIO da prisão.
 * Heurística conservadora para SINALIZAÇÃO — não são prazos legais absolutos.
 * Tunáveis pelo defensor conforme a jurisprudência local/STJ aplicável.
 */
export const LIMITES_PREVENTIVA_DIAS: Record<FasePreventiva, number> = {
  "pre-denuncia": 80, // soma dos prazos do IP com réu preso
  instrucao: 150, // recebimento da denúncia até sentença
  "pos-sentenca": 540, // preventiva mantida aguardando recurso/trânsito
};

const FASE_LABEL: Record<FasePreventiva, string> = {
  "pre-denuncia": "sem denúncia",
  instrucao: "na instrução",
  "pos-sentenca": "aguardando recurso/trânsito",
};

function ocorreuApos(marcos: MarcoMin[], tipo: string, inicio: Date): boolean {
  return marcos.some(
    (m) => m.tipo === tipo && new Date(m.data).getTime() >= inicio.getTime(),
  );
}

/** Determina a fase processual corrente a partir dos marcos (do início da prisão em diante). */
function detectFasePreventiva(marcos: MarcoMin[], inicio: Date): FasePreventiva {
  if (ocorreuApos(marcos, "sentenca", inicio) || ocorreuApos(marcos, "transito-julgado", inicio)) {
    return "pos-sentenca";
  }
  if (ocorreuApos(marcos, "denuncia", inicio) || ocorreuApos(marcos, "recebimento-denuncia", inicio)) {
    return "instrucao";
  }
  return "pre-denuncia";
}

export interface ExcessoPrazoFlag {
  diasPreso: number;
  diasExcedidos: number;
  motivo: string;
  /** Fase processual usada para escolher o limite de razoabilidade. */
  fase: FasePreventiva;
  /** Limite de dias aplicado para a fase corrente. */
  limiteDias: number;
  /** Severidade calibrada para a UI. */
  nivel: "amber" | "red";
}

/**
 * Detecta excesso de prazo da prisão preventiva CONSCIENTE DE FASE.
 * Diferente da versão anterior (que só olhava a fase pré-denúncia), agora
 * acompanha o assistido por toda a marcha processual: instrução e pós-sentença
 * também sinalizam quando a custódia ultrapassa o razoável para aquela fase.
 */
export function detectExcessoPrazoPreventiva(
  prisoes: PrisaoMin[],
  marcos: MarcoMin[],
): ExcessoPrazoFlag | null {
  const ativa = prisoes.find(
    (p) => p.tipo === "preventiva" && p.situacao === "ativa" && !p.dataFim,
  );
  if (!ativa) return null;

  const inicio = new Date(ativa.dataInicio);
  if (isNaN(inicio.getTime())) return null;
  const diasPreso = Math.max(0, differenceInDays(new Date(), inicio));

  const fase = detectFasePreventiva(marcos, inicio);
  const limiteDias = LIMITES_PREVENTIVA_DIAS[fase];
  const diasExcedidos = diasPreso - limiteDias;
  if (diasExcedidos <= 0) return null;

  // Pré-denúncia escala mais rápido: liberdade restringida antes mesmo da acusação.
  const limiarRed = fase === "pre-denuncia" ? 20 : 60;
  const nivel: "amber" | "red" = diasExcedidos > limiarRed ? "red" : "amber";

  return {
    diasPreso,
    diasExcedidos,
    fase,
    limiteDias,
    nivel,
    motivo: `Preventiva ativa há ${diasPreso} dias (${FASE_LABEL[fase]}, limite de razoabilidade ${limiteDias}d — excede ${diasExcedidos}d)`,
  };
}

/**
 * Limites para o intervalo fato → denúncia (em dias), sinal de risco de
 * prescrição da pretensão punitiva. Heurística conservadora e tunável: o
 * patamar mínimo do art. 109 CP é 3 anos; sinalizamos para o defensor checar
 * a prescrição concreta (que depende da pena), não afirmamos prescrição.
 */
export const LIMITE_FATO_DENUNCIA_DIAS = 1095; // ~3 anos
const LIMITE_FATO_DENUNCIA_RED_DIAS = 1460; // ~4 anos

export interface TempoFatoDenunciaFlag {
  diasFatoDenuncia: number;
  /** "denuncia" = medido até a denúncia/recebimento; "hoje" = ainda sem denúncia. */
  marcoFinal: "denuncia" | "hoje";
  nivel: "amber" | "red";
  motivo: string;
}

export function detectTempoFatoDenunciaExcessivo(
  marcos: MarcoMin[],
): TempoFatoDenunciaFlag | null {
  const fatos = marcos
    .filter((m) => m.tipo === "fato")
    .map((m) => new Date(m.data))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  const fato = fatos[0];
  if (!fato) return null;

  const denuncias = marcos
    .filter((m) => m.tipo === "denuncia" || m.tipo === "recebimento-denuncia")
    .map((m) => new Date(m.data))
    .filter((d) => !isNaN(d.getTime()) && d.getTime() >= fato.getTime())
    .sort((a, b) => a.getTime() - b.getTime());
  const denuncia = denuncias[0];

  const fim = denuncia ?? new Date();
  const marcoFinal: "denuncia" | "hoje" = denuncia ? "denuncia" : "hoje";
  const diasFatoDenuncia = Math.max(0, differenceInDays(fim, fato));
  if (diasFatoDenuncia <= LIMITE_FATO_DENUNCIA_DIAS) return null;

  const nivel: "amber" | "red" =
    diasFatoDenuncia > LIMITE_FATO_DENUNCIA_RED_DIAS ? "red" : "amber";
  const sufixo =
    marcoFinal === "hoje" ? "e ainda sem denúncia" : "até a denúncia";
  return {
    diasFatoDenuncia,
    marcoFinal,
    nivel,
    motivo: `${diasFatoDenuncia} dias entre o fato ${sufixo} — verificar prescrição da pretensão punitiva`,
  };
}

export interface FlagranteSemCustodiaFlag {
  diasDesdeFlagrante: number;
}

export function detectFlagranteSemCustodia(
  prisoes: PrisaoMin[],
  marcos: MarcoMin[],
): FlagranteSemCustodiaFlag | null {
  const flagrante = prisoes.find((p) => p.tipo === "flagrante" && p.situacao === "ativa" && !p.dataFim);
  if (!flagrante) return null;

  const ini = new Date(flagrante.dataInicio);
  if (isNaN(ini.getTime())) return null;

  const teveCustodia = marcos.some((m) => {
    if (m.tipo !== "audiencia-custodia") return false;
    const md = new Date(m.data);
    return md.getTime() >= ini.getTime();
  });
  if (teveCustodia) return null;

  const dias = Math.max(0, differenceInDays(new Date(), ini));
  if (dias >= 1) {
    return { diasDesdeFlagrante: dias };
  }
  return null;
}
