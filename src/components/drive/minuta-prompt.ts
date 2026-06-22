/**
 * Montagem do prompt "leitura → peça": transforma o caderno de citações (grifos por
 * categoria) + contexto numa instrução para a skill de peça do daemon. Lógica pura.
 *
 * Spec: docs/specs/leitura-para-peca.md
 */
import { citationsToText, type CitationGroup } from "./citation-export";

export interface MinutaContext {
  tipoPeca?: string;
  assistido?: string;
  processo?: string;
}

export function buildMinutaPrompt(groups: CitationGroup[], ctx: MinutaContext): string {
  const tipo = ctx.tipoPeca?.trim() || "peça de defesa";
  const assistido = ctx.assistido?.trim();
  const processo = ctx.processo?.trim();

  let cabecalho = `Gere uma minuta de ${tipo}`;
  if (assistido) cabecalho += ` para o assistido ${assistido}`;
  if (processo) cabecalho += ` no processo ${processo}`;
  cabecalho += ".";

  const regra =
    "Use EXCLUSIVAMENTE as anotações abaixo, extraídas dos autos pelo defensor e " +
    "organizadas por categoria. Cite as páginas indicadas. NÃO invente fatos nem provas; " +
    "se faltar base para alguma tese, sinalize em vez de presumir.";

  const caderno = groups.length
    ? citationsToText(groups)
    : "Não há grifos com texto selecionado nos autos para usar como base.";

  return `${cabecalho}\n\n${regra}\n\n---\n\n${caderno}`;
}
