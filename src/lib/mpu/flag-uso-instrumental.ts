import { differenceInDays } from "date-fns";

/**
 * Flag "uso instrumental da LMP" — função PURA, conservadora.
 *
 * ⚠️ ÉTICA: NÃO é um veredito sobre a veracidade do relato da vítima. É um
 * detector de FATORES CÍVEIS CONECTADOS que merecem análise do defensor antes
 * de adotar qualquer tese. A LMP protege; indicadores contextuais não provam
 * nada. A UI que consome isto DEVE: (a) mostrar só ao defensor, (b) usar copy
 * não-acusatória, (c) jamais rotular a vítima. Threshold rigoroso (score ≥ 3):
 * melhor não sinalizar do que sinalizar fraco.
 */

export interface UsoInstrumentalInput {
  /** Referência temporal: data do pedido/decisão da MPU. Sem ela, os fatores temporais não pontuam. */
  dataPedidoMpu?: string | null;
  divorcioEmCurso?: boolean;
  divorcioDataInicio?: string | null;
  guardaEmDisputa?: boolean;
  guardaDataInicio?: string | null;
  imovelConjugalEmDisputa?: boolean;
  tiposViolencia?: string[];
  retratacaoPolicialData?: string | null;
  denunciaOferecida?: boolean;
  dataDenuncia?: string | null;
  requerenteRecorrente?: boolean;
}

export interface FatorPontuado {
  rotulo: string;
  peso: number;
}

export interface UsoInstrumentalResult {
  score: number;
  /** Liga apenas com score >= 3. */
  ativo: boolean;
  fatores: FatorPontuado[];
}

const LIMIAR_ATIVACAO = 3;
const JANELA_PROXIMIDADE_DIAS = 90;

function dataValida(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Verdadeiro se `inicio` ocorreu de 0 a <90 dias ANTES de `pedido`. */
function iniciadoPoucoAntes(inicio?: string | null, pedido?: string | null): boolean {
  const di = dataValida(inicio);
  const dp = dataValida(pedido);
  if (!di || !dp) return false;
  const dias = differenceInDays(dp, di);
  return dias >= 0 && dias < JANELA_PROXIMIDADE_DIAS;
}

export function avaliarUsoInstrumental(input: UsoInstrumentalInput): UsoInstrumentalResult {
  const fatores: FatorPontuado[] = [];

  if (input.divorcioEmCurso && iniciadoPoucoAntes(input.divorcioDataInicio, input.dataPedidoMpu)) {
    fatores.push({ rotulo: "Divórcio iniciado pouco antes da MPU (<90d)", peso: 2 });
  }
  if (input.guardaEmDisputa && iniciadoPoucoAntes(input.guardaDataInicio, input.dataPedidoMpu)) {
    fatores.push({ rotulo: "Disputa de guarda iniciada pouco antes da MPU (<90d)", peso: 2 });
  }
  if (input.imovelConjugalEmDisputa) {
    fatores.push({ rotulo: "Imóvel conjugal em disputa", peso: 1 });
  }
  // Só pontua se os tipos de violência são CONHECIDOS e nenhum é física/sexual.
  const tipos = input.tiposViolencia ?? [];
  if (tipos.length > 0 && !tipos.includes("fisica") && !tipos.includes("sexual")) {
    fatores.push({ rotulo: "Sem relato de violência física ou sexual", peso: 1 });
  }
  // Retratação na fase policial SEGUIDA de nova denúncia (data posterior).
  const dRetr = dataValida(input.retratacaoPolicialData);
  const dDen = dataValida(input.dataDenuncia);
  if (dRetr && input.denunciaOferecida && dDen && dDen.getTime() > dRetr.getTime()) {
    fatores.push({ rotulo: "Retratação policial seguida de nova denúncia", peso: 2 });
  }
  if (input.requerenteRecorrente) {
    fatores.push({ rotulo: "Requerente recorrente (denúncias cíclicas)", peso: 2 });
  }

  const score = fatores.reduce((soma, f) => soma + f.peso, 0);
  return { score, ativo: score >= LIMIAR_ATIVACAO, fatores };
}
