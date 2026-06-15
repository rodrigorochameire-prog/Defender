/**
 * Parser de ATA DE AUDIÊNCIA (texto colado de Ciência / PJe).
 *
 * Extrai, de forma estruturada e determinística:
 *  - mídias (links de gravação: Lifesize, PJe Mídias, genéricos) + rótulo
 *    ("oitiva da vítima") → acesso direto no OMBUDS;
 *  - presenças (juiz, MP, defensor, vítima, acusado);
 *  - depoentes ouvidos e ausentes (com o motivo da ausência);
 *  - resultado (realizada / suspensa / redesignada / não realizada);
 *  - redesignação (reutiliza detectarDesignacaoAudiencia).
 *
 * Função pura — testável sem banco.
 */

import {
  detectarDesignacaoAudiencia,
  type DesignacaoAudiencia,
} from "./detectar-designacao-audiencia";

export type TipoMidia = "lifesize" | "pje" | "youtube" | "drive" | "outro";

export interface MidiaAta {
  tipo: TipoMidia;
  url: string;
  /** Rótulo do que a mídia contém, ex. "oitiva da vítima". */
  rotulo: string | null;
}

export type ResultadoAta =
  | "realizada"
  | "suspensa"
  | "redesignada"
  | "nao_realizada";

export interface AtaParsed {
  ehAta: boolean;
  dataRealizada: string | null; // yyyy-MM-dd
  horaRealizada: string | null; // HH:mm
  presencas: {
    juiz: string | null;
    ministerioPublico: string | null;
    defensor: string | null;
    vitima: string | null;
    acusado: string | null;
  };
  ouvidos: Array<{ nome: string; papel: string | null }>;
  ausencias: Array<{ nome: string; papel: string | null; motivo: string | null }>;
  resultado: ResultadoAta;
  redesignacao: DesignacaoAudiencia | null;
  midias: MidiaAta[];
}

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function classificarMidia(url: string): TipoMidia {
  const u = url.toLowerCase();
  if (u.includes("lifesize.com")) return "lifesize";
  if (/pje|tjba|pjemidias|midias\./.test(u)) return "pje";
  if (u.includes("youtu")) return "youtube";
  if (u.includes("drive.google") || u.includes("docs.google")) return "drive";
  return "outro";
}

const URL_RE = /https?:\/\/[^\s<>")\]]+/gi;

/** Rótulo da mídia: texto entre "link da audiência," e ":" antes da URL. */
function rotuloDaMidia(textoAntes: string): string | null {
  // Remove pontuação/aspas/quebras e o "<" que antecede a URL no PJe.
  const t = textoAntes.replace(/[\s<:>"]+$/, "");
  // "Link da audiência, oitiva da vítima:" → "oitiva da vítima"
  const m = t.match(/link[^:,\n]*[,:]\s*([^:\n]{3,60})$/i);
  if (m) {
    const r = m[1].trim().replace(/^da audi[êe]ncia[,:]?\s*/i, "");
    if (r && !/^https?/i.test(r)) return r;
  }
  // fallback: "oitiva/depoimento/interrogatório de <quem>"
  const m2 = t.match(
    /(oitiva|depoimento|interrogat[óo]rio|inquiri[çc][ãa]o)\s+d[oae]s?\s+[^:\n]{2,40}$/i,
  );
  return m2 ? m2[0].trim() : null;
}

function extrairMidias(texto: string): MidiaAta[] {
  const out: MidiaAta[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(texto))) {
    const url = m[0].replace(/[.,;)]+$/, "");
    if (seen.has(url)) continue;
    seen.add(url);
    const antes = texto.slice(Math.max(0, m.index - 90), m.index);
    out.push({ tipo: classificarMidia(url), url, rotulo: rotuloDaMidia(antes) });
  }
  return out;
}

/** Captura "Rótulo: Nome" do bloco de presenças. */
function presenca(texto: string, rotulos: RegExp): string | null {
  const m = texto.match(rotulos);
  if (!m) return null;
  const nome = m[1].trim().replace(/[.;]+$/, "");
  return nome && nome.length > 1 ? nome : null;
}

const NOME = "([A-ZÀ-Ý][A-Za-zÀ-ÿ'’.\\- ]{2,80}?)";

function extrairOuvidos(textoFull: string): AtaParsed["ouvidos"] {
  const out: AtaParsed["ouvidos"] = [];
  const seen = new Set<string>();
  // Só conta atos REALIZADOS: corta no início da parte dispositiva
  // (suspensão / "para a continuidade ... designo"), evitando contar o
  // interrogatório/oitiva FUTUROS da redesignação como "ouvidos".
  const corte = textoFull.search(
    /(?:determino a suspens|suspendo|para a continuidade da audi[êe]ncia|designo o dia|redesigno|fica redesignad)/i,
  );
  const texto = corte > 0 ? textoFull.slice(0, corte) : textoFull;
  // "colhido o depoimento da vítima X", "ouvida a testemunha X",
  // "inquirição/interrogatório do acusado X"
  const re = new RegExp(
    `(?:depoimento|oitiva|inquiri[çc][ãa]o|interrogat[óo]rio)\\s+d[oae]s?\\s+(v[íi]tima|testemunha|acusad[oa]|r[ée]u|informante)?\\s*${NOME}(?=,|\\.|\\s+que\\b|\\s+respondeu|\\s+foi)`,
    "gi",
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto))) {
    const papel = m[1] ? m[1].toLowerCase() : null;
    const nome = m[2].trim().replace(/\s+(que|respondeu|foi)$/i, "").trim();
    const k = norm(nome);
    if (nome.length > 3 && !seen.has(k)) {
      seen.add(k);
      out.push({ nome, papel });
    }
  }
  return out;
}

