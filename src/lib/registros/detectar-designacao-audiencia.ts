/**
 * Detecta designação de audiência em texto de despacho/ciência do PJe.
 *
 * Padrão típico:
 *   "Em cumprimento ao despacho de ID. 545387706, designo audiência de
 *    instrução e julgamento na modalidade híbrida para o dia 14/07/2026,
 *    às 09h50min."
 *
 * Variações cobertas: "designo/redesigno/designar/fica designada/aprazo",
 * tipos de audiência usuais, datas "dia DD/MM/AAAA", horas "09h50min" / "9h" /
 * "09:50", modalidade (híbrida/virtual/presencial/videoconferência) e o
 * movimento automatizado do PJe:
 *   "AUDIÊNCIA JUSTIFICAÇÃO DESIGNADA CONDUZIDA POR 28/07/2026 08:20 EM/PARA
 *    VARA DE VIOLÊNCIA DOMÉSTICA FAM CONTRA A MULHER DE CAMAÇARI, #NÃO PREENCHIDO#."
 * (data após "por", hora colada à data sem "às", local após "em/para").
 *
 * Usado pelo side-effect de `registros.create` (tipo "ciencia") para agendar
 * a audiência automaticamente. Função pura — testável sem banco.
 */

export interface DesignacaoAudiencia {
  /** yyyy-MM-dd */
  data: string;
  /** HH:mm (hora local do despacho) */
  horario: string;
  /** Rótulo canônico, ex. "Audiência de Instrução e Julgamento" */
  tipo: string;
  modalidade: string | null;
  /** Local/vara extraído do movimento ("em/para <vara>"), quando presente */
  local: string | null;
  /** true quando o texto indica REdesignação (a anterior caiu) */
  redesignacao: boolean;
  /** Trecho do texto que disparou a detecção (para auditoria na descrição) */
  trecho: string;
}

const TIPOS: Array<[RegExp, string]> = [
  [/instru[cç][ãa]o\s+e\s+julgamento/i, "Audiência de Instrução e Julgamento"],
  [/instru[cç][ãa]o/i, "Audiência de Instrução"],
  [/concilia[cç][ãa]o/i, "Audiência de Conciliação"],
  [/justifica[cç][ãa]o/i, "Audiência de Justificação"],
  [/cust[oó]dia/i, "Audiência de Custódia"],
  [/admonit[oó]ria/i, "Audiência Admonitória"],
  [/depoimento\s+especial/i, "Depoimento Especial"],
  [/oitiva\s+especial(?:izada)?/i, "Oitiva Especial"],
  [/oitiva/i, "Oitiva"],
  [/\buna\b/i, "Audiência UNA"],
  [/preliminar/i, "Audiência Preliminar"],
];

// Gatilho: verbo de designação + substantivo do ato por perto (até ~80 chars),
// ou a forma passiva "audiência ... designada". Além de "audiência", despachos
// designam "oitiva especializada" e "depoimento especial" sem usar a palavra
// audiência (ex.: "designo oitiva especializada na modalidade presencial").
const GATILHO =
  /\b(?:(re)?designo|(re)?designa(?:r|da|-se)?|fica(?:m)?\s+(re)?designad[ao]s?|aprazo|aprazada)\b[\s\S]{0,80}?\b(?:audi[eê]ncia|oitiva|depoimento\s+especial)\b|\b(?:audi[eê]ncia|oitiva|depoimento\s+especial)\b[\s\S]{0,80}?\b(re)?designad[ao]\b/i;

const DATA_RE = /\bdia\s+(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})/i;
const DATA_FALLBACK_RE = /\bpara\s+(?:o\s+)?(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/i;
// Movimento automatizado do PJe: "DESIGNADA CONDUZIDA POR 28/07/2026 08:20".
// Exige ano com 4 dígitos por ser fallback sem âncora de "dia"/"para".
const DATA_MOVIMENTO_RE = /\bpor\s+(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/i;
// (?:^|\s) em vez de \b: o boundary ASCII do JS não funciona antes de "à"
const HORA_RE = /(?:^|\s)[àa]s?\s+(\d{1,2})\s*[h:]\s*(\d{2})?\s*(?:min)?/i;
// Hora colada à data, sem "às" (movimento PJe: "28/07/2026 08:20").
// Ancorada no início do trecho pós-data e exigindo minutos para não capturar
// números soltos do restante do texto.
const HORA_POS_DATA_RE = /^[\s,;–-]{0,3}(\d{1,2})\s*[h:]\s*(\d{2})\b/;
const MODALIDADE_RE = /\b(h[ií]brid[ao]|virtual|presencial|videoconfer[êe]ncia|telepresencial|semipresencial)\b/i;
// Local no movimento PJe: "EM/PARA VARA DE VIOLÊNCIA ... DE CAMAÇARI, #NÃO PREENCHIDO#."
const LOCAL_RE = /\bem\/para\s+([^,;#\n]+)/i;

export function detectarDesignacaoAudiencia(
  texto: string
): DesignacaoAudiencia | null {
  if (!texto) return null;
  const gat = GATILHO.exec(texto);
  if (!gat) return null;

  // Busca data/hora a partir do gatilho (evita pegar datas de outros trechos
  // do despacho, como prazos de intimação anteriores).
  const aPartir = texto.slice(gat.index);
  const dm =
    DATA_RE.exec(aPartir) ??
    DATA_FALLBACK_RE.exec(aPartir) ??
    DATA_MOVIMENTO_RE.exec(aPartir);
  if (!dm) return null;
  const dia = Number(dm[1]);
  const mes = Number(dm[2]);
  let ano = Number(dm[3]);
  if (ano < 100) ano += 2000;
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12 || ano < 2000 || ano > 2100) {
    return null;
  }

  // Hora: procurada após a data ("dia X, às HHhMM" ou, no movimento PJe,
  // colada à data sem "às": "28/07/2026 08:20").
  const aposData = aPartir.slice((dm.index ?? 0) + dm[0].length);
  const hm = HORA_POS_DATA_RE.exec(aposData) ?? HORA_RE.exec(aposData);
  const hora = hm ? Number(hm[1]) : 0;
  const minuto = hm?.[2] ? Number(hm[2]) : 0;
  if (hora > 23 || minuto > 59) return null;

  let tipo = "Audiência";
  for (const [re, label] of TIPOS) {
    if (re.test(aPartir.slice(0, 200))) {
      tipo = label;
      break;
    }
  }

  const mod = MODALIDADE_RE.exec(aPartir.slice(0, 250));
  const loc = LOCAL_RE.exec(aPartir);
  const fimTrecho = (dm.index ?? 0) + dm[0].length + (hm ? (hm.index ?? 0) + hm[0].length : 0);

  return {
    data: `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`,
    horario: `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`,
    tipo,
    modalidade: mod ? mod[1].toLowerCase() : null,
    local: loc ? loc[1].trim().replace(/[.\s]+$/, "") : null,
    redesignacao: /\bre(?:designo|designa|designad)/i.test(gat[0]),
    trecho: aPartir.slice(0, Math.min(Math.max(fimTrecho, 80), 220)).trim(),
  };
}
