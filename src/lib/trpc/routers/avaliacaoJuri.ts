import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import {
  avaliacoesJuri,
  avaliacaoJurados,
  avaliacaoTestemunhasJuri,
  argumentosSustentacao,
  sessoesJuri,
  jurados,
  personagensJuri,
} from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Schema de validação para jurado na avaliação
const avaliacaoJuradoSchema = z.object({
  posicao: z.number().min(1).max(7),
  juradoId: z.number().optional(),
  nome: z.string().optional(),
  profissao: z.string().optional(),
  idadeAproximada: z.number().optional(),
  sexo: z.string().optional(),
  aparenciaPrimeiraImpressao: z.string().optional(),
  linguagemCorporalInicial: z.string().optional(),
  tendenciaVoto: z.enum(["CONDENAR", "ABSOLVER", "INDECISO"]).optional(),
  nivelConfianca: z.enum(["BAIXA", "MEDIA", "ALTA"]).optional(),
  justificativaTendencia: z.string().optional(),
  anotacoesInterrogatorio: z.string().optional(),
  anotacoesMp: z.string().optional(),
  anotacoesDefesa: z.string().optional(),
  anotacoesGerais: z.string().optional(),
});

// Schema de validação para testemunha na avaliação
const avaliacaoTestemunhaSchema = z.object({
  ordem: z.number(),
  testemunhaId: z.number().optional(),
  nome: z.string(),
  resumoDepoimento: z.string().optional(),
  reacaoJurados: z.string().optional(),
  expressoesFaciaisLinguagem: z.string().optional(),
  credibilidade: z.number().min(1).max(10).optional(),
  observacoesComplementares: z.string().optional(),
});

// Schema de validação para argumento
const argumentoSchema = z.object({
  tipo: z.enum(["mp", "defesa"]),
  ordem: z.number(),
  descricaoArgumento: z.string().optional(),
  reacaoJurados: z.string().optional(),
  nivelPersuasao: z.number().min(1).max(10).optional(),
});

