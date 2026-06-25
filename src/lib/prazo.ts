/**
 * Fonte única para criticidade de prazo (deadline severity).
 *
 * Centraliza o mapeamento dias-restantes → nível de urgência → cor, eliminando
 * as ~7 implementações ad-hoc que divergiam em thresholds e cores.
 *
 * Regra de canais de cor (ver docs/plans/2026-06-24-canais-de-cor.md):
 *   - ATRIBUIÇÃO governa identidade (borda/ícone/tag) — registry de atribuições.
 *   - SEVERIDADE governa urgência (badge de prazo / fundo crítico) — este módulo.
 *   Nunca compartilham o mesmo canal.
 *
 * Framework-agnóstico (sem React/Tailwind). Consumido por componentes de UI,
 * que traduzem `cor`/`nivel` para classes próprias.
 */

export type PrazoNivel = "vencido" | "critico" | "alerta" | "tranquilo";
export type PrazoCor = "red" | "amber" | "green" | "gray";

export interface PrazoSeveridade {
  /** Nível semântico de urgência. */
  nivel: PrazoNivel;
  /** Cor canônica derivada do nível/threshold. */
  cor: PrazoCor;
  /** Dias até o prazo (negativo = vencido, 0 = hoje). */
  dias: number;
}

/**
 * Configuração de thresholds para um domínio.
 *
 * Cada limiar é o valor MÁXIMO de dias (inclusive) que ainda cai naquela faixa.
 * A avaliação é feita em ordem crescente; o primeiro limiar satisfeito vence.
 * Tudo acima de `tranquilo` cai em cinza (longe = baixa urgência).
 *
 * `dias < 0` é sempre `vencido` (red), independente da config.
 */
export interface PrazoThresholds {
  /** Máx. dias para `critico`/red (inclusive). Default 0 (só "hoje"). */
  critico: number;
  /** Máx. dias para `alerta`/amber (inclusive). Default 3. */
  alerta: number;
  /** Máx. dias para `tranquilo`/green (inclusive). Default 7. Acima → cinza. */
  tranquilo: number;
}

/**
 * Escala canônica de litígio (prazos processuais).
 * Espelha exatamente `calcularPrazoBadge`:
 *   <0 → red, 0 → red, 1–3 → amber, 4–7 → green, 8+ → gray.
 */
export const ESCALA_LITIGIO: PrazoThresholds = {
  critico: 0,
  alerta: 3,
  tranquilo: 7,
};

/**
 * Escala de monitoramento de MPU/VVD.
 * Prazos de medida protetiva têm janela de monitoramento mais larga
 * (reanálise/renovação), por isso ≤7 = crítico e ≤30 = alerta. Acima de 30
 * dias no futuro a MPU está tranquila (verde) — NÃO é incoerência.
 *   <0 → red, ≤7 → red, ≤30 → amber, 31+ → green.
 */
export const ESCALA_MPU: PrazoThresholds = {
  critico: 7,
  alerta: 30,
  tranquilo: Number.POSITIVE_INFINITY,
};

/**
 * Escala de intimações (prazo de manifestação curto).
 *   <0 → red, ≤2 → red, ≤5 → amber, 6+ → green.
 */
export const ESCALA_INTIMACAO: PrazoThresholds = {
  critico: 2,
  alerta: 5,
  tranquilo: Number.POSITIVE_INFINITY,
};

/**
 * Severidade a partir de um número de dias restantes.
 * Pura — não parseia datas. Use `calcularPrazo` para strings.
 */
export function prazoSeveridade(
  dias: number,
  thresholds: PrazoThresholds = ESCALA_LITIGIO,
): PrazoSeveridade {
  if (dias < 0) return { nivel: "vencido", cor: "red", dias };
  if (dias <= thresholds.critico) return { nivel: "critico", cor: "red", dias };
  if (dias <= thresholds.alerta) return { nivel: "alerta", cor: "amber", dias };
  if (dias <= thresholds.tranquilo) return { nivel: "tranquilo", cor: "green", dias };
  return { nivel: "tranquilo", cor: "gray", dias };
}

/**
 * Converte uma string de data ("dd/mm/aaaa" ou ISO "aaaa-mm-dd") em dias
 * restantes a partir de hoje (00:00). Retorna `null` se não parseável.
 */
export function diasAtePrazo(prazoStr: string | null | undefined): number | null {
  if (!prazoStr) return null;
  try {
    let prazo: Date;
    if (prazoStr.includes("/")) {
      const parts = prazoStr.split("/").map(Number);
      if (parts.length < 3 || parts.some(Number.isNaN)) return null;
      const [dia, mes, ano] = parts;
      const fullYear = ano < 100 ? 2000 + ano : ano;
      prazo = new Date(fullYear, mes - 1, dia);
    } else {
      // ISO ou similar
      prazo = new Date(prazoStr.length <= 10 ? prazoStr + "T12:00:00" : prazoStr);
    }
    if (Number.isNaN(prazo.getTime())) return null;
    prazo.setHours(0, 0, 0, 0);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

/**
 * Severidade a partir de uma string de data. `null` se não parseável.
 */
export function calcularPrazo(
  prazoStr: string | null | undefined,
  thresholds: PrazoThresholds = ESCALA_LITIGIO,
): PrazoSeveridade | null {
  const dias = diasAtePrazo(prazoStr);
  if (dias === null) return null;
  return prazoSeveridade(dias, thresholds);
}

/**
 * Texto curto padronizado para um número de dias.
 * Ex.: "141d vencido", "Hoje", "Amanhã", "3d".
 */
export function prazoTextoCurto(dias: number): string {
  if (dias < 0) return `${Math.abs(dias)}d vencido`;
  if (dias === 0) return "Hoje";
  if (dias === 1) return "Amanhã";
  return `${dias}d`;
}
