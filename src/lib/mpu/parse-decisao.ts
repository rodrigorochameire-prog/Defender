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

/** Divide o texto em segmentos: por alíneas (a) b)…) ou incisos (I - II -). */
function segmentar(texto: string): string[] {
  const porAlinea = texto.split(/(?=^\s*[a-z]\)\s)/im).filter((s) => /^\s*[a-z]\)/i.test(s));
  if (porAlinea.length >= 2) return porAlinea;
  const porInciso = texto
    .split(/(?=\b[IVX]{1,4}\s*[-–]\s)/g)
    .filter((s) => /^\s*[IVX]{1,4}\s*[-–]/.test(s));
  if (porInciso.length >= 2) return porInciso;
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
  const m = norm.match(/(\d{1,4})\s*(?:\([^)]*\)\s*)?met/);
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
  const ofendida = texto.match(/em favor de\s+([A-ZÀ-Ý][A-ZÀ-Ý\s]+?)\s+e,/);
  const agressor = texto.match(/determino que\s+([A-ZÀ-Ý][A-ZÀ-Ý\s]+?)\s+cumpra/);
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

  // Passo global: pega medidas em texto corrido que a segmentação não isolou.
  for (const cat of CATALOGO_MEDIDAS) {
    if (!porCodigo.has(cat.codigo) && cat.gatilhos.some((g) => g.test(normFull))) {
      porCodigo.set(cat.codigo, {
        codigo: cat.codigo,
        artigo: cat.artigo,
        literal: texto.trim().slice(0, 500),
        ...enriquecer(cat.codigo, normFull),
      });
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
