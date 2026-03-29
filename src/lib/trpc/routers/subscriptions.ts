import { router, adminProcedure, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { subscriptions, payments, users, notifications } from "@/lib/db/schema";
import { eq, sql, and, count, desc } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

// Mapa de valores base por plano
const PLANO_VALORES: Record<string, string> = {
  essencial: "100",
  criminal: "150",
  completo: "200",
};

function calcularValorFinal(valorBase: string, descontoPercentual: number): string {
  const base = parseFloat(valorBase);
  const final = base * (1 - descontoPercentual / 100);
  return final.toFixed(2);
}

export const subscriptionsRouter = router({

  // ─── LISTAR TODAS (ADMIN) ──────────────────────────────────────
  list: adminProcedure.query(async () => {
    const result = await db
      .select({
        subscription: subscriptions,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          comarca: users.comarca,
          funcao: users.funcao,
          areasPrincipais: users.areasPrincipais,
          approvalStatus: users.approvalStatus,
        },
      })
      .from(users)
      .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
      .where(
        and(
          sql`${users.deletedAt} IS NULL`,
          eq(users.approvalStatus, "approved"),
        )
      )
      .orderBy(users.comarca, users.name);

    return result;
  }),

  // ─── MINHA ASSINATURA ──────────────────────────────────────────
  getMySubscription: protectedProcedure.query(async ({ ctx }) => {
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, ctx.user.id),
    });
    return sub ?? null;
  }),

  // ─── CRIAR OU ATUALIZAR (ADMIN) ───────────────────────────────
  createOrUpdate: adminProcedure
    .input(z.object({
      userId: z.number(),
      plano: z.enum(["essencial", "criminal", "completo"]),
      descontoPercentual: z.number().min(0).max(100).default(0),
      status: z.enum(["ativo", "pendente", "vencido", "cancelado", "isento"]).default("pendente"),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const valorBase = PLANO_VALORES[input.plano];
      const valorFinal = calcularValorFinal(valorBase, input.descontoPercentual);

      const existing = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, input.userId),
      });

      const planLabels: Record<string, string> = { essencial: "Essencial", criminal: "Criminal", completo: "Completo" };

      if (existing) {
        const [updated] = await db
          .update(subscriptions)
          .set({
            plano: input.plano,
            valorBase,
            descontoPercentual: input.descontoPercentual,
            valorFinal,
            status: input.status,
            observacoes: input.observacoes,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.userId, input.userId))
          .returning();

        // Notify the defensor
        await db.insert(notifications).values({
          userId: input.userId,
          type: "info",
          title: "Plano atribuído",
          message: `Seu plano foi definido como ${planLabels[input.plano] || input.plano} — R$ ${valorFinal}/mês.`,
          actionUrl: "/admin/minha-assinatura",
        });

        return updated;
      }

      const [created] = await db
        .insert(subscriptions)
        .values({
          userId: input.userId,
          plano: input.plano,
          valorBase,
          descontoPercentual: input.descontoPercentual,
          valorFinal,
          status: input.status,
          observacoes: input.observacoes,
          dataInicio: new Date().toISOString().split("T")[0],
        })
        .returning();

      // Notify the defensor
      await db.insert(notifications).values({
        userId: input.userId,
        type: "info",
        title: "Plano atribuído",
        message: `Seu plano foi definido como ${planLabels[input.plano] || input.plano} — R$ ${valorFinal}/mês.`,
        actionUrl: "/admin/minha-assinatura",
      });

      return created;
    }),

  // ─── DESCONTO RÁPIDO (ADMIN) ──────────────────────────────────
  setDesconto: adminProcedure
    .input(z.object({
      userId: z.number(),
      descontoPercentual: z.number().min(0).max(100),
    }))
    .mutation(async ({ input }) => {
      const existing = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, input.userId),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assinatura nao encontrada para este usuario",
        });
      }

      const valorFinal = calcularValorFinal(existing.valorBase, input.descontoPercentual);

      const [updated] = await db
        .update(subscriptions)
        .set({
          descontoPercentual: input.descontoPercentual,
          valorFinal,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.userId, input.userId))
        .returning();
      return updated;
    }),

  // ─── CONFIRMAR PAGAMENTO MANUAL (ADMIN) ────────────────────────
  confirmPayment: adminProcedure
    .input(z.object({
      userId: z.number(),
      referenciaMes: z.string().optional(), // "2026-04"
    }))
    .mutation(async ({ input }) => {
      const existing = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, input.userId),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assinatura nao encontrada para este usuario",
        });
      }

      const now = new Date();
      const vencimento = new Date(now);
      vencimento.setDate(vencimento.getDate() + 30);

      // Atualizar assinatura
      await db
        .update(subscriptions)
        .set({
          status: "ativo",
          dataUltimoPagamento: now.toISOString().split("T")[0],
          dataVencimento: vencimento.toISOString().split("T")[0],
          updatedAt: now,
        })
        .where(eq(subscriptions.userId, input.userId));

      // Registrar pagamento
      const referencia = input.referenciaMes ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const [payment] = await db
        .insert(payments)
        .values({
          subscriptionId: existing.id,
          userId: input.userId,
          valor: existing.valorFinal,
          status: "confirmado",
          metodo: "pix",
          referenciaMes: referencia,
          dataPagamento: now,
          dataVencimento: vencimento.toISOString().split("T")[0],
        })
        .returning();

      return payment;
    }),

  // ─── DEFENSOR REPORTA PAGAMENTO ─────────────────────────────────
  reportPayment: protectedProcedure
    .input(z.object({
      nota: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sub = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, ctx.user.id),
      });
      if (!sub) throw new TRPCError({ code: "NOT_FOUND", message: "Assinatura não encontrada" });

      const now = new Date();
      const refMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const [payment] = await db.insert(payments).values({
        subscriptionId: sub.id,
        userId: ctx.user.id,
        valor: sub.valorFinal,
        status: "aguardando_confirmacao",
        metodo: "pix",
        referenciaMes: refMes,
        dataVencimento: sub.dataVencimento,
        nota: input.nota || null,
      }).returning();

      // Notify admin (id=1) via in-app notification
      await db.insert(notifications).values({
        userId: 1,
        type: "info",
        title: "Pagamento reportado",
        message: `${ctx.user.name} reportou pagamento de R$ ${sub.valorFinal} (${sub.plano}).`,
        actionUrl: "/admin/assinaturas",
      });

      // WhatsApp notification to admin (best-effort)
      try {
        const { WhatsAppService } = await import("@/lib/services/whatsapp");
        const whatsapp = WhatsAppService.fromEnv();
        await whatsapp?.sendText(
          "5584994113298",
          `💰 *Pagamento reportado*\n\n${ctx.user.name} reportou pagamento de R$ ${sub.valorFinal} (plano ${sub.plano}).\n\nConfirme em: ombuds.vercel.app/admin/assinaturas`
        );
      } catch (e) {
        console.log("WhatsApp notification skipped:", (e as Error).message);
      }

      return payment;
    }),

  // ─── HISTORICO DE PAGAMENTOS DO DEFENSOR ───────────────────────
  myPayments: protectedProcedure.query(async ({ ctx }) => {
    return db.query.payments.findMany({
      where: eq(payments.userId, ctx.user.id),
      orderBy: desc(payments.createdAt),
    });
  }),

  // ─── ADMIN CONFIRMA PAGAMENTO POR ID ──────────────────────────
  confirmPaymentById: adminProcedure
    .input(z.object({ paymentId: z.number() }))
    .mutation(async ({ input }) => {
      const [payment] = await db.update(payments)
        .set({ status: "confirmado", dataPagamento: new Date() })
        .where(eq(payments.id, input.paymentId))
        .returning();

      if (payment) {
        const nextVencimento = new Date();
        nextVencimento.setDate(nextVencimento.getDate() + 30);

        await db.update(subscriptions).set({
          status: "ativo",
          dataUltimoPagamento: new Date().toISOString().split("T")[0],
          dataVencimento: nextVencimento.toISOString().split("T")[0],
          updatedAt: new Date(),
        }).where(eq(subscriptions.id, payment.subscriptionId));

        // Notify the defensor
        await db.insert(notifications).values({
          userId: payment.userId,
          type: "success",
          title: "Pagamento confirmado",
          message: `Seu pagamento de R$ ${payment.valor} foi confirmado. Assinatura ativa até ${nextVencimento.toLocaleDateString("pt-BR")}.`,
          actionUrl: "/admin/minha-assinatura",
        });
      }

      return payment;
    }),

  // ─── ADMIN REJEITA PAGAMENTO POR ID ───────────────────────────
  rejectPaymentById: adminProcedure
    .input(z.object({ paymentId: z.number() }))
    .mutation(async ({ input }) => {
      const [payment] = await db.update(payments)
        .set({ status: "rejeitado" })
        .where(eq(payments.id, input.paymentId))
        .returning();
      return payment;
    }),

  // ─── PAGAMENTOS AGUARDANDO CONFIRMACAO (ADMIN) ────────────────
  pendingPayments: adminProcedure.query(async () => {
    const result = await db
      .select({
        payment: payments,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          comarca: users.comarca,
        },
      })
      .from(payments)
      .innerJoin(users, eq(payments.userId, users.id))
      .where(eq(payments.status, "aguardando_confirmacao"))
      .orderBy(desc(payments.createdAt));

    return result;
  }),

  // ─── ESTATÍSTICAS (ADMIN) ──────────────────────────────────────
  stats: adminProcedure.query(async () => {
    const rows = await db.execute(sql`
      SELECT
        COALESCE(s.plano, 'sem_plano') as plano,
        COALESCE(s.status, 'sem_plano') as status,
        COUNT(*)::int as total,
        COALESCE(SUM(CASE WHEN s.status = 'ativo' THEN s.valor_final::numeric ELSE 0 END), 0)::numeric as mrr
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id
      WHERE u.deleted_at IS NULL
        AND u.approval_status = 'approved'
        AND u.role IN ('defensor', 'admin')
      GROUP BY COALESCE(s.plano, 'sem_plano'), COALESCE(s.status, 'sem_plano')
    `);

    type StatsRow = { plano: string; status: string; total: number; mrr: number };
    const stats = rows as unknown as StatsRow[];

    let totalMRR = 0;
    let ativos = 0;
    let pendentes = 0;
    let vencidos = 0;
    let isentos = 0;
    let semPlano = 0;
    const porPlano: Record<string, number> = { essencial: 0, criminal: 0, completo: 0 };

    for (const row of stats) {
      totalMRR += Number(row.mrr) || 0;
      const count = Number(row.total) || 0;

      if (row.status === "ativo") ativos += count;
      else if (row.status === "pendente") pendentes += count;
      else if (row.status === "vencido") vencidos += count;
      else if (row.status === "isento") isentos += count;
      else if (row.status === "sem_plano") semPlano += count;

      if (row.plano in porPlano && row.status === "ativo") {
        porPlano[row.plano] += count;
      }
    }

    return {
      totalMRR,
      ativos,
      pendentes,
      vencidos,
      isentos,
      semPlano,
      porPlano,
    };
  }),
});
