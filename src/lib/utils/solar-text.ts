/**
 * Utilitários para preparar texto OMBUDS → Solar
 *
 * O Solar tem limite de ~2000 caracteres por anotação.
 * Estas funções preparam o texto para envio seguro.
 */

// ==========================================
// CONSTANTES
// ==========================================

/** Limite padrão de caracteres (margem de segurança vs limite 2000) */
const DEFAULT_MAX_CHARS = 1800;

/** Prefixo para identificar anotações vindas do OMBUDS */
const OMBUDS_PREFIX = "[OMBUDS]";

/** Sufixo quando texto é truncado */
const TRUNCATION_SUFFIX = "\n(...) [texto completo no OMBUDS]";

// ==========================================
// FUNÇÕES PRINCIPAIS
// ==========================================

/**
 * Remove formatação markdown/rich text de um texto.
 * Mantém apenas o conteúdo textual legível.
 */
export function stripMarkdown(texto: string): string {
  return texto
    // Headers: ## Título → Título
    .replace(/^#{1,6}\s+/gm, "")
    // Bold/italic: **texto** ou *texto* → texto
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    // Underline: __texto__ → texto
    .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")
    // Strikethrough: ~~texto~~ → texto
    .replace(/~~([^~]+)~~/g, "$1")
    // Links: [texto](url) → texto
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Images: ![alt](url) → [alt]
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "[$1]")
    // Code blocks: ```code``` → code
    .replace(/```[\s\S]*?```/g, (match) =>
      match.replace(/```\w*\n?/g, "").replace(/```/g, "").trim()
    )
    // Inline code: `code` → code
    .replace(/`([^`]+)`/g, "$1")
    // Blockquotes: > texto → texto
    .replace(/^>\s+/gm, "")
    // Horizontal rules: --- → (remove)
    .replace(/^[-*_]{3,}\s*$/gm, "")
    // List markers: - item ou * item ou 1. item → item
    .replace(/^[\s]*[-*+]\s+/gm, "• ")
    .replace(/^[\s]*\d+\.\s+/gm, "• ")
    // Multiple newlines → double newline
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Prepara texto para envio ao Solar.
 *
 * - Remove formatação markdown
 * - Adiciona prefixo [OMBUDS]
 * - Trunca a maxChars com indicador de truncamento
 *
 * @param texto - Texto original do OMBUDS
 * @param maxChars - Limite de caracteres (padrão: 1800)
 * @returns Texto preparado para o Solar
 *
 * @example
 *   prepararTextoParaSolar("## Petição\n\nTexto **longo**...")
 *   // "[OMBUDS] Petição\n\nTexto longo..."
 */
export function prepararTextoParaSolar(
  texto: string,
  maxChars: number = DEFAULT_MAX_CHARS
): string {
  if (!texto || texto.trim().length === 0) {
    return "";
  }

  // 1. Limpar formatação
  let limpo = stripMarkdown(texto);

  // 2. Adicionar prefixo OMBUDS
  limpo = `${OMBUDS_PREFIX} ${limpo}`;

  // 3. Truncar se necessário
  if (limpo.length > maxChars) {
    const maxContent = maxChars - TRUNCATION_SUFFIX.length;
    // Cortar na última palavra completa
    const truncated = limpo.substring(0, maxContent);
    const lastSpace = truncated.lastIndexOf(" ");
    const cutPoint = lastSpace > maxContent * 0.8 ? lastSpace : maxContent;
    limpo = truncated.substring(0, cutPoint) + TRUNCATION_SUFFIX;
  }

  return limpo;
}

/**
 * Gera texto de resumo para uma anotação ser enviada ao Solar.
 *
 * Formato: "[OMBUDS] [TIPO] dd/mm/aaaa - conteúdo..."
 *
 * @example
 *   gerarResumoAnotacao({
 *     tipo: "providencia",
 *     conteudo: "Elaborada petição de HC...",
 *     createdAt: new Date()
 *   })
 *   // "[OMBUDS] [PROVIDÊNCIA] 26/02/2026 - Elaborada petição de HC..."
 */
export function gerarResumoAnotacao(anotacao: {
  tipo: string;
  conteudo: string;
  createdAt: Date;
}): string {
  const data = anotacao.createdAt;
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();

  const tipoLabel = anotacao.tipo.toUpperCase().replace(/_/g, " ");
  const prefix = `${OMBUDS_PREFIX} [${tipoLabel}] ${dia}/${mes}/${ano} - `;

  const conteudoLimpo = stripMarkdown(anotacao.conteudo);
  const maxConteudo = DEFAULT_MAX_CHARS - prefix.length - TRUNCATION_SUFFIX.length;

  if (conteudoLimpo.length <= maxConteudo) {
    return `${prefix}${conteudoLimpo}`;
  }

  // Truncar no último espaço
  const truncated = conteudoLimpo.substring(0, maxConteudo);
  const lastSpace = truncated.lastIndexOf(" ");
  const cutPoint = lastSpace > maxConteudo * 0.8 ? lastSpace : maxConteudo;
  return `${prefix}${truncated.substring(0, cutPoint)}${TRUNCATION_SUFFIX}`;
}

/**
 * Gera texto curto para registro de protocolo no Solar.
 *
 * @example
 *   gerarTextoProtocolo("Apelação", "8009547-53.2024.8.05.0039")
 *   // "[OMBUDS] Petição de Apelação protocolada - Processo 8009547-53.2024.8.05.0039"
 */
export function gerarTextoProtocolo(
  tipoAto: string,
  numProcesso?: string
): string {
  const processo = numProcesso ? ` - Processo ${numProcesso}` : "";
  return `${OMBUDS_PREFIX} Petição de ${tipoAto} protocolada${processo}`;
}
