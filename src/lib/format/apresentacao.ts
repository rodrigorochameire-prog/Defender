/**
 * Camada central de formatação de APRESENTAÇÃO (render layer).
 *
 * Esta é a fonte única de formatação para exibição na UI. Ela NUNCA muta dado
 * armazenado — apenas transforma um valor cru em uma string legível. Todas as
 * funções são idempotentes: formatar um valor já formatado não o corrompe.
 *
 * Reaproveita os helpers existentes em vez de reinventá-los:
 *   - `formatCnj`/`onlyDigits` de `./cnj`
 *   - `nomeVaraExibicao` de `./nome-vara`
 *   - rótulos acentuados centrais de `../config/atribuicoes`
 *
 * O chamador mantém o valor cru para tooltip/cópia; estas funções servem só
 * para o texto exibido.
 */

import { formatCnj, onlyDigits } from "./cnj";
import { nomeVaraExibicao } from "./nome-vara";
import { getAtribuicaoColors } from "../config/atribuicoes";

/**
 * Telefone brasileiro para exibição.
 *
 * Aceita entrada crua ou já mascarada, com ou sem DDI 55. Suporta número local
 * de 8 dígitos (fixo) e 9 dígitos (celular). Se não conseguir parsear, devolve
 * a entrada apenas higienizada (trim), sem quebrar.
 *
 * Ex.: "5571993582869" → "(71) 99358-2869"
 *      "557135086246"  → "(71) 3508-6246"
 */
export function formatTelefone(raw: string): string {
  if (!raw) return "";
  let d = onlyDigits(raw);

  // Remove DDI 55 quando presente (13 díg. = 55 + DDD2 + 9, 12 díg. = 55 + DDD2 + 8).
  if ((d.length === 13 || d.length === 12) && d.startsWith("55")) {
    d = d.slice(2);
  }

  // Agora d deve ter 10 (DDD + 8) ou 11 (DDD + 9) dígitos.
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }

  // Não-parseável: devolve a entrada original higienizada.
  return raw.trim();
}

// Sufixo técnico grudado ao número de processo no scraping/import:
// "-1762785454112-1329818-...". Cortamos a partir do primeiro "-<dígitos>" que
// venha DEPOIS de já termos 20 dígitos de CNJ.
/**
 * Número de processo (CNJ) para exibição: aplica a máscara
 * NNNNNNN-DD.AAAA.J.TR.OOOO e trunca qualquer sufixo técnico (timestamp/id)
 * grudado pelo pipeline de scraping.
 *
 * Mantém o valor cru intacto no chamador (para tooltip). Idempotente: um CNJ já
 * mascarado volta igual. Sem 20 dígitos, devolve a entrada higienizada.
 */
export function formatProcesso(numero: string): string {
  if (!numero) return "";
  const d = onlyDigits(numero);

  // Sem os 20 dígitos do CNJ não há o que mascarar — devolve higienizado.
  if (d.length < 20) return numero.trim();

  // Usa apenas os 20 primeiros dígitos; o restante é sufixo técnico (descartado).
  return formatCnj(d.slice(0, 20));
}

/**
 * Nome de arquivo amigável: remove prefixos técnicos (CNJ de 20 dígitos,
 * timestamps de 13 dígitos, ids numéricos) grudados antes do nome real, e
 * preserva o nome + extensão. Idempotente para nomes já amigáveis.
 *
 * Ex.: "20001097120258050039-1762785454112-1329818-peticao_inicial.pdf"
 *       → "peticao_inicial.pdf"
 */
export function formatNomeArquivo(raw: string): string {
  if (!raw) return "";
  let nome = raw.trim();

  // Remove, da esquerda para a direita, blocos numéricos técnicos seguidos de
  // separador "-": CNJ (20), timestamp (13) e ids numéricos (>= 6 dígitos).
  // Para no primeiro bloco que não for puramente numérico (o nome real).
  const PREFIXO_TECNICO = /^(\d{6,})[-_](?=.)/;
  let anterior: string;
  do {
    anterior = nome;
    nome = nome.replace(PREFIXO_TECNICO, "");
  } while (nome !== anterior && nome.length > 0);

  return nome || raw.trim();
}

/**
 * Nome de vara/órgão julgador para exibição (capitalização natural a partir de
 * CAIXA ALTA, com limpeza de caudas de lixo do PJe). Delega para
 * `nomeVaraExibicao`. Devolve "" para entrada vazia.
 */
export function formatVara(texto: string): string {
  return nomeVaraExibicao(texto) ?? "";
}

/**
 * Rótulo de atribuição/área para exibição. Delega para o registro central de
 * atribuições (`atribuicoes.ts`) — NÃO reinventa rótulos. Chave desconhecida
 * cai no rótulo padrão ("Todos").
 */
export function formatArea(key: string): string {
  return getAtribuicaoColors(key).label;
}
