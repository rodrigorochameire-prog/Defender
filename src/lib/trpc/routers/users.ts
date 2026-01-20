import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, users, processos, assistidos, workspaces } from "@/lib/db";
import { eq, desc, sql, and, ne } from "drizzle-orm";
import { Errors, safeAsync } from "@/lib/errors";
import { idSchema, emailSchema, nameSchema, phoneSchema } from "@/lib/validations";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export const usersRouter = router({
  /**
   * Lista todos os usuários (admin)
   */
  list: adminProcedure
    .input(
      z
        .object({
          role: z.enum(["admin", "defensor", "estagiario", "servidor"]).optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        let result = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            phone: users.phone,
            oab: users.oab,
            comarca: users.comarca,
            emailVerified: users.emailVerified,
            createdAt: users.createdAt,
            workspaceId: users.workspaceId,
            workspaceName: workspaces.name,
          })
          .from(users)
          .leftJoin(workspaces, eq(users.workspaceId, workspaces.id))
          .orderBy(desc(users.createdAt));

        // Aplicar filtros
        if (input?.role) {
          result = result.filter((u) => u.role === input.role);
        }

        if (input?.search) {
          const search = input.search.toLowerCase();
          result = result.filter(
            (u) =>
              u.name.toLowerCase().includes(search) ||
              u.email.toLowerCase().includes(search) ||
              u.phone?.toLowerCase().includes(search) ||
              u.oab?.toLowerCase().includes(search)
          );
        }

        return result;
      }, "Erro ao listar usuários");
    }),

  /**
   * Lista defensores
   */
  defensores: adminProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          approvalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return safeAsync(async () => {
        let result = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
            oab: users.oab,
            comarca: users.comarca,
            emailVerified: users.emailVerified,
            approvalStatus: users.approvalStatus,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(eq(users.role, "defensor"))
          .orderBy(desc(users.createdAt));

        if (input?.approvalStatus) {
          result = result.filter((u) => u.approvalStatus === input.approvalStatus);
        }

        if (input?.search) {
          const search = input.search.toLowerCase();
          result = result.filter(
            (u) =>
              u.name.toLowerCase().includes(search) ||
              u.email.toLowerCase().includes(search) ||
              u.oab?.toLowerCase().includes(search)
          );
        }

        // Buscar quantidade de processos de cada defensor
        const defensoresWithStats = await Promise.all(
          result.map(async (defensor) => {
            const [processoCount] = await db
              .select({ count: sql<number>`count(*)::int` })
              .from(processos)
              .where(eq(processos.defensorId, defensor.id));

            const [assistidoCount] = await db
              .select({ count: sql<number>`count(*)::int` })
              .from(assistidos)
              .where(eq(assistidos.defensorId, defensor.id));

            return {
              ...defensor,
              processoCount: processoCount.count,
              assistidoCount: assistidoCount.count,
            };
          })
        );

        return defensoresWithStats;
      }, "Erro ao listar defensores");
    }),

  /**
   * Lista usuários pendentes de aprovação
   */
  pendingUsers: adminProcedure.query(async () => {
    return safeAsync(async () => {
      const pending = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.approvalStatus, "pending"))
        .orderBy(desc(users.createdAt));

      return pending;
    }, "Erro ao listar usuários pendentes");
  }),

  /**
   * Aprova um usuário
   */
  approve: adminProcedure
    .input(z.object({ id: idSchema }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const [updated] = await db
          .update(users)
          .set({ approvalStatus: "approved", updatedAt: new Date() })
          .where(eq(users.id, input.id))
          .returning();

        if (!updated) {
          throw Errors.notFound("Usuário");
        }

        return updated;
      }, "Erro ao aprovar usuário");
    }),

  /**
   * Rejeita um usuário
   */
  reject: adminProcedure
    .input(z.object({ id: idSchema, reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const [updated] = await db
          .update(users)
          .set({ approvalStatus: "rejected", updatedAt: new Date() })
          .where(eq(users.id, input.id))
          .returning();

        if (!updated) {
          throw Errors.notFound("Usuário");
        }

        return updated;
      }, "Erro ao rejeitar usuário");
    }),

  /**
   * Busca usuário por ID
   */
  byId: adminProcedure
    .input(z.object({ id: idSchema }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const user = await db.query.users.findFirst({
          where: eq(users.id, input.id),
        });

        if (!user) {
          throw Errors.notFound("Usuário");
        }

        const workspace = user.workspaceId
          ? await db.query.workspaces.findFirst({
              where: eq(workspaces.id, user.workspaceId),
            })
          : null;

        // Buscar estatísticas do usuário
        const [processoStats] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(processos)
          .where(eq(processos.defensorId, input.id));

        const [assistidoStats] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(assistidos)
          .where(eq(assistidos.defensorId, input.id));

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          oab: user.oab,
          comarca: user.comarca,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          workspaceId: user.workspaceId,
          workspaceName: workspace?.name || null,
          processoCount: processoStats.count,
          assistidoCount: assistidoStats.count,
        };
      }, "Erro ao buscar usuário");
    }),

  /**
   * Cria novo usuário (admin)
   */
  create: adminProcedure
    .input(
      z.object({
        name: nameSchema,
        email: emailSchema,
        password: z.string().min(6),
        role: z.enum(["admin", "defensor", "estagiario", "servidor"]).default("defensor"),
        phone: phoneSchema,
        oab: z.string().optional(),
        comarca: z.string().optional(),
        workspaceId: z.number().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        // Verificar se email já existe
        const existing = await db.query.users.findFirst({
          where: eq(users.email, input.email),
        });

        if (existing) {
          throw Errors.conflict("Este email já está cadastrado");
        }

        // Criar usuário
        const passwordHash = await hashPassword(input.password);

        const [newUser] = await db
          .insert(users)
          .values({
            name: input.name,
            email: input.email,
            passwordHash,
            role: input.role,
            phone: input.phone || null,
            oab: input.oab || null,
            comarca: input.comarca || null,
            workspaceId: input.workspaceId || null,
            emailVerified: true, // Admin criando, já verificado
            approvalStatus: "approved", // Admin criando, já aprovado
          })
          .returning();

        return {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          workspaceId: newUser.workspaceId,
        };
      }, "Erro ao criar usuário");
    }),

  /**
   * Atualiza usuário
   */
  update: adminProcedure
    .input(
      z.object({
        id: idSchema,
        name: nameSchema.optional(),
        phone: phoneSchema,
        oab: z.string().optional(),
        comarca: z.string().optional(),
        role: z.enum(["admin", "defensor", "estagiario", "servidor"]).optional(),
        workspaceId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const { id, ...data } = input;
        const currentUserId = ctx.user!.id;

        // Verificar se usuário existe
        const existing = await db.query.users.findFirst({
          where: eq(users.id, id),
        });

        if (!existing) {
          throw Errors.notFound("Usuário");
        }

        // Não permitir auto-rebaixar
        if (currentUserId === id && data.role && data.role !== "admin") {
          throw Errors.badRequest("Você não pode remover seu próprio acesso de admin");
        }

        // Preparar dados
        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (data.name) updateData.name = data.name;
        if (data.phone !== undefined) updateData.phone = data.phone || null;
        if (data.oab !== undefined) updateData.oab = data.oab || null;
        if (data.comarca !== undefined) updateData.comarca = data.comarca || null;
        if (data.role) updateData.role = data.role;
        if (data.workspaceId !== undefined) updateData.workspaceId = data.workspaceId;

        const [updated] = await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, id))
          .returning();

        return {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          workspaceId: updated.workspaceId,
        };
      }, "Erro ao atualizar usuário");
    }),

  /**
   * Promove usuário para admin
   */
  promoteToAdmin: adminProcedure
    .input(z.object({ id: idSchema }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const [updated] = await db
          .update(users)
          .set({ role: "admin", updatedAt: new Date() })
          .where(eq(users.id, input.id))
          .returning();

        if (!updated) {
          throw Errors.notFound("Usuário");
        }

        return updated;
      }, "Erro ao promover usuário");
    }),

  /**
   * Remove permissão de admin
   */
  demoteFromAdmin: adminProcedure
    .input(z.object({ id: idSchema }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Não permitir auto-rebaixar
        if (ctx.user!.id === input.id) {
          throw Errors.badRequest("Você não pode remover seu próprio acesso de admin");
        }

        const [updated] = await db
          .update(users)
          .set({ role: "defensor", updatedAt: new Date() })
          .where(eq(users.id, input.id))
          .returning();

        if (!updated) {
          throw Errors.notFound("Usuário");
        }

        return updated;
      }, "Erro ao remover permissão de admin");
    }),

  /**
   * Deleta usuário (admin)
   */
  delete: adminProcedure
    .input(z.object({ id: idSchema }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Não permitir auto-exclusão
        if (ctx.user!.id === input.id) {
          throw Errors.badRequest("Você não pode excluir sua própria conta");
        }

        const existing = await db.query.users.findFirst({
          where: eq(users.id, input.id),
        });

        if (!existing) {
          throw Errors.notFound("Usuário");
        }

        await db.delete(users).where(eq(users.id, input.id));

        return { success: true, deletedId: input.id };
      }, "Erro ao excluir usuário");
    }),

  /**
   * Estatísticas de usuários (admin)
   */
  stats: adminProcedure.query(async () => {
    return safeAsync(async () => {
      const [totalUsers] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users);

      const [admins] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.role, "admin"));

      const [defensores] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.role, "defensor"));

      const [estagiarios] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.role, "estagiario"));

      const [servidores] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.role, "servidor"));

      const [pendingUsers] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.approvalStatus, "pending"));

      return {
        total: totalUsers.count,
        admins: admins.count,
        defensores: defensores.count,
        estagiarios: estagiarios.count,
        servidores: servidores.count,
        pendingUsers: pendingUsers.count,
      };
    }, "Erro ao buscar estatísticas");
  }),

  /**
   * Atualizar próprio perfil
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: nameSchema.optional(),
        phone: phoneSchema,
        oab: z.string().optional(),
        comarca: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (input.name) updateData.name = input.name;
        if (input.phone !== undefined) updateData.phone = input.phone || null;
        if (input.oab !== undefined) updateData.oab = input.oab || null;
        if (input.comarca !== undefined) updateData.comarca = input.comarca || null;

        const [updated] = await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, ctx.user!.id))
          .returning();

        return {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          oab: updated.oab,
          comarca: updated.comarca,
        };
      }, "Erro ao atualizar perfil");
    }),

  /**
   * Verifica se o usuário tem senha definida
   */
  hasPassword: protectedProcedure.query(async ({ ctx }) => {
    return safeAsync(async () => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.user!.id),
        columns: { passwordHash: true },
      });

      return {
        hasPassword: !!user?.passwordHash,
      };
    }, "Erro ao verificar senha");
  }),

  /**
   * Criar senha (para usuários que entraram via Google)
   */
  createPassword: protectedProcedure
    .input(
      z.object({
        newPassword: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
        confirmPassword: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        if (input.newPassword !== input.confirmPassword) {
          throw Errors.badRequest("As senhas não conferem");
        }

        // Verificar se já tem senha
        const user = await db.query.users.findFirst({
          where: eq(users.id, ctx.user!.id),
          columns: { passwordHash: true },
        });

        if (user?.passwordHash) {
          throw Errors.badRequest("Você já possui uma senha. Use a opção de alterar senha.");
        }

        const passwordHash = await hashPassword(input.newPassword);

        await db
          .update(users)
          .set({ passwordHash, updatedAt: new Date() })
          .where(eq(users.id, ctx.user!.id));

        return { success: true };
      }, "Erro ao criar senha");
    }),

  /**
   * Alterar senha (para usuários que já têm senha)
   */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1, "Senha atual é obrigatória"),
        newPassword: z.string().min(6, "Nova senha deve ter no mínimo 6 caracteres"),
        confirmPassword: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        if (input.newPassword !== input.confirmPassword) {
          throw Errors.badRequest("As senhas não conferem");
        }

        // Buscar usuário com senha
        const user = await db.query.users.findFirst({
          where: eq(users.id, ctx.user!.id),
          columns: { passwordHash: true },
        });

        if (!user?.passwordHash) {
          throw Errors.badRequest("Você não possui uma senha. Use a opção de criar senha.");
        }

        // Verificar senha atual
        const isValid = await verifyPassword(input.currentPassword, user.passwordHash);
        if (!isValid) {
          throw Errors.badRequest("Senha atual incorreta");
        }

        // Atualizar senha
        const passwordHash = await hashPassword(input.newPassword);

        await db
          .update(users)
          .set({ passwordHash, updatedAt: new Date() })
          .where(eq(users.id, ctx.user!.id));

        return { success: true };
      }, "Erro ao alterar senha");
    }),
});
