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
  /** Códigos cujas cláusulas vieram sob verbo de revogação (ajuste posterior). */
  medidasRevogadas: MedidaMpuCodigo[];
}

/**
 * Detecta se um segmento normalizado contém um token de negação/indeferimento.
 */
const NEGACAO =
  /\b(indefiro|indeferi|indeferid\w*|indeferimento|nao defiro|deixo de deferir|rejeito|nao ha (?:elementos|risco))\b/;

/**
 * Detecta verbo explícito de deferimento (com word boundaries que impedem
 * match dentro de palavras de negação: `indefiro` começa com `in`, portanto
 * `\bdefiro\b` NÃO casa dentro de `indefiro`).
 */
const DEFERIMENTO =
  /\b(defiro|deferid\w*|deferi|determin\w*|concedo|concede|acolh\w*|mantenho|mantid\w*|mantem)\b/;

/**
 * Revogação de medida já deferida (≠ indeferimento): a cláusula não vira
 * concessão e o código detectado é exposto em `medidasRevogadas` para o
 * chamador atualizar o status das medidas existentes.
 */
const REVOGACAO = /\b(revogo|revogad\w*|revoga(?:-se)?|casso|cassad\w*|torno sem efeito)\b/;

/**
 * Divide o texto em segmentos por alíneas (`a) b)…`) — incluindo alíneas inline
 * separadas por `;` ou `.` — ou por incisos romanos (`I - II -`), por
 * fronteiras de frase (`.`), ou por ponto-e-vírgula (`;`). Garante que a máquina
 * de polaridade opere sobre cláusulas granulares.
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

  // 4. Ponto-e-vírgula — separa cláusulas dentro da mesma frase
  //    (ex.: "Indeferida a proibição de contato; defiro o afastamento do lar.")
  const semColons = texto.split(/;\s*/).filter((s) => s.trim());
  if (semColons.length >= 2) return semColons;

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
    return {
      ofendida: null,
      agressor: null,
      fundamentos: [],
      prazoDias: null,
      medidas: [],
      medidasRevogadas: [],
    };
  }
  const normFull = normalizar(texto);
  const { ofendida, agressor } = extrairPartes(texto);

  const segmentos = segmentar(texto);
  const porCodigo = new Map<MedidaMpuCodigo, MedidaParsed>();

  // Máquina de polaridade por cláusula (C1+):
  //   - Padrão "defere" (cobre listas de alíneas/incisos governadas por verbo anterior
  //     e frases sem verbo explícito).
  //   - Negação tem precedência quando ambos os sinais aparecem no mesmo segmento.
  //   - Verbo explícito de deferimento sobrepõe polaridade herdada de segmento anterior.
  //   - Cláusulas sem verbo herdam a polaridade do segmento precedente (propagação
  //     necessária para listas como "INDEFIRO: x; y" ou "DEFIRO: x; y").
  //   - Falso-positivo (medida indeferida gravada como deferida) nunca ocorre:
  //     no pior caso (negação+deferimento em cláusula única sem `;`), a cláusula
  //     inteira é tratada como "indefere" — falso-negativo seguro.
  let polaridade: "defere" | "indefere" | "revoga" = "defere";
  const revogadas = new Set<MedidaMpuCodigo>();

  for (const seg of segmentos) {
    const segNorm = normalizar(seg);

    // Atualiza polaridade: negação tem precedência, depois revogação; verbo de
    // deferimento sobrepõe polaridade herdada; sem verbo → herda a anterior.
    if (NEGACAO.test(segNorm)) {
      polaridade = "indefere";
    } else if (REVOGACAO.test(segNorm)) {
      polaridade = "revoga";
    } else if (DEFERIMENTO.test(segNorm)) {
      polaridade = "defere";
    }
    // else: herda polaridade anterior (sem alteração)

    if (polaridade === "indefere") continue;

    for (const cat of CATALOGO_MEDIDAS) {
      if (!cat.gatilhos.some((g) => g.test(segNorm))) continue;
      if (polaridade === "revoga") {
        revogadas.add(cat.codigo);
      } else if (!porCodigo.has(cat.codigo)) {
        porCodigo.set(cat.codigo, {
          codigo: cat.codigo,
          artigo: cat.artigo,
          literal: seg.trim().slice(0, 500),
          ...enriquecer(cat.codigo, segNorm),
        });
      }
    }
  }

  // Concessão na mesma decisão prevalece sobre revogação do mesmo código
  // (ex.: "revogo X; defiro X com nova distância" = modificação, não fim).
  for (const cod of porCodigo.keys()) revogadas.delete(cod);

  return {
    ofendida,
    agressor,
    fundamentos: extrairFundamentos(normFull),
    prazoDias: extrairPrazo(normFull),
    medidas: [...porCodigo.values()],
    medidasRevogadas: [...revogadas],
  };
}
