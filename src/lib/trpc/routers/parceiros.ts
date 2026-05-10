import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { defensorParceiros, users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export const parceirosRouter = router({
  // Lista os defensores parceiros do usuário atual (para transferência de caso).
  listar: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(defensorParceiros)
      .innerJoin(users, eq(users.id, defensorParceiros.parceiroId))
      .where(
        and(
          eq(defensorParceiros.defensorId, userId),
          isNull(users.deletedAt),
          eq(users.role, "defensor"),
        ),
      );

    return rows;
  }),
});
