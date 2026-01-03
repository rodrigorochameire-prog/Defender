import { router, adminProcedure } from "../init";
import { z } from "zod";

// Placeholder para audit logs - será implementado quando a tabela existir
export const auditLogsRouter = router({
  /**
   * Lista logs de auditoria (admin)
   */
  list: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async () => {
      // TODO: Implementar quando tabela audit_logs existir
      return {
        logs: [],
        total: 0,
      };
    }),

  /**
   * Estatísticas de auditoria
   */
  stats: adminProcedure.query(async () => {
    // TODO: Implementar quando tabela audit_logs existir
    return { total: 0, successful: 0, failed: 0, uniqueUsers: 0 };
  }),
});
