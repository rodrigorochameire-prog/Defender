/**
 * Dados do período de uma substituição — regra de vínculo aprovada 11/06:
 * item criado no período + processo no escopo + processo que TAMBÉM chegou no
 * período (titularidade prévia fica de fora). Consumido pelo previewDados do
 * router e pelo prompt da gratificação (mesmo número na UI e no ofício).
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { db, audiencias, processos, assistidos, demandas, registros } from "@/lib/db";
import type { substituicoes } from "@/lib/db/schema";

type Substituicao = typeof substituicoes.$inferSelect;

export interface DadosPeriodoSubstituicao {
  totalAudiencias: number;
  totalDemandas: number;
  totalAtendimentos: number;
  porAtribuicao: Record<string, number>;
  audiencias: Array<{
    id: number;
    data: Date;
    horario: string | null;
    tipo: string | null;
    status: string | null;
    atribuicao: string | null;
    numero: string | null;
    assistido: string | null;
  }>;
  demandas: Array<{
    id: number;
    ato: string;
    status: string | null;
    atribuicao: string | null;
    numero: string | null;
    assistido: string | null;
  }>;
}

const VAZIO: DadosPeriodoSubstituicao = {
  totalAudiencias: 0,
  totalDemandas: 0,
  totalAtendimentos: 0,
  porAtribuicao: {},
  audiencias: [],
  demandas: [],
};

export async function dadosDoPeriodo(sub: Substituicao): Promise<DadosPeriodoSubstituicao> {
  const escopo = (sub.escopoAtribuicoes as string[]) ?? [];
  if (!escopo.length) return VAZIO;

  const ini = sql`${sub.dataInicio}::date`;
  const fimSql = sub.dataFim ? sql`${sub.dataFim}::date` : sql`'9999-12-31'::date`;
  const dentroPeriodo = (col: unknown) =>
    sql`DATE(${col} AT TIME ZONE 'America/Bahia') BETWEEN ${ini} AND ${fimSql}`;
  // processo chegou durante o período (não é titularidade prévia)
  const processoNovo = dentroPeriodo(processos.createdAt);

  const auds = await db
    .select({
      id: audiencias.id,
      data: audiencias.dataAudiencia,
      horario: audiencias.horario,
      tipo: audiencias.tipo,
      status: audiencias.status,
      atribuicao: sql<string>`${processos.atribuicao}::text`,
      numero: processos.numeroAutos,
      assistido: assistidos.nome,
    })
    .from(audiencias)
    .innerJoin(processos, eq(audiencias.processoId, processos.id))
    .leftJoin(assistidos, eq(assistidos.id, audiencias.assistidoId))
    .where(
      and(
        inArray(processos.atribuicao, escopo as never),
        dentroPeriodo(audiencias.dataAudiencia),
        processoNovo,
      ),
    );

  const dems = await db
    .select({
      id: demandas.id,
      ato: demandas.ato,
      status: sql<string | null>`${demandas.status}::text`,
      atribuicao: sql<string>`${processos.atribuicao}::text`,
      numero: processos.numeroAutos,
      assistido: assistidos.nome,
    })
    .from(demandas)
    .innerJoin(processos, eq(demandas.processoId, processos.id))
    .leftJoin(assistidos, eq(assistidos.id, demandas.assistidoId))
    .where(
      and(
        inArray(processos.atribuicao, escopo as never),
        dentroPeriodo(demandas.createdAt),
        processoNovo,
      ),
    );

  const [atds] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(registros)
    .innerJoin(processos, eq(registros.processoId, processos.id))
    .where(
      and(
        eq(registros.tipo, "atendimento"),
        inArray(processos.atribuicao, escopo as never),
        dentroPeriodo(registros.dataRegistro),
        processoNovo,
      ),
    );

  const porAtribuicao: Record<string, number> = {};
  for (const r of auds) {
    const k = r.atribuicao ?? "—";
    porAtribuicao[k] = (porAtribuicao[k] ?? 0) + 1;
  }
  return {
    totalAudiencias: auds.length,
    totalDemandas: dems.length,
    totalAtendimentos: atds?.n ?? 0,
    porAtribuicao,
    audiencias: auds,
    demandas: dems,
  };
}

/** Linha-resumo para o prompt da gratificação. */
export function resumirParaPrompt(d: DadosPeriodoSubstituicao): string {
  const proc = [
    ...new Set(
      d.audiencias.map((a) => a.numero).concat(d.demandas.map((x) => x.numero)),
    ),
  ]
    .filter(Boolean)
    .slice(0, 50);
  const porAtr = Object.entries(d.porAtribuicao)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  return (
    `DADOS DO OMBUDS (regra de vínculo período+escopo, processos novos no período): ` +
    `${d.totalAudiencias} audiência(s) [${porAtr || "—"}], ${d.totalDemandas} demanda(s), ` +
    `${d.totalAtendimentos} atendimento(s). Processos: ${proc.join("; ") || "—"}`
  );
}
