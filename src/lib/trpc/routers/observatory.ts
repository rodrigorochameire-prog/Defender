import { router, adminProcedure } from "../init";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

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
});

export type ObservatoryRouter = typeof observatoryRouter;
