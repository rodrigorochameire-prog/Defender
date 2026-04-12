import { z } from "zod";
import { sql } from "drizzle-orm";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { getDefensoresVisiveis } from "../defensor-scope";

/**
 * KPIs Dashboard — Fase 1 do TDD analytics-ml-foundation.
 *
 * Lê de views SQL (drizzle/0029_kpi_views.sql):
 *   - vw_kpi_summary          — agregados pros cards de topo
 *   - vw_kpi_throughput       — criadas/concluídas por semana (12 sem)
 *   - vw_kpi_backlog          — atribuição × status
 *   - vw_kpi_prazos           — buckets de urgência
 *   - vw_kpi_top_atos         — ranking de atos
 *   - vw_kpi_carga_defensor   — carga por defensor (admin/servidor)
 *   - vw_presos_urgentes      — réu preso com prazo ≤ 5 dias
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

/** Monta cláusula WHERE compartilhada (SQL injection safe: todos os valores são numéricos validados). */
function buildScope(ctx: { user: any }, input: ScopeInput) {
  const { defensorId, comarcaId } = input ?? {};
  const visiveis = getDefensoresVisiveis(ctx.user);

  const clauses: string[] = [];

  if (defensorId) {
    const id = Number(defensorId);
    if (visiveis !== "all" && !visiveis.includes(id)) {
      throw new Error("Sem acesso às demandas desse defensor");
    }
    clauses.push(`defensor_id = ${id}`);
  } else if (visiveis !== "all") {
    if (visiveis.length === 0) {
      clauses.push("1 = 0");
    } else {
      const ids = visiveis.map((n) => Number(n)).join(",");
      clauses.push(`defensor_id IN (${ids})`);
    }
  }

  if (comarcaId) {
    clauses.push(`comarca_id = ${Number(comarcaId)}`);
  }

  return clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
}

