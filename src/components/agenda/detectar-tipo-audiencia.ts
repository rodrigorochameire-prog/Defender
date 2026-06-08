import { detectarSlug, tipoPorSlug } from "@/lib/agenda/tipos-audiencia";

/**
 * Tipo CANÔNICO (audiencias.tipo) a partir do bloco cru da pauta PJe.
 * Delega a detecção ao catálogo único (src/lib/agenda/tipos-audiencia.ts),
 * que já é imune à quebra mid-word da coluna "Tipo".
 */
export function detectarTipoAudiencia(textoBloco: string): string {
  return tipoPorSlug(detectarSlug(textoBloco)).descricao;
}

/**
 * Classifica a situação da audiência (designada/redesignada/realizada/cancelada).
 * Também opera sobre o texto achatado: a coluna "Situação" pode quebrar mid-word
 * ("CANCELA\nDA"), e classificar errado faria uma audiência cancelada/remarcada
 * entrar na agenda como vigente. Ordem: mais específico primeiro (redesignada
 * contém "designada").
 */
export function detectarSituacao(textoBloco: string): string {
  const flat = textoBloco.replace(/\s+/g, "").toUpperCase();
  if (/CANCELADA/.test(flat)) return "cancelada";
  if (/REDESIGNADA/.test(flat)) return "redesignada";
  if (/REALIZADA/.test(flat)) return "realizada";
  return "designada";
}
