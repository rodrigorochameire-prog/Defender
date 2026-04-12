import { z } from "zod";
import { sql } from "drizzle-orm";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { getDefensoresVisiveis } from "../defensor-scope";

/**
 * KPIs Dashboard — Fase 1 do TDD analytics-ml-foundation.
 *
 * Lê de views SQL (drizzle/0029_kpi_views.sql):
 *   - vw_kpi_summary          — números agregados pros cards de topo
 *   - vw_kpi_throughput       — demandas criadas/concluídas por semana
 *   - vw_kpi_backlog          — atribuição × status
 *   - vw_kpi_prazos           — buckets de urgência
 *   - vw_kpi_top_atos         — ranking de atos
 *   - vw_kpi_carga_defensor   — carga por defensor (admin/servidor)
 *   - vw_presos_urgentes      — réu preso com prazo ≤ 5 dias (tempo real)
 *
 * Escopo:
 *   - defensor              → apenas seus dados (automático)
 *   - admin/servidor        → todos, com filtros explícitos defensorId/comarcaId
 *   - estagiário            → dados do supervisor
 */

const scopeInput = z
  .object({
    defensorId: z.number().optional(),
    comarcaId: z.number().optional(),
  })
  .optional();

type ScopeInput = z.infer<typeof scopeInput>;

/** Monta cláusula WHERE compartilhada entre todas as queries. */
function buildScope(ctx: { user: any }, input: ScopeInput) {
  const { defensorId, comarcaId } = input ?? {};
  const visiveis = getDefensoresVisiveis(ctx.user);

  const clauses: string[] = [];

  // Filtro de defensor — explícito ou automático pelo papel
  if (defensorId) {
    if (visiveis !== "all" && !visiveis.includes(defensorId)) {
      throw new Error("Sem acesso às demandas desse defensor");
    }
    clauses.push(`defensor_id = ${defensorId}`);
  } else if (visiveis !== "all") {
    if (visiveis.length === 0) {
      clauses.push("1 = 0");
    } else {
      clauses.push(`defensor_id IN (${visiveis.join(",")})`);
    }
  }

  // Filtro de comarca — opcional, só admins/servidores
  if (comarcaId) {
    clauses.push(`comarca_id = ${Number(comarcaId)}`);
  }

  return clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
}

