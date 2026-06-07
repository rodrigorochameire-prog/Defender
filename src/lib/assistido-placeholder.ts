/**
 * Placeholder de assistido para expedientes sigilosos SEM parte verificada.
 *
 * Um expediente VVD sigiloso muitas vezes chega sem nome de parte; o parser
 * marca o assistido como `⚠ A identificar`. Esses casos NÃO podem casar por
 * nome com pessoa real (foi assim que processos sigilosos foram vinculados ao
 * assistido errado — ver issue do matcher) nem colapsar todos num único
 * placeholder compartilhado. A solução é um placeholder ISOLADO por CNJ.
 *
 * Módulo puro (sem DB) para ser testável isoladamente.
 */
import { ASSISTIDO_A_IDENTIFICAR } from "@/lib/pje-parser";

/** Nome (vazio, espaços ou o marcador do parser) indica parte não verificada. */
export function ehAssistidoNaoIdentificado(nome: string): boolean {
  const n = (nome || "").trim();
  return n === "" || n.startsWith(ASSISTIDO_A_IDENTIFICAR);
}

/**
 * Placeholder isolado por CNJ — `⚠ A identificar — <cnj>`, exatamente o formato
 * que `listPendentesRevisao` parseia para exibir o processo. Sem CNJ (raro),
 * volta ao marcador puro em vez de inventar sufixo.
 */
export function placeholderAssistidoParaCnj(cnj?: string): string {
  const c = (cnj || "").trim();
  return c ? `${ASSISTIDO_A_IDENTIFICAR} — ${c}` : ASSISTIDO_A_IDENTIFICAR;
}
