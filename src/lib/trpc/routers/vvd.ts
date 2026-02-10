import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import {
  partesVVD,
  processosVVD,
  intimacoesVVD,
  historicoMPU,
  demandas,
  processos,
  assistidos,
} from "@/lib/db/schema";
import { eq, and, desc, asc, sql, isNull, or, ilike, gte, lte } from "drizzle-orm";

// ==========================================
// ROUTER VVD - VIOLÊNCIA DOMÉSTICA / MPU
// ==========================================

export const vvdRouter = router({
  // ==========================================
  // PARTES VVD (Autores e Vítimas)
  // ==========================================

  listPartes: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        tipoParte: z.enum(["autor", "vitima", "todos"]).optional().default("todos"),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const conditions = [isNull(partesVVD.deletedAt)];

      if (input.tipoParte !== "todos") {
        conditions.push(eq(partesVVD.tipoParte, input.tipoParte));
      }

      if (input.search) {
        conditions.push(
          or(
            ilike(partesVVD.nome, `%${input.search}%`),
            ilike(partesVVD.cpf, `%${input.search}%`)
          )!
        );
      }

      const partes = await db
        .select()
        .from(partesVVD)
        .where(and(...conditions))
        .orderBy(desc(partesVVD.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const total = await db
        .select({ count: sql<number>`count(*)` })
        .from(partesVVD)
        .where(and(...conditions));

      return {
        partes,
        total: total[0]?.count || 0,
      };
    }),

  createParte: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(1),
        cpf: z.string().optional(),
        rg: z.string().optional(),
        dataNascimento: z.string().optional(),
        tipoParte: z.enum(["autor", "vitima"]),
        telefone: z.string().optional(),
        telefoneSecundario: z.string().optional(),
        email: z.string().optional(),
        endereco: z.string().optional(),
        bairro: z.string().optional(),
        cidade: z.string().optional(),
        parentesco: z.string().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [parte] = await db
        .insert(partesVVD)
        .values({
          ...input,
          dataNascimento: input.dataNascimento || null,
          defensorId: ctx.user.id,
        })
        .returning();

      return parte;
    }),

  // ==========================================
  // PROCESSOS VVD
  // ==========================================

  listProcessos: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        mpuAtiva: z.boolean().optional(),
        mpuProximaVencer: z.boolean().optional(), // MPUs vencendo em 30 dias
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const conditions = [isNull(processosVVD.deletedAt)];

      if (input.mpuAtiva !== undefined) {
        conditions.push(eq(processosVVD.mpuAtiva, input.mpuAtiva));
      }

      if (input.mpuProximaVencer) {
        const hoje = new Date();
        const em30Dias = new Date();
        em30Dias.setDate(em30Dias.getDate() + 30);

        conditions.push(
          and(
            eq(processosVVD.mpuAtiva, true),
            gte(processosVVD.dataVencimentoMPU, hoje.toISOString().split("T")[0]),
            lte(processosVVD.dataVencimentoMPU, em30Dias.toISOString().split("T")[0])
          )!
        );
      }

      if (input.search) {
        conditions.push(
          or(
            ilike(processosVVD.numeroAutos, `%${input.search}%`),
            ilike(processosVVD.crime, `%${input.search}%`)
          )!
        );
      }

      const processosList = await db
        .select({
          processo: processosVVD,
          autor: partesVVD,
        })
        .from(processosVVD)
        .leftJoin(partesVVD, eq(processosVVD.autorId, partesVVD.id))
        .where(and(...conditions))
        .orderBy(
          // Ordenar por vencimento próximo primeiro
          asc(processosVVD.dataVencimentoMPU),
          desc(processosVVD.createdAt)
        )
        .limit(input.limit)
        .offset(input.offset);

      const total = await db
        .select({ count: sql<number>`count(*)` })
        .from(processosVVD)
        .where(and(...conditions));

      return {
        processos: processosList.map((p) => ({
          ...p.processo,
          autor: p.autor,
        })),
        total: total[0]?.count || 0,
      };
    }),

  getProcessoById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [processo] = await db
        .select({
          processo: processosVVD,
          autor: partesVVD,
        })
        .from(processosVVD)
        .leftJoin(partesVVD, eq(processosVVD.autorId, partesVVD.id))
        .where(eq(processosVVD.id, input.id));

      if (!processo) return null;

      // Buscar vítima separadamente
      let vitima = null;
      if (processo.processo.vitimaId) {
        const [v] = await db
          .select()
          .from(partesVVD)
          .where(eq(partesVVD.id, processo.processo.vitimaId));
        vitima = v;
      }

      // Buscar intimações - ordenar por data de expedição (mais recentes primeiro)
      const intimacoes = await db
        .select()
        .from(intimacoesVVD)
        .where(eq(intimacoesVVD.processoVVDId, input.id))
        .orderBy(desc(intimacoesVVD.dataExpedicao), desc(intimacoesVVD.createdAt));

      // Buscar histórico
      const historico = await db
        .select()
        .from(historicoMPU)
        .where(eq(historicoMPU.processoVVDId, input.id))
        .orderBy(desc(historicoMPU.dataEvento));

      return {
        ...processo.processo,
        autor: processo.autor,
        vitima,
        intimacoes,
        historico,
      };
    }),

  createProcesso: protectedProcedure
    .input(
      z.object({
        autorId: z.number(),
        vitimaId: z.number().optional(),
        numeroAutos: z.string().min(1),
        tipoProcesso: z.string().default("MPU"),
        comarca: z.string().optional(),
        vara: z.string().optional(),
        crime: z.string().optional(),
        assunto: z.string().optional(),
        dataDistribuicao: z.string().optional(),
        mpuAtiva: z.boolean().optional(),
        dataDecisaoMPU: z.string().optional(),
        tiposMPU: z.string().optional(), // JSON
        dataVencimentoMPU: z.string().optional(),
        distanciaMinima: z.number().optional(),
        observacoes: z.string().optional(),
        pjeDocumentoId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [processo] = await db
        .insert(processosVVD)
        .values({
          ...input,
          defensorId: ctx.user.id,
        })
        .returning();

      // Se MPU foi deferida, criar histórico
      if (input.mpuAtiva && input.dataDecisaoMPU) {
        await db.insert(historicoMPU).values({
          processoVVDId: processo.id,
          tipoEvento: "deferimento",
          dataEvento: input.dataDecisaoMPU,
          descricao: "MPU deferida",
          medidasVigentes: input.tiposMPU,
          novaDataVencimento: input.dataVencimentoMPU,
          novaDistancia: input.distanciaMinima,
        });
      }

      return processo;
    }),

  updateProcesso: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        vitimaId: z.number().optional().nullable(),
        numeroAutos: z.string().optional(),
        tipoProcesso: z.string().optional(),
        comarca: z.string().optional(),
        vara: z.string().optional(),
        crime: z.string().optional(),
        assunto: z.string().optional(),
        fase: z.string().optional(),
        situacao: z.string().optional(),
        mpuAtiva: z.boolean().optional(),
        dataDecisaoMPU: z.string().optional(),
        tiposMPU: z.string().optional(),
        dataVencimentoMPU: z.string().optional(),
        distanciaMinima: z.number().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const [processo] = await db
        .update(processosVVD)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(processosVVD.id, id))
        .returning();

      return processo;
    }),

  // ==========================================
  // INTIMAÇÕES VVD
  // ==========================================

  listIntimacoes: protectedProcedure
    .input(
      z.object({
        processoVVDId: z.number().optional(),
        tipoIntimacao: z.enum(["CIENCIA", "PETICIONAR", "AUDIENCIA", "CUMPRIMENTO", "todos"]).optional().default("todos"),
        status: z.string().optional(),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
      const conditions = [];

      if (input.processoVVDId) {
        conditions.push(eq(intimacoesVVD.processoVVDId, input.processoVVDId));
      }

      if (input.tipoIntimacao !== "todos") {
        conditions.push(eq(intimacoesVVD.tipoIntimacao, input.tipoIntimacao as any));
      }

      if (input.status) {
        conditions.push(eq(intimacoesVVD.status, input.status));
      }

      const intimacoesList = await db
        .select({
          intimacao: intimacoesVVD,
          processo: processosVVD,
          autor: partesVVD,
        })
        .from(intimacoesVVD)
        .leftJoin(processosVVD, eq(intimacoesVVD.processoVVDId, processosVVD.id))
        .leftJoin(partesVVD, eq(processosVVD.autorId, partesVVD.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(intimacoesVVD.dataExpedicao), desc(intimacoesVVD.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return intimacoesList.map((i) => ({
        ...i.intimacao,
        processo: i.processo,
        autor: i.autor,
      }));
    }),

  createIntimacao: protectedProcedure
    .input(
      z.object({
        processoVVDId: z.number(),
        tipoIntimacao: z.enum(["CIENCIA", "PETICIONAR", "AUDIENCIA", "CUMPRIMENTO"]),
        ato: z.string(),
        dataExpedicao: z.string().optional(),
        dataIntimacao: z.string().optional(),
        prazo: z.string().optional(),
        prazoDias: z.number().optional(),
        pjeDocumentoId: z.string().optional(),
        pjeTipoDocumento: z.string().optional(),
        providencias: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [intimacao] = await db
        .insert(intimacoesVVD)
        .values({
          ...input,
          defensorId: ctx.user.id,
        })
        .returning();

      return intimacao;
    }),

  darCiencia: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [intimacao] = await db
        .update(intimacoesVVD)
        .set({
          status: "ciencia_dada",
          dataIntimacao: new Date().toISOString().split("T")[0],
          updatedAt: new Date(),
        })
        .where(eq(intimacoesVVD.id, input.id))
        .returning();

      return intimacao;
    }),

  // ==========================================
  // HISTÓRICO MPU
  // ==========================================

  addHistorico: protectedProcedure
    .input(
      z.object({
        processoVVDId: z.number(),
        tipoEvento: z.enum([
          "deferimento",
          "indeferimento",
          "modulacao",
          "revogacao",
          "renovacao",
          "descumprimento",
        ]),
        dataEvento: z.string(),
        descricao: z.string().optional(),
        medidasVigentes: z.string().optional(),
        novaDataVencimento: z.string().optional(),
        novaDistancia: z.number().optional(),
        pjeDocumentoId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [historico] = await db
        .insert(historicoMPU)
        .values(input)
        .returning();

      // Atualizar processo com novos dados
      const updateData: any = {};

      if (input.tipoEvento === "deferimento" || input.tipoEvento === "renovacao") {
        updateData.mpuAtiva = true;
      } else if (input.tipoEvento === "revogacao" || input.tipoEvento === "indeferimento") {
        updateData.mpuAtiva = false;
      }

      if (input.novaDataVencimento) {
        updateData.dataVencimentoMPU = input.novaDataVencimento;
      }

      if (input.novaDistancia) {
        updateData.distanciaMinima = input.novaDistancia;
      }

      if (input.medidasVigentes) {
        updateData.tiposMPU = input.medidasVigentes;
      }

      if (Object.keys(updateData).length > 0) {
        await db
          .update(processosVVD)
          .set({ ...updateData, updatedAt: new Date() })
          .where(eq(processosVVD.id, input.processoVVDId));
      }

      return historico;
    }),

  // ==========================================
  // ESTATÍSTICAS VVD
  // ==========================================

  stats: protectedProcedure.query(async () => {
    // Total de processos
    const [totalProcessos] = await db
      .select({ count: sql<number>`count(*)` })
      .from(processosVVD)
      .where(isNull(processosVVD.deletedAt));

    // MPUs ativas
    const [mpusAtivas] = await db
      .select({ count: sql<number>`count(*)` })
      .from(processosVVD)
      .where(and(isNull(processosVVD.deletedAt), eq(processosVVD.mpuAtiva, true)));

    // MPUs vencendo em 30 dias
    const hoje = new Date();
    const em30Dias = new Date();
    em30Dias.setDate(em30Dias.getDate() + 30);

    const [mpusVencendo] = await db
      .select({ count: sql<number>`count(*)` })
      .from(processosVVD)
      .where(
        and(
          isNull(processosVVD.deletedAt),
          eq(processosVVD.mpuAtiva, true),
          gte(processosVVD.dataVencimentoMPU, hoje.toISOString().split("T")[0]),
          lte(processosVVD.dataVencimentoMPU, em30Dias.toISOString().split("T")[0])
        )
      );

    // Intimações pendentes
    const [intimacoesPendentes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(intimacoesVVD)
      .where(eq(intimacoesVVD.status, "pendente"));

    return {
      totalProcessos: totalProcessos?.count || 0,
      mpusAtivas: mpusAtivas?.count || 0,
      mpusVencendo: mpusVencendo?.count || 0,
      intimacoesPendentes: intimacoesPendentes?.count || 0,
    };
  }),

  // ==========================================
  // IMPORTAÇÃO DE INTIMAÇÕES PJe
  // ==========================================

  importarIntimacoesPJe: protectedProcedure
    .input(
      z.object({
        intimacoes: z.array(
          z.object({
            assistido: z.string(),
            numeroProcesso: z.string(),
            dataExpedicao: z.string(),
            prazo: z.number().optional(),
            tipoProcesso: z.string().optional(),
            crime: z.string().optional(),
            pjeDocumentoId: z.string().optional(),
            pjeTipoDocumento: z.string().optional(),
            tipoIntimacao: z.enum(["CIENCIA", "PETICIONAR"]).default("CIENCIA"),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      console.log("[VVD Import] Iniciando importação de", input.intimacoes.length, "intimações");

      const resultados = {
        processosNovos: 0,
        partesNovas: 0,
        intimacoesNovas: 0,
        erros: [] as string[],
      };

      for (const intimacao of input.intimacoes) {
        console.log("[VVD Import] Processando:", intimacao.assistido, intimacao.numeroProcesso);
        try {
          // 1. Buscar ou criar a parte (autor)
          let [parteExistente] = await db
            .select()
            .from(partesVVD)
            .where(
              and(
                ilike(partesVVD.nome, intimacao.assistido),
                eq(partesVVD.tipoParte, "autor")
              )
            )
            .limit(1);

          if (!parteExistente) {
            [parteExistente] = await db
              .insert(partesVVD)
              .values({
                nome: intimacao.assistido,
                tipoParte: "autor",
                defensorId: ctx.user.id,
              })
              .returning();
            resultados.partesNovas++;
          }

          // 2. Buscar ou criar o processo
          let [processoExistente] = await db
            .select()
            .from(processosVVD)
            .where(eq(processosVVD.numeroAutos, intimacao.numeroProcesso))
            .limit(1);

          if (!processoExistente) {
            // Calcular data de reanálise: 1 ano após a data de expedição
            const dataExpedicao = intimacao.dataExpedicao
              ? new Date(intimacao.dataExpedicao.split('/').reverse().join('-'))
              : new Date();
            const dataReanalise = new Date(dataExpedicao);
            dataReanalise.setFullYear(dataReanalise.getFullYear() + 1);
            const dataReanaliseStr = dataReanalise.toISOString().split('T')[0];

            [processoExistente] = await db
              .insert(processosVVD)
              .values({
                autorId: parteExistente.id,
                numeroAutos: intimacao.numeroProcesso,
                tipoProcesso: intimacao.tipoProcesso || "MPU",
                crime: intimacao.crime,
                mpuAtiva: true, // MPU importada começa como ativa
                dataDecisaoMPU: intimacao.dataExpedicao
                  ? intimacao.dataExpedicao.split('/').reverse().join('-')
                  : new Date().toISOString().split('T')[0],
                dataVencimentoMPU: dataReanaliseStr, // Data de reanálise: 1 ano
                defensorId: ctx.user.id,
              })
              .returning();
            resultados.processosNovos++;
          }

          // 3. Criar a intimação
          // Converter data de dd/MM/yyyy para yyyy-MM-dd se necessário
          let dataExpedicaoFormatada = intimacao.dataExpedicao;
          if (intimacao.dataExpedicao && intimacao.dataExpedicao.includes('/')) {
            const [dia, mes, ano] = intimacao.dataExpedicao.split('/');
            dataExpedicaoFormatada = `${ano}-${mes}-${dia}`;
          }

          await db.insert(intimacoesVVD).values({
            processoVVDId: processoExistente.id,
            tipoIntimacao: intimacao.tipoIntimacao,
            ato: intimacao.pjeTipoDocumento || "Intimação",
            dataExpedicao: dataExpedicaoFormatada,
            prazoDias: intimacao.prazo,
            pjeDocumentoId: intimacao.pjeDocumentoId,
            pjeTipoDocumento: intimacao.pjeTipoDocumento,
            providencias: intimacao.tipoIntimacao === "CIENCIA"
              ? "(ajustar status e ato)"
              : "(peticionar nos autos)",
            defensorId: ctx.user.id,
          });
          resultados.intimacoesNovas++;
          console.log("[VVD Import] Intimação criada para processo:", processoExistente.id);
        } catch (error) {
          resultados.erros.push(
            `Erro ao importar ${intimacao.assistido}: ${error instanceof Error ? error.message : "Erro desconhecido"}`
          );
        }
      }

      return resultados;
    }),
});
