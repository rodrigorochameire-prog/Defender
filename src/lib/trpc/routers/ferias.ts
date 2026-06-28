// src/lib/trpc/routers/ferias.ts
import { z } from "zod";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { feriasPeriodos, feriasParcelas, afastamentos, vidaFuncionalEventos, users } from "@/lib/db/schema";
import { getVidaFuncionalScope } from "../vida-funcional-scope";
import { computeSaldo, diasInclusive, type ParcelaLite } from "@/lib/ferias/saldo";
import { podeTransicionar } from "@/lib/ferias/transicoes";
import { projecaoEventoDeParcela, statusEventoDeParcela } from "@/lib/ferias/projecao";

const ISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data inválida (AAAA-MM-DD)");

/** ordem 1-indexed by dataInicio ASC (id tiebreaker) among the período's parcelas. */
function ordemDe(parcelas: { id: number; dataInicio: string }[], alvoDataInicio: string, alvoId: number): number {
  const sorted = [...parcelas].sort((a, b) =>
    a.dataInicio < b.dataInicio ? -1 : a.dataInicio > b.dataInicio ? 1 : a.id - b.id,
  );
  const idx = sorted.findIndex((p) => p.id === alvoId);
  if (idx >= 0) return idx + 1;
  // not yet inserted: position by date
  return sorted.filter((p) => p.dataInicio < alvoDataInicio).length + 1;
}

