import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { sql, SQL } from "drizzle-orm";
import { getWorkspaceScope } from "../workspace";

// ==========================================
// FILTROS COMPARTILHADOS
// ==========================================

const filtrosInput = z.object({
  periodoInicio: z.string().optional(), // ISO date
  periodoFim: z.string().optional(),
  defensorId: z.number().optional(),
}).optional();

/**
 * Monta cláusula WHERE baseada nos filtros (parameterized)
 * Sempre filtra por status = 'realizada' e resultado NOT NULL
 * Retorna um SQL chunk do Drizzle ORM — todos os valores são parametrizados
 */
function buildWhereClause(filtros?: z.infer<typeof filtrosInput>): SQL {
  const conditions: SQL[] = [
    sql`s.status = 'realizada'`,
    sql`s.resultado IS NOT NULL`,
  ];

  if (filtros?.periodoInicio) {
    conditions.push(sql`s.data_sessao >= ${filtros.periodoInicio}::timestamp`);
  }
  if (filtros?.periodoFim) {
    conditions.push(sql`s.data_sessao <= ${filtros.periodoFim}::timestamp + interval '1 day'`);
  }
  if (filtros?.defensorId) {
    conditions.push(sql`s.defensor_id = ${filtros.defensorId}`);
  }

  // Join all conditions with AND
  return sql.join(conditions, sql` AND `);
}

/**
 * Calcula o período anterior (mesma duração, deslocado para trás)
 * Ex: Jan-Mar 2026 -> período anterior = Oct-Dec 2025
 */
function calcPeriodoAnterior(inicio?: string, fim?: string) {
  if (!inicio || !fim) {
    // Default: último ano vs ano anterior
    const agora = new Date();
    const inicioAtual = new Date(agora.getFullYear() - 1, agora.getMonth(), agora.getDate());
    const fimAtual = agora;
    const duracao = fimAtual.getTime() - inicioAtual.getTime();
    const inicioAnterior = new Date(inicioAtual.getTime() - duracao);
    return {
      inicio: inicioAnterior.toISOString().split("T")[0],
      fim: inicioAtual.toISOString().split("T")[0],
    };
  }

  const dInicio = new Date(inicio);
  const dFim = new Date(fim);
  const duracao = dFim.getTime() - dInicio.getTime();
  const inicioAnterior = new Date(dInicio.getTime() - duracao);
  const fimAnterior = new Date(dInicio.getTime() - 1); // dia antes do início

  return {
    inicio: inicioAnterior.toISOString().split("T")[0],
    fim: fimAnterior.toISOString().split("T")[0],
  };
}

// ==========================================
// TIPOS DE RESULTADO DAS QUERIES
// ==========================================

type DbRow = Record<string, unknown>;

/** Helper para extrair número seguro de uma row */
function num(value: unknown): number {
  return Number(value) || 0;
}

/** Helper para extrair string segura de uma row */
function str(value: unknown): string {
  return String(value ?? "");
}

// ==========================================
// ROUTER DE ANALYTICS DO JURI
// ==========================================

