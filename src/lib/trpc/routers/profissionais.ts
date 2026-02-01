import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { profissionais, escalasAtribuicao, compartilhamentos } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const profissionaisRouter = router({
  // Listar todos os profissionais
  list: protectedProcedure.query(async () => {
    const result = await db
      .select()
      .from(profissionais)
      .where(eq(profissionais.ativo, true))
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
  getEscalaAtual: protectedProcedure.query(async () => {
    const now = new Date();
    const mesAtual = now.getMonth() + 1;
    const anoAtual = now.getFullYear();

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
          eq(escalasAtribuicao.ativo, true)
        )
      );

    return escalas;
  }),

  // Definir escala de atribuição
  setEscala: protectedProcedure
    .input(z.object({
      profissionalId: z.number(),
      atribuicao: z.enum(["JURI_EP", "VVD"]),
      mes: z.number().min(1).max(12),
      ano: z.number().min(2024).max(2030),
    }))
    .mutation(async ({ input }) => {
      // Verificar se já existe escala para este profissional neste mês
      const [existente] = await db
        .select()
        .from(escalasAtribuicao)
        .where(
          and(
            eq(escalasAtribuicao.profissionalId, input.profissionalId),
            eq(escalasAtribuicao.mes, input.mes),
            eq(escalasAtribuicao.ano, input.ano)
          )
        );

      if (existente) {
        // Atualizar
        await db
          .update(escalasAtribuicao)
          .set({ atribuicao: input.atribuicao })
          .where(eq(escalasAtribuicao.id, existente.id));
      } else {
        // Criar nova
        await db.insert(escalasAtribuicao).values({
          profissionalId: input.profissionalId,
          atribuicao: input.atribuicao,
          mes: input.mes,
          ano: input.ano,
        });
      }

      return { success: true };
    }),

  // Criar compartilhamento
  compartilhar: protectedProcedure
    .input(z.object({
      entidadeTipo: z.enum(["demanda", "audiencia", "processo", "caso"]),
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
