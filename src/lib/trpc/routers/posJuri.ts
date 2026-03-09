import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import {
  recursosJuri,
  handoffConfig,
  sessoesJuri,
  processos,
  dosimetriaJuri,
} from "@/lib/db/schema";
import { eq, desc, sql, and, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const posJuriRouter = router({
  // ==========================================
  // RECURSOS (APELAÇÕES)
  // ==========================================

  // Listar todos os recursos com filtros
  listRecursos: protectedProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          ano: z.number().optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { status, ano, limit = 50, offset = 0 } = input || {};

      const conditions = [];

      if (status && status !== "all") {
        conditions.push(eq(recursosJuri.status, status as any));
      }

      const result = await db
        .select({
          id: recursosJuri.id,
          sessaoJuriId: recursosJuri.sessaoJuriId,
          processoId: recursosJuri.processoId,
          reuNome: recursosJuri.reuNome,
          status: recursosJuri.status,
          dataInterposicao: recursosJuri.dataInterposicao,
          dataAdmissao: recursosJuri.dataAdmissao,
          dataJulgamento: recursosJuri.dataJulgamento,
          turmaTJBA: recursosJuri.turmaTJBA,
          camaraTJBA: recursosJuri.camaraTJBA,
          relator: recursosJuri.relator,
          resultadoApelacao: recursosJuri.resultadoApelacao,
          houveREsp: recursosJuri.houveREsp,
          resultadoREsp: recursosJuri.resultadoREsp,
          houveRE: recursosJuri.houveRE,
          resultadoRE: recursosJuri.resultadoRE,
          observacoes: recursosJuri.observacoes,
          createdAt: recursosJuri.createdAt,
          // Dados da sessão
          dataSessao: sessoesJuri.dataSessao,
          resultadoJuri: sessoesJuri.resultado,
          // Dados do processo
          numeroAutos: processos.numeroAutos,
          comarca: processos.comarca,
          vara: processos.vara,
        })
        .from(recursosJuri)
        .leftJoin(sessoesJuri, eq(recursosJuri.sessaoJuriId, sessoesJuri.id))
        .leftJoin(processos, eq(recursosJuri.processoId, processos.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(recursosJuri.createdAt))
        .limit(limit)
        .offset(offset);

      return result;
    }),

  // Estatísticas de recursos
  statsRecursos: protectedProcedure.query(async ({ ctx }) => {

    const [stats] = await db
      .select({
        total: count(),
        ativos: sql<number>`count(*) filter (where ${recursosJuri.status} in ('interposta', 'admitida', 'em_julgamento'))`,
        aguardandoJulgamento: sql<number>`count(*) filter (where ${recursosJuri.status} = 'em_julgamento')`,
        julgados: sql<number>`count(*) filter (where ${recursosJuri.status} = 'julgada')`,
        providos: sql<number>`count(*) filter (where ${recursosJuri.resultadoApelacao} = 'provido')`,
        parcialmenteProvidos: sql<number>`count(*) filter (where ${recursosJuri.resultadoApelacao} = 'parcialmente_provido')`,
        improvidos: sql<number>`count(*) filter (where ${recursosJuri.resultadoApelacao} = 'improvido')`,
      })
      .from(recursosJuri);

    const totalJulgados = Number(stats?.providos || 0) + Number(stats?.parcialmenteProvidos || 0) + Number(stats?.improvidos || 0);
    const totalExito = Number(stats?.providos || 0) + Number(stats?.parcialmenteProvidos || 0);
    const taxaExito = totalJulgados > 0 ? Math.round((totalExito / totalJulgados) * 100) : 0;

    return {
      total: Number(stats?.total || 0),
      ativos: Number(stats?.ativos || 0),
      aguardandoJulgamento: Number(stats?.aguardandoJulgamento || 0),
      julgados: Number(stats?.julgados || 0),
      taxaExito,
    };
  }),

  // Criar recurso (apelação) a partir de uma sessão
  createRecurso: protectedProcedure
    .input(
      z.object({
        sessaoJuriId: z.number(),
        dataInterposicao: z.string().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {

      // Buscar dados da sessão para preencher automaticamente
      const [sessao] = await db
        .select({
          id: sessoesJuri.id,
          processoId: sessoesJuri.processoId,
          assistidoNome: sessoesJuri.assistidoNome,
          resultado: sessoesJuri.resultado,
          casoId: processos.casoId,
        })
        .from(sessoesJuri)
        .leftJoin(processos, eq(sessoesJuri.processoId, processos.id))
        .where(eq(sessoesJuri.id, input.sessaoJuriId));

      if (!sessao) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sessão de júri não encontrada",
        });
      }

      const [recurso] = await db
        .insert(recursosJuri)
        .values({
          sessaoJuriId: input.sessaoJuriId,
          processoId: sessao.processoId,
          casoId: sessao.casoId,
          reuNome: sessao.assistidoNome,
          status: "interposta",
          dataInterposicao: input.dataInterposicao || null,
          observacoes: input.observacoes || null,
        })
        .returning();

      return recurso;
    }),

  // Atualizar status do recurso
  updateRecurso: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z
          .enum([
            "interposta",
            "admitida",
            "em_julgamento",
            "julgada",
            "transitada",
          ])
          .optional(),
        dataAdmissao: z.string().nullable().optional(),
        dataJulgamento: z.string().nullable().optional(),
        turmaTJBA: z.string().nullable().optional(),
        camaraTJBA: z.string().nullable().optional(),
        relator: z.string().nullable().optional(),
        resultadoApelacao: z
          .enum(["provido", "parcialmente_provido", "improvido", "nao_conhecido"])
          .nullable()
          .optional(),
        houveREsp: z.boolean().optional(),
        resultadoREsp: z
          .enum(["provido", "improvido", "nao_conhecido"])
          .nullable()
          .optional(),
        houveRE: z.boolean().optional(),
        resultadoRE: z
          .enum(["provido", "improvido", "nao_conhecido"])
          .nullable()
          .optional(),
        observacoes: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {

      const { id, ...data } = input;

      const [updated] = await db
        .update(recursosJuri)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(recursosJuri.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recurso não encontrado",
        });
      }

      return updated;
    }),

  // Deletar recurso
  deleteRecurso: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {

      const [deleted] = await db
        .delete(recursosJuri)
        .where(eq(recursosJuri.id, input.id))
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recurso não encontrado",
        });
      }

      return deleted;
    }),

  // ==========================================
  // EXECUÇÃO (PROJEÇÃO + HANDOFF)
  // ==========================================

  // Buscar projeção de execução penal para uma sessão
  getProjecaoExecucao: protectedProcedure
    .input(z.object({ sessaoJuriId: z.number() }))
    .query(async ({ ctx, input }) => {

      // Buscar sessão + dosimetria
      const [sessao] = await db
        .select({
          id: sessoesJuri.id,
          dataSessao: sessoesJuri.dataSessao,
          assistidoNome: sessoesJuri.assistidoNome,
          resultado: sessoesJuri.resultado,
          processoId: sessoesJuri.processoId,
          tipoPenal: sessoesJuri.tipoPenal,
          reuPrimario: sessoesJuri.reuPrimario,
          comarca: processos.comarca,
          numeroAutos: processos.numeroAutos,
        })
        .from(sessoesJuri)
        .leftJoin(processos, eq(sessoesJuri.processoId, processos.id))
        .where(eq(sessoesJuri.id, input.sessaoJuriId));

      if (!sessao) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sessão não encontrada",
        });
      }

      // Buscar dosimetria
      const [dosimetria] = await db
        .select()
        .from(dosimetriaJuri)
        .where(eq(dosimetriaJuri.sessaoJuriId, input.sessaoJuriId));

      return {
        sessao,
        dosimetria: dosimetria || null,
      };
    }),

  // Listar sessões condenadas (para o seletor da execução)
  listSessoesCondenadas: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit || 50;

      const result = await db
        .select({
          id: sessoesJuri.id,
          dataSessao: sessoesJuri.dataSessao,
          assistidoNome: sessoesJuri.assistidoNome,
          resultado: sessoesJuri.resultado,
          processoId: sessoesJuri.processoId,
          numeroAutos: processos.numeroAutos,
          comarca: processos.comarca,
        })
        .from(sessoesJuri)
        .leftJoin(processos, eq(sessoesJuri.processoId, processos.id))
        .where(eq(sessoesJuri.resultado, "condenacao"))
        .orderBy(desc(sessoesJuri.dataSessao))
        .limit(limit);

      return result;
    }),

  // ==========================================
  // HANDOFF CONFIG
  // ==========================================

  // Buscar configuração de handoff por comarca
  getHandoffConfig: protectedProcedure
    .input(z.object({ comarca: z.string() }))
    .query(async ({ ctx, input }) => {

      const [config] = await db
        .select()
        .from(handoffConfig)
        .where(eq(handoffConfig.comarca, input.comarca));

      return config || null;
    }),

  // Criar ou atualizar configuração de handoff
  upsertHandoffConfig: protectedProcedure
    .input(
      z.object({
        comarca: z.string(),
        defensor2grauInfo: z.string().nullable().optional(),
        defensorEPInfo: z.string().nullable().optional(),
        nucleoEPEndereco: z.string().nullable().optional(),
        nucleoEPTelefone: z.string().nullable().optional(),
        nucleoEPHorario: z.string().nullable().optional(),
        mensagemPersonalizada: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {

      const { comarca, ...data } = input;

      // Tentar atualizar primeiro
      const [existing] = await db
        .select({ id: handoffConfig.id })
        .from(handoffConfig)
        .where(eq(handoffConfig.comarca, comarca));

      if (existing) {
        const [updated] = await db
          .update(handoffConfig)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(handoffConfig.comarca, comarca))
          .returning();
        return updated;
      }

      // Inserir novo
      const [created] = await db
        .insert(handoffConfig)
        .values({ comarca, ...data })
        .returning();

      return created;
    }),

  // ==========================================
  // WHATSAPP - MENSAGEM DE EXECUÇÃO
  // ==========================================

  // Gerar mensagem formatada para envio via WhatsApp
  gerarMensagemExecucao: protectedProcedure
    .input(
      z.object({
        sessaoJuriId: z.number(),
        marcos: z.array(
          z.object({
            label: z.string(),
            data: z.string(),
            fracao: z.string().optional(),
          })
        ),
        handoff: z
          .object({
            defensor2grauInfo: z.string().optional(),
            defensorEPInfo: z.string().optional(),
            nucleoEPEndereco: z.string().optional(),
            nucleoEPTelefone: z.string().optional(),
            nucleoEPHorario: z.string().optional(),
            mensagemPersonalizada: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {

      // Buscar dados da sessão
      const [sessao] = await db
        .select({
          assistidoNome: sessoesJuri.assistidoNome,
          dataSessao: sessoesJuri.dataSessao,
          numeroAutos: processos.numeroAutos,
        })
        .from(sessoesJuri)
        .leftJoin(processos, eq(sessoesJuri.processoId, processos.id))
        .where(eq(sessoesJuri.id, input.sessaoJuriId));

      if (!sessao) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sessão não encontrada",
        });
      }

      // Formatar mensagem
      const linhas: string[] = [
        `*DEFENSORIA PÚBLICA DO ESTADO DA BAHIA*`,
        `_Informações sobre Execução Penal_`,
        ``,
        `*Processo:* ${sessao.numeroAutos || "N/D"}`,
        `*Réu:* ${sessao.assistidoNome || "N/D"}`,
        ``,
        `*--- Projeção de Marcos ---*`,
      ];

      for (const marco of input.marcos) {
        const dataFormatada = new Date(marco.data).toLocaleDateString("pt-BR");
        linhas.push(
          `▸ *${marco.label}*: ${dataFormatada}${marco.fracao ? ` (${marco.fracao})` : ""}`
        );
      }

      linhas.push(``);
      linhas.push(`*--- Próximos Passos ---*`);
      linhas.push(
        `O trabalho do defensor do Tribunal do Júri se encerra com a interposição do recurso de apelação. A partir de agora:`
      );

      if (input.handoff?.defensor2grauInfo) {
        linhas.push(``);
        linhas.push(
          `*Recurso (2º Grau):* ${input.handoff.defensor2grauInfo}`
        );
      }

      if (input.handoff?.defensorEPInfo) {
        linhas.push(``);
        linhas.push(
          `*Execução Penal:* ${input.handoff.defensorEPInfo}`
        );
      }

      if (input.handoff?.nucleoEPEndereco) {
        linhas.push(``);
        linhas.push(`*Onde buscar atendimento:*`);
        linhas.push(`📍 ${input.handoff.nucleoEPEndereco}`);
        if (input.handoff.nucleoEPTelefone) {
          linhas.push(`📞 ${input.handoff.nucleoEPTelefone}`);
        }
        if (input.handoff.nucleoEPHorario) {
          linhas.push(`🕐 ${input.handoff.nucleoEPHorario}`);
        }
      }

      if (input.handoff?.mensagemPersonalizada) {
        linhas.push(``);
        linhas.push(input.handoff.mensagemPersonalizada);
      }

      linhas.push(``);
      linhas.push(`_Mensagem gerada automaticamente pelo OMBUDS_`);

      return { mensagem: linhas.join("\n") };
    }),
});