function extrairAusencias(texto: string): AtaParsed["ausencias"] {
  const out: AtaParsed["ausencias"] = [];
  const seen = new Set<string>();
  // "ausência da testemunha X" / "ausência do acusado X"
  const re = new RegExp(
    `aus[êe]ncia\\s+d[oae]s?\\s+(testemunha|v[íi]tima|acusad[oa]|r[ée]u|informante)?\\s*(?:arrolad[oa]s?[,\\s]+)?(?:de nome\\s+)?${NOME}(?=,|\\.|\\s+tendo|\\s+que|\\s+encontra)`,
    "gi",
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto))) {
    const papel = m[1] ? m[1].toLowerCase() : null;
    const nome = m[2].trim().replace(/\s+(arrolad\w*|tendo|que)$/i, "").trim();
    const k = norm(nome);
    if (nome.length > 3 && !seen.has(k)) {
      seen.add(k);
      // motivo: frase de justificativa próxima ("justificativa de que ...")
      const janela = texto.slice(m.index, m.index + 320);
      const mot = janela.match(
        /justificativa de que\s+([^.]{5,160})|(?:encontra-se|est[áa])\s+([^.,]{4,120}(?:hospitalar|internad\w*|preso|presa|impossibilitad\w*)[^.,]{0,60})/i,
      );
      const motivo = mot ? (mot[1] ?? mot[2] ?? "").trim().replace(/[.;]+$/, "") : null;
      out.push({ nome, papel, motivo: motivo || null });
    }
  }
  return out;
}

export function parseAtaAudiencia(texto: string): AtaParsed {
  const vazio: AtaParsed = {
    ehAta: false,
    dataRealizada: null,
    horaRealizada: null,
    presencas: { juiz: null, ministerioPublico: null, defensor: null, vitima: null, acusado: null },
    ouvidos: [],
    ausencias: [],
    resultado: "realizada",
    redesignacao: null,
    midias: [],
  };
  if (!texto || !texto.trim()) return vazio;

  const n = norm(texto);
  const ehAta =
    /ata de audi[êe]ncia/.test(n) ||
    (/audi[êe]ncia/.test(n) && /(assentada|colhido o depoimento|sob a presid[êe]ncia|lavrei|encerrada a audi[êe]ncia)/.test(n));

  // Data de realização: preferimos a data por extenso do rodapé/abertura
  // ("Camaçari, 11 de junho de 2026" / "Aos 11 dias do mês de junho ... de 2026").
  // A data NUMÉRICA do corpo costuma ser a da REDESIGNAÇÃO (futura) — não usar.
  const MES: Record<string, string> = {
    janeiro: "01", fevereiro: "02", marco: "03", abril: "04", maio: "05", junho: "06",
    julho: "07", agosto: "08", setembro: "09", outubro: "10", novembro: "11", dezembro: "12",
  };
  let dataRealizada: string | null = null;
  const extenso = norm(texto).match(/(\d{1,2})\s+(?:dias?\s+)?d[eo]\s+(?:mes\s+de\s+)?([a-z]+)\s+d[eo]\s+(?:ano\s+de\s+)?(\d{4})/);
  if (extenso && MES[extenso[2]]) {
    dataRealizada = `${extenso[3]}-${MES[extenso[2]]}-${extenso[1].padStart(2, "0")}`;
  }
  const horaM = texto.match(/[àa]s\s+(\d{1,2})\s*[h:]\s*(\d{2})/i);
  const horaRealizada = horaM ? `${horaM[1].padStart(2, "0")}:${horaM[2]}` : null;

  const presencas = {
    juiz: presenca(texto, /Ju[íi]z(?:a)?(?:\s+de\s+Direito)?\s*:\s*([^\n]+)/i),
    ministerioPublico: presenca(texto, /Minist[ée]rio\s+P[úu]blico\s*:\s*([^\n]+)/i),
    defensor: presenca(texto, /Defensor(?:ia)?\s*(?:P[úu]blic[ao])?\s*:\s*([^\n]+)/i),
    vitima: presenca(texto, /V[íi]tima\s*:\s*([^\n]+)/i),
    acusado: presenca(texto, /(?:Acusad[oa]|R[ée]u|Denunciad[oa])\s*:\s*([^\n]+)/i),
  };

  const redesignacao = detectarDesignacaoAudiencia(texto);
  const suspensa = /suspens[ãa]o (?:do|da|de)|determino a suspens|suspendo/i.test(texto);
  const naoRealizada = /n[ãa]o (?:foi )?realizad|audi[êe]ncia prejudicad|restou prejudicad/i.test(texto);

  let resultado: ResultadoAta = "realizada";
  if (naoRealizada) resultado = "nao_realizada";
  else if (suspensa) resultado = "suspensa";
  else if (redesignacao?.redesignacao) resultado = "redesignada";

  return {
    ehAta,
    dataRealizada,
    horaRealizada,
    presencas,
    ouvidos: extrairOuvidos(texto),
    ausencias: extrairAusencias(texto),
    resultado,
    redesignacao,
    midias: extrairMidias(texto),
  };
}
