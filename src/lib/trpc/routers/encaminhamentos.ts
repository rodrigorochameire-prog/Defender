import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db, withTransaction } from "@/lib/db";
import {
  encaminhamentos,
  encaminhamentoDestinatarios,
} from "@/lib/db/schema/cowork";
import { demandas } from "@/lib/db/schema/core";
import { eq, and, desc, inArray, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { inngest } from "@/lib/inngest/client";

const TIPO = z.enum([
  "transferir", "encaminhar", "acompanhar", "anotar", "parecer",
]);

const SINGLE_DEST_TIPOS = new Set(["transferir", "acompanhar", "parecer"]);

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

  criar: protectedProcedure
    .input(z.object({
      tipo: TIPO,
      titulo: z.string().max(200).optional(),
      mensagem: z.string().min(1),
      destinatarioIds: z.array(z.number()).min(1),
      demandaId: z.number().optional(),
      processoId: z.number().optional(),
      assistidoId: z.number().optional(),
      urgencia: z.enum(["normal", "urgente"]).default("normal"),
      notificarOmbuds: z.boolean().default(true),
      notificarWhatsapp: z.boolean().default(false),
      notificarEmail: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      if (SINGLE_DEST_TIPOS.has(input.tipo) && input.destinatarioIds.length > 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Tipo "${input.tipo}" aceita apenas 1 destinatário.`,
        });
      }

      // Transferir: apenas o dono atual da demanda pode iniciar
      if (input.tipo === "transferir") {
        if (!input.demandaId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Transferência requer demandaId." });
        }
        const [dem] = await db
          .select({ defensorId: demandas.defensorId })
          .from(demandas)
          .where(eq(demandas.id, input.demandaId))
          .limit(1);
        if (!dem) throw new TRPCError({ code: "NOT_FOUND", message: "Demanda não encontrada." });
        if (dem.defensorId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas o titular da demanda pode transferi-la.",
          });
        }
      }

      const enc = await withTransaction(async (tx) => {
        const [created] = await tx.insert(encaminhamentos).values({
          workspaceId: ctx.user.workspaceId ?? 1,
          remetenteId: ctx.user.id,
          tipo: input.tipo,
          titulo: input.titulo ?? null,
          mensagem: input.mensagem,
          demandaId: input.demandaId ?? null,
          processoId: input.processoId ?? null,
          assistidoId: input.assistidoId ?? null,
          urgencia: input.urgencia,
          notificarOmbuds: input.notificarOmbuds,
          notificarWhatsapp: input.notificarWhatsapp,
          notificarEmail: input.notificarEmail,
        }).returning();

        await tx.insert(encaminhamentoDestinatarios).values(
          input.destinatarioIds.map((uid) => ({
            encaminhamentoId: created.id,
            userId: uid,
          })),
        );

        return created;
      });

      inngest
        .send({ name: "cowork/encaminhamento.criado", data: { encaminhamentoId: enc.id } })
        .catch((e) => console.error("[encaminhamentos] inngest send falhou:", e));

      return { id: enc.id };
    }),
});
