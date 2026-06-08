import {
  CATALOGO_MEDIDAS,
  MEDIDA_MPU,
  normalizar,
  type Lugar,
  type MedidaMpuCodigo,
  type MeioContato,
  type Protegido,
} from "./medidas-taxonomia";

export interface MedidaParsed {
  codigo: MedidaMpuCodigo;
  artigo: string;
  literal: string;
  distanciaMetros?: number;
  protegidos?: Protegido[];
  meios?: MeioContato[];
  lugares?: Lugar[];
  valor?: string;
}

export interface DecisaoMPUParsed {
  ofendida: string | null;
  agressor: string | null;
  fundamentos: string[];
  prazoDias: number | null;
  medidas: MedidaParsed[];
}

/**
 * Detecta se um segmento normalizado contém um token de negação/indeferimento.
 * Quando verdadeiro, nenhuma medida nesse segmento deve ser capturada.
 */
const NEGACAO =
  /\b(indefiro|indeferi|indeferid\w*|indeferimento|nao defiro|deixo de deferir|rejeito|nao ha (?:elementos|risco))\b/;

/**
 * Divide o texto em segmentos por alíneas (`a) b)…`) — incluindo alíneas inline
 * separadas por `;` ou `.` — ou por incisos romanos (`I - II -`), ou por
 * fronteiras de frase. Garante que cada polarity gate (deferido/indeferido) seja
 * aplicado ao segmento correto.
 */
function segmentar(texto: string): string[] {
  // 1. Alíneas: linha-início OU após ; ou . (alíneas inline)
  const alineaSplit = texto.split(/(?:(?<=^)|(?<=;\s*)|(?<=\.\s*))(?=[a-z]\)\s)/im);
  if (alineaSplit.length >= 2) return alineaSplit;

  // 2. Incisos romanos
  const porInciso = texto
    .split(/(?=\b[IVX]{1,4}\s*[-–]\s)/g)
    .filter((s) => /^\s*[IVX]{1,4}\s*[-–]/.test(s));
  if (porInciso.length >= 2) return porInciso;

  // 3. Fronteiras de frase — cada frase é um segmento independente, o que
  //    permite isolar o polarity gate por frase (ex.: "DEFIRO X. INDEFIRO Y.")
  const sentences = texto.split(/(?<=\.)\s+/).filter((s) => s.trim());
  if (sentences.length >= 2) return sentences;

  return [texto];
}

function extrairProtegidos(norm: string): Protegido[] {
  const out: Protegido[] = [];
  if (/ofendida|vitima/.test(norm)) out.push("ofendida");
  if (/familiar/.test(norm)) out.push("familiares");
  if (/testemunha/.test(norm)) out.push("testemunhas");
  return out;
}

function extrairMeios(norm: string): MeioContato[] {
  const out: MeioContato[] = [];
  if (/telefone|ligac|whatsapp/.test(norm)) out.push("telefone");
  if (/e-?mail/.test(norm)) out.push("email");
  if (/rede(s)? soci/.test(norm)) out.push("redes_sociais");
  if (/mensagem|aplicativo/.test(norm)) out.push("mensagens");
  if (/interposta pessoa|terceiro/.test(norm)) out.push("interposta_pessoa");
  return out;
}

function extrairLugares(norm: string): Lugar[] {
  const out: Lugar[] = [];
  if (/residencia|moradia|casa da (vitima|ofendida)/.test(norm)) out.push("residencia_vitima");
  if (/(local|lugar)? ?de trabalho|emprego/.test(norm)) out.push("trabalho_vitima");
  return out;
}

function extrairDistancia(norm: string): number | undefined {
  // Bind tightly to "metros" to avoid grabbing unrelated numbers.
  const m = norm.match(/(\d{1,4})\s*(?:\([^)]*\)\s*)?metros?\b/);
  return m ? parseInt(m[1], 10) : undefined;
}

function enriquecer(codigo: MedidaMpuCodigo, segmentoNorm: string): Partial<MedidaParsed> {
  switch (codigo) {
    case MEDIDA_MPU.PROIBICAO_APROXIMACAO:
      return {
        distanciaMetros: extrairDistancia(segmentoNorm),
        protegidos: extrairProtegidos(segmentoNorm),
      };
    case MEDIDA_MPU.PROIBICAO_CONTATO:
      return {
        meios: extrairMeios(segmentoNorm),
        protegidos: extrairProtegidos(segmentoNorm),
      };
    case MEDIDA_MPU.PROIBICAO_FREQUENTAR:
      return { lugares: extrairLugares(segmentoNorm) };
    default:
      return {};
  }
}

function extrairPartes(texto: string): { ofendida: string | null; agressor: string | null } {
  // Allow lowercase connectors inside names (e.g. "MARIA da SILVA SANTOS").
  const ofendida = texto.match(/em favor de\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ' ]+?)\s+e,/);
  const agressor = texto.match(/determino que\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ' ]+?)\s+cumpra/);
  return {
    ofendida: ofendida ? ofendida[1].trim() : null,
    agressor: agressor ? agressor[1].trim() : null,
  };
}

function extrairFundamentos(norm: string): string[] {
  const out = new Set<string>();
  const re = /artigos?\s+([\d,\se]+?)\s+da lei/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(norm))) {
    for (const n of m[1].match(/\d+/g) ?? []) out.add(`art. ${n}`);
  }
  return [...out];
}

function extrairPrazo(norm: string): number | null {
  const m = norm.match(/prazo de\s+(\d+)\s*\(?[^)]*\)?\s*dias/);
  return m ? parseInt(m[1], 10) : null;
}

export function parseDecisaoMPU(texto: string): DecisaoMPUParsed {
  if (!texto || !texto.trim()) {
    return { ofendida: null, agressor: null, fundamentos: [], prazoDias: null, medidas: [] };
  }
  const normFull = normalizar(texto);
  const { ofendida, agressor } = extrairPartes(texto);

  const segmentos = segmentar(texto);
  const porCodigo = new Map<MedidaMpuCodigo, MedidaParsed>();

  for (const seg of segmentos) {
    const segNorm = normalizar(seg);

    // Polarity gate (C1): skip all triggers in segments that deny the measure.
    if (NEGACAO.test(segNorm)) continue;

    for (const cat of CATALOGO_MEDIDAS) {
      if (cat.gatilhos.some((g) => g.test(segNorm)) && !porCodigo.has(cat.codigo)) {
        porCodigo.set(cat.codigo, {
          codigo: cat.codigo,
          artigo: cat.artigo,
          literal: seg.trim().slice(0, 500),
          ...enriquecer(cat.codigo, segNorm),
        });
      }
    }
  }

  return {
    ofendida,
    agressor,
    fundamentos: extrairFundamentos(normFull),
    prazoDias: extrairPrazo(normFull),
    medidas: [...porCodigo.values()],
  };
}
