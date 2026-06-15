import {
  CATALOGO_CAUTELARES,
  CAUTELAR,
  normalizar,
  type CautelarCodigo,
  type EspecieCautelar,
} from "./cautelares-taxonomia";

export interface CautelarParsed {
  codigo: CautelarCodigo;
  especie: EspecieCautelar;
  artigo: string;
  rotulo: string;
  literal: string;
  /** Parâmetros enriquecidos por espécie de cautelar. */
  periodicidade?: string; // comparecimento periódico (mensal/quinzenal/semanal)
  valorFianca?: string; // fiança (R$ … / N salários mínimos)
  horario?: string; // recolhimento noturno
  distanciaMetros?: number; // proibição de aproximação/lugares
  pessoas?: string[]; // proibição de contato
  lugares?: string[]; // proibição de acesso a lugares
}

export interface DecisaoCautelarParsed {
  fundamentos: string[];
  cautelares: CautelarParsed[];
  /** Códigos cujas cláusulas vieram sob verbo de revogação/relaxamento. */
  revogadas: CautelarCodigo[];
  /** true se a decisão fixou ao menos uma cautelar (prisão ou diversa). */
  temCautelar: boolean;
}

const NEGACAO =
  /\b(indefiro|indeferi|indeferid\w*|indeferimento|nao defiro|deixo de deferir|rejeito|nao ha (?:elementos|risco)|nego)\b/;

const DEFERIMENTO =
  /\b(defiro|deferid\w*|deferi|determin\w*|concedo|concede|decret\w*|convert\w*|substitu\w*|aplico|aplic\w*|imponho|impond\w*|fixo|arbitr\w*|mantenho|mantid\w*|mantem|acolh\w*)\b/;

const REVOGACAO =
  /\b(revogo|revogad\w*|revoga(?:-se)?|relax\w*|casso|cassad\w*|torno sem efeito|expe\w*.{0,15}alvara|concedo (a )?liberdade)\b/;

/** Divide o texto em cláusulas granulares (alíneas → incisos → frases → ; ). */
function segmentar(texto: string): string[] {
  const alineaSplit = texto.split(/(?:(?<=^)|(?<=;\s*)|(?<=\.\s*))(?=[a-z]\)\s)/im);
  if (alineaSplit.length >= 2) return alineaSplit;

  const porInciso = texto
    .split(/(?=\b[IVX]{1,4}\s*[-–]\s)/g)
    .filter((s) => /^\s*[IVX]{1,4}\s*[-–]/.test(s));
  if (porInciso.length >= 2) return porInciso;

  const sentences = texto.split(/(?<=\.)\s+/).filter((s) => s.trim());
  if (sentences.length >= 2) return sentences;

  const semColons = texto.split(/;\s*/).filter((s) => s.trim());
  if (semColons.length >= 2) return semColons;

  return [texto];
}

function extrairPeriodicidade(norm: string): string | undefined {
  if (/mensal|todo mes|por mes|cada mes/.test(norm)) return "mensal";
  if (/quinzenal|a cada quinze|cada 15 dias/.test(norm)) return "quinzenal";
  if (/semanal|toda semana|por semana/.test(norm)) return "semanal";
  if (/bimestral/.test(norm)) return "bimestral";
  return undefined;
}

function extrairValorFianca(norm: string): string | undefined {
  const reais = norm.match(/r\$\s*([\d.]+(?:,\d{2})?)/);
  if (reais) return `R$ ${reais[1]}`;
  const sm = norm.match(/(\d+(?:[.,]\d+)?)\s*(?:\([^)]*\)\s*)?sal[áa]?rios?[- ]?min/);
  if (sm) return `${sm[1]} salário(s) mínimo(s)`;
  return undefined;
}

function extrairHorario(norm: string): string | undefined {
  const m = norm.match(/das?\s*(\d{1,2}(?:h|:\d{2})?)\s*(?:as|ate|à)\s*(\d{1,2}(?:h|:\d{2})?)/);
  return m ? `${m[1]} às ${m[2]}` : undefined;
}

function extrairDistancia(norm: string): number | undefined {
  const m = norm.match(/(\d{1,4})\s*(?:\([^)]*\)\s*)?metros?\b/);
  return m ? parseInt(m[1], 10) : undefined;
}

