/**
 * Extrai data + hora + tipo de uma descrição livre (providências, ato, texto
 * copiado do PJe). Usado para pré-popular o modal de confirmação de audiência
 * quando o usuário marca "Ciência designação/redesignação de audiência".
 *
 * Retorna apenas o que conseguir detectar; `null` em cada campo ausente.
 */

export interface AudienciaParsed {
  data: string | null; // "YYYY-MM-DD"
  hora: string | null; // "HH:MM"
  tipo: string | null;
}

const DATA_REGEX = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
const HORA_REGEX = /(\d{1,2})\s*(?:h|:)\s*(\d{2})?/i;

const TIPOS_CONHECIDOS = [
  { needle: /instru[cç][aã]o\s+e\s+julgamento/i, label: "Instrução e Julgamento" },
  { needle: /instru[cç][aã]o/i, label: "Instrução" },
  { needle: /julgamento/i, label: "Julgamento" },
  { needle: /custódia|custodia/i, label: "Custódia" },
  { needle: /concilia[cç][aã]o/i, label: "Conciliação" },
  { needle: /una/i, label: "Una" },
  { needle: /admoesta[cç][aã]o/i, label: "Admoestação" },
];

export function parseAudienciaFromText(...sources: Array<string | null | undefined>): AudienciaParsed {
  const text = sources.filter(Boolean).join(" ");

  let data: string | null = null;
  const mData = text.match(DATA_REGEX);
  if (mData) {
    const d = mData[1].padStart(2, "0");
    const m = mData[2].padStart(2, "0");
    let y = mData[3];
    if (y.length === 2) y = (Number(y) > 50 ? "19" : "20") + y;
    data = `${y}-${m}-${d}`;
  }

  let hora: string | null = null;
  const mHora = text.match(HORA_REGEX);
  if (mHora) {
    const h = mHora[1].padStart(2, "0");
    const min = (mHora[2] ?? "00").padStart(2, "0");
    const hNum = Number(h);
    if (hNum >= 0 && hNum < 24) hora = `${h}:${min}`;
  }

  let tipo: string | null = null;
  for (const t of TIPOS_CONHECIDOS) {
    if (t.needle.test(text)) {
      tipo = t.label;
      break;
    }
  }

  return { data, hora, tipo };
}

/**
 * Atos que devem abrir o modal de confirmação de audiência.
 */
export const ATOS_AUDIENCIA = new Set([
  "Ciência designação de audiência",
  "Ciência redesignação de audiência",
]);

export function isAtoAudiencia(ato: string | null | undefined): boolean {
  if (!ato) return false;
  return ATOS_AUDIENCIA.has(ato);
}