export const kpisRouter = router({
  /** Números agregados para os 4 cards grandes no topo do dashboard */
  summary: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
    const scope = buildScope(ctx, input);
    const rows = (await db.execute(
      sql.raw(`
        SELECT
          COALESCE(SUM(total), 0)::int AS total,
          COALESCE(SUM(ativas), 0)::int AS ativas,
          COALESCE(SUM(concluidas), 0)::int AS concluidas,
          COALESCE(SUM(vencidas), 0)::int AS vencidas,
          COALESCE(SUM(urgentes), 0)::int AS urgentes,
          COALESCE(SUM(reu_preso_ativas), 0)::int AS reu_preso_ativas,
          COALESCE(SUM(concluidas_mes), 0)::int AS concluidas_mes
        FROM vw_kpi_summary
        ${scope}
      `),
    )) as any;

    const r = rows[0] ?? rows?.rows?.[0] ?? {};
    return {
      total: Number(r.total ?? 0),
      ativas: Number(r.ativas ?? 0),
      concluidas: Number(r.concluidas ?? 0),
      vencidas: Number(r.vencidas ?? 0),
      urgentes: Number(r.urgentes ?? 0),
      reuPresoAtivas: Number(r.reu_preso_ativas ?? 0),
      concluidasMes: Number(r.concluidas_mes ?? 0),
    };
  }),

  /** Throughput semanal (últimas 12 semanas) — linha temporal */
  throughput: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
    const scope = buildScope(ctx, input);
    const result = (await db.execute(
      sql.raw(`
        SELECT
          semana::text AS semana,
          SUM(criadas)::int AS criadas,
          SUM(concluidas)::int AS concluidas
        FROM vw_kpi_throughput
        ${scope}
        GROUP BY semana
        ORDER BY semana ASC
      `),
    )) as any;

    const rows = result.rows ?? result;
    return rows.map((r: any) => ({
      semana: r.semana,
      criadas: Number(r.criadas ?? 0),
      concluidas: Number(r.concluidas ?? 0),
    }));
  }),

  /** Backlog por atribuição × status — barras empilhadas */
  backlog: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
    const scope = buildScope(ctx, input);
    const result = (await db.execute(
      sql.raw(`
        SELECT
          atribuicao,
          status,
          SUM(total)::int AS total,
          SUM(urgentes)::int AS urgentes
        FROM vw_kpi_backlog
        ${scope}
        GROUP BY atribuicao, status
        ORDER BY atribuicao, status
      `),
    )) as any;
    const rows = result.rows ?? result;
    return rows.map((r: any) => ({
      atribuicao: r.atribuicao as string,
      status: r.status as string,
      total: Number(r.total ?? 0),
      urgentes: Number(r.urgentes ?? 0),
    }));
  }),

  /** Distribuição de prazos em buckets (vencido/urgente/próximo/médio/longo) */
  prazos: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
    const scope = buildScope(ctx, input);
    const result = (await db.execute(
      sql.raw(`
        SELECT
          bucket,
          SUM(total)::int AS total
        FROM vw_kpi_prazos
        ${scope}
        GROUP BY bucket
      `),
    )) as any;

    const rows = result.rows ?? result;
    const bucketsBase = {
      vencido: 0,
      urgente: 0,
      proximo: 0,
      medio: 0,
      longo: 0,
    };
    for (const r of rows) {
      const bucket = r.bucket as keyof typeof bucketsBase;
      if (bucket in bucketsBase) {
        bucketsBase[bucket] = Number(r.total ?? 0);
      }
    }
    return bucketsBase;
  }),

  /** Top N atos mais frequentes (default 10) */
  topAtos: protectedProcedure
    .input(
      z
        .object({
          defensorId: z.number().optional(),
          comarcaId: z.number().optional(),
          limit: z.number().min(1).max(50).default(10),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 10;
      const scope = buildScope(ctx, { defensorId: input?.defensorId, comarcaId: input?.comarcaId });
      const result = (await db.execute(
        sql.raw(`
          SELECT
            ato,
            SUM(total)::int AS total,
            SUM(ativas)::int AS ativas
          FROM vw_kpi_top_atos
          ${scope}
          GROUP BY ato
          ORDER BY total DESC
          LIMIT ${limit}
        `),
      )) as any;
      const rows = result.rows ?? result;
      return rows.map((r: any) => ({
        ato: r.ato as string,
        total: Number(r.total ?? 0),
        ativas: Number(r.ativas ?? 0),
      }));
    }),

  /** Carga por defensor — só visível pra admin/servidor */
  cargaDefensor: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
    const visiveis = getDefensoresVisiveis(ctx.user);
    // Se é defensor comum vendo só a si mesmo, retorna vazio — não faz sentido
    if (visiveis !== "all" && visiveis.length <= 1) {
      return [];
    }
    const scope = buildScope(ctx, input);
    const result = (await db.execute(
      sql.raw(`
        SELECT
          defensor_id,
          defensor_nome,
          defensor_email,
          atribuicao,
          SUM(ativas)::int AS ativas,
          SUM(concluidas)::int AS concluidas,
          SUM(total)::int AS total
        FROM vw_kpi_carga_defensor
        ${scope}
        GROUP BY defensor_id, defensor_nome, defensor_email, atribuicao
        ORDER BY defensor_nome, atribuicao
      `),
    )) as any;
    const rows = result.rows ?? result;
    return rows.map((r: any) => ({
      defensorId: Number(r.defensor_id),
      defensorNome: (r.defensor_nome as string) || (r.defensor_email as string)?.split("@")[0] || "(sem nome)",
      defensorEmail: r.defensor_email as string,
      atribuicao: r.atribuicao as string,
      ativas: Number(r.ativas ?? 0),
      concluidas: Number(r.concluidas ?? 0),
      total: Number(r.total ?? 0),
    }));
  }),

  /** Réu preso com prazo ≤ 5 dias — alerta fixo no topo da página */
  presosUrgentes: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
    const scope = buildScope(ctx, input);
    const result = (await db.execute(
      sql.raw(`
        SELECT
          id,
          ato,
          prazo::text AS prazo,
          status,
          atribuicao,
          numero_autos,
          assistido_nome,
          assistido_id,
          dias_ate_prazo
        FROM vw_presos_urgentes
        ${scope}
        ORDER BY dias_ate_prazo ASC
        LIMIT 50
      `),
    )) as any;
    const rows = result.rows ?? result;
    return rows.map((r: any) => ({
      id: Number(r.id),
      ato: r.ato as string,
      prazo: r.prazo as string,
      status: r.status as string,
      atribuicao: r.atribuicao as string,
      numeroAutos: r.numero_autos as string | null,
      assistidoNome: r.assistido_nome as string | null,
      assistidoId: r.assistido_id ? Number(r.assistido_id) : null,
      diasAtePrazo: Number(r.dias_ate_prazo ?? 0),
    }));
  }),
});
