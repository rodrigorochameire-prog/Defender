const NOISE_LINE = /^(Num\.\s+\d+|Pág\.\s+\d+|https?:\/\/|Assinado eletronicamente|O sistema registrou|Você tomou ciência|TRIBUNAL|VARA |COMARCA|ESTADO DA BAHIA|MINISTÉRIO PÚBLICO)/i;

const NARRATIVE_START = /(No dia|Na data|Na madrugada|Na noite|Nas proximidades|Por volta|O denunciado|O acusado|A vítima|Em \d{2}\/\d{2})/i;

export function extrairNarrativaFatos(texto: string): string {
  if (!texto.trim()) return "";

  const lines = texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !NOISE_LINE.test(l));

  // Find first line that looks like the start of the narrative paragraph
  const startIdx = lines.findIndex((l) => NARRATIVE_START.test(l));
  const narrative = startIdx >= 0 ? lines.slice(startIdx) : lines;

  // Collapse into a readable paragraph
  return narrative.join("\n").trim();
}