export const feriasRouter = router({
  /** Lista períodos do escopo + parcelas + saldo computado. */
  listar: protectedProcedure.query(async ({ ctx }) => {
    const scope = getVidaFuncionalScope(ctx.user);
    const periodos = await db
      .select()
      .from(feriasPeriodos)
      .where(and(isNull(feriasPeriodos.deletedAt), inArray(feriasPeriodos.defensorId, scope)))
      .orderBy(asc(feriasPeriodos.aquisitivoInicio));

    const periodoIds = periodos.map((p) => p.id);
    const parcelas = periodoIds.length
      ? await db
          .select()
          .from(feriasParcelas)
          .where(and(isNull(feriasParcelas.deletedAt), inArray(feriasParcelas.periodoId, periodoIds)))
      : [];

    const subIds = [...new Set(parcelas.map((p) => p.substitutoId).filter((x): x is number => x !== null))];
    const subRows = subIds.length
      ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, subIds))
      : [];
    const nome = new Map(subRows.map((u) => [u.id, u.name ?? `#${u.id}`]));

    return periodos.map((periodo) => {
      const ps = parcelas.filter((p) => p.periodoId === periodo.id);
      const lite: ParcelaLite[] = ps.map((p) => ({ id: p.id, dataInicio: p.dataInicio, dataFim: p.dataFim, status: p.status }));
      const ordemBase = ps.map((p) => ({ id: p.id, dataInicio: p.dataInicio }));
      return {
        periodo: {
          id: periodo.id,
          aquisitivoInicio: periodo.aquisitivoInicio,
          aquisitivoFim: periodo.aquisitivoFim,
          diasDireito: periodo.diasDireito,
          observacoes: periodo.observacoes,
        },
        saldo: computeSaldo(periodo.diasDireito, lite),
        parcelas: ps
          .map((p) => ({
            id: p.id,
            ordem: ordemDe(ordemBase, p.dataInicio, p.id),
            dataInicio: p.dataInicio,
            dataFim: p.dataFim,
            dias: diasInclusive(p.dataInicio, p.dataFim),
            status: p.status,
            substitutoId: p.substitutoId,
            substitutoNome: p.substitutoId !== null ? nome.get(p.substitutoId) ?? null : null,
            seiProtocolo: p.seiProtocolo,
            observacoes: p.observacoes,
          }))
          .sort((a, b) => a.ordem - b.ordem),
      };
    });
  }),

  criarPeriodo: protectedProcedure
    .input(z.object({
      aquisitivoInicio: ISO,
      aquisitivoFim: ISO,
      diasDireito: z.number().int().min(1).max(120).default(30),
      observacoes: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db.insert(feriasPeriodos).values({
        defensorId: ctx.user.id,
        aquisitivoInicio: input.aquisitivoInicio,
        aquisitivoFim: input.aquisitivoFim,
        diasDireito: input.diasDireito,
        observacoes: input.observacoes ?? null,
      }).returning();
      return row;
    }),

  atualizarPeriodo: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      aquisitivoInicio: ISO.optional(),
      aquisitivoFim: ISO.optional(),
      diasDireito: z.number().int().min(1).max(120).optional(),
      observacoes: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [periodo] = await db.select().from(feriasPeriodos)
        .where(and(eq(feriasPeriodos.id, input.id), isNull(feriasPeriodos.deletedAt))).limit(1);
      if (!periodo) throw new TRPCError({ code: "NOT_FOUND", message: "Período não encontrado" });
      if (periodo.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera suas férias" });

      if (input.diasDireito !== undefined && input.diasDireito < periodo.diasDireito) {
        const ps = await db.select().from(feriasParcelas)
          .where(and(eq(feriasParcelas.periodoId, periodo.id), isNull(feriasParcelas.deletedAt)));
        const lite: ParcelaLite[] = ps.map((p) => ({ id: p.id, dataInicio: p.dataInicio, dataFim: p.dataFim, status: p.status }));
        const { programados, concluidos } = computeSaldo(periodo.diasDireito, lite);
        if (programados + concluidos > input.diasDireito) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "diasDireito menor que os dias já programados/concluídos" });
        }
      }

      const { id, ...rest } = input;
      const [row] = await db.update(feriasPeriodos)
        .set({ ...rest, updatedAt: new Date() })
        .where(eq(feriasPeriodos.id, id)).returning();
      return row;
    }),

  removerPeriodo: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [periodo] = await db.select().from(feriasPeriodos)
        .where(and(eq(feriasPeriodos.id, input.id), isNull(feriasPeriodos.deletedAt))).limit(1);
      if (!periodo) throw new TRPCError({ code: "NOT_FOUND", message: "Período não encontrado" });
      if (periodo.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera suas férias" });

      return await db.transaction(async (tx) => {
        await tx.update(feriasPeriodos).set({ deletedAt: new Date() }).where(eq(feriasPeriodos.id, input.id));

        // cascade: soft-delete each parcela + deactivate afastamento + soft-delete evento
        const parcelas = await tx.select().from(feriasParcelas)
          .where(and(eq(feriasParcelas.periodoId, periodo.id), isNull(feriasParcelas.deletedAt)));
        for (const parcela of parcelas) {
          await tx.update(feriasParcelas).set({ deletedAt: new Date() }).where(eq(feriasParcelas.id, parcela.id));
          if (parcela.vidaFuncionalEventoId != null) {
            await tx.update(vidaFuncionalEventos).set({ deletedAt: new Date() }).where(eq(vidaFuncionalEventos.id, parcela.vidaFuncionalEventoId));
          }
          if (parcela.afastamentoId != null) {
            await tx.update(afastamentos).set({ ativo: false, updatedAt: new Date() }).where(eq(afastamentos.id, parcela.afastamentoId));
          }
        }
        return { ok: true };
      });
    }),

  criarParcela: protectedProcedure
    .input(z.object({
      periodoId: z.number().int(),
      dataInicio: ISO,
      dataFim: ISO,
      substitutoId: z.number().int().nullable().optional(),
      seiProtocolo: z.string().nullable().optional(),
      observacoes: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [periodo] = await db.select().from(feriasPeriodos)
        .where(and(eq(feriasPeriodos.id, input.periodoId), isNull(feriasPeriodos.deletedAt))).limit(1);
      if (!periodo) throw new TRPCError({ code: "NOT_FOUND", message: "Período não encontrado" });
      if (periodo.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera suas férias" });
      if (input.dataFim < input.dataInicio) throw new TRPCError({ code: "BAD_REQUEST", message: "dataFim anterior a dataInicio" });
      if (input.substitutoId != null && input.substitutoId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode ser seu próprio substituto" });
      }

      const novos = diasInclusive(input.dataInicio, input.dataFim);

      return await db.transaction(async (tx) => {
        // saldo guard inside the transaction (serializes check+insert, avoids TOCTOU)
        const existentes = await tx.select().from(feriasParcelas)
          .where(and(eq(feriasParcelas.periodoId, periodo.id), isNull(feriasParcelas.deletedAt)));
        const lite: ParcelaLite[] = existentes.map((p) => ({ id: p.id, dataInicio: p.dataInicio, dataFim: p.dataFim, status: p.status }));
        const saldo = computeSaldo(periodo.diasDireito, lite);
        if (saldo.disponiveis < novos) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Saldo insuficiente (${saldo.disponiveis} disponíveis, ${novos} solicitados)` });
        }

        const ordem = existentes.filter((p) => p.dataInicio < input.dataInicio).length + 1;

        let afastamentoId: number | null = null;
        if (input.substitutoId != null) {
          const [af] = await tx.insert(afastamentos).values({
            defensorId: ctx.user.id,
            substitutoId: input.substitutoId,
            dataInicio: input.dataInicio,
            dataFim: input.dataFim,
            tipo: "FERIAS",
            motivo: "Férias",
            ativo: true,
            acessoDemandas: true,
            acessoEquipe: false,
          }).returning({ id: afastamentos.id });
          afastamentoId = af.id;
        }

        const proj = projecaoEventoDeParcela(
          { id: null, dataInicio: input.dataInicio, dataFim: input.dataFim, status: "programada" },
          periodo, ordem,
        );
        const [evento] = await tx.insert(vidaFuncionalEventos).values({
          defensorId: ctx.user.id,
          tipo: proj.tipo, cluster: proj.cluster, titulo: proj.titulo,
          dataEvento: proj.dataEvento, dataFim: proj.dataFim, status: proj.status,
          origem: "manual", dados: { feriasParcelaId: null },
        }).returning({ id: vidaFuncionalEventos.id });

        const [parcela] = await tx.insert(feriasParcelas).values({
          periodoId: periodo.id,
          defensorId: ctx.user.id,
          dataInicio: input.dataInicio,
          dataFim: input.dataFim,
          status: "programada",
          substitutoId: input.substitutoId ?? null,
          afastamentoId,
          vidaFuncionalEventoId: evento.id,
          seiProtocolo: input.seiProtocolo ?? null,
          observacoes: input.observacoes ?? null,
        }).returning();

        // backfill the projection's dados with the real parcela id
        await tx.update(vidaFuncionalEventos)
          .set({ dados: { feriasParcelaId: parcela.id } })
          .where(eq(vidaFuncionalEventos.id, evento.id));

        return parcela;
      });
    }),

  atualizarParcela: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      status: z.enum(["programada", "homologada", "em_fruicao", "concluida", "cancelada"]).optional(),
      dataInicio: ISO.optional(),
      dataFim: ISO.optional(),
      seiProtocolo: z.string().nullable().optional(),
      observacoes: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [parcela] = await db.select().from(feriasParcelas)
        .where(and(eq(feriasParcelas.id, input.id), isNull(feriasParcelas.deletedAt))).limit(1);
      if (!parcela) throw new TRPCError({ code: "NOT_FOUND", message: "Parcela não encontrada" });
      if (parcela.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera suas férias" });

      if (input.status && input.status !== parcela.status && !podeTransicionar(parcela.status, input.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Transição inválida: ${parcela.status} → ${input.status}` });
      }

      const novaInicio = input.dataInicio ?? parcela.dataInicio;
      const novaFim = input.dataFim ?? parcela.dataFim;
      if (novaFim < novaInicio) throw new TRPCError({ code: "BAD_REQUEST", message: "dataFim anterior a dataInicio" });

      if (input.dataInicio || input.dataFim) {
        const [periodo] = await db.select().from(feriasPeriodos)
          .where(and(eq(feriasPeriodos.id, parcela.periodoId), isNull(feriasPeriodos.deletedAt))).limit(1);
        if (!periodo) throw new TRPCError({ code: "NOT_FOUND", message: "Período não encontrado" });
        const outras = await db.select().from(feriasParcelas)
          .where(and(eq(feriasParcelas.periodoId, parcela.periodoId), isNull(feriasParcelas.deletedAt)));
        const lite: ParcelaLite[] = outras
          .filter((p) => p.id !== parcela.id)
          .map((p) => ({ id: p.id, dataInicio: p.dataInicio, dataFim: p.dataFim, status: p.status }));
        const saldo = computeSaldo(periodo.diasDireito, lite);
        const novos = diasInclusive(novaInicio, novaFim);
        if ((input.status ?? parcela.status) !== "cancelada" && saldo.disponiveis < novos) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Saldo insuficiente para a nova janela" });
        }
      }

      const novoStatus = input.status ?? parcela.status;

      return await db.transaction(async (tx) => {
        await tx.update(feriasParcelas).set({
          status: novoStatus,
          dataInicio: novaInicio,
          dataFim: novaFim,
          seiProtocolo: input.seiProtocolo === undefined ? parcela.seiProtocolo : input.seiProtocolo,
          observacoes: input.observacoes === undefined ? parcela.observacoes : input.observacoes,
          updatedAt: new Date(),
        }).where(eq(feriasParcelas.id, parcela.id));

        // cascade: linked afastamento
        if (parcela.afastamentoId != null) {
          const ativo = novoStatus !== "cancelada" && novoStatus !== "concluida";
          await tx.update(afastamentos)
            .set({ ativo, dataInicio: novaInicio, dataFim: novaFim, updatedAt: new Date() })
            .where(eq(afastamentos.id, parcela.afastamentoId));
        }

        // cascade: linked vida_funcional evento
        if (parcela.vidaFuncionalEventoId != null) {
          if (novoStatus === "cancelada") {
            await tx.update(vidaFuncionalEventos).set({ deletedAt: new Date() })
              .where(eq(vidaFuncionalEventos.id, parcela.vidaFuncionalEventoId));
          } else {
            await tx.update(vidaFuncionalEventos).set({
              status: statusEventoDeParcela(novoStatus),
              dataEvento: novaInicio, dataFim: novaFim, updatedAt: new Date(),
            }).where(eq(vidaFuncionalEventos.id, parcela.vidaFuncionalEventoId));
          }
        }
        return { ok: true };
      });
    }),

  removerParcela: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [parcela] = await db.select().from(feriasParcelas)
        .where(and(eq(feriasParcelas.id, input.id), isNull(feriasParcelas.deletedAt))).limit(1);
      if (!parcela) throw new TRPCError({ code: "NOT_FOUND", message: "Parcela não encontrada" });
      if (parcela.defensorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o titular altera suas férias" });

      return await db.transaction(async (tx) => {
        await tx.update(feriasParcelas).set({ deletedAt: new Date() }).where(eq(feriasParcelas.id, parcela.id));
        if (parcela.vidaFuncionalEventoId != null) {
          await tx.update(vidaFuncionalEventos).set({ deletedAt: new Date() }).where(eq(vidaFuncionalEventos.id, parcela.vidaFuncionalEventoId));
        }
        if (parcela.afastamentoId != null) {
          await tx.update(afastamentos).set({ ativo: false, updatedAt: new Date() }).where(eq(afastamentos.id, parcela.afastamentoId));
        }
        return { ok: true };
      });
    }),
});
