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

// Ordem importa: padrões mais específicos primeiro (ex.: "Instrução e Julgamento"
// antes de "Instrução"; "Oitiva Especial" antes de "Oitiva"). Match na primeira
// ocorrência — se não bater nenhum, modal cai pro estado vazio.
const TIPOS_CONHECIDOS = [
  { needle: /instru[cç][aã]o\s+e\s+julgamento/i, label: "Instrução e Julgamento" },
  { needle: /instru[cç][aã]o/i, label: "Instrução" },
  // Lei 13.431/2017 — depoimento sem dano (criança/adolescente vítima ou testemunha).
  // Cobre "oitiva especial", "oitiva especializada", "depoimento sem dano".
  { needle: /oitiva\s+especial(?:izad[ao])?|depoimento\s+sem\s+dano/i, label: "Oitiva Especial" },
  // Art. 366 CPP — produção antecipada de prova.
  { needle: /antecipa[cç][aã]o\s+de\s+prova|produ[cç][aã]o\s+antecipada/i, label: "Antecipação de Prova" },
  // Plenário do Júri — sessão de julgamento (júri popular).
  { needle: /plen[aá]rio\s+(?:do\s+)?j[uú]ri|sess[aã]o\s+(?:de\s+)?j[uú]ri/i, label: "Plenário do Júri" },
  // Art. 16 Lei Maria da Penha — renúncia da representação.
  { needle: /preliminar\s+\(?maria\s+da\s+penha|art\.?\s*16\s+(?:da\s+)?lei\s+maria/i, label: "Preliminar (Maria da Penha)" },
  { needle: /julgamento/i, label: "Julgamento" },
  { needle: /cust[óo]dia/i, label: "Custódia" },
  { needle: /concilia[cç][aã]o/i, label: "Conciliação" },
  { needle: /justifica[cç][aã]o/i, label: "Justificação" },
  { needle: /admoesta[cç][aã]o|admonit[óo]ria/i, label: "Admoestação" },
  { needle: /audi[êe]ncia\s+una|^una$/i, label: "Una" },
];

// Procura data/hora preferindo o trecho próximo a palavras-chave de audiência
// ("designo audiência ... para o dia DD/MM/YYYY, às HHhMM"). Se não houver
// contexto, cai no primeiro match do texto.
const CONTEXT_REGEX = /(?:designa[çc][aã]o|designo|designad[ao]|audi[eê]ncia|para\s+o\s+dia|conduzida\s+por)/i;

function pickDate(text: string): RegExpMatchArray | null {
  const ctx = text.match(CONTEXT_REGEX);
  if (ctx && ctx.index !== undefined) {
    const tail = text.slice(ctx.index);
    const m = tail.match(DATA_REGEX);
    if (m) return m;
  }
  return text.match(DATA_REGEX);
}

function pickHora(text: string): RegExpMatchArray | null {
  const ctx = text.match(CONTEXT_REGEX);
  if (ctx && ctx.index !== undefined) {
    const tail = text.slice(ctx.index);
    const m = tail.match(HORA_REGEX);
    if (m) return m;
  }
  return text.match(HORA_REGEX);
}

export function parseAudienciaFromText(...sources: Array<string | null | undefined>): AudienciaParsed {
  const text = sources.filter(Boolean).join(" ");

  let data: string | null = null;
  const mData = pickDate(text);
  if (mData) {
    const d = mData[1].padStart(2, "0");
    const m = mData[2].padStart(2, "0");
    let y = mData[3];
    if (y.length === 2) y = (Number(y) > 50 ? "19" : "20") + y;
    data = `${y}-${m}-${d}`;
  }

  let hora: string | null = null;
  const mHora = pickHora(text);
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
