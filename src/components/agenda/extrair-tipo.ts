import { toTitleCase } from "@/lib/utils/title-case";

const tipoAbreviacoes: Record<string, string> = {
  "Audiência de Instrução e Julgamento": "AIJ",
  "Instrução e Julgamento": "AIJ",
  "Audiência de Custódia": "Custódia",
  "Audiência de Justificação": "Justificação",
  "Audiência Preliminar": "Preliminar",
  "Audiência de Apresentação": "Apresentação",
  "Audiência de Conciliação": "Conciliação",
  "Sessão de Julgamento do Tribunal do Júri": "Júri",
  "Sessão do Tribunal do Júri": "Júri",
  "Tribunal do Júri": "Júri",
  "Sessão de Júri": "Júri",
  "Plenário do Júri": "Júri",
  "Produção Antecipada de Provas": "PAP",
  "Acordo de Não Persecução Penal": "ANPP",
  "Audiência Admonitória": "Admonitória",
  "Oitiva Especial": "Oitiva Especial",
  "Audiência de Retratação": "Retratação",
  "Audiência de Execução": "Execução",
  "Audiência de Progressão": "Progressão",
  "Audiência de Livramento": "Livramento",
  "Audiência de Unificação": "Unificação",
  "Audiência Adminitória": "Adminitória",
  "Adminitória": "Adminitória",
  "Retratação": "Retratação",
  "Audiência de Medidas Protetivas": "Med. Protetivas",
  "Medidas Protetivas": "Med. Protetivas",
  "Atendimento": "Atendimento",
  "Reunião": "Reunião",
  "Diligência": "Diligência",
};

function lookupTipo(segment: string): string | null {
  const normalized = segment.toLowerCase();
  // Pass 1: exact match (case-insensitive)
  for (const [chave, abrev] of Object.entries(tipoAbreviacoes)) {
    if (chave.toLowerCase() === normalized) return abrev;
  }
  // Pass 2: the segment *starts with* the full key phrase (key is a prefix of the segment).
  // Sort by descending key length so more-specific keys win over shorter ones.
  const sortedEntries = Object.entries(tipoAbreviacoes).sort(
    ([a], [b]) => b.length - a.length
  );
  for (const [chave, abrev] of sortedEntries) {
    const chaveNorm = chave.toLowerCase();
    // Segment starts with key AND the next character (if any) is a space —
    // this prevents "audiência" from greedily matching "audiência concentrada"
    // when "audiência concentrada" is not in the map but "audiência" is.
    if (
      normalized.startsWith(chaveNorm) &&
      (normalized.length === chaveNorm.length ||
        normalized[chaveNorm.length] === " ")
    ) {
      return abrev;
    }
  }
  return null;
}

export function extrairTipo(titulo: string): string {
  const clean = titulo.replace(/^ADV\s*[-–—]\s*/i, "").replace(/^ADV\s+/i, "");
  // Split em hífen, en-dash OU em-dash (U+2014). Bug original ignorava em-dash.
  const firstSegment = clean.split(/\s*[-–—]\s*/)[0]?.trim() || "";

  const matched = lookupTipo(firstSegment);
  if (matched) return matched;

  const titled = toTitleCase(firstSegment);
  if (titled.length <= 21) return titled;
  return titled.substring(0, 20) + "…";
}