export const juriAnalyticsRouter = router({

  // ============================================================
  // 1. PANORAMA — KPIs com comparação de período
  // ============================================================
  panorama: protectedProcedure
    .input(filtrosInput)
    .query(async ({ ctx, input }) => {
      getWorkspaceScope(ctx.user);

      const where = buildWhereClause(input);
      const periodoAnterior = calcPeriodoAnterior(input?.periodoInicio, input?.periodoFim);
      const whereAnterior = buildWhereClause({
        periodoInicio: periodoAnterior.inicio,
        periodoFim: periodoAnterior.fim,
        defensorId: input?.defensorId,
      });

      const result = await db.execute<DbRow>(sql`
        SELECT
          -- Período atual
          COUNT(*) FILTER (WHERE ${where}) AS total,
          COUNT(*) FILTER (WHERE ${where} AND s.resultado = 'absolvicao') AS absolvicoes,
          COUNT(*) FILTER (WHERE ${where} AND s.resultado = 'condenacao') AS condenacoes,
          COUNT(*) FILTER (WHERE ${where} AND s.resultado = 'desclassificacao') AS desclassificacoes,
          COUNT(*) FILTER (WHERE ${where} AND s.resultado = 'nulidade') AS nulidades,
          -- Período anterior
          COUNT(*) FILTER (WHERE ${whereAnterior}) AS prev_total,
          COUNT(*) FILTER (WHERE ${whereAnterior} AND s.resultado = 'absolvicao') AS prev_absolvicoes,
          COUNT(*) FILTER (WHERE ${whereAnterior} AND s.resultado = 'condenacao') AS prev_condenacoes,
          COUNT(*) FILTER (WHERE ${whereAnterior} AND s.resultado = 'desclassificacao') AS prev_desclassificacoes
        FROM sessoes_juri s
      `);

      const row: DbRow = result[0] || {};

      return {
        total: num(row.total),
        absolvicoes: num(row.absolvicoes),
        condenacoes: num(row.condenacoes),
        desclassificacoes: num(row.desclassificacoes),
        nulidades: num(row.nulidades),
        periodoAnterior: {
          total: num(row.prev_total),
          absolvicoes: num(row.prev_absolvicoes),
          condenacoes: num(row.prev_condenacoes),
          desclassificacoes: num(row.prev_desclassificacoes),
        },
      };
    }),

  // ============================================================
  // 2. TIMELINE — Agregação mensal
  // ============================================================
  timeline: protectedProcedure
    .input(filtrosInput)
    .query(async ({ ctx, input }) => {
      getWorkspaceScope(ctx.user);

      const where = buildWhereClause(input);

      const result = await db.execute<DbRow>(sql`
        SELECT
          to_char(s.data_sessao, 'YYYY-MM') AS mes,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE s.resultado = 'absolvicao') AS absolvicoes,
          COUNT(*) FILTER (WHERE s.resultado = 'condenacao') AS condenacoes,
          COUNT(*) FILTER (WHERE s.resultado = 'desclassificacao') AS desclassificacoes,
          COUNT(*) FILTER (WHERE s.resultado = 'nulidade') AS nulidades
        FROM sessoes_juri s
        WHERE ${where}
        GROUP BY to_char(s.data_sessao, 'YYYY-MM')
        ORDER BY mes ASC
      `);

      return [...result].map((row) => ({
        mes: str(row.mes),
        total: num(row.total),
        absolvicoes: num(row.absolvicoes),
        condenacoes: num(row.condenacoes),
        desclassificacoes: num(row.desclassificacoes),
        nulidades: num(row.nulidades),
      }));
    }),

  // ============================================================
  // 3. POR TIPO PENAL — Breakdown por crime
  // ============================================================
  porTipoPenal: protectedProcedure
    .input(filtrosInput)
    .query(async ({ ctx, input }) => {
      getWorkspaceScope(ctx.user);

      const where = buildWhereClause(input);

      const result = await db.execute<DbRow>(sql`
        SELECT
          COALESCE(s.tipo_penal, 'nao_informado') AS tipo_penal,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE s.resultado = 'absolvicao') AS absolvicoes,
          COUNT(*) FILTER (WHERE s.resultado = 'condenacao') AS condenacoes,
          COUNT(*) FILTER (WHERE s.resultado = 'desclassificacao') AS desclassificacoes,
          ROUND(
            100.0 * COUNT(*) FILTER (WHERE s.resultado = 'absolvicao') / NULLIF(COUNT(*), 0),
            1
          ) AS taxa_absolvicao
        FROM sessoes_juri s
        WHERE ${where}
        GROUP BY COALESCE(s.tipo_penal, 'nao_informado')
        ORDER BY total DESC
      `);

      return [...result].map((row) => ({
        tipoPenal: str(row.tipo_penal),
        total: num(row.total),
        absolvicoes: num(row.absolvicoes),
        condenacoes: num(row.condenacoes),
        desclassificacoes: num(row.desclassificacoes),
        taxaAbsolvicao: num(row.taxa_absolvicao),
      }));
    }),

  // ============================================================
  // 4. POR TESE — Breakdown por tese de defesa
  // ============================================================
  porTese: protectedProcedure
    .input(filtrosInput)
    .query(async ({ ctx, input }) => {
      getWorkspaceScope(ctx.user);

      const where = buildWhereClause(input);

      const result = await db.execute<DbRow>(sql`
        SELECT
          COALESCE(s.tese_principal, 'Nao informada') AS tese,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE s.resultado = 'absolvicao') AS absolvicoes,
          COUNT(*) FILTER (WHERE s.resultado = 'condenacao') AS condenacoes,
          ROUND(
            100.0 * COUNT(*) FILTER (WHERE s.resultado = 'absolvicao') / NULLIF(COUNT(*), 0),
            1
          ) AS taxa_absolvicao
        FROM sessoes_juri s
        WHERE ${where}
        GROUP BY COALESCE(s.tese_principal, 'Nao informada')
        ORDER BY total DESC
      `);

      return [...result].map((row) => ({
        tese: str(row.tese),
        total: num(row.total),
        absolvicoes: num(row.absolvicoes),
        condenacoes: num(row.condenacoes),
        taxaAbsolvicao: num(row.taxa_absolvicao),
      }));
    }),

  // ============================================================
  // 5. POR DURACAO — Duração vs resultado (faixas)
  // ============================================================
  porDuracao: protectedProcedure
    .input(filtrosInput)
    .query(async ({ ctx, input }) => {
      getWorkspaceScope(ctx.user);

      const where = buildWhereClause(input);

      const result = await db.execute<DbRow>(sql`
        SELECT
          CASE
            WHEN s.duracao_minutos IS NULL THEN 'Nao informado'
            WHEN s.duracao_minutos < 120 THEN '< 2h'
            WHEN s.duracao_minutos < 240 THEN '2-4h'
            WHEN s.duracao_minutos < 360 THEN '4-6h'
            WHEN s.duracao_minutos < 480 THEN '6-8h'
            ELSE '> 8h'
          END AS faixa,
          CASE
            WHEN s.duracao_minutos IS NULL THEN 0
            WHEN s.duracao_minutos < 120 THEN 1
            WHEN s.duracao_minutos < 240 THEN 2
            WHEN s.duracao_minutos < 360 THEN 3
            WHEN s.duracao_minutos < 480 THEN 4
            ELSE 5
          END AS ordem,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE s.resultado = 'absolvicao') AS absolvicoes,
          COUNT(*) FILTER (WHERE s.resultado = 'condenacao') AS condenacoes,
          ROUND(
            100.0 * COUNT(*) FILTER (WHERE s.resultado = 'absolvicao') / NULLIF(COUNT(*), 0),
            1
          ) AS taxa_absolvicao
        FROM sessoes_juri s
        WHERE ${where}
        GROUP BY faixa, ordem
        ORDER BY ordem ASC
      `);

      return [...result].map((row) => ({
        faixa: str(row.faixa),
        total: num(row.total),
        absolvicoes: num(row.absolvicoes),
        condenacoes: num(row.condenacoes),
        taxaAbsolvicao: num(row.taxa_absolvicao),
      }));
    }),

  // ============================================================
  // 6. POR PERFIL — Primariedade e local do fato
  // ============================================================
  porPerfil: protectedProcedure
    .input(filtrosInput)
    .query(async ({ ctx, input }) => {
      getWorkspaceScope(ctx.user);

      const where = buildWhereClause(input);

      // Primariedade
      const resultPrimario = await db.execute<DbRow>(sql`
        SELECT
          CASE
            WHEN s.reu_primario IS NULL THEN 'Nao informado'
            WHEN s.reu_primario = true THEN 'Primario'
            ELSE 'Reincidente'
          END AS categoria,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE s.resultado = 'absolvicao') AS absolvicoes,
          COUNT(*) FILTER (WHERE s.resultado = 'condenacao') AS condenacoes,
          ROUND(
            100.0 * COUNT(*) FILTER (WHERE s.resultado = 'absolvicao') / NULLIF(COUNT(*), 0),
            1
          ) AS taxa_absolvicao
        FROM sessoes_juri s
        WHERE ${where}
        GROUP BY categoria
        ORDER BY total DESC
      `);

      // Local do fato
      const resultLocal = await db.execute<DbRow>(sql`
        SELECT
          COALESCE(s.local_fato, 'Nao informado') AS local,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE s.resultado = 'absolvicao') AS absolvicoes,
          COUNT(*) FILTER (WHERE s.resultado = 'condenacao') AS condenacoes,
          ROUND(
            100.0 * COUNT(*) FILTER (WHERE s.resultado = 'absolvicao') / NULLIF(COUNT(*), 0),
            1
          ) AS taxa_absolvicao
        FROM sessoes_juri s
        WHERE ${where}
        GROUP BY COALESCE(s.local_fato, 'Nao informado')
        ORDER BY total DESC
        LIMIT 15
      `);

      return {
        porPrimariedade: [...resultPrimario].map((row) => ({
          categoria: str(row.categoria),
          total: num(row.total),
          absolvicoes: num(row.absolvicoes),
          condenacoes: num(row.condenacoes),
          taxaAbsolvicao: num(row.taxa_absolvicao),
        })),
        porLocalFato: [...resultLocal].map((row) => ({
          local: str(row.local),
          total: num(row.total),
          absolvicoes: num(row.absolvicoes),
          condenacoes: num(row.condenacoes),
          taxaAbsolvicao: num(row.taxa_absolvicao),
        })),
      };
    }),

  // ============================================================
  // 7. ATORES — Jurados, juízes e promotores
  // ============================================================
  atores: protectedProcedure
    .input(filtrosInput)
    .query(async ({ ctx, input }) => {
      getWorkspaceScope(ctx.user);

      const where = buildWhereClause(input);

      // Top jurados com tendência (no dynamic filters, static query)
      const juradosResult = await db.execute<DbRow>(sql`
        SELECT
          j.id,
          j.nome,
          COALESCE(j.total_sessoes, 0) AS total_sessoes,
          COALESCE(j.votos_condenacao, 0) AS votos_condenacao,
          COALESCE(j.votos_absolvicao, 0) AS votos_absolvicao,
          COALESCE(j.votos_desclassificacao, 0) AS votos_desclassificacao,
          COALESCE(j.perfil_tendencia, 'desconhecido') AS perfil_tendencia
        FROM jurados j
        WHERE j.ativo = true
        ORDER BY j.total_sessoes DESC NULLS LAST
        LIMIT 20
      `);

      // Juízes — group by juiz_presidente nas sessões filtradas
      const juizesResult = await db.execute<DbRow>(sql`
        SELECT
          s.juiz_presidente AS nome,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE s.resultado = 'absolvicao') AS absolvicoes,
          COUNT(*) FILTER (WHERE s.resultado = 'condenacao') AS condenacoes,
          ROUND(
            100.0 * COUNT(*) FILTER (WHERE s.resultado = 'absolvicao') / NULLIF(COUNT(*), 0),
            1
          ) AS taxa_absolvicao
        FROM sessoes_juri s
        WHERE ${where} AND s.juiz_presidente IS NOT NULL
        GROUP BY s.juiz_presidente
        ORDER BY total DESC
      `);

      // Promotores
      const promotoresResult = await db.execute<DbRow>(sql`
        SELECT
          s.promotor AS nome,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE s.resultado = 'absolvicao') AS absolvicoes,
          COUNT(*) FILTER (WHERE s.resultado = 'condenacao') AS condenacoes,
          ROUND(
            100.0 * COUNT(*) FILTER (WHERE s.resultado = 'absolvicao') / NULLIF(COUNT(*), 0),
            1
          ) AS taxa_absolvicao
        FROM sessoes_juri s
        WHERE ${where} AND s.promotor IS NOT NULL
        GROUP BY s.promotor
        ORDER BY total DESC
      `);

      return {
        jurados: [...juradosResult].map((row) => ({
          id: num(row.id),
          nome: str(row.nome),
          totalSessoes: num(row.total_sessoes),
          votosCondenacao: num(row.votos_condenacao),
          votosAbsolvicao: num(row.votos_absolvicao),
          votosDesclassificacao: num(row.votos_desclassificacao),
          perfilTendencia: str(row.perfil_tendencia),
        })),
        juizes: [...juizesResult].map((row) => ({
          nome: str(row.nome),
          total: num(row.total),
          absolvicoes: num(row.absolvicoes),
          condenacoes: num(row.condenacoes),
          taxaAbsolvicao: num(row.taxa_absolvicao),
        })),
        promotores: [...promotoresResult].map((row) => ({
          nome: str(row.nome),
          total: num(row.total),
          absolvicoes: num(row.absolvicoes),
          condenacoes: num(row.condenacoes),
          taxaAbsolvicao: num(row.taxa_absolvicao),
        })),
      };
    }),

  // ============================================================
  // 8. INSIGHTS CRUZADOS — Padrões auto-detectados
  // ============================================================
  insightsCruzados: protectedProcedure
    .input(filtrosInput)
    .query(async ({ ctx, input }) => {
      getWorkspaceScope(ctx.user);

      const where = buildWhereClause(input);
      const insights: Array<{ insight: string; confianca: number; n: number }> = [];

      // ----------------------------------------------------------
      // Insight: Duração longa = mais condenação?
      // ----------------------------------------------------------
      try {
        const duracaoResult = await db.execute<DbRow>(sql`
          SELECT
            CASE WHEN s.duracao_minutos >= 360 THEN 'longa' ELSE 'curta' END AS tipo,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE s.resultado = 'condenacao') AS condenacoes,
            COUNT(*) FILTER (WHERE s.resultado = 'absolvicao') AS absolvicoes
          FROM sessoes_juri s
          WHERE ${where} AND s.duracao_minutos IS NOT NULL
          GROUP BY tipo
        `);

        const rows = [...duracaoResult];
        const longa = rows.find((r) => r.tipo === "longa");
        const curta = rows.find((r) => r.tipo === "curta");

        if (longa && num(longa.total) >= 5 && curta && num(curta.total) >= 5) {
          const taxaCondLonga = (num(longa.condenacoes) / num(longa.total)) * 100;
          const taxaCondCurta = (num(curta.condenacoes) / num(curta.total)) * 100;
          const diff = taxaCondLonga - taxaCondCurta;

          if (Math.abs(diff) >= 10) {
            if (diff > 0) {
              insights.push({
                insight: `Sessoes com mais de 6h tem ${Math.round(taxaCondLonga)}% de condenacao, contra ${Math.round(taxaCondCurta)}% nas mais curtas`,
                confianca: Math.min(90, 50 + Math.abs(diff)),
                n: num(longa.total) + num(curta.total),
              });
            } else {
              insights.push({
                insight: `Sessoes mais longas (6h+) tem taxa de absolvicao maior: ${Math.round(100 - taxaCondLonga)}% vs ${Math.round(100 - taxaCondCurta)}%`,
                confianca: Math.min(90, 50 + Math.abs(diff)),
                n: num(longa.total) + num(curta.total),
              });
            }
          }
        }
      } catch (e) { /* skip insight */ }

      // ----------------------------------------------------------
      // Insight: Réu primário vs reincidente
      // ----------------------------------------------------------
      try {
        const primarioResult = await db.execute<DbRow>(sql`
          SELECT
            s.reu_primario AS primario,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE s.resultado = 'absolvicao') AS absolvicoes
          FROM sessoes_juri s
          WHERE ${where} AND s.reu_primario IS NOT NULL
          GROUP BY s.reu_primario
        `);

        const rows = [...primarioResult];
        const prim = rows.find((r) => r.primario === true);
        const reincid = rows.find((r) => r.primario === false);

        if (prim && num(prim.total) >= 5 && reincid && num(reincid.total) >= 3) {
          const taxaPrim = (num(prim.absolvicoes) / num(prim.total)) * 100;
          const taxaReincid = (num(reincid.absolvicoes) / num(reincid.total)) * 100;
          const diff = taxaPrim - taxaReincid;

          if (diff > 10) {
            insights.push({
              insight: `Reus primarios tem ${Math.round(taxaPrim)}% de absolvicao contra ${Math.round(taxaReincid)}% dos reincidentes`,
              confianca: Math.min(85, 50 + diff / 2),
              n: num(prim.total) + num(reincid.total),
            });
          }
        }
      } catch (e) { /* skip insight */ }

      // ----------------------------------------------------------
      // Insight: Tese + resultado (melhor e pior tese)
      // ----------------------------------------------------------
      try {
        const teseResult = await db.execute<DbRow>(sql`
          SELECT
            s.tese_principal AS tese,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE s.resultado = 'absolvicao') AS absolvicoes,
            ROUND(100.0 * COUNT(*) FILTER (WHERE s.resultado = 'absolvicao') / NULLIF(COUNT(*), 0), 1) AS taxa
          FROM sessoes_juri s
          WHERE ${where} AND s.tese_principal IS NOT NULL
          GROUP BY s.tese_principal
          HAVING COUNT(*) >= 3
          ORDER BY taxa DESC
        `);

        const rows = [...teseResult];
        if (rows.length >= 2) {
          const melhor = rows[0];
          const pior = rows[rows.length - 1];

          if (num(melhor.taxa) > 60) {
            insights.push({
              insight: `A tese "${melhor.tese}" tem a melhor taxa de absolvicao: ${melhor.taxa}% em ${melhor.total} sessoes`,
              confianca: Math.min(85, 40 + num(melhor.total) * 5),
              n: num(melhor.total),
            });
          }

          if (num(pior.taxa) < 30 && num(pior.total) >= 3) {
            insights.push({
              insight: `A tese "${pior.tese}" tem a menor taxa de absolvicao: ${pior.taxa}% em ${pior.total} sessoes`,
              confianca: Math.min(80, 40 + num(pior.total) * 5),
              n: num(pior.total),
            });
          }
        }
      } catch (e) { /* skip insight */ }

      // ----------------------------------------------------------
      // Insight: Tipo penal mais favorável
      // ----------------------------------------------------------
      try {
        const tipoPenalResult = await db.execute<DbRow>(sql`
          SELECT
            s.tipo_penal,
            COUNT(*) AS total,
            ROUND(100.0 * COUNT(*) FILTER (WHERE s.resultado = 'absolvicao') / NULLIF(COUNT(*), 0), 1) AS taxa
          FROM sessoes_juri s
          WHERE ${where} AND s.tipo_penal IS NOT NULL
          GROUP BY s.tipo_penal
          HAVING COUNT(*) >= 5
          ORDER BY taxa DESC
        `);

        const rows = [...tipoPenalResult];
        if (rows.length >= 1) {
          const melhor = rows[0];
          const label = String(melhor.tipo_penal).replace(/_/g, " ");
          insights.push({
            insight: `Em casos de ${label}, a taxa de absolvicao e de ${melhor.taxa}% (n=${melhor.total})`,
            confianca: Math.min(85, 40 + num(melhor.total) * 3),
            n: num(melhor.total),
          });
        }
      } catch (e) { /* skip insight */ }

      // ----------------------------------------------------------
      // Insight: Tese + réu primário combo
      // ----------------------------------------------------------
      try {
        const comboResult = await db.execute<DbRow>(sql`
          SELECT
            s.tese_principal AS tese,
            COUNT(*) AS total,
            ROUND(100.0 * COUNT(*) FILTER (WHERE s.resultado = 'absolvicao') / NULLIF(COUNT(*), 0), 1) AS taxa
          FROM sessoes_juri s
          WHERE ${where} AND s.tese_principal IS NOT NULL AND s.reu_primario = true
          GROUP BY s.tese_principal
          HAVING COUNT(*) >= 5
          ORDER BY taxa DESC
          LIMIT 1
        `);

        const rows = [...comboResult];
        if (rows.length >= 1 && num(rows[0].taxa) >= 50) {
          insights.push({
            insight: `Tese "${rows[0].tese}" + reu primario = ${rows[0].taxa}% de absolvicao`,
            confianca: Math.min(80, 40 + num(rows[0].total) * 4),
            n: num(rows[0].total),
          });
        }
      } catch (e) { /* skip insight */ }

      // Ordenar por confiança desc
      insights.sort((a, b) => b.confianca - a.confianca);

      return insights;
    }),
});
