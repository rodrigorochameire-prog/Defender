import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { comarcas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { User } from "@/lib/db/schema";

function getComarcaIdFromUser(user: User): number {
  return user.comarcaId ?? 1;
}

export const comarcasRouter = router({
  /** Retorna a comarca do usuário logado com suas features */
  getMinhaComarca: protectedProcedure.query(async ({ ctx }) => {
    const comarcaId = getComarcaIdFromUser(ctx.user);
    const result = await db
      .select()
      .from(comarcas)
      .where(eq(comarcas.id, comarcaId))
      .limit(1);
    return result[0] ?? null;
  }),

  /** Lista comarcas da região metropolitana (para seletor no toggle) */
  listRMS: protectedProcedure.query(async () => {
    return db
      .select({ id: comarcas.id, nome: comarcas.nome, regional: comarcas.regional })
      .from(comarcas)
      .where(eq(comarcas.regiaoMetro, "RMS"))
      .orderBy(comarcas.nome);
  }),
});
