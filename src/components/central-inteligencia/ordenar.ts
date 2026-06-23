/**
 * Normalização e ordenação dos alertas agregados da Central de Inteligência.
 *
 * Funções puras — sem dependência de React/tRPC. A severidade segue a ordem
 * determinística red > amber > emerald (oportunidades por último).
 */

export type SeveridadeAlerta = "red" | "amber" | "emerald";

export type TipoSinal = "Execução" | "Prazo" | "Cronologia" | "VVD";

/** Alerta unificado, já normalizado a partir de qualquer fonte de dados. */
export interface AlertaUnificado {
  /** Chave estável para React. */
  id: string;
  severidade: SeveridadeAlerta;
  tipo: TipoSinal;
  /** Texto principal (o motivo do alerta). */
  titulo: string;
  /** Rótulo curto do tipo de sinal (ex.: "Prescrição", "Excesso de prazo"). */
  rotulo: string;
  assistidoNome: string | null;
  processoNumero: string | null;
  /** Destino do link — normalmente /admin/processos/<id>. Null = sem navegação. */
  href: string | null;
}

/** Peso de ordenação: menor = mais urgente (vem primeiro). */
const PESO_SEVERIDADE: Record<SeveridadeAlerta, number> = {
  red: 0,
  amber: 1,
  emerald: 2,
};

/**
 * Ordena os alertas por severidade (red > amber > emerald). Estável: dentro da
 * mesma severidade preserva a ordem de entrada. Não muta o array recebido.
 */
export function ordenarAlertas(alertas: AlertaUnificado[]): AlertaUnificado[] {
  return [...alertas].sort(
    (a, b) => PESO_SEVERIDADE[a.severidade] - PESO_SEVERIDADE[b.severidade],
  );
}

/** Conta alertas por severidade — útil para KPIs/resumos. */
export function contarPorSeveridade(
  alertas: AlertaUnificado[],
): Record<SeveridadeAlerta, number> {
  const acc: Record<SeveridadeAlerta, number> = { red: 0, amber: 0, emerald: 0 };
  for (const a of alertas) acc[a.severidade] += 1;
  return acc;
}
