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
  audiencias,
} from "@/lib/db/schema";
import { eq, and, desc, asc, sql, isNull, or, ilike, gte, lte, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ==========================================
// ROUTER VVD - VIOLÊNCIA DOMÉSTICA / MPU
// Redesign: requerido (assistido DPE) / requerente (quem pede MPU)
// ==========================================

export const vvdRouter = router({
  // ==========================================
  // PARTES VVD (Requeridos e Requerentes)
  // ==========================================

  listPartes: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        tipoParte: z.enum(["requerido", "requerente", "todos"]).optional().default("todos"),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
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

      const [total] = await db
        .select({ count: sql<number>`count(*)` })
        .from(partesVVD)
        .where(and(...conditions));

      return {
        partes,
        total: total?.count || 0,
      };
    }),

  createParte: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(1),
        cpf: z.string().optional(),
        rg: z.string().optional(),
        dataNascimento: z.string().optional(),
        tipoParte: z.enum(["requerido", "requerente"]),
        telefone: z.string().optional(),
        telefoneSecundario: z.string().optional(),
        email: z.string().optional(),
        endereco: z.string().optional(),
        bairro: z.string().optional(),
        cidade: z.string().optional(),
        parentesco: z.string().optional(),
        sexo: z.string().optional(),
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

  updateParte: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().optional(),
        cpf: z.string().optional(),
        rg: z.string().optional(),
        dataNascimento: z.string().optional().nullable(),
        tipoParte: z.enum(["requerido", "requerente"]).optional(),
        telefone: z.string().optional().nullable(),
        telefoneSecundario: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        endereco: z.string().optional().nullable(),
        bairro: z.string().optional().nullable(),
        cidade: z.string().optional().nullable(),
        parentesco: z.string().optional().nullable(),
        sexo: z.string().optional().nullable(),
        observacoes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [parte] = await db
        .update(partesVVD)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(partesVVD.id, id))
        .returning();

      return parte;
    }),

  deleteParte: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [parte] = await db
        .update(partesVVD)
        .set({ deletedAt: new Date() })
        .where(eq(partesVVD.id, input.id))
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
        mpuProximaVencer: z.boolean().optional(),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
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
          requerido: partesVVD,
        })
        .from(processosVVD)
        .leftJoin(partesVVD, eq(processosVVD.requeridoId, partesVVD.id))
        .where(and(...conditions))
        .orderBy(
          asc(processosVVD.dataVencimentoMPU),
          desc(processosVVD.createdAt)
        )
        .limit(input.limit)
        .offset(input.offset);

      const [total] = await db
        .select({ count: sql<number>`count(*)` })
        .from(processosVVD)
        .where(and(...conditions));

      return {
        processos: processosList.map((p) => ({
          ...p.processo,
          requerido: p.requerido,
        })),
        total: total?.count || 0,
      };
    }),

  getProcessoById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [processo] = await db
        .select({
          processo: processosVVD,
          requerido: partesVVD,
        })
        .from(processosVVD)
        .leftJoin(partesVVD, eq(processosVVD.requeridoId, partesVVD.id))
        .where(eq(processosVVD.id, input.id));

      if (!processo) return null;

      // Buscar requerente separadamente
      let requerente = null;
      if (processo.processo.requerenteId) {
        const [r] = await db
          .select()
          .from(partesVVD)
          .where(eq(partesVVD.id, processo.processo.requerenteId));
        requerente = r;
      }

      // Buscar intimações
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
        requerido: processo.requerido,
        requerente,
        intimacoes,
        historico,
      };
    }),

  createProcesso: protectedProcedure
    .input(
      z.object({
        requeridoId: z.number(),
        requerenteId: z.number().optional(),
        numeroAutos: z.string().min(1),
        tipoProcesso: z.string().default("MPU"),
        comarca: z.string().optional(),
        vara: z.string().optional(),
        crime: z.string().optional(),
        assunto: z.string().optional(),
        dataDistribuicao: z.string().optional(),
        mpuAtiva: z.boolean().optional(),
        dataDecisaoMPU: z.string().optional(),
        tiposMPU: z.string().optional(),
        dataVencimentoMPU: z.string().optional(),
        distanciaMinima: z.number().optional(),
        canalEntrada: z.enum(["audiencia_custodia", "plantao", "vara_vvd", "delegacia", "espontanea", "outro"]).optional(),
        tipoRelato: z.enum(["versao_do_fato", "negativa_total", "negativa_parcial", "confissao", "sem_contato"]).optional(),
        temAcaoFamilia: z.boolean().optional(),
        tipoAcaoFamilia: z.string().optional(),
        suspeitaMaFe: z.boolean().optional(),
        dataFato: z.string().optional(),
        medidasDeferidas: z.array(z.string()).optional(),
        observacoes: z.string().optional(),
        pjeDocumentoId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [processo] = await db
        .insert(processosVVD)
        .values({
          ...input,
          medidasDeferidas: input.medidasDeferidas || null,
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
        requerenteId: z.number().optional().nullable(),
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
        canalEntrada: z.enum(["audiencia_custodia", "plantao", "vara_vvd", "delegacia", "espontanea", "outro"]).optional().nullable(),
        tipoRelato: z.enum(["versao_do_fato", "negativa_total", "negativa_parcial", "confissao", "sem_contato"]).optional().nullable(),
        temAcaoFamilia: z.boolean().optional(),
        tipoAcaoFamilia: z.string().optional().nullable(),
        suspeitaMaFe: z.boolean().optional(),
        dataFato: z.string().optional().nullable(),
        medidasDeferidas: z.array(z.string()).optional().nullable(),
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

  deleteProcesso: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [processo] = await db
        .update(processosVVD)
        .set({ deletedAt: new Date() })
        .where(eq(processosVVD.id, input.id))
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
          requerido: partesVVD,
        })
        .from(intimacoesVVD)
        .leftJoin(processosVVD, eq(intimacoesVVD.processoVVDId, processosVVD.id))
        .leftJoin(partesVVD, eq(processosVVD.requeridoId, partesVVD.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(intimacoesVVD.dataExpedicao), desc(intimacoesVVD.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return intimacoesList.map((i) => ({
        ...i.intimacao,
        processo: i.processo,
        requerido: i.requerido,
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
      const updateData: Record<string, unknown> = {};

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
  // PROMOÇÃO AO SISTEMA GERAL
  // ==========================================

  promoverAssistido: protectedProcedure
    .input(
      z.object({
        processoVVDId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 1. Buscar processo VVD com requerido
      const [processoVVD] = await db
        .select({
          processo: processosVVD,
          requerido: partesVVD,
        })
        .from(processosVVD)
        .leftJoin(partesVVD, eq(processosVVD.requeridoId, partesVVD.id))
        .where(eq(processosVVD.id, input.processoVVDId));

      if (!processoVVD) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Processo VVD não encontrado" });
      }

      if (processoVVD.processo.processoId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Processo já foi promovido ao sistema geral" });
      }

      const requerido = processoVVD.requerido;
      if (!requerido) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Processo sem requerido vinculado" });
      }

      // 2. Verificar se já existe assistido com mesmo CPF
      let assistidoId: number | null = null;
      if (requerido.cpf) {
        const [existente] = await db
          .select()
          .from(assistidos)
          .where(eq(assistidos.cpf, requerido.cpf))
          .limit(1);
        if (existente) {
          assistidoId = existente.id;
        }
      }

      // 3. Criar assistido se não existe
      if (!assistidoId) {
        // Combinar endereço completo (endereço + bairro + cidade)
        const enderecoCompleto = [
          requerido.endereco,
          requerido.bairro,
          requerido.cidade,
        ].filter(Boolean).join(", ") || undefined;

        const [novoAssistido] = await db
          .insert(assistidos)
          .values({
            nome: requerido.nome,
            cpf: requerido.cpf || undefined,
            telefone: requerido.telefone || undefined,
            endereco: enderecoCompleto,
            origemCadastro: "pje",
          })
          .returning();
        assistidoId = novoAssistido.id;
      }

      // 4. Criar processo no sistema geral
      const [novoProcesso] = await db
        .insert(processos)
        .values({
          assistidoId: assistidoId!,
          numeroAutos: processoVVD.processo.numeroAutos,
          comarca: processoVVD.processo.comarca || "Camaçari",
          vara: processoVVD.processo.vara || "Vara de Violência Doméstica",
          assunto: processoVVD.processo.crime || undefined,
          atribuicao: "VVD_CAMACARI",
          area: "VIOLENCIA_DOMESTICA",
        })
        .returning();

      // 5. Vincular processo VVD ao sistema geral (link bidirecional)
      await db
        .update(processosVVD)
        .set({
          processoId: novoProcesso.id,
          updatedAt: new Date(),
        })
        .where(eq(processosVVD.id, input.processoVVDId));

      // 6. Vincular parte VVD ao assistido
      await db
        .update(partesVVD)
        .set({
          assistidoId,
          updatedAt: new Date(),
        })
        .where(eq(partesVVD.id, requerido.id));

      return {
        assistidoId,
        processoId: novoProcesso.id,
        message: "Caso promovido ao sistema geral com sucesso",
      };
    }),

  // ==========================================
  // ESTATÍSTICAS VVD
  // ==========================================

  stats: protectedProcedure.query(async () => {
    const [totalProcessos] = await db
      .select({ count: sql<number>`count(*)` })
      .from(processosVVD)
      .where(isNull(processosVVD.deletedAt));

    const [mpusAtivas] = await db
      .select({ count: sql<number>`count(*)` })
      .from(processosVVD)
      .where(and(isNull(processosVVD.deletedAt), eq(processosVVD.mpuAtiva, true)));

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
  // ALERTAS (Camada 2)
  // ==========================================

  checkRequerenteRecorrente: protectedProcedure
    .input(z.object({ nome: z.string(), cpf: z.string().optional() }))
    .query(async ({ input }) => {
      const conditions = [
        eq(partesVVD.tipoParte, "requerente"),
        isNull(partesVVD.deletedAt),
      ];

      // Buscar por CPF (mais preciso) ou nome
      if (input.cpf) {
        conditions.push(eq(partesVVD.cpf, input.cpf));
      } else {
        conditions.push(ilike(partesVVD.nome, input.nome));
      }

      const [resultado] = await db
        .select({ count: sql<number>`count(*)` })
        .from(partesVVD)
        .where(and(...conditions));

      return {
        recorrente: (resultado?.count || 0) > 1,
        totalMPUs: resultado?.count || 0,
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
            ordemOriginal: z.number().optional(),
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
          // 1. Buscar ou criar a parte (requerido = assistido da DPE)
          let [parteExistente] = await db
            .select()
            .from(partesVVD)
            .where(
              and(
                ilike(partesVVD.nome, intimacao.assistido),
                eq(partesVVD.tipoParte, "requerido")
              )
            )
            .limit(1);

          if (!parteExistente) {
            [parteExistente] = await db
              .insert(partesVVD)
              .values({
                nome: intimacao.assistido,
                tipoParte: "requerido",
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
            const dataExpedicao = intimacao.dataExpedicao
              ? new Date(intimacao.dataExpedicao.split('/').reverse().join('-'))
              : new Date();
            const dataReanalise = new Date(dataExpedicao);
            dataReanalise.setFullYear(dataReanalise.getFullYear() + 1);
            const dataReanaliseStr = dataReanalise.toISOString().split('T')[0];

            [processoExistente] = await db
              .insert(processosVVD)
              .values({
                requeridoId: parteExistente.id,
                numeroAutos: intimacao.numeroProcesso,
                tipoProcesso: intimacao.tipoProcesso || "MPU",
                crime: intimacao.crime,
                mpuAtiva: true,
                dataDecisaoMPU: intimacao.dataExpedicao
                  ? intimacao.dataExpedicao.split('/').reverse().join('-')
                  : new Date().toISOString().split('T')[0],
                dataVencimentoMPU: dataReanaliseStr,
                defensorId: ctx.user.id,
              })
              .returning();
            resultados.processosNovos++;
          }

          // 3. Criar a intimação
          let dataExpedicaoFormatada = intimacao.dataExpedicao;
          let horaExpedicao = "00";
          let minutoExpedicao = "00";

          if (intimacao.dataExpedicao) {
            const [dataParte, horaParte] = intimacao.dataExpedicao.split(' ');
            if (dataParte && dataParte.includes('/')) {
              const [dia, mes, ano] = dataParte.split('/');
              dataExpedicaoFormatada = `${ano}-${mes}-${dia}`;
            }
            if (horaParte && horaParte.includes(':')) {
              const [hora, minuto] = horaParte.split(':');
              horaExpedicao = hora;
              minutoExpedicao = minuto;
            }
          }

          const createdAtPreciso = new Date();
          const temHora = horaExpedicao !== "00" || minutoExpedicao !== "00";

          if (temHora) {
            createdAtPreciso.setHours(parseInt(horaExpedicao, 10));
            createdAtPreciso.setMinutes(parseInt(minutoExpedicao, 10));
            createdAtPreciso.setSeconds(0);
            createdAtPreciso.setMilliseconds(0);
          } else if (intimacao.ordemOriginal !== undefined) {
            createdAtPreciso.setMilliseconds(999 - intimacao.ordemOriginal);
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
              ? "Classificar demanda"
              : "Peticionar nos autos",
            defensorId: ctx.user.id,
            createdAt: createdAtPreciso,
          });
          resultados.intimacoesNovas++;
        } catch (error) {
          resultados.erros.push(
            `Erro ao importar ${intimacao.assistido}: ${error instanceof Error ? error.message : "Erro desconhecido"}`
          );
        }
      }

      return resultados;
    }),

  // ==========================================
  // PETIÇÃO - Criar demanda a partir de intimação
  // ==========================================

  criarPeticao: protectedProcedure
    .input(z.object({ intimacaoId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // 1. Buscar intimação com processo VVD e requerido
      const [dados] = await db
        .select({
          intimacao: intimacoesVVD,
          processo: processosVVD,
          requerido: partesVVD,
        })
        .from(intimacoesVVD)
        .leftJoin(processosVVD, eq(intimacoesVVD.processoVVDId, processosVVD.id))
        .leftJoin(partesVVD, eq(processosVVD.requeridoId, partesVVD.id))
        .where(eq(intimacoesVVD.id, input.intimacaoId));

      if (!dados) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Intimação não encontrada" });
      }

      if (dados.intimacao.demandaId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Intimação já tem demanda vinculada" });
      }

      if (!dados.processo) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Intimação sem processo VVD vinculado" });
      }

      if (!dados.requerido) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Processo sem requerido vinculado" });
      }


      // 2. Garantir que requerido tem assistidoId (auto-promoção se necessário)
      let assistidoId = dados.requerido.assistidoId;
      if (!assistidoId) {
        // Verificar se já existe assistido com mesmo CPF
        if (dados.requerido.cpf) {
          const [existente] = await db
            .select()
            .from(assistidos)
            .where(eq(assistidos.cpf, dados.requerido.cpf))
            .limit(1);
          if (existente) {
            assistidoId = existente.id;
          }
        }

        // Criar assistido se não encontrou
        if (!assistidoId) {
          const enderecoCompleto = [
            dados.requerido.endereco,
            dados.requerido.bairro,
            dados.requerido.cidade,
          ].filter(Boolean).join(", ") || undefined;

          const [novoAssistido] = await db
            .insert(assistidos)
            .values({
              nome: dados.requerido.nome,
              cpf: dados.requerido.cpf || undefined,
              telefone: dados.requerido.telefone || undefined,
              endereco: enderecoCompleto,
              origemCadastro: "pje",
            })
            .returning();
          assistidoId = novoAssistido.id;
        }

        // Vincular assistido à parte VVD
        await db
          .update(partesVVD)
          .set({ assistidoId, updatedAt: new Date() })
          .where(eq(partesVVD.id, dados.requerido.id));
      }

      // 3. Garantir que processoVVD tem processoId (auto-promoção se necessário)
      let processoId = dados.processo.processoId;
      if (!processoId) {
        const [novoProcesso] = await db
          .insert(processos)
          .values({
            assistidoId,
            numeroAutos: dados.processo.numeroAutos,
            comarca: dados.processo.comarca || "Camaçari",
            vara: dados.processo.vara || "Vara de Violência Doméstica",
            assunto: dados.processo.crime || undefined,
            atribuicao: "VVD_CAMACARI",
            area: "VIOLENCIA_DOMESTICA",
          })
          .returning();
        processoId = novoProcesso.id;

        // Vincular processo ao VVD
        await db
          .update(processosVVD)
          .set({ processoId, updatedAt: new Date() })
          .where(eq(processosVVD.id, dados.processo.id));
      }

      // 4. Criar demanda no sistema geral
      const [demanda] = await db
        .insert(demandas)
        .values({
          processoId,
          assistidoId,
          ato: dados.intimacao.ato,
          prazo: dados.intimacao.prazo || undefined,
          dataIntimacao: dados.intimacao.dataIntimacao || undefined,
          dataExpedicao: dados.intimacao.dataExpedicao || undefined,
          status: "2_ATENDER",
          prioridade: "ALTA",
          providencias: "Peticionar nos autos — originado de intimação VVD",
          defensorId: ctx.user.id,
        })
        .returning();

      // 5. Vincular demanda à intimação VVD
      await db
        .update(intimacoesVVD)
        .set({
          demandaId: demanda.id,
          status: "respondida",
          updatedAt: new Date(),
        })
        .where(eq(intimacoesVVD.id, input.intimacaoId));

      return { demandaId: demanda.id, message: "Demanda criada e vinculada à intimação" };
    }),

  // ==========================================
  // AUDIÊNCIA - Criar audiência a partir de intimação VVD
  // ==========================================

  criarAudiencia: protectedProcedure
    .input(z.object({
      intimacaoId: z.number(),
      dataAudiencia: z.string(), // ISO date string (YYYY-MM-DDTHH:mm)
      tipo: z.enum(["instrucao", "conciliacao", "justificacao", "custodia", "admonicao"]).default("instrucao"),
      local: z.string().optional(),
      sala: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. Buscar intimação com processo VVD e requerido
      const [dados] = await db
        .select({
          intimacao: intimacoesVVD,
          processo: processosVVD,
          requerido: partesVVD,
        })
        .from(intimacoesVVD)
        .leftJoin(processosVVD, eq(intimacoesVVD.processoVVDId, processosVVD.id))
        .leftJoin(partesVVD, eq(processosVVD.requeridoId, partesVVD.id))
        .where(eq(intimacoesVVD.id, input.intimacaoId));

      if (!dados) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Intimação não encontrada" });
      }

      if (dados.intimacao.audienciaId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Intimação já tem audiência vinculada" });
      }

      if (!dados.processo) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Intimação sem processo VVD vinculado" });
      }

      if (!dados.requerido) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Processo sem requerido vinculado" });
      }


      // 2. Garantir que requerido tem assistidoId (auto-promoção se necessário)
      let assistidoId = dados.requerido.assistidoId;
      if (!assistidoId) {
        if (dados.requerido.cpf) {
          const [existente] = await db
            .select()
            .from(assistidos)
            .where(eq(assistidos.cpf, dados.requerido.cpf))
            .limit(1);
          if (existente) {
            assistidoId = existente.id;
          }
        }

        if (!assistidoId) {
          const enderecoCompleto = [
            dados.requerido.endereco,
            dados.requerido.bairro,
            dados.requerido.cidade,
          ].filter(Boolean).join(", ") || undefined;

          const [novoAssistido] = await db
            .insert(assistidos)
            .values({
              nome: dados.requerido.nome,
              cpf: dados.requerido.cpf || undefined,
              telefone: dados.requerido.telefone || undefined,
              endereco: enderecoCompleto,
              origemCadastro: "pje",
            })
            .returning();
          assistidoId = novoAssistido.id;
        }

        await db
          .update(partesVVD)
          .set({ assistidoId, updatedAt: new Date() })
          .where(eq(partesVVD.id, dados.requerido.id));
      }

      // 3. Garantir que processoVVD tem processoId (auto-promoção se necessário)
      let processoId = dados.processo.processoId;
      if (!processoId) {
        const [novoProcesso] = await db
          .insert(processos)
          .values({
            assistidoId,
            numeroAutos: dados.processo.numeroAutos,
            comarca: dados.processo.comarca || "Camaçari",
            vara: dados.processo.vara || "Vara de Violência Doméstica",
            assunto: dados.processo.crime || undefined,
            atribuicao: "VVD_CAMACARI",
            area: "VIOLENCIA_DOMESTICA",
          })
          .returning();
        processoId = novoProcesso.id;

        await db
          .update(processosVVD)
          .set({ processoId, updatedAt: new Date() })
          .where(eq(processosVVD.id, dados.processo.id));
      }

      // 4. Criar audiência no sistema geral
      const [audiencia] = await db
        .insert(audiencias)
        .values({
          processoId,
          assistidoId,
          dataAudiencia: new Date(input.dataAudiencia),
          tipo: input.tipo,
          local: input.local || "Vara de Violência Doméstica - Camaçari",
          titulo: `Audiência VVD — ${dados.requerido.nome} (${dados.processo.numeroAutos})`,
          descricao: dados.intimacao.ato,
          sala: input.sala || undefined,
          defensorId: ctx.user.id,
          status: "agendada",
          observacoes: input.observacoes || undefined,
        })
        .returning();

      // 5. Vincular audiência à intimação VVD
      await db
        .update(intimacoesVVD)
        .set({
          audienciaId: audiencia.id,
          status: "respondida",
          updatedAt: new Date(),
        })
        .where(eq(intimacoesVVD.id, input.intimacaoId));

      return { audienciaId: audiencia.id, message: "Audiência criada e vinculada à intimação" };
    }),
});