/** db.execute(sql.raw(...)) retorna um RowList iterável do postgres-js. Converte pra array plano. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRows(result: any): any[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.rows)) return result.rows;
  try {
    return Array.from(result ?? []);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    return [];
  }
}

export const kpisRouter = router({
  /** Números agregados — estado, urgência, hoje, SLA, velocidade, encalhadas */
  summary: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
    const scope = buildScope(ctx, input);
    const result = await db.execute(
      sql.raw(`
        SELECT
          COALESCE(SUM(total), 0)::int AS total,
          COALESCE(SUM(ativas), 0)::int AS ativas,
          COALESCE(SUM(concluidas), 0)::int AS concluidas,
          COALESCE(SUM(vencidas), 0)::int AS vencidas,
          COALESCE(SUM(urgentes), 0)::int AS urgentes,
          COALESCE(SUM(vencem_hoje), 0)::int AS vencem_hoje,
          COALESCE(SUM(criadas_hoje), 0)::int AS criadas_hoje,
          COALESCE(SUM(reu_preso_ativas), 0)::int AS reu_preso_ativas,
          COALESCE(SUM(concluidas_mes), 0)::int AS concluidas_mes,
          COALESCE(SUM(concluidas_no_prazo), 0)::int AS concluidas_no_prazo,
          COALESCE(SUM(concluidas_com_prazo), 0)::int AS concluidas_com_prazo,
          COALESCE(SUM(concluidas_7d), 0)::int AS concluidas_7d,
          COALESCE(SUM(concluidas_7d_anterior), 0)::int AS concluidas_7d_anterior,
          COALESCE(AVG(tempo_medio_resposta_dias), 0)::real AS tempo_medio_resposta_dias,
          COALESCE(SUM(encalhadas), 0)::int AS encalhadas
        FROM vw_kpi_summary
        ${scope}
      `),
    );

    const r = toRows(result)[0] ?? {};
    const concluidasNoPrazo = Number(r.concluidas_no_prazo ?? 0);
    const concluidasComPrazo = Number(r.concluidas_com_prazo ?? 0);
    const slaHitRate =
      concluidasComPrazo > 0 ? (concluidasNoPrazo / concluidasComPrazo) * 100 : null;

    const concluidas7d = Number(r.concluidas_7d ?? 0);
    const concluidas7dAnterior = Number(r.concluidas_7d_anterior ?? 0);
    const velocidadeDelta = concluidas7d - concluidas7dAnterior;

    return {
      total: Number(r.total ?? 0),
      ativas: Number(r.ativas ?? 0),
      concluidas: Number(r.concluidas ?? 0),
      vencidas: Number(r.vencidas ?? 0),
      urgentes: Number(r.urgentes ?? 0),
      vencemHoje: Number(r.vencem_hoje ?? 0),
      criadasHoje: Number(r.criadas_hoje ?? 0),
      reuPresoAtivas: Number(r.reu_preso_ativas ?? 0),
      concluidasMes: Number(r.concluidas_mes ?? 0),
      // SLA — null quando não há amostra suficiente (denom = 0)
      slaHitRate,
      slaSample: concluidasComPrazo,
      // Velocidade 7d vs 7d anterior
      concluidas7d,
      concluidas7dAnterior,
      velocidadeDelta,
      // Tempo médio de resposta (dias)
      tempoMedioRespostaDias: Number(r.tempo_medio_resposta_dias ?? 0),
      // Encalhadas
      encalhadas: Number(r.encalhadas ?? 0),
    };
  }),

  /** Idade do backlog em buckets */
  backlogAging: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
    const scope = buildScope(ctx, input);
    const result = await db.execute(
      sql.raw(`
        SELECT bucket, SUM(total)::int AS total
        FROM vw_kpi_backlog_aging
        ${scope}
        GROUP BY bucket
      `),
    );
    const buckets = { a_0_7: 0, b_7_15: 0, c_15_30: 0, d_30_60: 0, e_60_plus: 0 };
    for (const r of toRows(result)) {
      const k = String(r.bucket ?? "") as keyof typeof buckets;
      if (k in buckets) buckets[k] = Number(r.total ?? 0);
    }
    return buckets;
  }),

  /** Throughput semanal (últimas 12 semanas) */
  throughput: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
    const scope = buildScope(ctx, input);
    const result = await db.execute(
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
    );
    return toRows(result).map((r) => ({
      semana: String(r.semana ?? ""),
      criadas: Number(r.criadas ?? 0),
      concluidas: Number(r.concluidas ?? 0),
    }));
  }),

  /** Backlog por atribuição × status */
  backlog: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
    const scope = buildScope(ctx, input);
    const result = await db.execute(
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
    );
    return toRows(result).map((r) => ({
      atribuicao: String(r.atribuicao ?? "SEM_PROCESSO"),
      status: String(r.status ?? ""),
      total: Number(r.total ?? 0),
      urgentes: Number(r.urgentes ?? 0),
    }));
  }),

  /** Distribuição de prazos em buckets */
  prazos: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
    const scope = buildScope(ctx, input);
    const result = await db.execute(
      sql.raw(`
        SELECT
          bucket,
          SUM(total)::int AS total
        FROM vw_kpi_prazos
        ${scope}
        GROUP BY bucket
      `),
    );

    const buckets = {
      vencido: 0,
      urgente: 0,
      proximo: 0,
      medio: 0,
      longo: 0,
    };
    for (const r of toRows(result)) {
      const bucket = String(r.bucket ?? "") as keyof typeof buckets;
      if (bucket in buckets) {
        buckets[bucket] = Number(r.total ?? 0);
      }
    }
    return buckets;
  }),

  /** Top N atos mais frequentes */
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
      const limit = Number(input?.limit ?? 10);
      const scope = buildScope(ctx, { defensorId: input?.defensorId, comarcaId: input?.comarcaId });
      const result = await db.execute(
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
      );
      return toRows(result).map((r) => ({
        ato: String(r.ato ?? ""),
        total: Number(r.total ?? 0),
        ativas: Number(r.ativas ?? 0),
      }));
    }),

  /** Carga por defensor — só visível pra admin/servidor */
  cargaDefensor: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
    const visiveis = getDefensoresVisiveis(ctx.user);
    if (visiveis !== "all" && visiveis.length <= 1) {
      return [];
    }
    const scope = buildScope(ctx, input);
    const result = await db.execute(
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
    );
    return toRows(result).map((r) => ({
      defensorId: Number(r.defensor_id ?? 0),
      defensorNome:
        String(r.defensor_nome ?? "") ||
        String(r.defensor_email ?? "").split("@")[0] ||
        "(sem nome)",
      defensorEmail: String(r.defensor_email ?? ""),
      atribuicao: String(r.atribuicao ?? "SEM_PROCESSO"),
      ativas: Number(r.ativas ?? 0),
      concluidas: Number(r.concluidas ?? 0),
      total: Number(r.total ?? 0),
    }));
  }),

  /** Relatório semestral — resumo mensal por seção (Corregedoria DPE-BA) */
  relatorioResumo: protectedProcedure
    .input(
      z
        .object({
          defensorId: z.number().optional(),
          ano: z.number().default(new Date().getFullYear()),
          semestre: z.enum(["1", "2"]).default("1"),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const ano = input?.ano ?? new Date().getFullYear();
      const sem = input?.semestre ?? "1";
      const mesInicio = sem === "1" ? 1 : 7;
      const mesFim = sem === "1" ? 6 : 12;
      const visiveis = getDefensoresVisiveis(ctx.user);
      const workspaceId = Number((ctx.user as any).workspaceId ?? 1);

      const defFilter = input?.defensorId
        ? `defensor_id = ${Number(input.defensorId)}`
        : visiveis === "all"
          ? `(defensor_id IS NOT NULL OR workspace_id = ${workspaceId})`
          : visiveis.length > 0
            ? `(defensor_id IN (${visiveis.join(",")}) OR (defensor_id IS NULL AND workspace_id = ${workspaceId}))`
            : "1 = 0";

      const result = await db.execute(
        sql.raw(`
          SELECT mes, secao_relatorio AS secao, SUM(total)::int AS total
          FROM vw_relatorio_semestral
          WHERE ${defFilter} AND ano = ${ano} AND mes BETWEEN ${mesInicio} AND ${mesFim}
          GROUP BY mes, secao_relatorio ORDER BY mes, secao_relatorio
        `),
      );
      return toRows(result).map((r) => ({
        mes: Number(r.mes ?? 0),
        secao: String(r.secao ?? ""),
        total: Number(r.total ?? 0),
      }));
    }),

  /** Relatório semestral — detalhado por categoria (drill-down pro formulário) */
  relatorioDetalhado: protectedProcedure
    .input(
      z
        .object({
          defensorId: z.number().optional(),
          ano: z.number().default(new Date().getFullYear()),
          semestre: z.enum(["1", "2"]).default("1"),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const ano = input?.ano ?? new Date().getFullYear();
      const sem = input?.semestre ?? "1";
      const mesInicio = sem === "1" ? 1 : 7;
      const mesFim = sem === "1" ? 6 : 12;
      const visiveis = getDefensoresVisiveis(ctx.user);
      const workspaceId = Number((ctx.user as any).workspaceId ?? 1);

      const defFilter = input?.defensorId
        ? `defensor_id = ${Number(input.defensorId)}`
        : visiveis === "all"
          ? `(defensor_id IS NOT NULL OR workspace_id = ${workspaceId})`
          : visiveis.length > 0
            ? `(defensor_id IN (${visiveis.join(",")}) OR (defensor_id IS NULL AND workspace_id = ${workspaceId}))`
            : "1 = 0";

      const result = await db.execute(
        sql.raw(`
          SELECT secao_relatorio AS secao, categoria_relatorio AS categoria, mes, SUM(total)::int AS total
          FROM vw_relatorio_semestral
          WHERE ${defFilter} AND ano = ${ano} AND mes BETWEEN ${mesInicio} AND ${mesFim}
          GROUP BY secao_relatorio, categoria_relatorio, mes
          ORDER BY secao_relatorio, categoria_relatorio, mes
        `),
      );
      return toRows(result).map((r) => ({
        secao: String(r.secao ?? ""),
        categoria: String(r.categoria ?? ""),
        mes: Number(r.mes ?? 0),
        total: Number(r.total ?? 0),
      }));
    }),

  /** Audiências próximas 7 dias */
  audienciasProximas: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
    const workspaceId = Number((ctx.user as any).workspaceId ?? 1);
    const visiveis = getDefensoresVisiveis(ctx.user);
    const defFilter = input?.defensorId
      ? `(defensor_id = ${Number(input.defensorId)} OR (defensor_id IS NULL AND workspace_id = ${workspaceId}))`
      : visiveis === "all"
        ? `(defensor_id IS NOT NULL OR workspace_id = ${workspaceId})`
        : visiveis.length > 0
          ? `(defensor_id IN (${visiveis.join(",")}) OR (defensor_id IS NULL AND workspace_id = ${workspaceId}))`
          : "1 = 0";

    const result = await db.execute(
      sql.raw(`
        SELECT id, data_audiencia::text AS data, tipo, titulo, local, status,
          assistido_nome, numero_autos, dias_restantes
        FROM vw_kpi_audiencias_proximas
        WHERE ${defFilter}
        ORDER BY data_audiencia LIMIT 20
      `),
    );
    return toRows(result).map((r) => ({
      id: Number(r.id ?? 0),
      data: String(r.data ?? ""),
      tipo: String(r.tipo ?? ""),
      titulo: r.titulo ? String(r.titulo) : null,
      local: r.local ? String(r.local) : null,
      status: String(r.status ?? ""),
      assistidoNome: r.assistido_nome ? String(r.assistido_nome) : null,
      numeroAutos: r.numero_autos ? String(r.numero_autos) : null,
      diasRestantes: Number(r.dias_restantes ?? 0),
    }));
  }),

  /** Assistidos sem atendimento recente (> 30 dias) */
  semAtendimento: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
    const scope = buildScope(ctx, input);
    const result = await db.execute(
      sql.raw(`
        SELECT assistido_id, nome, status_prisional, dias_sem_atendimento
        FROM vw_kpi_sem_atendimento
        ${scope}
        LIMIT 50
      `),
    );
    const rows = toRows(result);
    return {
      total: rows.length,
      topAssistidos: rows.slice(0, 10).map((r) => ({
        id: Number(r.assistido_id ?? 0),
        nome: String(r.nome ?? ""),
        statusPrisional: r.status_prisional ? String(r.status_prisional) : null,
        diasSemAtendimento: r.dias_sem_atendimento != null ? Number(r.dias_sem_atendimento) : null,
      })),
    };
  }),

  /** Réu preso com prazo ≤ 5 dias */
  presosUrgentes: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
    const scope = buildScope(ctx, input);
    const result = await db.execute(
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
    );
    return toRows(result).map((r) => ({
      id: Number(r.id ?? 0),
      ato: String(r.ato ?? ""),
      prazo: String(r.prazo ?? ""),
      status: String(r.status ?? ""),
      atribuicao: String(r.atribuicao ?? "SEM_PROCESSO"),
      numeroAutos: r.numero_autos ? String(r.numero_autos) : null,
      assistidoNome: r.assistido_nome ? String(r.assistido_nome) : null,
      assistidoId: r.assistido_id ? Number(r.assistido_id) : null,
      diasAtePrazo: Number(r.dias_ate_prazo ?? 0),
    }));
  }),
});
