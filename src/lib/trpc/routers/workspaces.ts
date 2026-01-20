import { z } from "zod";
import { router, adminProcedure } from "../init";
import { db, workspaces, users } from "@/lib/db";
import { desc, eq, sql } from "drizzle-orm";
import { Errors, safeAsync } from "@/lib/errors";

export const workspacesRouter = router({
  /**
   * Lista workspaces (admin)
   */
  list: adminProcedure.query(async () => {
    return safeAsync(async () => {
      const result = await db
        .select({
          id: workspaces.id,
          name: workspaces.name,
          description: workspaces.description,
          isActive: workspaces.isActive,
          createdAt: workspaces.createdAt,
          updatedAt: workspaces.updatedAt,
          memberCount: sql<number>`count(${users.id})::int`,
        })
        .from(workspaces)
        .leftJoin(users, eq(users.workspaceId, workspaces.id))
        .groupBy(workspaces.id)
        .orderBy(desc(workspaces.createdAt));

      return result;
    }, "Erro ao listar workspaces");
  }),

  /**
   * Cria workspace
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(2),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const [workspace] = await db
          .insert(workspaces)
          .values({
            name: input.name,
            description: input.description || null,
          })
          .returning();

        return workspace;
      }, "Erro ao criar workspace");
    }),

  /**
   * Atualiza workspace
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(2).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = { updatedAt: new Date() };

        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description || null;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;

        const [updated] = await db
          .update(workspaces)
          .set(updateData)
          .where(eq(workspaces.id, id))
          .returning();

        if (!updated) {
          throw Errors.notFound("Workspace");
        }

        return updated;
      }, "Erro ao atualizar workspace");
    }),

  /**
   * Remove workspace (sem membros)
   */
  remove: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const [countResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(eq(users.workspaceId, input.id));

        if ((countResult?.count || 0) > 0) {
          throw Errors.badRequest("Remova os membros antes de excluir o workspace.");
        }

        const [deleted] = await db
          .delete(workspaces)
          .where(eq(workspaces.id, input.id))
          .returning();

        if (!deleted) {
          throw Errors.notFound("Workspace");
        }

        return { success: true };
      }, "Erro ao remover workspace");
    }),
});