function extrairPessoas(norm: string): string[] {
  const out: string[] = [];
  if (/vitima|ofendid/.test(norm)) out.push("vítima/ofendida");
  if (/testemunha/.test(norm)) out.push("testemunhas");
  if (/corre\w*|coautor|comparsa/.test(norm)) out.push("corréus");
  if (/familiar/.test(norm)) out.push("familiares");
  return out;
}

function extrairLugares(norm: string): string[] {
  const out: string[] = [];
  if (/residencia|moradia|casa da (vitima|ofendida)/.test(norm)) out.push("residência da vítima");
  if (/(local|lugar)? ?de trabalho|emprego/.test(norm)) out.push("trabalho da vítima");
  if (/escola|colegio/.test(norm)) out.push("escola");
  return out;
}

function enriquecer(codigo: CautelarCodigo, norm: string): Partial<CautelarParsed> {
  switch (codigo) {
    case CAUTELAR.COMPARECIMENTO_PERIODICO:
      return { periodicidade: extrairPeriodicidade(norm) };
    case CAUTELAR.FIANCA:
      return { valorFianca: extrairValorFianca(norm) };
    case CAUTELAR.RECOLHIMENTO_NOTURNO:
      return { horario: extrairHorario(norm) };
    case CAUTELAR.PROIBICAO_CONTATO:
      return { pessoas: extrairPessoas(norm), distanciaMetros: extrairDistancia(norm) };
    case CAUTELAR.PROIBICAO_ACESSO_LUGARES:
      return { lugares: extrairLugares(norm), distanciaMetros: extrairDistancia(norm) };
    default:
      return {};
  }
}

function extrairFundamentos(norm: string): string[] {
  const out = new Set<string>();
  // "artigo 312 do CPP", "arts. 319 e 320", etc.
  const re = /artigos?\s+([\d,\se]+?)\s+(?:do )?(?:cpp|codigo de processo penal)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(norm))) {
    for (const n of m[1].match(/\d+/g) ?? []) out.add(`art. ${n} CPP`);
  }
  if (/art(?:igo)?\.?\s*312/.test(norm)) out.add("art. 312 CPP");
  if (/art(?:igo)?\.?\s*319/.test(norm)) out.add("art. 319 CPP");
  return [...out];
}

/**
 * Parser determinístico de decisões que fixam cautelares pessoais (prisão e
 * diversas da prisão, art. 319/320 CPP). Mesma máquina de polaridade do parser
 * de MPU: negação > revogação > deferimento; cláusulas sem verbo herdam a
 * polaridade anterior; falso-positivo (indeferida gravada como deferida) nunca
 * ocorre (no pior caso vira indeferida — falso-negativo seguro).
 */
export function parseDecisaoCautelar(texto: string): DecisaoCautelarParsed {
  if (!texto || !texto.trim()) {
    return { fundamentos: [], cautelares: [], revogadas: [], temCautelar: false };
  }
  const normFull = normalizar(texto);
  const segmentos = segmentar(texto);
  const porCodigo = new Map<CautelarCodigo, CautelarParsed>();
  const revogadas = new Set<CautelarCodigo>();

  let polaridade: "defere" | "indefere" | "revoga" = "defere";

  for (const seg of segmentos) {
    const segNorm = normalizar(seg);

    if (NEGACAO.test(segNorm)) {
      polaridade = "indefere";
    } else if (REVOGACAO.test(segNorm)) {
      polaridade = "revoga";
    } else if (DEFERIMENTO.test(segNorm)) {
      polaridade = "defere";
    }
    // else: herda a polaridade anterior

    if (polaridade === "indefere") continue;

    for (const cat of CATALOGO_CAUTELARES) {
      if (!cat.gatilhos.some((g) => g.test(segNorm))) continue;
      if (polaridade === "revoga") {
        revogadas.add(cat.codigo);
      } else if (!porCodigo.has(cat.codigo)) {
        porCodigo.set(cat.codigo, {
          codigo: cat.codigo,
          especie: cat.especie,
          artigo: cat.artigo,
          rotulo: cat.rotulo,
          literal: seg.trim().slice(0, 500),
          ...enriquecer(cat.codigo, segNorm),
        });
      }
    }
  }

  // Concessão na mesma decisão prevalece sobre revogação do mesmo código.
  for (const cod of porCodigo.keys()) revogadas.delete(cod);

  const cautelares = [...porCodigo.values()];
  return {
    fundamentos: extrairFundamentos(normFull),
    cautelares,
    revogadas: [...revogadas],
    temCautelar: cautelares.length > 0,
  };
}
