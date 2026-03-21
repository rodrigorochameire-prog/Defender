import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { profissionais, escalasAtribuicao, compartilhamentos } from "@/lib/db/schema";
import { eq, and, desc, sql, gte, lte, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getComarcaId } from "../comarca-scope";

export const profissionaisRouter = router({
  // Listar todos os profissionais
  list: protectedProcedure.query(async ({ ctx }) => {
    const comarcaId = getComarcaId(ctx.user);
    const result = await db
      .select()
      .from(profissionais)
      .where(
        and(
          eq(profissionais.ativo, true),
          eq(profissionais.comarcaId, comarcaId)
        )
      )
      .orderBy(profissionais.id);

    return result;
  }),

  // Buscar profissional por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [profissional] = await db
        .select()
        .from(profissionais)
        .where(eq(profissionais.id, input.id));
      
      return profissional || null;
    }),

  // Buscar escala atual (mês/ano corrente)
  getEscalaAtual: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const mesAtual = now.getMonth() + 1;
    const anoAtual = now.getFullYear();
    const comarcaId = getComarcaId(ctx.user);

    const escalas = await db
      .select({
        profissionalId: escalasAtribuicao.profissionalId,
        atribuicao: escalasAtribuicao.atribuicao,
        profissional: {
          id: profissionais.id,
          nome: profissionais.nome,
          nomeCurto: profissionais.nomeCurto,
          cor: profissionais.cor,
        },
      })
      .from(escalasAtribuicao)
      .leftJoin(profissionais, eq(escalasAtribuicao.profissionalId, profissionais.id))
      .where(
        and(
          eq(escalasAtribuicao.mes, mesAtual),
          eq(escalasAtribuicao.ano, anoAtual),
          eq(escalasAtribuicao.ativo, true),
          eq(escalasAtribuicao.comarcaId, comarcaId)
        )
      );

    return escalas;
  }),

  // Buscar escalas por período (múltiplos meses)
  getEscalaPorPeriodo: protectedProcedure
    .input(z.object({
      mesInicio: z.number().min(1).max(12),
      anoInicio: z.number(),
      mesFim: z.number().min(1).max(12),
      anoFim: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      // Converter para comparação numérica: ano*100+mes (ex: 202603)
      const inicio = input.anoInicio * 100 + input.mesInicio;
      const fim = input.anoFim * 100 + input.mesFim;
      const comarcaId = getComarcaId(ctx.user);

      const escalas = await db
        .select({
          id: escalasAtribuicao.id,
          profissionalId: escalasAtribuicao.profissionalId,
          atribuicao: escalasAtribuicao.atribuicao,
          mes: escalasAtribuicao.mes,
          ano: escalasAtribuicao.ano,
          profissional: {
            id: profissionais.id,
            nome: profissionais.nome,
            nomeCurto: profissionais.nomeCurto,
            cor: profissionais.cor,
          },
        })
        .from(escalasAtribuicao)
        .leftJoin(profissionais, eq(escalasAtribuicao.profissionalId, profissionais.id))
        .where(
          and(
            eq(escalasAtribuicao.ativo, true),
            eq(escalasAtribuicao.comarcaId, comarcaId),
            gte(sql`${escalasAtribuicao.ano} * 100 + ${escalasAtribuicao.mes}`, inicio),
            lte(sql`${escalasAtribuicao.ano} * 100 + ${escalasAtribuicao.mes}`, fim)
          )
        );

      return escalas;
    }),

  // Definir escala de atribuição (individual)
  setEscala: protectedProcedure
    .input(z.object({
      profissionalId: z.number(),
      atribuicao: z.string().min(1),
      mes: z.number().min(1).max(12),
      ano: z.number().min(2024).max(2030),
    }))
    .mutation(async ({ input, ctx }) => {
      const comarcaId = getComarcaId(ctx.user);

      const [existente] = await db
        .select()
        .from(escalasAtribuicao)
        .where(
          and(
            eq(escalasAtribuicao.profissionalId, input.profissionalId),
            eq(escalasAtribuicao.atribuicao, input.atribuicao),
            eq(escalasAtribuicao.mes, input.mes),
            eq(escalasAtribuicao.ano, input.ano),
            eq(escalasAtribuicao.comarcaId, comarcaId)
          )
        );

      if (existente) {
        await db
          .update(escalasAtribuicao)
          .set({ atribuicao: input.atribuicao })
          .where(eq(escalasAtribuicao.id, existente.id));
      } else {
        await db.insert(escalasAtribuicao).values({
          profissionalId: input.profissionalId,
          atribuicao: input.atribuicao,
          mes: input.mes,
          ano: input.ano,
          comarcaId,
        });
      }

      return { success: true };
    }),

  // Definir escalas em batch (múltiplos meses/atribuições de uma vez)
  setEscalaBatch: protectedProcedure
    .input(z.object({
      escalas: z.array(z.object({
        profissionalId: z.number(),
        atribuicao: z.string().min(1),
        mes: z.number().min(1).max(12),
        ano: z.number().min(2024).max(2030),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const comarcaId = getComarcaId(ctx.user);

      // Deletar escalas existentes para os meses no range e reinserir
      // CRITICAL: scope DELETE por comarca para não apagar dados de outras comarcas
      const mesesAnos = [...new Set(input.escalas.map(e => `${e.ano}-${e.mes}`))];

      for (const ma of mesesAnos) {
        const [ano, mes] = ma.split("-").map(Number);
        await db
          .delete(escalasAtribuicao)
          .where(
            and(
              eq(escalasAtribuicao.mes, mes),
              eq(escalasAtribuicao.ano, ano),
              eq(escalasAtribuicao.comarcaId, comarcaId)
            )
          );
      }

      // Inserir todas de uma vez, carimbando a comarca
      if (input.escalas.length > 0) {
        await db.insert(escalasAtribuicao).values(
          input.escalas.map(e => ({
            profissionalId: e.profissionalId,
            atribuicao: e.atribuicao,
            mes: e.mes,
            ano: e.ano,
            comarcaId,
          }))
        );
      }

      return { success: true, count: input.escalas.length };
    }),

  // Criar compartilhamento
  compartilhar: protectedProcedure
    .input(z.object({
      entidadeTipo: z.enum(["demanda", "audiencia", "processo", "caso", "evento"]),
      entidadeId: z.number(),
      compartilhadoPorId: z.number(),
      compartilhadoComId: z.number(),
      motivo: z.string().optional(),
      dataFim: z.string().optional(), // ISO date string
    }))
    .mutation(async ({ input }) => {
      // Inserir compartilhamento
      await db.insert(compartilhamentos).values({
        entidadeTipo: input.entidadeTipo,
        entidadeId: input.entidadeId,
        compartilhadoPorId: input.compartilhadoPorId,
        compartilhadoComId: input.compartilhadoComId,
        motivo: input.motivo,
        dataFim: input.dataFim ? new Date(input.dataFim) : null,
      });

      // Buscar nome do profissional que compartilhou
      const [profissionalOrigem] = await db
        .select({ nomeCurto: profissionais.nomeCurto })
        .from(profissionais)
        .where(eq(profissionais.id, input.compartilhadoPorId));

      // Buscar user_id do profissional destino
      const [profissionalDestino] = await db
        .select({ userId: profissionais.userId })
        .from(profissionais)
        .where(eq(profissionais.id, input.compartilhadoComId));

      // Criar notificação se tiver user_id
      if (profissionalDestino?.userId) {
        const tipoLabel = {
          demanda: "demanda",
          audiencia: "audiência",
          processo: "processo",
          caso: "caso",
          evento: "evento da agenda",
        }[input.entidadeTipo];

        // Importar notifications table
        const { notifications } = await import("@/lib/db/schema");
        
        await db.insert(notifications).values({
          userId: profissionalDestino.userId,
          type: "info",
          title: `Nova ${tipoLabel} compartilhada`,
          message: `${profissionalOrigem?.nomeCurto || "Um colega"} compartilhou uma ${tipoLabel} com você${input.motivo ? `: ${input.motivo}` : ""}`,
          actionUrl: `/${input.entidadeTipo}s/${input.entidadeId}`,
        });
      }

      return { success: true };
    }),

  // Listar compartilhamentos de um profissional
  getCompartilhamentos: protectedProcedure
    .input(z.object({ profissionalId: z.number() }))
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(compartilhamentos)
        .where(
          and(
            eq(compartilhamentos.compartilhadoComId, input.profissionalId),
            eq(compartilhamentos.ativo, true)
          )
        );

      return result;
    }),

  // Remover compartilhamento
  removerCompartilhamento: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db
        .update(compartilhamentos)
        .set({ ativo: false })
        .where(eq(compartilhamentos.id, input.id));

      return { success: true };
    }),
});