export const avaliacaoJuriRouter = router({
  // Criar nova avaliação
  create: protectedProcedure
    .input(
      z.object({
        sessaoJuriId: z.number(),
        processoId: z.number().optional(),
        observador: z.string(),
        dataJulgamento: z.string(),
        horarioInicio: z.string().optional(),
        duracaoEstimada: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar se a sessão existe
      const sessao = await db.query.sessoesJuri.findFirst({
        where: eq(sessoesJuri.id, input.sessaoJuriId),
      });

      if (!sessao) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada" });
      }

      const [avaliacao] = await db
        .insert(avaliacoesJuri)
        .values({
          sessaoJuriId: input.sessaoJuriId,
          processoId: input.processoId || sessao.processoId,
          observador: input.observador,
          dataJulgamento: input.dataJulgamento,
          horarioInicio: input.horarioInicio,
          duracaoEstimada: input.duracaoEstimada,
          status: "em_andamento",
          criadoPorId: ctx.user.id,
        })
        .returning();

      // Criar os 7 registros de jurados
      const juradosData = Array.from({ length: 7 }, (_, i) => ({
        avaliacaoJuriId: avaliacao.id,
        posicao: i + 1,
      }));

      await db.insert(avaliacaoJurados).values(juradosData);

      return avaliacao;
    }),

  // Buscar avaliação por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const avaliacao = await db.query.avaliacoesJuri.findFirst({
        where: eq(avaliacoesJuri.id, input.id),
        with: {
          avaliacaoJurados: true,
          avaliacaoTestemunhas: true,
          argumentos: true,
        },
      });

      return avaliacao;
    }),

  // Buscar avaliação por sessão do júri
  getBySessaoId: protectedProcedure
    .input(z.object({ sessaoJuriId: z.number() }))
    .query(async ({ input }) => {
      const avaliacao = await db.query.avaliacoesJuri.findFirst({
        where: eq(avaliacoesJuri.sessaoJuriId, input.sessaoJuriId),
        with: {
          avaliacaoJurados: true,
          avaliacaoTestemunhas: true,
          argumentos: true,
        },
      });

      return avaliacao;
    }),

  // Listar avaliações
  list: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const { status, limit = 50, offset = 0 } = input || {};

      let conditions = [];
      if (status && status !== "all") {
        conditions.push(eq(avaliacoesJuri.status, status));
      }

      const result = await db
        .select()
        .from(avaliacoesJuri)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(avaliacoesJuri.createdAt))
        .limit(limit)
        .offset(offset);

      return result;
    }),

  // Atualizar avaliação principal
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        // Contexto
        observador: z.string().optional(),
        horarioInicio: z.string().optional(),
        duracaoEstimada: z.string().optional(),
        descricaoAmbiente: z.string().optional(),
        disposicaoFisica: z.string().optional(),
        climaEmocionalInicial: z.string().optional(),
        presencaPublicoMidia: z.string().optional(),
        // Interrogatório
        interrogatorioReacaoGeral: z.string().optional(),
        interrogatorioJuradosAcreditaram: z.string().optional(),
        interrogatorioJuradosCeticos: z.string().optional(),
        interrogatorioMomentosImpacto: z.string().optional(),
        interrogatorioContradicoes: z.string().optional(),
        interrogatorioImpressaoCredibilidade: z.string().optional(),
        interrogatorioNivelCredibilidade: z.number().min(1).max(10).optional(),
        // MP
        mpEstrategiaGeral: z.string().optional(),
        mpImpactoGeral: z.number().min(1).max(10).optional(),
        mpInclinacaoCondenar: z.string().optional(),
        // Defesa
        defesaEstrategiaGeral: z.string().optional(),
        defesaImpactoGeral: z.number().min(1).max(10).optional(),
        defesaDuvidaRazoavel: z.string().optional(),
        // Réplica
        replicaRefutacoes: z.string().optional(),
        replicaArgumentosNovos: z.string().optional(),
        replicaReacaoGeral: z.string().optional(),
        replicaImpacto: z.number().min(1).max(10).optional(),
        replicaMudancaOpiniao: z.string().optional(),
        // Tréplica
        treplicaRefutacoes: z.string().optional(),
        treplicaApeloFinal: z.string().optional(),
        treplicaReacaoGeral: z.string().optional(),
        treplicaMomentoImpactante: z.string().optional(),
        treplicaImpacto: z.number().min(1).max(10).optional(),
        treplicaReconquistaIndecisos: z.string().optional(),
        // Análise Final
        ladoMaisPersuasivo: z.string().optional(),
        impactoAcusacao: z.number().min(1).max(10).optional(),
        impactoDefesa: z.number().min(1).max(10).optional(),
        impressaoFinalLeiga: z.string().optional(),
        argumentoMaisImpactante: z.string().optional(),
        pontosNaoExplorados: z.string().optional(),
        climaGeralJulgamento: z.string().optional(),
        momentosVirada: z.string().optional(),
        surpresasJulgamento: z.string().optional(),
        observacoesAdicionais: z.string().optional(),
        // Status
        status: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const [atualizado] = await db
        .update(avaliacoesJuri)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(avaliacoesJuri.id, id))
        .returning();

      return atualizado;
    }),

  // Atualizar jurado na avaliação
  updateJurado: protectedProcedure
    .input(
      z.object({
        avaliacaoJuriId: z.number(),
        posicao: z.number().min(1).max(7),
        data: avaliacaoJuradoSchema.partial(),
      })
    )
    .mutation(async ({ input }) => {
      const { avaliacaoJuriId, posicao, data } = input;

      const [atualizado] = await db
        .update(avaliacaoJurados)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(avaliacaoJurados.avaliacaoJuriId, avaliacaoJuriId),
            eq(avaliacaoJurados.posicao, posicao)
          )
        )
        .returning();

      return atualizado;
    }),

  // Adicionar ou atualizar testemunha
  upsertTestemunha: protectedProcedure
    .input(
      z.object({
        avaliacaoJuriId: z.number(),
        data: avaliacaoTestemunhaSchema,
      })
    )
    .mutation(async ({ input }) => {
      const { avaliacaoJuriId, data } = input;

      // Verificar se já existe
      const existing = await db.query.avaliacaoTestemunhasJuri.findFirst({
        where: and(
          eq(avaliacaoTestemunhasJuri.avaliacaoJuriId, avaliacaoJuriId),
          eq(avaliacaoTestemunhasJuri.ordem, data.ordem)
        ),
      });

      if (existing) {
        const [atualizado] = await db
          .update(avaliacaoTestemunhasJuri)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .where(eq(avaliacaoTestemunhasJuri.id, existing.id))
          .returning();
        return atualizado;
      } else {
        const [novo] = await db
          .insert(avaliacaoTestemunhasJuri)
          .values({
            avaliacaoJuriId,
            ...data,
          })
          .returning();
        return novo;
      }
    }),

  // Adicionar ou atualizar argumento
  upsertArgumento: protectedProcedure
    .input(
      z.object({
        avaliacaoJuriId: z.number(),
        data: argumentoSchema,
      })
    )
    .mutation(async ({ input }) => {
      const { avaliacaoJuriId, data } = input;

      // Verificar se já existe
      const existing = await db.query.argumentosSustentacao.findFirst({
        where: and(
          eq(argumentosSustentacao.avaliacaoJuriId, avaliacaoJuriId),
          eq(argumentosSustentacao.tipo, data.tipo),
          eq(argumentosSustentacao.ordem, data.ordem)
        ),
      });

      if (existing) {
        const [atualizado] = await db
          .update(argumentosSustentacao)
          .set(data)
          .where(eq(argumentosSustentacao.id, existing.id))
          .returning();
        return atualizado;
      } else {
        const [novo] = await db
          .insert(argumentosSustentacao)
          .values({
            avaliacaoJuriId,
            ...data,
          })
          .returning();
        return novo;
      }
    }),

  // Finalizar avaliação
  finalizar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [atualizado] = await db
        .update(avaliacoesJuri)
        .set({
          status: "concluida",
          updatedAt: new Date(),
        })
        .where(eq(avaliacoesJuri.id, input.id))
        .returning();

      // TODO: Atualizar histórico de jurados e personagens do júri
      // com base nos dados coletados

      return atualizado;
    }),

  // Excluir avaliação
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [excluido] = await db
        .delete(avaliacoesJuri)
        .where(eq(avaliacoesJuri.id, input.id))
        .returning();

      return excluido;
    }),

  // ==========================================
  // PERSONAGENS DO JÚRI
  // ==========================================

  // Listar personagens
  listPersonagens: protectedProcedure
    .input(
      z.object({
        tipo: z.string().optional(),
        comarca: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const { tipo, comarca } = input || {};

      let conditions = [eq(personagensJuri.ativo, true)];
      if (tipo) {
        conditions.push(eq(personagensJuri.tipo, tipo));
      }
      if (comarca) {
        conditions.push(eq(personagensJuri.comarca, comarca));
      }

      const result = await db
        .select()
        .from(personagensJuri)
        .where(and(...conditions))
        .orderBy(personagensJuri.nome);

      return result;
    }),

  // Criar personagem
  createPersonagem: protectedProcedure
    .input(
      z.object({
        nome: z.string(),
        tipo: z.enum(["juiz", "promotor", "defensor", "oficial"]),
        vara: z.string().optional(),
        comarca: z.string().optional(),
        estiloAtuacao: z.string().optional(),
        pontosFortes: z.string().optional(),
        pontosFracos: z.string().optional(),
        tendenciasObservadas: z.string().optional(),
        estrategiasRecomendadas: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [personagem] = await db
        .insert(personagensJuri)
        .values({
          ...input,
          createdById: ctx.user.id,
        })
        .returning();

      return personagem;
    }),

  // Atualizar personagem
  updatePersonagem: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().optional(),
        vara: z.string().optional(),
        comarca: z.string().optional(),
        estiloAtuacao: z.string().optional(),
        pontosFortes: z.string().optional(),
        pontosFracos: z.string().optional(),
        tendenciasObservadas: z.string().optional(),
        estrategiasRecomendadas: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const [atualizado] = await db
        .update(personagensJuri)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(personagensJuri.id, id))
        .returning();

      return atualizado;
    }),
});
