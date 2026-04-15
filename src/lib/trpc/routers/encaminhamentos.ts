import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import {
  encaminhamentos,
  encaminhamentoDestinatarios,
} from "@/lib/db/schema/cowork";
import { eq, and, desc, inArray, or } from "drizzle-orm";

const TIPO = z.enum([
  "transferir", "encaminhar", "acompanhar", "anotar", "parecer",
]);

export const encaminhamentosRouter = router({
  listar: protectedProcedure
    .input(z.object({
      filtro: z.enum(["recebidos", "enviados", "arquivados"]),
      tipo: TIPO.optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const meusAsDestinatario = db
        .select({ id: encaminhamentoDestinatarios.encaminhamentoId })
        .from(encaminhamentoDestinatarios)
        .where(eq(encaminhamentoDestinatarios.userId, userId));

      let whereClause;
      if (input.filtro === "enviados") {
        whereClause = eq(encaminhamentos.remetenteId, userId);
      } else if (input.filtro === "recebidos") {
        whereClause = and(
          inArray(encaminhamentos.id, meusAsDestinatario),
          or(
            eq(encaminhamentos.status, "pendente"),
            eq(encaminhamentos.status, "ciente"),
            eq(encaminhamentos.status, "aceito"),
            eq(encaminhamentos.status, "respondido"),
            eq(encaminhamentos.status, "concluido"),
          ),
        );
      } else {
        whereClause = and(
          or(
            eq(encaminhamentos.remetenteId, userId),
            inArray(encaminhamentos.id, meusAsDestinatario),
          ),
          eq(encaminhamentos.status, "arquivado"),
        );
      }

      if (input.tipo) {
        whereClause = and(whereClause, eq(encaminhamentos.tipo, input.tipo));
      }

      const rows = await db
        .select()
        .from(encaminhamentos)
        .where(whereClause)
        .orderBy(desc(encaminhamentos.createdAt))
        .limit(input.limit);

      return { items: rows };
    }),
});
