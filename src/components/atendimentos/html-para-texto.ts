// Converte HTML cru em texto simples legível. Usado ao importar o conteúdo do
// atendimento (assunto/pedido/relato — que pode vir com marcação) para o registro
// inicial da demanda, evitando tags visíveis no textarea (defeito apontado na spec).
//
// Pragmático e sem DOM (roda em qualquer ambiente/teste): trata quebras de bloco,
// remove tags, decodifica entidades comuns e colapsa espaços/linhas em excesso.

const ENTIDADES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

export function htmlParaTexto(input: string | null | undefined): string {
  if (!input) return "";
  let s = input;
  // <br> e fechamento de blocos → quebra de linha
  s = s.replace(/<\s*br\s*\/?\s*>/gi, "\n");
  s = s.replace(/<\s*\/\s*(p|div|li|h[1-6]|tr|blockquote)\s*>/gi, "\n");
  // remove as demais tags
  s = s.replace(/<[^>]+>/g, "");
  // entidades nomeadas comuns (case-insensitive)
  s = s.replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;|&apos;/gi, (m) => ENTIDADES[m.toLowerCase()] ?? m);
  // entidades numéricas (&#233;)
  s = s.replace(/&#(\d+);/g, (_, n) => {
    const code = Number(n);
    return Number.isFinite(code) ? String.fromCodePoint(code) : "";
  });
  // normaliza espaços e linhas
  s = s
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return s;
}
