function normalizar(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

const RE_DESCONHECIDO = /desconhecid|nao identificad|incerto|ignorad|a identificar/;

export function isAutorDesconhecido(s: string | null | undefined): boolean {
  if (!s) return false;
  return RE_DESCONHECIDO.test(normalizar(s));
}

export function placeholderAutorDesconhecido(cnj: string): string {
  return `Desconhecido — ${cnj.trim()}`;
}

const CATALOGO_SIGLA: Array<[RegExp, string]> = [
  [/produc.*antecipada/, "PAP"],
  [/inquerito/, "IP"],
  [/acao penal/, "AP"],
  [/medidas? protetiv|maria da penha|11\.?340/, "MPU"],
  [/execucao/, "EP"],
];

export function siglaProcedimento(classe: string | null | undefined): string | null {
  if (!classe || !classe.trim()) return null;
  const n = normalizar(classe);
  for (const [re, sigla] of CATALOGO_SIGLA) if (re.test(n)) return sigla;
  return classe.trim();
}

export function extrairNumeroDesconhecido(poloPassivo: string | null | undefined): number | null {
  if (!poloPassivo) return null;
  const m = normalizar(poloPassivo).match(/desconhecid\w*\s+(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export interface NomeAutorArgs {
  cnj: string;
  classe?: string | null;
  assunto?: string | null;
  comarca?: string | null;
  poloPassivo?: string | null;
  desempate?: boolean;
}

export function nomeAutorDesconhecido(a: NomeAutorArgs): string {
  const n = extrairNumeroDesconhecido(a.poloPassivo);
  const cabeca = "Desconhecido" + (n ? ` ${n}` : "");
  const sigla = siglaProcedimento(a.classe);
  const assunto = a.assunto?.trim() || null;
  const comarca = a.comarca?.trim() || null;

  const tipo = assunto || sigla;
  if (!tipo) return placeholderAutorDesconhecido(a.cnj);

  const parens = [assunto ? sigla : null, comarca].filter(Boolean) as string[];
  let nome = `${cabeca} — ${tipo}`;
  if (parens.length) nome += ` (${parens.join(" · ")})`;
  if (a.desempate) nome += ` · ${a.cnj.split("-")[0]}`;
  return nome;
}
