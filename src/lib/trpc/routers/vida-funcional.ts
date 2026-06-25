import { z } from "zod";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { vidaFuncionalEventos } from "@/lib/db/schema";
import { getVidaFuncionalScope } from "../vida-funcional-scope";
import { tipoToCluster, type VfTipo } from "@/lib/vida-funcional/tipo-cluster";
import { logAudit, diffFields } from "@/lib/audit";

const TIPO_VALUES = [
  "POSSE", "PROMOCAO", "REMOCAO", "TITULARIDADE", "ACUMULO",
  "DESIGNACAO_RELEVANTE", "CONVOCACAO", "FERIAS", "LICENCA", "AFASTAMENTO", "COOPERACAO",
  "DIARIA", "FOLGA", "TRABALHO_EXTRAORDINARIO", "SUBSTITUICAO", "GRATIFICACAO", "REEMBOLSO",
  "SOLICITACAO_ADM",
] as const;

const STATUS_VALUES = ["previsto", "em_curso", "concluido", "pendente", "arquivado"] as const;

const tipoSchema = z.enum(TIPO_VALUES);
const statusSchema = z.enum(STATUS_VALUES);

const createInput = z.object({
  tipo: tipoSchema,
  titulo: z.string().min(1).max(500),
  descricao: z.string().optional(),
  dataEvento: z.string(), // ISO date (YYYY-MM-DD)
  dataFim: z.string().optional(),
  prazo: z.string().optional(),
  status: statusSchema.optional(),
  valorCents: z.number().int().optional(),
  driveFolderId: z.string().max(100).optional(),
  driveFileId: z.string().max(100).optional(),
  dados: z.record(z.string(), z.unknown()).optional(),
  defensorId: z.number().int().optional(), // só se dentro do escopo
});

export const vidaFuncionalRouter = router({
  /** Lista eventos do escopo do usuário (privado por defensor). */
  listEventos: protectedProcedure
    .input(
      z.object({
        tipo: tipoSchema.optional(),
        cluster: z.enum(["progressao", "ausencias", "contraprestacao", "administrativo"]).optional(),
        status: statusSchema.optional(),
        marcosOnly: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const scope = getVidaFuncionalScope(ctx.user);
      const conditions = [
        isNull(vidaFuncionalEventos.deletedAt),
        inArray(vidaFuncionalEventos.defensorId, scope),
      ];
      if (input?.tipo) conditions.push(eq(vidaFuncionalEventos.tipo, input.tipo));
      if (input?.cluster) conditions.push(eq(vidaFuncionalEventos.cluster, input.cluster));
      if (input?.status) conditions.push(eq(vidaFuncionalEventos.status, input.status));

      return await db
        .select()
        .from(vidaFuncionalEventos)
        .where(and(...conditions))
        .orderBy(desc(vidaFuncionalEventos.dataEvento));
    }),

  /** Busca um evento por id, respeitando o escopo. */
  getEvento: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const scope = getVidaFuncionalScope(ctx.user);
      const [row] = await db
        .select()
        .from(vidaFuncionalEventos)
        .where(and(eq(vidaFuncionalEventos.id, input.id), isNull(vidaFuncionalEventos.deletedAt)))
        .limit(1);
      if (!row || !scope.includes(row.defensorId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado" });
      }
      return row;
    }),

  /** Cria um evento. defensorId default = usuário; se informado, deve estar no escopo. */
  createEvento: protectedProcedure
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      const scope = getVidaFuncionalScope(ctx.user);
      const defensorId = input.defensorId ?? ctx.user.id;
      if (!scope.includes(defensorId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Fora do seu escopo de vida funcional" });
      }
      const cluster = tipoToCluster(input.tipo as VfTipo);
      const [created] = await db
        .insert(vidaFuncionalEventos)
        .values({
          defensorId,
          tipo: input.tipo,
          cluster,
          titulo: input.titulo,
          descricao: input.descricao,
          dataEvento: input.dataEvento,
          dataFim: input.dataFim,
          prazo: input.prazo,
          status: input.status ?? "previsto",
          valorCents: input.valorCents,
          driveFolderId: input.driveFolderId,
          driveFileId: input.driveFileId,
          origem: "manual",
          dados: input.dados ?? {},
        })
        .returning();

      await logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name,
        entityType: "vida_funcional_evento",
        entityId: created.id,
        action: "create",
        metadata: { tipo: created.tipo },
      });
      return created;
    }),

  /** Atualiza campos de um evento dentro do escopo. */
  updateEvento: protectedProcedure
    .input(
      z.object({ id: z.number().int() }).and(createInput.partial())
    )
    .mutation(async ({ ctx, input }) => {
      const scope = getVidaFuncionalScope(ctx.user);
      const { id, defensorId: _ignore, ...patch } = input;
      const [existing] = await db
        .select()
        .from(vidaFuncionalEventos)
        .where(and(eq(vidaFuncionalEventos.id, id), isNull(vidaFuncionalEventos.deletedAt)))
        .limit(1);
      if (!existing || !scope.includes(existing.defensorId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado" });
      }
      const values: Record<string, unknown> = { ...patch, updatedAt: new Date() };
      if (patch.tipo) values.cluster = tipoToCluster(patch.tipo as VfTipo);
      const [updated] = await db
        .update(vidaFuncionalEventos)
        .set(values)
        .where(eq(vidaFuncionalEventos.id, id))
        .returning();

      await logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name,
        entityType: "vida_funcional_evento",
        entityId: id,
        action: "update",
        changes: diffFields(existing as any, updated as any, ["titulo", "status", "prazo", "tipo"]) ?? undefined,
      });
      return updated;
    }),

  /** Soft-delete de um evento dentro do escopo. */
  deleteEvento: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const scope = getVidaFuncionalScope(ctx.user);
      const [existing] = await db
        .select()
        .from(vidaFuncionalEventos)
        .where(and(eq(vidaFuncionalEventos.id, input.id), isNull(vidaFuncionalEventos.deletedAt)))
        .limit(1);
      if (!existing || !scope.includes(existing.defensorId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado" });
      }
      await db
        .update(vidaFuncionalEventos)
        .set({ deletedAt: new Date() })
        .where(eq(vidaFuncionalEventos.id, input.id));

      await logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name,
        entityType: "vida_funcional_evento",
        entityId: input.id,
        action: "delete",
      });
      return { ok: true };
    }),
});
