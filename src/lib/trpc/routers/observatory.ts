import { router, adminProcedure } from "../init";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { z } from "zod";

export const observatoryRouter = router({

  // ─── ALERTAS CRÍTICOS ───────────────────────────────────────────
  getAlertas: adminProcedure.query(async () => {
    const [whatsappDesconectados, defensoresInativos, convitesExpirados] =
      await Promise.all([
        db.execute(sql`
          SELECT id, instance_name, status, created_by_id
          FROM evolution_config
          WHERE status != 'connected' AND is_active = true
        `),
        db.execute(sql`
          SELECT u.id, u.name, u.comarca_id,
            MAX(al.created_at) as ultimo_acesso
          FROM users u
          LEFT JOIN activity_logs al ON al.user_id = u.id
          WHERE u.deleted_at IS NULL
            AND u.role IN ('defensor', 'estagiario', 'servidor')
            AND u.approval_status = 'approved'
          GROUP BY u.id, u.name, u.comarca_id
          HAVING MAX(al.created_at) < NOW() - INTERVAL '7 days'
            OR MAX(al.created_at) IS NULL
        `),
        db.execute(sql`
          SELECT id, email, created_at
          FROM user_invitations
          WHERE accepted_at IS NULL
            AND expires_at > NOW()
            AND created_at < NOW() - INTERVAL '14 days'
        `),
      ]);

    return {
      whatsappDesconectados: (whatsappDesconectados as unknown as Array<{
        id: number; instance_name: string; status: string; created_by_id: number;
      }>),
      defensoresInativos: (defensoresInativos as unknown as Array<{
        id: number; name: string; comarca_id: number; ultimo_acesso: string | null;
      }>),
      convitesExpirados: (convitesExpirados as unknown as Array<{
        id: number; email: string; created_at: string;
      }>),
    };
  }),

  // ─── RESUMO RÁPIDO (sempre últimos 30 dias) ────────────────────
  getResumoRapido: adminProcedure.query(async () => {
    const [atual, anterior] = await Promise.all([
      db.execute(sql`
        SELECT
          (SELECT COUNT(*) FROM atendimentos WHERE created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL) as atendimentos,
          (SELECT COUNT(*) FROM demandas WHERE created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL) as demandas,
          (SELECT COUNT(*) FROM processos WHERE created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL) as processos,
          (SELECT COUNT(*) FROM assistidos WHERE created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL) as assistidos_novos,
          (SELECT COUNT(*) FROM analises_ia WHERE created_at >= NOW() - INTERVAL '30 days') as analises_ia,
          (SELECT COUNT(DISTINCT user_id) FROM activity_logs WHERE created_at >= NOW() - INTERVAL '3 days') as defensores_ativos
      `),
      db.execute(sql`
        SELECT
          (SELECT COUNT(*) FROM atendimentos WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days' AND deleted_at IS NULL) as atendimentos,
          (SELECT COUNT(*) FROM demandas WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days' AND deleted_at IS NULL) as demandas,
          (SELECT COUNT(*) FROM processos WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days' AND deleted_at IS NULL) as processos,
          (SELECT COUNT(*) FROM assistidos WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days' AND deleted_at IS NULL) as assistidos_novos,
          (SELECT COUNT(*) FROM analises_ia WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days') as analises_ia
      `),
    ]);

    const a = (atual as unknown as Array<Record<string, string>>)[0];
    const p = (anterior as unknown as Array<Record<string, string>>)[0];

    const pct = (now: number, prev: number) =>
      prev === 0 ? null : Math.round(((now - prev) / prev) * 100);

    return {
      atendimentos: { total: Number(a.atendimentos), variacao: pct(Number(a.atendimentos), Number(p.atendimentos)) },
      demandas: { total: Number(a.demandas), variacao: pct(Number(a.demandas), Number(p.demandas)) },
      processos: { total: Number(a.processos), variacao: pct(Number(a.processos), Number(p.processos)) },
      assistidosNovos: { total: Number(a.assistidos_novos), variacao: pct(Number(a.assistidos_novos), Number(p.assistidos_novos)) },
      analisesIa: { total: Number(a.analises_ia), variacao: pct(Number(a.analises_ia), Number(p.analises_ia)) },
      defensoresAtivos: { total: Number(a.defensores_ativos), variacao: null },
    };
  }),

  // ─── ADOÇÃO POR DEFENSOR ────────────────────────────────────────
  getAdocao: adminProcedure
    .input(z.object({
      inicio: z.string().optional(),
      fim: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const inicio = input?.inicio ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const fim = input?.fim ?? new Date().toISOString().split('T')[0];

      const rows = await db.execute(sql`
        SELECT
          u.id,
          u.name,
          u.role,
          u.comarca_id,
          c.nome as comarca_nome,
          MAX(al.created_at) as ultimo_acesso,
          COUNT(DISTINCT at_periodo.id) as atendimentos,
          COUNT(DISTINCT dm_periodo.id) as demandas,
          COUNT(DISTINCT pr_periodo.id) as processos,
          -- Onboarding
          (ui.accepted_at IS NOT NULL) as convite_aceito,
          (MAX(al_any.created_at) IS NOT NULL) as primeiro_login,
          (COUNT(DISTINCT at_any.id) > 0) as primeiro_atendimento,
          (COUNT(DISTINCT dm_any.id) > 0) as primeira_demanda,
          -- Features
          (ec.id IS NOT NULL) as tem_whatsapp,
          (COUNT(DISTINCT ai_periodo.id) > 0) as usou_ia
        FROM users u
        LEFT JOIN comarcas c ON c.id = u.comarca_id
        LEFT JOIN activity_logs al ON al.user_id = u.id AND al.created_at >= NOW() - INTERVAL '7 days'
        LEFT JOIN activity_logs al_any ON al_any.user_id = u.id
        LEFT JOIN atendimentos at_periodo ON at_periodo.atendido_por_id = u.id
          AND at_periodo.deleted_at IS NULL
          AND at_periodo.created_at >= ${inicio}::timestamp
          AND at_periodo.created_at < ${fim}::timestamp
        LEFT JOIN atendimentos at_any ON at_any.atendido_por_id = u.id AND at_any.deleted_at IS NULL
        LEFT JOIN demandas dm_periodo ON dm_periodo.defensor_id = u.id
          AND dm_periodo.deleted_at IS NULL
          AND dm_periodo.created_at >= ${inicio}::timestamp
          AND dm_periodo.created_at < ${fim}::timestamp
        LEFT JOIN demandas dm_any ON dm_any.defensor_id = u.id AND dm_any.deleted_at IS NULL
        LEFT JOIN processos pr_periodo ON pr_periodo.defensor_id = u.id
          AND pr_periodo.deleted_at IS NULL
          AND pr_periodo.created_at >= ${inicio}::timestamp
          AND pr_periodo.created_at < ${fim}::timestamp
        LEFT JOIN evolution_config ec ON ec.created_by_id = u.id AND ec.is_active = true
        LEFT JOIN analises_ia ai_periodo ON ai_periodo.criado_por_id = u.id
          AND ai_periodo.created_at >= ${inicio}::timestamp
          AND ai_periodo.created_at < ${fim}::timestamp
        LEFT JOIN user_invitations ui ON ui.email = u.email
        WHERE u.deleted_at IS NULL
          AND u.role IN ('defensor', 'estagiario', 'servidor')
          AND u.approval_status = 'approved'
        GROUP BY u.id, u.name, u.role, u.comarca_id, c.nome, ui.accepted_at, ec.id
        ORDER BY c.nome, u.name
      `);

      return rows as unknown as Array<{
        id: number; name: string; role: string;
        comarca_id: number; comarca_nome: string | null;
        ultimo_acesso: string | null;
        atendimentos: number; demandas: number; processos: number;
        convite_aceito: boolean; primeiro_login: boolean;
        primeiro_atendimento: boolean; primeira_demanda: boolean;
        tem_whatsapp: boolean; usou_ia: boolean;
      }>;
    }),

  // ─── VOLUME DE OPERAÇÕES ────────────────────────────────────────
  getVolume: adminProcedure
    .input(z.object({
      inicio: z.string().optional(),
      fim: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const inicio = input?.inicio ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const fim = input?.fim ?? new Date().toISOString().split('T')[0];

      const [porComarca, tendencia, porTipo] = await Promise.all([
        db.execute(sql`
          SELECT c.nome as comarca, COUNT(a.id) as total
          FROM atendimentos a
          JOIN users u ON u.id = a.atendido_por_id
          JOIN comarcas c ON c.id = u.comarca_id
          WHERE a.created_at >= ${inicio}::timestamp
            AND a.created_at < ${fim}::timestamp
            AND a.deleted_at IS NULL
          GROUP BY c.nome
          ORDER BY total DESC
        `),
        db.execute(sql`
          SELECT
            TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as mes,
            COUNT(*) as total
          FROM atendimentos
          WHERE created_at >= NOW() - INTERVAL '6 months'
            AND deleted_at IS NULL
          GROUP BY mes
          ORDER BY mes
        `),
        db.execute(sql`
          SELECT COALESCE(tipo_ato, 'Sem tipo') as tipo, COUNT(*) as total
          FROM demandas
          WHERE created_at >= ${inicio}::timestamp
            AND created_at < ${fim}::timestamp
            AND deleted_at IS NULL
          GROUP BY tipo_ato
          ORDER BY total DESC
          LIMIT 8
        `),
      ]);

      return {
        porComarca: porComarca as unknown as Array<{ comarca: string; total: number }>,
        tendencia: tendencia as unknown as Array<{ mes: string; total: number }>,
        porTipo: porTipo as unknown as Array<{ tipo: string; total: number }>,
      };
    }),

  // ─── SAÚDE TÉCNICA ──────────────────────────────────────────────
  getSaudeTecnica: adminProcedure.query(async () => {
    const whatsapp = await db.execute(sql`
      SELECT id, instance_name, api_url, status, phone_number,
        last_sync_at, last_disconnect_reason, created_by_id
      FROM evolution_config
      WHERE is_active = true
      ORDER BY created_at
    `);

    const pingStart = Date.now();
    await db.execute(sql`SELECT 1`);
    const dbLatencyMs = Date.now() - pingStart;

    const ultimoDeploy = process.env.VERCEL_GIT_COMMIT_SHA
      ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
      : "local";

    return {
      whatsapp: whatsapp as unknown as Array<{
        id: number; instance_name: string; api_url: string;
        status: string; phone_number: string | null;
        last_sync_at: string | null; last_disconnect_reason: string | null;
        created_by_id: number;
      }>,
      banco: { latencyMs: dbLatencyMs, status: "ok" as const },
      vercel: { commit: ultimoDeploy },
    };
  }),
});

export type ObservatoryRouter = typeof observatoryRouter;
