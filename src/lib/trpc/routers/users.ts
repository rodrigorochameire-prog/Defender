import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, users, petTutors, pets } from "@/lib/db";
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
          role: z.enum(["admin", "user"]).optional(),
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
            emailVerified: users.emailVerified,
            createdAt: users.createdAt,
          })
          .from(users)
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
              u.phone?.toLowerCase().includes(search)
          );
        }

        return result;
      }, "Erro ao listar usuários");
    }),

  /**
   * Lista apenas tutores (role = user)
   */
  tutors: adminProcedure
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
            emailVerified: users.emailVerified,
            approvalStatus: users.approvalStatus,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(eq(users.role, "user"))
          .orderBy(desc(users.createdAt));

        if (input?.approvalStatus) {
          result = result.filter((u) => u.approvalStatus === input.approvalStatus);
        }

        if (input?.search) {
          const search = input.search.toLowerCase();
          result = result.filter(
            (u) =>
              u.name.toLowerCase().includes(search) ||
              u.email.toLowerCase().includes(search)
          );
        }

        // Buscar quantidade de pets de cada tutor
        const tutorsWithPets = await Promise.all(
          result.map(async (tutor) => {
            const [petCount] = await db
              .select({ count: sql<number>`count(*)::int` })
              .from(petTutors)
              .where(eq(petTutors.tutorId, tutor.id));

            return {
              ...tutor,
              petCount: petCount.count,
            };
          })
        );

        return tutorsWithPets;
      }, "Erro ao listar tutores");
    }),

  /**
   * Lista tutores pendentes de aprovação
   */
  pendingTutors: adminProcedure.query(async () => {
    return safeAsync(async () => {
      const pending = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(and(eq(users.role, "user"), eq(users.approvalStatus, "pending")))
        .orderBy(desc(users.createdAt));

      return pending;
    }, "Erro ao listar tutores pendentes");
  }),

  /**
   * Aprova um tutor
   */
  approveTutor: adminProcedure
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
      }, "Erro ao aprovar tutor");
    }),

  /**
   * Rejeita um tutor
   */
  rejectTutor: adminProcedure
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
      }, "Erro ao rejeitar tutor");
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

        // Buscar pets do usuário
        const userPets = await db
          .select({
            id: pets.id,
            name: pets.name,
            breed: pets.breed,
            species: pets.species,
            approvalStatus: pets.approvalStatus,
            isPrimary: petTutors.isPrimary,
          })
          .from(petTutors)
          .innerJoin(pets, eq(petTutors.petId, pets.id))
          .where(eq(petTutors.tutorId, input.id));

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          pets: userPets,
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
        role: z.enum(["admin", "user"]).default("user"),
        phone: phoneSchema,
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
            emailVerified: true, // Admin criando, já verificado
            approvalStatus: "approved", // Admin criando, já aprovado
          })
          .returning();

        return {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
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
        role: z.enum(["admin", "user"]).optional(),
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
        if (data.role) updateData.role = data.role;

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
          .set({ role: "user", updatedAt: new Date() })
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

      const [tutors] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.role, "user"));

      const [pendingTutors] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(and(eq(users.role, "user"), eq(users.approvalStatus, "pending")));

      const [approvedTutors] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(and(eq(users.role, "user"), eq(users.approvalStatus, "approved")));

      return {
        total: totalUsers.count,
        admins: admins.count,
        tutors: tutors.count,
        pendingTutors: pendingTutors.count,
        approvedTutors: approvedTutors.count,
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (input.name) updateData.name = input.name;
        if (input.phone !== undefined) updateData.phone = input.phone || null;

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
