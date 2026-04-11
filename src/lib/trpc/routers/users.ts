import { z } from "zod";
import crypto from "crypto";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, users, processos, assistidos, userInvitations, comarcas } from "@/lib/db";
import { TRPCError } from "@trpc/server";
import { eq, desc, sql, and, ne, ilike, or, type SQL } from "drizzle-orm";
import { getWorkspaceScope } from "../workspace";
import { Errors, safeAsync } from "@/lib/errors";
import { idSchema, emailSchema, nameSchema, phoneSchema } from "@/lib/validations";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export const usersRouter = router({
  /**
   * Busca dados do usuário logado
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    return safeAsync(async () => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.user!.id),
      });

      if (!user) {
        throw Errors.notFound("Usuário");
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        oab: user.oab,
        comarca: user.comarca,
        emailVerified: user.emailVerified,
        approvalStatus: user.approvalStatus,
        areasPrincipais: user.areasPrincipais ?? null,
      };
    }, "Erro ao buscar dados do usuário");
  }),

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
        // Build SQL conditions to filter at database level
        const conditions: ReturnType<typeof eq>[] = [];

        if (input?.role) {
          conditions.push(eq(users.role, input.role));
        }

        if (input?.search) {
          conditions.push(
            or(
              ilike(users.name, `%${input.search}%`),
              ilike(users.email, `%${input.search}%`),
              ilike(users.phone || "", `%${input.search}%`),
              ilike(users.oab || "", `%${input.search}%`),
            )!
          );
        }

        return db
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
            funcao: users.funcao,
            inviteToken: users.inviteToken,
            mustChangePassword: users.mustChangePassword,
            areasPrincipais: users.areasPrincipais,
            comarcaId: users.comarcaId,
            expiresAt: users.expiresAt,
          })
          .from(users)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(users.createdAt));
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
        // Build SQL conditions to filter at database level
        const conditions: ReturnType<typeof eq>[] = [eq(users.role, "defensor")];

        if (input?.approvalStatus) {
          conditions.push(eq(users.approvalStatus, input.approvalStatus));
        }

        if (input?.search) {
          conditions.push(
            or(
              ilike(users.name, `%${input.search}%`),
              ilike(users.email, `%${input.search}%`),
              ilike(users.oab || "", `%${input.search}%`),
            )!
          );
        }

        const result = await db
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
          .where(and(...conditions))
          .orderBy(desc(users.createdAt));

        if (result.length === 0) return [];

        // Batch aggregate queries instead of N+1
        const defensorIds = result.map(d => d.id);

        const [processoCounts, assistidoCounts] = await Promise.all([
          db
            .select({
              defensorId: processos.defensorId,
              count: sql<number>`count(*)::int`,
            })
            .from(processos)
            .where(sql`${processos.defensorId} IN (${sql.join(defensorIds.map(id => sql`${id}`), sql`, `)})`)
            .groupBy(processos.defensorId),
          db
            .select({
              defensorId: assistidos.defensorId,
              count: sql<number>`count(*)::int`,
            })
            .from(assistidos)
            .where(sql`${assistidos.defensorId} IN (${sql.join(defensorIds.map(id => sql`${id}`), sql`, `)})`)
            .groupBy(assistidos.defensorId),
        ]);

        const processoMap = new Map(processoCounts.map(p => [p.defensorId, p.count]));
        const assistidoMap = new Map(assistidoCounts.map(a => [a.defensorId, a.count]));

        return result.map(defensor => ({
          ...defensor,
          processoCount: processoMap.get(defensor.id) ?? 0,
          assistidoCount: assistidoMap.get(defensor.id) ?? 0,
        }));
      }, "Erro ao listar defensores");
    }),

  /**
   * Lista defensores do workspace (para o DefensorSwitcher)
   */
  workspaceDefensores: protectedProcedure.query(async ({ ctx }) => {
    const { workspaceId } = getWorkspaceScope(ctx.user);
    const conditions: (SQL<unknown> | undefined)[] = [
      or(eq(users.role, "defensor"), eq(users.role, "admin")),
      eq(users.approvalStatus, "approved"),
    ];
    if (workspaceId) {
      conditions.push(eq(users.workspaceId, workspaceId));
    }
    return db
      .select({
        id: users.id,
        name: users.name,
        comarcaId: users.comarcaId,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(users.name);
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
        oab: z.string().optional(),
        comarca: z.string().optional(),
        role: z.enum(["admin", "defensor", "estagiario", "servidor"]).optional(),
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
   * Redefinir senha de um membro (admin)
   * Permite que admin defina nova senha para qualquer usuário
   */
  resetPassword: adminProcedure
    .input(
      z.object({
        userId: idSchema,
        newPassword: z.string().min(6, "Nova senha deve ter no mínimo 6 caracteres"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const targetUser = await db.query.users.findFirst({
          where: eq(users.id, input.userId),
        });

        if (!targetUser) {
          throw Errors.notFound("Usuário");
        }

        const passwordHash = await hashPassword(input.newPassword);

        await db
          .update(users)
          .set({ passwordHash, updatedAt: new Date() })
          .where(eq(users.id, input.userId));

        return { success: true, userName: targetUser.name };
      }, "Erro ao redefinir senha");
    }),

  // ==========================================
  // CONVITES
  // ==========================================

  /**
   * Gera convite para novo defensor
   */
  invite: adminProcedure
    .input(
      z.object({
        nome: z.string().min(2),
        email: z.string().email(),
        nucleo: z.string().optional(),
        funcao: z.string().default("defensor_titular"),
        oab: z.string().optional(),
        comarcaId: z.number().int().positive(),
        podeVerTodosAssistidos: z.boolean().default(true),
        podeVerTodosProcessos: z.boolean().default(true),
        mensagemPersonalizada: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        // Verificar se email já está cadastrado
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, input.email.toLowerCase().trim()),
        });

        if (existingUser) {
          throw Errors.conflict("Este email já possui uma conta no sistema");
        }

        // Verificar se já existe convite pendente para este email
        const existingInvite = await db.query.userInvitations.findFirst({
          where: and(
            eq(userInvitations.email, input.email.toLowerCase().trim()),
            eq(userInvitations.status, "pending")
          ),
        });

        if (existingInvite) {
          throw Errors.conflict("Já existe um convite pendente para este email");
        }

        // Gerar token seguro
        const token = crypto.randomBytes(32).toString("hex");

        // Convite expira em 7 dias
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const [invitation] = await db
          .insert(userInvitations)
          .values({
            email: input.email.toLowerCase().trim(),
            nome: input.nome.trim(),
            token,
            nucleo: input.nucleo || null,
            funcao: input.funcao,
            oab: input.oab || null,
            comarcaId: input.comarcaId,
            podeVerTodosAssistidos: input.podeVerTodosAssistidos,
            podeVerTodosProcessos: input.podeVerTodosProcessos,
            mensagem: input.mensagemPersonalizada || null,
            invitedById: ctx.user!.id,
            status: "pending",
            expiresAt,
          })
          .returning();

        return {
          id: invitation.id,
          token: invitation.token,
          email: invitation.email,
          nome: invitation.nome,
          expiresAt: invitation.expiresAt,
        };
      }, "Erro ao gerar convite");
    }),

  /**
   * Lista todos os convites
   */
  listInvitations: adminProcedure.query(async () => {
    return safeAsync(async () => {
      const invitations = await db
        .select({
          id: userInvitations.id,
          email: userInvitations.email,
          nome: userInvitations.nome,
          nucleo: userInvitations.nucleo,
          funcao: userInvitations.funcao,
          status: userInvitations.status,
          expiresAt: userInvitations.expiresAt,
          acceptedAt: userInvitations.acceptedAt,
          createdAt: userInvitations.createdAt,
          invitedByName: users.name,
        })
        .from(userInvitations)
        .leftJoin(users, eq(userInvitations.invitedById, users.id))
        .orderBy(desc(userInvitations.createdAt));

      return invitations;
    }, "Erro ao listar convites");
  }),

  /**
   * Revoga um convite pendente
   */
  revokeInvitation: adminProcedure
    .input(z.object({ id: idSchema }))
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        const [updated] = await db
          .update(userInvitations)
          .set({ status: "revoked" })
          .where(and(
            eq(userInvitations.id, input.id),
            eq(userInvitations.status, "pending")
          ))
          .returning();

        if (!updated) {
          throw Errors.notFound("Convite pendente");
        }

        return { success: true };
      }, "Erro ao revogar convite");
    }),

  /**
   * Valida um token de convite (público, sem autenticação)
   */
  validateInvitation: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const invitation = await db.query.userInvitations.findFirst({
          where: and(
            eq(userInvitations.token, input.token),
            eq(userInvitations.status, "pending")
          ),
        });

        if (!invitation) {
          return { valid: false, reason: "Convite não encontrado ou já utilizado" };
        }

        if (new Date() > invitation.expiresAt) {
          // Marcar como expirado
          await db
            .update(userInvitations)
            .set({ status: "expired" })
            .where(eq(userInvitations.id, invitation.id));

          return { valid: false, reason: "Convite expirado" };
        }

        return {
          valid: true,
          email: invitation.email,
          nome: invitation.nome,
          nucleo: invitation.nucleo,
          funcao: invitation.funcao,
        };
      }, "Erro ao validar convite");
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

  /**
   * Gera link de demonstração (trial 7 dias) para um colega
   */
  generateDemoLink: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        comarca: z.string().min(1),
        areasPrincipais: z.array(z.string()),
        diasValidade: z.number().default(7),
      })
    )
    .mutation(async ({ input }) => {
      return safeAsync(async () => {
        // Buscar comarca pelo nome
        const comarca = await db.query.comarcas.findFirst({
          where: eq(comarcas.nome, input.comarca),
        });

        if (!comarca) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Comarca não encontrada" });
        }

        // Gerar token seguro
        const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

        // Calcular expiração
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + input.diasValidade);

        // Criar usuário demo
        const [user] = await db
          .insert(users)
          .values({
            name: input.name,
            email: `demo.${Date.now()}@temp.ombuds.app`,
            role: "defensor",
            comarcaId: comarca.id,
            approvalStatus: "approved",
            emailVerified: false,
            mustChangePassword: true,
            inviteToken: token,
            areasPrincipais: input.areasPrincipais,
            expiresAt,
            podeVerTodosAssistidos: false,
            podeVerTodosProcessos: false,
          })
          .returning();

        return {
          userId: user.id,
          token,
          link: `https://ombuds.vercel.app/convite/${token}`,
          expiresAt: expiresAt.toISOString(),
        };
      }, "Erro ao gerar link de demonstração");
    }),
});
